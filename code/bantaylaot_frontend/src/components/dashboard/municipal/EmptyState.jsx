import React from 'react';
import { C } from './theme';

const EmptyState = ({ message }) => (
    <div style={{ textAlign: 'center', padding: '40px 20px', color: C.muted }}>
        <div style={{ fontSize: 42 }}>📭</div>
        <div style={{ fontWeight: 600, marginTop: 10, color: C.subtext, fontSize: 14 }}>No data available</div>
        <div style={{ fontSize: 13, marginTop: 4 }}>{message || 'Try changing filters or selecting another date.'}</div>
    </div>
);

export default EmptyState;
