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

export type ActionState = { error?: string; success?: string } | undefined;

const sourceSchema = z.object({
  label: z.string().trim().min(1, "Obrigatório"),
  tipo: z.enum(["crm", "leads_utm"]),
  ad_account_id: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : null)),
  ativo: z.coerce.boolean(),
});

function parseSourceForm(formData: FormData) {
  const rawAccountId = String(formData.get("ad_account_id") ?? "");
  return sourceSchema.safeParse({
    label: formData.get("label"),
    tipo: formData.get("tipo"),
    ad_account_id: rawAccountId === "__none__" ? "" : rawAccountId,
    ativo: formData.get("ativo") === "on",
  });
}

export async function createSource(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireUser();

  const parsed = parseSourceForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("lead_sources").insert(parsed.data);

  if (error) {
    return { error: "Falha ao criar a fonte." };
  }

  revalidatePath("/configuracoes/fontes");
  return { success: "Fonte criada." };
}

export async function updateSource(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireUser();

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Fonte inválida." };

  const parsed = parseSourceForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("lead_sources").update(parsed.data).eq("id", id);

  if (error) {
    return { error: "Falha ao salvar a fonte." };
  }

  revalidatePath("/configuracoes/fontes");
  return { success: "Fonte atualizada." };
}

export async function deleteSource(id: string): Promise<ActionState> {
  await requireUser();

  const admin = createAdminClient();
  const { error } = await admin.from("lead_sources").delete().eq("id", id);

  if (error) {
    return { error: "Falha ao excluir a fonte." };
  }

  revalidatePath("/configuracoes/fontes");
  return { success: "Fonte excluída." };
}
