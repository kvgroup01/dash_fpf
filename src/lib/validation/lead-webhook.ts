import { z } from "zod";

/**
 * Contrato do POST /api/leads/webhook/[sourceId]. Deliberadamente plano e
 * agnóstico de landing page — o n8n normaliza o formData de cada formulário
 * pra esse formato antes de chamar o endpoint, em vez do endpoint tentar
 * entender o envelope inteiro do node de Webhook do n8n (headers/query/body
 * aninhado), que varia por fluxo.
 *
 * utm_campaign idealmente é o campaign_id numérico da Meta (o n8n costuma
 * receber isso em formData.utm.utm_id quando a landing page usa parâmetros
 * dinâmicos do Gerenciador de Anúncios) — casa por id exato na cascata de
 * match, mais confiável que casar por nome de campanha.
 */
export const leadWebhookSchema = z.object({
  chave: z.string().trim().min(1).optional(),
  nome: z.string().trim().min(1).optional(),
  email: z.string().trim().min(1).optional(),
  telefone: z.string().trim().min(1).optional(),
  escolaridade: z.string().trim().min(1).optional(),
  turno: z.string().trim().min(1).optional(),
  data: z.string().trim().min(1).optional(),
  utm_source: z.string().trim().min(1).optional(),
  utm_medium: z.string().trim().min(1).optional(),
  utm_campaign: z.string().trim().min(1).optional(),
  utm_content: z.string().trim().min(1).optional(),
  utm_term: z.string().trim().min(1).optional(),
  extra: z.record(z.string(), z.unknown()).optional(),
});

export type LeadWebhookInput = z.infer<typeof leadWebhookSchema>;
