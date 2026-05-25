// Deep Marine design tokens
export const C = {
    bg:          '#0f172a',
    sidebar:     '#111c34',
    card:        '#172554',
    cardGlass:   'rgba(255,255,255,0.04)',
    primary:     '#38bdf8',
    primaryDark: '#0284c7',
    primarySoft: '#0c4a6e',
    teal:        '#2dd4bf',
    cyan:        '#67e8f9',
    danger:      '#f87171',
    dangerSoft:  '#7f1d1d',
    success:     '#4ade80',
    text:        '#f8fafc',
    subtext:     '#cbd5e1',
    muted:       '#94a3b8',
    border:      'rgba(255,255,255,0.08)',
    font:        'Inter, system-ui, -apple-system, sans-serif',
};

export const GEARS = ['Surface Gill Net', 'Bottom Set Gill Net', 'Hook And Line'];

export const selectStyle = {
    borderRadius: 10,
    border: `1px solid ${C.border}`,
    padding: '8px 10px',
    fontSize: 13,
    width: '100%',
    color: C.text,
    background: '#1e293b',
    outline: 'none',
};

export const PIE_OPTIONS = () => ({
    pieHole: 0.4,
    legend: { position: 'bottom', textStyle: { color: C.subtext, fontSize: 11 } },
    backgroundColor: 'transparent',
    chartArea: { width: '85%', height: '70%' },
    pieSliceBorderColor: 'transparent',
});

export const BAR_OPTIONS = (extra = {}) => ({
    legend: 'none',
    backgroundColor: 'transparent',
    hAxis: {
        minValue: 0, format: '0',
        gridlines: { count: 4, color: 'rgba(255,255,255,0.06)' },
        textStyle: { color: C.muted, fontSize: 10 },
    },
    vAxis: { textStyle: { color: C.subtext, fontSize: 9 }, maxAlternation: 1 },
    bar: { groupWidth: '65%' },
    ...extra,
});

export const fishCatchChartData = (items) => {
    if (!items || !items.length) return [['Species', 'Weight'], ['No data', 1]];
    return [['Species', 'Weight'], ...items.map(i => [i.species, i.weight])];
};
