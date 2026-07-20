-- Habilita Supabase Realtime em meta_sync_jobs — a Aba 1 assina mudanças
-- pra mostrar o progresso do sync sem polling do cliente.
alter publication supabase_realtime add table public.meta_sync_jobs;
