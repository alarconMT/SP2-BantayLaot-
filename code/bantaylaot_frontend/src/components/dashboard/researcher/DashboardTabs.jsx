import React from 'react';

const TABS = [
    { id: 'summary', label: 'Summary' },
    { id: 'sessions', label: 'Sessions' },
    { id: 'violations', label: 'Violations' },
    { id: 'fishers', label: 'Fishers' },
];

const DashboardTabs = ({ activeTab, setActiveTab }) => (
    <div
        style={{
            display: 'flex',
            gap: 8,
            padding: '12px',
            background: 'rgba(7, 20, 31, 0.92)',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(14px)',
        }}
    >
        {TABS.map((t) => {
            const active = activeTab === t.id;

            return (
                <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    style={{
                        flex: 1,
                        padding: '12px 10px',
                        border: active
                            ? '1px solid rgba(31,163,255,0.45)'
                            : '1px solid rgba(255,255,255,0.06)',
                        borderRadius: 14,
                        background: active
                            ? 'linear-gradient(to bottom right, #12344D, #1B567F)'
                            : 'rgba(255,255,255,0.03)',
                        color: active ? '#EAF6FF' : '#8CA7C0',
                        fontWeight: active ? 700 : 500,
                        cursor: 'pointer',
                        fontSize: 13,
                        letterSpacing: 0.3,
                        transition: 'all 0.2s ease',
                        boxShadow: active
                            ? '0 6px 18px rgba(31,163,255,0.22)'
                            : 'none',
                        backdropFilter: 'blur(10px)',
                    }}
                    onMouseEnter={(e) => {
                        if (!active) {
                            e.currentTarget.style.background =
                                'rgba(255,255,255,0.06)';
                            e.currentTarget.style.color = '#D7E9FF';
                            e.currentTarget.style.transform =
                                'translateY(-1px)';
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (!active) {
                            e.currentTarget.style.background =
                                'rgba(255,255,255,0.03)';
                            e.currentTarget.style.color = '#8CA7C0';
                            e.currentTarget.style.transform =
                                'translateY(0px)';
                        }
                    }}
                >
                    {t.label}
                </button>
            );
        })}
    </div>
);

export default DashboardTabs;