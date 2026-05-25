import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const SERVERS = [
    'https://bantaylaot-production.up.railway.app',
    'http://localhost:3001',
    'http://localhost:3002',
];

const Login = () => {
    const [email,    setEmail]    = useState('');
    const [password, setPassword] = useState('');
    const [error,    setError]    = useState('');
    const [loading,  setLoading]  = useState(false);

    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        for (const serverUrl of SERVERS) {
            try {
                const response = await fetch(`${serverUrl}/api/auth/login`, {
                    method:  'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body:    JSON.stringify({ email, password }),
                });
                const data = await response.json();

                if (response.ok) {
                    if (data.role === 'fisher') {
                        setError('Fisher accounts cannot access the web dashboard.');
                        setLoading(false);
                        return;
                    }
                    localStorage.setItem('jwt_token',      data.token);
                    localStorage.setItem('userId',         data.userId);
                    localStorage.setItem('municipalityId', data.municipalityId);
                    localStorage.setItem('role',           data.role);
                    localStorage.setItem('adminName',      data.name || '');
                    localStorage.setItem('server_url',     serverUrl);
                    setLoading(false);
                    navigate('/home');
                    return;
                }

                if (response.status === 401) {
                    setError(data.message || 'Invalid email or password.');
                    setLoading(false);
                    return;
                }
            } catch {
                // server offline — try next
            }
        }

        setError('Account not found. Contact your administrator.');
        setLoading(false);
    };

    return (
        <div style={{
            display: 'flex', minHeight: '100vh',
            background: '#060f1e',
            fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
            overflow: 'hidden',
        }}>
            <style>{`
                @keyframes bl-float {
                    0%, 100% { transform: translateY(0px) rotate(-1.5deg); }
                    50%       { transform: translateY(-20px) rotate(1.5deg); }
                }
                @keyframes bl-wave1 {
                    from { transform: translateX(0); }
                    to   { transform: translateX(-50%); }
                }
                @keyframes bl-wave2 {
                    from { transform: translateX(-50%); }
                    to   { transform: translateX(0); }
                }
                @keyframes bl-glow {
                    0%, 100% { opacity: .35; transform: scale(1); }
                    50%       { opacity: .65; transform: scale(1.06); }
                }
                @keyframes bl-fadeUp {
                    from { opacity: 0; transform: translateY(18px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes bl-drift {
                    0%   { transform: translate(0, 0) rotate(var(--r)); }
                    33%  { transform: translate(6px, -8px) rotate(calc(var(--r) + 4deg)); }
                    66%  { transform: translate(-4px, 5px) rotate(calc(var(--r) - 3deg)); }
                    100% { transform: translate(0, 0) rotate(var(--r)); }
                }
                @keyframes bl-spin {
                    to { transform: rotate(360deg); }
                }
                .bl-hero    { animation: bl-fadeUp .7s .05s ease both; }
                .bl-form    { animation: bl-fadeUp .7s .18s ease both; }
                .bl-input {
                    width: 100%; padding: 12px 15px;
                    background: rgba(255,255,255,0.055);
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 11px;
                    color: #f8fafc; font-size: 14px;
                    outline: none; box-sizing: border-box;
                    transition: border-color .2s ease, box-shadow .2s ease, background .2s ease;
                    font-family: inherit;
                    color-scheme: dark;
                }
                .bl-input::placeholder { color: #3d5470; }
                .bl-input:focus {
                    border-color: #38bdf8;
                    box-shadow: 0 0 0 3px rgba(56,189,248,0.15);
                    background: rgba(255,255,255,0.08);
                }
                input:-webkit-autofill, input:-webkit-autofill:focus {
                    -webkit-box-shadow: 0 0 0 1000px #13243d inset !important;
                    -webkit-text-fill-color: #f8fafc !important;
                    caret-color: #f8fafc;
                }
                .bl-btn {
                    transition: transform .2s ease, box-shadow .2s ease;
                }
                .bl-btn:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 10px 28px rgba(56,189,248,0.42) !important;
                }
                .bl-btn:active:not(:disabled) {
                    transform: translateY(0);
                }
                .bl-pill {
                    transition: background .2s ease, border-color .2s ease;
                }
                .bl-pill:hover {
                    background: rgba(56,189,248,0.14) !important;
                    border-color: rgba(56,189,248,0.35) !important;
                }
                @media (max-width: 768px) {
                    .bl-left  { display: none !important; }
                    .bl-right { width: 100% !important; }
                }
            `}</style>

            {/* ── Left: ocean / brand panel ─────────────────────────────── */}
            <div className="bl-left" style={{
                flex: 1,
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(175deg, #0d2d5e 0%, #0a1e40 30%, #071428 65%, #060f1e 100%)',
                padding: '48px 44px',
            }}>
                {/* Dot-grid texture */}
                <div style={{
                    position: 'absolute', inset: 0, pointerEvents: 'none',
                    backgroundImage: 'radial-gradient(rgba(56,189,248,0.07) 1px, transparent 1px)',
                    backgroundSize: '28px 28px',
                }} />

                {/* Glow orbs */}
                <div style={{
                    position: 'absolute', top: '18%', left: '18%',
                    width: 420, height: 420, borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(56,189,248,0.13) 0%, transparent 70%)',
                    animation: 'bl-glow 6s ease-in-out infinite',
                    pointerEvents: 'none',
                }} />
                <div style={{
                    position: 'absolute', bottom: '22%', right: '12%',
                    width: 280, height: 280, borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(45,212,191,0.09) 0%, transparent 70%)',
                    animation: 'bl-glow 8s ease-in-out infinite 1.2s',
                    pointerEvents: 'none',
                }} />

                {/* Drifting fish icons */}
                {[
                    { top: '10%', left: '7%',   size: 26, opacity: .13, r: '12deg',  dur: '11s' },
                    { top: '60%', left: '6%',   size: 19, opacity: .09, r: '-8deg',  dur: '14s' },
                    { top: '25%', right: '7%',  size: 22, opacity: .11, r: '20deg',  dur: '9s'  },
                    { top: '72%', right: '8%',  size: 17, opacity: .08, r: '-15deg', dur: '13s' },
                    { top: '46%', left: '14%',  size: 14, opacity: .07, r: '5deg',   dur: '16s' },
                    { top: '38%', right: '15%', size: 15, opacity: .07, r: '-18deg', dur: '12s' },
                ].map((f, i) => (
                    <img key={i} src="/fish-icon.png" alt=""
                        style={{
                            position: 'absolute',
                            top: f.top, left: f.left, right: f.right,
                            width: f.size, height: f.size,
                            opacity: f.opacity,
                            filter: 'brightness(0) invert(1) sepia(1) saturate(3) hue-rotate(175deg)',
                            animation: `bl-drift ${f.dur} ease-in-out infinite`,
                            '--r': f.r,
                            pointerEvents: 'none',
                        }} />
                ))}

                {/* Location pin accent */}
                <img src="/location-icon.png" alt=""
                    style={{
                        position: 'absolute', bottom: '30%', left: '22%',
                        width: 22, opacity: .12,
                        filter: 'brightness(0) invert(1) sepia(1) saturate(2) hue-rotate(155deg)',
                        pointerEvents: 'none',
                        animation: 'bl-drift 15s ease-in-out infinite 2s',
                        '--r': '0deg',
                    }} />

                {/* Wave layers */}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 110, overflow: 'hidden', pointerEvents: 'none' }}>
                    <div style={{
                        position: 'absolute', bottom: -6, left: 0,
                        width: '200%', height: 80,
                        background: 'rgba(56,189,248,0.065)',
                        borderRadius: '45% 55% 0 0',
                        animation: 'bl-wave1 10s linear infinite',
                    }} />
                    <div style={{
                        position: 'absolute', bottom: -4, left: 0,
                        width: '200%', height: 55,
                        background: 'rgba(56,189,248,0.04)',
                        borderRadius: '55% 45% 0 0',
                        animation: 'bl-wave2 14s linear infinite',
                    }} />
                    <div style={{
                        position: 'absolute', bottom: -2, left: 0,
                        width: '200%', height: 30,
                        background: 'rgba(103,232,249,0.028)',
                        borderRadius: '40% 60% 0 0',
                        animation: 'bl-wave1 18s linear infinite reverse',
                    }} />
                </div>

                {/* Hero content */}
                <div className="bl-hero" style={{ position: 'relative', textAlign: 'center' }}>
                    {/* Floating sailboat */}
                    <div style={{
                        animation: 'bl-float 5.5s ease-in-out infinite',
                        display: 'inline-block', marginBottom: 30,
                    }}>
                        <img src="/sailboat.png" alt="BantayLaot vessel"
                            style={{
                                width: 200, height: 200,
                                objectFit: 'contain',
                                filter: 'drop-shadow(0 0 36px rgba(56,189,248,0.5)) drop-shadow(0 8px 16px rgba(0,0,0,0.5)) brightness(1.1)',
                            }} />
                    </div>

                    <h1 style={{
                        fontSize: 48, fontWeight: 900, color: '#f8fafc',
                        margin: '0 0 8px', letterSpacing: '-2px',
                        textShadow: '0 2px 24px rgba(56,189,248,0.45)',
                    }}>
                        BantayLaot+
                    </h1>
                    <p style={{
                        fontSize: 14, fontWeight: 700, letterSpacing: '2px',
                        color: '#38bdf8', margin: '0 0 12px',
                        textTransform: 'uppercase',
                    }}>
                        Fishing Vessel Monitoring
                    </p>
                    <p style={{
                        fontSize: 13, color: '#475569', margin: '0 auto 32px',
                        maxWidth: 340, lineHeight: 1.75,
                    }}>
                        Real-time tracking of fishing activities, vessel management, and coastal data analytics for municipal administrators.
                    </p>

                    {/* Feature pills */}
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                        {[
                            { icon: '🐟', text: 'Fisher Registry' },
                            { icon: '📍', text: 'Live Tracking'   },
                            { icon: '📊', text: 'Analytics'       },
                        ].map(({ icon, text }) => (
                            <span key={text} className="bl-pill" style={{
                                padding: '6px 15px',
                                background: 'rgba(56,189,248,0.07)',
                                border: '1px solid rgba(56,189,248,0.18)',
                                borderRadius: 99, fontSize: 12,
                                color: '#67e8f9', fontWeight: 600,
                                cursor: 'default',
                            }}>
                                {icon} {text}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Right: login form ──────────────────────────────────────── */}
            <div className="bl-right" style={{
                width: 450,
                flexShrink: 0,
                background: '#0a1628',
                borderLeft: '1px solid rgba(255,255,255,0.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '48px 42px',
                position: 'relative',
            }}>
                {/* Subtle top-right glow */}
                <div style={{
                    position: 'absolute', top: -60, right: -60,
                    width: 260, height: 260, borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(56,189,248,0.07) 0%, transparent 70%)',
                    pointerEvents: 'none',
                }} />

                <div className="bl-form" style={{ width: '100%', position: 'relative' }}>
                    {/* Logo + wordmark */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
                        <div style={{
                            width: 42, height: 42, borderRadius: 12,
                            background: 'rgba(56,189,248,0.12)',
                            border: '1px solid rgba(56,189,248,0.25)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                        }}>
                            <img src="/sailboat.png" alt=""
                                style={{
                                    width: 26, height: 26, objectFit: 'contain',
                                    filter: 'drop-shadow(0 0 6px rgba(56,189,248,0.7))',
                                }} />
                        </div>
                        <div>
                            <div style={{ fontSize: 17, fontWeight: 800, color: '#f8fafc', letterSpacing: '-.3px', lineHeight: 1.1 }}>BantayLaot+</div>
                            <div style={{ fontSize: 11, color: '#475569', fontWeight: 600, letterSpacing: '.3px' }}>Admin Portal</div>
                        </div>
                    </div>

                    {/* Heading */}
                    <div style={{ marginBottom: 28 }}>
                        <h2 style={{ margin: '0 0 6px', fontSize: 28, fontWeight: 800, color: '#f8fafc', letterSpacing: '-.6px' }}>
                            Welcome back
                        </h2>
                        <p style={{ margin: 0, fontSize: 14, color: '#475569', lineHeight: 1.5 }}>
                            Sign in to access the dashboard
                        </p>
                    </div>

                    {/* Error banner */}
                    {error && (
                        <div style={{
                            background: 'rgba(248,113,113,0.09)',
                            color: '#f87171',
                            border: '1px solid rgba(248,113,113,0.22)',
                            padding: '11px 14px', borderRadius: 10,
                            marginBottom: 22, fontSize: 13, fontWeight: 500,
                            display: 'flex', alignItems: 'center', gap: 8,
                        }}>
                            <span style={{ fontSize: 15, flexShrink: 0 }}>⚠</span>
                            {error}
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleLogin}>
                        <div style={{ marginBottom: 18 }}>
                            <label style={{
                                display: 'block', marginBottom: 7,
                                fontSize: 11, fontWeight: 700, color: '#64748b',
                                textTransform: 'uppercase', letterSpacing: '.55px',
                            }}>Email Address</label>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                                className="bl-input"
                                placeholder="admin@example.com"
                                autoComplete="email"
                            />
                        </div>

                        <div style={{ marginBottom: 30 }}>
                            <label style={{
                                display: 'block', marginBottom: 7,
                                fontSize: 11, fontWeight: 700, color: '#64748b',
                                textTransform: 'uppercase', letterSpacing: '.55px',
                            }}>Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                                className="bl-input"
                                placeholder="Enter your password"
                                autoComplete="current-password"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="bl-btn"
                            style={{
                                width: '100%',
                                padding: '14px',
                                background: loading
                                    ? 'rgba(56,189,248,0.35)'
                                    : 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)',
                                color: loading ? 'rgba(255,255,255,0.4)' : '#071428',
                                border: 'none',
                                borderRadius: 11,
                                fontSize: 15,
                                fontWeight: 800,
                                letterSpacing: '.2px',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                boxShadow: loading ? 'none' : '0 4px 18px rgba(56,189,248,0.3)',
                                fontFamily: 'inherit',
                            }}
                        >
                            {loading ? (
                                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                    <span style={{
                                        width: 14, height: 14, borderRadius: '50%',
                                        border: '2px solid rgba(255,255,255,0.25)',
                                        borderTopColor: 'rgba(255,255,255,0.75)',
                                        display: 'inline-block',
                                        animation: 'bl-spin .65s linear infinite',
                                    }} />
                                    Signing in…
                                </span>
                            ) : 'Sign In →'}
                        </button>
                    </form>

                    {/* Divider + note */}
                    <div style={{ marginTop: 32, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 22 }}>
                        <p style={{ margin: 0, fontSize: 12, color: '#2d3f56', textAlign: 'center', lineHeight: 1.8 }}>
                            Fisher accounts use the mobile app only.<br />
                            <span style={{ color: '#334155' }}>Contact your administrator for access issues.</span>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
