import "server-only";
import { META_GRAPH_API_BASE_URL } from "./constants";

export class MetaGraphApiError extends Error {
  code?: number;
  subcode?: number;

  constructor(message: string, code?: number, subcode?: number) {
    super(message);
    this.code = code;
    this.subcode = subcode;
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
 * Usa o header Authorization em vez do query param access_token — evita que
 * o token apareça em log de URL de proxy/CDN.
 */
async function callGraphApi<T>(path: string, accessToken: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`${META_GRAPH_API_BASE_URL}${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  const body = await response.json();

  if (!response.ok || body.error) {
    throw new MetaGraphApiError(
      body.error?.message ?? "Falha ao conectar com a Meta.",
      body.error?.code,
      body.error?.error_subcode
    );
  }

  return body as T;
}

export async function getAdAccountInfo(accessToken: string, adAccountId: string) {
  return callGraphApi<{ id: string; name: string; account_status: number }>(
    `/${adAccountId}`,
    accessToken,
    { fields: "name,account_status" }
  );
}
