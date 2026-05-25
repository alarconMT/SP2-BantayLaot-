import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const AdminSetup = () => {
    const [name,     setName]     = useState('');
    const [email,    setEmail]    = useState('');
    const [password, setPassword] = useState('');
    const [confirm,  setConfirm]  = useState('');
    const [loading,  setLoading]  = useState(false);
    const [error,    setError]    = useState('');
    const [success,  setSuccess]  = useState('');

    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (password !== confirm) {
            setError('Passwords do not match.');
            return;
        }
        if (password.length < 8) {
            setError('Password must be at least 8 characters.');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch('https://bantaylaot-production.up.railway.app/api/auth/admin-setup', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    email,
                    password,
                    role:           'central_admin',
                    municipalityId: 'central',
                })
            });

            const data = await response.json();
            if (response.ok) {
                setSuccess('Central admin account created successfully!');
                setTimeout(() => navigate('/login'), 2000);
            } else {
                setError(data.message || 'Setup failed.');
            }
        } catch (err) {
            setError('Cannot connect to server.');
        } finally {
            setLoading(false);
        }
    };

    const inputStyle = {
        width: '100%', padding: '10px 12px',
        border: '1px solid #ddd', borderRadius: '4px',
        fontSize: '14px', boxSizing: 'border-box'
    };

    return (
        <div style={{
            display: 'flex', justifyContent: 'center',
            alignItems: 'center', minHeight: '100vh',
            backgroundColor: '#f0f2f5'
        }}>
            <div style={{
                background: 'white', padding: '40px',
                borderRadius: '8px', width: '460px',
                boxShadow: '0 2px 12px rgba(0,0,0,0.1)'
            }}>
                <h2 style={{ marginBottom: '4px' }}>BantayLaot+</h2>
                <p style={{ color: '#666', marginBottom: '8px', fontSize: '14px' }}>
                    Central Admin Setup
                </p>
                <p style={{ color: '#999', marginBottom: '24px', fontSize: '12px' }}>
                    Create the central administrator account. This can only be done once.
                </p>

                {error && (
                    <div style={{
                        background: '#fff0f0', color: '#c00',
                        padding: '10px 14px', borderRadius: '4px',
                        marginBottom: '16px', fontSize: '14px'
                    }}>
                        {error}
                    </div>
                )}

                {success && (
                    <div style={{
                        background: '#f0fff0', color: '#090',
                        padding: '10px 14px', borderRadius: '4px',
                        marginBottom: '16px', fontSize: '14px'
                    }}>
                        {success} Redirecting to login...
                    </div>
                )}

                {!success && (
                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                                Full Name
                            </label>
                            <input
                                type="text" value={name}
                                onChange={e => setName(e.target.value)}
                                required style={inputStyle}
                                placeholder="Enter full name"
                            />
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                                Email
                            </label>
                            <input
                                type="email" value={email}
                                onChange={e => setEmail(e.target.value)}
                                required style={inputStyle}
                                placeholder="Enter email address"
                            />
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                                Password
                            </label>
                            <input
                                type="password" value={password}
                                onChange={e => setPassword(e.target.value)}
                                required style={inputStyle}
                                placeholder="At least 8 characters"
                            />
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                                Confirm Password
                            </label>
                            <input
                                type="password" value={confirm}
                                onChange={e => setConfirm(e.target.value)}
                                required style={inputStyle}
                                placeholder="Repeat password"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                width: '100%', padding: '12px',
                                background: loading ? '#999' : '#007AFF',
                                color: 'white', border: 'none',
                                borderRadius: '4px', fontSize: '15px',
                                cursor: loading ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {loading ? 'Creating account...' : 'Create Admin Account'}
                        </button>
                    </form>
                )}

                <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: '#999' }}>
                    Already have an account?{' '}
                    <span
                        style={{ color: '#007AFF', cursor: 'pointer' }}
                        onClick={() => navigate('/login')}
                    >
                        Sign In
                    </span>
                </p>
            </div>
        </div>
    );
};

export default AdminSetup;
