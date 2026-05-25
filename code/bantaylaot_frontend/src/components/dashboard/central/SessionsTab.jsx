import React from 'react';
import { Chart } from 'react-google-charts';
import { GEARS, PIE_OPTIONS, fishCatchChartData, getImageUrl, munName } from '../researcher/constants';
import {
    C, selectStyle,
    DashboardCard, UserCard,
    FilterBox, Initials, EmptyState, CpueRow, BackBtn, NavButtons, MunSelect,
} from '../researcher/Shared';

const SessionsTab = ({
    sessionsDate, setSessionsDate,
    sessionsMun, setSessionsMun,
    sessionsBarangay, setSessionsBarangay,
    sessionBarangays,
    sessionsData, sessionsLoading,
    sessionChartData, filteredSessionUsers,
    selectedSessionUser, setSelectedSessionUser,
    sessionNavIdx, setSessionNavIdx,
    fetchSessionsData, clearMapLayers,
}) => (
    <div>
        {!selectedSessionUser && (
            <FilterBox>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <input type="date" value={sessionsDate}
                        onChange={e => { const v = e.target.value; setSessionsDate(v); if (v.length === 10) fetchSessionsData(v); }}
                        style={selectStyle} />
                    <MunSelect value={sessionsMun} onChange={v => { setSessionsMun(v); setSessionsBarangay(''); }} />
                    {sessionBarangays.length > 0 && (
                        <select value={sessionsBarangay} onChange={e => setSessionsBarangay(e.target.value)} style={selectStyle}>
                            <option value="">All Barangays</option>
                            {sessionBarangays.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                    )}
                </div>
            </FilterBox>
        )}

        {sessionsLoading ? (
            <DashboardCard style={{ textAlign: 'center', padding: 40 }}>
                <div className="spinner-border spinner-border-sm text-light" />
            </DashboardCard>
        ) : selectedSessionUser ? (
            <div>
                <BackBtn onClick={() => { setSelectedSessionUser(null); setSessionNavIdx(0); clearMapLayers(); }} />

                <DashboardCard>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Initials name={selectedSessionUser.name} size={44} />
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 15, color: C.text }}>{selectedSessionUser.name}</div>
                            {selectedSessionUser.boatName && <div style={{ fontSize: 13, color: C.muted }}>⛵ {selectedSessionUser.boatName}</div>}
                            <div style={{ fontSize: 12, color: C.muted }}>
                                {selectedSessionUser.sessionCount} session{selectedSessionUser.sessionCount !== 1 ? 's' : ''} this day
                            </div>
                        </div>
                    </div>
                </DashboardCard>

                {selectedSessionUser.sessions[sessionNavIdx] && (() => {
                    const s = selectedSessionUser.sessions[sessionNavIdx];
                    return (
                        <>
                            <DashboardCard>
                                <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 8 }}>
                                    Session {sessionNavIdx + 1}
                                </div>
                                <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>
                                    <strong style={{ color: C.subtext }}>Start:</strong>{' '}
                                    {new Date(s.session.startDateTime).toLocaleString('en-PH')}
                                </p>
                                {s.session.endDateTime && (
                                    <p style={{ fontSize: 12, color: C.muted, margin: '4px 0 0' }}>
                                        <strong style={{ color: C.subtext }}>End:</strong>{' '}
                                        {new Date(s.session.endDateTime).toLocaleString('en-PH')}
                                    </p>
                                )}
                            </DashboardCard>

                            <DashboardCard title="Catch Analysis">
                                {s.fishings.length === 0 ? (
                                    <p style={{ textAlign: 'center', color: C.muted, fontSize: 13, padding: '12px 0' }}>No catch recorded for this session.</p>
                                ) : (
                                    <>
                                        <Chart chartType="PieChart"
                                            data={fishCatchChartData(
                                                Object.entries(s.fishings.reduce((acc, f) => {
                                                    acc[f.fishSpecies] = (acc[f.fishSpecies] || 0) + f.totalWeight;
                                                    return acc;
                                                }, {})).map(([species, weight]) => ({ species, weight }))
                                            )}
                                            width="100%" height="200px"
                                            options={{ ...PIE_OPTIONS(''), legend: { position: 'bottom', textStyle: { color: '#94a3b8', fontSize: 10 } } }} />
                                        <div style={{ marginTop: 12 }}>
                                            <p style={{ fontSize: 13, fontWeight: 700, color: C.primary, marginBottom: 8 }}>Catch Per Unit Effort (CPUE)</p>
                                            {(() => {
                                                if (!s.session.endDateTime) return <p style={{ color: C.muted, fontSize: 13 }}>No end time recorded.</p>;
                                                const hours = (new Date(s.session.endDateTime) - new Date(s.session.startDateTime)) / 3.6e6;
                                                if (hours <= 0) return null;
                                                const gw = {};
                                                s.fishings.forEach(f => { gw[f.gear] = (gw[f.gear] || 0) + f.totalWeight; });
                                                return GEARS.filter(g => gw[g]).map(g => (
                                                    <div key={g} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
                                                        <span style={{ color: C.subtext, fontSize: 13 }}>{g}</span>
                                                        <span style={{ color: C.cyan, fontWeight: 700, fontSize: 14 }}>
                                                            {(gw[g] / hours).toFixed(2)} kg/hr
                                                        </span>
                                                    </div>
                                                ));
                                            })()}
                                        </div>
                                    </>
                                )}
                            </DashboardCard>

                            <DashboardCard>
                                <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: '0 0 8px' }}>Catch Photos</p>
                                {s.fishings.filter(f => f.imageUrl).length === 0 ? (
                                    <div style={{
                                        borderRadius: 12, border: `1px solid ${C.border}`,
                                        background: 'rgba(255,255,255,0.03)',
                                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                                        justifyContent: 'center', padding: '20px 0', color: C.muted, fontSize: 12,
                                    }}>
                                        <div style={{ fontSize: 22, marginBottom: 4 }}>🖼</div>
                                        <div>No image available</div>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {s.fishings.filter(f => f.imageUrl).map((f, fi) => (
                                            <div key={fi} style={{ border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
                                                <a href={getImageUrl(f)} target="_blank" rel="noreferrer">
                                                    <img src={getImageUrl(f)} alt="catch"
                                                        style={{ width: '100%', maxHeight: 130, objectFit: 'cover', display: 'block' }} />
                                                </a>
                                                <div style={{ padding: '6px 10px', fontSize: 12, color: C.muted, background: 'rgba(0,0,0,0.2)' }}>
                                                    <strong style={{ color: C.subtext }}>{f.fishSpecies}</strong> · {f.gear} · {f.totalWeight} kg
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </DashboardCard>
                        </>
                    );
                })()}
                <NavButtons idx={sessionNavIdx} setIdx={setSessionNavIdx} total={selectedSessionUser.sessions.length} />
            </div>

        ) : sessionsData ? (
            <div>
                {sessionChartData?.fishCatch?.length > 0 && (
                    <DashboardCard title="Daily Catch Overview">
                        <Chart chartType="PieChart" data={fishCatchChartData(sessionChartData.fishCatch)}
                            width="100%" height="220px" options={PIE_OPTIONS('')} />
                        <CpueRow cpue={sessionChartData.cpue} />
                    </DashboardCard>
                )}
                {filteredSessionUsers.length === 0 ? (
                    <EmptyState message="No sessions for this selection." />
                ) : (
                    <>
                        <p style={{ fontSize: 12, color: C.muted, marginBottom: 10, fontWeight: 500 }}>
                            {filteredSessionUsers.length} fisher{filteredSessionUsers.length !== 1 ? 's' : ''} — tap to view route
                        </p>
                        {filteredSessionUsers.map(user => (
                            <UserCard key={user.userId} user={user}
                                onClick={() => { setSelectedSessionUser(user); setSessionNavIdx(0); }}
                                accentColor={C.primary}
                                badge={user.sessionCount}
                                subtitle={`${user.barangayName} · ${munName(user.municipalityName)}`}
                            />
                        ))}
                    </>
                )}
            </div>
        ) : <EmptyState message="No sessions for this date." />}
    </div>
);

export default SessionsTab;
