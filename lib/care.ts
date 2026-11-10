import {key, norm, ownerKey, type Medicine} from './carely';
import {batchStatus} from './offline-medical';
import type {AlertSnapshot} from './quality-alerts';

export type TreatmentState = 'current' | 'occasional' | 'stopped' | 'stored';
export type Ingredient = {name:string;strength:string};
export type CaseStage = 'opened' | 'pack-confirmed' | 'acknowledged' | 'review-requested' | 'review-recorded' | 'resolved' | 'reopened';
export type CaseEvent = {id:string;at:string;stage:CaseStage;note:string;actor:'owner';verification:'user-recorded'};
export type CareCase = {id:string;packKey:string;product:string;batch:string;owner:string;createdAt:string;events:CaseEvent[]};
export type CareTask = {id:string;pack:Medicine;kind:'quality'|'identity'|'expiry'|'opening'|'refill';message:string;urgent:boolean};
export const today = () => new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Kolkata'});
const day = (s:string) => Date.parse(s+'T12:00:00Z');
export function validDay(s:string){return /^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(day(s))&&new Date(day(s)).toISOString().slice(0,10)===s;}
export function daysBetween(a:string,b:string){return Math.round((day(b)-day(a))/86400000);}
export function expiryDay(month:string){if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))return null;const [y,m]=month.split('-').map(Number);return new Date(Date.UTC(y,m,0)).toISOString().slice(0,10);}
export function openingDeadline(m:Medicine){if(!m.openedOn||!validDay(m.openedOn)||!m.afterOpeningDays||m.afterOpeningDays<1)return null;return new Date(day(m.openedOn)+m.afterOpeningDays*86400000).toISOString().slice(0,10);}
export function refillDays(m:Medicine){return m.quantity!==undefined&&m.quantity>=0&&m.dailyQuantity&&m.dailyQuantity>0&&m.scheduleConfirmed?Math.floor(m.quantity/m.dailyQuantity):null;}
export function activeTreatment(m:Medicine){return m.treatmentState==='current'||m.treatmentState==='occasional';}
export function confirmedIngredients(m:Medicine){return m.ingredientsConfirmed&&Array.isArray(m.ingredients)?m.ingredients.filter(i=>i.name.trim()&&i.strength.trim()):[];}
export function duplicateIngredients(medicines:Medicine[]){
 const warnings:Array<{owner:string;ingredient:string;packs:Medicine[]}>=[];
 const groups=new Map<string,{owner:string;ingredient:string;packs:Medicine[]}>();
 for(const m of medicines.filter(activeTreatment))for(const i of confirmedIngredients(m)){
  const id=ownerKey(m)+'|'+norm(i.name);const group=groups.get(id)||{owner:m.owner||'Me',ingredient:i.name,packs:[]};
  if(!group.packs.some(p=>key(p)===key(m)))group.packs.push(m);groups.set(id,group);
 }
 for(const g of groups.values())if(g.packs.length>1)warnings.push(g);return warnings;
}
export function comparePacks(previous:Medicine,next:Medicine){
 return (['product','manufacturer','strength','form','release','batch','expiry'] as const).filter(field=>norm(previous[field]||'')!==norm(next[field]||'')).map(field=>({field,before:previous[field]||'Not supplied',after:next[field]||'Not supplied'}));
}
export function careTasks(packs:Medicine[],snapshot:AlertSnapshot|null,asOf=today(),simulation=false):CareTask[]{
 const tasks:CareTask[]=[];
 for(const pack of packs){
  const add=(kind:CareTask['kind'],message:string,urgent=false)=>tasks.push({id:key(pack)+':'+kind,pack,kind,message,urgent});
  const status=snapshot?batchStatus(pack,snapshot.records,simulation):null;
  if(status?.state==='matching-alert'||status?.state==='simulated')add('quality',(status.state==='simulated'?'SIMULATED · ':'')+'Published batch finding: confirm your pack and request pharmacist review.',true);
  else if(!pack.batch||!pack.manufacturer)add('identity','Confirm the printed manufacturer and batch to complete the pack check.');
  const expiry=expiryDay(pack.expiry||'');
  if(expiry){const days=daysBetween(asOf,expiry);if(days<0)add('expiry','Printed expiry has passed. Ask your pharmacist about disposal and replacement.',true);else if(days<=60)add('expiry',`Printed expiry is in ${days} days.`);}
  const opening=openingDeadline(pack);
  if(opening){const days=daysBetween(asOf,opening);if(days<=7)add('opening',`User-entered after-opening deadline: ${opening}. Confirm the label instructions.`,days<0);}
  const remaining=refillDays(pack);if(remaining!==null&&remaining<=7&&activeTreatment(pack))add('refill',`About ${remaining} days remaining, based on your confirmed quantity and schedule.`);
 }
 return tasks.sort((a,b)=>Number(b.urgent)-Number(a.urgent));
}
export function appendCaseEvent(c:CareCase,stage:CaseStage,note:string,at=new Date().toISOString()):CareCase{
 if(!note.trim()||note.length>1000)throw Error('Add a note of 1–1,000 characters.');
 if(c.events.at(-1)?.stage==='resolved'&&stage!=='reopened')throw Error('Reopen this case before adding another step.');
 if(stage==='resolved'&&!c.events.some(e=>e.stage==='review-recorded'))throw Error('Record the professional review outcome before resolving this case.');
 return {...c,events:[...c.events,{id:crypto.randomUUID(),at,stage,note:note.trim(),actor:'owner',verification:'user-recorded'}]};
}
export function newCase(m:Medicine):CareCase{
 const at=new Date().toISOString();return {id:crypto.randomUUID(),packKey:key(m),product:m.product,batch:m.batch,owner:m.owner||'Me',createdAt:at,events:[{id:crypto.randomUUID(),at,stage:'opened',note:'Pack review opened. No professional verification has occurred.',actor:'owner',verification:'user-recorded'}]};
}
export function restoreCases(raw:string|null):CareCase[]{
 try{const values:unknown=JSON.parse(raw||'[]');if(!Array.isArray(values)||values.length>1000)return [];
 return values.filter((c):c is CareCase=>!!c&&typeof c==='object'&&typeof c.id==='string'&&typeof c.packKey==='string'&&typeof c.product==='string'&&typeof c.owner==='string'&&typeof c.batch==='string'&&Array.isArray(c.events)&&c.events.length<=500&&c.events.every((e:CaseEvent)=>e&&typeof e.note==='string'&&e.note.length<=1000&&typeof e.at==='string'&&Number.isFinite(Date.parse(e.at))&&['opened','pack-confirmed','acknowledged','review-requested','review-recorded','resolved','reopened'].includes(e.stage)&&e.verification==='user-recorded'&&e.actor==='owner'));}catch{return [];}
}
export function appointmentSummary(packs:Medicine[]){return ['MedPro — user-entered medicine list',`Prepared ${today()} · Confirm with the patient and pharmacist.`,...packs.map(m=>`${m.owner||'Me'} | ${m.product} | ${m.strength} | ${m.form} | ${m.release} | ${m.treatmentState||'Status unconfirmed'}\nManufacturer: ${m.manufacturer||'Not supplied'} | Batch: ${m.batch||'Not supplied'} | Expiry: ${m.expiry||'Not supplied'}\nPatient-entered prescription instructions: ${m.prescriptionInstructions||'Not supplied'}`)].join('\n\n');}
