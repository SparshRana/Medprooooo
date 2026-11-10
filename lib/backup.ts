import {restore,type Medicine} from './carely';
export function parseCabinetBackup(raw:string):Medicine[]{
 if(raw.length>8_000_000)throw Error('Backup is too large.');
 const parsed=JSON.parse(raw);if(parsed?.type!=='medpro-cabinet'||parsed.version!==1||!Array.isArray(parsed.items))throw Error('Choose a MedPro cabinet backup.');
 const items=restore(JSON.stringify({items:parsed.items})).items;
 if(items.length!==parsed.items.length)throw Error('Some entries are invalid or duplicated. The backup has not been imported.');return items;
}
export async function encryptBackup(text:string,password:string){
 if(password.length<12)throw Error('Use a backup password of at least 12 characters.');
 const salt=crypto.getRandomValues(new Uint8Array(16));const iv=crypto.getRandomValues(new Uint8Array(12));
 const key=await backupKey(password,salt);const cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(text));
 return JSON.stringify({type:'medpro-encrypted',version:1,salt:Array.from(salt),iv:Array.from(iv),cipher:Array.from(new Uint8Array(cipher))});
}
async function backupKey(password:string,salt:Uint8Array<ArrayBuffer>){const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:310000,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);}
export async function decryptBackup(raw:string,password:string){
 if(raw.length>40_000_000)throw Error('Backup is too large.');
 const p=JSON.parse(raw);if(p.type!=='medpro-encrypted'||p.version!==1||!Array.isArray(p.salt)||p.salt.length!==16||!Array.isArray(p.iv)||p.iv.length!==12||!Array.isArray(p.cipher)||p.cipher.length>8_000_000||![...p.salt,...p.iv,...p.cipher].every((n:unknown)=>Number.isInteger(n)&&Number(n)>=0&&Number(n)<=255))throw Error('Invalid encrypted backup.');
 try{const key=await backupKey(password,new Uint8Array(p.salt));return new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:new Uint8Array(p.iv)},key,new Uint8Array(p.cipher)));}catch{throw Error('The password is incorrect or the backup was modified.');}
}
export function downloadText(name:string,text:string,type='application/json'){
 const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
