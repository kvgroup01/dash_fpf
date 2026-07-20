import "server-only";
import type { createAdminClient } from "@/lib/supabase/admin";
import {
  startInsightsReport,
  getInsightsReportStatus,
  getInsightsReportPage,
  getCustomConversions,
  MetaGraphApiError,
  type MetaInsightsRow,
  type RateLimitInfo,
} from "./graph-client";
import type { Database, Json, Tables } from "@/types/database.types";

type AdminClient = ReturnType<typeof createAdminClient>;
type SyncJob = Tables<"meta_sync_jobs">;
type ProcessingCursor = { after?: string; upserted?: number } | null;
type DateRange = { since: string; until: string };

const POLL_INTERVAL_SECONDS = 15;
const BACKOFF_CAP_SECONDS = 30 * 60;

export function computeBackoffSeconds(attempt: number): number {
  return Math.min(BACKOFF_CAP_SECONDS, 30 * 2 ** attempt);
}

function inSeconds(seconds: number): string {
  return new Date(Date.now() + seconds * 1000).toISOString();
}

async function getToken(admin: AdminClient, secretId: string): Promise<string> {
  const { data, error } = await admin.rpc("get_secret", { secret_id: secretId });
  if (error || !data) throw new Error("Falha ao ler token no Vault.");
  return data;
}

function logUpdateError(context: string, jobId: string, error: { message: string } | null) {
  if (error) {
    console.error(`[meta-sync] falha ao atualizar job ${jobId} (${context}): ${error.message}`);
  }
}

async function markThrottled(admin: AdminClient, job: SyncJob, message: string) {
  const attempt = job.attempt_count + 1;
  const { error } = await admin
    .from("meta_sync_jobs")
    .update({
      status: "throttled",
      attempt_count: attempt,
      last_error: message,
      next_poll_at: inSeconds(computeBackoffSeconds(attempt)),
    })
    .eq("id", job.id);
  logUpdateError("throttled", job.id, error);
}

async function markError(admin: AdminClient, job: SyncJob, message: string) {
  const { error } = await admin
    .from("meta_sync_jobs")
    .update({ status: "error", last_error: message })
    .eq("id", job.id);
  logUpdateError("error", job.id, error);
}

async function recordRateLimit(
  admin: AdminClient,
  adAccountId: string,
  rateLimit: RateLimitInfo | null
) {
  if (!rateLimit) return;
  await admin
    .from("meta_ad_accounts")
    .update({ rate_limit_state: rateLimit as unknown as Database["public"]["Tables"]["meta_ad_accounts"]["Update"]["rate_limit_state"] })
    .eq("id", adAccountId);
}

/** Acima disso a conta pausa (nenhum job novo é iniciado pra ela). */
const RATE_LIMIT_PAUSE_THRESHOLD = 75;

export function isAccountRateLimited(rateLimitState: unknown): boolean {
  const state = rateLimitState as RateLimitInfo | null;
  if (!state) return false;
  return (
    state.callCount >= RATE_LIMIT_PAUSE_THRESHOLD ||
    state.totalCpuTime >= RATE_LIMIT_PAUSE_THRESHOLD ||
    state.totalTime >= RATE_LIMIT_PAUSE_THRESHOLD
  );
}

async function upsertInsightsBatch(
  admin: AdminClient,
  adAccountId: string,
  rows: MetaInsightsRow[]
): Promise<number> {
  if (!rows.length) return 0;

  const mapped = rows.map((r) => ({
    ad_account_id: adAccountId,
    date: r.date_start,
    campaign_id: r.campaign_id,
    campaign_name: r.campaign_name,
    adset_id: r.adset_id,
    adset_name: r.adset_name,
    ad_id: r.ad_id,
    ad_name: r.ad_name,
    spend: Number(r.spend ?? 0),
    impressions: Number(r.impressions ?? 0),
    reach: Number(r.reach ?? 0),
    frequency: r.frequency ? Number(r.frequency) : null,
    clicks: Number(r.clicks ?? 0),
    inline_link_clicks: Number(r.inline_link_clicks ?? 0),
    actions: (r.actions ?? []) as unknown as Json,
    action_values: (r.action_values ?? []) as unknown as Json,
  }));

  const { error } = await admin
    .from("meta_insights_daily")
    .upsert(mapped, { onConflict: "ad_account_id,date,ad_id" });

  if (error) throw new Error(`Falha ao gravar insights: ${error.message}`);
  return mapped.length;
}

