import { Megaphone } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { BentoGrid } from "@/components/bento/bento-grid";
import { BentoCard } from "@/components/bento/bento-card";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { AdsTreeTable } from "@/components/tables/ads-tree-table";
import Link from "next/link";
import { formatCurrency } from "@/lib/format/currency";
import { formatInteger, formatPercent } from "@/lib/format/number";
import {
  costPerResult,
  ctr,
  sumTotals,
  topAds,
  topAudiences,
  type AdReportRow,
} from "@/lib/meta/report";
import { Filters } from "./filters";
import { SyncButton } from "./sync-button";
import { InvestmentChart } from "./investment-chart";

function defaultSince(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export default async function AnunciosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  const { data: accounts } = await supabase
    .from("meta_ad_accounts")
    .select("*")
    .order("created_at", { ascending: true });

  if (!accounts?.length) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold">Gerenciador de Anúncios</h1>
          <p className="text-sm text-muted-foreground">
            Investimento, resultados e criativos por conta, campanha e conjunto.
          </p>
        </div>
        <BentoGrid>
          <BentoCard span="4x1">
            <EmptyState
              icon={Megaphone}
              title="Nenhuma conta de anúncios configurada ainda"
              description="Cadastre uma conta do Gerenciador de Anúncios da Meta para começar a sincronizar investimento e resultados."
              action={
                <Button asChild size="sm">
                  <Link href="/configuracoes/contas">Configurar conta</Link>
                </Button>
              }
            />
          </BentoCard>
        </BentoGrid>
      </div>
    );
  }

  const contaParam = params.conta;
  const selectedAccount = contaParam
    ? accounts.find((a) => a.id === contaParam) ?? null
    : null;

  const since = params.since || defaultSince();
  const until = params.until || todayStr();
  const busca = (params.busca || "").trim().toLowerCase();

  const [{ data: reportRows }, { data: dailyTotals }] = await Promise.all([
    supabase.rpc("get_meta_ads_report", {
      p_ad_account_id: selectedAccount?.id ?? null,
      p_since: since,
      p_until: until,
    }),
    supabase.rpc("get_meta_daily_totals", {
      p_ad_account_id: selectedAccount?.id ?? null,
      p_since: since,
      p_until: until,
    }),
  ]);

  const allRows = (reportRows ?? []) as AdReportRow[];
  const rows = busca
    ? allRows.filter((r) =>
        [r.campaign_name, r.adset_name, r.ad_name]
          .filter(Boolean)
          .some((name) => name!.toLowerCase().includes(busca))
      )
    : allRows;

  const totals = sumTotals(rows);
  const top5Ads = topAds(rows);
  const top5Audiences = topAudiences(rows);

  let latestJob = null;
  if (selectedAccount) {
    const { data } = await supabase
      .from("meta_sync_jobs")
      .select("*")
      .eq("ad_account_id", selectedAccount.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    latestJob = data;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Gerenciador de Anúncios</h1>
          <p className="text-sm text-muted-foreground">
            Investimento, resultados e criativos por conta, campanha e conjunto.
          </p>
        </div>
        {selectedAccount ? (
          <SyncButton
            key={selectedAccount.id}
            accountId={selectedAccount.id}
            timezone={selectedAccount.timezone}
            initialJob={latestJob}
          />
        ) : (
          <p className="text-xs text-muted-foreground">
            Selecione uma conta específica pra sincronizar.
          </p>
        )}
      </div>

      <Filters accounts={accounts} />

      <BentoGrid>
        <BentoCard span="1x1">
          <p className="text-xs text-muted-foreground">Investimento</p>
          <p className="tabular-data mt-1 text-2xl font-semibold">
            {formatCurrency(totals.spend)}
          </p>
        </BentoCard>
        <BentoCard span="1x1">
          <p className="text-xs text-muted-foreground">Resultados</p>
          <p className="tabular-data mt-1 text-2xl font-semibold">
            {formatInteger(totals.resultados)}
          </p>
        </BentoCard>
        <BentoCard span="1x1">
          <p className="text-xs text-muted-foreground">Custo por resultado</p>
          <p className="tabular-data mt-1 text-2xl font-semibold">
            {costPerResult(totals) != null
              ? formatCurrency(costPerResult(totals)!)
              : "—"}
          </p>
        </BentoCard>
        <BentoCard span="1x1">
          <p className="text-xs text-muted-foreground">CTR</p>
          <p className="tabular-data mt-1 text-2xl font-semibold">
            {ctr(totals) != null ? formatPercent(ctr(totals)!) : "—"}
          </p>
        </BentoCard>

        <BentoCard span="4x1">
          <p className="mb-2 text-sm font-medium">Investimento × Resultados no tempo</p>
          <InvestmentChart data={dailyTotals ?? []} />
        </BentoCard>

        <BentoCard span="2x1">
          <p className="mb-3 text-sm font-medium">Top criativos</p>
          {top5Ads.length ? (
            <ul className="space-y-2">
              {top5Ads.map((ad) => (
                <li key={ad.ad_id} className="flex items-center justify-between text-sm">
                  <span className="truncate pr-2">{ad.ad_name ?? ad.ad_id}</span>
                  <span className="tabular-data shrink-0 text-muted-foreground">
                    {formatInteger(ad.resultados)} res · {formatCurrency(ad.spend)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Sem dados suficientes ainda.</p>
          )}
        </BentoCard>

        <BentoCard span="2x1">
          <p className="mb-3 text-sm font-medium">Top públicos</p>
          {top5Audiences.length ? (
            <ul className="space-y-2">
              {top5Audiences.map((a) => (
                <li key={a.id} className="flex items-center justify-between text-sm">
                  <span className="truncate pr-2">{a.name}</span>
                  <span className="tabular-data shrink-0 text-muted-foreground">
                    {formatInteger(a.totals.resultados)} res · {formatCurrency(a.totals.spend)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Sem dados suficientes ainda.</p>
          )}
        </BentoCard>

        <BentoCard span="4x1">
          <p className="mb-2 text-sm font-medium">Campanhas</p>
          <AdsTreeTable rows={rows} />
        </BentoCard>
      </BentoGrid>
    </div>
  );
}
