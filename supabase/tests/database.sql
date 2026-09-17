begin;
-- Real Supabase database tests, rolled back: no sample reports left on the map.
insert into auth.users(id) values
 ('00000000-0000-4000-a000-000000000001'),
 ('00000000-0000-4000-a000-000000000002'),
 ('00000000-0000-4000-a000-000000000003');
select public.acces_identify('00000000-0000-4000-a000-000000000001',repeat('a',64));
select public.acces_identify('00000000-0000-4000-a000-000000000002',repeat('b',64));
select public.acces_identify('00000000-0000-4000-a000-000000000003',repeat('a',64));
do $$
declare target uuid; n integer;
begin
target:=public.acces_submit_report('00000000-0000-4000-a000-000000000001','Prueba transaccional',-12.123456,-77.123456,'stairs','Escaleras sin acceso alternativo');
perform public.acces_submit_report('00000000-0000-4000-a000-000000000002','Mismo lugar cercano',-12.123457,-77.123457,'no_ramp','No existe una rampa de acceso');
select report_count into n from public.place_report_summary where id=target;
if n<>2 then raise exception 'Expected 2 aggregated reports, got %',n;end if;
begin
 perform public.acces_submit_report('00000000-0000-4000-a000-000000000003','Duplicado',-12.123456,-77.123456,'stairs','Otro reporte con el mismo DNI');
 raise exception 'Duplicate was accepted';
exception when raise_exception then if sqlerrm not like '%DUPLICATE_REPORT%' then raise;end if;end;
begin
 perform public.acces_identify('00000000-0000-4000-a000-000000000001',repeat('c',64));
 raise exception 'DNI could be replaced';
exception when raise_exception then if sqlerrm not like '%IDENTITY_ALREADY_SET%' then raise;end if;end;
update private.reports set created_at=now()-interval '91 days' where place_id=target;
select report_count into n from public.place_report_summary where id=target;
if n<>0 then raise exception 'Expired reports counted';end if;
if has_function_privilege('anon','public.acces_identify(uuid,text)','EXECUTE') then raise exception 'Anonymous client can impersonate identities';end if;
if has_function_privilege('authenticated','public.acces_submit_report(uuid,text,double precision,double precision,text,text)','EXECUTE') then raise exception 'Client can bypass edge controls';end if;
if has_table_privilege('anon','private.identities','SELECT') then raise exception 'DNI fingerprints exposed';end if;
if not has_table_privilege('anon','public.place_report_summary','SELECT') then raise exception 'Public aggregate unavailable';end if;
raise notice 'Aggregation, proximity, duplicate DNI, expiry, identity immutability and permissions: passed';
end $$;
rollback;
