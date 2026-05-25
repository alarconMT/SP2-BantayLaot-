import React from 'react';
import { Chart } from 'react-google-charts';
import { munName } from './constants';
import { C, selectStyle, DashboardCard, StatCard, FilterBox, EmptyState, DownloadBtn, MunSelect } from './Shared';

const BAR_OPTS = {
    legend: 'none',
    backgroundColor: 'transparent',
    hAxis: { minValue: 0, format: '0', gridlines: { count: 4, color: 'rgba(255,255,255,0.06)' }, textStyle: { color: C.muted, fontSize: 11 } },
    vAxis: { textStyle: { color: C.subtext, fontSize: 11 } },
    bar: { groupWidth: '62%' },
};

const FishersTab = ({
    userStatsMun,
    setUserStatsMun,
    userStats,
    userStatsLoading,
    userChartData,
    downloadUserStatsCSV,
}) => (
    <div>
        <p style={{ fontSize: 12, color: C.muted, marginBottom: 14, fontStyle: 'italic', lineHeight: 1.5 }}>
            Aggregate fisher registration statistics only. Personal identities and sensitive information are anonymized.
        </p>

        <FilterBox>
            <MunSelect value={userStatsMun} onChange={v => setUserStatsMun(v)} />
        </FilterBox>

        {userStatsLoading ? (
            <DashboardCard style={{ textAlign: 'center', padding: 40 }}>
                <div className="spinner-border spinner-border-sm text-light" />
            </DashboardCard>
        ) : userStats ? (
            <>
                {/* Stat cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
                    <StatCard
                        label="Total Fishers"
                        value={userStats.totalFishers}
                        gradient="linear-gradient(135deg, #38bdf8 0%, #0369a1 100%)"
                        icon="🎣"
                    />
                    <StatCard
                        label="Approved"
                        value={(userStats.byMunicipality || []).reduce((s, d) => s + d.approved, 0)}
                        gradient="linear-gradient(135deg, #4ade80 0%, #166534 100%)"
                        icon="✓"
                    />
                    <StatCard
                        label="Pending"
                        value={(userStats.byMunicipality || []).reduce((s, d) => s + d.pending, 0)}
                        gradient="linear-gradient(135deg, #fbbf24 0%, #92400e 100%)"
                        icon="⏳"
                    />
                </div>

                {/* Table */}
                <DashboardCard>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#f8fafc' }}>
                            {userStatsMun ? 'By Barangay' : 'By Municipality'}
                        </h3>
                        <DownloadBtn label="Download CSV" onClick={downloadUserStatsCSV} />
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, color: C.text }}>
                            <thead>
                                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: C.muted, fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                                        {userStatsMun ? 'Barangay' : 'Municipality'}
                                    </th>
                                    {['Total', 'Approved', 'Pending'].map(h => (
                                        <th key={h} style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: C.muted, fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {(userStatsMun
                                    ? (userStats.byBarangay || []).filter(d => d.municipalityId === userStatsMun).sort((a, b) => b.total - a.total)
                                    : (userStats.byMunicipality || []).sort((a, b) => b.total - a.total)
                                ).map((d, i) => (
                                    <tr key={i} style={{ borderTop: `1px solid ${C.border}`, background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                                        <td style={{ padding: '11px 12px', fontWeight: 500, color: C.text }}>
                                            {userStatsMun ? d.barangayName : munName(d.municipalityName)}
                                        </td>
                                        <td style={{ padding: '11px 12px', textAlign: 'right', fontWeight: 700, color: C.subtext }}>{d.total}</td>
                                        <td style={{ padding: '11px 12px', textAlign: 'right', fontWeight: 700, color: '#4ade80' }}>{d.approved}</td>
                                        <td style={{ padding: '11px 12px', textAlign: 'right', fontWeight: 700, color: '#fbbf24' }}>{d.pending}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </DashboardCard>

                {/* Chart */}
                {userChartData && (
                    <DashboardCard title="Fisher Registration Distribution">
                        <Chart chartType="BarChart"
                            data={userChartData}
                            width="100%"
                            height={`${Math.min(280, 60 + (userChartData.length - 1) * 34)}px`}
                            options={{ ...BAR_OPTS, chartArea: { width: '58%', height: '78%' }, colors: [C.primary] }} />
                    </DashboardCard>
                )}
            </>
        ) : (
            <EmptyState message="No fisher statistics available." />
        )}
    </div>
);

export default FishersTab;
