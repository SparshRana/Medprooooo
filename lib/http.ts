/** Bounded JSON requests with no raw provider errors exposed to patients. */
export async function requestJson<T>(url:string,init:RequestInit={},timeoutMs=12000):Promise<T>{
 const timer=AbortSignal.timeout(timeoutMs);const signal=init.signal?AbortSignal.any([init.signal,timer]):timer;
 try{const response=await fetch(url,{...init,signal,cache:'no-store'});let data:unknown;
 try{data=await response.json();}catch{throw Error('This service returned an unreadable response. Please retry or use manual entry.');}
 if(!response.ok){const body=data as {message?:string;error?:string};throw Error(typeof body.message==='string'?body.message:typeof body.error==='string'?body.error:'The service is unavailable. Please retry.');}return data as T;
 }catch(error){if(timer.aborted)throw Error('The request took too long. Please retry or use the offline pack check.');throw error;}
}
