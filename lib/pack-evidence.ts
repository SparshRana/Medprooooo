import type {ParsedBarcode} from './barcode';

/**
 * Pure, offline pack-evidence checks. These give every scan a concrete verdict
 * on the physical evidence even when the CDSCO list has no matching alert —
 * so "no record found" is never a dead end.
 */
export type EvidenceStatus='pass'|'warn'|'unknown';
export type EvidenceCheck={id:string;status:EvidenceStatus;label:string;detail:string};

/**
 * GS1 mod-10 check digit, computed on the GTIN-14 padded form (leading zeros
 * do not change the result because weights are relative to the check digit).
 * Same rule lib/barcode.ts applies when parsing.
 */
export function gtinChecksumValid(gtin:string):boolean{
  if(!/^\d{8}$|^\d{12,14}$/.test(gtin))return false;
  const padded=gtin.length<=14?gtin.padStart(14,'0'):gtin;
  const sum=[...padded.slice(0,-1)].reverse().reduce((total,digit,index)=>total+Number(digit)*(index%2===0?3:1),0);
  return (10-sum%10)%10===Number(padded.slice(-1));
}

/** Today as YYYY-MM-DD in UTC, for expiry comparisons. */
function todayIso():string{
  return new Date().toISOString().slice(0,10);
}

export function evaluatePackEvidence(barcode:ParsedBarcode|null|undefined):EvidenceCheck[]{
  if(!barcode)return[];
  const raw=barcode.raw||'';
  const checks:EvidenceCheck[]=[];

  // 1. GTIN structure: a valid GS1 check digit is the cheapest anti-fabrication
  //    signal available on any printed retail code.
  if(barcode.gtin){
    checks.push({
      id:'gtin',status:'pass',
      label:'Barcode structure valid',
      detail:`GTIN ${barcode.gtin} has a valid structure for this ${barcode.format} symbol. This does not authenticate the pack.`,
    });
  }else if(/^\d{8}$|^\d{12,14}$/.test(raw)){
    checks.push({
      id:'gtin',status:'warn',
      label:'Barcode digits failed the GS1 check digit',
      detail:'The number scanned is not a consistently encoded GTIN — a mistyped, mis-scanned or altered code is possible. Re-scan the pack carefully and compare with a second pack if available.',
    });
  }else{
    checks.push({
      id:'gtin',status:'unknown',
      label:'No GTIN inside this symbol',
      detail:'The scanned code carries no GTIN payload (e.g. a plain QR or text code), so barcode structure cannot confirm or deny anything. Entry fields fall back to what is printed on the pack.',
    });
  }

  // 2. Batch identity
  if(barcode.batch&&/^[A-Za-z0-9][A-Za-z0-9/-]{2,}$/.test(barcode.batch)){
    checks.push({
      id:'batch',status:'pass',
      label:'Batch number captured',
      detail:`Batch ${barcode.batch} was read from the pack and is the exact key used for official record matching.`,
    });
  }else{
    checks.push({
      id:'batch',status:'unknown',
      label:'Batch number not in the scan',
      detail:'Enter the batch exactly as printed near the expiry panel. Without it, only a product-level (weaker) record match is possible.',
    });
  }

  // 3. Expiry read and sane
  if(barcode.expiry){
    if(barcode.expiry<todayIso()){
      checks.push({
        id:'expiry',status:'warn',
        label:'Barcode expiry already passed',
        detail:`This symbol encodes expiry ${barcode.expiry}. The encoded date is expired. An encoded date can be incorrect or copied. Compare it with the printed label and ask a pharmacist about replacement.`,
      });
    }else{
      checks.push({
        id:'expiry',status:'pass',
        label:'Expiry inside encoded shelf life',
        detail:`Encoded expiry ${barcode.expiry} is in the future. Match it against the printed date on the pack before trusting the read.`,
      });
    }
  }else{
    checks.push({
      id:'expiry',status:'unknown',
      label:'Expiry not encoded in the scan',
      detail:'Symbols without an expiry AI are common on older stock. Check the printed month/year and enter it in the cabinet entry.',
    });
  }

  return checks;
}
