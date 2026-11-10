'use client';

import {useEffect,useRef,useState} from 'react';
import {
  AlertTriangle,ArrowRight,ArrowUpRight,Camera,Check,ChevronDown,ChevronRight,FileText,Heart,IndianRupee,Info,
  LockKeyhole,MapPin,Menu,NotebookPen,Pencil,Pill,Plus,RotateCcw,ScanLine,Search,
  SlidersHorizontal,Trash2,Upload,Users,Volume2,X
} from 'lucide-react';
import UpdatePack from '@/components/offline/update-pack';
import CareWorkspace from '@/components/care-workspace';
import CareFields from '@/components/care-fields';
import {requestJson} from '@/lib/http';
import ConflictChecker from '@/components/conflict-checker';
import SastiDawaFinder from '@/components/sasti-dawa-finder';
import ChemistAlertSlip, { type ChemistSlipData } from '@/components/chemist-alert-slip';
import { evaluateExpiry } from '@/lib/medicine-resolver';
import {BrowserMultiFormatReader,type IScannerControls} from '@zxing/browser';
import {BarcodeFormat} from '@zxing/library';
import Services from '@/components/cloud/services';
import PremiumMotion from '@/components/motion/premium-motion';
import EditorialHome from '@/components/editorial-home';
import {LanguageProvider} from '@/components/language';
import {translate} from '@/lib/hi';
import PackPhoto from '@/components/offline/pack-photo';
import SafetyPanel from '@/components/offline/safety-panel';
import DemoToolbar from '@/components/offline/demo-toolbar';
import OfflineCache from '@/components/offline/cache-ready';
import {batchStatus,findMedicineAlternative,formulations,loadOfflineSnapshot,sampleCabinet} from '@/lib/offline-medical';
import type {AlertSnapshot} from '@/lib/quality-alerts';
import {
  type Medicine,add,fields,initial,key,LEGACY_STORAGE_KEY,norm,removeMedicine,resetStorage,restore,
  restoreLegacy,STORAGE_KEY,updateMedicine,validateMedicine
} from '@/lib/carely';
import {parseMedicineBarcode,type ParsedBarcode} from '@/lib/barcode';
import {cameraConstraints,cameraError} from '@/lib/scanner';

type View='home'|'cabinet'|'alerts'|'family'|'follow-up';
type Dialog='scan'|'manual'|'details'|'catalog'|'about'|'reset'|null;
type CatalogRecord={batch?:string;id:string;name:string;brand:string;generic:string;manufacturer:string;form:string;route:string;ingredients:Array<{name:string;strength:string;unit:string}>;licenseStatus:string;updatedAt:string;source:string;sourceUrl:string};
const empty:Medicine={product:'',manufacturer:'',strength:'',form:'tablet',release:'Unknown',batch:'',origin:'manual',owner:'Me',expiry:'',notes:'',treatmentState:'stored'};

