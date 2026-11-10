import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {performance} from 'node:perf_hooks';
import {evaluateAlert,type AlertSnapshot} from '../lib/quality-alerts';
import {parsePrintedPack} from '../lib/pack-capture';
const snapshot=JSON.parse(await readFile('data/cdsco-alerts.json','utf8')) as AlertSnapshot;
// Deterministic challenge set, distinct from the UI demonstration; not a clinical or OCR-accuracy study.
const records=snapshot.records.filter(r=>r.manufacturer&&r.batch&&r.product).filter((_,i)=>i%19===7).slice(0,100);
let exact=0,falseExact=0,missed=0,candidates=0;const start=performance.now();
for(const r of records){const positive=evaluateAlert(r,{product:r.product,manufacturer:r.manufacturer,batch:r.batch});if(positive.match==='exact')exact++;else missed++;
 const variants=[{product:r.product,manufacturer:'INTENTIONALLY DIFFERENT TEST COMPANY',batch:r.batch},{product:r.product,manufacturer:r.manufacturer,batch:r.batch+'-X'},{product:r.product,manufacturer:'',batch:r.batch},{product:'INTENTIONALLY DIFFERENT TEST PRODUCT',manufacturer:r.manufacturer,batch:r.batch}];
 for(const q of variants){const result=evaluateAlert(r,q);if(result.match==='exact')falseExact++;if(result.relevant&&result.match==='candidate')candidates++;}}
const extractionInputs=[['Example Tablets\nBatch No: B1O8-01\nEXP: 03/2028','B1O8-01'],['Batch: 001/A-9\nEXP: unreadable','001/A-9'],['LOT NO: X-002','X-002']];
const transcriptMatches=extractionInputs.filter(([text,batch])=>parsePrintedPack(text).find(f=>f.name==='batch')?.value===batch).length;
const result={evaluatedAt:new Date().toISOString(),sourceSnapshot:snapshot.generatedAt,sourceRecords:snapshot.records.length,method:'100 deterministic historical-record identities and four negative/incomplete variants per identity. Three synthetic printed-text transcripts. No model training. Same-record identity challenge, not independent clinical validation.',positiveCases:records.length,negativeAndIncompleteCases:records.length*4,exactMatches:exact,missedExpectedMatches:missed,falseExactMatches:falseExact,candidateResults:candidates,elapsedMs:Number((performance.now()-start).toFixed(2)),printedTranscriptFixtures:3,printedTranscriptMatches:transcriptMatches,limits:['No real-photo OCR accuracy claim; transcript parsing is not OCR evaluation.','No manual-user baseline or pilot has been measured.','Results do not establish medicine safety, authenticity, population accuracy or harm reduction.','Records missing a confirmable manufacturer can remain candidates by design.']};
await mkdir('docs',{recursive:true});await writeFile('docs/evaluation.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
