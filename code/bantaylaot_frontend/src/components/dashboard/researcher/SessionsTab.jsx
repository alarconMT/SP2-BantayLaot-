import React from 'react';
import { Chart } from 'react-google-charts';
import { GEARS, PIE_OPTIONS, fishCatchChartData, getImageUrl, downloadImage, munName } from './constants';
import {
    C, selectStyle,
    DashboardCard, UserCard,
    FilterBox, SectionHeader, Initials, EmptyState, CpueRow, BackBtn, NavButtons, DownloadBtn, MunSelect,
} from './Shared';

const SessionsTab = ({
    sessionsDate, setSessionsDate,
    sessionsMun, setSessionsMun,
    sessionsBarangay, setSessionsBarangay,
    sessionBarangays,
    sessionsData, sessionsLoading,
    selectedSessionUser, setSelectedSessionUser,
    sessionNavIdx, setSessionNavIdx,
    fetchSessions,
    clearMapLayers,
    plotSessionRoutes,
    downloadSessionsCSV,
    downloadAllFishingImages,
}) => (
    <div>
        {!selectedSessionUser && (
            <FilterBox>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <input type="date" value={sessionsDate}
                        onChange={e => { const v = e.target.value; setSessionsDate(v); if (v.length === 10) fetchSessions(v); }}
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

                {/* User header */}
                <DashboardCard>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <Initials name={selectedSessionUser.name} size={44} />
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 16, color: C.text }}>{selectedSessionUser.name}</div>
                            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                                {selectedSessionUser.barangayName && `${selectedSessionUser.barangayName} · `}
                                {munName(selectedSessionUser.municipalityName)}
                            </div>
                            <div style={{
                                marginTop: 6, display: 'inline-block',
                                background: `${C.primary}22`, color: C.primary,
                                border: `1px solid ${C.primary}44`,
                                padding: '3px 10px', borderRadius: 10, fontSize: 11, fontWeight: 700,
                            }}>
                                {selectedSessionUser.sessionCount} session{selectedSessionUser.sessionCount !== 1 ? 's' : ''}
                            </div>
                        </div>
                    </div>
                </DashboardCard>

                {/* Session detail */}
                {selectedSessionUser.sessions[sessionNavIdx] && (() => {
                    const s = selectedSessionUser.sessions[sessionNavIdx];
                    const catchImgs = s.fishings
                        .filter(f => f.imageUrl)
                        .map(f => ({ ...f, municipalityId: f.municipalityId || selectedSessionUser.municipalityId }));
                    return (
                        <>
                            {/* Session info */}
                            <DashboardCard>
                                <div style={{ fontSize: 17, fontWeight: 700, color: C.text, marginBottom: 6 }}>
                                    Session {sessionNavIdx + 1}
                                </div>
                                <div style={{ fontSize: 12, color: C.muted }}>
                                    <span style={{ color: C.subtext, fontWeight: 600 }}>Start:</span>{' '}
                                    {new Date(s.session.startDateTime).toLocaleString('en-PH')}
                                </div>
                                {s.session.endDateTime && (
                                    <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                                        <span style={{ color: C.subtext, fontWeight: 600 }}>End:</span>{' '}
                                        {new Date(s.session.endDateTime).toLocaleString('en-PH')}
                                    </div>
                                )}
                            </DashboardCard>

                            {/* Catch analysis */}
                            <DashboardCard title="Catch Analysis">
                                {s.fishings.length === 0 ? (
                                    <p style={{ color: C.muted, fontSize: 13, textAlign: 'center', padding: '8px 0' }}>No catch recorded for this session.</p>
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
                                            options={{ ...PIE_OPTIONS(''), legend: { position: 'bottom', textStyle: { color: C.subtext, fontSize: 11 } } }} />
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

                            {/* Catch photos */}
                            <DashboardCard>
                                <SectionHeader title="Catch Photos" />
                                {catchImgs.length === 0 ? (
                                    <div style={{
                                        borderRadius: 12, border: `1px solid ${C.border}`,
                                        background: 'rgba(255,255,255,0.03)',
                                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                                        justifyContent: 'center', padding: '24px 0', color: C.muted, fontSize: 12,
                                    }}>
                                        <div style={{ fontSize: 24, marginBottom: 4 }}>🖼</div>
                                        <div>No image available</div>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                        {catchImgs.map((f, fi) => (
                                            <div key={fi} style={{ border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
                                                <a href={getImageUrl(f)} target="_blank" rel="noreferrer">
                                                    <img src={getImageUrl(f)} alt="catch"
                                                        style={{ width: '100%', height: 180, objectFit: 'cover', display: 'block' }} />
                                                </a>
                                                <div style={{ padding: '10px 14px', background: 'rgba(0,0,0,0.2)' }}>
                                                    <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 8 }}>{f.fishSpecies}</div>
                                                    {[['Gear', f.gear], ['Weight', `${f.totalWeight} kg`]].map(([label, value]) => (
                                                        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${C.border}`, paddingBottom: 5, marginBottom: 5, fontSize: 12 }}>
                                                            <span style={{ color: C.muted }}>{label}</span>
                                                            <span style={{ color: C.text, fontWeight: 600 }}>{value}</span>
                                                        </div>
                                                    ))}
                                                    <button onClick={() => downloadImage(getImageUrl(f), `catch-${f.fishSpecies || fi}.jpg`)} style={{
                                                        marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 6,
                                                        background: C.primary, color: '#0f172a', border: 'none', cursor: 'pointer',
                                                        padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                                                    }}>
                                                        ⬇ Download
                                                    </button>
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
                {sessionsData.fishCatch?.length > 0 && (
                    <DashboardCard title="Daily Catch Overview">
                        <Chart chartType="PieChart" data={fishCatchChartData(sessionsData.fishCatch)}
                            width="100%" height="220px" options={PIE_OPTIONS('')} />
                        <CpueRow cpue={sessionsData.cpue} />
                    </DashboardCard>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontSize: 13, color: C.muted, fontWeight: 500 }}>
                        {sessionsData.users?.length || 0} fisher(s)
                    </span>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <DownloadBtn label="CSV" onClick={downloadSessionsCSV} />
                        <DownloadBtn label="Images" onClick={downloadAllFishingImages} />
                    </div>
                </div>

                {(sessionsData.users || []).length === 0 ? (
                    <EmptyState message="No sessions recorded for this date." />
                ) : (sessionsData.users || []).map(u => (
                    <UserCard key={u.userId || u.name} user={u}
                        onClick={() => { setSelectedSessionUser(u); setSessionNavIdx(0); plotSessionRoutes(u.sessions); }}
                        accentColor={C.primary}
                        badge={`${u.sessionCount} session${u.sessionCount !== 1 ? 's' : ''}`}
                        subtitle={`${u.barangayName ? u.barangayName + ' · ' : ''}${munName(u.municipalityName)}`}
                    />
                ))}
            </div>
        ) : (
            <EmptyState message="No sessions for this date." />
        )}
    </div>
);

export default SessionsTab;
