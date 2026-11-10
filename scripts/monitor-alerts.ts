/** Run only on a configured trusted host. Never emits patient data or recipient addresses to logs. */
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {batchKey,manufacturerKey,normalize,searchAlerts,type AlertSnapshot} from '../lib/quality-alerts';
const {NEXT_PUBLIC_SUPABASE_URL:url,SUPABASE_SERVICE_ROLE_KEY:key,RESEND_API_KEY:mailKey,MEDPRO_ALERT_FROM:from}=process.env;
if(process.env.MEDPRO_MONITORING_ENABLED!=='true'){console.log('Monitoring disabled. No messages sent.');process.exit(0);}
if(!url||!key||!mailKey||!from)throw Error('Monitoring requires database credentials and a verified email sender.');
async function db<T>(path:string,method='GET',body?:unknown,prefer='return=representation'){
 const response=await fetch(new URL(path,url),{method,headers:{apikey:key!,Authorization:'Bearer '+key,'Content-Type':'application/json',Prefer:prefer},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error('Monitoring database request failed: HTTP '+response.status);if(response.status===204)return undefined as T;return await response.json() as T;
}
type Watch={id:string;owner_id:string;product:string;manufacturer:string;batch:string};
type Delivery={id:string;status:string;created_at:string;acknowledged_at:string|null};
const snapshot=JSON.parse(await readFile(process.env.MEDPRO_ALERT_SNAPSHOT||'data/cdsco-alerts.json','utf8')) as AlertSnapshot;
if(!snapshot.generatedAt||!Array.isArray(snapshot.records)||Date.now()-Date.parse(snapshot.generatedAt)>48*3600000)throw Error('Alert snapshot is stale. Synchronize official records before monitoring.');
let failures=0,accepted=0;
for(let offset=0;;offset+=100){const watches=await db<Watch[]>('/rest/v1/medpro_watches?enabled=eq.true&select=*&order=id&limit=100&offset='+offset);
 for(const watch of watches){try{
  const owner=await db<{email?:string;email_confirmed_at?:string}>('/auth/v1/admin/users/'+watch.owner_id);if(!owner.email||!owner.email_confirmed_at)continue;
  for(const {record,match} of searchAlerts(snapshot.records,watch)){if(match!=='exact')continue;
   const fingerprint=createHash('sha256').update(JSON.stringify([record.kind,record.period,normalize(record.product),manufacturerKey(record.manufacturer||record.manufacturedBy),batchKey(record.batch),normalize(record.issue),normalize(record.remarks),normalize(record.firmReply)])).digest('hex');
   const recipients=[owner.email];
   // Escalation only after 24 hours without owner acknowledgement and an unexpired pack-specific grant.
   const previous=await db<Delivery[]>('/rest/v1/medpro_deliveries?watch_id=eq.'+watch.id+'&fingerprint=eq.'+fingerprint+'&recipient_email=eq.'+encodeURIComponent(owner.email)+'&select=*');
   if(previous[0]&&!previous[0].acknowledged_at&&Date.now()-Date.parse(previous[0].created_at)>86400000){
    const shared=await db<Array<{id:string;pack:{product:string;manufacturer:string;batch:string}}>>('/rest/v1/medpro_shared_cases?owner_id=eq.'+watch.owner_id+'&select=id,pack');
    const ids=shared.filter(c=>normalize(c.pack.product)===normalize(watch.product)&&manufacturerKey(c.pack.manufacturer)===manufacturerKey(watch.manufacturer)&&batchKey(c.pack.batch)===batchKey(watch.batch)).map(c=>c.id);
    for(const id of ids){const grants=await db<Array<{recipient_email:string}>>('/rest/v1/medpro_case_grants?case_id=eq.'+id+'&enabled=eq.true&expires_at=gt.'+encodeURIComponent(new Date().toISOString())+'&scopes=cs.%7Balerts%7D&select=recipient_email');recipients.push(...grants.map(g=>g.recipient_email));}
   }
   for(const recipient of new Set(recipients)){
    // Re-read consent immediately before delivery; disabled watches never deliver on retry.
    const [stillWatching]=await db<Array<{enabled:boolean}>>('/rest/v1/medpro_watches?id=eq.'+watch.id+'&select=enabled');if(!stillWatching?.enabled)continue;
    await db('/rest/v1/medpro_deliveries','POST',{watch_id:watch.id,fingerprint,recipient_email:recipient,source_url:record.sourceUrl,evidence:record},'return=minimal,resolution=ignore-duplicates');
    const [delivery]=await db<Delivery[]>('/rest/v1/medpro_deliveries?watch_id=eq.'+watch.id+'&fingerprint=eq.'+fingerprint+'&recipient_email=eq.'+encodeURIComponent(recipient)+'&select=*');if(!delivery||delivery.status==='accepted')continue;
    if(Date.now()-Date.parse(delivery.created_at)>23*3600000){await db('/rest/v1/medpro_deliveries?id=eq.'+delivery.id,'PATCH',{status:'needs-review'});continue;}
    const claimed=await db<boolean>('/rest/v1/rpc/medpro_claim_delivery','POST',{p_id:delivery.id});if(!claimed)continue;
    try{const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+mailKey,'Content-Type':'application/json','Idempotency-Key':'medpro/'+delivery.id},body:JSON.stringify({from,to:[recipient],subject:'MedPro: published batch finding needs review',text:`A registered pack matches a published ${record.kind} finding (${record.period}). Product: ${watch.product}. Batch: ${watch.batch}. Compare the actual pack and ask a pharmacist or prescriber. Do not change treatment on your own. Official source: ${record.sourceUrl}`}),signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('Email provider unavailable');await db('/rest/v1/medpro_deliveries?id=eq.'+delivery.id,'PATCH',{status:'accepted',delivered_at:new Date().toISOString(),lease_until:null});accepted++;}
    catch{await db('/rest/v1/medpro_deliveries?id=eq.'+delivery.id,'PATCH',{status:'failed',lease_until:null});failures++;}
   }
  }
 }catch{failures++;}}
 if(watches.length<100)break;
}
console.log(JSON.stringify({accepted,failures}));if(failures)process.exitCode=1;