async function syncCustomConversions(
  admin: AdminClient,
  account: Tables<"meta_ad_accounts">,
  token: string
) {
  try {
    const conversions = await getCustomConversions(token, account.ad_account_id);
    if (!conversions.length) return;
    await admin.from("meta_custom_conversions").upsert(
      conversions.map((c) => ({
        ad_account_id: account.id,
        custom_conversion_id: c.id,
        nome: c.name,
        regra_resumo: c.description ?? null,
      })),
      { onConflict: "ad_account_id,custom_conversion_id" }
    );
  } catch {
    // best-effort — não trava o job principal de insights
  }
}

/**
 * Um passo da state machine por chamada. A fase a retomar é deduzida dos
 * dados do job (meta_report_run_id / cursor), não do campo status — o
 * status é só pra exibição/elegibilidade de claim (ver migration do claim).
 */
export async function processJob(admin: AdminClient, job: SyncJob): Promise<void> {
  const { data: account, error: accountError } = await admin
    .from("meta_ad_accounts")
    .select("*")
    .eq("id", job.ad_account_id)
    .single();

  if (accountError || !account || !account.ads_token_secret_id) {
    await markError(admin, job, "Conta sem token configurado.");
    return;
  }

  let token: string;
  try {
    token = await getToken(admin, account.ads_token_secret_id);
  } catch {
    await markError(admin, job, "Falha ao ler token no Vault.");
    return;
  }

  const dateRange = job.date_range as DateRange | null;
  if (!dateRange) {
    await markError(admin, job, "Job sem intervalo de datas.");
    return;
  }

  try {
    // Fase 1: ainda não disparou o relatório assíncrono na Meta.
    if (!job.meta_report_run_id) {
      await syncCustomConversions(admin, account, token);

      const { reportRunId, rateLimit } = await startInsightsReport(
        token,
        account.ad_account_id,
        dateRange.since,
        dateRange.until
      );
      await recordRateLimit(admin, account.id, rateLimit);

      const { error: e1 } = await admin
        .from("meta_sync_jobs")
        .update({
          status: "polling",
          meta_report_run_id: reportRunId,
          next_poll_at: inSeconds(POLL_INTERVAL_SECONDS),
          attempt_count: 0,
        })
        .eq("id", job.id);
      logUpdateError("fase1->polling", job.id, e1);
      return;
    }

    const cursor = job.cursor as ProcessingCursor;

    // Fase 2: relatório disparado, ainda não confirmado como pronto.
    if (!cursor) {
      const status = await getInsightsReportStatus(token, job.meta_report_run_id);
      await recordRateLimit(admin, account.id, status.rateLimit);

      if (status.async_status === "Job Completed") {
        const { error: e2 } = await admin
          .from("meta_sync_jobs")
          .update({ status: "processing", cursor: { upserted: 0 } })
          .eq("id", job.id);
        logUpdateError("fase2->processing", job.id, e2);
        return;
      }

      if (status.async_status === "Job Failed" || status.async_status === "Job Skipped") {
        await markError(admin, job, `Relatório da Meta falhou (${status.async_status}).`);
        return;
      }

      const { error: e3 } = await admin
        .from("meta_sync_jobs")
        .update({ status: "polling", next_poll_at: inSeconds(POLL_INTERVAL_SECONDS) })
        .eq("id", job.id);
      logUpdateError("fase2->polling", job.id, e3);
      return;
    }

    // Fase 3: relatório pronto, paginando e gravando os resultados.
    const page = await getInsightsReportPage(token, job.meta_report_run_id, cursor?.after);
    await recordRateLimit(admin, account.id, page.rateLimit);

    const upsertedNow = await upsertInsightsBatch(admin, account.id, page.rows);
    const totalUpserted = (cursor?.upserted ?? 0) + upsertedNow;

    if (page.hasNext && page.after) {
      const { error: e4 } = await admin
        .from("meta_sync_jobs")
        .update({
          status: "processing",
          cursor: { after: page.after, upserted: totalUpserted },
          next_poll_at: new Date().toISOString(),
        })
        .eq("id", job.id);
      logUpdateError("fase3->proxima pagina", job.id, e4);
    } else {
      const { error: e5 } = await admin
        .from("meta_sync_jobs")
        .update({
          status: "done",
          cursor: null,
          stats: { linhas: totalUpserted },
        })
        .eq("id", job.id);
      logUpdateError("fase3->done", job.id, e5);
    }
  } catch (e) {
    if (e instanceof MetaGraphApiError) {
      await recordRateLimit(admin, account.id, e.rateLimit);
      if (e.isThrottle) {
        await markThrottled(admin, job, e.message);
        return;
      }
      await markError(admin, job, `Meta: ${e.message}`);
      return;
    }
    await markError(admin, job, e instanceof Error ? e.message : "Erro desconhecido.");
  }
}
