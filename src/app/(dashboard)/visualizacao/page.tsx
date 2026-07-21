import { AlertTriangle, LineChart } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { BentoGrid } from "@/components/bento/bento-grid";
import { BentoCard } from "@/components/bento/bento-card";
import { EmptyState } from "@/components/empty-state";
import { AdsTreeTable } from "@/components/tables/ads-tree-table";
import { formatCurrency } from "@/lib/format/currency";
import { formatInteger, formatPercent } from "@/lib/format/number";
import {
  costPerResult,
  sumTotals,
  topAds,
  topAudiences,
  type AdReportRow,
} from "@/lib/meta/report";
import { AcaoBuilder, type SavedAcao } from "./acao-builder";
import { LeadsChart } from "./leads-chart";

const BREAKDOWN_DIMENSIONS: { key: string; label: string }[] = [
  { key: "origem", label: "Origem" },
  { key: "vendedor", label: "Vendedor" },
  { key: "turno", label: "Turno" },
  { key: "interesse", label: "Interesse" },
  { key: "renda_familiar", label: "Renda Familiar" },
  { key: "status", label: "Status" },
];

const FUNIL_STAGES: { key: string; label: string }[] = [
  { key: "leads_total", label: "Leads" },
  { key: "contatados", label: "Contatado" },
  { key: "agendamentos", label: "Agendamento" },
  { key: "atendimentos", label: "Atendimento" },
  { key: "orcamentos", label: "Orçamento" },
  { key: "fechamentos", label: "Fechamento" },
  { key: "vendas_pagas", label: "Pago" },
];

