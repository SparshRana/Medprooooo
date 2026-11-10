import {requestJson} from './http';
export async function authenticatedUser(request:Request){
 const token=request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 if(!url||!key)throw new Error('Account services are not available on this installation.');
 if(!token)throw new Error('Sign in to use account services.');
 const user=await requestJson<{id:string;email?:string}>(url+'/auth/v1/user',{headers:{apikey:key,Authorization:'Bearer '+token}},10000);
 if(!user.id)throw Error('Your session expired. Please sign in again.');
 return {user,token,url,key};
}
export async function accountDatabase<T>(auth:Awaited<ReturnType<typeof authenticatedUser>>,path:string,method='GET',body?:unknown){return requestJson<T>(auth.url+'/rest/v1/'+path,{method,headers:{apikey:auth.key,Authorization:'Bearer '+auth.token,'Content-Type':'application/json',Prefer:'return=representation'},body:body===undefined?undefined:JSON.stringify(body)},12000);}
