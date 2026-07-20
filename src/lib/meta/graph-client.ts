import "server-only";
import { META_GRAPH_API_BASE_URL, META_THROTTLE_ERROR_CODES } from "./constants";

export interface RateLimitInfo {
  callCount: number;
  totalCpuTime: number;
  totalTime: number;
  estimatedTimeToRegainAccess: number;
}

export class MetaGraphApiError extends Error {
  code?: number;
  subcode?: number;
  rateLimit: RateLimitInfo | null;

  constructor(
    message: string,
    code?: number,
    subcode?: number,
    rateLimit: RateLimitInfo | null = null
  ) {
    super(message);
    this.code = code;
    this.subcode = subcode;
    this.rateLimit = rateLimit;
  }

  get isThrottle(): boolean {
    return this.code != null && (META_THROTTLE_ERROR_CODES as readonly number[]).includes(this.code);
  }
}

const ACCOUNT_STATUS_LABELS: Record<number, string> = {
  1: "Ativa",
  2: "Desabilitada",
  3: "Não finalizada",
  7: "Em revisão de risco",
  8: "Pendente de pagamento",
  9: "Em período de carência",
  100: "Pendente de encerramento",
  101: "Encerrada",
};

export function describeAccountStatus(status: number): string {
  return ACCOUNT_STATUS_LABELS[status] ?? `Status desconhecido (${status})`;
}

/**
 * O header vem como {"<ad_account_id>":[{"type":"ads_insights","call_count":N,...}]}
 * — pega o primeiro bucket de uso, é o suficiente pro dispatcher decidir pausar a conta.
 */
function parseRateLimitHeader(headerValue: string | null): RateLimitInfo | null {
  if (!headerValue) return null;
  try {
    const parsed = JSON.parse(headerValue) as Record<
      string,
      Array<Record<string, number>>
    >;
    const usage = Object.values(parsed)[0]?.[0];
    if (!usage) return null;
    return {
      callCount: usage.call_count ?? 0,
      totalCpuTime: usage.total_cputime ?? 0,
      totalTime: usage.total_time ?? 0,
      estimatedTimeToRegainAccess: usage.estimated_time_to_regain_access ?? 0,
    };
  } catch {
    return null;
  }
}

/**
 * Usa o header Authorization em vez do query param access_token — evita que
 * o token apareça em log de URL de proxy/CDN.
 */
async function graphFetch<T>(
  path: string,
  accessToken: string,
  params: Record<string, string>,
  method: "GET" | "POST" = "GET"
): Promise<{ body: T; rateLimit: RateLimitInfo | null }> {
  const url = new URL(`${META_GRAPH_API_BASE_URL}${path}`);
  let init: RequestInit = {
    method,
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  };

  if (method === "GET") {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  } else {
    const form = new URLSearchParams(params);
    init = {
      ...init,
      body: form,
      headers: {
        ...init.headers,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    };
  }

  const response = await fetch(url, init);
  const rateLimit = parseRateLimitHeader(
    response.headers.get("x-business-use-case-usage")
  );
  const body = await response.json();

  if (!response.ok || body.error) {
    throw new MetaGraphApiError(
      body.error?.message ?? "Falha ao conectar com a Meta.",
      body.error?.code,
      body.error?.error_subcode,
      rateLimit
    );
  }

  return { body: body as T, rateLimit };
}

export async function getAdAccountInfo(accessToken: string, adAccountId: string) {
  const { body } = await graphFetch<{
    id: string;
    name: string;
    account_status: number;
  }>(`/${adAccountId}`, accessToken, { fields: "name,account_status" });
  return body;
}

export interface MetaInsightsAction {
  action_type: string;
  value: string;
}

export interface MetaInsightsRow {
  date_start: string;
  date_stop: string;
  campaign_id: string;
  campaign_name: string;
  adset_id: string;
  adset_name: string;
  ad_id: string;
  ad_name: string;
  spend?: string;
  impressions?: string;
  reach?: string;
  frequency?: string;
  clicks?: string;
  inline_link_clicks?: string;
  actions?: MetaInsightsAction[];
  action_values?: MetaInsightsAction[];
}

const INSIGHTS_FIELDS = [
  "spend",
  "impressions",
  "reach",
  "frequency",
  "clicks",
  "inline_link_clicks",
  "actions",
  "action_values",
  "campaign_id",
  "campaign_name",
  "adset_id",
  "adset_name",
  "ad_id",
  "ad_name",
].join(",");

/**
 * POST em /insights (em vez de GET) força a Meta a tratar como relatório
 * assíncrono — devolve report_run_id pra poll, nunca os dados direto.
 * use_unified_attribution_setting=true usa a janela de atribuição já
 * configurada na conta (a mesma que aparece no Gerenciador de Anúncios),
 * então não precisamos parsear/replicar essa configuração aqui.
 */
export async function startInsightsReport(
  accessToken: string,
  adAccountId: string,
  since: string,
  until: string
) {
  const { body, rateLimit } = await graphFetch<{ report_run_id: string }>(
    `/${adAccountId}/insights`,
    accessToken,
    {
      level: "ad",
      time_increment: "1",
      time_range: JSON.stringify({ since, until }),
      fields: INSIGHTS_FIELDS,
      use_unified_attribution_setting: "true",
    },
    "POST"
  );
  return { reportRunId: body.report_run_id, rateLimit };
}

export async function getInsightsReportStatus(
  accessToken: string,
  reportRunId: string
) {
  const { body, rateLimit } = await graphFetch<{
    async_status: string;
    async_percent_completion: number;
  }>(`/${reportRunId}`, accessToken, {
    fields: "async_status,async_percent_completion",
  });
  return { ...body, rateLimit };
}

export async function getInsightsReportPage(
  accessToken: string,
  reportRunId: string,
  after?: string
) {
  const params: Record<string, string> = { limit: "500" };
  if (after) params.after = after;

  const { body, rateLimit } = await graphFetch<{
    data: MetaInsightsRow[];
    paging?: { cursors?: { after?: string }; next?: string };
  }>(`/${reportRunId}/insights`, accessToken, params);

  return {
    rows: body.data,
    after: body.paging?.cursors?.after,
    hasNext: Boolean(body.paging?.next),
    rateLimit,
  };
}

export async function getCustomConversions(
  accessToken: string,
  adAccountId: string
) {
  const { body } = await graphFetch<{
    data: { id: string; name: string; description?: string }[];
  }>(`/${adAccountId}/customconversions`, accessToken, {
    fields: "id,name,description",
  });
  return body.data;
}
