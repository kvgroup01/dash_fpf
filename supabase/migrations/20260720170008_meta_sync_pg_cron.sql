-- Desperta /api/cron/process-meta-jobs a cada minuto. pg_net é
-- fire-and-forget — o request é só o gatilho, a fonte de verdade do estado
-- é sempre meta_sync_jobs (ver rota e src/lib/meta/sync.ts).
--
-- O CRON_SECRET não vai em texto puro aqui (migration é versionada no git):
-- foi salvo no Vault via RPC save_secret com o nome 'cron_secret' e é lido
-- dinamicamente a cada disparo. Se o CRON_SECRET mudar, atualizar o valor
-- no Vault (RPC update_secret) — não precisa nova migration.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'process-meta-sync-jobs',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://dash-fpf-snowy.vercel.app/api/cron/process-meta-jobs',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'cron_secret'
        limit 1
      )
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 20000
  );
  $$
);
