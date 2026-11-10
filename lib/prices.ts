export type Formulation={ingredients:Array<{name:string;strength:string}>;form:string;release:string};
export type PriceQuote={formulation:Formulation;product:string;packQuantity:number;unit:string;price:number;priceType:'MRP'|'selling';sourceUrl:string;checkedAt:string;stock:'unknown'|'confirmed';reviewed:boolean};
const norm=(s:string)=>s.normalize('NFKC').trim().toLowerCase().replace(/\s+/g,' ');
export function formulationIdentity(f:Formulation){return JSON.stringify({ingredients:f.ingredients.map(i=>[norm(i.name),norm(i.strength)]).sort((a,b)=>a[0].localeCompare(b[0])||a[1].localeCompare(b[1])),form:norm(f.form),release:norm(f.release)});}
export function comparePriceQuotes(a:PriceQuote,b:PriceQuote,now=Date.now()){
 const valid=(q:PriceQuote)=>q.reviewed&&q.formulation.ingredients.length>0&&q.formulation.ingredients.every(i=>i.name.trim()&&i.strength.trim())&&q.formulation.form.trim()&&q.formulation.release.trim()&&norm(q.formulation.release)!=='unknown'&&Number.isFinite(q.price)&&q.price>=0&&Number.isFinite(q.packQuantity)&&q.packQuantity>0&&/^https:\/\//.test(q.sourceUrl)&&Number.isFinite(Date.parse(q.checkedAt))&&Date.parse(q.checkedAt)<=now&&now-Date.parse(q.checkedAt)<30*86400000;
 if(!valid(a)||!valid(b))return {available:false as const,reason:'A reviewed, dated, complete quote is required for both products.'};
 if(formulationIdentity(a.formulation)!==formulationIdentity(b.formulation)||norm(a.unit)!==norm(b.unit)||a.priceType!==b.priceType)return {available:false as const,reason:'Ingredients, strengths, form, release, units and price type must match exactly.'};
 const first=a.price/a.packQuantity,second=b.price/b.packQuantity;return {available:true as const,firstUnitPrice:first,secondUnitPrice:second,savingsPercent:first>0?Math.max(0,Math.round((1-second/first)*100)):0,stockConfirmed:a.stock==='confirmed'&&b.stock==='confirmed',pharmacistApprovalRequired:true};
}
