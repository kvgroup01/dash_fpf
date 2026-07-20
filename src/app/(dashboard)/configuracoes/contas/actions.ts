"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  describeAccountStatus,
  getAdAccountInfo,
  MetaGraphApiError,
} from "@/lib/meta/graph-client";
import { metaAdAccountSchema } from "@/lib/validation/meta-ad-account";

/**
 * O proxy.ts não cobre Server Functions (elas ignoram o matcher) — cada
 * action revalida a sessão por conta própria, como recomendado pela doc do
 * Next.js 16 sobre proxy.
 */
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

function parseAccountForm(formData: FormData) {
  return metaAdAccountSchema.safeParse({
    label: formData.get("label"),
    ad_account_id: formData.get("ad_account_id"),
    moeda: formData.get("moeda"),
    data_inicio: formData.get("data_inicio"),
    timezone: formData.get("timezone"),
    janela_atribuicao: formData.get("janela_atribuicao"),
    ativo: formData.get("ativo") === "on",
  });
}

export async function createAccount(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireUser();

  const token = String(formData.get("token") ?? "").trim();
  if (!token) {
    return { error: "Token é obrigatório." };
  }

  const parsed = parseAccountForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const admin = createAdminClient();

  const { data: secretId, error: secretError } = await admin.rpc(
    "save_secret",
    {
      secret_name: `meta_ad_account_token_${parsed.data.ad_account_id}_${Date.now()}`,
      secret_value: token,
    }
  );

  if (secretError || !secretId) {
    return { error: "Falha ao cifrar o token no Vault." };
  }

  const { error: insertError } = await admin.from("meta_ad_accounts").insert({
    ...parsed.data,
    ads_token_secret_id: secretId,
  });

  if (insertError) {
    return {
      error: insertError.code === "23505"
        ? "Já existe uma conta com esse ad_account_id."
        : "Falha ao salvar a conta.",
    };
  }

  revalidatePath("/configuracoes/contas");
  return { success: "Conta criada." };
}

export async function updateAccount(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireUser();

  const id = String(formData.get("id") ?? "");
  if (!id) {
    return { error: "Conta inválida." };
  }

  const parsed = parseAccountForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const admin = createAdminClient();
  const token = String(formData.get("token") ?? "").trim();

  if (token) {
    const { data: account } = await admin
      .from("meta_ad_accounts")
      .select("ads_token_secret_id")
      .eq("id", id)
      .single();

    if (account?.ads_token_secret_id) {
      const { error: updateSecretError } = await admin.rpc("update_secret", {
        secret_id: account.ads_token_secret_id,
        secret_value: token,
      });
      if (updateSecretError) {
        return { error: "Falha ao atualizar o token no Vault." };
      }
    } else {
      const { data: secretId, error: secretError } = await admin.rpc(
        "save_secret",
        {
          secret_name: `meta_ad_account_token_${parsed.data.ad_account_id}_${Date.now()}`,
          secret_value: token,
        }
      );
      if (secretError || !secretId) {
        return { error: "Falha ao cifrar o token no Vault." };
      }
      await admin
        .from("meta_ad_accounts")
        .update({ ads_token_secret_id: secretId })
        .eq("id", id);
    }
  }

  const { error: updateError } = await admin
    .from("meta_ad_accounts")
    .update(parsed.data)
    .eq("id", id);

  if (updateError) {
    return { error: "Falha ao salvar a conta." };
  }

  revalidatePath("/configuracoes/contas");
  return { success: "Conta atualizada." };
}

export async function deleteAccount(id: string): Promise<ActionState> {
  await requireUser();

  const admin = createAdminClient();
  const { error } = await admin.from("meta_ad_accounts").delete().eq("id", id);

  if (error) {
    return { error: "Falha ao excluir a conta." };
  }

  revalidatePath("/configuracoes/contas");
  return { success: "Conta excluída." };
}

export async function testConnection(id: string): Promise<ActionState> {
  await requireUser();

  const admin = createAdminClient();
  const { data: account, error } = await admin
    .from("meta_ad_accounts")
    .select("ad_account_id, ads_token_secret_id")
    .eq("id", id)
    .single();

  if (error || !account?.ads_token_secret_id) {
    return { error: "Conta sem token configurado." };
  }

  const { data: token, error: tokenError } = await admin.rpc("get_secret", {
    secret_id: account.ads_token_secret_id,
  });

  if (tokenError || !token) {
    return { error: "Falha ao ler o token no Vault." };
  }

  try {
    const info = await getAdAccountInfo(token, account.ad_account_id);
    return {
      success: `${info.name} — ${describeAccountStatus(info.account_status)}`,
    };
  } catch (e) {
    if (e instanceof MetaGraphApiError) {
      return { error: `Meta: ${e.message}` };
    }
    return { error: "Falha ao conectar com a Meta." };
  }
}
