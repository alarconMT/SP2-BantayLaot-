import React, { useState } from 'react';
import { MUNICIPALITIES, GEARS } from './constants';

// Design tokens — same palette as municipal/theme.js
const C = {
    cardGlass:   'rgba(255,255,255,0.04)',
    primary:     '#38bdf8',
    primarySoft: '#0c4a6e',
    teal:        '#2dd4bf',
    cyan:        '#67e8f9',
    danger:      '#f87171',
    text:        '#f8fafc',
    subtext:     '#cbd5e1',
    muted:       '#94a3b8',
    border:      'rgba(255,255,255,0.08)',
    font:        'Inter, system-ui, -apple-system, sans-serif',
};

export const selectStyle = {
    borderRadius: 10,
    border: `1px solid ${C.border}`,
    padding: '8px 10px',
    fontSize: 13,
    width: '100%',
    color: C.text,
    background: '#1e293b',
    outline: 'none',
    colorScheme: 'dark',
};

// ── Card components ─────────────────────────────────────────────────────────

export const DashboardCard = ({ title, children, style = {} }) => (
    <div style={{
        background: C.cardGlass,
        backdropFilter: 'blur(12px)',
        borderRadius: 18,
        padding: 16,
        marginBottom: 16,
        border: `1px solid ${C.border}`,
        ...style,
    }}>
        {title && (
            <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700, color: C.text }}>
                {title}
            </h3>
        )}
        {children}
    </div>
);

export const StatCard = ({ label, value, gradient, icon }) => (
    <div style={{
        borderRadius: 16,
        padding: '16px 18px',
        background: gradient,
        boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
        position: 'relative',
        overflow: 'hidden',
    }}>
        {icon && (
            <div style={{ position: 'absolute', right: 14, top: 12, fontSize: 30, opacity: 0.45 }}>
                {icon}
            </div>
        )}
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 600, marginBottom: 6, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            {label}
        </div>
        <div style={{ fontSize: 30, fontWeight: 800, color: '#fff', lineHeight: 1 }}>{value}</div>
    </div>
);

export const UserCard = ({ user, onClick, accentColor = C.primary, badge, subtitle }) => {
    const [hovered, setHovered] = useState(false);
    return (
        <button
            onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                display: 'flex', alignItems: 'center', width: '100%',
                background: hovered ? `${accentColor}12` : C.cardGlass,
                backdropFilter: 'blur(12px)',
                border: `1px solid ${hovered ? accentColor + '44' : C.border}`,
                borderRadius: 16, padding: '12px 14px', marginBottom: 10,
                cursor: 'pointer', textAlign: 'left', gap: 12,
                transition: 'all 0.2s ease',
                boxShadow: hovered ? '0 8px 24px rgba(0,0,0,0.3)' : 'none',
                transform: hovered ? 'translateY(-1px)' : 'none',
                fontFamily: C.font,
            }}
        >
            <Initials name={user.name} color={accentColor} />
            <span style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</div>
                {user.boatName && <div style={{ fontSize: 12, color: C.muted }}>⛵ {user.boatName}</div>}
                {subtitle && <div style={{ fontSize: 11, color: C.muted }}>{subtitle}</div>}
            </span>
            <span style={{
                background: accentColor + '22', color: accentColor,
                border: `1px solid ${accentColor}44`,
                borderRadius: 10, padding: '3px 10px', fontSize: 12, fontWeight: 700,
                flexShrink: 0,
            }}>
                {badge}
            </span>
        </button>
    );
};

// ── Layout helpers ───────────────────────────────────────────────────────────

export const FilterBox = ({ children }) => (
    <div style={{
        background: C.cardGlass,
        backdropFilter: 'blur(12px)',
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        padding: '12px 14px',
        marginBottom: 14,
    }}>
        {children}
    </div>
);

export const SectionHeader = ({ title, action }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{title}</span>
        {action && <span>{action}</span>}
    </div>
);

export const Initials = ({ name, color = C.primary, size = 36 }) => {
    const letters = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    return (
        <div style={{
            width: size, height: size, borderRadius: '50%',
            background: color + '22', color, fontWeight: 700, fontSize: size * 0.36,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            border: `1px solid ${color}44`,
        }}>
            {letters}
        </div>
    );
};

export const EmptyState = ({ message = 'No data available.' }) => (
    <div style={{ textAlign: 'center', padding: '32px 12px', color: C.muted }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>—</div>
        <div style={{ fontSize: 13 }}>{message}</div>
    </div>
);

export const CpueRow = ({ cpue }) => (
    <div>
        <p style={{ fontSize: 12, fontWeight: 700, color: C.muted, margin: '8px 0 4px' }}>Catch Per Unit Effort (CPUE)</p>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 13 }}>
            {GEARS.map(g => cpue?.[g] != null && (
                <li key={g} style={{ padding: '5px 0', color: C.subtext, borderBottom: `1px solid ${C.border}` }}>
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

export const BackBtn = ({ onClick }) => (
    <button onClick={onClick} style={{
        background: 'none', border: 'none', cursor: 'pointer', color: C.primary,
        fontSize: 13, fontWeight: 600, marginBottom: 12,
        display: 'flex', alignItems: 'center', gap: 4, padding: 0,
        fontFamily: C.font,
    }}>
        ← Back to list
    </button>
);

export const NavButtons = ({ idx, setIdx, total }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 12 }}>
        <button onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0}
            style={{
                background: idx === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(56,189,248,0.12)',
                border: `1px solid ${C.border}`, borderRadius: 8, padding: '6px 18px',
                cursor: idx === 0 ? 'default' : 'pointer',
                fontSize: 16, color: idx === 0 ? '#475569' : C.primary,
            }}>
            ‹
        </button>
        <span style={{ fontSize: 12, color: C.muted, minWidth: 50, textAlign: 'center' }}>
            {idx + 1} / {total}
        </span>
        <button onClick={() => setIdx(i => Math.min(total - 1, i + 1))} disabled={idx === total - 1}
            style={{
                background: idx === total - 1 ? 'rgba(255,255,255,0.04)' : 'rgba(56,189,248,0.12)',
                border: `1px solid ${C.border}`, borderRadius: 8, padding: '6px 18px',
                cursor: idx === total - 1 ? 'default' : 'pointer',
                fontSize: 16, color: idx === total - 1 ? '#475569' : C.primary,
            }}>
            ›
        </button>
    </div>
);

export const DownloadBtn = ({ label, onClick }) => (
    <button onClick={onClick} style={{
        fontSize: 11, padding: '6px 12px', background: C.teal, color: '#0f172a',
        border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700,
        fontFamily: C.font,
    }}>
        ⬇ {label}
    </button>
);

export const MunSelect = ({ value, onChange, style = {} }) => (
    <select value={value} onChange={e => onChange(e.target.value)} style={{ ...selectStyle, ...style }}>
        <option value="">All Municipalities</option>
        {MUNICIPALITIES.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
    </select>
);

export { C };
