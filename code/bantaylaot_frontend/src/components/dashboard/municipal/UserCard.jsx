import React, { useState } from 'react';
import { C } from './theme';
import Initials from './Initials';

const UserCard = ({ user, onClick, accentColor = C.primary, badge }) => {
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
            <span style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: C.text }}>{user.name}</div>
                {user.boatName && <div style={{ fontSize: 12, color: C.muted }}>⛵ {user.boatName}</div>}
                <div style={{ fontSize: 11, color: C.muted }}>{user.barangayName}</div>
            </span>
            <span style={{
                background: accentColor + '22', color: accentColor,
                border: `1px solid ${accentColor}44`,
                borderRadius: 10, padding: '3px 10px', fontSize: 12, fontWeight: 700,
            }}>
                {badge}
            </span>
        </button>
    );
};

export default UserCard;