export default function Home(){
 const [view,setView]=useState<View>('home');
 const [items,setItems]=useState<Medicine[]>(initial);
 const [loaded,setLoaded]=useState(false);
 const [demoItems,setDemoItems]=useState<Medicine[]|null>(null);
 const [simulation,setSimulation]=useState(false);
 const [unread,setUnread]=useState(false);
 const [offlineSnapshot,setOfflineSnapshot]=useState<AlertSnapshot|null>(null);
 const activeItems=demoItems??items;
 const setActiveItems=demoItems!==null?setDemoItems:setItems;

 const [vaultScope,setVaultScope]=useState('guest');

 function loadDemo(){setDemoItems(sampleCabinet());setSimulation(false);setUnread(false);setQuery('');setOwnerFilter('Dad');setFilter('all');go('cabinet');}
 // The button is enabled only while this exact record exists in the bundled snapshot.
 const officialSample=offlineSnapshot?.records.find(r=>r.batch==='60098'&&r.brand==='Alzomac-0.5 Tablets')||null;
 function quickSample(kind:string){
  if(kind==='simulated'){setDemoItems(sampleCabinet());setSimulation(true);setUnread(true);details(sampleCabinet()[0]);return;}
  if(kind==='paracetamol'){const sample:Medicine={product:'Paracetamol',manufacturer:'Fictional demo manufacturer',strength:'500 mg',form:'tablet',release:'Immediate release',batch:'PA-101',owner:'Dad',demo:true,origin:'manual'};setDemoItems([...sampleCabinet(),sample]);setSimulation(false);setUnread(false);details(sample);return;}
  if(kind==='official'&&officialSample){details({...empty,example:true,product:officialSample.brand||officialSample.product,manufacturer:officialSample.manufacturer,batch:officialSample.batch});return;}
  if(kind==='acnemoist')details({...empty,product:'ACNEMOIST',batch:'2200388'});
 }
 function sampleChoices(){return <details className="sample-shortcuts" open={demoItems!==null}><summary>{t("Try a sample — no camera needed","नमूना देखें — कैमरे की ज़रूरत नहीं")}</summary><div className="sample-choices" aria-label="Quick search examples"><strong>One-click examples</strong><button className="btn outline" onClick={()=>quickSample('paracetamol')}>Try neutral sample: Paracetamol · PA-101</button><button className="btn outline" disabled={!officialSample} onClick={()=>quickSample('official')}>Try indexed CDSCO alert: Alzomac-0.5 · 60098</button><button className="btn outline" onClick={()=>quickSample('acnemoist')}>ACNEMOIST · 2200388 (unverified example)</button><button className="btn outline" onClick={()=>quickSample('simulated')}>Try SIMULATED: DEMO-892</button><p className="source-note">ACNEMOIST 2200388 is not present in this snapshot. It is not presented as a verified alert.</p></div></details>;}
 const [hi,setHi]=useState(false);
 const [mobileMenu,setMobileMenu]=useState(false);
 const [modal,setModal]=useState<Dialog>(null);
 const [notice,setNotice]=useState('');
 const [error,setError]=useState('');
 const [query,setQuery]=useState('');
 const [filter,setFilter]=useState('all');
 const [members,setMembers]=useState<string[]>([]);
 const [refillBatch,setRefillBatch]=useState<string|null>(null);
 const [newMember,setNewMember]=useState<string|null>(null);
 useEffect(()=>{
  try {
   const saved:unknown=JSON.parse(localStorage.getItem('medpro:family-members')||'[]');
   if(Array.isArray(saved))setMembers(saved.filter((name):name is string=>typeof name==='string'&&!!name.trim()&&name.length<=80));
  } catch { /* The form still offers default members. */ }
 },[]);
 const [ownerFilter,setOwnerFilter]=useState<string|null>(null);
 const [checks,setChecks]=useState<Record<string,{state:string;label:string;checkedAt:string}>>({});
 const [barcodeProduct,setBarcodeProduct]=useState<{name:string;manufacturer?:string;provider?:string;pack?:string}|null>(null);
 const [draft,setDraft]=useState<Medicine>({...empty});
 const [editingKey,setEditingKey]=useState<string|null>(null);
 const [pending,setPending]=useState<Medicine|null>(null);
 const [deleteConfirm,setDeleteConfirm]=useState(false);
 const [scanMode,setScanMode]=useState<'camera'|'upload'|'lookup'>('camera');
 const [cameraRunning,setCameraRunning]=useState(false);
 const [scanBusy,setScanBusy]=useState(false);
 const [barcode,setBarcode]=useState<ParsedBarcode|null>(null);
 const [barcodeMessage,setBarcodeMessage]=useState('');
 const [catalogQuery,setCatalogQuery]=useState('');
 const [catalogBusy,setCatalogBusy]=useState(false);
 const [catalogResults,setCatalogResults]=useState<CatalogRecord[]>([]);
 const [selectedRecord,setSelectedRecord]=useState<CatalogRecord|null>(null);
 const [dadiMode,setDadiMode]=useState(false);
 const [sastiOpen,setSastiOpen]=useState(false);
 const [sastiInitialQ,setSastiInitialQ]=useState('');
 const [chemistSlip,setChemistSlip]=useState<ChemistSlipData|null>(null);
 const [speakingMed,setSpeakingMed]=useState<string|null>(null);
 function speakMedicine(m:Medicine){
  if(!('speechSynthesis' in window)){setNotice('Audio is unavailable in this browser. Read the saved details on screen.');return;}
  window.speechSynthesis.cancel();setSpeakingMed(m.product);
  const text=hi
   ? `दवा: ${m.product}। स्ट्रेंथ: ${m.strength||'दर्ज नहीं'}। बैच: ${m.batch||'दर्ज नहीं'}। समाप्ति का महीना: ${m.expiry||'दर्ज नहीं'}।`
   : `Saved medicine: ${m.product}. Strength: ${m.strength||'not entered'}. Batch: ${m.batch||'not entered'}. Expiry month: ${m.expiry||'not entered'}.`;
  const u=new SpeechSynthesisUtterance(text);u.lang=hi?'hi-IN':'en-IN';u.rate=0.88;
  u.onend=()=>setSpeakingMed(null);u.onerror=()=>setSpeakingMed(null);window.speechSynthesis.speak(u);
 }
 const video=useRef<HTMLVideoElement>(null);
 const scannerControls=useRef<IScannerControls|null>(null);
 const reader=useRef<BrowserMultiFormatReader|null>(null);
 const fileInput=useRef<HTMLInputElement>(null);
 const lastFocus=useRef<HTMLElement|null>(null);
 const dialog=useRef<HTMLElement>(null);
 const cancelled=useRef(false);
 const cameraEpoch=useRef(0);
 const imageEpoch=useRef(0);
 const t=(en:string,hn?:string)=>hi?(hn||translate(en)):en;

 useEffect(()=>{loadOfflineSnapshot().then(setOfflineSnapshot).catch(()=>setNotice('Offline records could not load. Please reload from the local server.'));},[]);

 function go(v:View){close();setView(v);setMobileMenu(false);history.replaceState(null,'','#'+v);window.scrollTo({top:0,behavior:'smooth'});}
 function stopCamera(){cameraEpoch.current++;cancelled.current=true;scannerControls.current?.stop();scannerControls.current=null;setCameraRunning(false);}
 function close(){imageEpoch.current++;stopCamera();setModal(null);setError('');setDeleteConfirm(false);setScanBusy(false);if(modal)lastFocus.current?.focus({preventScroll:true});lastFocus.current=null;}
 function open(value:Dialog){setNewMember(null);setRefillBatch(null);lastFocus.current=document.activeElement as HTMLElement;setError('');setDeleteConfirm(false);setModal(value);}
 function manual(m?:Medicine){setDraft(m?{...m,example:false}:{...empty});setEditingKey(m&&!m.example?key(m):null);open('manual');}
 function refill(m:Medicine){
  setDraft({...m,batch:'',expiry:'',notes:'',photo:undefined,photoOriginal:undefined,example:false,previousPackKey:key(m),capturedText:undefined,capturedAt:undefined,captureConfirmed:undefined,quantity:undefined,openedOn:undefined});setEditingKey(null);open('manual');setRefillBatch(m.batch);
 }
 function details(m:Medicine){setPending(m);open('details');}
 function openScanner(){setBarcodeProduct(null);setBarcode(null);setBarcodeMessage('');setCatalogResults([]);setCatalogQuery('');setSelectedRecord(null);setScanMode('camera');open('scan');}

 useEffect(()=>{
  try{if(sessionStorage.getItem('carely:offline-demo')==='active')setDemoItems(sampleCabinet());}catch{}
  try{
   let account='guest';try{account=JSON.parse(sessionStorage.getItem('carely-account')||'null')?.user?.id||'guest';}catch{}setVaultScope(account);const current=localStorage.getItem(account==='guest'?STORAGE_KEY:STORAGE_KEY+':'+account);
   const state=current===null&&account==='guest'?restoreLegacy(localStorage.getItem(LEGACY_STORAGE_KEY)):restore(current);
   setItems(state.items);
   try{const saved=JSON.parse(localStorage.getItem(STORAGE_KEY+':checks:'+account)||'{}') as Record<string,{state:string;label:string;checkedAt:string}>;setChecks(Object.fromEntries(Object.entries(saved).filter(([,v])=>v&&['matching-alert','confirmation-needed','no-match','unavailable'].includes(v.state)&&typeof v.label==='string'&&Number.isFinite(Date.parse(v.checkedAt)))));}catch{}

  }catch{setNotice('Browser storage is unavailable. Changes are temporary.');}
  const v=location.hash.slice(1);
  if(['home','cabinet','alerts','family','follow-up'].includes(v))setView(v as View);
  const hash=()=>{const current=location.hash.slice(1);setView(['cabinet','alerts','family','follow-up'].includes(current)?current as View:'home');};
  window.addEventListener('hashchange',hash);setLoaded(true);
  const accountChanged=(event:Event)=>{const account=(event as CustomEvent<string>).detail||'guest';setLoaded(false);setItems(restore(localStorage.getItem(account==='guest'?STORAGE_KEY:STORAGE_KEY+':'+account)).items);setChecks({});setVaultScope(account);close();setLoaded(true);setNotice('Switched local cabinet. Other account cabinets remain separate.');};window.addEventListener('medpro:account-change',accountChanged);
  return()=>{window.removeEventListener('hashchange',hash);window.removeEventListener('medpro:account-change',accountChanged);};
 },[]);
 useEffect(()=>{if(loaded)try{sessionStorage.setItem('carely:offline-demo',demoItems!==null?'active':'inactive');}catch{}},[demoItems,loaded]);
 useEffect(()=>{if(loaded)try{localStorage.setItem(vaultScope==='guest'?STORAGE_KEY:STORAGE_KEY+':'+vaultScope,JSON.stringify({items}));}catch{setNotice('Could not save to browser storage.');}},[items,loaded,vaultScope]);
 useEffect(()=>{if(loaded)try{localStorage.setItem(STORAGE_KEY+':checks:'+vaultScope,JSON.stringify(checks));}catch{}},[checks,loaded,vaultScope]);
 useEffect(()=>{document.documentElement.lang=hi?'hi':'en';},[hi]);
 useEffect(()=>{if(!notice)return;const id=setTimeout(()=>setNotice(''),6500);return()=>clearTimeout(id);},[notice]);
 useEffect(()=>{if(!modal&&!sastiOpen&&!chemistSlip)return;const previous=document.body.style.overflow;document.body.style.overflow='hidden';dialog.current?.querySelector<HTMLElement>('button')?.focus();return()=>{document.body.style.overflow=previous;};},[modal,sastiOpen,chemistSlip]);
 useEffect(()=>{
  const handleKeyDown=(e:KeyboardEvent)=>{if(e.key==='Escape'){if(sastiOpen){setSastiOpen(false);setSastiInitialQ('');}else if(chemistSlip){setChemistSlip(null);}}};
  window.addEventListener('keydown',handleKeyDown);return()=>window.removeEventListener('keydown',handleKeyDown);
 },[sastiOpen,chemistSlip]);
 useEffect(()=>()=>{scannerControls.current?.stop();},[]);

 function saveManual(){
  if(refillBatch!==null&&!draft.batch.trim()){setError(t('Enter the batch printed on the new strip.','नई स्ट्रिप पर छपा बैच नंबर भरें।'));return;}
  const enteredName=newMember?.trim();
  if(newMember!==null&&!enteredName){setError(t('Enter a name for the new family member.','नए सदस्य का नाम भरें।'));return;}
  const owner=enteredName?(cabinetProfiles.find(name=>norm(name)===norm(enteredName))||enteredName):(draft.owner?.trim()||'Me');
  const m={...draft,owner,...Object.fromEntries(fields.map(f=>[f,draft[f].trim()])),origin:'manual' as const,...(demoItems!==null?{demo:true}:{})};const problem=validateMedicine(m);if(problem){setError(problem);return;}
  if(m.demo&&demoItems===null){setError('Use Demo Mode to edit sample medicines.');return;}
  if(!editingKey&&activeItems.some(pack=>key(pack)===key(m))){setError(t('This pack is already saved for this family member.','यह पैक इस सदस्य के लिए पहले से सहेजा गया है।'));return;}
  if(enteredName&&!cabinetProfiles.includes(owner)&&demoItems===null){
   const next=[...members,owner];
   setMembers(next);
   try {localStorage.setItem('medpro:family-members',JSON.stringify(next));} catch { /* The cabinet still holds the selected name. */ }
  }
  setActiveItems((old:Medicine[]|null)=>editingKey?updateMedicine(old||[],editingKey,m):add(old||[],demoItems!==null?{...m,demo:true}:m));close();setOwnerFilter((m.owner||'Me').trim()||'Me');setQuery('');setNotice(editingKey?'Medicine details updated.':'Medicine added to your cabinet.');setView('cabinet');}
 function reset(){if(demoItems!==null){setDemoItems(sampleCabinet());setSimulation(false);setUnread(false);close();return;}try{if(vaultScope==='guest')resetStorage(localStorage);else localStorage.removeItem(STORAGE_KEY+':'+vaultScope);}catch{}setChecks({});setItems([]);close();setNotice('Local cabinet cleared. Cloud copies are unchanged.');}
 function decoded(raw:string,format:string){setBarcodeProduct(null);stopCamera();setBarcode(parseMedicineBarcode(raw,format));setBarcodeMessage('Code decoded on your device. Search by GTIN if supported, or by the medicine name printed on your pack.');setCatalogResults([]);setSelectedRecord(null);setScanMode('lookup');setScanBusy(false);}
 useEffect(()=>{
  if(!cameraRunning||modal!=='scan'||!video.current)return;
  cancelled.current=false;const epoch=++cameraEpoch.current;
  const scanner=reader.current??(reader.current=new BrowserMultiFormatReader());
  void scanner.decodeFromConstraints(cameraConstraints,video.current,(result,err,controls)=>{
   if(cancelled.current||epoch!==cameraEpoch.current){controls.stop();return;}
   if(result){controls.stop();scannerControls.current=controls;decoded(result.getText(),BarcodeFormat[result.getBarcodeFormat()]||'UNKNOWN');}
  }).then(c=>{if(cancelled.current||epoch!==cameraEpoch.current)c.stop();else scannerControls.current=c;}).catch(e=>{if(!cancelled.current&&epoch===cameraEpoch.current){setError(cameraError(e));setCameraRunning(false);}});
  return()=>{cameraEpoch.current++;cancelled.current=true;scannerControls.current?.stop();scannerControls.current=null;};
 },[cameraRunning,modal]);
 async function decodeImage(file:File){if(scanBusy)return;if(!file.type.startsWith('image/')||file.size>15*1024*1024){setError('Choose an image smaller than 15 MB.');return;}const epoch=++imageEpoch.current;setScanBusy(true);setError('');const image=URL.createObjectURL(file);
  try{const scanner=reader.current??(reader.current=new BrowserMultiFormatReader());const result=await scanner.decodeFromImageUrl(image);if(epoch===imageEpoch.current)decoded(result.getText(),BarcodeFormat[result.getBarcodeFormat()]||'UNKNOWN');}
  catch{if(epoch===imageEpoch.current)setError('No supported code was found. Try a clear, well-lit image of the barcode or DataMatrix.');}
  finally{if(epoch===imageEpoch.current)setScanBusy(false);URL.revokeObjectURL(image);}
 }
 async function searchCatalogue(value=catalogQuery){const q=value.trim().toLowerCase();if(q.length<2){setBarcodeMessage('Enter at least two letters.');return;}setCatalogBusy(true);setSelectedRecord(null);
 try{const snapshot=offlineSnapshot||await loadOfflineSnapshot();const generic=formulations.filter(f=>f.salt.toLowerCase().includes(q)||f.generic.toLowerCase().includes(q)||(f.brands&&f.brands.some(b=>b.toLowerCase().includes(q)))).map(f=>({id:'local-'+f.salt,name:f.salt,brand:f.salt,generic:f.salt,manufacturer:'',form:f.form,route:'oral',ingredients:[{name:f.salt,strength:f.strength,unit:''}],licenseStatus:'Curated formulation only',updatedAt:'2026-10-30',source:'Offline curated formulation; confirm the pack',sourceUrl:f.source}));const official=snapshot.records.filter(r=>(r.product+' '+r.brand+' '+r.batch).toLowerCase().includes(q)).slice(0,20).map(r=>({batch:r.batch,id:r.id,name:r.product,brand:/^(?:n\/?a|not available|unknown)$/i.test(r.brand.trim())?'':r.brand,generic:'Official quality-alert record — verify exact pack',manufacturer:r.manufacturer,form:'other',route:'',ingredients:[],licenseStatus:r.kind,updatedAt:r.retrievedAt,source:'Bundled CDSCO '+r.period,sourceUrl:r.sourceUrl}));setCatalogResults([...generic,...official]);setBarcodeMessage(generic.length+official.length?'Offline candidates. Confirm salt, strength, form, release, manufacturer and batch against the pack.':'No curated or indexed candidate. Use manual entry; absence is not a safety verdict.');}catch{setBarcodeMessage('Bundled records unavailable. Reload from the local server.');}finally{setCatalogBusy(false);}
 }
 async function lookupBarcode(){if(demoItems!==null){setBarcodeMessage('Code decoded locally. This offline demo has no universal GTIN-to-product registry. Search the printed medicine name or enter pack details.');return;}if(!barcode?.gtin)return;setCatalogBusy(true);setBarcodeMessage('Searching GTIN catalogue…');try{const body=await requestJson<{found?:boolean;product?:{name?:string;provider?:string;manufacturer?:string;pack?:string};message?:string}>('/api/medicine/barcode',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({gtin:barcode.gtin,batch:barcode.batch,expiry:barcode.expiry,raw:barcode.raw})});if(body.found&&body.product?.name){setBarcodeProduct({...body.product,name:body.product.name});setBarcodeMessage(`Candidate found from ${body.product.provider||'the barcode provider'}. Check the exact label before saving.`);setCatalogQuery(body.product.name);return;}setBarcodeMessage(body.message||'No barcode product mapping was found. You can still search by the printed name.');}
  catch{setBarcodeMessage('Barcode provider unavailable. Search by the medicine name instead.');}finally{setCatalogBusy(false);}
 }
 function catalogMedicine(record:CatalogRecord):Medicine{const curated=formulations.find(f=>record.id==='local-'+f.salt);return {...empty,product:record.brand||record.name,manufacturer:record.manufacturer||'',strength:record.ingredients.map(i=>`${i.strength} ${i.unit}`.trim()).filter(Boolean).join(', ')||(curated?.strength||''),form:record.form&&record.form!=='other'?record.form:(curated?.form||'tablet'),release:curated?.release||'Unknown',batch:barcode?.batch||record.batch||'',expiry:barcode?.expiry?.slice(0,7)||''};}
 function applyCatalogRecord(record:CatalogRecord){setDraft(catalogMedicine(record));setEditingKey(null);setModal('manual');setError('');}
 const filtered=activeItems.filter(m=>`${m.product} ${m.batch} ${m.owner||''}`.toLowerCase().includes(query.toLowerCase())).filter(m=>filter==='all'||filter==='personal'&&m.origin==='manual').filter(m=>ownerFilter===null||((m.owner||'Me').trim()||'Me')===ownerFilter);
 const cabinetProfiles=Array.from(new Set(['Me','Dad','Dadi','Mom',...members,...activeItems.map(m=>(m.owner||'').trim()).filter(Boolean)]));
 // The chemist slip quotes an official NSQ/spurious decision; only an exact
 // matched record may generate one — never a mere batch overlap.
 const pendingMatch=pending&&offlineSnapshot&&!pending.demo?batchStatus(pending,offlineSnapshot.records,simulation).matches.find(x=>x.match==='exact')?.record||null:null;

 function MedicineTile({m}:{m:Medicine}){const offline=offlineSnapshot?batchStatus(m,offlineSnapshot.records,simulation):null;const checked=offline?{state:offline.state==='simulated'?'matching-alert':offline.state,label:offline.state==='simulated'?'SIMULATED · Matching quality alert found':offline.state==='matching-alert'?'Matching quality alert found':offline.state==='confirmation-needed'?'Details need confirmation':'No matching alert found in the checked records',checkedAt:offlineSnapshot!.generatedAt}:checks[key(m)];const ownerLabel=(m.owner||'Me').trim()||'Me';const exp=evaluateExpiry(m.expiry);return <button className={"medicine-tile"+(dadiMode?' dadi-tile':'')} onClick={()=>details(m)}><div className="tile-top"><span className={'med-status-badge '+(checked?.state||'')}>{checked?.state==='matching-alert'||checked?.state==='confirmation-needed'?<AlertTriangle size={14}/>:<Info size={14}/>} {t(checked?.label||'Label details only')}</span><span style={{fontSize:'0.75rem',fontWeight:700,padding:'3px 8px',borderRadius:'6px',background:exp.bgColor,color:exp.color}}>{hi?exp.label.hi:exp.label.en}</span><ChevronRight size={19}/></div><div className="tile-body"><div className="tile-heading">{dadiMode&&m.photo?<img className="dadi-pack-photo" src={m.photo} alt={t("Saved pack photo","सहेजी गई पैक फ़ोटो")}/>:<span className="med-symbol"><Pill size={23}/></span>}<div><h3>{m.product}</h3><p className="tile-strength">{m.strength} · {m.form}</p></div></div><dl className="tile-details"><div><dt>{t("Manufacturer")}</dt><dd>{m.manufacturer||'Not provided'}</dd></div><div><dt>{t("Batch number")}</dt><dd>{m.batch||'Not added'}</dd></div><div><dt>{t("Expiry status")}</dt><dd style={{color:exp.color,fontWeight:600}}>{hi?exp.label.hi:exp.label.en} ({m.expiry||'N/A'})</dd></div><div><dt>{t("Owner")}</dt><dd>{t(ownerLabel)}</dd></div></dl></div><div className="tile-last-checked"><Info size={14}/>{t(offline?"Snapshot retrieved:":"Last checked:")}{' '}{checked?new Date(checked.checkedAt).toLocaleString(hi?'hi-IN':'en-IN'):t('not checked yet')}</div></button>;}
 return <LanguageProvider hindi={hi}><PremiumMotion paused={!!modal}/><div className={'site redesigned view-'+view+(dadiMode?' dadi-mode-active':'')}>
  <header className="site-header" inert={!!modal||sastiOpen||!!chemistSlip}><button className="logo" aria-label={t("MedPro home")} onClick={()=>go('home')}><span className="logo-icon"><Heart size={20} strokeWidth={2.5}/><Plus size={10}/></span>{t("medpro")}<span className="logo-period">.</span></button>
   <nav className={'desktop-nav '+(mobileMenu?'expanded':'')} aria-label={t("Main navigation")}>{(['home','cabinet','alerts','family','follow-up'] as View[]).map((v,i)=><button key={v} aria-current={view===v?'page':undefined} className={view===v?'active':''} onClick={()=>go(v)}>{(hi?['होम','मेरी दवाएँ','भारत अलर्ट','परिवार','अगले कदम']:['Overview','My cabinet','Quality alerts','Family','Follow-up'])[i]}</button>)}</nav>
   <div className="header-right"><button className={"language"+(dadiMode?" active":"")} style={{background:dadiMode?"#fef08a":"transparent",color:dadiMode?"#854d0e":"inherit",fontWeight:700,borderRadius:"50px",border:dadiMode?"2px solid #ca8a04":"1px solid #c5dfed"}}onClick={()=>{const next=!dadiMode;setDadiMode(next);if(next)go('home');}} aria-pressed={dadiMode} title={t("Simple cabinet and pack read-aloud","सरल दवा कैबिनेट और पैक की आवाज़")}>{hi?"दादी मोड":"Dadi Mode"}</button><button className="btn outline header-cabinet" style={{border:"1.5px solid #059669",color:"#047857",fontWeight:600}} onClick={()=>{setSastiOpen(true);setSastiInitialQ('');}}><IndianRupee size={16}/>{t("Sasti Dawa","सस्ती दवा")}</button><button className="language" aria-label={t("Change language")} onClick={()=>setHi(!hi)}>{hi?'EN':'हिन्दी'}<ChevronDown size={12}/></button><button className="btn dark header-cabinet" onClick={()=>go('cabinet')}>{t('Open cabinet','मेरी दवाएँ')}<ArrowUpRight size={16}/></button><button className="menu-btn" aria-label={t("Toggle navigation")} aria-expanded={mobileMenu} onClick={()=>setMobileMenu(!mobileMenu)}>{mobileMenu?<X/>:<Menu/>}</button></div>
  </header>
  <main inert={!!modal||sastiOpen||!!chemistSlip}>
   <details className="demo-studio" open={demoItems!==null}><summary><span className="demo-studio-dot"/>{t('Demo studio','डेमो स्टूडियो')}<span>{t(demoItems!==null?'Sample cabinet active · open controls':'Try MedPro with a sample cabinet',demoItems!==null?'नमूना कैबिनेट सक्रिय · नियंत्रण खोलें':'नमूना कैबिनेट के साथ MedPro देखें')}</span><ChevronDown size={16}/></summary>   <OfflineCache recordsReady={!!offlineSnapshot}/>
   <DemoToolbar active={demoItems!==null} simulated={simulation} unread={unread} ready={!!offlineSnapshot} onLoad={loadDemo} onSimulate={()=>{setSimulation(true);setUnread(true);}} onReset={loadDemo} onExit={()=>{setDemoItems(null);setSimulation(false);setUnread(false);setOwnerFilter(null);}} onRead={()=>setUnread(false)}/>
