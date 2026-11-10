'use client';
import {useState} from 'react';
import {installUpdate} from '@/lib/signed-updates';
import type {AlertSnapshot} from '@/lib/quality-alerts';
export default function UpdatePack({snapshot,onUpdate}:{snapshot:AlertSnapshot|null;onUpdate:(s:AlertSnapshot)=>void}){
 const [message,setMessage]=useState('');const [busy,setBusy]=useState(false);
 return <details className="care-panel care-update"><summary>Import a trusted offline alert update</summary><p>A pharmacy or community worker can distribute a signed public-data update. MedPro accepts only packages signed by this installation’s trusted key and rejects older versions. Updates contain public findings, not patient records.</p><label className="field">Signed update package<input type="file" accept="application/json,.json" disabled={busy||!process.env.NEXT_PUBLIC_ALERT_SIGNING_KEY} onChange={async e=>{const file=e.currentTarget.files?.[0];e.currentTarget.value='';if(!file)return;setBusy(true);try{if(file.size>20000000)throw Error('Update package is too large.');const updated=await installUpdate(await file.text(),snapshot?Date.parse(snapshot.generatedAt):0);onUpdate(updated);setMessage('Verified update installed. The new snapshot is available on this device.');}catch(error){setMessage((error as Error).message);}finally{setBusy(false);}}}/></label>{!process.env.NEXT_PUBLIC_ALERT_SIGNING_KEY&&<p>Signed update import is not activated. The bundled dated records remain available.</p>}<p role="status">{busy?'Verifying signature and version…':message}</p></details>;
}
