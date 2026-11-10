import type {AlertSnapshot} from './quality-alerts';
export type SignedUpdate={version:1;sequence:number;publishedAt:string;payload:string;signature:string};
const decode=(s:string)=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
export function updateMessage(p:Pick<SignedUpdate,'version'|'sequence'|'publishedAt'|'payload'>){return JSON.stringify([p.version,p.sequence,p.publishedAt,p.payload]);}
export async function verifyUpdate(raw:string,publicKey:string,minimumSequence:number,now=Date.now()){
 if(raw.length>20_000_000)throw Error('Update package is too large.');
 if(!publicKey)throw Error('No trusted update signing key is configured. Use the bundled records.');
 const p=JSON.parse(raw) as SignedUpdate;
 if(p.version!==1||!Number.isSafeInteger(p.sequence)||p.sequence<=minimumSequence||typeof p.payload!=='string'||typeof p.signature!=='string'||!Number.isFinite(Date.parse(p.publishedAt))||Date.parse(p.publishedAt)>now+300000)throw Error('Invalid, old or future-dated update package.');
 const key=await crypto.subtle.importKey('raw',decode(publicKey),{name:'Ed25519'},false,['verify']);
 if(!await crypto.subtle.verify('Ed25519',key,decode(p.signature),new TextEncoder().encode(updateMessage(p))))throw Error('Update signature could not be verified.');
 const data=JSON.parse(p.payload) as AlertSnapshot;
 if(data.schemaVersion!==1||!Array.isArray(data.records)||data.records.length<1||data.records.length>100000||!Array.isArray(data.coverage)||!Array.isArray(data.failures)||!Number.isFinite(Date.parse(data.generatedAt))||Date.parse(data.generatedAt)>now+300000)throw Error('Update has invalid alert coverage.');
 if(data.records.some(r=>!r||typeof r.product!=='string'||!r.product||typeof r.manufacturer!=='string'||typeof r.manufacturedBy!=='string'||typeof r.brand!=='string'||typeof r.batch!=='string'||!r.batch||typeof r.id!=='string'||typeof r.issue!=='string'||typeof r.remarks!=='string'||typeof r.firmReply!=='string'||typeof r.period!=='string'||!['NSQ','SPURIOUS'].includes(r.kind)||!Number.isFinite(Date.parse(r.retrievedAt))||!/^https:\/\/(?:www\.)?(?:cdscoonline\.gov\.in|cdsco\.gov\.in)\//.test(r.sourceUrl)))throw Error('Update contains incomplete identities or non-official sources.');
 return {sequence:p.sequence,publishedAt:p.publishedAt,snapshot:data};
}
async function database(){return await new Promise<IDBDatabase>((resolve,reject)=>{const request=indexedDB.open('medpro-public-evidence',1);request.onupgradeneeded=()=>request.result.createObjectStore('updates');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(Error('Offline update storage is unavailable.'));});}
export async function savedUpdate(){if(typeof indexedDB==='undefined')return null;const db=await database();try{return await new Promise<{sequence:number;raw:string}|null>((resolve,reject)=>{const req=db.transaction('updates').objectStore('updates').get('current');req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error);});}finally{db.close();}}
export async function installUpdate(raw:string,minimumSequence:number){const previous=await savedUpdate();const checked=await verifyUpdate(raw,process.env.NEXT_PUBLIC_ALERT_SIGNING_KEY||'',Math.max(minimumSequence,previous?.sequence||0));const db=await database();try{await new Promise<void>((resolve,reject)=>{const tx=db.transaction('updates','readwrite');tx.objectStore('updates').put({sequence:checked.sequence,raw},'current');tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});}finally{db.close();}return checked.snapshot;}
