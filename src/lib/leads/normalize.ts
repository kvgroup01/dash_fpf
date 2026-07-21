/** Só dígitos — remove DDI/DDD/pontuação/espaço. Mesma função usada no preview e no commit. */
export function normalizePhone(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  return digits || null;
}

export function normalizeEmail(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim().toLowerCase();
  return trimmed || null;
}

/**
 * Aceita dd/mm/aaaa, dd/mm/aa e aaaa-mm-dd (o que aparece nas planilhas da
 * FPF e no formato ISO). Retorna `null` se não conseguir parsear — vira
 * erro "data inválida" no preview, nunca uma data inventada.
 */
export function normalizeDate(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const value = raw.trim();
  if (!value) return null;

  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return isValidDate(Number(year), Number(month), Number(day))
      ? `${year}-${month}-${day}`
      : null;
  }

  const brMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (brMatch) {
    const [, d, m, y] = brMatch;
    const year = y.length === 2 ? Number(`20${y}`) : Number(y);
    const month = Number(m);
    const day = Number(d);
    return isValidDate(year, month, day)
      ? `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
      : null;
  }

  return null;
}

function isValidDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/** Numérico livre (Orçamento, Valor da Venda) — aceita "1.234,56" e "1234.56". */
export function normalizeNumeric(raw: string | undefined | null): number | null {
  if (!raw) return null;
  const value = raw.trim();
  if (!value) return null;

  const cleaned = value.includes(",")
    ? value.replace(/\./g, "").replace(",", ".").replace(/[^0-9.-]/g, "")
    : value.replace(/[^0-9.-]/g, "");

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}
