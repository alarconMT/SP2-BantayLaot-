import React from 'react';
import { C } from './theme';

const TABS = [
    { key: 'summary',    label: 'Summary'    },
    { key: 'sessions',   label: 'Sessions'   },
    { key: 'violations', label: 'Violations' },
];

const DashboardTabs = ({ activeTab, setActiveTab }) => (
    <div style={{
        display: 'flex', gap: 8, padding: 12,
        borderBottom: `1px solid ${C.border}`,
        background: 'rgba(0,0,0,0.2)',
        position: 'sticky', top: 0, zIndex: 5,
    }}>
        {TABS.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
                flex: 1, padding: '10px 14px', borderRadius: 12,
                background: activeTab === t.key ? C.primarySoft : 'transparent',
                color: activeTab === t.key ? C.primary : C.muted,
                fontWeight: 600, fontSize: 13,
                boxShadow: activeTab === t.key ? '0 0 20px rgba(56,189,248,0.25)' : 'none',
                border: activeTab === t.key ? `1px solid ${C.primary}44` : '1px solid transparent',
                transition: 'all 0.2s ease', cursor: 'pointer', fontFamily: C.font,
            }}>
                {t.label}
            </button>
        ))}
    </div>
);

export default DashboardTabs;
