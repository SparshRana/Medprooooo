import {restoreCases,type CareCase} from './care';
export type PendingSync={scope:string;revision:number;cases:CareCase[];queuedAt:string};
export const pendingKey=(scope:string)=>'medpro:pending-reviews:'+scope;
export function readPending(scope:string):PendingSync|null{try{const p=JSON.parse(localStorage.getItem(pendingKey(scope))||'null');if(!p||p.scope!==scope||!Number.isSafeInteger(p.revision)||p.revision<0||!Array.isArray(p.cases)||restoreCases(JSON.stringify(p.cases)).length!==p.cases.length)return null;return p;}catch{return null;}}
export function queueReviews(p:PendingSync){if(JSON.stringify(p).length>2000000)throw Error('Review backup is too large. Export a copy instead.');localStorage.setItem(pendingKey(p.scope),JSON.stringify(p));}
