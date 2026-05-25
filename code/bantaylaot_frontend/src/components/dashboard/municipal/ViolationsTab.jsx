import React from 'react';
import { Chart } from 'react-google-charts';
import { C, BAR_OPTIONS } from './theme';
import DashboardCard from './DashboardCard';
import FilterBox from './FilterBox';
import BackBtn from './BackBtn';
import NavButtons from './NavButtons';
import Initials from './Initials';
import EmptyState from './EmptyState';
import UserCard from './UserCard';
import Spinner from './Spinner';

const selectStyle = {
    borderRadius: 10, border: `1px solid ${C.border}`, padding: '8px 10px',
    fontSize: 13, width: '100%', color: C.text,
    background: '#1e293b', outline: 'none', colorScheme: 'dark',
};

const getImageUrl = (imageUrl) => {
    if (!imageUrl) return null;
    const cloudIdx = imageUrl.indexOf('https://res.cloudinary.com');
    if (cloudIdx > 0) return imageUrl.slice(cloudIdx);
    const serverUrl = localStorage.getItem('server_url') || 'http://localhost:3001';
    const isLocal = serverUrl.includes('localhost') || serverUrl.includes('127.0.0.1');
    const path = imageUrl.replace(/^https?:\/\/[^/]+/, '');
    if (path.startsWith('/uploads/')) return isLocal ? `${serverUrl}${path}` : null;
    if (imageUrl.includes('localhost') || imageUrl.includes('127.0.0.1')) return `${serverUrl}${path}`;
    if (imageUrl.startsWith('https://') || imageUrl.startsWith('http://')) return imageUrl;
    return `${serverUrl}${imageUrl}`;
};

const ViolationsTab = ({
    violsDate, setViolsDate,
    violsBarangay, setViolsBarangay,
    barangayList,
    violsData, violsLoading,
    violsChartData, filteredViolsUsers,
    selectedViolUser, setSelectedViolUser,
    violNavIdx, setViolNavIdx,
    fetchViolsData, clearMapLayers,
}) => (
    <div>
        {!selectedViolUser && (
            <FilterBox>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <input type="date" value={violsDate}
                        onChange={e => { const v = e.target.value; setViolsDate(v); if (v.length === 10) fetchViolsData(v); }}
                        style={{ ...selectStyle, flex: 1 }} />
                    <select value={violsBarangay} onChange={e => setViolsBarangay(e.target.value)} style={{ ...selectStyle, flex: 1 }}>
                        <option value="">All Barangays</option>
                        {barangayList.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                </div>
            </FilterBox>
        )}

        {violsLoading ? <Spinner /> : selectedViolUser ? (
            <div>
                <BackBtn onClick={() => { setSelectedViolUser(null); setViolNavIdx(0); clearMapLayers(); }} />
                <DashboardCard>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Initials name={selectedViolUser.name} color={C.danger} />
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 15, color: C.text }}>{selectedViolUser.name}</div>
                            {selectedViolUser.boatName && <div style={{ fontSize: 13, color: C.muted }}>⛵ {selectedViolUser.boatName}</div>}
                        </div>
                    </div>
                </DashboardCard>

                {selectedViolUser.reports[violNavIdx] && (() => {
                    const r = selectedViolUser.reports[violNavIdx];
                    return (
                        <DashboardCard>
                            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                                <div style={{ flex: 1 }}>
                                    {getImageUrl(r.imageUrl) ? (
                                        <img src={getImageUrl(r.imageUrl)} alt="Report"
                                            style={{ width: '100%', borderRadius: 10, border: `1px solid ${C.border}` }} />
                                    ) : (
                                        <div style={{
                                            width: '100%', aspectRatio: '4/3', borderRadius: 10,
                                            border: `1px solid ${C.border}`,
                                            background: 'rgba(255,255,255,0.03)',
                                            display: 'flex', flexDirection: 'column',
                                            alignItems: 'center', justifyContent: 'center',
                                            color: C.muted, fontSize: 12,
                                        }}>
                                            <div style={{ fontSize: 22, marginBottom: 4 }}>🖼</div>
                                            <div>No image available</div>
                                        </div>
                                    )}
                                    <p style={{ margin: '6px 0 0', color: C.muted, fontSize: 11, textAlign: 'left' }}>
                                        {new Date(r.timestamp).toLocaleString('en-PH')}
                                    </p>
                                </div>
                                <div style={{ flex: 1, fontSize: 13 }}>
                                    <p style={{ margin: '4px 0', color: C.subtext }}><strong style={{ color: C.muted }}>Violator:</strong> {r.violator || '—'}</p>
                                    <p style={{ margin: '4px 0', color: C.subtext }}><strong style={{ color: C.muted }}>Violation:</strong> {r.violation}</p>
                                    <p style={{ margin: '4px 0', color: C.subtext }}><strong style={{ color: C.muted }}>Origin:</strong> {r.origin || '—'}</p>
                                    <p style={{ margin: '4px 0', color: C.subtext }}><strong style={{ color: C.muted }}>Gear:</strong> {r.fishingGear}</p>
                                    <p style={{ margin: '4px 0', color: C.subtext }}><strong style={{ color: C.muted }}>Vessel:</strong> {r.fishingVessel}</p>
                                </div>
                            </div>
                        </DashboardCard>
                    );
                })()}
                <NavButtons idx={violNavIdx} setIdx={setViolNavIdx} total={selectedViolUser.reports.length} />
            </div>
        ) : violsData ? (
            <div>
                {violsChartData?.violationCounts?.length > 0 && (
                    <DashboardCard title="Violations by Type">
                        <Chart chartType="BarChart"
                            data={[['Violation', 'Count'], ...violsChartData.violationCounts.map(v => [v.violation, v.count])]}
                            width="100%" height="220px"
                            options={BAR_OPTIONS({
                                chartArea: { width: '60%', height: '75%' },
                                colors: [C.danger],
                            })} />
                        <p style={{ fontSize: 13, textAlign: 'center', margin: '4px 0 0', color: C.muted }}>
                            Total: <strong style={{ color: C.danger }}>{violsChartData.total}</strong>
                        </p>
                    </DashboardCard>
                )}
                {filteredViolsUsers.length === 0 ? (
                    <EmptyState message="No violations for this date or barangay." />
                ) : (
                    <>
                        <p style={{ fontSize: 12, color: C.muted, marginBottom: 10, fontWeight: 500 }}>
                            {filteredViolsUsers.length} reporter{filteredViolsUsers.length !== 1 ? 's' : ''} — tap to view
                        </p>
                        {filteredViolsUsers.map(user => (
                            <UserCard key={user.userId} user={user}
                                onClick={() => { setSelectedViolUser(user); setViolNavIdx(0); }}
                                accentColor={C.danger}
                                badge={user.reportCount} />
                        ))}
                    </>
                )}
            </div>
        ) : <EmptyState message="No violations for this date." />}
    </div>
);

export default ViolationsTab;
