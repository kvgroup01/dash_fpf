-- RPCs de escrita/leitura de segredos via Supabase Vault.
-- Nunca usar pgcrypto puro com chave passada por SQL (vaza em logs/replicação).
-- Só service_role pode executar — chamadas exclusivamente de código
-- server-only (src/lib/supabase/admin.ts), nunca de Client Component.

create extension if not exists supabase_vault;

create or replace function public.save_secret(secret_name text, secret_value text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  v_id := vault.create_secret(secret_value, secret_name);
  return v_id;
end;
$$;

revoke all on function public.save_secret(text, text) from public;
grant execute on function public.save_secret(text, text) to service_role;

create or replace function public.get_secret(secret_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_value text;
begin
  select decrypted_secret into v_value
  from vault.decrypted_secrets
  where id = secret_id;
  return v_value;
end;
$$;

revoke all on function public.get_secret(uuid) from public;
grant execute on function public.get_secret(uuid) to service_role;

create or replace function public.update_secret(secret_id uuid, secret_value text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform vault.update_secret(secret_id, secret_value);
end;
$$;

revoke all on function public.update_secret(uuid, text) from public;
grant execute on function public.update_secret(uuid, text) to service_role;
