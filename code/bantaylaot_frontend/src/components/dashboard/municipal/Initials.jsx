import React from 'react';
import { C } from './theme';

const Initials = ({ name, color = C.primary }) => {
    const letters = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    return (
        <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: color + '22', color, fontWeight: 700, fontSize: 13,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            border: `1px solid ${color}44`,
        }}>
            {letters}
        </div>
    );
};

export default Initials;
