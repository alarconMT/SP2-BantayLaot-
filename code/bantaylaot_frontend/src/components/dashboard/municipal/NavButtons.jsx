import React from 'react';
import { C } from './theme';

const NavButtons = ({ idx, setIdx, total }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 12 }}>
        <button onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0}
            style={{
                background: idx === 0 ? 'rgba(255,255,255,0.06)' : C.primarySoft,
                color: idx === 0 ? C.muted : C.primary,
                border: `1px solid ${idx === 0 ? C.border : C.primary + '44'}`,
                borderRadius: 10, padding: '6px 20px',
                cursor: idx === 0 ? 'default' : 'pointer',
                fontSize: 16, fontWeight: 700,
                transition: 'all 0.2s ease',
            }}>‹</button>
        <span style={{ fontSize: 12, color: C.muted, minWidth: 52, textAlign: 'center', fontWeight: 500 }}>
            {idx + 1} / {total}
        </span>
        <button onClick={() => setIdx(i => Math.min(total - 1, i + 1))} disabled={idx === total - 1}
            style={{
                background: idx === total - 1 ? 'rgba(255,255,255,0.06)' : C.primarySoft,
                color: idx === total - 1 ? C.muted : C.primary,
                border: `1px solid ${idx === total - 1 ? C.border : C.primary + '44'}`,
                borderRadius: 10, padding: '6px 20px',
                cursor: idx === total - 1 ? 'default' : 'pointer',
                fontSize: 16, fontWeight: 700,
                transition: 'all 0.2s ease',
            }}>›</button>
    </div>
);

export default NavButtons;
