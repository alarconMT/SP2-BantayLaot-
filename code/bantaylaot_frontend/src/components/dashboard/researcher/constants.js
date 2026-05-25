export const CENTRAL_URL = 'https://bantaylaot-production.up.railway.app';
export const R_URL       = `${CENTRAL_URL}/api/researcher`;

export const MUN_SERVERS = {
    '104305000': 'http://localhost:3001',
    '104321000': 'http://localhost:3002',
};

export const MUNICIPALITIES = [
    { id: '104305000', name: 'Cagayan de Oro' },
    { id: '104321000', name: 'Opol'            },
];

export const MUN_NAME_MAP = Object.fromEntries(MUNICIPALITIES.map(m => [m.id, m.name]));
export const munName = (nameOrCode) => MUN_NAME_MAP[nameOrCode] || nameOrCode;

export const GEARS = ['Surface Gill Net', 'Bottom Set Gill Net', 'Hook And Line'];

export const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('jwt_token')}` });
export const todayStr    = () => new Date().toISOString().slice(0, 10);

export const getImageUrl = (obj) => {
    if (!obj?.imageUrl) return null;
    let url = obj.imageUrl;
    const cloudIdx = url.indexOf('https://res.cloudinary.com');
    if (cloudIdx > 0) return url.slice(cloudIdx);
    if (url.includes('/uploads/')) return null;
    if (url.includes('localhost') || url.includes('127.0.0.1')) {
        const path = url.replace(/^https?:\/\/[^/]+/, '');
        const base = MUN_SERVERS[obj.municipalityId] || CENTRAL_URL;
        return `${base}${path}`;
    }
    if (url.startsWith('https://') || url.startsWith('http://')) return url;
    const base = MUN_SERVERS[obj.municipalityId] || CENTRAL_URL;
    return `${base}${url}`;
};

export const PIE_OPTIONS = (title) => ({
    title,
    titleTextStyle: { color: '#cbd5e1', fontSize: 12 },
    pieHole: 0.4,
    legend: { position: 'bottom', textStyle: { color: '#cbd5e1', fontSize: 11 } },
    backgroundColor: 'transparent',
    chartArea: { width: '90%', height: '70%' },
    pieSliceBorderColor: 'transparent',
});

export const fishCatchChartData = (items) => {
    if (!items || !items.length) return [['Species', 'Weight'], ['No data', 1]];
    return [['Species', 'Weight'], ...items.map(i => [i.species, i.weight])];
};

export const downloadCSV = (filename, rows) => {
    const csv  = rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
};

export const downloadImage = async (url, filename = 'catch-photo.jpg') => {
    if (!url) return;
    try {
        const res  = await fetch(url, { mode: 'cors' });
        const blob = await res.blob();
        const obj  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = obj; a.download = filename; a.click();
        URL.revokeObjectURL(obj);
    } catch {
        window.open(url, '_blank');
    }
};
