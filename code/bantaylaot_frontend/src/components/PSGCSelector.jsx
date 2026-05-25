import { useState, useEffect } from 'react';
import {
    regions,
    getProvincesByRegion,
    getCityMunByProvince,
    getBarangayByMun
} from 'philippine-location-json-for-geer';

const MUNICIPALITY_SERVER_MAP = {
    'CAGAYAN DE ORO CITY (Capital)': { url: 'http://localhost:3001', code: '104305000' },
    'OPOL':                           { url: 'http://localhost:3002', code: '104321000' },
};

const PSGCSelector = ({ onChange, disabled = false, showBarangay = true }) => {
    const [regionCode,   setRegionCode]   = useState('');
    const [provinceCode, setProvinceCode] = useState('');
    const [munCode,      setMunCode]      = useState('');
    const [munName,      setMunName]      = useState('');
    const [barangayCode, setBarangayCode] = useState('');
    const [barangayName, setBarangayName] = useState('');

    const [provinceList, setProvinceList] = useState([]);
    const [munList,      setMunList]      = useState([]);
    const [barangayList, setBarangayList] = useState([]);

    const isActiveMunicipality = !!MUNICIPALITY_SERVER_MAP[munName];

    useEffect(() => {
        const region   = regions.find(r => r.reg_code === regionCode);
        const province = provinceList.find(p => p.prov_code === provinceCode);
        const server   = MUNICIPALITY_SERVER_MAP[munName];

        onChange({
            regionCode,
            regionName:   region?.name   || '',
            provinceCode,
            provinceName: province?.name || '',
            munCityCode:  server?.code   || munCode,
            munCityName:  munName,
            barangayCode,
            barangayName,
            serverUrl:    server?.url    || null,
            isActive:     !!server,
            fullAddress:  [barangayName, munName, province?.name, region?.name]
                .filter(Boolean).join(', ')
        });
    }, [regionCode, provinceCode, munCode, munName, barangayCode, barangayName]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleRegionChange = (e) => {
        const code = e.target.value;
        setRegionCode(code);
        setProvinceCode(''); setMunCode(''); setMunName(''); setBarangayCode(''); setBarangayName('');
        setMunList([]); setBarangayList([]);
        setProvinceList(code ? getProvincesByRegion(code) : []);
    };

    const handleProvinceChange = (e) => {
        const code = e.target.value;
        setProvinceCode(code);
        setMunCode(''); setMunName(''); setBarangayCode(''); setBarangayName('');
        setBarangayList([]);
        setMunList(code ? getCityMunByProvince(code) : []);
    };

    const handleMunChange = (e) => {
        const code = e.target.value;
        const mun  = munList.find(m => m.psgc_code === code);
        setMunCode(code);
        setMunName(mun?.name || '');
        setBarangayCode(''); setBarangayName('');
        setBarangayList(code ? getBarangayByMun(code) : []);
    };

    const sel = (extraStyle = {}) => ({
        width: '100%', padding: '8px 12px',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '8px', fontSize: '13px',
        boxSizing: 'border-box', marginBottom: '12px',
        backgroundColor: disabled ? '#0f1f35' : '#1e293b',
        color: disabled ? '#64748b' : '#f8fafc',
        outline: 'none',
        transition: 'border-color .2s ease, box-shadow .2s ease',
        cursor: disabled ? 'not-allowed' : 'pointer',
        ...extraStyle,
    });

    const lbl = {
        display: 'block', marginBottom: '5px',
        fontSize: '11px', fontWeight: '700',
        color: '#94a3b8',
        textTransform: 'uppercase', letterSpacing: '.5px',
    };

    return (
        <div>
            <div>
                <label style={lbl}>Region</label>
                <select value={regionCode} disabled={disabled}
                    style={sel()} onChange={handleRegionChange}>
                    <option value="">— Select Region —</option>
                    {regions.map(r => (
                        <option key={`reg-${r.reg_code}`} value={r.reg_code}>{r.name}</option>
                    ))}
                </select>
            </div>

            <div>
                <label style={lbl}>Province</label>
                <select value={provinceCode} disabled={disabled || !regionCode}
                    style={sel()} onChange={handleProvinceChange}>
                    <option value="">— Select Province —</option>
                    {provinceList.map(p => (
                        <option key={`prov-${p.prov_code}`} value={p.prov_code}>{p.name}</option>
                    ))}
                </select>
            </div>

            <div>
                <label style={lbl}>Municipality / City</label>
                <select value={munCode} disabled={disabled || !provinceCode}
                    style={sel()} onChange={handleMunChange}>
                    <option value="">— Select Municipality / City —</option>
                    {munList.map(m => (
                        <option key={`mun-${m.psgc_code}`} value={m.psgc_code}
                            style={{ fontWeight: MUNICIPALITY_SERVER_MAP[m.name] ? '600' : 'normal' }}>
                            {m.name}{MUNICIPALITY_SERVER_MAP[m.name] ? ' ✓' : ''}
                        </option>
                    ))}
                </select>
                {munCode && !isActiveMunicipality && (
                    <p style={{ color: '#94a3b8', fontSize: '12px', marginTop: -8, marginBottom: 8 }}>
                        This municipality has no active server in this system.
                    </p>
                )}
                {munCode && isActiveMunicipality && (
                    <p style={{ color: '#4ade80', fontSize: '12px', marginTop: -8, marginBottom: 8 }}>
                        ✓ Active — {MUNICIPALITY_SERVER_MAP[munName].url}
                    </p>
                )}
            </div>

            {showBarangay && (
                <div>
                    <label style={lbl}>Barangay</label>
                    <select value={barangayCode} disabled={disabled || !munCode}
                        style={sel()}
                        onChange={e => {
                            const b = barangayList.find(x => x.brgy_code === e.target.value);
                            setBarangayCode(e.target.value);
                            setBarangayName(b?.name || '');
                        }}>
                        <option value="">— Select Barangay —</option>
                        {barangayList.map(b => (
                            <option key={`brgy-${b.brgy_code}`} value={b.brgy_code}>{b.name}</option>
                        ))}
                    </select>
                </div>
            )}
        </div>
    );
};

export default PSGCSelector;
