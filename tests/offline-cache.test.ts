import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
test('offline navigation restores the current shell rather than an older cached release',async()=>{
 const events=new Map<string,FetchEventListener>();const current=new Response('editorial release');const opened:string[]=[];
 // The service worker under test only forwards FetchEvent-shaped payloads to its
 // listener, so a minimal local interface is typed here instead of importing DOM types.
 type FetchEventListener=(event:{request:{method:string;url:string;mode:string};respondWith:(value:Promise<Response>)=>void})=>void;
 const context={self:{location:{origin:'https://carely.test'},addEventListener:(name:string,fn:FetchEventListener)=>events.set(name,fn)},URL,Response,fetch:async()=>{throw Error('offline');},caches:{open:async(name:string)=>{opened.push(name);return {match:async(path:string)=>path==='/'?current:undefined};},match:async()=>{throw Error('Global cache lookup can return a stale release');}}};
 vm.runInNewContext(fs.readFileSync('public/carely-offline-sw.js','utf8'),context);
 let result:Promise<Response>|undefined;events.get('fetch')!({request:{method:'GET',url:'https://carely.test/',mode:'navigate'},respondWith:(value:Promise<Response>)=>{result=value;}});
 assert.ok(result);assert.equal(await (await result).text(),'editorial release');assert.deepEqual(opened,['medpro-followup-v4']);
});
