-- Private history is keyed by the DNI fingerprint, never by the temporary
-- anonymous Supabase user. This lets a person recover it after signing out.
create table private.history_entries (
  id uuid primary key default gen_random_uuid(),
  dni_hash text not null check (dni_hash ~ '^[a-f0-9]{64}$'),
  entry_type text not null check (entry_type in ('reading','conversation')),
  content text not null check (char_length(trim(content)) between 1 and 6000),
  created_at timestamptz not null default now()
);
create index history_entries_identity_date
  on private.history_entries(dni_hash, created_at desc);
alter table private.history_entries enable row level security;
revoke all on private.history_entries from public, anon, authenticated;
grant all on private.history_entries to service_role;
create function public.acces_history_list(p_user uuid)
returns table(entry_type text, content text, created_at timestamptz)
language sql security definer set search_path='' as $$
  select h.entry_type, h.content, h.created_at
  from private.history_entries h
  join private.identities i on i.dni_hash=h.dni_hash
  where i.user_id=p_user
  order by h.created_at desc
  limit 100;
$$;
create function public.acces_history_add(p_user uuid, p_type text, p_content text)
returns timestamptz language plpgsql security definer set search_path='' as $$
declare fingerprint text; saved_at timestamptz;
begin
  if p_type not in ('reading','conversation') or p_content is null or
     char_length(trim(p_content)) not between 1 and 6000 then
    raise exception 'INVALID_HISTORY_ENTRY';
  end if;
  select dni_hash into fingerprint from private.identities where user_id=p_user;
  if fingerprint is null then raise exception 'IDENTIFICATION_REQUIRED'; end if;
  insert into private.history_entries(dni_hash,entry_type,content)
  values(fingerprint,p_type,trim(p_content)) returning created_at into saved_at;
  delete from private.history_entries
  where id in (
    select id from private.history_entries where dni_hash=fingerprint
    order by created_at desc offset 100
  );
  return saved_at;
end;
$$;
create function public.acces_history_clear(p_user uuid)
returns void language plpgsql security definer set search_path='' as $$
declare fingerprint text;
begin
  select dni_hash into fingerprint from private.identities where user_id=p_user;
  if fingerprint is null then raise exception 'IDENTIFICATION_REQUIRED'; end if;
  delete from private.history_entries where dni_hash=fingerprint;
end;
$$;
revoke execute on function public.acces_history_list(uuid) from public, anon, authenticated;
revoke execute on function public.acces_history_add(uuid,text,text) from public, anon, authenticated;
revoke execute on function public.acces_history_clear(uuid) from public, anon, authenticated;
grant execute on function public.acces_history_list(uuid) to service_role;
grant execute on function public.acces_history_add(uuid,text,text) to service_role;
grant execute on function public.acces_history_clear(uuid) to service_role;
