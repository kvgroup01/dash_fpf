-- Corrige falha de segurança: o Supabase concede EXECUTE em funções novas do
-- schema public para anon/authenticated por padrão via ALTER DEFAULT
-- PRIVILEGES — revogar só de PUBLIC (migration anterior) não é suficiente,
-- porque esses grants são feitos diretamente aos papéis anon/authenticated,
-- não via PUBLIC. Confirmado por teste manual: anon conseguia chamar
-- get_secret e ler o segredo em texto puro antes desta correção.

revoke execute on function public.save_secret(text, text) from anon, authenticated;
revoke execute on function public.get_secret(uuid) from anon, authenticated;
revoke execute on function public.update_secret(uuid, text) from anon, authenticated;

-- Garante que qualquer função nova criada depois em public também não
-- vaze EXECUTE para anon/authenticated por padrão.
alter default privileges in schema public
  revoke execute on functions from anon, authenticated;
