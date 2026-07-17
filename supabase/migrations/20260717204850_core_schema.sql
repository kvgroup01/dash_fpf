-- Schema completo do PROJETO FPF (Fase 0.5).
-- RLS é habilitada tabela a tabela, na mesma migration que a cria — nunca depois.
-- Convenção: em qualquer tabela, a coluna "ad_account_id" é sempre uma FK (uuid)
-- para meta_ad_accounts.id. O identificador externo da Meta ("act_...") mora
-- só em meta_ad_accounts.ad_account_id (text).

create extension if not exists pg_trgm;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- settings (linha única)
-- ---------------------------------------------------------------------------
create table public.settings (
  id boolean primary key default true,
  moeda_padrao text not null default 'BRL',
  timezone_padrao text not null default 'America/Sao_Paulo',
  janela_atribuicao_padrao text not null default '7d_click_1d_view',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint settings_singleton check (id)
);

alter table public.settings enable row level security;

create policy "authenticated pode ler settings"
  on public.settings for select
  to authenticated
  using (true);

create trigger set_updated_at
  before update on public.settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- meta_ad_accounts
-- ---------------------------------------------------------------------------
create table public.meta_ad_accounts (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  ad_account_id text not null unique,
  ads_token_secret_id uuid,
  moeda text not null default 'BRL',
  data_inicio date not null,
  timezone text not null default 'America/Sao_Paulo',
  janela_atribuicao text,
  rate_limit_state jsonb not null default '{}',
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.meta_ad_accounts enable row level security;

create policy "authenticated pode ler meta_ad_accounts"
  on public.meta_ad_accounts for select
  to authenticated
  using (true);

create trigger set_updated_at
  before update on public.meta_ad_accounts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- meta_entities — cache de metadados (campaign | adset | ad)
-- ---------------------------------------------------------------------------
create table public.meta_entities (
  ad_account_id uuid not null references public.meta_ad_accounts(id) on delete cascade,
  entity_id text not null,
  tipo text not null check (tipo in ('campaign', 'adset', 'ad')),
  parent_id text,
  nome text,
  status text,
  objetivo text,
  creative jsonb,
  updated_at timestamptz not null default now(),
  primary key (ad_account_id, entity_id)
);

alter table public.meta_entities enable row level security;

create policy "authenticated pode ler meta_entities"
  on public.meta_entities for select
  to authenticated
  using (true);

create index meta_entities_parent_id_idx on public.meta_entities (parent_id);
create index meta_entities_tipo_idx on public.meta_entities (tipo);

-- ---------------------------------------------------------------------------
-- meta_insights_daily — fato dia × anúncio
-- ---------------------------------------------------------------------------
create table public.meta_insights_daily (
  id uuid primary key default gen_random_uuid(),
  ad_account_id uuid not null references public.meta_ad_accounts(id) on delete cascade,
  date date not null,
  campaign_id text not null,
  campaign_name text,
  adset_id text not null,
  adset_name text,
  ad_id text not null,
  ad_name text,
  spend numeric(14, 2) not null default 0,
  impressions bigint not null default 0,
  reach bigint not null default 0,
  frequency numeric(10, 4),
  clicks bigint not null default 0,
  inline_link_clicks bigint not null default 0,
  actions jsonb not null default '[]',
  action_values jsonb not null default '[]',
  created_at timestamptz not null default now(),
  unique (ad_account_id, date, ad_id)
);

alter table public.meta_insights_daily enable row level security;

create policy "authenticated pode ler meta_insights_daily"
  on public.meta_insights_daily for select
  to authenticated
  using (true);

create index meta_insights_daily_account_date_idx on public.meta_insights_daily (ad_account_id, date);
create index meta_insights_daily_campaign_id_idx on public.meta_insights_daily (campaign_id);

-- ---------------------------------------------------------------------------
-- meta_custom_conversions
-- ---------------------------------------------------------------------------
create table public.meta_custom_conversions (
  ad_account_id uuid not null references public.meta_ad_accounts(id) on delete cascade,
  custom_conversion_id text not null,
  nome text,
  regra_resumo text,
  updated_at timestamptz not null default now(),
  primary key (ad_account_id, custom_conversion_id)
);

alter table public.meta_custom_conversions enable row level security;

create policy "authenticated pode ler meta_custom_conversions"
  on public.meta_custom_conversions for select
  to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- lead_sources — as "abas" de planilha
-- ---------------------------------------------------------------------------
create table public.lead_sources (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  ad_account_id uuid references public.meta_ad_accounts(id) on delete set null,
  tipo text not null check (tipo in ('crm', 'leads_utm')),
  planilha_url text,
  nome_da_aba text,
  mapeamento jsonb not null default '{}',
  ativo boolean not null default true,
  last_import_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.lead_sources enable row level security;

create policy "authenticated pode ler lead_sources"
  on public.lead_sources for select
  to authenticated
  using (true);

create trigger set_updated_at
  before update on public.lead_sources
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- leads
-- ---------------------------------------------------------------------------
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.lead_sources(id) on delete cascade,
  chave text not null,
  data date,
  nome text,
  email text,
  email_norm text,
  telefone text,
  telefone_norm text,
  origem text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  -- Campos de CRM opcionais (nem toda fonte os preenche; ficam null quando a
  -- fonte é do tipo leads_utm). Tipados como text/numeric/date de forma
  -- deliberadamente permissiva — vêm de colagem de planilha via mapeador de
  -- colunas (Fase 3) e não de um formulário controlado.
  interesse text,
  escolaridade text,
  turno text,
  status text,
  vendedor text,
  renda_familiar text,
  contato_1 text,
  contato_2 text,
  contato_3 text,
  contato_4 text,
  motivo text,
  agendamento text,
  atendimento text,
  orcamento numeric(14, 2),
  fechamento text,
  valor_venda numeric(14, 2),
  pagou text,
  forma_pagamento text,
  data_pagamento date,
  matricula text,
  obs text,
  extra jsonb not null default '{}',
  campaign_id_matched text,
  match_metodo text check (match_metodo in ('acao', 'utm', 'regra', 'nenhum')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_id, chave)
);

alter table public.leads enable row level security;

create policy "authenticated pode ler leads"
  on public.leads for select
  to authenticated
  using (true);

create trigger set_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();

create index leads_campaign_id_matched_idx on public.leads (campaign_id_matched);
create index leads_status_idx on public.leads (status);
create index leads_data_idx on public.leads (data);
create index leads_utm_campaign_idx on public.leads (utm_campaign);
create index leads_email_norm_idx on public.leads (email_norm);
create index leads_telefone_norm_idx on public.leads (telefone_norm);

-- ---------------------------------------------------------------------------
-- acoes
-- ---------------------------------------------------------------------------
create table public.acoes (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  ad_account_id uuid not null references public.meta_ad_accounts(id) on delete cascade,
  periodo_inicio date,
  periodo_fim date,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.acoes enable row level security;

create policy "authenticated pode ler acoes"
  on public.acoes for select
  to authenticated
  using (true);

create trigger set_updated_at
  before update on public.acoes
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- acao_campanhas
-- ---------------------------------------------------------------------------
create table public.acao_campanhas (
  acao_id uuid not null references public.acoes(id) on delete cascade,
  campaign_id text not null,
  primary key (acao_id, campaign_id)
);

alter table public.acao_campanhas enable row level security;

create policy "authenticated pode ler acao_campanhas"
  on public.acao_campanhas for select
  to authenticated
  using (true);

create index acao_campanhas_campaign_id_idx on public.acao_campanhas (campaign_id);

-- ---------------------------------------------------------------------------
-- acao_fontes
-- ---------------------------------------------------------------------------
create table public.acao_fontes (
  acao_id uuid not null references public.acoes(id) on delete cascade,
  source_id uuid not null references public.lead_sources(id) on delete cascade,
  primary key (acao_id, source_id)
);

alter table public.acao_fontes enable row level security;

create policy "authenticated pode ler acao_fontes"
  on public.acao_fontes for select
  to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- regras_match — mapeamento manual utm_campaign -> campaign_id
-- ---------------------------------------------------------------------------
create table public.regras_match (
  id uuid primary key default gen_random_uuid(),
  acao_id uuid references public.acoes(id) on delete cascade,
  source_id uuid references public.lead_sources(id) on delete cascade,
  valor_utm_campaign text not null,
  campaign_id text not null,
  created_at timestamptz not null default now(),
  constraint regras_match_precisa_acao_ou_fonte
    check (acao_id is not null or source_id is not null)
);

alter table public.regras_match enable row level security;

create policy "authenticated pode ler regras_match"
  on public.regras_match for select
  to authenticated
  using (true);

create index regras_match_valor_utm_campaign_trgm_idx
  on public.regras_match using gin (valor_utm_campaign gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- import_batches — auditoria de cada colagem/sync de leads
-- ---------------------------------------------------------------------------
create table public.import_batches (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.lead_sources(id) on delete cascade,
  quando timestamptz not null default now(),
  linhas_recebidas int not null default 0,
  novas int not null default 0,
  atualizadas int not null default 0,
  ignoradas int not null default 0,
  erros jsonb not null default '[]',
  amostra_payload jsonb
);

alter table public.import_batches enable row level security;

create policy "authenticated pode ler import_batches"
  on public.import_batches for select
  to authenticated
  using (true);

create index import_batches_source_id_idx on public.import_batches (source_id);

-- ---------------------------------------------------------------------------
-- meta_sync_jobs — fila/state machine do sync assíncrono (Fase 2)
-- ---------------------------------------------------------------------------
create table public.meta_sync_jobs (
  id uuid primary key default gen_random_uuid(),
  ad_account_id uuid not null references public.meta_ad_accounts(id) on delete cascade,
  kind text not null check (kind in ('backfill', 'incremental')),
  status text not null default 'queued'
    check (status in ('queued', 'running', 'polling', 'processing', 'done', 'error', 'throttled')),
  meta_report_run_id text,
  date_range jsonb,
  cursor jsonb,
  attempt_count int not null default 0,
  next_poll_at timestamptz,
  last_error text,
  stats jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.meta_sync_jobs enable row level security;

create policy "authenticated pode ler meta_sync_jobs"
  on public.meta_sync_jobs for select
  to authenticated
  using (true);

create trigger set_updated_at
  before update on public.meta_sync_jobs
  for each row execute function public.set_updated_at();

create index meta_sync_jobs_status_idx on public.meta_sync_jobs (status);

-- Garante no máximo um job "em andamento" por conta (single-flight).
create unique index meta_sync_jobs_single_flight_idx
  on public.meta_sync_jobs (ad_account_id)
  where status not in ('done', 'error');
