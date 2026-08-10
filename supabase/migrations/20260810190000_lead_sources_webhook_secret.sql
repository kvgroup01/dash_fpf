-- Endpoint de webhook (POST /api/leads/webhook/[sourceId]) pra receber leads
-- de formulário de landing page via n8n, como fonte alternativa à colagem
-- manual de planilha. Cada fonte pode ter um segredo próprio guardado no
-- Vault (mesmo padrão de ads_token_secret_id em meta_ad_accounts) — o
-- endpoint compara o header x-webhook-secret contra o valor decifrado antes
-- de aceitar o payload.
alter table public.lead_sources
  add column webhook_secret_id uuid;
