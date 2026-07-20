const BARE_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * timeZone deve sempre vir da conta de anúncios sendo exibida (meta_ad_accounts.timezone),
 * nunca do timezone do navegador — senão os totais não batem com o Gerenciador de Anúncios.
 *
 * Uma coluna `date` do Postgres (ex.: data_inicio) não tem hora nem timezone —
 * é só um dia de calendário. `new Date("2026-01-01")` ancora em UTC meia-noite;
 * reformatar isso num timezone atrás de UTC (o do navegador, se nenhum for
 * passado) pode exibir o dia anterior. Nesse caso, formata direto pelos
 * componentes da string, sem passar por Date/timezone nenhum.
 */
export function formatDate(date: Date | string, timeZone?: string): string {
  if (typeof date === "string" && BARE_DATE_RE.test(date)) {
    const [year, month, day] = date.split("-");
    return `${day}/${month}/${year}`;
  }

  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone,
  }).format(d);
}

export function formatDateTime(date: Date | string, timeZone?: string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  }).format(d);
}
