-- These functions are called by auth triggers/server code, not by public RPC clients.
-- Revoking RPC access does not prevent the postgres-owned auth trigger from running.
revoke execute on function public.seed_default_sources(uuid) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.seed_default_sources(uuid) to service_role;
grant execute on function public.handle_new_user() to service_role;

-- Ensure the timestamp trigger resolves objects in a fixed schema.
alter function public.set_updated_at() set search_path = public;
