begin;
delete from private.application_limits where action='gemini' and day=current_date;
do $$
begin
  if not public.acces_consume_global_quota('gemini',2) then raise exception 'First request denied'; end if;
  if not public.acces_consume_global_quota('gemini',2) then raise exception 'Second request denied'; end if;
  if public.acces_consume_global_quota('gemini',2) then raise exception 'Global budget bypassed'; end if;
  if has_function_privilege('anon','public.acces_consume_global_quota(text,integer)','EXECUTE') then raise exception 'Anonymous caller can change global quotas'; end if;
  if has_table_privilege('authenticated','private.application_limits','SELECT') then raise exception 'Private budget exposed'; end if;
  raise notice 'AI shared budget and permissions passed';
end $$;
rollback;
