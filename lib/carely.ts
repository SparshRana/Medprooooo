import type {Ingredient,TreatmentState} from './care';
/** User-entered pack details are never treated as verified product data. */
export type Medicine = {product:string;manufacturer:string;strength:string;form:string;release:string;batch:string;origin?:'manual';demo?:boolean;owner?:string;expiry?:string;notes?:string;photo?:string;photoOriginal?:string; example?:boolean; treatmentState?:TreatmentState; ingredients?:Ingredient[]; ingredientsConfirmed?:boolean; prescriptionInstructions?:string; openedOn?:string; afterOpeningDays?:number; quantity?:number; dailyQuantity?:number; scheduleConfirmed?:boolean; previousPackKey?:string; capturedAt?:string; captureConfirmed?:boolean; capturedText?:string; manufacturedOn?:string; changes?:Array<{at:string;summary:string}>};
export const fields=['product','manufacturer','strength','form','release','batch'] as const;
export const norm=(v:string)=>v.trim().replace(/\s+/g,' ').toLowerCase();
export const ownerKey=(m:Medicine)=>norm(m.owner||'Me')||'me';
export const key=(m:Medicine)=>JSON.stringify([...fields.map(f=>norm(m[f])),ownerKey(m)]);
export const initial:Medicine[]=[];
export const STORAGE_KEY='carely:cabinet:v2';
export const LEGACY_STORAGE_KEY='carely:demo:v1';
export const add=(items:Medicine[],m:Medicine)=>items.some(x=>key(x)===key(m))?items:[...items,m];
export function validateMedicine(m:Medicine){
 if(!m||typeof m.product!=='string'||!m.product.trim())return 'Enter the medicine name. Other pack details can be added later.';
 if(fields.some(f=>typeof m[f]!=='string'||m[f].length>(f==='manufacturer'?500:150)))return 'Keep medicine fields under 150 characters and the manufacturer under 500 characters.';
 if(m.expiry!==undefined&&(typeof m.expiry!=='string'||m.expiry&&!/^\d{4}-(0[1-9]|1[0-2])$/.test(m.expiry)))return 'Choose a valid expiry month.';
 if(m.photoOriginal!==undefined&&(typeof m.photoOriginal!=='string'||m.photoOriginal.length>280000||!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(m.photoOriginal)))return 'Original photo must be a prepared JPEG under the storage limit.';
 if(m.changes!==undefined&&(!Array.isArray(m.changes)||m.changes.length>50||m.changes.some(c=>!c||typeof c.at!=='string'||!Number.isFinite(Date.parse(c.at))||typeof c.summary!=='string'||c.summary.length>3000)))return 'Pack change history is invalid.';
 if(m.treatmentState!==undefined&&!['current','occasional','stopped','stored'].includes(m.treatmentState))return 'Choose a valid treatment status.';
 if(m.ingredients!==undefined&&(!Array.isArray(m.ingredients)||m.ingredients.length>20||m.ingredients.some(i=>!i||typeof i.name!=='string'||typeof i.strength!=='string'||i.name.length>150||i.strength.length>80)))return 'Check each ingredient and strength.';
 if(m.prescriptionInstructions!==undefined&&(typeof m.prescriptionInstructions!=='string'||m.prescriptionInstructions.length>1000))return 'Keep prescription instructions under 1,000 characters.';
 for(const field of ['openedOn','manufacturedOn'] as const)if(m[field]!==undefined&&m[field]!==''&&(!/^\d{4}-\d{2}-\d{2}$/.test(m[field]!)||!Number.isFinite(Date.parse(m[field]!+'T12:00:00Z'))||new Date(m[field]!+'T12:00:00Z').toISOString().slice(0,10)!==m[field]))return 'Choose a valid calendar date.';
 for(const field of ['afterOpeningDays','quantity','dailyQuantity'] as const)if(m[field]!==undefined&&(!Number.isFinite(m[field])||m[field]!<0||m[field]!>100000))return 'Enter a valid non-negative quantity.';
 if(m.capturedText!==undefined&&(typeof m.capturedText!=='string'||m.capturedText.length>20000))return 'Captured text is too long.';
 if(m.captureConfirmed===false)return 'Confirm the photographed fields against the pack before saving.';
 if(m.notes!==undefined&&(typeof m.notes!=='string'||m.notes.length>500))return 'Keep your note under 500 characters.';
 if(m.owner!==undefined&&(typeof m.owner!=='string'||m.owner.length>80))return 'Keep the family label under 80 characters.';
 return '';
}
export function restore(raw:string|null):{items:Medicine[]}{
 try{const parsed=JSON.parse(raw||'null');if(!parsed||!Array.isArray(parsed.items))return {items:[]};
 const items:Medicine[]=[];const seen=new Set<string>();
 for(const value of parsed.items){if(!value||value.origin!=='manual'||value.demo||value.example||validateMedicine(value))continue;const id=key(value);if(seen.has(id))continue;seen.add(id);const photo=typeof value.photo==='string'&&value.photo.length<=280000&&/^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(value.photo)?value.photo:undefined;items.push({...value,...(value.photo===undefined?{}:{photo}),origin:'manual'});}
 return {items};
 }catch{return {items:[]};}
}
export function restoreLegacy(raw:string|null){return restore(raw);}
export function resetStorage(storage:Pick<Storage,'removeItem'>){storage.removeItem(STORAGE_KEY);storage.removeItem(LEGACY_STORAGE_KEY);storage.removeItem(STORAGE_KEY+':checks');return {items:[] as Medicine[]};}
export function updateMedicine(items:Medicine[],oldKey:string,m:Medicine){const previous=items.find(x=>key(x)===oldKey);const changes=[...(previous?.changes||[]),{at:new Date().toISOString(),summary:'User edited pack details; previous identity: '+oldKey}].slice(-50);return items.filter(x=>key(x)!==oldKey).reduce(add,[{...m,changes}]);}
export function removeMedicine(items:Medicine[],entryKey:string){return items.filter(m=>key(m)!==entryKey);}
/** Load never overwrites an existing device record; cloud remains available for conflict review. */
export function mergeCabinets(local:Medicine[],remote:Medicine[]){
 const items=[...local];const index=new Map(local.map((m,i)=>[key(m),i]));let conflicts=0;
 for(const m of remote){const i=index.get(key(m));if(i===undefined){index.set(key(m),items.length);items.push(m);}else{
  const current=items[i];if((current.expiry&&m.expiry&&current.expiry!==m.expiry)||(current.notes&&m.notes&&current.notes!==m.notes))conflicts++;
  items[i]={...m,...current,expiry:current.expiry||m.expiry||'',notes:current.notes||m.notes||''};
 }}return {items,conflicts};
}
