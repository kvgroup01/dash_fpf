"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { parseDelimitedText } from "@/lib/leads/parse";
import { suggestFieldForHeader } from "@/lib/leads/fields";
import { buildImportRows, type ColumnMapping } from "@/lib/leads/import";
import type { Json } from "@/types/database.types";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Não autenticado.");
  }
}

export interface AnalyzeResult {
  error?: string;
  headers?: string[];
  rowCount?: number;
  mapping?: ColumnMapping;
}

export async function analyzeImport(
  sourceId: string,
  rawText: string
): Promise<AnalyzeResult> {
  await requireUser();

  const { headers, rows } = parseDelimitedText(rawText);
  if (!headers.length || !rows.length) {
    return { error: "Não encontrei cabeçalho ou linhas nesse texto colado." };
  }

  const admin = createAdminClient();
  const { data: source } = await admin
    .from("lead_sources")
    .select("mapeamento")
    .eq("id", sourceId)
    .single();

  const savedMapping = (source?.mapeamento as ColumnMapping | null) ?? {};

  const mapping: ColumnMapping = {};
  for (const header of headers) {
    mapping[header] = savedMapping[header] ?? suggestFieldForHeader(header);
  }

  return { headers, rowCount: rows.length, mapping };
}

export interface PreviewResult {
  error?: string;
  total?: number;
  novas?: number;
  atualizadas?: number;
  erros?: { index: number; chave: string | null; error: string }[];
}

export async function previewImport(
  sourceId: string,
  rawText: string,
  mapping: ColumnMapping
): Promise<PreviewResult> {
  await requireUser();

  const { rows } = parseDelimitedText(rawText);
  if (!rows.length) {
    return { error: "Não encontrei linhas nesse texto colado." };
  }

  const hasChaveMapped = Object.values(mapping).includes("chave");
  if (!hasChaveMapped) {
    return { error: 'Mapeie ao menos uma coluna para "Chave" antes de continuar.' };
  }

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("leads")
    .select("chave")
    .eq("source_id", sourceId);

  const existingChaves = new Set((existing ?? []).map((r) => r.chave));
  const summary = buildImportRows(sourceId, rows, mapping, existingChaves);

  return {
    total: summary.total,
    novas: summary.novas,
    atualizadas: summary.atualizadas,
    erros: summary.erros.slice(0, 30),
  };
}

export interface CommitResult {
  error?: string;
  success?: string;
  novas?: number;
  atualizadas?: number;
  erros?: number;
}

export async function commitImport(
  sourceId: string,
  rawText: string,
  mapping: ColumnMapping
): Promise<CommitResult> {
  await requireUser();

  const { rows } = parseDelimitedText(rawText);
  if (!rows.length) {
    return { error: "Não encontrei linhas nesse texto colado." };
  }

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("leads")
    .select("chave")
    .eq("source_id", sourceId);

  const existingChaves = new Set((existing ?? []).map((r) => r.chave));
  const summary = buildImportRows(sourceId, rows, mapping, existingChaves);

  const validRows = summary.results
    .filter((r) => r.row)
    .map((r) => r.row as Record<string, unknown>);

  if (validRows.length) {
    const { error: upsertError } = await admin
      .from("leads")
      .upsert(validRows as never[], { onConflict: "source_id,chave" });

    if (upsertError) {
      return { error: `Falha ao gravar os leads: ${upsertError.message}` };
    }
  }

  await admin
    .from("lead_sources")
    .update({
      mapeamento: mapping as unknown as Json,
      last_import_at: new Date().toISOString(),
    })
    .eq("id", sourceId);

  await admin.from("import_batches").insert({
    source_id: sourceId,
    linhas_recebidas: summary.total,
    novas: summary.novas,
    atualizadas: summary.atualizadas,
    ignoradas: summary.erros.length,
    erros: summary.erros as unknown as Json,
  });

  revalidatePath("/planilhas");
  revalidatePath("/configuracoes/fontes");

  return {
    success: "Importação concluída.",
    novas: summary.novas,
    atualizadas: summary.atualizadas,
    erros: summary.erros.length,
  };
}
