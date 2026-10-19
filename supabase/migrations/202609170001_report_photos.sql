-- Private evidence; no public image URLs or direct client uploads.
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('report-photos', 'report-photos', false, 524288, array['image/jpeg'])
on conflict(id) do nothing;

alter table private.reports add column photo_path text;

create function public.acces_submit_report_with_photo(
  p_user uuid, p_name text, p_lat double precision, p_lng double precision,
  p_category text, p_description text, p_photo_path text
) returns uuid language plpgsql security definer set search_path='' as $$
declare target uuid;
begin
  if p_photo_path is not null and (
    p_photo_path not like p_user::text || '/%' or
    not exists(select 1 from storage.objects where bucket_id='report-photos' and name=p_photo_path)
  ) then raise exception 'INVALID_REPORT'; end if;
  target := public.acces_submit_report(p_user,p_name,p_lat,p_lng,p_category,p_description);
  update private.reports set photo_path=coalesce(p_photo_path,photo_path)
  where place_id=target and user_id=p_user;
  return target;
end; $$;
revoke execute on function public.acces_submit_report_with_photo(uuid,text,double precision,double precision,text,text,text) from public,anon,authenticated;
grant execute on function public.acces_submit_report_with_photo(uuid,text,double precision,double precision,text,text,text) to service_role;

create or replace view public.place_report_summary as
select p.id,p.name,p.latitude,p.longitude,
 count(r.id)::integer as report_count,max(r.created_at) as last_report_at,
 coalesce(array_agg(distinct r.category) filter(where r.id is not null),array[]::text[]) as categories
from private.places p left join private.reports r
 on r.place_id=p.id and r.status='active' and r.created_at > now()-interval '90 days'
group by p.id;
