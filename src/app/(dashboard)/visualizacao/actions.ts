"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Não autenticado.");
  }
}

export type ActionState = { error?: string; success?: string; acaoId?: string } | undefined;

const acaoSchema = z.object({
  label: z.string().trim().min(1, "Obrigatório"),
  ad_account_id: z.string().trim().min(1, "Selecione uma conta"),
  periodo_inicio: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : null)),
  periodo_fim: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : null)),
});

export async function createAcao(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireUser();

  const parsed = acaoSchema.safeParse({
    label: formData.get("label"),
    ad_account_id: formData.get("ad_account_id"),
    periodo_inicio: formData.get("periodo_inicio"),
    periodo_fim: formData.get("periodo_fim"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const campanhas = formData.getAll("campanhas").map(String).filter(Boolean);
  const fontes = formData.getAll("fontes").map(String).filter(Boolean);

  if (!campanhas.length) {
    return { error: "Selecione ao menos uma campanha." };
  }
  if (!fontes.length) {
    return { error: "Selecione ao menos uma fonte de leads." };
  }

  const admin = createAdminClient();

  const { data: acao, error: insertError } = await admin
    .from("acoes")
    .insert(parsed.data)
    .select("id")
    .single();

  if (insertError || !acao) {
    return { error: "Falha ao criar a Ação." };
  }

  const { error: campanhasError } = await admin
    .from("acao_campanhas")
    .insert(campanhas.map((campaign_id) => ({ acao_id: acao.id, campaign_id })));

  const { error: fontesError } = await admin
    .from("acao_fontes")
    .insert(fontes.map((source_id) => ({ acao_id: acao.id, source_id })));

  if (campanhasError || fontesError) {
    return { error: "Ação criada, mas falhou ao vincular campanhas/fontes." };
  }

  // Fontes recém-vinculadas podem ter leads que agora se qualificam pro
  // nível "Ação" da cascata — recalcula pra refletir isso na hora.
  await admin.rpc("match_leads", { p_source_id: null });

  revalidatePath("/visualizacao");
  return { success: "Ação salva.", acaoId: acao.id };
}

export async function deleteAcao(id: string): Promise<ActionState> {
  await requireUser();

  const admin = createAdminClient();
  const { error } = await admin.from("acoes").delete().eq("id", id);

  if (error) {
    return { error: "Falha ao excluir a Ação." };
  }

  revalidatePath("/visualizacao");
  return { success: "Ação excluída." };
}

export async function recalculateMatches(): Promise<ActionState> {
  await requireUser();

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("match_leads", { p_source_id: null });

  if (error) {
    return { error: "Falha ao recalcular os matches." };
  }

  revalidatePath("/visualizacao");
  revalidatePath("/planilhas");
  return { success: `Matches recalculados (${data} leads processados).` };
}
