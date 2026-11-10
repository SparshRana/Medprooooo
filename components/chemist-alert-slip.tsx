'use client';

import { useRef } from 'react';
import { AlertOctagon, Printer, ShieldAlert, X } from 'lucide-react';

export interface ChemistSlipData {
  product: string;
  manufacturer?: string;
  batch: string;
  expiry?: string;
  issue?: string;
  laboratory?: string;
  period?: string;
  reportId?: string;
  sourceUrl?: string;
}

interface ChemistAlertSlipProps {
  data: ChemistSlipData;
  onClose: () => void;
  hindi?: boolean;
}

export default function ChemistAlertSlip({ data, onClose, hindi }: ChemistAlertSlipProps) {
  const slipRef = useRef<HTMLDivElement>(null);

  function handlePrint() {
    window.print();
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={slipRef}
        style={{
          background: '#ffffff',
          color: '#0f172a',
          borderRadius: '16px',
          maxWidth: '620px',
          width: '100%',
          maxHeight: '92vh',
          overflowY: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '2px solid #ef4444',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Header bar */}
        <div
          style={{
            background: '#b91c1c',
            color: '#ffffff',
            padding: '1.2rem 1.5rem',
            borderTopLeftRadius: '14px',
            borderTopRightRadius: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <ShieldAlert size={28} />
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, lineHeight: 1.2 }}>
                {hindi ? 'आधिकारिक औषधि गुणवत्ता चेतावनी पर्ची' : 'Official CDSCO Medicine Quality Alert Slip'}
              </h2>
              <p style={{ margin: '3px 0 0', fontSize: '0.82rem', opacity: 0.9 }}>
                {hindi ? 'केमिस्ट / विक्रेता प्रतिस्थापन एवं शिकायत पर्ची' : 'Chemist Batch Replacement & Verification Notice'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: '#fff',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              cursor: 'pointer',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Slip Body */}
        <div style={{ padding: '1.5rem' }}>
          <div
            style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              padding: '0.9rem',
              display: 'flex',
              gap: '0.75rem',
              alignItems: 'flex-start',
              marginBottom: '1.25rem',
            }}
          >
            <AlertOctagon size={24} color="#dc2626" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ color: '#991b1b', fontSize: '0.95rem', display: 'block' }}>
                {hindi ? 'सरकारी प्रयोगशाला द्वारा मानक पर खरा न पाया गया (NSQ / Spurious)' : 'Flagged as Not of Standard Quality (NSQ) by Official CDSCO Report'}
              </strong>
              <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#7f1d1d' }}>
                {hindi
                  ? 'यह पर्ची आधिकारिक सरकारी गजट / CDSCO NSQ सूची पर आधारित है। उपभोक्ता औषधि एवं प्रसाधन सामग्री अधिनियम के तहत प्रतिस्थापन या धनवापसी का हकदार है।'
                  : 'This notice is generated based on official central/state drug testing alerts. The consumer is entitled to an immediate replacement or full refund under the Drugs & Cosmetics Rules.'}
              </p>
            </div>
          </div>

          <h3 style={{ fontSize: '1rem', fontWeight: 700, borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '0.75rem', color: '#334155' }}>
            {hindi ? 'उत्पाद एवं बैच विवरण' : 'Product & Batch Information'}
          </h3>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '0.85rem',
              background: '#f8fafc',
              padding: '1rem',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              marginBottom: '1.25rem',
            }}
          >
            <div>
              <span style={{ fontSize: '0.78rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {hindi ? 'दवा का नाम' : 'Medicine Brand'}
              </span>
              <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#0f172a' }}>{data.product}</div>
            </div>

            <div>
              <span style={{ fontSize: '0.78rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {hindi ? 'बैच नंबर (सत्यापित)' : 'Batch Number (Flagged)'}
              </span>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#dc2626' }}>{data.batch}</div>
            </div>

            <div>
              <span style={{ fontSize: '0.78rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {hindi ? 'निर्माता' : 'Reported Manufacturer'}
              </span>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#334155' }}>{data.manufacturer || 'As printed on packaging'}</div>
            </div>

            <div>
              <span style={{ fontSize: '0.78rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {hindi ? 'जांच प्रयोगशाला / स्रोत' : 'Testing Laboratory'}
              </span>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#334155' }}>{data.laboratory || 'Not stated in the official record'}</div>
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <span style={{ fontSize: '0.78rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {hindi ? 'दोष का कारण (Lab Finding)' : 'Official Reason for Quality Failure'}
              </span>
              <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#991b1b', background: '#fee2e2', padding: '6px 10px', borderRadius: '6px', marginTop: '3px' }}>
                {data.issue || 'Not stated in the official record'}
              </div>
            </div>
          </div>

          <div
            style={{
              borderLeft: '4px solid #b91c1c',
              paddingLeft: '0.9rem',
              margin: '1.25rem 0',
              fontSize: '0.85rem',
              color: '#475569',
              lineHeight: 1.5,
            }}
          >
            <strong>{hindi ? 'केमिस्ट / फार्मेसी के लिए कानूनी सूचना:' : 'Notice to Dispensing Chemist / Pharmacist:'}</strong>
            <p style={{ margin: '4px 0 0' }}>
              {hindi
                ? 'औषधि एवं प्रसाधन सामग्री नियम 65(17) के अंतर्गत इस बैच को तुरंत बिक्री से रोककर निर्माता को वापस (Recall) किया जाना अनिवार्य है। कृपया ग्राहक को सुरक्षित नया बैच प्रदान करें अथवा नियमानुसार राशि वापस करें।'
                : 'Under the Drugs & Cosmetics Rules, retailers are required to immediately quarantine flagged batches and halt dispensing. Please replace this medicine with a verified safe batch or issue an immediate refund.'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
            <button
              onClick={handlePrint}
              type="button"
              style={{
                flex: '1 1 200px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.25rem',
                background: '#0f766e',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.95rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Printer size={18} />
              {hindi ? 'प्रिंट / PDF सेव करें' : 'Print / Save PDF Slip'}
            </button>

            <button
              onClick={onClose}
              type="button"
              style={{
                flex: '1 1 120px',
                padding: '0.75rem 1.25rem',
                background: '#f1f5f9',
                color: '#334155',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '0.95rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {hindi ? 'बंद करें' : 'Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
