import { createAdminClient } from "@/lib/supabase/admin";
import { processJob } from "@/lib/meta/sync";

export const runtime = "nodejs";
export const maxDuration = 120;

/** Bem abaixo do maxDuration — sobra margem pra responder antes do timeout da função. */
const TIME_BUDGET_MS = 90_000;
/** Intervalo de espera quando um job desta invocação está "polling" e ainda não venceu next_poll_at. */
const IDLE_RETRY_MS = 3_000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Acordada a cada 1 min por pg_cron/pg_net (ver migration de cron). Nunca
 * expõe pra sessão de usuário — só o segredo compartilhado CRON_SECRET.
 * pg_net é fire-and-forget, então esta rota nunca é a fonte de verdade do
 * estado — isso é sempre a linha em meta_sync_jobs.
 *
 * Faz o polling de verdade dentro do orçamento de tempo desta invocação
 * (nunca em loop indiscriminado): se nada foi reivindicado ainda, desiste
 * rápido — não há trabalho pendente, o próximo tick do pg_cron cobre o que
 * surgir. Se já processou um job nesta invocação (ele está "polling"
 * esperando next_poll_at), espera um intervalo curto antes de tentar de
 * novo, em vez de martelar a RPC de claim sem pausa.
 */
export async function POST(request: Request) {
  const secret = request.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const start = Date.now();
  let processed = 0;
  let hasActiveWork = false;

  while (Date.now() - start < TIME_BUDGET_MS) {
    const { data: job, error } = await admin.rpc("claim_next_meta_sync_job");

    if (error) {
      return Response.json({ processed, error: error.message }, { status: 500 });
    }

    if (!job) {
      const remaining = TIME_BUDGET_MS - (Date.now() - start);
      if (!hasActiveWork || remaining <= IDLE_RETRY_MS) break;
      await sleep(IDLE_RETRY_MS);
      continue;
    }

    hasActiveWork = true;
    await processJob(admin, job);
    processed += 1;
  }

  return Response.json({ processed });
}
