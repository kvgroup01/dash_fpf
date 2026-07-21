import { LEAD_FIELDS, UNMAPPED, type LeadField } from "./fields";
import { normalizeDate, normalizeEmail, normalizeNumeric, normalizePhone } from "./normalize";

const FIELD_BY_KEY = new Map<string, LeadField>(LEAD_FIELDS.map((f) => [f.key, f]));

export type ColumnMapping = Record<string, string>;

export interface ImportRowResult {
  index: number;
  chave: string | null;
  /** Pronto pra upsert em `leads` (inclui extra jsonb) — null quando error != null. */
  row: Record<string, unknown> | null;
  isNew: boolean;
  error: string | null;
}

export interface ImportSummary {
  total: number;
  novas: number;
  atualizadas: number;
  erros: { index: number; chave: string | null; error: string }[];
  results: ImportRowResult[];
}

/**
 * Uma única função de mapeamento/normalização/diff, usada tanto no preview
 * quanto no commit — evita duas implementações divergindo com o tempo.
 */
export function buildImportRows(
  sourceId: string,
  rawRows: Record<string, string>[],
  mapping: ColumnMapping,
  existingChaves: Set<string>
): ImportSummary {
  const seenInBatch = new Set<string>();
  const results: ImportRowResult[] = [];

  rawRows.forEach((raw, index) => {
    const known: Record<string, unknown> = {};
    const extra: Record<string, string> = {};

    for (const [header, target] of Object.entries(mapping)) {
      const value = raw[header]?.trim() ?? "";
      if (target === UNMAPPED) {
        if (value) extra[header] = value;
        continue;
      }

      const field = FIELD_BY_KEY.get(target);
      if (!field) continue;

      if (!value) {
        known[field.key] = null;
      } else if (field.type === "date") {
        known[field.key] = normalizeDate(value);
        if (known[field.key] === null) {
          results.push({
            index,
            chave: raw[findHeaderFor(mapping, "chave")]?.trim() ?? null,
            row: null,
            isNew: false,
            error: `Data inválida em "${field.label}": "${value}"`,
          });
          return;
        }
      } else if (field.type === "numeric") {
        known[field.key] = normalizeNumeric(value);
      } else {
        known[field.key] = value;
      }
    }

    const chave = typeof known.chave === "string" ? known.chave.trim() : "";
    if (!chave) {
      results.push({ index, chave: null, row: null, isNew: false, error: "Chave vazia" });
      return;
    }
    if (seenInBatch.has(chave)) {
      results.push({ index, chave, row: null, isNew: false, error: "Chave duplicada no lote" });
      return;
    }
    seenInBatch.add(chave);

    const email = typeof known.email === "string" ? known.email : null;
    const telefone = typeof known.telefone === "string" ? known.telefone : null;

    const row = {
      source_id: sourceId,
      chave,
      ...known,
      email_norm: normalizeEmail(email),
      telefone_norm: normalizePhone(telefone),
      extra,
    };

    results.push({
      index,
      chave,
      row,
      isNew: !existingChaves.has(chave),
      error: null,
    });
  });

  const erros = results
    .filter((r) => r.error)
    .map((r) => ({ index: r.index, chave: r.chave, error: r.error! }));

  return {
    total: rawRows.length,
    novas: results.filter((r) => !r.error && r.isNew).length,
    atualizadas: results.filter((r) => !r.error && !r.isNew).length,
    erros,
    results,
  };
}

function findHeaderFor(mapping: ColumnMapping, targetKey: string): string {
  return Object.entries(mapping).find(([, v]) => v === targetKey)?.[0] ?? "";
}
