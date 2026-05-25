import React from 'react';
import { C, GEARS } from './theme';

const CpueRow = ({ cpue }) => (
    <div>
        <p style={{ fontSize: 12, fontWeight: 700, color: C.muted, margin: '8px 0 4px' }}>Catch Per Unit Effort (CPUE)</p>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 13 }}>
            {GEARS.map(g => cpue?.[g] != null && (
                <li key={g} style={{ padding: '4px 0', color: C.subtext, borderBottom: `1px solid ${C.border}` }}>
                    <strong style={{ color: C.muted }}>{g}:</strong>{' '}
                    <span style={{ color: C.cyan, fontWeight: 600 }}>{cpue[g].toFixed(2)}</span> kg/hr
                </li>
            ))}
            {(!cpue || !Object.keys(cpue).length) && (
                <li style={{ color: C.muted, fontSize: 12 }}>No CPUE data</li>
            )}
        </ul>
    </div>
);

export default CpueRow;
