-- Claim atômico do próximo job elegível da fila de sync da Meta (Fase 2).
-- SELECT ... FOR UPDATE SKIP LOCKED direto do supabase-js não é possível
-- (não expõe transação explícita), então isso vira uma function: um único
-- UPDATE ... FROM (SELECT ... FOR UPDATE SKIP LOCKED) é atômico e não
-- mantém lock aberto durante as chamadas HTTP lentas pra Meta (que
-- acontecem depois, fora da transação desta function).
--
-- Elegível: 'queued' (nunca tentado) ou 'polling'/'processing'/'throttled'
-- cujo next_poll_at já chegou. O "throttled" nunca é uma fase própria do
-- job — é só o mesmo job de antes com next_poll_at empurrado pra frente;
-- qual fase retomar (iniciar relatório / checar status / paginar) é
-- deduzido em código a partir de meta_report_run_id/cursor, não do status.
create or replace function public.claim_next_meta_sync_job()
returns public.meta_sync_jobs
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.meta_sync_jobs;
begin
  update public.meta_sync_jobs
  set status = 'running', updated_at = now()
  where id = (
    select id
    from public.meta_sync_jobs
    where status = 'queued'
       or (status in ('polling', 'processing', 'throttled') and next_poll_at <= now())
       -- autorrecuperação: se a invocação anterior travou/caiu depois do
       -- claim sem terminar de processar, reclama após 5min parado em 'running'
       or (status = 'running' and updated_at < now() - interval '5 minutes')
    order by created_at
    for update skip locked
    limit 1
  )
  returning * into v_job;

  return v_job;
end;
$$;

revoke all on function public.claim_next_meta_sync_job() from public;
revoke execute on function public.claim_next_meta_sync_job() from anon, authenticated;
grant execute on function public.claim_next_meta_sync_job() to service_role;
