-- Fase 4: cascata de match determinística + suporte a Ações.

create extension if not exists unaccent;
create extension if not exists pg_trgm;

-- Normalização de nome (sem acento/pontuação, minúsculo) — usada tanto pra
-- casar UTM quanto pra sugestão de regra manual. Uma única função, chamada
-- dos dois lados da cascata, pra não divergir.
create or replace function public.normalize_text(input text)
returns text
language sql
immutable
set search_path = ''
as $$
  select lower(regexp_replace(public.unaccent(coalesce(input, '')), '[^a-zA-Z0-9]+', '', 'g'));
$$;

revoke all on function public.normalize_text(text) from public;
grant execute on function public.normalize_text(text) to authenticated, service_role;

-- Cascata de match determinística (Ação → UTM → regra manual → nenhum).
-- Reprocessa do zero a cada chamada (idempotente) — leads nunca são
-- descartados, o pior caso vira match_metodo='nenhum'.
--
-- 'acao' aqui não grava um campaign_id específico: significa "a fonte
-- desse lead está vinculada a pelo menos uma Ação", então ele entra nos
-- KPIs agregados daquela Ação, mas nunca aparece num breakdown por
-- campanha individual (regra de honestidade — ver CLAUDE.md seção 9).
create or replace function public.match_leads(p_source_id uuid default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_total integer;
begin
  update public.leads
  set campaign_id_matched = null, match_metodo = null
  where (p_source_id is null or source_id = p_source_id);

  -- Nível 2: UTM — id exato da campanha ou nome normalizado.
  update public.leads l
  set campaign_id_matched = c.campaign_id, match_metodo = 'utm'
  from (
    select distinct campaign_id, campaign_name from public.meta_insights_daily
  ) c
  where (p_source_id is null or l.source_id = p_source_id)
    and l.match_metodo is null
    and l.utm_campaign is not null and l.utm_campaign <> ''
    and (
      l.utm_campaign = c.campaign_id
      or public.normalize_text(l.utm_campaign) = public.normalize_text(c.campaign_name)
    );

  -- Nível 3: regra manual (regras_match), escopada por fonte e/ou Ação
  -- quando a regra especificar.
  update public.leads l
  set campaign_id_matched = r.campaign_id, match_metodo = 'regra'
  from public.regras_match r
  where (p_source_id is null or l.source_id = p_source_id)
    and l.match_metodo is null
    and l.utm_campaign is not null and l.utm_campaign <> ''
    and public.normalize_text(l.utm_campaign) = public.normalize_text(r.valor_utm_campaign)
    and (r.source_id is null or r.source_id = l.source_id)
    and (
      r.acao_id is null
      or exists (
        select 1 from public.acao_fontes af
        where af.acao_id = r.acao_id and af.source_id = l.source_id
      )
    );

  -- Nível 1: Ação (grupo) — fonte vinculada a pelo menos uma Ação, sem
  -- campanha individual atribuída.
  update public.leads l
  set match_metodo = 'acao'
  where (p_source_id is null or l.source_id = p_source_id)
    and l.match_metodo is null
    and exists (select 1 from public.acao_fontes af where af.source_id = l.source_id);

  -- Nível 0: sem origem identificada.
  update public.leads l
  set match_metodo = 'nenhum'
  where (p_source_id is null or l.source_id = p_source_id)
    and l.match_metodo is null;

  select count(*) into v_total from public.leads
  where (p_source_id is null or source_id = p_source_id);

  return v_total;
end;
$$;

revoke all on function public.match_leads(uuid) from public;
revoke execute on function public.match_leads(uuid) from anon, authenticated;
grant execute on function public.match_leads(uuid) to service_role;

-- Sugestão de campanha por similaridade de nome (pg_trgm), pra ajudar a
-- criar uma regras_match manual.
create or replace function public.suggest_campaign_matches(
  p_valor text,
  p_ad_account_id uuid default null
)
returns table (campaign_id text, campaign_name text, score real)
language sql
stable
set search_path = ''
as $$
  select distinct on (mid.campaign_id)
    mid.campaign_id,
    mid.campaign_name,
    public.similarity(coalesce(mid.campaign_name, ''), p_valor) as score
  from public.meta_insights_daily mid
  where p_ad_account_id is null or mid.ad_account_id = p_ad_account_id
  order by mid.campaign_id, score desc
  limit 5;
$$;

revoke all on function public.suggest_campaign_matches(text, uuid) from public;
revoke execute on function public.suggest_campaign_matches(text, uuid) from anon;
grant execute on function public.suggest_campaign_matches(text, uuid) to authenticated, service_role;

-- Limiar de divergência configurável (Meta vs Planilha) — Aba 3.
alter table public.settings
  add column if not exists divergencia_alerta_pct numeric not null default 20;

-- KPIs de uma Ação: lado Meta (campanhas vinculadas) + lado Planilha
-- (leads das fontes vinculadas), no mesmo período.
create or replace function public.get_acao_kpis(
  p_acao_id uuid,
  p_since date,
  p_until date
)
returns table (
  meta_spend numeric,
  meta_resultados numeric,
  meta_impressions bigint,
  meta_reach bigint,
  meta_clicks bigint,
  leads_total bigint,
  leads_com_match bigint,
  leads_grupo bigint,
  leads_sem_origem bigint,
  contatados bigint,
  agendamentos bigint,
  atendimentos bigint,
  orcamentos bigint,
  fechamentos bigint,
  vendas_pagas bigint,
  receita numeric
)
language sql
stable
set search_path = ''
as $$
  with campanhas as (
    select campaign_id from public.acao_campanhas where acao_id = p_acao_id
  ),
  fontes as (
    select source_id from public.acao_fontes where acao_id = p_acao_id
  ),
  meta as (
    select
      coalesce(sum(mid.spend), 0) as spend,
      coalesce(sum(
        (select sum((a ->> 'value')::numeric)
         from jsonb_array_elements(mid.actions) as a
         where a ->> 'action_type' in (
           'lead', 'offsite_conversion.fb_pixel_lead',
           'onsite_conversion.lead_grouped',
           'onsite_conversion.messaging_conversation_started_7d'
         ))
      ), 0) as resultados,
      coalesce(sum(mid.impressions), 0) as impressions,
      coalesce(sum(mid.reach), 0) as reach,
      coalesce(sum(mid.clicks), 0) as clicks
    from public.meta_insights_daily mid
    where mid.campaign_id in (select campaign_id from campanhas)
      and mid.date >= p_since and mid.date <= p_until
  ),
  planilha as (
    select
      count(*) as total,
      count(*) filter (where match_metodo in ('utm', 'regra')) as com_match,
      count(*) filter (where match_metodo = 'acao') as grupo,
      count(*) filter (where match_metodo = 'nenhum' or match_metodo is null) as sem_origem,
      count(*) filter (where coalesce(contato_1, '') <> '') as contatados,
      count(*) filter (where coalesce(agendamento, '') <> '') as agendamentos,
      count(*) filter (where coalesce(atendimento, '') <> '') as atendimentos,
      count(*) filter (where orcamento is not null) as orcamentos,
      count(*) filter (where coalesce(fechamento, '') <> '') as fechamentos,
      count(*) filter (where lower(trim(coalesce(pagou, ''))) like 'sim%') as vendas_pagas,
      coalesce(sum(valor_venda) filter (where lower(trim(coalesce(pagou, ''))) like 'sim%'), 0) as receita
    from public.leads
    where source_id in (select source_id from fontes)
      and (data is null or (data >= p_since and data <= p_until))
  )
  select
    meta.spend, meta.resultados, meta.impressions, meta.reach, meta.clicks,
    planilha.total, planilha.com_match, planilha.grupo, planilha.sem_origem,
    planilha.contatados, planilha.agendamentos, planilha.atendimentos,
    planilha.orcamentos, planilha.fechamentos, planilha.vendas_pagas, planilha.receita
  from meta, planilha;
$$;

revoke all on function public.get_acao_kpis(uuid, date, date) from public;
revoke execute on function public.get_acao_kpis(uuid, date, date) from anon;
grant execute on function public.get_acao_kpis(uuid, date, date) to authenticated, service_role;

-- Quebras de leads por dimensão (origem, vendedor, turno, interesse,
-- renda_familiar, status) — coluna validada contra uma lista fixa antes de
-- entrar num format() dinâmico, nunca interpolação direta de input.
create or replace function public.get_acao_lead_breakdown(
  p_acao_id uuid,
  p_dimension text,
  p_since date,
  p_until date
)
returns table (valor text, total bigint)
language plpgsql
stable
set search_path = ''
as $$
begin
  if p_dimension not in ('origem', 'vendedor', 'turno', 'interesse', 'renda_familiar', 'status') then
    raise exception 'dimensão inválida: %', p_dimension;
  end if;

  return query execute format(
    'select coalesce(nullif(%I, %L), %L) as valor, count(*) as total
     from public.leads
     where source_id in (select source_id from public.acao_fontes where acao_id = $1)
       and (data is null or (data >= $2 and data <= $3))
     group by 1
     order by total desc
     limit 10',
    p_dimension, '', 'Não informado'
  ) using p_acao_id, p_since, p_until;
end;
$$;

revoke all on function public.get_acao_lead_breakdown(uuid, text, date, date) from public;
revoke execute on function public.get_acao_lead_breakdown(uuid, text, date, date) from anon;
grant execute on function public.get_acao_lead_breakdown(uuid, text, date, date) to authenticated, service_role;
