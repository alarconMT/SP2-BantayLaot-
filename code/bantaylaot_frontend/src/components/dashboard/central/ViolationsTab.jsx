import React from 'react';
import { Chart } from 'react-google-charts';
import { getImageUrl, munName } from '../researcher/constants';
import {
    C, selectStyle,
    DashboardCard, UserCard,
    FilterBox, Initials, EmptyState, BackBtn, NavButtons, MunSelect,
} from '../researcher/Shared';

const BAR_OPTS = {
    legend: 'none',
    backgroundColor: 'transparent',
    hAxis: { minValue: 0, gridlines: { color: 'rgba(255,255,255,0.06)' }, textStyle: { color: C.muted, fontSize: 10 } },
    vAxis: { textStyle: { color: C.subtext, fontSize: 9 } },
    chartArea: { width: '60%', height: '70%' },
    colors: ['#f87171'],
};

const ViolationsTab = ({
    violsDate, setViolsDate,
    violsMun, setViolsMun,
    violsBarangay, setViolsBarangay,
    violsBarangays,
    violsData, violsLoading,
    violsChartData, filteredViolsUsers,
    selectedViolUser, setSelectedViolUser,
    violNavIdx, setViolNavIdx,
    fetchViolsData, clearMapLayers,
}) => (
    <div>
        {!selectedViolUser && (
            <FilterBox>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <input type="date" value={violsDate}
                        onChange={e => { const v = e.target.value; setViolsDate(v); if (v.length === 10) fetchViolsData(v); }}
                        style={selectStyle} />
                    <MunSelect value={violsMun} onChange={v => { setViolsMun(v); setViolsBarangay(''); }} />
                    {violsBarangays.length > 0 && (
                        <select value={violsBarangay} onChange={e => setViolsBarangay(e.target.value)} style={selectStyle}>
                            <option value="">All Barangays</option>
                            {violsBarangays.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                    )}
                </div>
            </FilterBox>
        )}

        {violsLoading ? (
            <DashboardCard style={{ textAlign: 'center', padding: 40 }}>
                <div className="spinner-border spinner-border-sm text-light" />
            </DashboardCard>
        ) : selectedViolUser ? (
            <div>
                <BackBtn onClick={() => { setSelectedViolUser(null); setViolNavIdx(0); clearMapLayers(); }} />

                <DashboardCard>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Initials name={selectedViolUser.name} color={C.danger} size={44} />
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 15, color: C.text }}>{selectedViolUser.name}</div>
                            {selectedViolUser.boatName && <div style={{ fontSize: 13, color: C.muted }}>⛵ {selectedViolUser.boatName}</div>}
                            <div style={{ fontSize: 12, color: C.muted }}>{munName(selectedViolUser.municipalityName)}</div>
                        </div>
                    </div>
                </DashboardCard>

                {selectedViolUser.reports[violNavIdx] && (() => {
                    const r = selectedViolUser.reports[violNavIdx];
                    return (
                        <DashboardCard>
                            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                                <div style={{ flex: 1 }}>
                                    {getImageUrl(r) ? (
                                        <img src={getImageUrl(r)} alt="Report"
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
                                    {[
                                        ['Violator', r.violator || '—'],
                                        ['Violation', r.violation],
                                        ['Origin', r.origin || '—'],
                                        ['Gear', r.fishingGear],
                                        ['Vessel', r.fishingVessel],
                                    ].map(([label, value]) => (
                                        <p key={label} style={{ margin: '4px 0', color: C.subtext }}>
                                            <strong style={{ color: C.muted }}>{label}:</strong> {value}
                                        </p>
                                    ))}
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
                            options={BAR_OPTS} />
                        <p style={{ fontSize: 13, textAlign: 'center', margin: '4px 0 0', color: C.muted }}>
                            Total: <strong style={{ color: C.danger }}>{violsChartData.total}</strong>
                        </p>
                    </DashboardCard>
                )}
                {filteredViolsUsers.length === 0 ? (
                    <EmptyState message="No violations for this selection." />
                ) : (
                    <>
                        <p style={{ fontSize: 12, color: C.muted, marginBottom: 10, fontWeight: 500 }}>
                            {filteredViolsUsers.length} reporter{filteredViolsUsers.length !== 1 ? 's' : ''} — tap to view
                        </p>
                        {filteredViolsUsers.map(user => (
                            <UserCard key={user.userId} user={user}
                                onClick={() => { setSelectedViolUser(user); setViolNavIdx(0); }}
                                accentColor={C.danger}
                                badge={user.reportCount}
                                subtitle={`${user.barangayName} · ${munName(user.municipalityName)}`}
                            />
                        ))}
                    </>
                )}
            </div>
        ) : <EmptyState message="No violations for this date." />}
    </div>
);

export default ViolationsTab;