</details>
   {view==='home'&&dadiMode&&<section className="section-wrap dadi-start"><h1>{t('My medicines','मेरी दवाएँ')}</h1><p>{t('Check a strip or open a saved pack to hear its details.','स्ट्रिप जाँचें या जानकारी सुनने के लिए सहेजा हुआ पैक खोलें।')}</p><button className="btn dark" onClick={openScanner}>{t('Check a strip','स्ट्रिप जाँचें')}</button><button className="btn outline" onClick={()=>{setOwnerFilter(null);go('cabinet');}}>{t('My cabinet','मेरी दवाओं का कैबिनेट')}</button></section>}
   {view==='home'&&!dadiMode&&<EditorialHome onCabinet={()=>go('cabinet')} onScan={openScanner} onAlerts={()=>go('alerts')} onSample={loadDemo} onSearch={(q:string)=>{setSastiOpen(true);setSastiInitialQ(q);}}/>}
   {view==='cabinet'&&<section className="app-page section-wrap family-cabinet-screen"><div className="page-title"><div><span className="eyebrow">{t("YOUR FAMILY CABINET")}</span><h1>{t("Your family cabinet.","आपके परिवार की दवाएँ।")}</h1><p>{t("A place for every pack. A little clarity for everyone.","हर पैक के लिए जगह। हर अपने के लिए थोड़ी स्पष्टता।")}</p></div><div className="cabinet-page-actions"><button className="btn dark" onClick={openScanner}><ScanLine size={18}/>{t("Scan new medicine")}</button><button className="btn outline" onClick={()=>manual()}><Plus size={18}/>{' '}{t("Add manually")}</button><button className="btn outline" style={{border:"1.5px solid #059669",color:"#047857",fontWeight:600}} onClick={()=>{setSastiOpen(true);setSastiInitialQ('');}}><IndianRupee size={17}/>{t("Sasti Dawa Finder","सस्ती दवा खोजक")}</button></div></div><div className="cabinet-profile-row" aria-label={t("Family members")}>{cabinetProfiles.map(profile=><button key={profile} type="button" aria-pressed={ownerFilter===profile} onClick={()=>setOwnerFilter(ownerFilter===profile?null:profile)} className={'profile-chip'+(ownerFilter===profile?' active':'')}><Users size={16}/><span>{t(profile)}</span><b>{activeItems.filter(m=>((m.owner||'Me').trim()||'Me')===profile).length}</b></button>)}</div><div className="cabinet-topline"><span className="saved-label"><span/>{activeItems.length}{' '}{t("saved medicines")}</span><button className="text-link" onClick={()=>open('reset')}><RotateCcw size={16}/>{' '}{t("Clear local cabinet")}</button></div><div className="cabinet-tools"><div className="search-box"><Search size={18}/><input aria-label={t("Search medicines")} placeholder={t("Find a medicine, batch or family label…")} value={query} onChange={e=>setQuery(e.target.value)}/>{query&&<button onClick={()=>setQuery('')} aria-label={t("Clear search")}><X size={16}/></button>}</div><div className="filter-select"><SlidersHorizontal size={16}/><select aria-label={t("Filter medicines")} value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">{t("All medicines")}</option><option value="personal">{t("My entries")}</option></select></div></div><ConflictChecker medicines={activeItems} hindi={hi}/><div className="cabinet-grid">{filtered.map(m=><MedicineTile key={key(m)} m={m}/>)}{filtered.length>0&&<button className="add-tile" onClick={openScanner}><span><ScanLine size={26}/></span><h3>{t("Scan a new medicine")}</h3><p>{t("Use the camera, upload a code image, or review the pack details.")}</p><b>{t("Start scan")}{' '}<ArrowUpRight size={17}/></b></button>}</div>{!filtered.length&&<div className="empty-state"><ScanLine size={34}/><h3>{t("No saved matches yet.")}</h3><p>{t("Scan a package, search a medicine name, or enter the details manually.")}</p><button className="btn dark" onClick={openScanner}>{t("Scan new medicine")}</button></div>}<div className="context-banner"><LockKeyhole size={21}/><div><b>{t("Saved in this browser profile.")}</b><p>{t("Optional cloud backup requires sign-in. Local data is visible to people with access to this browser profile. A saved entry is not a safety or authenticity check.")}</p></div></div></section>}
   {loaded&&['cabinet','follow-up'].includes(view)&&<><UpdatePack snapshot={offlineSnapshot} onUpdate={setOfflineSnapshot}/><CareWorkspace key={vaultScope+String(demoItems!==null)} items={activeItems} snapshot={offlineSnapshot} onOpen={details} onRestore={setItems} scope={vaultScope} demo={demoItems!==null} simulation={simulation}/></>}
   {loaded&&demoItems===null&&view==='cabinet'&&<details className="optional-services section-wrap"><summary>{t('Optional cloud backup & family sharing','वैकल्पिक क्लाउड बैकअप और परिवार शेयरिंग')}</summary><Services mode="cabinet" items={items} onRestore={setItems}/></details>}
   {loaded&&demoItems===null&&view==='alerts'&&<Services mode="alerts" items={items} onRestore={setItems}/>}
   {loaded&&demoItems===null&&view==='family'&&<Services mode="family" items={items} onRestore={setItems}/>}
   {demoItems!==null&&['alerts','family'].includes(view)&&<section className="section-wrap demo-preview"><h2>Offline demonstration</h2><p>Open a sample medicine in My cabinet for the three safety cards. The Demo Mode toolbar provides local notifications and Rohan’s fictional caregiver preview. Cloud services are not called in this demo.</p><button className="btn dark" onClick={()=>go('cabinet')}>Open demo cabinet</button></section>}
  </main>
  <footer className="site-footer" inert={!!modal||sastiOpen||!!chemistSlip}><div className="footer-main section-wrap"><button className="logo" onClick={()=>go('home')}><span className="logo-icon"><Heart size={20}/><Plus size={10}/></span>{t("medpro")}<span className="logo-period">.</span></button><p>{t("Little details. People you love.")}</p><div><a href="/readiness">Feature availability</a><button onClick={()=>open('about')}>{t("About MedPro")}</button></div></div><div className="footer-bottom section-wrap"><span>{t("© 2026 MedPro · Built with care.")}</span><button onClick={()=>go('alerts')}><span className="coverage-dot"/>{t("CDSCO India: checked report coverage shown")}</button><span>{t("Not medical advice.")}</span></div><p className="section-wrap" style={{textAlign:"center",paddingBlock:"0.75rem"}}>Made by Charvi Naresh and Sparsh Rana</p></footer>
  {notice&&<div className="toast" role="status"><span><Check size={16}/></span>{notice}<button aria-label={t("Dismiss notification")} onClick={()=>setNotice('')}><X size={16}/></button></div>}
  {modal&&<div className="modal-backdrop" onClick={e=>{if(e.target===e.currentTarget)close();}}><section ref={dialog} className={'modal '+(modal==='scan'?'scanner-modal scan-confirm-dialog':modal==='manual'?'review-modal scan-confirm-dialog':modal==='catalog'?'catalog-modal scan-confirm-dialog':'')} role="dialog" aria-modal="true" aria-labelledby="modal-title" onKeyDown={e=>{if(e.key==='Escape')close();if(e.key==='Tab'){const targets=Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],summary,[tabindex="0"]')||[]).filter(el=>el.getClientRects().length);const first=targets[0],last=targets.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}}}><button className="close-modal" aria-label={t("Close dialog")} onClick={close}><X size={22}/></button>
   {modal==='scan'&&<><span className="eyebrow">{t("SCAN AND CONFIRM")}</span><h2 id="modal-title">{t("Add a medicine from its pack")}</h2><p className="modal-description">{t("Choose how to read your medicine details. You can review and correct information before saving it.")}</p><div className="scan-choice-grid" role="group" aria-label={t("Choose how to enter medicine details")}>
      <button className={'scan-choice'+(scanMode==='camera'?' active':'')} aria-pressed={scanMode==='camera'} onClick={()=>{stopCamera();setScanMode('camera');}}><Camera size={25}/><span><b>{t("Camera scan")}</b><small>{t("Use your device camera")}</small></span></button>
      <button className={'scan-choice'+(scanMode==='upload'?' active':'')} aria-pressed={scanMode==='upload'} onClick={()=>{stopCamera();setScanMode('upload');}}><Upload size={25}/><span><b>{t("Upload image")}</b><small>{t("Read a barcode photo")}</small></span></button>
      <button className={'scan-choice'+(scanMode==='lookup'?' active':'')} aria-pressed={scanMode==='lookup'} onClick={()=>{stopCamera();setScanMode('lookup');}}><Search size={25}/><span><b>{t("Search medicine")}</b><small>{t("Find by printed name")}</small></span></button>
      <button className="scan-choice" onClick={()=>manual()}><NotebookPen size={25}/><span><b>{t("Manual entry")}</b><small>{t("Type from your pack")}</small></span></button>
    </div>{sampleChoices()}<p className="scan-demo-note"><Info size={18}/>{' '}{t("Scan real codes locally, or use the clearly labelled quick examples below.")}</p>
    {scanMode==='camera'&&<div className="camera-panel"><p>{t("A retail barcode often identifies only a product code. Read the printed batch and expiry separately. Camera needs permission and HTTPS (or localhost).")}</p>{cameraRunning?<video ref={video} muted playsInline autoPlay style={{width:'100%',minHeight:185,borderRadius:12,background:'#182e2b'}}/>:<div className="camera-placeholder"><Camera size={41}/><p>{t("Point your camera at a printed code.")}</p></div>}<button className="btn dark full" onClick={()=>{if(cameraRunning)stopCamera();else{setError('');setCameraRunning(true);}}}>{t(cameraRunning?'Stop camera':'Start camera')}</button></div>}
    {scanMode==='upload'&&<div className="upload-panel"><p>{t("Choose a photograph showing a printed barcode, QR or DataMatrix. Images are decoded locally.")}</p><input ref={fileInput} type="file" accept="image/*" onChange={e=>{const f=e.currentTarget.files?.[0];if(f)void decodeImage(f);e.currentTarget.value='';}}/><button className="btn dark full" disabled={scanBusy} onClick={()=>fileInput.current?.click()}><Upload size={18}/>{t(scanBusy?'Reading image…':'Choose image')}</button></div>}
    {scanMode==='lookup'&&<div className="barcode-lookup">{barcodeProduct&&<div className="medicine-reference"><span>{t("Product candidate")}<strong>{barcodeProduct.name}</strong></span><span>{t("Manufacturer")}<strong>{barcodeProduct.manufacturer||'Not provided'}</strong></span><span>{t("Pack")}<strong>{barcodeProduct.pack||'Not provided'}</strong></span><button className="btn outline" onClick={()=>{setDraft({...empty,product:barcodeProduct.name,manufacturer:barcodeProduct.manufacturer||'',batch:barcode?.batch||'',expiry:barcode?.expiry?.slice(0,7)||''});setEditingKey(null);setModal('manual');}}>{t("Review label details")}</button></div>}{barcode&&<SafetyPanel medicine={{...empty,batch:barcode.batch||''}} barcode={barcode} snapshot={offlineSnapshot}/>}{barcode&&<div className="barcode-read"><span className="origin">{t("DECODED ON YOUR DEVICE")}</span><b>{barcode.gtin||'No supported GTIN in this symbol'}</b><small>{barcode.format}{barcode.batch?` · Batch ${barcode.batch}`:''}{barcode.manufactured?` · Manufactured ${barcode.manufactured}`:''}{barcode.expiry?` · Expiry ${barcode.expiry}`:''}</small></div>}{barcode?.gtin&&<button className="btn dark barcode-search-button" disabled={catalogBusy} onClick={()=>void lookupBarcode()}>{t(catalogBusy?'Checking…':'Look up barcode product')}</button>}
    <div className="inline-search"><div><b>{t("Search offline medicine records")}</b><small>{t("Search supported curated formulations and bundled CDSCO alerts locally. No search terms leave your device.")}</small></div><form onSubmit={e=>{e.preventDefault();void searchCatalogue();}}><input aria-label={t("Medicine name")} value={catalogQuery} onChange={e=>setCatalogQuery(e.target.value)} placeholder={t("Medicine or generic name")} minLength={2}/><button className="btn coral" disabled={catalogBusy}>{t(catalogBusy?'Searching…':'Search')}</button></form>{barcodeMessage&&<p role="status" className="source-note">{t(barcodeMessage)}</p>}{catalogResults.length>0&&<div className="catalog-results">{catalogResults.map((record,i)=><button key={`${record.id}-${i}`} onClick={()=>{setSelectedRecord(record);setModal('catalog');}}><b>{record.brand||record.name}</b><span>{record.generic} · {record.manufacturer||'Manufacturer unavailable'}</span><ArrowRight size={17}/></button>)}</div>}</div></div>}

   </>}
   {modal==='catalog'&&selectedRecord&&<><span className="eyebrow">{t("OFFLINE MEDICINE CANDIDATE · SOURCE SHOWN")}</span><h2 id="modal-title">{selectedRecord.brand||selectedRecord.name}</h2><p className="modal-description">{selectedRecord.generic||'Generic details not provided.'}</p><div className="evidence-table"><div><span>{t("Manufacturer")}</span><b>{selectedRecord.manufacturer||'Not provided'}</b></div><div><span>{t("Form")}</span><b>{selectedRecord.form||'Not provided'}</b></div><div><span>{t("Route")}</span><b>{selectedRecord.route||'Not provided'}</b></div><div><span>{t("Source")}</span><b>{selectedRecord.source}</b></div></div><p className="source-note">{t("This record is a catalogue candidate, not confirmation of the product or its batch.")}{' '}<a href={selectedRecord.sourceUrl} target="_blank" rel="noreferrer">{t("View provider")}{' '}<ArrowUpRight size={13}/></a></p><SafetyPanel medicine={catalogMedicine(selectedRecord)} snapshot={offlineSnapshot}/><button className="btn coral full" onClick={()=>applyCatalogRecord(selectedRecord)}>{t("Review and add to cabinet")}<ArrowRight size={18}/></button></>}
   {modal==='manual'&&<><span className="eyebrow">{t(editingKey?'UPDATE PACK DETAILS':'REVIEW AND CONFIRM')}</span><h2 id="modal-title">{t(editingKey?'Edit medicine details':'Confirm medicine details')}</h2><p className="modal-description">{t("Copy or check every field against the real packaging. Catalogue candidates are not verified pack details.")}</p><form className="medicine-form" onSubmit={e=>{e.preventDefault();saveManual();}}><PackPhoto key={editingKey||'new-pack'} photo={draft.photo} onChange={photo=>setDraft(current=>({...current,photo,photoOriginal:photo?(current.photoOriginal||photo):undefined}))} onExtract={fields=>setDraft(current=>({...current,...fields}))}/><label className="field">{t("Medicine name")}<input required maxLength={150} value={draft.product} onChange={e=>setDraft({...draft,product:e.target.value})}/></label><div className="field-grid"><label className="field">{t("Strength")}<input maxLength={150} placeholder={t("As printed on the pack")} value={draft.strength} onChange={e=>setDraft({...draft,strength:e.target.value})}/></label><label className="field">{t("Dosage form")}<select value={draft.form} onChange={e=>setDraft({...draft,form:e.target.value})}>{['tablet','capsule','oral solution','cream','injection','drops','other'].map(f=><option key={f} value={f}>{t(f)}</option>)}</select></label></div><label className="field">{t("Manufacturer")}<input maxLength={500} value={draft.manufacturer} onChange={e=>setDraft({...draft,manufacturer:e.target.value})}/></label><div className="field-grid"><label className="field review-batch-field"><span className="field-label-row"><span>{t("Batch number")}</span><span className="review-batch-tag"><AlertTriangle size={16}/>{' '}{t("Review batch")}</span></span><input maxLength={150} value={draft.batch} onChange={e=>setDraft({...draft,batch:e.target.value})}/></label><label className="field">{t("Release type")}<select value={draft.release} onChange={e=>setDraft({...draft,release:e.target.value})}>{['Immediate release','Extended release','Delayed release','Not applicable','Unknown'].map(f=><option key={f} value={f}>{t(f)}</option>)}</select></label></div><div className="field-grid"><div><label className="field">{t('Family member','परिवार का सदस्य')}<select value={newMember===null?(draft.owner?.trim()||'Me'):''} onChange={event=>{
 const name=event.target.value;
 setNewMember(name?null:'');
 if(name)setDraft({...draft,owner:name});
}}>{Array.from(new Set([...cabinetProfiles,draft.owner?.trim()||'Me'])).map(name=><option key={name} value={name}>{t(name)}</option>)}<option value="">{t('Add a new member…','नया सदस्य जोड़ें…')}</option></select></label>{newMember!==null&&<label className="field">{t('New member name','नए सदस्य का नाम')}<input required maxLength={80} value={newMember} onChange={event=>setNewMember(event.target.value)} placeholder={t('e.g. Brother or Cousin','जैसे भाई या कज़िन')}/></label>}</div><label className="field">{t("Expiry month (optional)")}<input type="month" value={draft.expiry||''} onChange={e=>setDraft({...draft,expiry:e.target.value})}/></label></div><label className="field">{t("Private note (optional)")}<textarea maxLength={500} rows={2} value={draft.notes||''} onChange={e=>setDraft({...draft,notes:e.target.value})}/></label><CareFields value={draft} onChange={setDraft}/><button className="btn coral full" type="submit">{t(editingKey?'Save changes':'Confirm and save')}<Check size={18}/></button></form><SafetyPanel medicine={draft} snapshot={offlineSnapshot} simulation={simulation}/></>}
   {modal==='details'&&pending&&<><span className="origin">{t(pending.demo?"FICTIONAL DEMO ENTRY":pending.example?"OFFICIAL-RECORD EXAMPLE · NOT YOUR SAVED MEDICINE":"YOUR ENTRY")}</span><h2 id="modal-title">{pending.product}</h2><p className="modal-description">{pending.strength} · {pending.form}</p>{dadiMode&&pending.photo&&<img className="dadi-pack-photo" src={pending.photo} alt={t('Saved pack photo','सहेजी गई पैक फ़ोटो')}/>}<div className="safety-actions">{!pending.demo&&!pending.example&&<button className="btn outline" onClick={()=>refill(pending)}>{t('Add new strip','नई स्ट्रिप जोड़ें')}</button>}</div><SafetyPanel medicine={pending} simulation={simulation} snapshot={offlineSnapshot}/>{pending.notes&&<div className="medicine-note"><NotebookPen size={18}/><p>{pending.notes}</p></div>}<div style={{display:'flex',gap:'0.5rem',flexWrap:'wrap',margin:'0.75rem 0'}}><button type="button" className="btn outline" style={{fontSize:'0.9rem'}} onClick={()=>speakMedicine(pending)}><Volume2 size={16}/>{speakingMed===pending.product?(hi?'बोल रहे हैं...':'Speaking...'):(hi?'दादी आवाज़ में सुनें':'Read saved pack details')}</button><button type="button" className="btn outline" style={{fontSize:'0.9rem',color:'#0f766e',borderColor:'#0f766e'}} onClick={()=>window.open('https://www.google.com/maps/search/Jan+Aushadhi+Kendra+near+me','_blank')}><MapPin size={16}/>{hi?'जन औषधि केंद्र खोजें':'Find Jan Aushadhi Kendra'}</button>{pendingMatch&&<button type="button" className="btn outline danger" style={{fontSize:'0.9rem'}} onClick={()=>setChemistSlip({product:pending.product,batch:pending.batch,manufacturer:pendingMatch.manufacturer||pending.manufacturer,expiry:pending.expiry,issue:pendingMatch.issue||undefined,laboratory:pendingMatch.laboratory||undefined,period:pendingMatch.period,sourceUrl:pendingMatch.sourceUrl})}><FileText size={16}/>{hi?'केमिस्ट शिकायत पर्ची':'Chemist Alert Slip'}</button>}</div><div className="detail-actions"><button className="btn outline" onClick={()=>manual(pending)}><Pencil size={16}/>{t(pending.example?'Review and save a copy':'Edit')}</button><button className="btn outline danger" disabled={!!pending.example} onClick={()=>setDeleteConfirm(true)}><Trash2 size={16}/>{t("Remove")}</button></div>{deleteConfirm&&<div className="delete-confirm"><p>{t("Remove this entry from the local cabinet?")}</p><button className="btn danger-solid" onClick={()=>{setActiveItems((old:Medicine[]|null)=>removeMedicine(old||[],key(pending)));close();setNotice('Medicine removed.');}}>{t("Yes, remove")}</button><button className="text-link" onClick={()=>setDeleteConfirm(false)}>{t("Keep it")}</button></div>}<button className="text-link centered" onClick={()=>go('alerts')}>{t("Check official Indian alerts")}<ArrowUpRight size={17}/></button></>}
   {modal==='about'&&<><span className="eyebrow">{t("TRANSPARENCY, ALWAYS")}</span><h2 id="modal-title">{t("An honest start.")}<br/><em>{t("A clear picture.")}</em></h2><p className="modal-description">{t("MedPro is a prototype for storing packaging details and consent-based family awareness.")}</p><div className="about-sections"><div><Check size={20}/><div><h3>{t("Works without keys")}</h3><p>{t("Camera or photo barcode decoding, manual cabinet entries, locally stored data, and Indian medicine-name search when its public provider is available.")}</p></div></div><div><LockKeyhole size={20}/><div><h3>{t("Requires owner setup")}</h3><p>{t("Cloud accounts and family inbox require Supabase. GTIN identification requires provider coverage and an optional key.")}</p></div></div><div><AlertTriangle size={20}/><div><h3>{t("Indian batch-alert limitation")}</h3><p>{t("MedPro links to live official CDSCO pages. Quality history searches the listed official report tables and shows coverage gaps. It cannot authenticate medicines, provide a complete supply-chain history, recommend treatment, or issue safety verdicts.")}</p></div></div></div></>}
   {modal==='reset'&&<><span className="eyebrow">{t("YOUR DEVICE STORAGE")}</span><h2 id="modal-title">{t("Clear your local cabinet?")}</h2><p className="modal-description">{t("This removes local entries from this browser. It does not delete any saved Supabase cloud cabinet or family messages.")}</p><button className="btn coral full" onClick={reset}>{t("Clear local entries")}<RotateCcw size={17}/></button><button className="text-link centered" onClick={close}>{t("Keep them")}</button></>}
   {error&&<div className="form-error" role="alert"><AlertTriangle size={19}/><p>{t(error)}</p></div>}
  </section></div>}
   {sastiOpen && (
     <div
       className="sasti-dawa-overlay"
       style={{
         position: 'fixed',
         inset: 0,
         backgroundColor: 'rgba(15, 23, 42, 0.7)',
         backdropFilter: 'blur(5px)',
         zIndex: 10000,
         display: 'flex',
         alignItems: 'center',
         justifyContent: 'center',
         padding: '1.25rem 1rem',
         overflowY: 'auto',
       }}
       onClick={(e) => {
         if (e.target === e.currentTarget) {
           setSastiOpen(false);
           setSastiInitialQ('');
         }
       }}
     >
       <div style={{ width: '100%', maxWidth: '840px', maxHeight: '92vh', overflowY: 'auto', borderRadius: '20px' }}>
         <SastiDawaFinder
           key={sastiInitialQ || 'empty'}
           onClose={() => {
             setSastiOpen(false);
             setSastiInitialQ('');
           }}
           hindi={hi}
           initialQuery={sastiInitialQ}
         />
       </div>
     </div>
   )}
   {chemistSlip && (
     <ChemistAlertSlip
       data={chemistSlip}
       onClose={() => setChemistSlip(null)}
       hindi={hi}
     />
   )}
 </div></LanguageProvider>;
}
