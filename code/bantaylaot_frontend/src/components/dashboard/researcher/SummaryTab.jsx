import React from 'react';
import { Chart } from 'react-google-charts';
import { MUNICIPALITIES, PIE_OPTIONS, fishCatchChartData } from './constants';
import {
    C, selectStyle,
    DashboardCard, StatCard,
    FilterBox, SectionHeader, Initials, EmptyState, CpueRow, DownloadBtn, MunSelect,
} from './Shared';

const months      = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const years       = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

const ChartCard = ({ label, children }) => (
    <div style={{
        flex: 1, minWidth: 0, border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 12, padding: '10px 8px',
        background: 'rgba(255,255,255,0.02)',
    }}>
        {label && <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 6px' }}>{label}</p>}
        {children}
    </div>
);

const BAR_OPTS = {
    legend: 'none',
    backgroundColor: 'transparent',
    hAxis: { minValue: 0, format: '0', gridlines: { count: 4, color: 'rgba(255,255,255,0.06)' }, textStyle: { color: C.muted, fontSize: 10 } },
    vAxis: { textStyle: { color: C.subtext, fontSize: 9 }, maxAlternation: 1 },
    bar: { groupWidth: '65%' },
};

const SummaryTab = ({
    summaryMonth, setSummaryMonth,
    summaryYear, setSummaryYear,
    summaryMun, setSummaryMun,
    summaryBarangay, setSummaryBarangay,
    summaryBarangays,
    violData, violLoading,
    cpueData, cpueLoading,
    expandedCpueUser, setExpandedCpueUser,
    downloadSummaryCSV, downloadCpueCSV,
}) => (
    <div>
        <FilterBox>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <select value={summaryMonth} onChange={e => setSummaryMonth(+e.target.value)} style={{ ...selectStyle, flex: 1 }}>
                    {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
                <select value={summaryYear} onChange={e => setSummaryYear(+e.target.value)} style={{ ...selectStyle, flex: 1 }}>
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
                <MunSelect value={summaryMun} onChange={v => { setSummaryMun(v); setSummaryBarangay(''); }} style={{ flex: 1 }} />
                {summaryBarangays.length > 0 && (
                    <select value={summaryBarangay} onChange={e => setSummaryBarangay(e.target.value)} style={{ ...selectStyle, flex: 1 }}>
                        <option value="">All Barangays</option>
                        {summaryBarangays.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                )}
            </div>
        </FilterBox>

        {/* Stat row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <StatCard
                label="Violations"
                value={violData?.total ?? '—'}
                gradient="linear-gradient(135deg, #f87171 0%, #b91c1c 100%)"
                icon="⚠️"
            />
            <StatCard
                label="Active Fishers"
                value={cpueData?.users?.length ?? '—'}
                gradient="linear-gradient(135deg, #38bdf8 0%, #0369a1 100%)"
                icon="🎣"
            />
        </div>

        {/* Violations card */}
        <DashboardCard>
            <SectionHeader
                title={`Violation Summary — for ${MONTH_NAMES[summaryMonth - 1]} ${summaryYear}`}
                action={<DownloadBtn label="CSV" onClick={downloadSummaryCSV} />}
            />
            {violData?.total != null && (
                <p style={{ fontSize: 12, color: C.muted, margin: '-6px 0 8px' }}>
                    Total: <strong style={{ color: C.danger }}>{violData.total}</strong> violations
                </p>
            )}
            {violData ? (
                <>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                        {violData.byMunicipality?.length > 0 && (
                            <ChartCard label="By Municipality">
                                <Chart chartType="PieChart"
                                    data={[['Municipality', 'Violations'], ...violData.byMunicipality.map(d => [
                                        MUNICIPALITIES.find(m => m.id === d.municipalityName)?.name || d.municipalityName,
                                        d.count,
                                    ])]}
                                    width="100%" height="180px" options={PIE_OPTIONS('')} />
                            </ChartCard>
                        )}
                        {summaryMun && violData.byBarangay?.length > 0 && (
                            <ChartCard label={`By Barangay — ${MUNICIPALITIES.find(m => m.id === summaryMun)?.name}`}>
                                <Chart chartType="PieChart"
                                    data={[['Barangay', 'Violations'], ...violData.byBarangay.map(d => [d.barangayName, d.count])]}
                                    width="100%" height="180px" options={PIE_OPTIONS('')} />
                            </ChartCard>
                        )}
                    </div>
                    {violData.reports?.length > 0 && (() => {
                        let filtered = summaryMun
                            ? violData.reports.filter(r => r.municipalityId === summaryMun)
                            : violData.reports;
                        if (summaryBarangay) filtered = filtered.filter(r => r.barangayName === summaryBarangay);
                        const typeCounts = {};
                        filtered.forEach(r => { typeCounts[r.violation] = (typeCounts[r.violation] || 0) + 1; });
                        const rows = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);
                        if (!rows.length) return null;
                        const label = summaryBarangay || (summaryMun ? MUNICIPALITIES.find(m => m.id === summaryMun)?.name : '');
                        return (
                            <ChartCard label={`By Violation Type${label ? ` — ${label}` : ''}`}>
                                <Chart chartType="BarChart"
                                    data={[['Type', 'Count'], ...rows]}
                                    width="100%"
                                    height={`${Math.max(140, 40 + rows.length * 30)}px`}
                                    options={{ ...BAR_OPTS, chartArea: { left: '45%', width: '50%', height: '75%' }, colors: [C.danger] }} />
                            </ChartCard>
                        );
                    })()}
                </>
            ) : <EmptyState message="No violation data for this period." />}
        </DashboardCard>

        {/* CPUE card */}
        <DashboardCard>
            <SectionHeader title={`Catch Per Unit Effort — for ${MONTH_NAMES[summaryMonth - 1]} ${summaryYear}`} action={cpueData && <DownloadBtn label="CSV" onClick={downloadCpueCSV} />} />
            {cpueLoading ? (
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                    <div className="spinner-border spinner-border-sm text-light" />
                </div>
            ) : cpueData?.fishCatch?.length ? (
                <>
                    <Chart chartType="PieChart" data={fishCatchChartData(cpueData.fishCatch)}
                        width="100%" height="200px" options={PIE_OPTIONS('Fish Catch %')} />
                    <CpueRow cpue={cpueData.cpue} />
                    <div style={{ margin: '14px 0 10px', borderTop: `1px solid ${C.border}` }} />
                    <p style={{ fontSize: 13, color: C.text, fontWeight: 700, marginBottom: 10 }}>Fisher Breakdown</p>
                    {(cpueData.users || []).map(user => (
                        <div key={user.userId} style={{
                            marginBottom: 8, borderRadius: 14,
                            border: `1px solid ${C.border}`, overflow: 'hidden',
                            background: C.cardGlass,
                        }}>
                            <button
                                onClick={() => setExpandedCpueUser(expandedCpueUser === user.userId ? null : user.userId)}
                                style={{
                                    width: '100%', padding: '10px 14px',
                                    background: expandedCpueUser === user.userId ? 'rgba(56,189,248,0.08)' : 'transparent',
                                    border: 'none', cursor: 'pointer', textAlign: 'left',
                                    display: 'flex', alignItems: 'center', gap: 10,
                                    transition: 'background 0.2s', fontFamily: C.font,
                                }}>
                                <Initials name={user.name} />
                                <span style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 700, fontSize: 13, color: C.text }}>{user.name}</div>
                                    {user.boatName && <div style={{ fontSize: 12, color: C.muted }}>⛵ {user.boatName}</div>}
                                    <div style={{ fontSize: 11, color: C.muted }}>
                                        {user.barangayName ? `${user.barangayName} · ` : ''}
                                        {MUNICIPALITIES.find(m => m.id === user.municipalityName)?.name || user.municipalityName}
                                    </div>
                                </span>
                                <span style={{
                                    background: 'rgba(56,189,248,0.12)', color: '#38bdf8',
                                    border: '1px solid rgba(56,189,248,0.25)',
                                    borderRadius: 10, padding: '3px 10px', fontSize: 11, fontWeight: 700,
                                    flexShrink: 0, marginRight: 6,
                                }}>
                                    {user.sessionCount} session{user.sessionCount !== 1 ? 's' : ''}
                                </span>
                                <span style={{ color: C.muted, fontSize: 11 }}>
                                    {expandedCpueUser === user.userId ? '▲' : '▼'}
                                </span>
                            </button>
                            {expandedCpueUser === user.userId && (
                                <div style={{ padding: '10px 14px', borderTop: `1px solid ${C.border}` }}>
                                    {user.fishCatch?.length ? (
                                        <Chart chartType="PieChart" data={fishCatchChartData(user.fishCatch)}
                                            width="100%" height="160px"
                                            options={{ ...PIE_OPTIONS(''), legend: { position: 'bottom', textStyle: { color: '#94a3b8', fontSize: 10 } } }} />
                                    ) : (
                                        <p style={{ textAlign: 'center', color: C.muted, fontSize: 13, padding: '8px 0 4px' }}>No catch recorded.</p>
                                    )}
                                    <CpueRow cpue={user.cpue} />
                                </div>
                            )}
                        </div>
                    ))}
                </>
            ) : <EmptyState message="No catch data for this period." />}
        </DashboardCard>
    </div>
);

export default SummaryTab;
