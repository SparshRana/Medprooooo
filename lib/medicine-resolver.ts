import {findMedicineAlternative} from './offline-medical';
export type ResolvedMedicine={salt:string;strength:string;form:string;release:string;sourceUrl:string;verification:'name-candidate-only';comparison:null};
export async function resolveMedicine(query:string):Promise<ResolvedMedicine|null>{if(query.trim().length<3)return null;const f=findMedicineAlternative(query);return f?{salt:f.salt,strength:f.strength,form:f.form,release:f.release,sourceUrl:f.source,verification:'name-candidate-only',comparison:null}:null;}
export interface DrugInteraction {severity:'severe'|'moderate'|'caution';drugA:string;drugB:string;title:{en:string;hi:string};description:{en:string;hi:string};recommendation:{en:string;hi:string};sourceUrl:string;}
export interface ExpiryStatus {status:'safe'|'expiring_soon'|'expired'|'unknown';label:{en:string;hi:string};color:string;bgColor:string;daysRemaining?:number;}
const advice={en:'Ask your pharmacist or prescriber to review this potential interaction. Do not change treatment yourself.',hi:'इस संभावित समस्या पर डॉक्टर या फार्मासिस्ट से सलाह लें। अपनी मर्ज़ी से इलाज न बदलें।'};
export const INTERACTION_RULES=[
 {drugAKeywords:['telmisartan'],drugBKeywords:['potassium'],severity:'caution' as const,title:{en:'Telmisartan and potassium: professional review needed',hi:'टेल्मीसार्टन और पोटैशियम: विशेषज्ञ से समीक्षा कराएँ'},description:{en:'MedlinePlus lists potassium supplements among products that may interact with telmisartan. Tell your pharmacist about the exact product.',hi:'टेल्मीसार्टन के साथ पोटैशियम सप्लीमेंट की जानकारी फार्मासिस्ट को दें।'},recommendation:advice,sourceUrl:'https://medlineplus.gov/druginfo/meds/a601249.html'},
 {drugAKeywords:['sildenafil'],drugBKeywords:['nitroglycerin','glyceryl trinitrate','isosorbide mononitrate','isosorbide dinitrate'],severity:'severe' as const,title:{en:'Sildenafil and nitrates: professional review needed',hi:'सिल्डेनाफिल और नाइट्रेट: विशेषज्ञ से समीक्षा कराएँ'},description:{en:'NHS guidance warns about taking sildenafil with nitrate medicines for chest pain. Review the exact medicines with a pharmacist or doctor.',hi:'सिल्डेनाफिल और सीने के दर्द की नाइट्रेट दवाओं के बारे में डॉक्टर या फार्मासिस्ट से सलाह लें।'},recommendation:advice,sourceUrl:'https://www.nhs.uk/medicines/sildenafil-viagra/'}
];
export function checkDrugInteractions(medicines:Array<{product:string;batch?:string;owner?:string;treatmentState?:string}>):DrugInteraction[]{
 const detected:DrugInteraction[]=[];const matches=(value:string,term:string)=>(' '+value.toLowerCase().replace(/[^a-z0-9]+/g,' ')+' ').includes(' '+term+' ');
 for(let i=0;i<medicines.length;i++)for(let j=i+1;j<medicines.length;j++){
  const a=medicines[i],b=medicines[j];if((a.owner||'Me').trim().toLowerCase()!==(b.owner||'Me').trim().toLowerCase()||[a,b].some(m=>m.treatmentState&&['stored','stopped'].includes(m.treatmentState)))continue;
  for(const rule of INTERACTION_RULES)if((rule.drugAKeywords.some(k=>matches(a.product,k))&&rule.drugBKeywords.some(k=>matches(b.product,k)))||(rule.drugAKeywords.some(k=>matches(b.product,k))&&rule.drugBKeywords.some(k=>matches(a.product,k))))detected.push({...rule,drugA:a.product,drugB:b.product});
 }return detected;
}
export function evaluateExpiry(expiryStr?: string): ExpiryStatus {
  if (!expiryStr || !expiryStr.trim()) {
    return {
      status: 'unknown',
      label: { en: 'No Expiry Added', hi: 'तारीख दर्ज नहीं' },
      color: '#64748b',
      bgColor: '#f1f5f9',
    };
  }

  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(expiryStr.trim()))return {status:'unknown',label:{en:'Invalid date',hi:'अमान्य तारीख'},color:'#64748b',bgColor:'#f1f5f9'};
  const parts = expiryStr.trim().split('-');
  const year = parseInt(parts[0], 10);
  const month = parts.length > 1 ? parseInt(parts[1], 10) : 12;

  if (isNaN(year) || year < 1900 || isNaN(month) || month < 1 || month > 12) {
    return {
      status: 'unknown',
      label: { en: 'Invalid Date', hi: 'अमान्य तारीख' },
      color: '#64748b',
      bgColor: '#f1f5f9',
    };
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-indexed

  // Expiry date is end of the indicated month
  const expiryDate = new Date(Date.UTC(year, month, 0, 18, 29, 59, 999)); // last day of month
  const diffMs = expiryDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0 || (year < currentYear) || (year === currentYear && month < currentMonth)) {
    return {
      status: 'expired',
      label: { en: 'EXPIRED — DO NOT TAKE!', hi: 'एक्सपायर — उपयोग न करें!' },
      color: '#b91c1c',
      bgColor: '#fef2f2',
      daysRemaining: 0,
    };
  }

  if (diffDays <= 60) {
    return {
      status: 'expiring_soon',
      label: { en: `EXPIRING SOON (~${diffDays}d)`, hi: `जल्द समाप्त (~${diffDays} दिन)` },
      color: '#b45309',
      bgColor: '#fffbeb',
      daysRemaining: diffDays,
    };
  }

  return {
    status: 'safe',
    label: { en: 'Within printed expiry date', hi: 'छपी समाप्ति तिथि के भीतर' },
    color: '#047857',
    bgColor: '#ecfdf5',
    daysRemaining: diffDays,
  };
}
