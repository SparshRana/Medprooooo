import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluatePackEvidence, gtinChecksumValid} from '../lib/pack-evidence';
import {parseMedicineBarcode} from '../lib/barcode';

test('gtinChecksumValid accepts canonical GS1 examples and rejects the digit-swapped ones',()=>{
 assert.equal(gtinChecksumValid('96385074'),true);        // canonical GTIN-8
 assert.equal(gtinChecksumValid('4006381333931'),true);   // canonical GTIN-13
 assert.equal(gtinChecksumValid('04006381333931'),true); // GTIN-14 padded form, same weight positions
 assert.equal(gtinChecksumValid('036000291452'),true);    // canonical UPC-A
 assert.equal(gtinChecksumValid('4006381333932'),false);  // last digit tampered
 assert.equal(gtinChecksumValid('96385075'),false);
 assert.equal(gtinChecksumValid('40063813339'),false);    // wrong length class
});

test('a healthy GTIN-13 DataMatrix pack with batch and future expiry passes all checks',()=>{
 const future=new Date(Date.now()+100*24*60*60*1000).toISOString().slice(0,10).replace(/-/g,'').slice(2);
 const parsed=parseMedicineBarcode(`(01)04006381333931(10)AB1234(17)${future}`);
 const checks=Object.fromEntries(evaluatePackEvidence(parsed).map(c=>[c.id,c]));
 assert.equal(checks.gtin.status,'pass');
 assert.equal(checks.batch.status,'pass');
 assert.equal(checks.expiry.status,'pass');
});

test('tampered digit digits, missing batch and a past expiry produce warns/unknowns, never passes',()=>{
 const parsed=parseMedicineBarcode('4006381333932'); // fails checksum → gtin null
 const checks=Object.fromEntries(evaluatePackEvidence(parsed).map(c=>[c.id,c]));
 assert.equal(checks.gtin.status,'warn');
 assert.equal(checks.batch.status,'unknown');
 assert.equal(checks.expiry.status,'unknown');
 assert.ok(checks.gtin.detail.includes('Re-scan')||checks.gtin.detail.includes('re-scan')||checks.gtin.detail.includes('mistyped'));

 const expired=parseMedicineBarcode('(01)04006381333931(10)AB1234(17)200101');
 const [gtinExpiry]=evaluatePackEvidence(expired).filter(c=>c.id==='expiry');
 assert.equal(gtinExpiry.status,'warn');
 assert.match(gtinExpiry.detail,/expired/);
});

test('a QR/text code with no GTIN payload is unknown, not a failure',()=>{
 const checks=Object.fromEntries(evaluatePackEvidence(parseMedicineBarcode('https://example.com/batch/AB123', 'QR_CODE')).map(c=>[c.id,c]));
 assert.equal(checks.gtin.status,'unknown');
 assert.equal(checks.batch.status,'unknown');
});

test('no barcode at all yields no checks (manual entry path)',()=>{
 assert.deepEqual(evaluatePackEvidence(null),[]);
});
