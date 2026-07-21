import Papa from "papaparse";

export interface ParsedSheet {
  headers: string[];
  rows: Record<string, string>[];
}

/**
 * Aceita TSV (colado do Google Sheets) ou CSV — delimitador auto-detectado.
 * Usa papaparse em vez de split ingênuo por `\n`: campos com quebra de
 * linha entre aspas (comum em colunas de observação) só funcionam com um
 * parser de verdade.
 */
export function parseDelimitedText(raw: string): ParsedSheet {
  const result = Papa.parse<Record<string, string>>(raw.trim(), {
    header: true,
    skipEmptyLines: true,
    delimiter: "",
    transformHeader: (h) => h.trim(),
  });

  const headers = result.meta.fields ?? [];
  const rows = result.data.filter((row) =>
    Object.values(row).some((value) => value != null && value !== "")
  );

  return { headers, rows };
}
