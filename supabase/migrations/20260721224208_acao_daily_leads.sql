-- Leads por dia (pro gráfico investimento × leads/dia + CPL na Aba 3).
create or replace function public.get_acao_daily_leads(
  p_source_ids uuid[],
  p_since date,
  p_until date
)
returns table (dia date, leads bigint)
language sql
stable
set search_path = ''
as $$
  select data as dia, count(*) as leads
  from public.leads
  where source_id = any(p_source_ids)
    and data is not null
    and data >= p_since and data <= p_until
  group by data
  order by data;
$$;

revoke all on function public.get_acao_daily_leads(uuid[], date, date) from public;
revoke execute on function public.get_acao_daily_leads(uuid[], date, date) from anon;
grant execute on function public.get_acao_daily_leads(uuid[], date, date) to authenticated, service_role;
