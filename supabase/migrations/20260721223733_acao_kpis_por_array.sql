-- get_acao_kpis/get_acao_lead_breakdown recebiam p_acao_id, mas a Aba 3
-- também precisa funcionar pra combinação montada na hora (sem Ação salva
-- nenhuma) — troca pra receber os arrays de campanhas/fontes diretamente.
-- O resultado é computado do mesmo jeito nos dois casos (salva ou ad-hoc).
drop function if exists public.get_acao_kpis(uuid, date, date);
drop function if exists public.get_acao_lead_breakdown(uuid, text, date, date);

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

revoke all on function public.get_acao_kpis(text[], uuid[], date, date) from public;
revoke execute on function public.get_acao_kpis(text[], uuid[], date, date) from anon;
grant execute on function public.get_acao_kpis(text[], uuid[], date, date) to authenticated, service_role;

create or replace function public.get_acao_lead_breakdown(
  p_source_ids uuid[],
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
     where source_id = any($1)
       and (data is null or (data >= $2 and data <= $3))
     group by 1
     order by total desc
     limit 10',
    p_dimension, '', 'Não informado'
  ) using p_source_ids, p_since, p_until;
end;
$$;

revoke all on function public.get_acao_lead_breakdown(uuid[], text, date, date) from public;
revoke execute on function public.get_acao_lead_breakdown(uuid[], text, date, date) from anon;
grant execute on function public.get_acao_lead_breakdown(uuid[], text, date, date) to authenticated, service_role;
