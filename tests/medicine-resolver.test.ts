import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveMedicine,checkDrugInteractions,evaluateExpiry} from '../lib/medicine-resolver';
test('name lookup returns an unverified formulation candidate without a price or treatment plan',async()=>{const res=await resolveMedicine('Paracetamol');assert.equal(res?.verification,'name-candidate-only');assert.equal(res?.comparison,null);assert.equal(res&&'genericPrice' in res,false);assert.equal(await resolveMedicine('Unknown medicine'),null);});
test('supported ingredient rules cite sources and do not infer ingredients from a brand',()=>{const result=checkDrugInteractions([{product:'Telmisartan',owner:'Dad'},{product:'Potassium chloride',owner:'Dad'}]);assert.equal(result.length,1);assert.match(result[0].sourceUrl,/medlineplus/);assert.equal(checkDrugInteractions([{product:'Telma 40'},{product:'Potassium chloride'}]).length,0);assert.equal(checkDrugInteractions([{product:'Telmisartan',owner:'Dad'},{product:'Potassium chloride',owner:'Mom'}]).length,0);assert.equal(checkDrugInteractions([{product:'Telmisartan'},{product:'Unknown supplement'}]).length,0);});
test('evaluateExpiry accurately flags expired, expiring soon, and safe dates', () => {
  const expired = evaluateExpiry('2020-01');
  assert.equal(expired.status, 'expired');
  assert.equal(expired.color, '#b91c1c');

  const futureYear = new Date().getFullYear() + 2;
  const safe = evaluateExpiry(`${futureYear}-06`);
  assert.equal(safe.status, 'safe');
  assert.equal(safe.color, '#047857');

  const missing = evaluateExpiry('');
  assert.equal(missing.status, 'unknown');
});
