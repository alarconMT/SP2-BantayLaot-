import React from 'react';

const StatCard = ({ label, value, gradient, icon }) => (
    <div style={{
        borderRadius: 16,
        padding: '16px 18px',
        background: gradient,
        boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
        position: 'relative',
        overflow: 'hidden',
    }}>
        {icon && (
            <div style={{ position: 'absolute', right: 14, top: 12, fontSize: 30, opacity: 0.45 }}>{icon}</div>
        )}
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 600, marginBottom: 6, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            {label}
        </div>
        <div style={{ fontSize: 30, fontWeight: 800, color: '#fff', lineHeight: 1 }}>{value}</div>
    </div>
);

export default StatCard;
