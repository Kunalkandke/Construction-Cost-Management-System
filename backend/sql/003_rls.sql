-- RLS on every table, NO policies: only the service-role key (backend) can access data.
do $$
declare r record;
begin
  for r in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', r.tablename);
  end loop;
end $$;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke execute on function publish_rate_set(uuid, uuid) from public, anon, authenticated;
grant execute on function publish_rate_set(uuid, uuid) to service_role;
