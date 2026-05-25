import React from 'react';
import { Chart } from 'react-google-charts';
import { C, PIE_OPTIONS, BAR_OPTIONS, fishCatchChartData } from './theme';
import DashboardCard from './DashboardCard';
import StatCard from './StatCard';
import FilterBox from './FilterBox';
import Initials from './Initials';
import EmptyState from './EmptyState';
import CpueRow from './CpueRow';
import Spinner from './Spinner';

const months      = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const years       = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

const selectStyle = {
    borderRadius: 10, border: `1px solid ${C.border}`, padding: '8px 10px',
    fontSize: 13, width: '100%', color: C.text,
    background: '#1e293b', outline: 'none',
};

const ChartCard = ({ label, children }) => (
    <div style={{
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 12, padding: '10px 8px',
        background: 'rgba(255,255,255,0.02)',
        marginBottom: 10,
    }}>
        {label && <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 6px' }}>{label}</p>}
        {children}
    </div>
);

const SummaryTab = ({
    summaryMonth, setSummaryMonth,
    summaryYear, setSummaryYear,
    summaryBarangay, setSummaryBarangay,
    barangayList,
    violData, violLoading,
    cpueData, cpueLoading,
    expandedCpueUser, setExpandedCpueUser,
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
            <select value={summaryBarangay} onChange={e => setSummaryBarangay(e.target.value)} style={selectStyle}>
                <option value="">All Barangays</option>
                {barangayList.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
        </FilterBox>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <StatCard
                label="Violations"
                value={violData?.total || 0}
                gradient="linear-gradient(135deg, #f87171 0%, #b91c1c 100%)"
                icon="⚠️"
            />
            <StatCard
                label="Fishers"
                value={cpueData?.users?.length || 0}
                gradient="linear-gradient(135deg, #38bdf8 0%, #0369a1 100%)"
                icon="🎣"
            />
        </div>

        <DashboardCard title={`Violation Summary — for ${MONTH_NAMES[summaryMonth - 1]} ${summaryYear}`}>
            {!violLoading && violData?.total != null && (
                <p style={{ fontSize: 12, color: '#94a3b8', margin: '-8px 0 10px' }}>
                    Total: <strong style={{ color: '#f87171' }}>{violData.total}</strong> violations
                </p>
            )}
            {violLoading ? <Spinner /> : violData?.data?.length ? (
                <>
                    <ChartCard label="By Barangay">
                        <Chart chartType="PieChart"
                            data={[['Barangay', 'Violations'], ...violData.data.map(d => [d.barangayName, d.count])]}
                            width="100%" height="200px" options={PIE_OPTIONS()} />
                    </ChartCard>
                    {summaryBarangay ? (() => {
                        const rows = (violData.mapReports || [])
                            .filter(r => r.barangayName === summaryBarangay)
                            .reduce((acc, r) => { acc[r.violation] = (acc[r.violation] || 0) + 1; return acc; }, {});
                        const sorted = Object.entries(rows).sort((a, b) => b[1] - a[1]);
                        const total  = sorted.reduce((s, [, c]) => s + c, 0);
                        return sorted.length ? (
                            <ChartCard label={`Violation Types — ${summaryBarangay}`}>
                                <Chart chartType="BarChart"
                                    data={[['Type', 'Count'], ...sorted]}
                                    width="100%"
                                    height={`${Math.max(160, 56 + sorted.length * 30)}px`}
                                    options={BAR_OPTIONS({
                                        chartArea: { left: '45%', width: '50%', height: '75%' },
                                        colors: [C.danger],
                                    })} />
                                <p style={{ fontSize: 12, color: C.muted, textAlign: 'center', margin: '4px 0 0' }}>
                                    Total: <strong style={{ color: C.danger }}>{total}</strong>
                                </p>
                            </ChartCard>
                        ) : <EmptyState message="No violations for this barangay." />;
                    })() : (
                        violData.violationTypes?.length > 0 && (
                            <ChartCard label="By Violation Type">
                                <Chart chartType="BarChart"
                                    data={[['Type', 'Count'], ...violData.violationTypes.map(v => [v.violation, v.count])]}
                                    width="100%"
                                    height={`${Math.max(160, 56 + violData.violationTypes.length * 30)}px`}
                                    options={BAR_OPTIONS({
                                        chartArea: { left: '45%', width: '50%', height: '75%' },
                                        colors: [C.danger],
                                    })} />
                            </ChartCard>
                        )
                    )}
                </>
            ) : <EmptyState message="No violations for this period." />}
        </DashboardCard>

        <DashboardCard title={`Catch Per Unit Effort — for ${MONTH_NAMES[summaryMonth - 1]} ${summaryYear}`}>
            {cpueLoading ? <Spinner /> : cpueData?.fishCatch?.length ? (
                <>
                    <Chart chartType="PieChart" data={fishCatchChartData(cpueData.fishCatch)}
                        width="100%" height="220px" options={PIE_OPTIONS()} />
                    <CpueRow cpue={cpueData.cpue} />
                    <div style={{ margin: '14px 0 10px', borderTop: `1px solid ${C.border}` }} />
                    <p style={{ fontSize: 13, color: C.text, fontWeight: 700, marginBottom: 10 }}>
                        Fisher Breakdown{summaryBarangay ? ` — ${summaryBarangay}` : ''}
                    </p>
                    {(cpueData.users || []).map(user => (
                        <div key={user.userId} style={{
                            marginBottom: 8, borderRadius: 14,
                            border: `1px solid ${C.border}`, overflow: 'hidden',
                            background: C.cardGlass, transition: 'all 0.2s ease',
                        }}>
                            <button
                                onClick={() => setExpandedCpueUser(expandedCpueUser === user.userId ? null : user.userId)}
                                style={{
                                    width: '100%', padding: '10px 14px',
                                    background: expandedCpueUser === user.userId ? C.primarySoft : 'transparent',
                                    border: 'none', cursor: 'pointer', textAlign: 'left',
                                    display: 'flex', alignItems: 'center', gap: 10,
                                    transition: 'background 0.2s ease', fontFamily: C.font,
                                }}>
                                <Initials name={user.name} />
                                <span style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 700, fontSize: 13, color: C.text }}>{user.name}</div>
                                    {user.boatName && <div style={{ fontSize: 12, color: C.muted }}>⛵ {user.boatName}</div>}
                                </span>
                                <span style={{
                                    background: 'rgba(56,189,248,0.12)', color: C.primary,
                                    border: '1px solid rgba(56,189,248,0.25)',
                                    borderRadius: 10, padding: '3px 10px', fontSize: 11, fontWeight: 700,
                                    flexShrink: 0, marginRight: 6,
                                }}>
                                    {user.sessionCount} session{user.sessionCount !== 1 ? 's' : ''}
                                </span>
                                <span style={{ color: C.muted, fontSize: 11 }}>{expandedCpueUser === user.userId ? '▲' : '▼'}</span>
                            </button>
                            {expandedCpueUser === user.userId && (
                                <div style={{ padding: '10px 14px', borderTop: `1px solid ${C.border}` }}>
                                    {user.fishCatch?.length ? (
                                        <Chart chartType="PieChart" data={fishCatchChartData(user.fishCatch)}
                                            width="100%" height="160px"
                                            options={{ ...PIE_OPTIONS(), legend: { position: 'bottom', textStyle: { color: '#94a3b8', fontSize: 10 } } }} />
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
