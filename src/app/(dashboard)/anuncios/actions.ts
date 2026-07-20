"use server";

import { revalidatePath } from "next/cache";
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

export type SyncActionState = { error?: string; success?: string } | undefined;

export async function startSync(
  accountId: string,
  kind: "backfill" | "incremental"
): Promise<SyncActionState> {
  await requireUser();

  const admin = createAdminClient();

  const { data: account, error: accountError } = await admin
    .from("meta_ad_accounts")
    .select("*")
    .eq("id", accountId)
    .single();

  if (accountError || !account) {
    return { error: "Conta não encontrada." };
  }

  const { data: existing } = await admin
    .from("meta_sync_jobs")
    .select("id")
    .eq("ad_account_id", accountId)
    .not("status", "in", "(done,error)")
    .maybeSingle();

  if (existing) {
    return { error: "Já tem uma sincronização em andamento pra essa conta." };
  }

  const until = new Date().toISOString().slice(0, 10);
  const since =
    kind === "backfill"
      ? account.data_inicio
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const { error: insertError } = await admin.from("meta_sync_jobs").insert({
    ad_account_id: accountId,
    kind,
    status: "queued",
    date_range: { since, until },
  });

  if (insertError) {
    return { error: "Falha ao criar o job de sincronização." };
  }

  revalidatePath("/anuncios");
  return { success: "Sincronização iniciada." };
}
