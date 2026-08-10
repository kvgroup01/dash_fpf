-- "Resultados" ficava contando só um conjunto fixo de action_types de lead/
-- mensagem/pixel-lead (ver comentário original em meta_ads_report_rpc.sql) e
-- não incluía 'offsite_conversion.fb_pixel_custom' — o action_type que a
-- Graph API usa pra conversões personalizadas (ex.: pixel "obrigado-tecnico").
-- Isso fazia o dashboard mostrar só os leads/mensagens (10, no caso da conta
-- da FPF) enquanto o Gerenciador de Anúncios contava as 90 conversões
-- personalizadas também. Redefine as 3 RPCs que somam "resultados" pra
-- incluir esse action_type.

create or replace function public.get_meta_ads_report(
  p_ad_account_id uuid,
  p_since date,
  p_until date
)
returns table (
  campaign_id text,
  campaign_name text,
  adset_id text,
  adset_name text,
  ad_id text,
  ad_name text,
  spend numeric,
  impressions bigint,
  reach bigint,
  frequency numeric,
  clicks bigint,
  inline_link_clicks bigint,
  resultados numeric
)
language sql
stable
set search_path = ''
as $$
  select
    mid.campaign_id,
    max(mid.campaign_name) as campaign_name,
    mid.adset_id,
    max(mid.adset_name) as adset_name,
    mid.ad_id,
    max(mid.ad_name) as ad_name,
    sum(mid.spend) as spend,
    sum(mid.impressions) as impressions,
    sum(mid.reach) as reach,
    case
      when sum(mid.reach) > 0
      then round(sum(mid.impressions)::numeric / sum(mid.reach), 4)
      else null
    end as frequency,
    sum(mid.clicks) as clicks,
    sum(mid.inline_link_clicks) as inline_link_clicks,
    coalesce(sum(
      (select sum((a ->> 'value')::numeric)
       from jsonb_array_elements(mid.actions) as a
       where a ->> 'action_type' in (
         'lead',
         'offsite_conversion.fb_pixel_lead',
         'offsite_conversion.fb_pixel_custom',
         'onsite_conversion.lead_grouped',
         'onsite_conversion.messaging_conversation_started_7d'
       ))
    ), 0) as resultados
  from public.meta_insights_daily mid
  where (p_ad_account_id is null or mid.ad_account_id = p_ad_account_id)
    and mid.date >= p_since
    and mid.date <= p_until
  group by mid.campaign_id, mid.adset_id, mid.ad_id;
$$;

create or replace function public.get_meta_daily_totals(
  p_ad_account_id uuid,
  p_since date,
  p_until date
)
returns table (
  date date,
  spend numeric,
  resultados numeric
)
language sql
stable
set search_path = ''
as $$
  select
    mid.date,
    sum(mid.spend) as spend,
    coalesce(sum(
      (select sum((a ->> 'value')::numeric)
       from jsonb_array_elements(mid.actions) as a
       where a ->> 'action_type' in (
         'lead',
         'offsite_conversion.fb_pixel_lead',
         'offsite_conversion.fb_pixel_custom',
         'onsite_conversion.lead_grouped',
         'onsite_conversion.messaging_conversation_started_7d'
       ))
    ), 0) as resultados
  from public.meta_insights_daily mid
  where (p_ad_account_id is null or mid.ad_account_id = p_ad_account_id)
    and mid.date >= p_since
    and mid.date <= p_until
  group by mid.date
  order by mid.date;
$$;

create or replace function public.get_acao_kpis(
  p_campaign_ids text[],
  p_source_ids uuid[],
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
  with meta as (
    select
      coalesce(sum(mid.spend), 0) as spend,
      coalesce(sum(
        (select sum((a ->> 'value')::numeric)
         from jsonb_array_elements(mid.actions) as a
         where a ->> 'action_type' in (
           'lead', 'offsite_conversion.fb_pixel_lead',
           'offsite_conversion.fb_pixel_custom',
           'onsite_conversion.lead_grouped',
           'onsite_conversion.messaging_conversation_started_7d'
         ))
      ), 0) as resultados,
      coalesce(sum(mid.impressions), 0) as impressions,
      coalesce(sum(mid.reach), 0) as reach,
      coalesce(sum(mid.clicks), 0) as clicks
    from public.meta_insights_daily mid
    where mid.campaign_id = any(p_campaign_ids)
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
    where source_id = any(p_source_ids)
      and (data is null or (data >= p_since and data <= p_until))
  )
  select
    meta.spend, meta.resultados, meta.impressions, meta.reach, meta.clicks,
    planilha.total, planilha.com_match, planilha.grupo, planilha.sem_origem,
    planilha.contatados, planilha.agendamentos, planilha.atendimentos,
    planilha.orcamentos, planilha.fechamentos, planilha.vendas_pagas, planilha.receita
  from meta, planilha;
$$;
