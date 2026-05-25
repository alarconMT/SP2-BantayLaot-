import React from 'react';
import { Chart } from 'react-google-charts';
import { getImageUrl, downloadImage } from './constants';
import {
    C, selectStyle,
    DashboardCard,
    FilterBox, SectionHeader, EmptyState, DownloadBtn, MunSelect,
} from './Shared';

const BAR_OPTS = {
    legend: 'none',
    backgroundColor: 'transparent',
    hAxis: { minValue: 0, gridlines: { color: 'rgba(255,255,255,0.06)' }, textStyle: { color: C.muted, fontSize: 10 } },
    vAxis: { textStyle: { color: C.subtext, fontSize: 9 } },
    bar: { groupWidth: '65%' },
};

const ViolationsTab = ({
    violsDate, setViolsDate,
    violsMun, setViolsMun,
    violsBarangay, setViolsBarangay,
    violsBarangays,
    violsData, violsLoading,
    fetchViolations,
    downloadViolationsCSV,
    downloadAllImages,
}) => (
    <div>
        <FilterBox>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input type="date" value={violsDate}
                    onChange={e => { const v = e.target.value; setViolsDate(v); if (v.length === 10) fetchViolations(v); }}
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

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
            <DownloadBtn label="Download CSV" onClick={downloadViolationsCSV} />
        </div>

        {violsLoading ? (
            <DashboardCard style={{ textAlign: 'center', padding: 40 }}>
                <div className="spinner-border spinner-border-sm text-light" />
            </DashboardCard>
        ) : violsData ? (
            <>
                {/* Chart */}
                {violsData.violationCounts?.length > 0 && (
                    <DashboardCard>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                            <div>
                                <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>Violation Overview</div>
                                <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                                    Total: <strong style={{ color: C.danger }}>{violsData.total}</strong>
                                </div>
                            </div>
                            <div style={{
                                background: `${C.danger}22`, color: C.danger,
                                border: `1px solid ${C.danger}44`,
                                padding: '5px 12px', borderRadius: 10, fontSize: 12, fontWeight: 700,
                            }}>
                                {violsData.violationCounts.length} Types
                            </div>
                        </div>
                        <Chart chartType="BarChart"
                            data={[['Violation', 'Count'], ...violsData.violationCounts.map(v => [v.violation, v.count])]}
                            width="100%" height="260px"
                            options={{ ...BAR_OPTS, chartArea: { width: '60%', height: '72%' }, colors: [C.danger] }} />
                    </DashboardCard>
                )}

                {/* Evidence images */}
                {(() => {
                    const withImages = (violsData.users || []).flatMap(u =>
                        u.reports.filter(r => r.imageUrl).map(r => ({
                            ...r,
                            municipalityName: u.municipalityName,
                            barangayName: u.barangayName,
                        }))
                    );
                    if (!withImages.length) return null;
                    return (
                        <DashboardCard>
                            <SectionHeader
                                title={`Violation Evidence (${withImages.length})`}
                                action={<DownloadBtn label="Download All" onClick={downloadAllImages} />}
                            />
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                {withImages.map((r, i) => (
                                    <div key={i} style={{ border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
                                        <a href={getImageUrl(r)} target="_blank" rel="noreferrer" download>
                                            <img src={getImageUrl(r)} alt="violation"
                                                style={{ width: '100%', height: 190, objectFit: 'cover', display: 'block' }} />
                                        </a>
                                        <div style={{ padding: '12px 14px', background: 'rgba(0,0,0,0.2)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                                <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{r.violation}</div>
                                                <div style={{
                                                    background: `${C.danger}22`, color: C.danger,
                                                    border: `1px solid ${C.danger}44`,
                                                    fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 8,
                                                }}>
                                                    VIOLATION
                                                </div>
                                            </div>
                                            <div style={{ display: 'grid', gap: 6, fontSize: 12 }}>
                                                {[
                                                    ['Fishing Gear', r.fishingGear],
                                                    ['Vessel', r.fishingVessel],
                                                    ['Area', r.origin || '—'],
                                                    ['Coordinates', `${r.latitude?.toFixed(5)}, ${r.longitude?.toFixed(5)}`],
                                                    ['Timestamp', r.timestamp ? new Date(r.timestamp).toLocaleString('en-PH') : '—'],
                                                ].map(([label, value]) => (
                                                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, borderBottom: `1px solid ${C.border}`, paddingBottom: 5 }}>
                                                        <span style={{ color: C.muted, fontWeight: 600 }}>{label}</span>
                                                        <span style={{ color: C.text, textAlign: 'right' }}>{value}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <button onClick={() => downloadImage(getImageUrl(r), `violation_${i + 1}.jpg`)} style={{
                                                marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6,
                                                background: C.primary, color: '#0f172a', border: 'none', cursor: 'pointer',
                                                padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                                            }}>
                                                ⬇ Download Image
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </DashboardCard>
                    );
                })()}

                {violsData.users?.length === 0 && <EmptyState message="No violations for this selection." />}
            </>
        ) : (
            <EmptyState message="No violations for this date." />
        )}
    </div>
);

export default ViolationsTab;
