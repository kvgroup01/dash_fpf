import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeDate, normalizeEmail, normalizePhone } from "@/lib/leads/normalize";
import { leadWebhookSchema } from "@/lib/validation/lead-webhook";
import type { Json } from "@/types/database.types";

export const runtime = "nodejs";

/**
 * Recebe leads de formulário de landing page via n8n (uma fonte por conta de
 * anúncio, cada uma com secret próprio no Vault — mesmo padrão de
 * ads_token_secret_id). Nunca passa por proxy.ts (não cobre /api), então a
 * validação do secret é só aqui, igual api/cron/process-meta-jobs.
 *
 * Depois de gravar, chama match_leads (não é trigger) pra já sair
 * classificado, do jeito que commitImport faz pra colagem manual.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ sourceId: string }> }
) {
  const { sourceId } = await params;
  const secret = request.headers.get("x-webhook-secret");
  if (!secret) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: source, error: sourceError } = await admin
    .from("lead_sources")
    .select("id, ativo, webhook_secret_id")
    .eq("id", sourceId)
    .single();

  if (sourceError || !source || !source.ativo || !source.webhook_secret_id) {
    return Response.json({ error: "fonte não encontrada" }, { status: 404 });
  }

  const { data: expectedSecret, error: secretError } = await admin.rpc("get_secret", {
    secret_id: source.webhook_secret_id,
  });

  if (secretError || !expectedSecret || secret !== expectedSecret) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = leadWebhookSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "payload inválido", detalhes: parsed.error.issues },
      { status: 400 }
    );
  }

  const input = parsed.data;
  const emailNorm = normalizeEmail(input.email ?? null);
  const telefoneNorm = normalizePhone(input.telefone ?? null);
  const chave = input.chave?.trim() || emailNorm || telefoneNorm || null;

  if (!chave) {
    return Response.json(
      { error: "informe ao menos chave, email ou telefone" },
      { status: 400 }
    );
  }

  const dataRaw = input.data ? input.data.split("T")[0] : null;

  const { data: existing } = await admin
    .from("leads")
    .select("chave")
    .eq("source_id", sourceId)
    .eq("chave", chave)
    .maybeSingle();

  const row = {
    source_id: sourceId,
    chave,
    data: dataRaw ? normalizeDate(dataRaw) : null,
    nome: input.nome ?? null,
    email: input.email ?? null,
    email_norm: emailNorm,
    telefone: input.telefone ?? null,
    telefone_norm: telefoneNorm,
    escolaridade: input.escolaridade ?? null,
    turno: input.turno ?? null,
    utm_source: input.utm_source ?? null,
    utm_medium: input.utm_medium ?? null,
    utm_campaign: input.utm_campaign ?? null,
    utm_content: input.utm_content ?? null,
    utm_term: input.utm_term ?? null,
    extra: (input.extra ?? {}) as Json,
  };

  const { error: upsertError } = await admin
    .from("leads")
    .upsert([row] as never[], { onConflict: "source_id,chave" });

  if (upsertError) {
    return Response.json(
      { error: `falha ao gravar o lead: ${upsertError.message}` },
      { status: 500 }
    );
  }

  await admin
    .from("lead_sources")
    .update({ last_import_at: new Date().toISOString() })
    .eq("id", sourceId);

  await admin.from("import_batches").insert({
    source_id: sourceId,
    linhas_recebidas: 1,
    novas: existing ? 0 : 1,
    atualizadas: existing ? 1 : 0,
    ignoradas: 0,
    erros: [] as unknown as Json,
  });

  await admin.rpc("match_leads", { p_source_id: sourceId });

  revalidatePath("/planilhas");
  revalidatePath("/configuracoes/fontes");
  revalidatePath("/visualizacao");

  return Response.json({ success: true, chave, isNew: !existing });
}
