import React from 'react';
import { C } from './theme';

const Spinner = () => (
    <div style={{ textAlign: 'center', padding: '32px 0' }}>
        <div style={{
            width: 28, height: 28, borderRadius: '50%', margin: '0 auto',
            border: `3px solid ${C.border}`,
            borderTop: `3px solid ${C.primary}`,
            animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
);

export default Spinner;
