import React from 'react';
import { C } from './theme';

const DashboardCard = ({ title, children, style = {} }) => (
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

export default DashboardCard;
