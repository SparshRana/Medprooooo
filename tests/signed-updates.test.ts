import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyUpdate,updateMessage} from '../lib/signed-updates';
test('signed public data packages reject tampering, rollback and untrusted sources',async()=>{
 const keys=await crypto.subtle.generateKey('Ed25519',true,['sign','verify']);const pub=Buffer.from(await crypto.subtle.exportKey('raw',keys.publicKey)).toString('base64');
 const at=new Date().toISOString();const record={id:'NSQ:TEST:1',kind:'NSQ',product:'Example',brand:'Example',batch:'B001',manufacturer:'Example Ltd',manufacturedBy:'',issue:'Test fixture only',remarks:'',firmReply:'',period:'NOV-2026',retrievedAt:at,sourceUrl:'https://cdscoonline.gov.in/CDSCO/viewPublicNSQDrug'};
 const p={version:1 as const,sequence:2,publishedAt:at,payload:JSON.stringify({schemaVersion:1,generatedAt:at,coverage:[],failures:[],records:[record]})};
 const signature=Buffer.from(await crypto.subtle.sign('Ed25519',keys.privateKey,new TextEncoder().encode(updateMessage(p)))).toString('base64');const raw=JSON.stringify({...p,signature});assert.equal((await verifyUpdate(raw,pub,1)).sequence,2);await assert.rejects(verifyUpdate(raw,pub,2),/old/);await assert.rejects(verifyUpdate(JSON.stringify({...p,payload:p.payload.replace('B001','B002'),signature}),pub,1),/signature/);await assert.rejects(verifyUpdate(raw,'',0),/trusted/);
});