function defaultSince(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export default async function VisualizacaoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  const [
    { data: accounts },
    { data: sources },
    { data: acoesRaw },
    { data: settings },
    { data: campaignRows },
  ] = await Promise.all([
    supabase.from("meta_ad_accounts").select("*").order("created_at", { ascending: true }),
    supabase.from("lead_sources").select("*").order("created_at", { ascending: true }),
    supabase
      .from("acoes")
      .select("*, acao_campanhas(campaign_id), acao_fontes(source_id)")
      .order("created_at", { ascending: true }),
    supabase.from("settings").select("*").eq("id", true).single(),
    supabase.from("meta_insights_daily").select("ad_account_id,campaign_id,campaign_name"),
  ]);

  if (!accounts?.length || !sources?.length) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold">Visualização</h1>
          <p className="text-sm text-muted-foreground">
            O cruzamento entre investimento e leads reais, por Ação.
          </p>
        </div>
        <BentoGrid>
          <BentoCard span="4x1">
            <EmptyState
              icon={LineChart}
              title="Cadastre uma conta e uma fonte primeiro"
              description="Uma Ação amarra uma conta de anúncios, suas campanhas e fontes de leads correspondentes — configure isso em Configurações antes de montar a primeira análise."
            />
          </BentoCard>
        </BentoGrid>
      </div>
    );
  }

  const campaignsByAccount: Record<string, { value: string; label: string }[]> = {};
  const seen = new Set<string>();
  for (const row of campaignRows ?? []) {
    const key = `${row.ad_account_id}:${row.campaign_id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    (campaignsByAccount[row.ad_account_id] ??= []).push({
      value: row.campaign_id,
      label: row.campaign_name ?? row.campaign_id,
    });
  }

  const savedAcoes: SavedAcao[] = (acoesRaw ?? []).map((a) => ({
    id: a.id,
    label: a.label,
    ad_account_id: a.ad_account_id,
    periodo_inicio: a.periodo_inicio,
    periodo_fim: a.periodo_fim,
    campanhas: (a.acao_campanhas ?? []).map((c: { campaign_id: string }) => c.campaign_id),
    fontes: (a.acao_fontes ?? []).map((f: { source_id: string }) => f.source_id),
  }));

  const contaId = params.conta || accounts[0].id;
  const campanhas = params.campanhas ? params.campanhas.split(",").filter(Boolean) : [];
  const fontes = params.fontes ? params.fontes.split(",").filter(Boolean) : [];
  const since = params.since || defaultSince();
  const until = params.until || todayStr();

  const matchingAcao = savedAcoes.find(
    (a) =>
      a.ad_account_id === contaId &&
      a.campanhas.length === campanhas.length &&
      a.campanhas.every((c) => campanhas.includes(c)) &&
      a.fontes.length === fontes.length &&
      a.fontes.every((f) => fontes.includes(f))
  );

  const builder = (
    <AcaoBuilder
      accounts={accounts}
      sources={sources}
      campaignsByAccount={campaignsByAccount}
      savedAcoes={savedAcoes}
      initial={{
        acaoId: matchingAcao?.id ?? "__nova__",
        contaId,
        campanhas,
        fontes,
        since,
        until,
      }}
    />
  );

  if (!campanhas.length || !fontes.length) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold">Visualização</h1>
          <p className="text-sm text-muted-foreground">
            O cruzamento entre investimento e leads reais, por Ação.
          </p>
        </div>
        {builder}
        <BentoGrid>
          <BentoCard span="4x1">
            <EmptyState
              icon={LineChart}
              title="Monte uma Ação pra ver o cruzamento"
              description="Escolha a conta, as campanhas e as fontes de leads acima (ou selecione uma Ação salva) e clique em Analisar."
            />
          </BentoCard>
        </BentoGrid>
      </div>
    );
  }

  const [{ data: kpis }, { data: dailyLeads }, { data: reportRows }, breakdowns] =
    await Promise.all([
      supabase.rpc("get_acao_kpis", {
        p_campaign_ids: campanhas,
        p_source_ids: fontes,
        p_since: since,
        p_until: until,
      }),
      supabase.rpc("get_acao_daily_leads", {
        p_source_ids: fontes,
        p_since: since,
        p_until: until,
      }),
      supabase.rpc("get_meta_ads_report", {
        p_ad_account_id: contaId,
        p_since: since,
        p_until: until,
      }),
      Promise.all(
        BREAKDOWN_DIMENSIONS.map(async (d) => ({
          key: d.key,
          label: d.label,
          rows:
            (
              await supabase.rpc("get_acao_lead_breakdown", {
                p_source_ids: fontes,
                p_dimension: d.key,
                p_since: since,
                p_until: until,
              })
            ).data ?? [],
        }))
      ),
    ]);

  const kpi = kpis?.[0];
  const kpiValues = (kpi ?? {}) as Record<string, number>;
  const acaoRows = ((reportRows ?? []) as AdReportRow[]).filter((r) =>
    campanhas.includes(r.campaign_id)
  );
  const totals = sumTotals(acaoRows);

  const metaResultados = kpi?.meta_resultados ?? 0;
  const leadsTotal = kpi?.leads_total ?? 0;
  const divergenciaPct =
    metaResultados > 0 ? (Math.abs(metaResultados - leadsTotal) / metaResultados) * 100 : 0;
  const limiar = settings?.divergencia_alerta_pct ?? 20;
  const divergenciaAlta = divergenciaPct > limiar;

  const temMatchIndividual = (kpi?.leads_com_match ?? 0) > 0;

  // get_meta_ads_report vem agregado no período inteiro (não por dia), então o
  // gráfico mostra leads/dia; o investimento fica só como referência de fundo.
  const chartData = (dailyLeads ?? []).map((d) => ({
    date: d.dia,
    spend: 0,
    leads: d.leads,
    cpl: null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Visualização</h1>
        <p className="text-sm text-muted-foreground">
          O cruzamento entre investimento e leads reais, por Ação.
        </p>
      </div>

      {builder}

      {divergenciaAlta && (
        <div className="glass-surface flex items-center gap-3 rounded-[var(--radius)] border border-amber-500/30 p-3 text-sm">
          <AlertTriangle className="size-5 shrink-0 text-amber-500" />
          <p>
            <strong>{formatPercent(divergenciaPct / 100)}</strong> de divergência entre
            resultados da Meta ({formatInteger(metaResultados)}) e leads da planilha (
            {formatInteger(leadsTotal)}) — acima do limiar de {limiar}% configurado em
            Configurações. Normalmente é lead que não entrou na planilha ou janela de
            atribuição diferente.
          </p>
        </div>
      )}

      <BentoGrid>
        <BentoCard span="2x2">
          <p className="mb-3 text-sm font-medium">Meta</p>
          <div className="grid grid-cols-2 gap-3">
            <Kpi label="Investimento" value={formatCurrency(kpi?.meta_spend ?? 0)} />
            <Kpi label="Resultados" value={formatInteger(metaResultados)} />
            <Kpi
              label="Custo/resultado"
              value={
                metaResultados > 0
                  ? formatCurrency((kpi?.meta_spend ?? 0) / metaResultados)
                  : "—"
              }
            />
            <Kpi label="Impressões" value={formatInteger(kpi?.meta_impressions ?? 0)} />
            <Kpi label="Alcance" value={formatInteger(kpi?.meta_reach ?? 0)} />
            <Kpi
              label="CTR"
              value={
                kpi?.meta_impressions
                  ? formatPercent((kpi.meta_clicks ?? 0) / kpi.meta_impressions)
                  : "—"
              }
            />
          </div>
        </BentoCard>

        <BentoCard span="2x2">
          <p className="mb-3 text-sm font-medium">Planilha</p>
          <div className="grid grid-cols-2 gap-3">
            <Kpi label="Leads reais" value={formatInteger(leadsTotal)} />
            <Kpi
              label="CPL real"
              value={leadsTotal > 0 ? formatCurrency((kpi?.meta_spend ?? 0) / leadsTotal) : "—"}
            />
            <Kpi label="Vendas pagas" value={formatInteger(kpi?.vendas_pagas ?? 0)} />
            <Kpi label="Receita" value={formatCurrency(kpi?.receita ?? 0)} />
            <Kpi
              label="CAC real"
              value={
                kpi?.vendas_pagas
                  ? formatCurrency((kpi.meta_spend ?? 0) / kpi.vendas_pagas)
                  : "—"
              }
            />
            <Kpi
              label="ROAS real"
              value={
                kpi?.meta_spend
                  ? `${((kpi.receita ?? 0) / kpi.meta_spend).toFixed(2)}x`
                  : "—"
              }
            />
          </div>
        </BentoCard>

        <BentoCard span="4x1">
          <p className="mb-2 text-sm font-medium">Funil</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {FUNIL_STAGES.map((stage) => (
              <div
                key={stage.key}
                className="glass-surface rounded-[var(--radius)] p-3 text-center"
              >
                <p className="text-xl font-semibold">
                  {formatInteger(kpiValues[stage.key] ?? 0)}
                </p>
                <p className="text-xs text-muted-foreground">{stage.label}</p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {formatInteger(kpi?.leads_grupo ?? 0)} lead(s) atribuído(s) no nível de grupo
            (sem UTM) · {formatInteger(kpi?.leads_sem_origem ?? 0)} sem origem identificada.
          </p>
        </BentoCard>

        <BentoCard span="4x1">
          <p className="mb-2 text-sm font-medium">Leads no tempo</p>
          <LeadsChart data={chartData} />
        </BentoCard>

        <BentoCard span="2x1">
          <p className="mb-3 text-sm font-medium">Top criativos (da Ação)</p>
          <RankingList
            items={topAds(acaoRows).map((ad) => ({
              key: ad.ad_id,
              name: ad.ad_name ?? ad.ad_id,
              resultados: ad.resultados,
              spend: ad.spend,
            }))}
          />
        </BentoCard>

        <BentoCard span="2x1">
          <p className="mb-3 text-sm font-medium">Top públicos (da Ação)</p>
          <RankingList
            items={topAudiences(acaoRows).map((a) => ({
              key: a.id,
              name: a.name,
              resultados: a.totals.resultados,
              spend: a.totals.spend,
            }))}
          />
        </BentoCard>

        {BREAKDOWN_DIMENSIONS.map((dim) => {
          const data = breakdowns.find((b) => b.key === dim.key)?.rows ?? [];
          return (
            <BentoCard key={dim.key} span="1x1">
              <p className="mb-2 text-sm font-medium">{dim.label}</p>
              {data.length ? (
                <ul className="space-y-1 text-xs">
                  {data.slice(0, 5).map((row) => (
                    <li key={row.valor} className="flex items-center justify-between gap-2">
                      <span className="truncate text-muted-foreground">{row.valor}</span>
                      <span className="tabular-data shrink-0">{formatInteger(row.total)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">Sem dados.</p>
              )}
            </BentoCard>
          );
        })}

        <BentoCard span="4x1">
          <p className="mb-2 text-sm font-medium">Campanhas da Ação</p>
          {!temMatchIndividual ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Essa fonte não tem UTM — a atribuição é só no nível de grupo (a Ação
              inteira), o rateio por campanha individual não está disponível. Os KPIs
              acima já refletem isso.
            </p>
          ) : (
            <>
              <p className="mb-2 text-xs text-muted-foreground">
                Custo por resultado no nível de campanha:{" "}
                {costPerResult(totals) != null ? formatCurrency(costPerResult(totals)!) : "—"}
              </p>
              <AdsTreeTable rows={acaoRows} />
            </>
          )}
        </BentoCard>
      </BentoGrid>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="tabular-data text-lg font-semibold">{value}</p>
    </div>
  );
}

function RankingList({
  items,
}: {
  items: { key: string; name: string; resultados: number; spend: number }[];
}) {
  if (!items.length) {
    return <p className="text-sm text-muted-foreground">Sem dados suficientes ainda.</p>;
  }
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.key} className="flex items-center justify-between text-sm">
          <span className="truncate pr-2">{item.name}</span>
          <span className="tabular-data shrink-0 text-muted-foreground">
            {formatInteger(item.resultados)} res · {formatCurrency(item.spend)}
          </span>
        </li>
      ))}
    </ul>
  );
}
