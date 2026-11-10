import {createPrivateKey,sign} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {updateMessage} from '../lib/signed-updates';
const privatePem=process.env.MEDPRO_ALERT_SIGNING_PRIVATE_KEY;if(!privatePem)throw Error('Configure the private Ed25519 signing key on the trusted publishing host.');
const payload=await readFile(process.env.MEDPRO_ALERT_SNAPSHOT||'data/cdsco-alerts.json','utf8');const snapshot=JSON.parse(payload);
const pack={version:1 as const,sequence:Date.parse(snapshot.generatedAt),publishedAt:new Date().toISOString(),payload};
if(!Number.isFinite(pack.sequence))throw Error('Invalid snapshot date.');
const signature=sign(null,Buffer.from(updateMessage(pack)),createPrivateKey(privatePem)).toString('base64');
await writeFile(process.argv[2]||'signed-alert-update.json',JSON.stringify({...pack,signature}));console.log('Signed public alert package written. No private key is included.');
