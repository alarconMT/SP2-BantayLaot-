import React from 'react';
import { C } from './theme';

const FilterBox = ({ children }) => (
    <div style={{
        background: C.cardGlass,
        backdropFilter: 'blur(12px)',
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        padding: '12px 14px',
        marginBottom: 14,
    }}>
        {children}
    </div>
);

export default FilterBox;
