-- Acces: all personal data lives outside exposed schemas.
create schema if not exists extensions;
create extension if not exists postgis with schema extensions;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

create table private.identities (
  user_id uuid primary key references auth.users(id) on delete cascade,
  dni_hash text not null check (dni_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now()
);
create index identities_fingerprint on private.identities(dni_hash);
create table private.places (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 3 and 120),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  location extensions.geography(Point,4326) generated always as
    (extensions.st_setsrid(extensions.st_makepoint(longitude,latitude),4326)::extensions.geography) stored,
  created_at timestamptz not null default now()
);
create index places_location on private.places using gist(location);
create table private.reports (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references private.places(id),
  user_id uuid references auth.users(id) on delete set null,
  dni_hash text not null,
  category text not null check (category in ('no_ramp','blocked_sidewalk','stairs','narrow_access','damaged_surface','other')),
  description text not null check (char_length(trim(description)) between 10 and 1000),
  status text not null default 'active' check(status in ('active','resolved','rejected')),
  created_at timestamptz not null default now(),
  unique(place_id,dni_hash)
);
create index reports_active_date on private.reports(place_id,created_at) where status='active';
create table private.request_limits (
  user_id uuid references auth.users(id) on delete cascade,
  action text not null,
  day date not null default current_date,
  count integer not null default 0,
  primary key(user_id,action,day)
);
alter table private.identities enable row level security;
alter table private.places enable row level security;
alter table private.reports enable row level security;
alter table private.request_limits enable row level security;
-- No client policies: writes only through authenticated Edge Functions using service_role.
revoke all on all tables in schema private from public,anon,authenticated;
grant all on all tables in schema private to service_role;

-- Deliberate definer view: only aggregates, never DNI hashes, user IDs or free text.
create view public.place_report_summary as
select p.id,p.name,p.latitude,p.longitude,
 count(r.id)::integer as report_count,max(r.created_at) as last_report_at
from private.places p left join private.reports r
 on r.place_id=p.id and r.status='active' and r.created_at > now()-interval '90 days'
group by p.id;
revoke all on public.place_report_summary from public,anon,authenticated;
grant select on public.place_report_summary to anon,authenticated,service_role;

create function public.acces_identity_status(p_user uuid)
returns boolean language sql security definer set search_path='' as $$
 select exists(select 1 from private.identities where user_id=p_user);
$$;
create function public.acces_identify(p_user uuid,p_hash text)
returns void language plpgsql security definer set search_path='' as $$
declare existing text;
begin
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user::text,0));
 select dni_hash into existing from private.identities where user_id=p_user;
 if existing is not null and existing<>p_hash then
   raise exception 'IDENTITY_ALREADY_SET';
 end if;
 insert into private.identities(user_id,dni_hash) values(p_user,p_hash) on conflict(user_id) do nothing;
end; $$;

create function public.acces_consume_quota(p_user uuid,p_action text,p_limit integer)
returns boolean language plpgsql security definer set search_path='' as $$
declare n integer;
begin
 insert into private.request_limits(user_id,action,count) values(p_user,p_action,1)
 on conflict(user_id,action,day) do update set count=private.request_limits.count+1
 returning count into n;
 return n<=p_limit;
end; $$;

create function public.acces_submit_report(p_user uuid,p_name text,p_lat double precision,p_lng double precision,p_category text,p_description text)
returns uuid language plpgsql security definer set search_path='' as $$
declare fingerprint text; target uuid; previous private.reports%rowtype;
begin
 if p_name is null or char_length(trim(p_name)) not between 3 and 120 or
    p_lat is null or p_lng is null or not(p_lat between -90 and 90) or not(p_lng between -180 and 180) or
    p_description is null or char_length(trim(p_description)) not between 10 and 1000 or
    p_category is null or p_category not in ('no_ramp','blocked_sidewalk','stairs','narrow_access','damaged_surface','other') then
    raise exception 'INVALID_REPORT';
 end if;
 select dni_hash into fingerprint from private.identities where user_id=p_user;
 if fingerprint is null then raise exception 'IDENTIFICATION_REQUIRED'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(fingerprint,0));
 if (select count(*) from private.reports where dni_hash=fingerprint and created_at>=current_date)>=5 then
   raise exception 'DAILY_LIMIT';
 end if;
 -- Serialize spatial grouping so simultaneous reports do not create duplicate nearby places.
 perform pg_catalog.pg_advisory_xact_lock(16092026);
 select id into target from private.places where extensions.st_dwithin(location,
   extensions.st_setsrid(extensions.st_makepoint(p_lng,p_lat),4326)::extensions.geography,25)
 order by extensions.st_distance(location,extensions.st_setsrid(extensions.st_makepoint(p_lng,p_lat),4326)::extensions.geography)
 limit 1;
 if target is null then
   insert into private.places(name,latitude,longitude) values(trim(p_name),p_lat,p_lng) returning id into target;
 end if;
 select * into previous from private.reports where place_id=target and dni_hash=fingerprint;
 if previous.id is not null and previous.status='active' and previous.created_at>now()-interval '90 days' then raise exception 'DUPLICATE_REPORT'; end if;
 if previous.id is not null and previous.status='rejected' then raise exception 'REPORT_REJECTED'; end if;
 insert into private.reports(place_id,user_id,dni_hash,category,description)
 values(target,p_user,fingerprint,p_category,trim(p_description))
 on conflict(place_id,dni_hash) do update set user_id=excluded.user_id,category=excluded.category,
 description=excluded.description,status='active',created_at=now();
 return target;
end; $$;
revoke execute on function public.acces_identity_status(uuid) from public,anon,authenticated;
revoke execute on function public.acces_identify(uuid,text) from public,anon,authenticated;
revoke execute on function public.acces_consume_quota(uuid,text,integer) from public,anon,authenticated;
revoke execute on function public.acces_submit_report(uuid,text,double precision,double precision,text,text) from public,anon,authenticated;
grant execute on function public.acces_identity_status(uuid) to service_role;
grant execute on function public.acces_identify(uuid,text) to service_role;
grant execute on function public.acces_consume_quota(uuid,text,integer) to service_role;
grant execute on function public.acces_submit_report(uuid,text,double precision,double precision,text,text) to service_role;
