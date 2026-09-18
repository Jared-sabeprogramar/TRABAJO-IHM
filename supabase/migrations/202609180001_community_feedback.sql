-- Community confirmations are aggregated publicly; identities and individual
-- feedback remain in the private schema.
create table private.place_feedback (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references private.places(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  state text not null check (state in ('present','resolved')),
  created_at timestamptz not null default now(),
  unique(place_id,user_id)
);
create index place_feedback_recent on private.place_feedback(place_id,created_at desc);
alter table private.place_feedback enable row level security;
revoke all on private.place_feedback from public,anon,authenticated;
grant all on private.place_feedback to service_role;

create function public.acces_submit_place_feedback(
  p_user uuid, p_place uuid, p_state text
) returns void language plpgsql security definer set search_path='' as $$
begin
  if p_state not in ('present','resolved') or not exists(
    select 1 from private.places where id=p_place
  ) then raise exception 'INVALID_FEEDBACK'; end if;
  if not exists(select 1 from private.identities where user_id=p_user) then
    raise exception 'IDENTIFICATION_REQUIRED';
  end if;
  insert into private.place_feedback(place_id,user_id,state)
  values(p_place,p_user,p_state)
  on conflict(place_id,user_id) do update set state=excluded.state,created_at=now();
end; $$;
revoke execute on function public.acces_submit_place_feedback(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.acces_submit_place_feedback(uuid,uuid,text) to service_role;

create or replace view public.place_report_summary as
with report_stats as (
  select place_id,count(*)::integer as report_count,max(created_at) as last_report_at,
    array_agg(distinct category) as categories
  from private.reports where status='active' and created_at > now()-interval '90 days'
  group by place_id
), feedback_stats as (
  select place_id,
    count(*) filter(where state='present' and created_at > now()-interval '90 days')::integer as present_votes,
    count(*) filter(where state='resolved' and created_at > now()-interval '90 days')::integer as resolved_votes,
    max(created_at) filter(where created_at > now()-interval '90 days') as last_verification_at
  from private.place_feedback group by place_id
)
select p.id,p.name,p.latitude,p.longitude,
 coalesce(r.report_count,0) as report_count,r.last_report_at,
 coalesce(r.categories,array[]::text[]) as categories,
 coalesce(f.present_votes,0) as present_votes,coalesce(f.resolved_votes,0) as resolved_votes,
 f.last_verification_at
from private.places p left join report_stats r on r.place_id=p.id
left join feedback_stats f on f.place_id=p.id;
revoke all on public.place_report_summary from public,anon,authenticated;
grant select on public.place_report_summary to anon,authenticated,service_role;

create view public.community_impact_summary as
select
  (select count(*)::integer from private.places) as reported_places,
  (select count(*)::integer from private.reports where status='active' and created_at > now()-interval '90 days') as active_reports,
  (select count(distinct place_id)::integer from private.place_feedback where created_at > now()-interval '90 days') as verified_places,
  (select count(*)::integer from private.place_feedback where state='resolved' and created_at > now()-interval '90 days') as resolved_confirmations;
revoke all on public.community_impact_summary from public,anon,authenticated;
grant select on public.community_impact_summary to anon,authenticated,service_role;
