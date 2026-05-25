import React from 'react';
import { C } from './theme';

const BackBtn = ({ onClick }) => (
    <button onClick={onClick} style={{
        background: C.primarySoft,
        border: `1px solid ${C.primary}44`,
        borderRadius: 10,
        cursor: 'pointer',
        color: C.primary,
        fontSize: 13,
        fontWeight: 600,
        marginBottom: 14,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '7px 14px',
        fontFamily: C.font,
        transition: 'all 0.15s ease',
    }}>
        &#8592; Back to list
    </button>
);

export default BackBtn;
