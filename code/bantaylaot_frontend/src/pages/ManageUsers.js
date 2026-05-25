import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Spinner from 'react-bootstrap/Spinner';
import Offcanvas from 'react-bootstrap/Offcanvas';
import { Chart } from 'react-google-charts';
import AdminHeader from '../components/AdminHeader';
import PSGCSelector from '../components/PSGCSelector';

const getServerUrl = () => localStorage.getItem('server_url') || 'http://localhost:3001';
const getRole      = () => localStorage.getItem('role') || '';

const MUNICIPALITIES = [
    { id: '104305000', name: 'Cagayan de Oro' },
    { id: '104321000', name: 'Opol'           },
];
const munName = (id) => MUNICIPALITIES.find(m => m.id === id)?.name || id || '—';

const THEME = {
    bg:         '#0f172a',
    panel:      'rgba(255,255,255,0.04)',
    panelSoft:  '#1e293b',
    border:     'rgba(255,255,255,0.08)',
    accent:     '#38bdf8',
    accentSoft: '#67e8f9',
    text:       '#f8fafc',
    textMuted:  '#94a3b8',
    success:    '#4ade80',
    warning:    '#f59e0b',
    danger:     '#f87171',
    gray:       '#475569',
    shadow:     '0 8px 24px rgba(0,0,0,0.3)',
};

const STATUS_COLORS = {
    APPROVED:    THEME.success,
    DECLINED:    THEME.danger,
    PENDING:     THEME.warning,
    DEACTIVATED: THEME.gray,
};

const STATUS_BG = {
    APPROVED:    'rgba(74,222,128,0.12)',
    DECLINED:    'rgba(248,113,113,0.12)',
    PENDING:     'rgba(245,158,11,0.12)',
    DEACTIVATED: 'rgba(71,85,105,0.12)',
};

const ROLE_STYLE = {
    fisher:          { icon: '🐟', color: '#4dd0e1', bg: 'rgba(77,208,225,0.12)',  label: 'Fisher',     gradient: 'linear-gradient(135deg,#4dd0e1,#0891b2)' },
    municipal_admin: { icon: '🛡️', color: '#7dd3fc', bg: 'rgba(125,211,252,0.12)', label: 'Mun. Admin', gradient: 'linear-gradient(135deg,#7dd3fc,#2563eb)' },
    researcher:      { icon: '🔬', color: '#67e8f9', bg: 'rgba(103,232,249,0.12)', label: 'Researcher', gradient: 'linear-gradient(135deg,#67e8f9,#0284c7)' },
};

// ── Small reusable components ─────────────────────────────────────────────────

const StatusBadge = ({ status }) => (
    <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '4px 12px', borderRadius: 999,
        fontSize: 11, fontWeight: 700, letterSpacing: '.5px',
        background: STATUS_BG[status], color: STATUS_COLORS[status],
        border: `1px solid ${STATUS_COLORS[status]}40`,
        boxShadow: `0 2px 8px ${STATUS_COLORS[status]}20`,
    }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: STATUS_COLORS[status], display: 'inline-block' }} />
        {status}
    </span>
);

