'use client';
import {useEffect,useState} from 'react';
export default function OfflineCache({recordsReady}:{recordsReady:boolean}){
 const [ready,setReady]=useState(false);
 useEffect(()=>{
  if(!recordsReady||!('serviceWorker' in navigator)||!window.isSecureContext)return;
  let alive=true;let channel:MessageChannel|undefined;
  void (async()=>{
   try{const cached=await caches.match('/__carely_demo_ready__');if(alive&&cached)setReady(true);const registration=await navigator.serviceWorker.register('/carely-offline-sw.js');await navigator.serviceWorker.ready;
    const worker=registration.active;if(!worker)return;
    channel=new MessageChannel();channel.port1.onmessage=e=>{if(alive&&e.data?.ready===true)setReady(true);channel?.port1.close();};
    const urls=[...Array.from(document.querySelectorAll<HTMLScriptElement>('script[src]')).map(n=>n.src),...Array.from(document.querySelectorAll<HTMLLinkElement>('link[href]')).map(n=>n.href),...performance.getEntriesByType('resource').map(r=>r.name)];
    worker.postMessage({type:'WARM_DEMO',urls},[channel.port2]);
   }catch{/* Local server demo remains available; no false cache-ready claim. */}
  })();return()=>{alive=false;channel?.port1.close();};
 },[recordsReady]);
 return <p className="offline-cache-status" role="status">{ready?'App cached for offline demo reload on this device.':'First open caches this app for offline use. If caching stalls, refresh the page once.'}</p>;
}
