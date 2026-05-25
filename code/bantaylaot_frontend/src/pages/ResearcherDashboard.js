import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { getBarangayByMun } from 'philippine-location-json-for-geer';
import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import OSM from 'ol/source/OSM';
import VectorSource from 'ol/source/Vector';
import Overlay from 'ol/Overlay';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import LineString from 'ol/geom/LineString';
import { fromLonLat } from 'ol/proj';
import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style';
import AdminHeader from '../components/AdminHeader';

import {
    R_URL, MUNICIPALITIES, MUN_NAME_MAP,
    authHeaders, todayStr, getImageUrl, downloadCSV, munName,
} from '../components/dashboard/researcher/constants';
import DashboardTabs from '../components/dashboard/researcher/DashboardTabs';
import SummaryTab from '../components/dashboard/researcher/SummaryTab';
import SessionsTab from '../components/dashboard/researcher/SessionsTab';
import ViolationsTab from '../components/dashboard/researcher/ViolationsTab';
import FishersTab from '../components/dashboard/researcher/FishersTab';

const ResearcherDashboard = () => {
    const [activeTab, setActiveTab] = useState('summary');

    // Fishers tab
    const [userStats,        setUserStats]        = useState(null);
    const [userStatsLoading, setUserStatsLoading] = useState(false);
    const [userStatsMun,     setUserStatsMun]     = useState('');

    // Summary
    const [summaryMonth,     setSummaryMonth]     = useState(new Date().getMonth() + 1);
    const [summaryYear,      setSummaryYear]      = useState(new Date().getFullYear());
    const [summaryMun,       setSummaryMun]       = useState('');
    const [summaryBarangay,  setSummaryBarangay]  = useState('');
    const [violData,         setViolData]         = useState(null);
    const [violLoading,      setViolLoading]      = useState(false);
    const [summaryRoutes,    setSummaryRoutes]    = useState([]);
    const [cpueData,         setCpueData]         = useState(null);
    const [cpueLoading,      setCpueLoading]      = useState(false);
    const [expandedCpueUser, setExpandedCpueUser] = useState(null);

    // Sessions
    const [sessionsDate,        setSessionsDate]        = useState('');
    const [sessionsMun,         setSessionsMun]         = useState('');
    const [sessionsBarangay,    setSessionsBarangay]    = useState('');
    const [sessionsData,        setSessionsData]        = useState(null);
    const [sessionsLoading,     setSessionsLoading]     = useState(false);
    const [selectedSessionUser, setSelectedSessionUser] = useState(null);
    const [sessionNavIdx,       setSessionNavIdx]       = useState(0);

    // Violations
    const [violsDate,     setViolsDate]     = useState('');
    const [violsMun,      setViolsMun]      = useState('');
    const [violsBarangay, setViolsBarangay] = useState('');
    const [violsData,     setViolsData]     = useState(null);
    const [violsLoading,  setViolsLoading]  = useState(false);

    // Map
    const mapRef          = useRef(null);
    const mapObjectRef    = useRef(null);
    const overlayRef      = useRef(null);
    const popupContentRef = useRef(null);
    const popupCloserRef  = useRef(null);
    const vectorLayersRef = useRef([]);

    // ── Map init ──────────────────────────────────────────────────────────────
    useEffect(() => {
        const center = fromLonLat([120.597137, 13.968827]);
        const map    = new Map({
            target: mapRef.current,
            layers: [new TileLayer({ source: new OSM() })],
            view:   new View({ center, zoom: 9 }),
            controls: [],
        });
        mapObjectRef.current = map;

        const overlay = new Overlay({ element: overlayRef.current, autoPan: true, offset: [0, -10] });
        map.addOverlay(overlay);
        popupCloserRef.current.onclick = () => { overlay.setPosition(undefined); return false; };

        map.on('click', evt => {
            const feature = map.forEachFeatureAtPixel(evt.pixel, f => f);
            if (!feature) { overlay.setPosition(undefined); return; }
            const coord = feature.getGeometry().getCoordinates();
            const p = feature.get('properties');
            if (p?.type === 'violation') {
                popupContentRef.current.innerHTML = `
                    <div style="text-align:center;max-width:220px;color:#f8fafc">
                        <strong style="color:#38bdf8">Violation Report</strong>
                        ${p.imageUrl ? `<img src="${getImageUrl(p)}" style="width:100%;margin:6px 0;border-radius:8px"/>` : '<div style="width:100%;aspect-ratio:4/3;margin:6px 0;border-radius:8px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);display:flex;flex-direction:column;align-items:center;justify-content:center;color:#64748b;font-size:11px;gap:4px"><span style="font-size:20px">🖼️</span><span>No image available</span></div>'}
                        <p style="margin:3px 0;color:#94a3b8"><strong style="color:#cbd5e1">Type:</strong> ${p.violation}</p>
                        <p style="margin:3px 0;color:#94a3b8"><strong style="color:#cbd5e1">Gear:</strong> ${p.fishingGear || '—'}</p>
                        <p style="margin:3px 0;color:#94a3b8"><strong style="color:#cbd5e1">Vessel:</strong> ${p.fishingVessel || '—'}</p>
                        <p style="margin:3px 0;color:#94a3b8"><strong style="color:#cbd5e1">Area:</strong> ${p.origin || '—'}</p>
                    </div>`;
            } else if (p) {
                popupContentRef.current.innerHTML = `
                    <p style="margin:4px 0;color:#94a3b8"><strong style="color:#cbd5e1">Lat:</strong> ${p.latitude?.toFixed(5)}</p>
                    <p style="margin:4px 0;color:#94a3b8"><strong style="color:#cbd5e1">Lon:</strong> ${p.longitude?.toFixed(5)}</p>
                    <p style="margin:4px 0;color:#94a3b8"><strong style="color:#cbd5e1">Time:</strong> ${p.timestamp}</p>`;
            } else {
                overlay.setPosition(undefined); return;
            }
            overlay.setPosition(coord);
        });

        return () => map.setTarget(null);
    }, []);

    const clearMapLayers = useCallback(() => {
        const map = mapObjectRef.current;
        if (!map) return;
        vectorLayersRef.current.forEach(l => map.removeLayer(l));
        vectorLayersRef.current = [];
        map.getOverlays().item(0)?.setPosition(undefined);
    }, []);

    const addLayer = useCallback((features, fit = false) => {
        const map = mapObjectRef.current;
        if (!map || !features.length) return;
        const src   = new VectorSource({ features });
        const layer = new VectorLayer({ source: src });
        map.addLayer(layer);
        vectorLayersRef.current.push(layer);
        if (fit) map.getView().fit(src.getExtent(), { padding: [50, 50, 50, 50], maxZoom: 15 });
    }, []);

    const plotSessionRoutes = useCallback((sessions) => {
        clearMapLayers();
        const colors = ['#007AFF', '#34C759', '#5856D6', '#FFD60A', '#5AC8FA'];
        const routes = []; const dots = []; const reps = [];
        sessions.forEach((s, i) => {
            const color = colors[i % colors.length];
            const locs  = [...(s.locations || [])].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            if (locs.length >= 2) {
                const f = new Feature({ geometry: new LineString(locs.map(l => fromLonLat([l.longitude, l.latitude]))) });
                f.setStyle(new Style({ stroke: new Stroke({ color: color + 'CC', width: 2 }) }));
                routes.push(f);
            }
            locs.forEach(l => {
                const f = new Feature({ geometry: new Point(fromLonLat([l.longitude, l.latitude])), properties: l });
                f.setStyle(new Style({ image: new CircleStyle({ radius: 3, fill: new Fill({ color: color + 'B3' }), stroke: new Stroke({ color: '#333', width: 1 }) }) }));
                dots.push(f);
            });
            (s.reports || []).forEach(r => {
                const f = new Feature({ geometry: new Point(fromLonLat([r.longitude, r.latitude])), properties: { ...r, type: 'violation' } });
                f.setStyle(new Style({ image: new CircleStyle({ radius: 6, fill: new Fill({ color: 'rgba(231,76,60,0.8)' }), stroke: new Stroke({ color: '#333', width: 1 }) }) }));
                reps.push(f);
            });
        });
        if (routes.length) addLayer(routes, true);
        if (dots.length)   addLayer(dots,   !routes.length);
        if (reps.length)   addLayer(reps,   !routes.length && !dots.length);
    }, [clearMapLayers, addLayer]);

    const plotViolations = useCallback((reports) => {
        clearMapLayers();
        if (!reports.length) return;
        const features = reports.map(r => {
            const f = new Feature({ geometry: new Point(fromLonLat([r.longitude, r.latitude])), properties: { ...r, type: 'violation' } });
            f.setStyle(new Style({ image: new CircleStyle({ radius: 6, fill: new Fill({ color: 'rgba(231,76,60,0.8)' }), stroke: new Stroke({ color: '#333', width: 2 }) }) }));
            return f;
        });
        addLayer(features, true);
    }, [clearMapLayers, addLayer]);

    const plotSummaryMap = useCallback((reports, routes) => {
        clearMapLayers();
        const routeFeats = []; const dotFeats = [];
        (routes || []).forEach(r => {
            if (r.locations.length < 2) return;
            const line = new Feature({ geometry: new LineString(r.locations.map(l => fromLonLat([l.longitude, l.latitude]))) });
            line.setStyle(new Style({ stroke: new Stroke({ color: '#007AFFCC', width: 2 }) }));
            routeFeats.push(line);
            r.locations.forEach(l => {
                const f = new Feature({ geometry: new Point(fromLonLat([l.longitude, l.latitude])), properties: { ...l } });
                f.setStyle(new Style({ image: new CircleStyle({ radius: 3, fill: new Fill({ color: '#007AFFB3' }), stroke: new Stroke({ color: '#333', width: 1 }) }) }));
                dotFeats.push(f);
            });
        });
        const violFeats = (reports || []).map(r => {
            const f = new Feature({ geometry: new Point(fromLonLat([r.longitude, r.latitude])), properties: { ...r, type: 'violation' } });
            f.setStyle(new Style({ image: new CircleStyle({ radius: 6, fill: new Fill({ color: 'rgba(231,76,60,0.8)' }), stroke: new Stroke({ color: '#333', width: 1 }) }) }));
            return f;
        });
        if (routeFeats.length) addLayer(routeFeats, !violFeats.length);
        if (dotFeats.length)   addLayer(dotFeats,   false);
        if (violFeats.length)  addLayer(violFeats,  true);
    }, [clearMapLayers, addLayer]);

    // ── Fetch helpers ─────────────────────────────────────────────────────────
    const fetchSummary = useCallback(() => {
        setViolLoading(true); setCpueLoading(true);
        const base = `month=${summaryMonth}&year=${summaryYear}${summaryMun ? `&municipality=${summaryMun}` : ''}`;
        fetch(`${R_URL}/summary/violations?${base}`, { headers: authHeaders() })
            .then(r => r.json()).then(setViolData).catch(console.error).finally(() => setViolLoading(false));
        const cpueParams = new URLSearchParams({ month: summaryMonth, year: summaryYear });
        if (summaryMun)      cpueParams.set('municipality', summaryMun);
        if (summaryBarangay) cpueParams.set('barangay', summaryBarangay);
        fetch(`${R_URL}/summary/cpue?${cpueParams}`, { headers: authHeaders() })
            .then(r => r.json()).then(setCpueData).catch(console.error).finally(() => setCpueLoading(false));
    }, [summaryMonth, summaryYear, summaryMun, summaryBarangay]);

    const fetchSummaryRoutes = useCallback(() => {
        const params = new URLSearchParams({ month: summaryMonth, year: summaryYear });
        if (summaryMun)      params.set('municipality', summaryMun);
        if (summaryBarangay) params.set('barangay', summaryBarangay);
        fetch(`${R_URL}/summary/sessions-map?${params}`, { headers: authHeaders() })
            .then(r => r.json()).then(d => setSummaryRoutes(d.routes || [])).catch(() => setSummaryRoutes([]));
    }, [summaryMonth, summaryYear, summaryMun, summaryBarangay]);

    const fetchSessions = useCallback((dateOverride) => {
        const date = dateOverride || sessionsDate;
        if (!date) return;
        setSessionsLoading(true);
        setSelectedSessionUser(null);
        setSessionNavIdx(0);
        const params = new URLSearchParams({ date });
        if (sessionsMun)      params.set('municipality', sessionsMun);
        if (sessionsBarangay) params.set('barangay', sessionsBarangay);
        fetch(`${R_URL}/sessions/by-date?${params}`, { headers: authHeaders() })
            .then(r => r.json()).then(setSessionsData).catch(console.error).finally(() => setSessionsLoading(false));
    }, [sessionsDate, sessionsMun, sessionsBarangay]);

    const fetchViolations = useCallback((dateOverride) => {
        const date = dateOverride || violsDate;
        if (!date) return;
        setViolsLoading(true);
        const params = new URLSearchParams({ date });
        if (violsMun)      params.set('municipality', violsMun);
        if (violsBarangay) params.set('barangay', violsBarangay);
        fetch(`${R_URL}/violations/by-date?${params}`, { headers: authHeaders() })
            .then(r => r.json()).then(setViolsData).catch(console.error).finally(() => setViolsLoading(false));
    }, [violsDate, violsMun, violsBarangay]);

    useEffect(() => {
        if (activeTab === 'summary') { fetchSummary(); fetchSummaryRoutes(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, summaryMonth, summaryYear, summaryMun, summaryBarangay]);

    useEffect(() => {
        if (activeTab !== 'sessions') return;
        if (sessionsDate) { fetchSessions(); return; }
        setSessionsLoading(true);
        const p = sessionsMun ? `?municipality=${sessionsMun}` : '';
        fetch(`${R_URL}/sessions/recent-date${p}`, { headers: authHeaders() })
            .then(r => r.json())
            .then(({ date }) => { const d = date || todayStr(); setSessionsDate(d); fetchSessions(d); })
            .catch(() => { setSessionsDate(todayStr()); setSessionsLoading(false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, sessionsMun]);

    useEffect(() => {
        if (activeTab !== 'violations') return;
        if (violsDate) { fetchViolations(); return; }
        setViolsLoading(true);
        const p = violsMun ? `?municipality=${violsMun}` : '';
        fetch(`${R_URL}/violations/recent-date${p}`, { headers: authHeaders() })
            .then(r => r.json())
            .then(({ date }) => { const d = date || todayStr(); setViolsDate(d); fetchViolations(d); })
            .catch(() => { setViolsDate(todayStr()); setViolsLoading(false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, violsMun]);

    useEffect(() => {
        if (activeTab === 'sessions' && sessionsDate) fetchSessions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionsBarangay]);

    useEffect(() => {
        if (activeTab === 'violations' && violsDate) fetchViolations();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [violsBarangay]);

    // ── Fishers tab data ──────────────────────────────────────────────────────
    useEffect(() => {
        if (activeTab !== 'fishers' || userStats) return;
        setUserStatsLoading(true);
        fetch(`${R_URL}/user-stats`, { headers: authHeaders() })
            .then(r => r.json()).then(setUserStats).catch(console.error).finally(() => setUserStatsLoading(false));
    }, [activeTab, userStats]);

    // ── Barangay lists ────────────────────────────────────────────────────────
    const sessionBarangays = useMemo(() =>
        sessionsMun ? getBarangayByMun(sessionsMun.slice(0, 6)).map(b => b.name) : [], [sessionsMun]);
    const violsBarangays = useMemo(() =>
        violsMun ? getBarangayByMun(violsMun.slice(0, 6)).map(b => b.name) : [], [violsMun]);
    const summaryBarangays = useMemo(() =>
        summaryMun ? getBarangayByMun(summaryMun.slice(0, 6)).map(b => b.name) : [], [summaryMun]);

    // ── Map sync ──────────────────────────────────────────────────────────────
    useEffect(() => {
        if (activeTab !== 'summary') return;
        const filteredRoutes = summaryBarangay
            ? summaryRoutes.filter(r => r.barangayName === summaryBarangay)
            : summaryRoutes;
        let reports = (violData?.reports || []).filter(r => !summaryMun || r.municipalityId === summaryMun);
        if (summaryBarangay) reports = reports.filter(r => r.barangayName === summaryBarangay);
        plotSummaryMap(reports, filteredRoutes);
    }, [activeTab, violData, summaryMun, summaryBarangay, summaryRoutes, plotSummaryMap]);

    useEffect(() => {
        if (activeTab !== 'sessions') return;
        if (selectedSessionUser) {
            const s = selectedSessionUser.sessions[sessionNavIdx];
            if (s) plotSessionRoutes([s]);
        } else {
            const allSessions = (sessionsData?.users || []).flatMap(u => u.sessions);
            if (allSessions.length) plotSessionRoutes(allSessions); else clearMapLayers();
        }
    }, [activeTab, sessionsData, selectedSessionUser, sessionNavIdx, plotSessionRoutes, clearMapLayers]);

    useEffect(() => {
        if (activeTab !== 'violations') return;
        const allReports = (violsData?.users || []).flatMap(u => u.reports);
        if (allReports.length) plotViolations(allReports); else clearMapLayers();
    }, [activeTab, violsData, plotViolations, clearMapLayers]);

    // ── CSV download helpers ──────────────────────────────────────────────────
    const downloadSummaryCSV = () => {
        const rows = [['Municipality', 'Barangay', 'Violations', '%']];
        (violData?.byMunicipality || []).forEach(d => rows.push([munName(d.municipalityName), '', d.count, d.percentage]));
        if (violData?.byBarangay?.length) {
            const munLabel = MUNICIPALITIES.find(m => m.id === summaryMun)?.name || summaryMun;
            rows.push([]);
            rows.push([`Barangay breakdown — ${munLabel}`, '', '', '']);
            (violData.byBarangay || []).forEach(d => rows.push([munLabel, d.barangayName, d.count, d.percentage]));
        }
        if (violData?.reports?.length) {
            const filtered = summaryMun ? violData.reports.filter(r => r.municipalityId === summaryMun) : violData.reports;
            const typeCounts = {};
            filtered.forEach(r => { typeCounts[r.violation] = (typeCounts[r.violation] || 0) + 1; });
            const typeRows = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);
            if (typeRows.length) {
                rows.push([]);
                rows.push(['Violation Type', '', 'Count', '']);
                typeRows.forEach(([violation, count]) => rows.push([violation, '', count, '']));
            }
        }
        downloadCSV(`violations_summary_${summaryYear}_${summaryMonth}.csv`, rows);
    };

    const downloadSessionsCSV = () => {
        const rows = [['Date', 'Municipality', 'Barangay', 'Fisher', 'Gear', 'Fish Species', 'Weight (kg)', 'Duration (hrs)', 'CPUE (kg/hr)']];
        (sessionsData?.users || []).forEach(u => {
            u.sessions.forEach(s => {
                const hours = s.session.endDateTime
                    ? ((new Date(s.session.endDateTime) - new Date(s.session.startDateTime)) / 3.6e6).toFixed(2) : '';
                s.fishings.forEach(f => {
                    const cpue = hours > 0 ? (f.totalWeight / parseFloat(hours)).toFixed(2) : '';
                    rows.push([sessionsDate, munName(u.municipalityName), u.barangayName, u.name, f.gear, f.fishSpecies, f.totalWeight, hours, cpue]);
                });
            });
        });
        downloadCSV(`sessions_${sessionsDate}.csv`, rows);
    };

    const downloadViolationsCSV = () => {
        const rows = [['Date', 'Time', 'Municipality', 'Barangay', 'Reporter', 'Violation Type', 'Gear Used', 'Vessel Type', 'Latitude', 'Longitude', 'Origin Area']];
        (violsData?.users || []).forEach(u => {
            u.reports.forEach(r => {
                rows.push([
                    violsDate,
                    r.timestamp ? new Date(r.timestamp).toLocaleTimeString('en-PH') : '',
                    munName(u.municipalityName), u.barangayName, u.name,
                    r.violation, r.fishingGear, r.fishingVessel,
                    r.latitude, r.longitude, r.origin,
                ]);
            });
        });
        downloadCSV(`violations_${violsDate}.csv`, rows);
    };

    const downloadCpueCSV = () => {
        const GEARS = ['Surface Gill Net', 'Bottom Set Gill Net', 'Hook And Line'];
        const rows = [['Gear', 'CPUE (kg/hr)'], ...GEARS.filter(g => cpueData?.cpue?.[g] != null).map(g => [g, cpueData.cpue[g].toFixed(2)])];
        if (cpueData?.fishCatch?.length) {
            rows.push([]);
            rows.push(['Species', 'Total Weight (kg)']);
            cpueData.fishCatch.forEach(i => rows.push([i.species, i.weight]));
        }
        downloadCSV(`cpue_${summaryYear}_${summaryMonth}.csv`, rows);
    };

    const downloadUserStatsCSV = () => {
        const rows = [['Municipality', 'Barangay', 'Total Fishers', 'Approved', 'Pending']];
        const list = userStatsMun
            ? (userStats?.byBarangay || []).filter(d => d.municipalityId === userStatsMun)
            : (userStats?.byMunicipality || []);
        if (userStatsMun) {
            list.forEach(d => rows.push([munName(d.municipalityName), d.barangayName, d.total, d.approved, d.pending]));
        } else {
            list.forEach(d => rows.push([munName(d.municipalityName), '', d.total, d.approved, d.pending]));
        }
        downloadCSV('fisher_stats.csv', rows);
    };

    const downloadAllFishingImages = async () => {
        const fishings = (sessionsData?.users || []).flatMap(u =>
            u.sessions.flatMap(s => s.fishings.filter(f => f.imageUrl).map(f => ({ ...f, municipalityId: f.municipalityId || u.municipalityId, userName: u.name })))
        );
        if (!fishings.length) {
            alert('No catch photos available for this selection.');
            return;
        }
        const zip = new JSZip();
        await Promise.all(fishings.map(async (f, i) => {
            try {
                const url  = getImageUrl(f);
                const res  = await fetch(url);
                const blob = await res.blob();
                const ext  = url.split('.').pop().split('?')[0] || 'jpg';
                zip.file(`catch_${i + 1}.${ext}`, blob);
                zip.file(`catch_${i + 1}_metadata.txt`, [`Species: ${f.fishSpecies}`, `Gear: ${f.gear}`, `Weight: ${f.totalWeight} kg`].join('\n'));
            } catch { /* skip */ }
        }));
        const content = await zip.generateAsync({ type: 'blob' });
        saveAs(content, `catch_images_${sessionsDate}.zip`);
    };

    const downloadAllImages = async () => {
        const reports = (violsData?.users || []).flatMap(u => u.reports.filter(r => r.imageUrl).map(r => ({ ...r, municipalityId: r.municipalityId || u.municipalityId })));
        if (!reports.length) return;
        const zip = new JSZip();
        await Promise.all(reports.map(async (r, i) => {
            try {
                const url  = getImageUrl(r);
                const res  = await fetch(url);
                const blob = await res.blob();
                const ext  = url.split('.').pop().split('?')[0] || 'jpg';
                zip.file(`image_${i + 1}.${ext}`, blob);
                zip.file(`image_${i + 1}_metadata.txt`, [`Violation: ${r.violation}`, `Gear: ${r.fishingGear}`, `Time: ${r.timestamp ? new Date(r.timestamp).toLocaleString('en-PH') : ''}`].join('\n'));
            } catch { /* skip */ }
        }));
        const content = await zip.generateAsync({ type: 'blob' });
        saveAs(content, `violation_images_${violsDate}.zip`);
    };

    // ── Chart data for Fishers tab ────────────────────────────────────────────
    const userChartData = useMemo(() => {
        if (!userStats) return null;
        if (userStatsMun) {
            const rows = (userStats.byBarangay || []).filter(d => d.municipalityId === userStatsMun).sort((a, b) => b.total - a.total);
            return rows.length ? [['Barangay', 'Fishers'], ...rows.map(d => [d.barangayName, d.total])] : null;
        }
        const rows = (userStats.byMunicipality || []).sort((a, b) => b.total - a.total);
        return rows.length ? [['Municipality', 'Fishers'], ...rows.map(d => [munName(d.municipalityName), d.total])] : null;
    }, [userStats, userStatsMun]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
            <AdminHeader />

            <div style={{ display: 'flex', flex: 1, overflow: 'hidden', gap: 16, padding: 16, background: '#0A1628' }}>
                {/* Map */}
                <div style={{ flex: '0 0 67%', position: 'relative', overflow: 'hidden', borderRadius: 20, border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }}>
                    <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
                    <div style={{
                        position: 'absolute', top: 16, left: 16, zIndex: 10,
                        background: 'rgba(15,23,42,0.92)', backdropFilter: 'blur(16px)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        padding: '10px 14px', borderRadius: 14,
                        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                    }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: '#38bdf8' }}>Research Monitoring Map</div>
                        <div style={{ fontSize: 12, color: '#94a3b8' }}>Anonymized fishing data</div>
                    </div>
                    <div style={{ position: 'absolute', bottom: 16, right: 16, zIndex: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <button
                            onClick={() => { const v = mapObjectRef.current?.getView(); if (v) v.animate({ zoom: v.getZoom() + 1, duration: 250 }); }}
                            style={{ width: 34, height: 34, background: 'rgba(15,23,42,0.92)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, cursor: 'pointer', color: '#f8fafc', fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, fontFamily: 'monospace' }}>+</button>
                        <button
                            onClick={() => { const v = mapObjectRef.current?.getView(); if (v) v.animate({ zoom: v.getZoom() - 1, duration: 250 }); }}
                            style={{ width: 34, height: 34, background: 'rgba(15,23,42,0.92)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, cursor: 'pointer', color: '#f8fafc', fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, fontFamily: 'monospace' }}>−</button>
                    </div>
                    <div ref={overlayRef} className="ol-popup" style={{
                        background: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(16px)',
                        border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12,
                        padding: '10px 14px', maxWidth: 260, fontSize: 13,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                    }}>
                        <button ref={popupCloserRef} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#94a3b8' }}>✕</button>
                        <div ref={popupContentRef} />
                    </div>
                </div>

                {/* Sidebar */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: 20, border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 8px 40px rgba(0,0,0,0.4)', background: '#0f172a' }}>
                    <div style={{
                        background: 'rgba(56,189,248,0.08)', padding: '6px 14px',
                        borderBottom: '1px solid rgba(56,189,248,0.15)', fontSize: 11,
                        color: '#38bdf8', fontWeight: 600, letterSpacing: 0.3,
                    }}>
                        RESEARCHER VIEW — ANONYMIZED DATA
                    </div>

                    <DashboardTabs activeTab={activeTab} setActiveTab={setActiveTab} />

                    <div style={{ flex: 1, overflowY: 'auto', padding: 12, background: '#0f172a' }}>
                        {activeTab === 'summary' && (
                            <SummaryTab
                                summaryMonth={summaryMonth} setSummaryMonth={setSummaryMonth}
                                summaryYear={summaryYear} setSummaryYear={setSummaryYear}
                                summaryMun={summaryMun} setSummaryMun={setSummaryMun}
                                summaryBarangay={summaryBarangay} setSummaryBarangay={setSummaryBarangay}
                                summaryBarangays={summaryBarangays}
                                violData={violData} violLoading={violLoading}
                                cpueData={cpueData} cpueLoading={cpueLoading}
                                expandedCpueUser={expandedCpueUser} setExpandedCpueUser={setExpandedCpueUser}
                                downloadSummaryCSV={downloadSummaryCSV} downloadCpueCSV={downloadCpueCSV}
                            />
                        )}
                        {activeTab === 'sessions' && (
                            <SessionsTab
                                sessionsDate={sessionsDate} setSessionsDate={setSessionsDate}
                                sessionsMun={sessionsMun} setSessionsMun={setSessionsMun}
                                sessionsBarangay={sessionsBarangay} setSessionsBarangay={setSessionsBarangay}
                                sessionBarangays={sessionBarangays}
                                sessionsData={sessionsData} sessionsLoading={sessionsLoading}
                                selectedSessionUser={selectedSessionUser} setSelectedSessionUser={setSelectedSessionUser}
                                sessionNavIdx={sessionNavIdx} setSessionNavIdx={setSessionNavIdx}
                                fetchSessions={fetchSessions} clearMapLayers={clearMapLayers}
                                plotSessionRoutes={plotSessionRoutes}
                                downloadSessionsCSV={downloadSessionsCSV}
                                downloadAllFishingImages={downloadAllFishingImages}
                            />
                        )}
                        {activeTab === 'violations' && (
                            <ViolationsTab
                                violsDate={violsDate} setViolsDate={setViolsDate}
                                violsMun={violsMun} setViolsMun={setViolsMun}
                                violsBarangay={violsBarangay} setViolsBarangay={setViolsBarangay}
                                violsBarangays={violsBarangays}
                                violsData={violsData} violsLoading={violsLoading}
                                fetchViolations={fetchViolations}
                                downloadViolationsCSV={downloadViolationsCSV}
                                downloadAllImages={downloadAllImages}
                            />
                        )}
                        {activeTab === 'fishers' && (
                            <FishersTab
                                userStatsMun={userStatsMun} setUserStatsMun={setUserStatsMun}
                                userStats={userStats} userStatsLoading={userStatsLoading}
                                userChartData={userChartData}
                                downloadUserStatsCSV={downloadUserStatsCSV}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResearcherDashboard;
