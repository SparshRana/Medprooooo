import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateExpiry, resolveMedicine } from '../lib/medicine-resolver';
import { parseMedicineBarcode } from '../lib/barcode';

test('evaluateExpiry treats a malformed month as invalid, never as safe',()=>{
 const invalid=evaluateExpiry('2026-XX');
 assert.equal(invalid.status,'unknown');
 assert.equal(evaluateExpiry('2026-13').status,'unknown');
 assert.equal(evaluateExpiry('2026-00').status,'unknown');
 // Well-formed months still classify normally.
 assert.equal(evaluateExpiry('2026-01').status,'expired');
 assert.equal(evaluateExpiry('2099-12').status,'safe');
});

test('GS1 expiry day 00 resolves to the last day of the month, not a literal string',()=>{
 // Day 00 is the GS1 convention for "last day of the month".
 assert.equal(parseMedicineBarcode('(17)260200').expiry,'2026-02-28');
 assert.equal(parseMedicineBarcode('(17)261000').expiry,'2026-10-31');
 // Regular days and deliberately invalid days keep previous behaviour.
 assert.equal(parseMedicineBarcode('(17)261231').expiry,'2026-12-31');
 assert.equal(parseMedicineBarcode('(17)260231').expiry,null);
});

test('resolver ignores queries too short to identify a medicine',async()=>{
 // A one- or two-character query would match dozens of curated brands and salts.
 assert.equal(await resolveMedicine('p'),null);
 assert.equal(await resolveMedicine('me'),null);
 assert.equal(await resolveMedicine('  '),null);
 const candidate=await resolveMedicine('Paracetamol');
 assert.equal(candidate?.comparison,null);
});

test('unsupported name queries never produce invented prices',async()=>{assert.equal(await resolveMedicine('moximax-d'),null);assert.equal(await resolveMedicine('not-a-real-medicine-name-12345'),null);});