const Th = ({ children, sortKey, sortBy, sortDir, onSort }) => {
    const active = sortBy === sortKey;
    return (
        <th onClick={() => onSort(sortKey)} style={{
            cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap',
            padding: '14px 16px', background: 'rgba(15,31,53,0.97)',
            fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.6px',
            color: active ? THEME.accentSoft : THEME.textMuted,
            borderBottom: `1px solid ${THEME.border}`,
            transition: 'color .2s ease',
        }}>
            {children} {active ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
        </th>
    );
};

const Field = ({ label, children }) => (
    <div style={{ marginBottom: 14 }}>
        <label style={{
            display: 'block', fontSize: 11, fontWeight: 700,
            color: THEME.textMuted, marginBottom: 5,
            textTransform: 'uppercase', letterSpacing: '.5px',
        }}>{label}</label>
        {children}
    </div>
);

const SectionLabel = ({ children }) => (
    <div style={{
        fontSize: 11, fontWeight: 700, color: THEME.textMuted,
        textTransform: 'uppercase', letterSpacing: '.5px',
        marginBottom: 12, marginTop: 6,
        paddingBottom: 8, borderBottom: `1px solid ${THEME.border}`,
    }}>{children}</div>
);

const msgBox = (type) => ({
    padding: '10px 14px', borderRadius: 10, marginBottom: 16, fontSize: 12,
    background: type === 'success' ? 'rgba(74,222,128,0.10)' : 'rgba(248,113,113,0.10)',
    color: type === 'success' ? THEME.success : THEME.danger,
    border: `1px solid ${type === 'success' ? THEME.success : THEME.danger}44`,
    display: 'flex', alignItems: 'flex-start', gap: 8,
});

const drawerBtn = (color) => ({
    background: `linear-gradient(135deg, ${color}, ${color}bb)`,
    border: 'none', fontWeight: 700, color: '#0f172a',
    boxShadow: `0 4px 14px ${color}40`,
    borderRadius: 10, padding: '11px 0',
    cursor: 'pointer', fontSize: 13,
    transition: 'all .2s ease', width: '100%',
    marginTop: 4,
});

// ── Main component ────────────────────────────────────────────────────────────

const ManageUsers = () => {
    const navigate  = useNavigate();
    const role      = getRole();
    const isCentral = role === 'central_admin';

    const [allUsers, setAllUsers] = useState([]);
    const [loading,  setLoading]  = useState(false);

    const [search,       setSearch]       = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [munFilter,    setMunFilter]    = useState('ALL');
    const [roleFilter,   setRoleFilter]   = useState('ALL');

    const [sortBy,  setSortBy]  = useState('name');
    const [sortDir, setSortDir] = useState('asc');

    const [selected, setSelected] = useState(null);
    const [openMenu, setOpenMenu] = useState(null);

    const [actionLoading,  setActionLoading]  = useState({});
    const [actionFeedback, setActionFeedback] = useState({});
    const [pendingConfirm, setPendingConfirm] = useState(null);

    // Researcher form
    const [showResearcher, setShowResearcher] = useState(false);
    const [rName,    setRName]    = useState('');
    const [rEmail,   setREmail]   = useState('');
    const [rPass,    setRPass]    = useState('');
    const [rLoading, setRLoading] = useState(false);
    const [rMsg,     setRMsg]     = useState(null);

    // Municipal admin form
    const [showMunAdmin, setShowMunAdmin] = useState(false);
    const [mName,    setMName]    = useState('');
    const [mEmail,   setMEmail]   = useState('');
    const [mPass,    setMPass]    = useState('');
    const [mPsgc,    setMPsgc]    = useState({});
    const [mLoading, setMLoading] = useState(false);
    const [mMsg,     setMMsg]     = useState(null);

    // Fisher form
    const [showAddFisher, setShowAddFisher] = useState(false);
    const [fName,         setFName]         = useState('');
    const [fEmail,        setFEmail]        = useState('');
    const [fPass,         setFPass]         = useState('');
    const [fBirthdate,    setFBirthdate]    = useState('');
    const [fBarangay,     setFBarangay]     = useState('');
    const [fBarangayCode, setFBarangayCode] = useState('');
    const [fBoatName,     setFBoatName]     = useState('');
    const [fBoatType,     setFBoatType]     = useState('');
    const [fLength,       setFLength]       = useState('');
    const [fEnginePower,  setFEnginePower]  = useState('');
    const [fRegNumber,    setFRegNumber]    = useState('');
    const [fLoading,      setFLoading]      = useState(false);
    const [fMsg,          setFMsg]          = useState(null);
    const [fBarangayList, setFBarangayList] = useState([]);

    // Close 3-dot dropdown on outside click
    useEffect(() => {
        const close = () => setOpenMenu(null);
        document.addEventListener('click', close);
        return () => document.removeEventListener('click', close);
    }, []);

    // ── Form handlers ─────────────────────────────────────────────────────────

    const createResearcher = async (e) => {
        e.preventDefault();
        setRLoading(true); setRMsg(null);
        try {
            const res  = await fetch(`${getServerUrl()}/api/auth/researcher-setup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: rName, email: rEmail, password: rPass }),
            });
            const data = await res.json();
            if (res.ok) {
                setRMsg({ type: 'success', text: `Researcher account created for ${rEmail}.` });
                setRName(''); setREmail(''); setRPass('');
                fetchUsers();
            } else {
                setRMsg({ type: 'error', text: data.message || 'Failed.' });
            }
        } catch { setRMsg({ type: 'error', text: 'Cannot connect to server.' }); }
        finally  { setRLoading(false); }
    };

    const createMunAdmin = async (e) => {
        e.preventDefault();
        setMMsg(null);
        if (!mPsgc.munCityCode) { setMMsg({ type: 'error', text: 'Please select a municipality.' }); return; }
        if (!mPsgc.isActive)    { setMMsg({ type: 'error', text: `No active server for ${mPsgc.munCityName}.` }); return; }
        setMLoading(true);
        try {
            const res  = await fetch(`${mPsgc.serverUrl}/api/auth/admin-setup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: mName, email: mEmail, password: mPass,
                    role: 'municipal_admin', municipalityId: mPsgc.munCityCode,
                    regionCode: mPsgc.regionCode || '', regionName: mPsgc.regionName || '',
                    provinceCode: mPsgc.provinceCode || '', provinceName: mPsgc.provinceName || '',
                    munCityCode: mPsgc.munCityCode || '', munCityName: mPsgc.munCityName || '',
                    barangayCode: '', barangayName: '',
                }),
            });
            const data = await res.json();
            if (res.ok) {
                setMMsg({ type: 'success', text: `Municipal admin created for ${mEmail} (${mPsgc.munCityName}).` });
                setMName(''); setMEmail(''); setMPass(''); setMPsgc({});
                fetchUsers();
            } else {
                setMMsg({ type: 'error', text: data.message || 'Failed.' });
            }
        } catch { setMMsg({ type: 'error', text: 'Cannot connect to the municipal server.' }); }
        finally  { setMLoading(false); }
    };

    useEffect(() => {
        if (isCentral) return;
        import('philippine-location-json-for-geer').then(({ getBarangayByMun }) => {
            const MUN_CODE = { 'http://localhost:3001': '104305', 'http://localhost:3002': '104321' };
            const code = MUN_CODE[getServerUrl()] || '';
            if (code) setFBarangayList(getBarangayByMun(code).sort((a, b) => a.name.localeCompare(b.name)));
        }).catch(() => {});
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const createFisher = async (e) => {
        e.preventDefault();
        setFLoading(true); setFMsg(null);
        const token     = localStorage.getItem('jwt_token');
        const adminUser = allUsers.find(u => u._id === localStorage.getItem('userId'));
        try {
            const res  = await fetch(`${getServerUrl()}/api/auth/fisher-setup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    name: fName, email: fEmail, password: fPass, birthdate: fBirthdate,
                    barangayName: fBarangay, boatName: fBoatName, boatType: fBoatType,
                    length: fLength ? parseFloat(fLength) : 0,
                    enginePower: fEnginePower, registrationNumber: fRegNumber,
                    regionCode: adminUser?.regionCode || '', regionName: adminUser?.regionName || '',
                    provinceCode: adminUser?.provinceCode || '', provinceName: adminUser?.provinceName || '',
                    munCityCode: adminUser?.munCityCode || '', munCityName: adminUser?.munCityName || '',
                    barangayCode: fBarangayCode,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                setFMsg({ type: 'success', text: `Fisher account created for ${fEmail}.` });
                setFName(''); setFEmail(''); setFPass(''); setFBirthdate('');
                setFBarangay(''); setFBarangayCode('');
                setFBoatName(''); setFBoatType(''); setFLength(''); setFEnginePower(''); setFRegNumber('');
                fetchUsers();
            } else {
                setFMsg({ type: 'error', text: data.message || 'Failed.' });
            }
        } catch { setFMsg({ type: 'error', text: 'Cannot connect to server.' }); }
        finally  { setFLoading(false); }
    };

    const fetchUsers = useCallback(async () => {
        const token = localStorage.getItem('jwt_token');
        setLoading(true);
        try {
            const usersRes = await fetch(`${getServerUrl()}/api/users`, { headers: { Authorization: `Bearer ${token}` } });
            const users    = await usersRes.json();
            let allData    = Array.isArray(users) ? users : [];
            if (getRole() === 'central_admin') {
                const rRes = await fetch(`${getServerUrl()}/api/researchers`, { headers: { Authorization: `Bearer ${token}` } });
                if (rRes.ok) {
                    const researchers = await rRes.json();
                    allData = [...allData, ...(Array.isArray(researchers) ? researchers : []).map(r => ({ ...r, _isResearcher: true }))];
                }
            }
            setAllUsers(allData);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    const handleStatusChange = useCallback(async (userId, newStatus) => {
        const token = localStorage.getItem('jwt_token');
        const user  = allUsers.find(u => u._id === userId);
        const url   = user?._isResearcher
            ? `${getServerUrl()}/api/researchers/${userId}/status`
            : `${getServerUrl()}/api/users/${userId}/status`;
        setActionLoading(p => ({ ...p, [userId]: true }));
        setOpenMenu(null);
        try {
            const res = await fetch(url, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ status: newStatus }),
            });
            if (!res.ok) throw new Error();
            setAllUsers(p => p.map(u => u._id === userId ? { ...u, status: newStatus } : u));
            if (selected?._id === userId) setSelected(p => ({ ...p, status: newStatus }));
            setActionFeedback(p => ({ ...p, [userId]: newStatus }));
        } catch {
            setActionFeedback(p => ({ ...p, [userId]: 'error' }));
        } finally {
            setActionLoading(p => ({ ...p, [userId]: false }));
        }
    }, [selected, allUsers]);

    const requestAction = useCallback((userId, status, userName) => {
        const DESTRUCTIVE = {
            DECLINED:    { label: 'Decline',    color: THEME.danger },
            DEACTIVATED: { label: 'Deactivate', color: THEME.gray   },
        };
        const cfg = DESTRUCTIVE[status];
        if (cfg) {
            setPendingConfirm({ userId, status, userName, label: cfg.label, color: cfg.color });
        } else {
            handleStatusChange(userId, status);
        }
    }, [handleStatusChange]);

    const handleSort = (key) => {
        if (sortBy === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortBy(key); setSortDir('asc'); }
    };

    // ── Derived data ──────────────────────────────────────────────────────────

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return allUsers.filter(u => {
            if (statusFilter !== 'ALL' && u.status !== statusFilter) return false;
            if (munFilter    !== 'ALL' && u.municipalityId !== munFilter) return false;
            if (roleFilter   !== 'ALL' && u.role !== roleFilter) return false;
            if (q && !u.name?.toLowerCase().includes(q) && !u.email?.toLowerCase().includes(q) && !u.barangayName?.toLowerCase().includes(q)) return false;
            return true;
        });
    }, [allUsers, statusFilter, munFilter, roleFilter, search]);

    const sorted = useMemo(() => [...filtered].sort((a, b) => {
        let av = a[sortBy] ?? ''; let bv = b[sortBy] ?? '';
        if (sortBy === 'createdAt') { av = new Date(av); bv = new Date(bv); }
        else { av = String(av).toLowerCase(); bv = String(bv).toLowerCase(); }
        if (av < bv) return sortDir === 'asc' ? -1 : 1;
        if (av > bv) return sortDir === 'asc' ?  1 : -1;
        return 0;
    }), [filtered, sortBy, sortDir]);

    const chartData = useMemo(() => {
        const fishers = allUsers.filter(u => u.role === 'fisher');
        if (isCentral && munFilter === 'ALL') {
            const counts = {};
            fishers.forEach(u => { const n = munName(u.municipalityId); counts[n] = (counts[n] || 0) + 1; });
            return [['Municipality', 'Fishers'], ...Object.entries(counts).sort((a, b) => b[1] - a[1])];
        }
        const counts = {};
        (munFilter !== 'ALL' ? fishers.filter(u => u.municipalityId === munFilter) : fishers)
            .forEach(u => { const b = u.barangayName || 'Unknown'; counts[b] = (counts[b] || 0) + 1; });
        return [['Barangay', 'Fishers'], ...Object.entries(counts).sort((a, b) => b[1] - a[1])];
    }, [allUsers, munFilter, isCentral]);

    const counts = useMemo(() => ({
        ALL:         allUsers.length,
        PENDING:     allUsers.filter(u => u.status === 'PENDING').length,
        APPROVED:    allUsers.filter(u => u.status === 'APPROVED').length,
        DECLINED:    allUsers.filter(u => u.status === 'DECLINED').length,
        DEACTIVATED: allUsers.filter(u => u.status === 'DEACTIVATED').length,
    }), [allUsers]);

    const glassCard = {
        background: 'rgba(15,23,42,0.93)',
        borderRadius: 18,
        border: `1px solid ${THEME.border}`,
        backdropFilter: 'blur(12px)',
        boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
    };

    const clearFilters = () => { setSearch(''); setStatusFilter('ALL'); setMunFilter('ALL'); setRoleFilter('ALL'); };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0f172a', color: THEME.text }}>
            <style>{`
                /* Dark-theme inputs — including browser autofill */
                .form-control, .form-select {
                    background: #1e293b !important;
                    border: 1px solid rgba(255,255,255,0.1) !important;
                    color: #f8fafc !important;
                    border-radius: 8px !important;
                    font-size: 13px !important;
                    color-scheme: dark;
                }
                .form-control::placeholder { color: #64748b !important; }
                .form-control:focus, .form-select:focus {
                    background: #1e293b !important;
                    border-color: #38bdf8 !important;
                    box-shadow: 0 0 0 3px rgba(56,189,248,0.15) !important;
                    color: #f8fafc !important;
                }
                input:-webkit-autofill,
                input:-webkit-autofill:focus {
                    -webkit-box-shadow: 0 0 0 1000px #1e293b inset !important;
                    -webkit-text-fill-color: #f8fafc !important;
                    caret-color: #f8fafc;
                }
                select option { background: #1e293b; color: #f8fafc; }

                /* Table rows */
                table { color: #f8fafc; }
                @keyframes fadeInRow {
                    from { opacity: 0; transform: translateY(3px); }
                    to   { opacity: 1; transform: translateY(0);   }
                }
                tbody tr {
                    animation: fadeInRow .18s ease;
                    transition: background .15s ease;
                }
                tbody tr:hover { background: rgba(56,189,248,0.07) !important; }

                /* Scrollbars */
                ::-webkit-scrollbar { width: 6px; height: 6px; }
                ::-webkit-scrollbar-thumb { background: #334155; border-radius: 6px; }
                ::-webkit-scrollbar-track { background: transparent; }

                /* Action / drawer buttons */
                .mu-action-btn { transition: transform .15s ease, opacity .15s ease, box-shadow .15s ease; }
                .mu-action-btn:hover:not(:disabled) { transform: translateY(-1px); opacity: .92; }

                /* KPI cards */
                .mu-kpi-card { transition: all .25s cubic-bezier(.4,0,.2,1); cursor: pointer; }
                .mu-kpi-card:hover { transform: translateY(-3px); box-shadow: 0 14px 36px rgba(0,0,0,0.45) !important; }

                /* Offcanvas dark theme */
                .offcanvas {
                    background: #0c1628 !important;
                    border-left: 1px solid rgba(255,255,255,0.08) !important;
                    color: #f8fafc !important;
                    width: 440px !important;
                }
                .offcanvas-header { border-bottom: 1px solid rgba(255,255,255,0.08) !important; padding: 18px 24px !important; }
                .offcanvas-body   { padding: 24px !important; overflow-y: auto; }
                .offcanvas-title  { color: #f8fafc !important; }
                .offcanvas-header .btn-close { filter: invert(1) opacity(.55); }

                /* 3-dot menu */
                .mu-dot-btn {
                    width: 30px; height: 30px; border-radius: 8px;
                    background: transparent; border: 1px solid transparent;
                    color: #64748b; font-size: 18px; line-height: 1;
                    cursor: pointer; display: flex; align-items: center; justify-content: center;
                    transition: all .15s ease;
                }
                .mu-dot-btn:hover {
                    background: rgba(255,255,255,0.08);
                    border-color: rgba(255,255,255,0.1);
                    color: #f8fafc;
                }
                .mu-dropdown {
                    position: absolute; right: 0; top: 36px;
                    background: #1e293b;
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 12px;
                    box-shadow: 0 16px 40px rgba(0,0,0,0.55);
                    z-index: 200; min-width: 162px; overflow: hidden;
                    animation: fadeInRow .12s ease;
                }
                .mu-dropdown-item {
                    padding: 10px 16px; font-size: 13px; font-weight: 600;
                    cursor: pointer; display: flex; align-items: center; gap: 8px;
                    transition: background .12s ease;
                    border: none; background: transparent;
                    width: 100%; text-align: left; color: #f8fafc;
                }
                .mu-dropdown-item:hover:not(:disabled) { background: rgba(255,255,255,0.07); }
                .mu-dropdown-item:disabled { opacity: .6; cursor: default; background: rgba(255,255,255,0.04) !important; }

                /* Responsive grid */
                @media (max-width: 1100px) {
                    .mu-main-grid { grid-template-columns: 1fr !important; }
                    .mu-sidebar   { display: none !important; }
                }
                @media (max-width: 640px) {
                    .mu-toolbar { flex-direction: column !important; align-items: stretch !important; }
                    .mu-toolbar > div { min-width: 0 !important; }
                }

                /* Header create-buttons hover */
                .mu-create-btn { transition: all .18s ease; }
                .mu-create-btn:hover { filter: brightness(1.15); transform: translateY(-1px); }
            `}</style>

            <AdminHeader />

            <div style={{ padding: '18px 22px', flex: 1, overflowY: 'auto' }}>

                {/* ── Header bar ─────────────────────────────────────────── */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22,
                    background: 'rgba(15,23,42,0.85)', border: `1px solid ${THEME.border}`,
                    borderRadius: 18, padding: '14px 20px',
                    backdropFilter: 'blur(16px)', boxShadow: THEME.shadow,
                }}>
                    <button onClick={() => navigate(-1)} style={{
                        background: THEME.panelSoft, border: `1px solid ${THEME.border}`,
                        cursor: 'pointer', fontSize: 18, color: THEME.accentSoft,
                        width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'background .2s ease',
                    }}>&#8592;</button>
                    <div style={{ flex: 1 }}>
                        <h4 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: THEME.text, letterSpacing: '-.3px' }}>Manage Users</h4>
                        <p style={{ margin: 0, fontSize: 12, color: THEME.textMuted }}>User accounts, approvals &amp; permissions</p>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                        {isCentral && (<>
                            <button className="mu-create-btn" onClick={() => { setShowResearcher(true); setRMsg(null); }} style={{
                                background: 'rgba(103,232,249,0.08)', border: '1px solid rgba(103,232,249,0.25)',
                                color: THEME.accentSoft, borderRadius: 10, padding: '7px 14px',
                                cursor: 'pointer', fontSize: 12, fontWeight: 700,
                            }}>🔬 + Researcher</button>
                            <button className="mu-create-btn" onClick={() => { setShowMunAdmin(true); setMMsg(null); }} style={{
                                background: 'rgba(125,211,252,0.08)', border: '1px solid rgba(125,211,252,0.25)',
                                color: '#7dd3fc', borderRadius: 10, padding: '7px 14px',
                                cursor: 'pointer', fontSize: 12, fontWeight: 700,
                            }}>🛡️ + Mun. Admin</button>
                        </>)}
                        {!isCentral && (
                            <button className="mu-create-btn" onClick={() => { setShowAddFisher(true); setFMsg(null); }} style={{
                                background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.25)',
                                color: THEME.success, borderRadius: 10, padding: '7px 14px',
                                cursor: 'pointer', fontSize: 12, fontWeight: 700,
                            }}>🐟 + Add Fisher</button>
                        )}
                        <button onClick={fetchUsers} disabled={loading} className="mu-action-btn" style={{
                            background: 'linear-gradient(135deg, #38bdf8, #0284c7)',
                            border: 'none', fontWeight: 700, color: '#0f172a',
                            boxShadow: '0 4px 12px rgba(56,189,248,0.25)',
                            borderRadius: 10, padding: '7px 16px', cursor: 'pointer', fontSize: 12,
                        }}>
                            {loading ? <Spinner animation="border" size="sm" /> : '↻ Refresh'}
                        </button>
                    </div>
                </div>

                {/* ── KPI Cards ─────────────────────────────────────────── */}
                <div style={{ display: 'flex', gap: 10, marginBottom: 22, flexWrap: 'wrap' }}>
                    {[
                        { label: 'Total Users',  key: 'ALL',         color: THEME.accent,  icon: '👤', glow: '#38bdf8' },
                        { label: 'Pending',      key: 'PENDING',     color: THEME.warning, icon: '⏳', glow: '#f59e0b' },
                        { label: 'Approved',     key: 'APPROVED',    color: THEME.success, icon: '✅', glow: '#4ade80' },
                        { label: 'Declined',     key: 'DECLINED',    color: THEME.danger,  icon: '🚫', glow: '#f87171' },
                        { label: 'Deactivated',  key: 'DEACTIVATED', color: THEME.gray,    icon: '🔒', glow: '#475569' },
                    ].map(({ label, key, color, icon, glow }) => {
                        const active = statusFilter === key;
                        return (
                            <div key={key} className="mu-kpi-card"
                                onClick={() => setStatusFilter(statusFilter === key ? 'ALL' : key)}
                                style={{
                                    flex: '1 1 140px',
                                    background: active
                                        ? `linear-gradient(135deg, ${glow}1a, rgba(15,23,42,0.96))`
                                        : `linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))`,
                                    border: `1px solid ${active ? glow + '55' : THEME.border}`,
                                    borderRadius: 16, padding: '14px 16px',
                                    backdropFilter: 'blur(12px)',
                                    boxShadow: active ? `0 8px 28px ${glow}30` : '0 4px 14px rgba(0,0,0,0.2)',
                                    transform: active ? 'translateY(-2px)' : 'none',
                                    display: 'flex', alignItems: 'center', gap: 12,
                                }}>
                                <div style={{ fontSize: 26, flexShrink: 0, lineHeight: 1 }}>{icon}</div>
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ fontSize: 26, fontWeight: 900, color, lineHeight: 1, letterSpacing: '-1px' }}>{counts[key]}</div>
                                    <div style={{ fontSize: 11, color: THEME.textMuted, marginTop: 4, fontWeight: 700, letterSpacing: '.4px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{label}</div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* ── Main grid ─────────────────────────────────────────── */}
                <div className="mu-main-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, alignItems: 'start' }}>

                    {/* ── Left: toolbar + table ─────────────────────────── */}
                    <div>
                        {/* Toolbar */}
                        <div className="mu-toolbar" style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            gap: 12, marginBottom: 14, flexWrap: 'wrap',
                        }}>
                            <div style={{ display: 'flex', gap: 10, flex: 1, minWidth: 240, alignItems: 'center' }}>
                                <div style={{ position: 'relative', flex: 1 }}>
                                    <span style={{
                                        position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
                                        color: THEME.textMuted, fontSize: 13, pointerEvents: 'none',
                                    }}>🔍</span>
                                    <input type="text" placeholder="Search name, email, barangay…"
                                        value={search} onChange={e => setSearch(e.target.value)}
                                        className="form-control form-control-sm"
                                        style={{ paddingLeft: 32 }} />
                                </div>
                                <span style={{ fontSize: 12, color: THEME.textMuted, whiteSpace: 'nowrap', fontWeight: 600 }}>
                                    {sorted.length} result{sorted.length !== 1 ? 's' : ''}
                                </span>
                            </div>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {isCentral && (
                                    <select value={munFilter} onChange={e => setMunFilter(e.target.value)}
                                        className="form-select form-select-sm" style={{ width: 158 }}>
                                        <option value="ALL">All Municipalities</option>
                                        {MUNICIPALITIES.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                    </select>
                                )}
                                <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
                                    className="form-select form-select-sm" style={{ width: 130 }}>
                                    <option value="ALL">All Roles</option>
                                    <option value="fisher">Fisher</option>
                                    <option value="municipal_admin">Municipal Admin</option>
                                    {isCentral && <option value="researcher">Researcher</option>}
                                </select>
                                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                                    className="form-select form-select-sm" style={{ width: 130 }}>
                                    <option value="ALL">All Statuses</option>
                                    <option value="PENDING">Pending</option>
                                    <option value="APPROVED">Approved</option>
                                    <option value="DECLINED">Declined</option>
                                    <option value="DEACTIVATED">Deactivated</option>
                                </select>
                            </div>
                        </div>

                        {/* Table */}
                        {loading && allUsers.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '70px 0', color: THEME.textMuted }}>
                                <Spinner animation="border" style={{ color: THEME.accent, width: 36, height: 36 }} />
                                <p style={{ marginTop: 16, fontSize: 14, fontWeight: 600 }}>Loading users…</p>
                            </div>
                        ) : (
                            <div style={{
                                overflowX: 'auto', borderRadius: 18,
                                border: `1px solid ${THEME.border}`,
                                background: 'rgba(15,23,42,0.95)',
                                backdropFilter: 'blur(12px)', boxShadow: THEME.shadow,
                            }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                    <thead>
                                        <tr>
                                            <Th sortKey="name"         sortBy={sortBy} sortDir={sortDir} onSort={handleSort}>User</Th>
                                            {isCentral && <Th sortKey="municipalityId" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}>Municipality</Th>}
                                            <Th sortKey="barangayName" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}>Barangay</Th>
                                            <Th sortKey="role"         sortBy={sortBy} sortDir={sortDir} onSort={handleSort}>Role</Th>
                                            <Th sortKey="status"       sortBy={sortBy} sortDir={sortDir} onSort={handleSort}>Status</Th>
                                            <Th sortKey="createdAt"    sortBy={sortBy} sortDir={sortDir} onSort={handleSort}>Registered</Th>
                                            {!isCentral && (
                                                <th style={{
                                                    padding: '14px 12px', background: 'rgba(15,31,53,0.97)',
                                                    fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.6px',
                                                    color: THEME.textMuted, borderBottom: `1px solid ${THEME.border}`,
                                                    width: 1, whiteSpace: 'nowrap',
                                                }}>Actions</th>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sorted.length === 0 ? (
                                            <tr><td colSpan={isCentral ? 6 : 7}>
                                                <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                                                    <div style={{ fontSize: 46, marginBottom: 14 }}>🔍</div>
                                                    <h3 style={{ fontSize: 16, fontWeight: 700, color: THEME.text, margin: '0 0 8px' }}>No users found</h3>
                                                    <p style={{ color: THEME.textMuted, fontSize: 13, margin: '0 0 18px' }}>
                                                        Try adjusting your filters or search query.
                                                    </p>
                                                    <button onClick={clearFilters} style={{
                                                        background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.3)',
                                                        color: THEME.accent, borderRadius: 8, padding: '7px 20px',
                                                        cursor: 'pointer', fontSize: 12, fontWeight: 700,
                                                    }}>Clear Filters</button>
                                                </div>
                                            </td></tr>
                                        ) : sorted.map((u, i) => {
                                            const rs = ROLE_STYLE[u.role] || {
                                                icon: '👤', color: THEME.textMuted,
                                                bg: 'rgba(255,255,255,0.08)', label: u.role,
                                                gradient: 'linear-gradient(135deg,#475569,#334155)',
                                            };
                                            return (
                                                <tr key={u._id}
                                                    onClick={() => setSelected(selected?._id === u._id ? null : u)}
                                                    style={{
                                                        background: selected?._id === u._id
                                                            ? 'rgba(56,189,248,0.10)'
                                                            : i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.012)',
                                                        cursor: 'pointer',
                                                        borderBottom: `1px solid rgba(255,255,255,0.04)`,
                                                    }}>
                                                    {/* Avatar + name + email merged */}
                                                    <td style={{ padding: '14px 16px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                            <div style={{
                                                                width: 38, height: 38, borderRadius: '50%',
                                                                background: rs.gradient,
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                fontWeight: 800, color: '#fff', fontSize: 14, flexShrink: 0,
                                                                boxShadow: `0 2px 10px ${rs.color}30`,
                                                            }}>
                                                                {u.name?.charAt(0)?.toUpperCase() || '?'}
                                                            </div>
                                                            <div>
                                                                <div style={{ fontWeight: 700, color: THEME.text, fontSize: 13 }}>{u.name}</div>
                                                                <div style={{ fontSize: 11, color: THEME.textMuted, marginTop: 1 }}>{u.email}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    {isCentral && <td style={{ padding: '14px 16px', color: THEME.textMuted, fontSize: 13 }}>{munName(u.municipalityId)}</td>}
                                                    <td style={{ padding: '14px 16px', color: THEME.textMuted, fontSize: 13 }}>{u.barangayName || '—'}</td>
                                                    <td style={{ padding: '14px 16px' }}>
                                                        <span style={{
                                                            fontSize: 12, color: rs.color, background: rs.bg,
                                                            padding: '4px 11px', borderRadius: 20, fontWeight: 700,
                                                        }}>
                                                            {rs.icon} {rs.label}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '14px 16px' }}><StatusBadge status={u.status} /></td>
                                                    <td style={{ padding: '14px 16px', color: THEME.textMuted, whiteSpace: 'nowrap', fontSize: 13 }}>
                                                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                                                    </td>
                                                    {!isCentral && (
                                                        <td style={{ padding: '10px 12px' }} onClick={e => e.stopPropagation()}>
                                                            {u.role === 'fisher' ? (
                                                                actionLoading[u._id] ? (
                                                                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                                                                        <Spinner animation="border" size="sm" style={{ color: THEME.accent }} />
                                                                    </div>
                                                                ) : (
                                                                    <div style={{ display: 'flex', gap: 4 }}>
                                                                        {[
                                                                            { st: 'APPROVED',    icon: '✔', color: THEME.success, bg: 'rgba(74,222,128,0.15)',   activeBg: 'rgba(74,222,128,0.28)',  title: 'Approve'    },
                                                                            { st: 'DECLINED',    icon: '✖', color: THEME.danger,  bg: 'rgba(248,113,113,0.15)',  activeBg: 'rgba(248,113,113,0.28)', title: 'Decline'    },
                                                                            { st: 'DEACTIVATED', icon: '⊘', color: THEME.gray,    bg: 'rgba(71,85,105,0.20)',    activeBg: 'rgba(71,85,105,0.35)',   title: 'Deactivate' },
                                                                        ].map(({ st, icon, color, bg, activeBg, title }) => {
                                                                            const isCurrent = u.status === st;
                                                                            return (
                                                                                <button key={st}
                                                                                    title={title}
                                                                                    disabled={isCurrent}
                                                                                    onClick={() => st === 'APPROVED' ? handleStatusChange(u._id, st) : requestAction(u._id, st, u.name)}
                                                                                    style={{
                                                                                        width: 28, height: 28, borderRadius: 7,
                                                                                        border: isCurrent ? `1px solid ${color}55` : '1px solid transparent',
                                                                                        background: isCurrent ? activeBg : bg,
                                                                                        color, cursor: isCurrent ? 'default' : 'pointer',
                                                                                        fontSize: 13, fontWeight: 700,
                                                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                                        transition: 'all .15s ease',
                                                                                    }}>
                                                                                    {icon}
                                                                                </button>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                )
                                                            ) : (
                                                                <span style={{ color: THEME.gray, fontSize: 11 }}>—</span>
                                                            )}
                                                        </td>
                                                    )}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* ── Right sidebar: detail + chart (sticky) ────────── */}
                    <div className="mu-sidebar" style={{ position: 'sticky', top: 20 }}>

                        {selected ? (
                            <div style={{ ...glassCard, padding: 20, marginBottom: 14, fontSize: 13 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                                        {(() => {
                                            const rs = ROLE_STYLE[selected.role] || { gradient: 'linear-gradient(135deg,#475569,#334155)', color: THEME.textMuted };
                                            return (
                                                <div style={{
                                                    width: 46, height: 46, borderRadius: '50%', background: rs.gradient,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontWeight: 800, color: '#fff', fontSize: 18, flexShrink: 0,
                                                    boxShadow: `0 4px 14px ${rs.color}30`,
                                                }}>
                                                    {selected.name?.charAt(0)?.toUpperCase() || '?'}
                                                </div>
                                            );
                                        })()}
                                        <div style={{ minWidth: 0 }}>
                                            <div style={{ fontWeight: 800, fontSize: 15, color: THEME.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selected.name}</div>
                                            <div style={{ color: THEME.textMuted, fontSize: 11, marginTop: 2 }}>{selected.email}</div>
                                        </div>
                                    </div>
                                    <button onClick={() => setSelected(null)} style={{
                                        background: THEME.panelSoft, border: `1px solid ${THEME.border}`,
                                        cursor: 'pointer', fontSize: 12, color: THEME.textMuted,
                                        width: 28, height: 28, borderRadius: 7, flexShrink: 0, marginLeft: 8,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>✕</button>
                                </div>

                                <div style={{ marginBottom: 16 }}><StatusBadge status={selected.status} /></div>

                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <tbody>
                                        {[
                                            ['Role', (() => { const rs = ROLE_STYLE[selected.role]; return rs ? `${rs.icon} ${rs.label}` : selected.role; })()],
                                            isCentral ? ['Municipality', selected._isResearcher ? 'Central' : munName(selected.municipalityId)] : null,
                                            !selected._isResearcher ? ['Barangay',  selected.barangayName || '—'] : null,
                                            !selected._isResearcher ? ['Birthdate', selected.birthdate    || '—'] : null,
                                            ['Registered', selected.createdAt ? new Date(selected.createdAt).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'],
                                        ].filter(Boolean).map(([label, val]) => (
                                            <tr key={label} style={{ borderBottom: `1px solid ${THEME.border}` }}>
                                                <td style={{ padding: '8px 0', color: THEME.textMuted, width: 108, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px', whiteSpace: 'nowrap' }}>{label}</td>
                                                <td style={{ padding: '8px 0 8px 10px', fontWeight: 600, color: THEME.text, fontSize: 13 }}>{val}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                {selected.boat && (<>
                                    <div style={{ fontWeight: 700, fontSize: 12, marginTop: 16, marginBottom: 8, color: THEME.accentSoft, textTransform: 'uppercase', letterSpacing: '.5px' }}>Boat Details</div>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <tbody>
                                            {[
                                                ['Name',   selected.boat.boatName],
                                                ['Type',   selected.boat.boatType],
                                                ['Length', selected.boat.length ? `${selected.boat.length} m` : '—'],
                                                ['Engine', selected.boat.enginePower || '—'],
                                                ['Reg. #', selected.boat.registrationNumber || '—'],
                                            ].map(([label, val]) => (
                                                <tr key={label} style={{ borderBottom: `1px solid ${THEME.border}` }}>
                                                    <td style={{ padding: '8px 0', color: THEME.textMuted, width: 108, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px', whiteSpace: 'nowrap' }}>{label}</td>
                                                    <td style={{ padding: '8px 0 8px 10px', fontWeight: 600, color: THEME.text, fontSize: 13 }}>{val}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </>)}

                                {!isCentral && actionFeedback[selected._id] === 'error' && (
                                    <p style={{ color: THEME.danger, fontSize: 12, marginTop: 12 }}>Action failed. Try again.</p>
                                )}

                                {!isCentral && selected.role === 'fisher' && (
                                    <div style={{ display: 'flex', gap: 6, marginTop: 18, flexWrap: 'wrap' }}>
                                        {[
                                            { st: 'APPROVED',    label: '✔ Approve',    bg: `linear-gradient(135deg, ${THEME.success}, #16a394)`, tc: '#0a1d2d', glow: THEME.success },
                                            { st: 'DECLINED',    label: '✖ Decline',    bg: THEME.danger, tc: '#fff', glow: THEME.danger },
                                            { st: 'DEACTIVATED', label: '⊘ Deactivate', bg: 'rgba(107,114,128,0.4)', tc: '#ddd', glow: THEME.gray },
                                        ].map(({ st, label, bg, tc, glow }) => (
                                            <button key={st} className="mu-action-btn"
                                                disabled={selected.status === st || !!actionLoading[selected._id]}
                                                onClick={() => requestAction(selected._id, st, selected.name)}
                                                style={{
                                                    flex: 1, padding: '8px 4px', border: 'none', borderRadius: 8,
                                                    fontWeight: 700, fontSize: 11, minWidth: 0,
                                                    background: selected.status === st ? 'rgba(100,116,139,0.18)' : bg,
                                                    color: selected.status === st ? '#94a3b8' : tc,
                                                    cursor: selected.status === st ? 'default' : 'pointer',
                                                    boxShadow: selected.status !== st ? `0 4px 12px ${glow}25` : 'none',
                                                    border: selected.status === st ? '1px solid rgba(100,116,139,0.25)' : 'none',
                                                }}>
                                                {actionLoading[selected._id] ? <Spinner animation="border" size="sm" /> : label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div style={{
                                background: 'rgba(15,23,42,0.5)', borderRadius: 18,
                                border: `1px dashed ${THEME.border}`, padding: 36,
                                marginBottom: 14, textAlign: 'center',
                            }}>
                                <div style={{ fontSize: 34, marginBottom: 10 }}>👤</div>
                                <div style={{ fontWeight: 700, color: THEME.textMuted, fontSize: 13 }}>Click a row to inspect</div>
                                <div style={{ fontSize: 11, color: THEME.gray, marginTop: 5 }}>View profile, status, and boat info</div>
                            </div>
                        )}

                        {/* Chart */}
                        {chartData.length > 1 && (
                            <div style={{
                                background: 'rgba(10,24,36,0.95)', borderRadius: 18,
                                border: `1px solid ${THEME.border}`, padding: 16,
                                backdropFilter: 'blur(12px)', boxShadow: THEME.shadow,
                            }}>
                                <div style={{ marginBottom: 14 }}>
                                    <div style={{ fontSize: 14, fontWeight: 800, color: THEME.text }}>Fisher Distribution</div>
                                    <div style={{ fontSize: 11, color: THEME.textMuted, marginTop: 3 }}>
                                        {isCentral && munFilter === 'ALL' ? 'By Municipality' : 'By Barangay'}
                                        {' · '}{chartData.length - 1} {chartData.length - 1 === 1 ? 'area' : 'areas'}
                                    </div>
                                </div>
                                <Chart chartType="BarChart" data={chartData} width="100%"
                                    height={`${Math.min(220, 40 + (chartData.length - 1) * 24)}px`}
                                    options={{
                                        legend: 'none', backgroundColor: 'transparent',
                                        hAxis: { minValue: 0, textStyle: { color: '#94a3b8', fontSize: 10 }, gridlines: { color: 'rgba(255,255,255,0.05)' } },
                                        vAxis: { textStyle: { color: '#94a3b8', fontSize: 10 } },
                                        chartArea: { width: '58%', height: '85%' },
                                        bar: { groupWidth: '65%' },
                                        colors: [THEME.accent],
                                    }}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Confirmation dialog ───────────────────────────────────────── */}
            {pendingConfirm && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                    <div style={{ background: '#1e293b', border: `1px solid ${THEME.border}`, borderRadius: 18, padding: '24px 28px', maxWidth: 340, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.55)' }}>
                        <div style={{ fontWeight: 800, fontSize: 16, color: THEME.text, marginBottom: 8 }}>Confirm Action</div>
                        <p style={{ color: THEME.textMuted, fontSize: 13, lineHeight: 1.65, marginBottom: 22 }}>
                            Are you sure you want to{' '}
                            <strong style={{ color: pendingConfirm.color }}>{pendingConfirm.label.toLowerCase()}</strong>{' '}
                            <strong style={{ color: THEME.text }}>{pendingConfirm.userName}</strong>?
                            {pendingConfirm.status === 'DEACTIVATED' && (
                                <><br /><span style={{ fontSize: 12 }}>This will prevent them from logging in.</span></>
                            )}
                        </p>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button onClick={() => setPendingConfirm(null)} style={{
                                flex: 1, height: 38, borderRadius: 10,
                                border: `1px solid ${THEME.border}`, background: 'transparent',
                                color: THEME.textMuted, cursor: 'pointer', fontWeight: 700, fontSize: 13,
                            }}>Cancel</button>
                            <button onClick={() => { handleStatusChange(pendingConfirm.userId, pendingConfirm.status); setPendingConfirm(null); }} style={{
                                flex: 1, height: 38, borderRadius: 10, border: 'none',
                                background: pendingConfirm.color,
                                color: pendingConfirm.status === 'DECLINED' ? '#fff' : '#f8fafc',
                                cursor: 'pointer', fontWeight: 700, fontSize: 13,
                            }}>{pendingConfirm.label}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Offcanvas: Create Researcher ──────────────────────────────── */}
            <Offcanvas show={showResearcher} placement="end" onHide={() => setShowResearcher(false)}>
                <Offcanvas.Header closeButton>
                    <Offcanvas.Title>🔬 Create Researcher Account</Offcanvas.Title>
                </Offcanvas.Header>
                <Offcanvas.Body>
                    <p style={{ fontSize: 13, color: THEME.textMuted, marginBottom: 22, lineHeight: 1.65 }}>
                        Researcher accounts have read-only access to anonymized data and can download CSVs and images.
                    </p>
                    {rMsg && <div style={msgBox(rMsg.type)}><span style={{ flexShrink: 0 }}>{rMsg.type === 'success' ? '✓' : '⚠'}</span>{rMsg.text}</div>}
                    <form onSubmit={createResearcher}>
                        <Field label="Full Name *">
                            <input type="text" placeholder="e.g. Dr. Juan dela Cruz" required value={rName} onChange={e => setRName(e.target.value)} className="form-control" />
                        </Field>
                        <Field label="Email Address *">
                            <input type="email" placeholder="researcher@example.com" required value={rEmail} onChange={e => setREmail(e.target.value)} className="form-control" />
                        </Field>
                        <Field label="Password *">
                            <input type="password" placeholder="Minimum 6 characters" required minLength={6} value={rPass} onChange={e => setRPass(e.target.value)} className="form-control" />
                        </Field>
                        <button type="submit" disabled={rLoading} className="mu-action-btn" style={drawerBtn('#67e8f9')}>
                            {rLoading ? <Spinner animation="border" size="sm" /> : '🔬 Create Researcher Account'}
                        </button>
                    </form>
                </Offcanvas.Body>
            </Offcanvas>

            {/* ── Offcanvas: Create Municipal Admin ─────────────────────────── */}
            <Offcanvas show={showMunAdmin} placement="end" onHide={() => setShowMunAdmin(false)}>
                <Offcanvas.Header closeButton>
                    <Offcanvas.Title>🛡️ Create Municipal Admin</Offcanvas.Title>
                </Offcanvas.Header>
                <Offcanvas.Body>
                    <p style={{ fontSize: 13, color: THEME.textMuted, marginBottom: 22, lineHeight: 1.65 }}>
                        Municipal admin accounts are created directly on the selected municipality's server. The server must be running.
                    </p>
                    {mMsg && <div style={msgBox(mMsg.type)}><span style={{ flexShrink: 0 }}>{mMsg.type === 'success' ? '✓' : '⚠'}</span>{mMsg.text}</div>}
                    <form onSubmit={createMunAdmin}>
                        <SectionLabel>Location</SectionLabel>
                        <PSGCSelector onChange={setMPsgc} showBarangay={false} />
                        {mPsgc.munCityName && !mPsgc.isActive && (
                            <p style={{ color: THEME.danger, fontSize: 12, margin: '-4px 0 14px' }}>⚠ No active server for {mPsgc.munCityName}.</p>
                        )}
                        {mPsgc.isActive && (
                            <p style={{ color: THEME.success, fontSize: 12, margin: '-4px 0 14px' }}>✓ Connected: {mPsgc.serverUrl}</p>
                        )}
                        <SectionLabel>Account Info</SectionLabel>
                        <Field label="Full Name *">
                            <input type="text" placeholder="e.g. Juan dela Cruz" required value={mName} onChange={e => setMName(e.target.value)} className="form-control" />
                        </Field>
                        <Field label="Email Address *">
                            <input type="email" placeholder="admin@municipality.gov.ph" required value={mEmail} onChange={e => setMEmail(e.target.value)} className="form-control" />
                        </Field>
                        <Field label="Password * (8+ chars)">
                            <input type="password" placeholder="Minimum 8 characters" required minLength={8} value={mPass} onChange={e => setMPass(e.target.value)} className="form-control" />
                        </Field>
                        <button type="submit" disabled={mLoading} className="mu-action-btn" style={drawerBtn('#7dd3fc')}>
                            {mLoading ? <Spinner animation="border" size="sm" /> : '🛡️ Create Municipal Admin'}
                        </button>
                    </form>
                </Offcanvas.Body>
            </Offcanvas>

            {/* ── Offcanvas: Add Fisher ──────────────────────────────────────── */}
            <Offcanvas show={showAddFisher} placement="end" onHide={() => setShowAddFisher(false)}>
                <Offcanvas.Header closeButton>
                    <Offcanvas.Title>🐟 Add Fisher Account</Offcanvas.Title>
                </Offcanvas.Header>
                <Offcanvas.Body>
                    <p style={{ fontSize: 13, color: THEME.textMuted, marginBottom: 22, lineHeight: 1.65 }}>
                        Creates a fisher account directly as Approved. Fields marked * are required.
                    </p>
                    {fMsg && <div style={msgBox(fMsg.type)}><span style={{ flexShrink: 0 }}>{fMsg.type === 'success' ? '✓' : '⚠'}</span>{fMsg.text}</div>}
                    <form onSubmit={createFisher}>
                        <SectionLabel>Account Info</SectionLabel>
                        <Field label="Full Name *">
                            <input type="text" placeholder="Fisher's full name" required value={fName} onChange={e => setFName(e.target.value)} className="form-control" />
                        </Field>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                            <Field label="Email *">
                                <input type="email" placeholder="Email address" required value={fEmail} onChange={e => setFEmail(e.target.value)} className="form-control" />
                            </Field>
                            <Field label="Password * (6+)">
                                <input type="password" placeholder="Min. 6 characters" required minLength={6} value={fPass} onChange={e => setFPass(e.target.value)} className="form-control" />
                            </Field>
                        </div>
                        <Field label="Birthdate (optional)">
                            <input type="date" value={fBirthdate} onChange={e => setFBirthdate(e.target.value)} className="form-control" max={new Date().toISOString().split('T')[0]} />
                        </Field>

                        <SectionLabel>Location</SectionLabel>
                        <Field label="Barangay *">
                            <select value={fBarangayCode} required className="form-select"
                                onChange={e => {
                                    const b = fBarangayList.find(x => x.brgy_code === e.target.value);
                                    setFBarangayCode(e.target.value);
                                    setFBarangay(b?.name || '');
                                }}>
                                <option value="">— Select Barangay —</option>
                                {fBarangayList.map(b => <option key={b.brgy_code} value={b.brgy_code}>{b.name}</option>)}
                            </select>
                        </Field>

                        <SectionLabel>Boat Details</SectionLabel>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                            <Field label="Boat Name *">
                                <input type="text" placeholder="Vessel name" required value={fBoatName} onChange={e => setFBoatName(e.target.value)} className="form-control" />
                            </Field>
                            <Field label="Boat Type">
                                <select value={fBoatType} onChange={e => setFBoatType(e.target.value)} className="form-select">
                                    <option value="">— Select Boat Type —</option>
                                    <option value="Motorized">Motorized</option>
                                    <option value="Non-Motorized">Non-Motorized</option>
                                    <option value="Sail">Sail</option>
                                </select>
                            </Field>
                            <Field label="Length (m)">
                                <input type="number" placeholder="0.0" value={fLength} onChange={e => setFLength(e.target.value)} className="form-control" min="0" step="0.1" />
                            </Field>
                            <Field label="Engine Power">
                                <input type="text" placeholder="e.g. 16HP" value={fEnginePower} onChange={e => setFEnginePower(e.target.value)} className="form-control" />
                            </Field>
                        </div>
                        <Field label="Registration Number">
                            <input type="text" placeholder="Boat registration number" value={fRegNumber} onChange={e => setFRegNumber(e.target.value)} className="form-control" />
                        </Field>
                        <button type="submit" disabled={fLoading} className="mu-action-btn" style={drawerBtn('#4ade80')}>
                            {fLoading ? <Spinner animation="border" size="sm" /> : '🐟 Create Fisher Account'}
                        </button>
                    </form>
                </Offcanvas.Body>
            </Offcanvas>
        </div>
    );
};

export default ManageUsers;
