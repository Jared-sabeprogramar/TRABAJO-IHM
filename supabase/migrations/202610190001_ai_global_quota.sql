-- Shared AI budget prevents bypassing per-session limits by creating anonymous users.
create table private.application_limits (
  action text not null,
  day date not null default current_date,
  count integer not null default 0 check (count >= 0),
  primary key (action, day)
);
alter table private.application_limits enable row level security;
revoke all on private.application_limits from public, anon, authenticated;
grant all on private.application_limits to service_role;

create function public.acces_consume_global_quota(p_action text, p_limit integer)
returns boolean language plpgsql security definer set search_path='' as $$
declare n integer;
begin
  if p_action is null or p_action <> 'gemini' or p_limit is null or p_limit not between 1 and 10000 then
    raise exception 'INVALID_QUOTA';
  end if;
  insert into private.application_limits(action, count) values(p_action, 1)
  on conflict(action, day) do update set count=least(private.application_limits.count+1,p_limit+1)
  returning count into n;
  return n <= p_limit;
end; $$;
revoke execute on function public.acces_consume_global_quota(text,integer) from public, anon, authenticated;
grant execute on function public.acces_consume_global_quota(text,integer) to service_role;
