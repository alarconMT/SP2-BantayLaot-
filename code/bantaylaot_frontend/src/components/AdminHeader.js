import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const ROLE_LABEL = {
    central_admin:   'Central Admin',
    municipal_admin: 'Municipal Admin',
    researcher:      'Researcher',
};

const AdminHeader = () => {
    const [open,         setOpen]         = useState(false);
    const [btnHovered,   setBtnHovered]   = useState(false);
    const dropdownRef = useRef(null);
    const navigate    = useNavigate();

    const adminName = localStorage.getItem('adminName') || 'Admin';
    const role      = localStorage.getItem('role') || '';
    const initial   = adminName.charAt(0).toUpperCase();

    useEffect(() => {
        const handler = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleLogout = () => {
        localStorage.clear();
        navigate('/login');
    };

    return (
        <header style={{
            height: 56,
            background: 'rgba(10,22,40,0.98)',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 20px',
            flexShrink: 0,
            zIndex: 100,
            backdropFilter: 'blur(12px)',
            fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        }}>
            <style>{`
                .ah-menu-item {
                    display: flex; align-items: center; gap: 10px;
                    width: 100%; background: none; border: none;
                    padding: 10px 16px; text-align: left; cursor: pointer;
                    font-size: 13px; font-weight: 600; color: #cbd5e1;
                    font-family: inherit;
                    transition: background .12s ease, color .12s ease;
                }
                .ah-menu-item:hover { background: rgba(255,255,255,0.06); }
                .ah-menu-item.danger { color: #f87171; }
                .ah-menu-item.danger:hover { background: rgba(248,113,113,0.08); }
                .ah-profile-btn {
                    transition: background .15s ease, border-color .15s ease;
                }
                .ah-profile-btn:hover {
                    background: rgba(255,255,255,0.09) !important;
                    border-color: rgba(255,255,255,0.18) !important;
                }
            `}</style>

            {/* ── Brand / Logo ─────────────────────────────────────────── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                    width: 34, height: 34, borderRadius: 9,
                    background: 'rgba(56,189,248,0.12)',
                    border: '1px solid rgba(56,189,248,0.25)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                }}>
                    <img
                        src="/sailboat.png"
                        alt="BantayLaot"
                        style={{
                            width: 22, height: 22,
                            objectFit: 'contain',
                            filter: 'drop-shadow(0 0 6px rgba(56,189,248,0.65))',
                        }}
                    />
                </div>
                <span style={{
                    color: '#f8fafc', fontWeight: 800,
                    fontSize: 16, letterSpacing: '-.2px',
                }}>
                    BantayLaot+
                </span>
            </div>

            {/* ── Profile button + dropdown ─────────────────────────────── */}
            <div ref={dropdownRef} style={{ position: 'relative' }}>
                <button
                    className="ah-profile-btn"
                    onClick={() => setOpen(o => !o)}
                    style={{
                        background: open
                            ? 'rgba(255,255,255,0.09)'
                            : 'rgba(255,255,255,0.055)',
                        border: `1px solid ${open ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.09)'}`,
                        color: '#f8fafc',
                        padding: '4px 12px 4px 5px',
                        borderRadius: 99,
                        cursor: 'pointer',
                        fontSize: 13,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                    }}
                >
                    {/* Initials avatar */}
                    <div style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: 'linear-gradient(135deg, #38bdf8, #0284c7)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 800, color: '#071428', fontSize: 12,
                        flexShrink: 0,
                        boxShadow: '0 2px 8px rgba(56,189,248,0.35)',
                    }}>
                        {initial}
                    </div>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{adminName}</span>
                    <span style={{
                        fontSize: 9, color: '#64748b',
                        transform: open ? 'rotate(180deg)' : 'none',
                        transition: 'transform .2s ease',
                        display: 'inline-block',
                    }}>▼</span>
                </button>

                {open && (
                    <div style={{
                        position: 'absolute',
                        right: 0,
                        top: 'calc(100% + 8px)',
                        background: '#0f172a',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 14,
                        minWidth: 210,
                        boxShadow: '0 16px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
                        overflow: 'hidden',
                        zIndex: 200,
                        animation: 'ah-drop .15s ease',
                    }}>
                        <style>{`
                            @keyframes ah-drop {
                                from { opacity: 0; transform: translateY(-6px); }
                                to   { opacity: 1; transform: translateY(0); }
                            }
                        `}</style>

                        {/* User info header */}
                        <div style={{
                            padding: '14px 16px 12px',
                            borderBottom: '1px solid rgba(255,255,255,0.07)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                        }}>
                            <div style={{
                                width: 36, height: 36, borderRadius: '50%',
                                background: 'linear-gradient(135deg, #38bdf8, #0284c7)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontWeight: 800, color: '#071428', fontSize: 14,
                                flexShrink: 0,
                            }}>
                                {initial}
                            </div>
                            <div style={{ minWidth: 0 }}>
                                <div style={{
                                    fontWeight: 700, fontSize: 13, color: '#f8fafc',
                                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                }}>
                                    {adminName}
                                </div>
                                <div style={{ fontSize: 11, color: '#38bdf8', fontWeight: 600, marginTop: 1 }}>
                                    {ROLE_LABEL[role] || role}
                                </div>
                            </div>
                        </div>

                        {/* Menu items */}
                        {role !== 'researcher' && (
                            <button
                                className="ah-menu-item"
                                onClick={() => { setOpen(false); navigate('/manage-users'); }}
                            >
                                <span style={{ fontSize: 15 }}>👥</span>
                                Manage Users
                            </button>
                        )}

                        <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '4px 0' }} />

                        <button
                            className="ah-menu-item danger"
                            onClick={handleLogout}
                        >
                            <span style={{ fontSize: 15 }}>🚪</span>
                            Sign Out
                        </button>

                        <div style={{ height: 6 }} />
                    </div>
                )}
            </div>
        </header>
    );
};

export default AdminHeader;
