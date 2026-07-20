-- RPCs de agregação pra Aba 1 (Gerenciador de Anúncios). Agregação pesada
-- sempre no Postgres, nunca no cliente — o cliente só reagrupa/ordena o
-- resultado (já pequeno) pra montar a árvore campanha→conjunto→anúncio e os
-- rankings.
--
-- "Resultado" (MVP): soma de um conjunto fixo de action_types. A definição
-- configurável por conta/ação (do brief original) fica pra quando as Ações
-- existirem (Fase 4) — por ora esse conjunto cobre lead, mensagem iniciada e
-- conversão de pixel, que é o que a FPF mede hoje.
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

revoke all on function public.get_meta_ads_report(uuid, date, date) from public;
revoke execute on function public.get_meta_ads_report(uuid, date, date) from anon;
grant execute on function public.get_meta_ads_report(uuid, date, date) to authenticated, service_role;

-- Totais por dia (pro gráfico investimento × resultados no tempo).
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

revoke all on function public.get_meta_daily_totals(uuid, date, date) from public;
revoke execute on function public.get_meta_daily_totals(uuid, date, date) from anon;
grant execute on function public.get_meta_daily_totals(uuid, date, date) to authenticated, service_role;
