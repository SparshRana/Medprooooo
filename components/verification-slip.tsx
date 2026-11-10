'use client';

import { useRef } from 'react';
import { AlertTriangle, CheckCircle2, HelpCircle, Printer, ShieldCheck, X } from 'lucide-react';
import type { ParsedBarcode } from '@/lib/barcode';
import type { EvidenceCheck } from '@/lib/pack-evidence';
import type { QualityAlert } from '@/lib/quality-alerts';

export type SlipVerdict = 'flagged' | 'cleared' | 'unverified';

export interface VerificationSlipData {
  verdict: SlipVerdict;
  product?: string;
  manufacturer?: string;
  batch?: string;
  expiry?: string;
  barcode?: ParsedBarcode | null;
  checks: EvidenceCheck[];
  recordCount: number;
  generatedAt: string;
  simulated?: boolean;
  matches?: { record: QualityAlert; match: string }[];
}

/**
 * Printable verification slip for the scanned pack. Unlike the formal red
 * CDSCO Chemist Alert Slip, this exists for the everyday cases: a cleared
 * check (verified against the official record count and date) and an
 * unverifiable pack (with concrete next steps and a ready complaint draft).
 * Every scan gets an artifact — nothing depends on a chat answer.
 */
export default function VerificationSlip({ data, onClose }: { data: VerificationSlipData; onClose: () => void }) {
  const printed = useRef(false);

  const theme = data.verdict === 'flagged'
    ? { bar: '#b91c1c', banner: '#fef2f2', bannerBorder: '#fecaca', strong: '#991b1b', text: '#7f1d1d' }
    : data.verdict === 'cleared'
      ? { bar: '#0f766e', banner: '#f0fdf4', bannerBorder: '#bbf7d0', strong: '#065f46', text: '#065f46' }
      : { bar: '#b45309', banner: '#fffbeb', bannerBorder: '#fde68a', strong: '#92400e', text: '#92400e' };

  const verdictTitle = data.simulated
    ? { en: 'DEMONSTRATION ONLY — fictional pack', hi: 'केवल प्रदर्शन — काल्पनिक पैक' }
    : data.verdict === 'flagged'
      ? { en: 'FLAGGED — this batch appears in official CDSCO quality alerts', hi: 'चिह्नित — यह बैच आधिकारिक CDSCO गुणवत्ता चेतावनी में है' }
      : data.verdict === 'cleared'
        ? { en: 'CLEARED — no matching alert in the official records checked', hi: 'स्वच्छ — जाँचे गए आधिकारिक रिकॉर्ड में कोई मिलान नहीं' }
        : { en: 'NOT FULLY VERIFIABLE — candidate record, or essential details missing', hi: 'पूर्ण सत्यापन नहीं — संभावित रिकॉर्ड, या आवश्यक विवरण अनुपस्थित' };

  function handlePrint() {
    if (!printed.current) printed.current = true;
    window.print();
  }

  const complaintText = [
    'To: The Licensing Authority / State Drugs Controller (India)',
    `Date: ${new Date().toLocaleDateString('en-IN')}`,
    'Subject: Request to test suspected Not-of-Standard-Quality / spurious medicine',
    '',
    `Purchased at (chemist / store): ______________________  on: ____________`,
    `Product name: ${data.product || 'as printed on pack'}`,
    `Batch number: ${data.batch || 'entered manually'}`,
    `Expiry (printed): ${data.expiry || 'as printed on pack'}`,
    `Manufacturer (printed on pack): ${data.manufacturer || '____________'}`,
    `Barcode printed on pack: ${data.barcode?.gtin || data.barcode?.raw || '____________'} (${data.barcode?.format || 'code not scanned'})`,
    '',
    'Observed problem (wrong seal, damaged pack, unusual taste, colour, price etc.):',
    '________________________________________________________________',
    '________________________________________________________________',
    '',
    'I request that this batch be tested and action be taken under the',
    'Drugs & Cosmetics Act, 1940. I am willing to surrender the remaining pack.',
    '',
    'Complainant name: ______________  Phone: ______________',
  ].join('\n');

  return (
    <div
      style={{
        position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(6px)', zIndex: 9999, display: 'flex',
        alignItems: 'center', justifyContent: 'center', padding: '1rem',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: '#ffffff', color: '#0f172a', borderRadius: '16px', maxWidth: '640px', width: '100%',
          maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: `2px solid ${theme.bar}`, fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <div style={{ background: theme.bar, color: '#fff', padding: '1.2rem 1.5rem', borderTopLeftRadius: '14px', borderTopRightRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <ShieldCheck size={28} />
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, lineHeight: 1.2 }}>
                Medicine Verification Slip · औषधि सत्यापन पर्ची
              </h2>
              <p style={{ margin: '3px 0 0', fontSize: '0.82rem', opacity: 0.9 }}>
                Bundled official CDSCO NSQ/Spurious alert records · printed pack evidence
              </p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '1.5rem' }}>
          {/* Verdict banner */}
          <div style={{ background: theme.banner, border: `1px solid ${theme.bannerBorder}`, borderRadius: '8px', padding: '0.9rem', marginBottom: '1.25rem' }}>
            <strong style={{ color: theme.strong, fontSize: '0.95rem', display: 'block' }}>
              {verdictTitle.en} · {verdictTitle.hi}
            </strong>
            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: theme.text }}>
              {data.verdict === 'cleared'
                ? `Checked against ${data.recordCount.toLocaleString('en-IN')} official CDSCO alert records indexed as of ${new Date(data.generatedAt).toLocaleDateString('en-IN')}. No record matches this pack. This is a verified absence, not a certificate of authenticity — a counterfeit not yet caught by any official test will not appear here.`
                : data.verdict === 'unverified'
                  ? 'Only a weaker, product-level link (or no link) was found, or essential pack details are missing. Continue with the steps below before trusting this pack.'
                  : `Evidence for the matching official alert is printed under the pack details. Use the separate red CDSCO Chemist Alert Slip for the chemist transaction.`}
            </p>
          </div>

          {/* Pack details */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.8rem', background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '1.25rem' }}>
            {[
              ['Medicine · दवा', data.product || 'Entered manually'],
              ['Batch · बैच', data.batch || 'Not captured'],
              ['Expiry · एक्सपायरी', data.expiry || 'As printed on pack'],
              ['Manufacturer · निर्माता', data.manufacturer || 'As printed on packaging'],
              ['Code scanned', data.barcode?.gtin ? `${data.barcode.gtin} (${data.barcode.format})` : data.barcode ? `${data.barcode.format} code, no GTIN payload` : 'No barcode attached'],
            ].map(([k, v]) => (
              <div key={k}>
                <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block' }}>{k}</span>
                <div style={{ fontWeight: 600, fontSize: '0.92rem', color: '#0f172a', overflowWrap: 'anywhere' }}>{v}</div>
              </div>
            ))}
          </div>

          {data.simulated && <p style={{ background: '#fef9c3', border: '1px solid #fde047', borderRadius: '8px', padding: '0.7rem 0.9rem', fontSize: '0.85rem', color: '#854d0e', marginBottom: '1.25rem' }}>SIMULATED EVENT FOR HACKATHON DEMONSTRATION. All details below are fictional demo values, not an official CDSCO alert.</p>}

          {/* Physical evidence checks */}
          {data.checks.length > 0 && (
            <>
              <h3 style={{ fontSize: '0.98rem', fontWeight: 700, borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '0.75rem', color: '#334155' }}>
                Evidence from the scanned code · स्कैन से मिले सबूत
              </h3>
              <ul style={{ listStyle: 'none', margin: '0 0 1.25rem', padding: 0, display: 'grid', gap: '0.55rem' }}>
                {data.checks.map((c) => (
                  <li key={c.id} style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', fontSize: '0.85rem', lineHeight: 1.45 }}>
                    {c.status === 'pass'
                      ? <CheckCircle2 size={18} color="#047857" style={{ flexShrink: 0, marginTop: '1px' }} />
                      : c.status === 'warn'
                        ? <AlertTriangle size={18} color="#b45309" style={{ flexShrink: 0, marginTop: '1px' }} />
                        : <HelpCircle size={18} color="#64748b" style={{ flexShrink: 0, marginTop: '1px' }} />}
                    <span>
                      <strong style={{ color: c.status === 'pass' ? '#047857' : c.status === 'warn' ? '#92400e' : '#475569' }}>{c.label} · </strong>
                      {c.detail}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}

          {/* Flagged evidence */}
          {!!data.matches?.length && data.verdict === 'flagged' && data.matches.slice(0, 2).map(({ record: r, match }) => (
              <div key={r.id} style={{ borderLeft: `4px solid ${theme.bar}`, paddingLeft: '0.9rem', margin: '1rem 0 1.25rem', fontSize: '0.85rem', color: '#475569', lineHeight: 1.5 }}>
              <strong>{match === 'exact' ? 'Exact official record match' : 'Candidate record'} · {r.kind} · {r.period}</strong>
              <p style={{ margin: '4px 0 0' }}>Product {r.product} · Batch {r.batch} · Lab finding: {r.issue || r.remarks || 'Not stated in the official record'}</p>
              <a href={r.sourceUrl} target="_blank" rel="noreferrer">Open the original CDSCO source ↗</a>
            </div>
          ))}

          {/* Unverifiable next steps + complaint draft */}
          {data.verdict === 'unverified' && !data.simulated && (
            <>
              <h3 style={{ fontSize: '0.98rem', fontWeight: 700, borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '0.75rem', color: '#334155' }}>
                Do this before trusting the pack · इस्तेमाल से पहले यह करें
              </h3>
              <ol style={{ margin: '0 0 1.25rem', paddingLeft: '1.4rem', fontSize: '0.87rem', color: '#475569', lineHeight: 1.55, display: 'grid', gap: '0.4rem' }}>
                <li>Show this slip to the pharmacist and ask for the <strong>batch number on the sales invoice</strong> — availability varies; ask what traceability records are available.</li>
                <li>Compare the printed expiry, batch, manufacturer address and MRP on the pack with this slip. Any mismatch is a red flag even when no official alert exists.</li>
                <li>If anything looks wrong: report using the draft below, consult the published findings at the <a href="https://cdscoonline.gov.in/CDSCO/viewPublicNSQDrug" target="_blank" rel="noreferrer">CDSCO public NSQ portal ↗</a> and pharmacovigilance programme <a href="https://www.ipc.gov.in/PvPI/" target="_blank" rel="noreferrer">PvPI official guidance ↗</a>.</li>
              </ol>
              <details style={{ marginBottom: '1.25rem' }}>
                <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem', color: '#334155' }}>Complaint draft ready to print · शिकायत पत्र (प्रिंट के लिए तैयार)</summary>
                <pre style={{ marginTop: '0.75rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem', fontSize: '0.8rem', whiteSpace: 'pre-wrap', color: '#0f172a', fontFamily: 'Consolas, Menlo, monospace' }}>{complaintText}</pre>
              </details>
            </>
          )}

          <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '1.25rem' }}>
            Generated by MedPro from its bundled CDSCO alert snapshot ({new Date(data.generatedAt).toLocaleDateString('en-IN')}, {data.recordCount.toLocaleString('en-IN')} records) and the scanned code itself. Not medical advice; not a substitute for the competent authority.
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
            <button
              onClick={handlePrint}
              type="button"
              style={{
                flex: '1 1 200px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                padding: '0.75rem 1.25rem', background: '#0f766e', color: '#fff', border: 'none',
                borderRadius: '8px', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer',
              }}
            >
              <Printer size={18} />
              {data.verdict === 'unverified' ? 'Print slip + complaint draft' : 'Print / Save PDF Slip'}
            </button>
            <button
              onClick={onClose}
              type="button"
              style={{ flex: '1 1 120px', padding: '0.75rem 1.25rem', background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer' }}
            >
              Close · बंद करें
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
