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

const settingsSchema = z.object({
  moeda_padrao: z.string().trim().toUpperCase().length(3, "Use o código de 3 letras (ex.: BRL)"),
  timezone_padrao: z.string().trim().min(1, "Obrigatório"),
  janela_atribuicao_padrao: z.string().trim().min(1, "Obrigatório"),
  divergencia_alerta_pct: z.coerce.number().min(0, "Não pode ser negativo"),
});

export type SettingsActionState = { error?: string; success?: string } | undefined;

export async function updateSettings(
  _prev: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  await requireUser();

  const parsed = settingsSchema.safeParse({
    moeda_padrao: formData.get("moeda_padrao"),
    timezone_padrao: formData.get("timezone_padrao"),
    janela_atribuicao_padrao: formData.get("janela_atribuicao_padrao"),
    divergencia_alerta_pct: formData.get("divergencia_alerta_pct"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("settings")
    .update(parsed.data)
    .eq("id", true);

  if (error) {
    return { error: "Falha ao salvar as configurações." };
  }

  revalidatePath("/configuracoes");
  return { success: "Configurações salvas." };
}
