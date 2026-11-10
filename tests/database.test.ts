import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
test('database enforces owner isolation, revision conflicts, expiring grants and verified reviewer boundaries',async()=>{
 const db=new PGlite();try{
 await db.exec(`create schema auth;create role anon;create role authenticated;create role service_role bypassrls;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;grant usage on schema public,auth to authenticated,anon,service_role;`);
 await db.exec(await readFile(new URL('../supabase/schema.sql',import.meta.url),'utf8'));
 const owner='11111111-1111-4111-8111-111111111111',reviewer='22222222-2222-4222-8222-222222222222',stranger='33333333-3333-4333-8333-333333333333';
 await db.query("insert into auth.users(id,email,email_confirmed_at) values($1,'owner@example.test',now()),($2,'reviewer@example.test',now()),($3,'stranger@example.test',now())",[owner,reviewer,stranger]);
 async function as(id:string,email:string){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)",[id,JSON.stringify({email})]);await db.exec('set role authenticated');}
 await as(owner,'owner@example.test');
 assert.equal((await db.query<{r:number}>('select medpro_save_reviews($1::jsonb,0) r',[JSON.stringify([])])).rows[0].r,1);
 await assert.rejects(db.query('select medpro_save_reviews($1::jsonb,0)',[JSON.stringify([])]),/changed/);
 const created=await db.query<{id:string}>('insert into medpro_shared_cases(owner_id,pack,question) values($1,$2::jsonb,$3) returning id',[owner,JSON.stringify({product:'Synthetic pack',batch:'TEST-1'}),'Synthetic review request']);const caseId=created.rows[0].id;
 await db.query("insert into medpro_case_grants(case_id,owner_id,recipient_email,scopes,expires_at) values($1,$2,'reviewer@example.test',array['review'],now()+interval '1 day')",[caseId,owner]);
 await as(stranger,'stranger@example.test');assert.equal((await db.query('select * from medpro_shared_cases')).rows.length,0);assert.equal((await db.query('select * from medpro_review_workspaces')).rows.length,0);
 await assert.rejects(db.query('select medpro_read_case($1)',[caseId]),/consent/);
 await as(reviewer,'reviewer@example.test');assert.equal((await db.query('select medpro_read_case($1)',[caseId])).rows.length,1);
 await assert.rejects(db.query('select medpro_record_professional_review($1,$2)',[caseId,'Synthetic review outcome']),/Verified professional/);
 await assert.rejects(db.query('insert into medpro_verified_professionals(user_id,registration_reference) values($1,$2)',[reviewer,'self-asserted']),/permission denied/);
 await db.exec('reset role');await db.query('insert into medpro_verified_professionals(user_id,registration_reference) values($1,$2)',[reviewer,'SYNTHETIC-TEST-ONLY']);
 await as(reviewer,'reviewer@example.test');await db.query('select medpro_record_professional_review($1,$2)',[caseId,'Synthetic authenticated review outcome']);
 await as(owner,'owner@example.test');assert.equal((await db.query('select * from medpro_professional_reviews')).rows.length,1);assert.equal((await db.query('select * from medpro_access_log')).rows.length,2);
 await db.query('update medpro_case_grants set enabled=false where case_id=$1',[caseId]);
 await as(reviewer,'reviewer@example.test');assert.equal((await db.query('select * from medpro_shared_cases')).rows.length,0);await assert.rejects(db.query('select medpro_record_professional_review($1,$2)',[caseId,'Must be rejected after revocation']),/consent/);
 await assert.rejects(db.query('select medpro_claim_delivery($1)',[caseId]),/permission denied/);
 await as(owner,'owner@example.test');
 const watch=(await db.query<{id:string}>('insert into medpro_watches(owner_id,product,manufacturer,batch) values($1,$2,$3,$4) returning id',[owner,'Synthetic pack','Example Ltd','TEST-1'])).rows[0];
 await db.exec('reset role');
 const delivery=(await db.query<{id:string}>('insert into medpro_deliveries(watch_id,fingerprint,recipient_email,source_url) values($1,$2,$3,$4) returning id',[watch.id,'synthetic-fingerprint','owner@example.test','https://cdscoonline.gov.in/CDSCO/viewPublicNSQDrug'])).rows[0];
 await db.exec('set role service_role');
 assert.equal((await db.query<{claimed:boolean}>('select medpro_claim_delivery($1) claimed',[delivery.id])).rows[0].claimed,true);
 assert.equal((await db.query<{claimed:boolean}>('select medpro_claim_delivery($1) claimed',[delivery.id])).rows[0].claimed,false);
 await as(stranger,'stranger@example.test');
 assert.equal((await db.query('select * from medpro_deliveries')).rows.length,0);
 await assert.rejects(db.query('select medpro_acknowledge_delivery($1)',[delivery.id]),/not found/);
 await as(owner,'owner@example.test');await db.query('select medpro_acknowledge_delivery($1)',[delivery.id]);
 assert.ok((await db.query<{acknowledged_at:string}>('select acknowledged_at from medpro_deliveries where id=$1',[delivery.id])).rows[0].acknowledged_at);

 }finally{await db.close();}
});
