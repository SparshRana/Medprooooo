import {readFile,writeFile,rename} from 'node:fs/promises';
import {officialJson,tablePath,parseTable,CDSCO_BASE,type AlertSnapshot} from '../lib/quality-alerts';
import {mergeAlertSnapshots} from '../lib/alert-snapshot';
const path=process.env.MEDPRO_ALERT_SNAPSHOT||'data/cdsco-alerts.json';
const previous=JSON.parse(await readFile(path,'utf8')) as AlertSnapshot;const at=new Date().toISOString();
const latest:AlertSnapshot={schemaVersion:1,generatedAt:at,records:[],coverage:[],failures:[]};
for(const kind of ['NSQ','SPURIOUS'] as const){const route=tablePath(kind);const rows=parseTable(await officialJson(route),kind,CDSCO_BASE+route,at);latest.records.push(...rows);for(const period of new Set(rows.map(r=>r.period)))latest.coverage.push({kind,period,count:rows.filter(r=>r.period===period).length,retrievedAt:at,sourceUrl:CDSCO_BASE+route});}
if(!latest.coverage.length)throw Error('Current source tables were empty; existing data was retained.');
const merged=mergeAlertSnapshots(previous,latest);await writeFile(path+'.tmp',JSON.stringify(merged));await rename(path+'.tmp',path);console.log('Current official tables checked; dated historical coverage retained.');
