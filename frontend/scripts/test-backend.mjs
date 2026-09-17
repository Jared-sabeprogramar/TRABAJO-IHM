import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createClient} from '@supabase/supabase-js';
const baseConfig=JSON.parse(readFileSync(new URL('../src/assets/config.json',import.meta.url),'utf8'));
const localConfigPath=new URL('../src/assets/config.local.json',import.meta.url);
const localConfig=existsSync(localConfigPath) ? JSON.parse(readFileSync(localConfigPath,'utf8')) : {};
const config={...baseConfig,...localConfig};
assert.equal(config.supabaseUrl,'http://127.0.0.1:54321','This test is local only');
const make=()=>createClient(config.supabaseUrl,config.supabaseAnonKey,{auth:{persistSession:false,autoRefreshToken:false}});
const users=[];let place;
const errorStatus=(r)=>r.error?.context?.status;
async function session(){const c=make();const {data,error}=await c.auth.signInAnonymously();assert.ifError(error);users.push(data.user.id);return c;}
try{
const c=await session();
const noIdentity=await c.functions.invoke('submit-report',{body:{name:'Prueba E2E temporal',latitude:0.123456,longitude:0.123456,category:'stairs',description:'Prueba automatizada sin ubicacion real'}});
assert.equal(errorStatus(noIdentity),403);
assert.equal(errorStatus(await c.functions.invoke('identify',{body:{dni:'123'}})),400);
assert.ifError((await c.functions.invoke('identify',{body:{dni:'00000000'}})).error);
const input={name:'Prueba E2E temporal',latitude:0.123456,longitude:0.123456,category:'stairs',description:'Prueba automatizada sin ubicacion real'};
const result=await c.functions.invoke('submit-report',{body:input});assert.ifError(result.error);place=result.data.place_id;
assert.equal(errorStatus(await c.functions.invoke('submit-report',{body:input})),409);
const other=await session();assert.ifError((await other.functions.invoke('identify',{body:{dni:'00000000'}})).error);
assert.equal(errorStatus(await other.functions.invoke('submit-report',{body:input})),409);
const publicClient=make();const summary=await publicClient.from('place_report_summary').select('*').eq('id',place).single();assert.ifError(summary.error);assert.equal(summary.data.report_count,1);assert.equal('dni_hash' in summary.data,false);
assert.ok((await publicClient.rpc('acces_identify',{p_user:users[0],p_hash:'a'.repeat(64)})).error);
assert.equal(errorStatus(await c.functions.invoke('describe-image',{body:{image:'data:image/jpeg;base64,/9j/AA=='}})),503);
console.log('PASS: real anonymous session, DNI validation, identification, report creation, cross-session duplicate prevention, public aggregate, RPC protection, honest missing-AI error.');
} finally {
const ids=users.filter(id=>/^[a-f0-9-]{36}$/.test(id));let sql='';
if(place&&/^[a-f0-9-]{36}$/.test(place))sql+="delete from private.reports where place_id='"+place+"';delete from private.places where id='"+place+"';";
if(ids.length)sql+="delete from auth.users where id in ("+ids.map(id=>"'"+id+"'").join(',')+");";
if(sql)execFileSync('docker',['exec','-i','supabase_db_acces','psql','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'],{input:sql,stdio:['pipe','pipe','pipe']});
console.log('Temporary test users and reports removed.');
}
