'use client';
import {useState} from 'react';
import {checkDrugInteractions,INTERACTION_RULES} from '@/lib/medicine-resolver';
import {activeTreatment,confirmedIngredients,duplicateIngredients} from '@/lib/care';
import type {Medicine} from '@/lib/carely';
export default function ConflictChecker({medicines,hindi=false}:{medicines:Medicine[];hindi?:boolean}){
 const owners=[...new Set(medicines.map(m=>m.owner?.trim()||'Me'))];const [selected,setSelected]=useState('');const owner=owners.includes(selected)?selected:owners[0];
 const packs=medicines.filter(m=>(m.owner?.trim()||'Me')===owner);const eligible=packs.filter(m=>activeTreatment(m)&&confirmedIngredients(m).length>0);
 const interactions=checkDrugInteractions(eligible.map(m=>({...m,product:confirmedIngredients(m).map(i=>i.name).join(' + ')})));
 const duplicates=duplicateIngredients(eligible);if(!medicines.length)return null;
 return <section className="care-panel interaction-review" aria-label="Limited ingredient review"><h3>{hindi?'सामग्री की सीमित समीक्षा':'Limited ingredient review'}</h3><label className="field">Person being reviewed<select value={owner} onChange={e=>setSelected(e.target.value)}>{owners.map(o=><option key={o}>{o}</option>)}</select></label>
 <p>{eligible.length} of {packs.length} packs have user-confirmed ingredients and current/occasional treatment status. Other packs are not checked. {INTERACTION_RULES.length} supported interaction rules; this is not a comprehensive clinical assessment.</p>
 {!interactions.length&&<p className="care-warning">{hindi?'समर्थित नियमों में कोई मिलान नहीं मिला। यह सुरक्षा का प्रमाण नहीं है।':'No match in the supported rules. This does not establish that the medicines can safely be taken together.'}</p>}
 {interactions.map((i,n)=><article className="care-warning" key={n}><strong>{i.drugA} + {i.drugB}</strong><h4>{hindi?i.title.hi:i.title.en}</h4><p>{hindi?i.description.hi:i.description.en}</p><p>Discuss this potential issue with your pharmacist or prescriber. Do not change treatment yourself.</p><a href={i.sourceUrl} target="_blank" rel="noreferrer">Source for this supported rule</a></article>)}
 {duplicates.map(d=><p className="care-warning" key={d.ingredient}>Duplicate confirmed ingredient: {d.ingredient} in {d.packs.map(p=>p.product).join(', ')}. Confirm whether these are spare packs or medicines taken together.</p>)}
 <details><summary>Coverage and source review</summary><p>Ingredients must be entered and confirmed on the pack form. Rules do not account for dose, timing, kidney function, pregnancy, allergies or every interaction. Rule descriptions require clinical review before use in care.</p><ul>{INTERACTION_RULES.map((r,n)=><li key={n}>{r.drugAKeywords.join(' / ')} + {r.drugBKeywords.join(' / ')}</li>)}</ul><a href="https://www.nhs.uk/medicines/" target="_blank" rel="noreferrer">NHS medicine information — check the exact medicine’s interaction guidance</a></details></section>;
}
