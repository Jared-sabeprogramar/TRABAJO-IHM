begin;
insert into auth.users(id) values ('00000000-0000-4000-a000-000000000004');
select public.acces_identify('00000000-0000-4000-a000-000000000004', repeat('d',64));
-- Storage metadata fixture only; this transaction never uploads a public object.
insert into storage.objects(bucket_id,name)
values ('report-photos','00000000-0000-4000-a000-000000000004/test.jpg');
do $$
declare target uuid; evidence text; kinds text[];
begin
 target := public.acces_submit_report_with_photo('00000000-0000-4000-a000-000000000004',
 'Foto prueba transaccional',0.987654,0.987654,'stairs','Escaleras fotografiadas sin alternativa',
 '00000000-0000-4000-a000-000000000004/test.jpg');
 select photo_path into evidence from private.reports where place_id=target;
 if evidence is null then raise exception 'Photo not associated'; end if;
 select categories into kinds from public.place_report_summary where id=target;
 if not ('stairs'=any(kinds)) then raise exception 'Category unavailable'; end if;
 begin
  perform public.acces_submit_report_with_photo('00000000-0000-4000-a000-000000000004',
   'No crear este lugar',40.987654,40.987654,'stairs','Prueba de objeto ajeno no permitido','another-user/file.jpg');
  raise exception 'Foreign photo accepted';
 exception when raise_exception then if sqlerrm not like '%INVALID_REPORT%' then raise;end if;end;
 if exists(select 1 from private.places where name='No crear este lugar') then raise exception 'Failed report left place'; end if;
 if (select public from storage.buckets where id='report-photos') then raise exception 'Photos are public'; end if;
 if has_function_privilege('authenticated','public.acces_submit_report_with_photo(uuid,text,double precision,double precision,text,text,text)','EXECUTE') then raise exception 'Client bypasses edge'; end if;
 raise notice 'Evidence association, categories, private bucket and RPC permissions passed';
end $$;
rollback;
