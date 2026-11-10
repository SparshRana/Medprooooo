import {requestJson} from './http';
export async function accountToken(){
 let current;try{current=JSON.parse(sessionStorage.getItem('carely-account')||'null');}catch{throw Error('Sign in to back up review history.');}
 if(!current?.access_token||!current?.refresh_token)throw Error('Sign in to use account services.');
 if(current.expires_at>Date.now()+30000)return current.access_token as string;
 const base=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;if(!base||!key)throw Error('Account services are not activated.');
 try{const next=await requestJson<{access_token:string;refresh_token:string;expires_in:number;user:{id:string}}>(base+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:current.refresh_token})});if(!next.access_token||!next.user?.id)throw Error();sessionStorage.setItem('carely-account',JSON.stringify({...next,expires_at:Date.now()+next.expires_in*1000}));return next.access_token;}catch{throw Error('Your session expired. Sign in again before synchronizing.');}
}
