import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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

import { C } from '../components/dashboard/municipal/theme';
import DashboardTabs from '../components/dashboard/municipal/DashboardTabs';
import SummaryTab from '../components/dashboard/municipal/SummaryTab';
import SessionsTab from '../components/dashboard/municipal/SessionsTab';
import ViolationsTab from '../components/dashboard/municipal/ViolationsTab';

const getServerUrl = () => localStorage.getItem('server_url') || 'http://localhost:3001';
const authHeaders  = () => ({ Authorization: `Bearer ${localStorage.getItem('jwt_token')}` });
const todayStr     = () => new Date().toISOString().slice(0, 10);

const getImageUrl = (imageUrl) => {
    if (!imageUrl) return null;
    const cloudIdx = imageUrl.indexOf('https://res.cloudinary.com');
    if (cloudIdx > 0) return imageUrl.slice(cloudIdx);
    const serverUrl = getServerUrl();
    const isLocalServer = serverUrl.includes('localhost') || serverUrl.includes('127.0.0.1');
    const path = imageUrl.replace(/^https?:\/\/[^/]+/, '');
    if (path.startsWith('/uploads/')) return isLocalServer ? `${serverUrl}${path}` : null;
    if (imageUrl.includes('localhost') || imageUrl.includes('127.0.0.1')) return `${serverUrl}${path}`;
    if (imageUrl.startsWith('https://') || imageUrl.startsWith('http://')) return imageUrl;
    return `${serverUrl}${imageUrl}`;
};

const SERVER_PSGC = {
    'http://localhost:3001': '104305000',
    'http://localhost:3002': '104321000',
};

const MunicipalDashboard = () => {
    const [activeTab, setActiveTab] = useState('summary');

    // Summary state
    const [summaryMonth,     setSummaryMonth]     = useState(new Date().getMonth() + 1);
    const [summaryYear,      setSummaryYear]      = useState(new Date().getFullYear());
    const [summaryBarangay,  setSummaryBarangay]  = useState('');
    const [violData,         setViolData]         = useState(null);
    const [cpueData,         setCpueData]         = useState(null);
    const [violLoading,      setViolLoading]      = useState(false);
    const [cpueLoading,      setCpueLoading]      = useState(false);
    const [summaryRoutes,    setSummaryRoutes]    = useState([]);
    const [expandedCpueUser, setExpandedCpueUser] = useState(null);

    // Sessions state
    const [sessionsDate,        setSessionsDate]        = useState('');
    const [sessionsBarangay,    setSessionsBarangay]    = useState('');
    const [sessionsData,        setSessionsData]        = useState(null);
    const [sessionsLoading,     setSessionsLoading]     = useState(false);
    const [selectedSessionUser, setSelectedSessionUser] = useState(null);
    const [sessionNavIdx,       setSessionNavIdx]       = useState(0);

    // Violations state
    const [violsDate,       setViolsDate]       = useState('');
    const [violsBarangay,   setViolsBarangay]   = useState('');
    const [violsData,       setViolsData]       = useState(null);
    const [violsLoading,    setViolsLoading]    = useState(false);
    const [selectedViolUser, setSelectedViolUser] = useState(null);
    const [violNavIdx,      setViolNavIdx]      = useState(0);

    // Map refs
    const mapRef          = useRef(null);
    const mapObjectRef    = useRef(null);
    const overlayRef      = useRef(null);
    const popupContentRef = useRef(null);
    const popupCloserRef  = useRef(null);
    const vectorLayersRef = useRef([]);

    // ── Map init ──────────────────────────────────────────────────────────────
    useEffect(() => {
        const center = fromLonLat([120.597137, 13.968827]);
        const newMap = new Map({
            target: mapRef.current,
            layers: [new TileLayer({ source: new OSM() })],
            view:   new View({ center, zoom: 10 }),
            controls: [],
        });
        mapObjectRef.current = newMap;

        const overlay = new Overlay({ element: overlayRef.current, autoPan: true, offset: [0, -10] });
        newMap.addOverlay(overlay);

        popupCloserRef.current.onclick = () => { overlay.setPosition(undefined); return false; };

        newMap.on('click', evt => {
            const feature = newMap.forEachFeatureAtPixel(evt.pixel, f => f);
            if (!feature) { overlay.setPosition(undefined); return; }
            const coord = feature.getGeometry().getCoordinates();
            const p     = feature.get('properties');
            if (p?.type === 'violation') {
                popupContentRef.current.innerHTML = `
                    <div style="text-align:center;max-width:220px;color:#f8fafc">
                        <strong style="color:#38bdf8">Violation Report</strong>
                        ${getImageUrl(p.imageUrl) ? `<img src="${getImageUrl(p.imageUrl)}" style="width:100%;margin:6px 0;border-radius:8px" />` : '<div style="width:100%;aspect-ratio:4/3;margin:6px 0;border-radius:8px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);display:flex;flex-direction:column;align-items:center;justify-content:center;color:#64748b;font-size:11px;gap:4px"><span style="font-size:20px">🖼️</span><span>No image available</span></div>'}
                        ${p.reporterName ? `<p style="margin:3px 0;color:#94a3b8"><strong style="color:#cbd5e1">Reporter:</strong> ${p.reporterName}</p>` : ''}
                        <p style="margin:3px 0;color:#94a3b8"><strong style="color:#cbd5e1">Violator:</strong> ${p.violator || '—'}</p>
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

        return () => newMap.setTarget(null);
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

    const plotSessionLocations = useCallback((sessions) => {
        clearMapLayers();
        const colors = ['#38bdf8', '#2dd4bf', '#818cf8', '#fb923c', '#4ade80'];
        const routeFeatures = [], locFeatures = [], repFeatures = [];
        sessions.forEach((s, i) => {
            const color = colors[i % colors.length];
            const locs  = [...(s.locations || [])].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            if (locs.length >= 2) {
                const line = new Feature({ geometry: new LineString(locs.map(l => fromLonLat([l.longitude, l.latitude]))) });
                line.setStyle(new Style({ stroke: new Stroke({ color: color + 'CC', width: 2.5 }) }));
                routeFeatures.push(line);
            }
            locs.forEach(loc => {
                const f = new Feature({ geometry: new Point(fromLonLat([loc.longitude, loc.latitude])), properties: loc });
                f.setStyle(new Style({ image: new CircleStyle({ radius: 3, fill: new Fill({ color: color + 'B3' }), stroke: new Stroke({ color: '#0f172a', width: 1 }) }) }));
                locFeatures.push(f);
            });
            (s.reports || []).forEach(r => {
                const f = new Feature({ geometry: new Point(fromLonLat([r.longitude, r.latitude])), properties: { ...r, type: 'violation' } });
                f.setStyle(new Style({ image: new CircleStyle({ radius: 6, fill: new Fill({ color: 'rgba(248,113,113,0.85)' }), stroke: new Stroke({ color: '#0f172a', width: 1.5 }) }) }));
                repFeatures.push(f);
            });
        });
        if (routeFeatures.length) addLayer(routeFeatures, true);
        if (locFeatures.length)   addLayer(locFeatures,   !routeFeatures.length);
        if (repFeatures.length)   addLayer(repFeatures,   !routeFeatures.length && !locFeatures.length);
    }, [clearMapLayers, addLayer]);

    const plotViolationOnMap = useCallback((report) => {
        clearMapLayers();
        const f = new Feature({ geometry: new Point(fromLonLat([report.longitude, report.latitude])), properties: { ...report, type: 'violation' } });
        f.setStyle(new Style({ image: new CircleStyle({ radius: 7, fill: new Fill({ color: 'rgba(248,113,113,0.85)' }), stroke: new Stroke({ color: '#0f172a', width: 2 }) }) }));
        addLayer([f], false);
        mapObjectRef.current?.getView().animate({ center: fromLonLat([report.longitude, report.latitude]), zoom: 14 });
    }, [clearMapLayers, addLayer]);

    const plotViolationsOnMap = useCallback((reports) => {
        clearMapLayers();
        if (!reports.length) return;
        const features = reports.map(r => {
            const f = new Feature({ geometry: new Point(fromLonLat([r.longitude, r.latitude])), properties: { ...r, type: 'violation' } });
            f.setStyle(new Style({ image: new CircleStyle({ radius: 6, fill: new Fill({ color: 'rgba(248,113,113,0.85)' }), stroke: new Stroke({ color: '#0f172a', width: 2 }) }) }));
            return f;
        });
        addLayer(features, true);
    }, [clearMapLayers, addLayer]);

    const plotSummaryMap = useCallback((reports, routes) => {
        clearMapLayers();
        const routeFeats = [], dotFeats = [];
        (routes || []).forEach(r => {
            if (r.locations.length < 2) return;
            const line = new Feature({ geometry: new LineString(r.locations.map(l => fromLonLat([l.longitude, l.latitude]))) });
            line.setStyle(new Style({ stroke: new Stroke({ color: '#38bdf8CC', width: 2.5 }) }));
            routeFeats.push(line);
            r.locations.forEach(l => {
                const f = new Feature({ geometry: new Point(fromLonLat([l.longitude, l.latitude])), properties: { ...l } });
                f.setStyle(new Style({ image: new CircleStyle({ radius: 3, fill: new Fill({ color: '#38bdf8B3' }), stroke: new Stroke({ color: '#0f172a', width: 1 }) }) }));
                dotFeats.push(f);
            });
        });
        const violFeats = (reports || []).map(r => {
            const f = new Feature({ geometry: new Point(fromLonLat([r.longitude, r.latitude])), properties: { ...r, type: 'violation' } });
            f.setStyle(new Style({ image: new CircleStyle({ radius: 6, fill: new Fill({ color: 'rgba(248,113,113,0.85)' }), stroke: new Stroke({ color: '#0f172a', width: 1.5 }) }) }));
            return f;
        });
        if (routeFeats.length) addLayer(routeFeats, !violFeats.length);
        if (dotFeats.length)   addLayer(dotFeats,   false);
        if (violFeats.length)  addLayer(violFeats,  true);
    }, [clearMapLayers, addLayer]);

    // ── Data fetches ──────────────────────────────────────────────────────────
    const fetchViolSummary = useCallback(() => {
        setViolLoading(true);
        fetch(`${getServerUrl()}/api/summary/violations?month=${summaryMonth}&year=${summaryYear}`, { headers: authHeaders() })
            .then(r => r.json()).then(setViolData).catch(console.error).finally(() => setViolLoading(false));
    }, [summaryMonth, summaryYear]);

    const fetchSummaryRoutes = useCallback(() => {
        const params = new URLSearchParams({ month: summaryMonth, year: summaryYear });
        if (summaryBarangay) params.set('barangay', summaryBarangay);
        fetch(`${getServerUrl()}/api/summary/sessions-map?${params}`, { headers: authHeaders() })
            .then(r => r.json()).then(d => setSummaryRoutes(d.routes || [])).catch(() => setSummaryRoutes([]));
    }, [summaryMonth, summaryYear, summaryBarangay]);

    const fetchCpueSummary = useCallback(() => {
        setCpueLoading(true);
        const params = new URLSearchParams({ month: summaryMonth, year: summaryYear });
        if (summaryBarangay) params.set('barangay', summaryBarangay);
        fetch(`${getServerUrl()}/api/summary/cpue?${params}`, { headers: authHeaders() })
            .then(r => r.json()).then(setCpueData).catch(console.error).finally(() => setCpueLoading(false));
    }, [summaryMonth, summaryYear, summaryBarangay]);

    useEffect(() => {
        if (activeTab === 'summary') { fetchViolSummary(); fetchSummaryRoutes(); fetchCpueSummary(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, summaryMonth, summaryYear, summaryBarangay]);

    const fetchSessionsData = useCallback((dateOverride) => {
        const date = dateOverride || sessionsDate;
        if (!date) return;
        setSessionsLoading(true);
        setSelectedSessionUser(null);
        fetch(`${getServerUrl()}/api/sessions/by-date?date=${date}`, { headers: authHeaders() })
            .then(r => r.json()).then(setSessionsData).catch(console.error).finally(() => setSessionsLoading(false));
    }, [sessionsDate]);

    useEffect(() => {
        if (activeTab !== 'sessions') return;
        if (sessionsDate) { fetchSessionsData(); return; }
        setSessionsLoading(true);
        fetch(`${getServerUrl()}/api/sessions/recent-date`, { headers: authHeaders() })
            .then(r => r.json())
            .then(({ date }) => { const d = date || todayStr(); setSessionsDate(d); fetchSessionsData(d); })
            .catch(() => { setSessionsDate(todayStr()); setSessionsLoading(false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);

    const fetchViolsData = useCallback((dateOverride) => {
        const date = dateOverride || violsDate;
        if (!date) return;
        setViolsLoading(true);
        setSelectedViolUser(null);
        fetch(`${getServerUrl()}/api/violations/by-date?date=${date}`, { headers: authHeaders() })
            .then(r => r.json()).then(setViolsData).catch(console.error).finally(() => setViolsLoading(false));
    }, [violsDate]);

    useEffect(() => {
        if (activeTab !== 'violations') return;
        if (violsDate) { fetchViolsData(); return; }
        setViolsLoading(true);
        fetch(`${getServerUrl()}/api/violations/recent-date`, { headers: authHeaders() })
            .then(r => r.json())
            .then(({ date }) => { const d = date || todayStr(); setViolsDate(d); fetchViolsData(d); })
            .catch(() => { setViolsDate(todayStr()); setViolsLoading(false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);

    // ── Barangay list ─────────────────────────────────────────────────────────
    const barangayList = useMemo(() => {
        const serverUrl = localStorage.getItem('server_url') || '';
        const psgcCode  = SERVER_PSGC[serverUrl] || '';
        return psgcCode ? getBarangayByMun(psgcCode.slice(0, 6)).map(b => b.name) : [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Derived data ──────────────────────────────────────────────────────────
    const filteredSessionUsers = (sessionsData?.users || []).filter(u =>
        !sessionsBarangay || u.barangayName === sessionsBarangay
    );
    const filteredViolsUsers = (violsData?.users || []).filter(u =>
        !violsBarangay || u.barangayName === violsBarangay
    );

    const sessionChartData = useMemo(() => {
        if (!sessionsData || !sessionsBarangay) return sessionsData;
        const species = {}, gearWeight = {}, gearHours = {};
        filteredSessionUsers.forEach(u => u.sessions.forEach(s => {
            const h = s.session.endDateTime
                ? (new Date(s.session.endDateTime) - new Date(s.session.startDateTime)) / 3.6e6 : 0;
            s.fishings.forEach(f => {
                species[f.fishSpecies] = (species[f.fishSpecies] || 0) + f.totalWeight;
                if (h > 0) { gearWeight[f.gear] = (gearWeight[f.gear] || 0) + f.totalWeight; gearHours[f.gear] = (gearHours[f.gear] || 0) + h; }
            });
        }));
        const fishCatch = Object.entries(species).map(([s, w]) => ({ species: s, weight: w }));
        const cpue = {};
        Object.keys(gearWeight).forEach(g => { if (gearHours[g]) cpue[g] = gearWeight[g] / gearHours[g]; });
        return { ...sessionsData, fishCatch, cpue };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionsData, sessionsBarangay, filteredSessionUsers]);

    const violsChartData = useMemo(() => {
        if (!violsData || !violsBarangay) return violsData;
        const acc = {};
        filteredViolsUsers.forEach(u => u.reports.forEach(r => { acc[r.violation] = (acc[r.violation] || 0) + 1; }));
        return {
            ...violsData,
            violationCounts: Object.entries(acc).map(([violation, count]) => ({ violation, count })),
            total: filteredViolsUsers.reduce((s, u) => s + u.reportCount, 0),
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [violsData, violsBarangay, filteredViolsUsers]);

    // ── Map reactivity ────────────────────────────────────────────────────────
    useEffect(() => {
        if (activeTab !== 'sessions') return;
        if (selectedSessionUser) {
            const session = selectedSessionUser.sessions[sessionNavIdx];
            if (session) plotSessionLocations([session]);
        } else {
            const filtered = (sessionsData?.users || []).filter(u => !sessionsBarangay || u.barangayName === sessionsBarangay);
            const all = filtered.flatMap(u => u.sessions);
            if (all.length) plotSessionLocations(all); else clearMapLayers();
        }
    }, [activeTab, sessionsData, sessionsBarangay, selectedSessionUser, sessionNavIdx, plotSessionLocations, clearMapLayers]);

    useEffect(() => {
        if (activeTab !== 'violations') return;
        if (selectedViolUser) {
            const report = selectedViolUser.reports[violNavIdx];
            if (report) plotViolationOnMap({ ...report, reporterName: selectedViolUser.name });
        } else {
            const filtered = (violsData?.users || []).filter(u => !violsBarangay || u.barangayName === violsBarangay);
            const all = filtered.flatMap(u => u.reports.map(r => ({ ...r, reporterName: u.name })));
            if (all.length) plotViolationsOnMap(all); else clearMapLayers();
        }
    }, [activeTab, violsData, violsBarangay, selectedViolUser, violNavIdx, plotViolationOnMap, plotViolationsOnMap, clearMapLayers]);

    useEffect(() => {
        if (activeTab !== 'summary') return;
        const filteredRoutes = summaryBarangay
            ? summaryRoutes.filter(r => r.barangayName === summaryBarangay)
            : summaryRoutes;
        const reports = summaryBarangay
            ? (violData?.mapReports || []).filter(r => r.barangayName === summaryBarangay)
            : (violData?.mapReports || []);
        plotSummaryMap(reports, filteredRoutes);
    }, [activeTab, violData, summaryRoutes, summaryBarangay, plotSummaryMap]);

    return (
        <div style={{
            display: 'flex', flexDirection: 'column', height: '100vh',
            background: 'linear-gradient(180deg, #0f172a 0%, #111827 100%)',
            overflow: 'hidden', fontFamily: C.font,
        }}>
            <AdminHeader />

            <div style={{
                display: 'grid',
                gridTemplateColumns: window.innerWidth < 1024 ? '1fr' : '1.7fr 420px',
                gap: 16, padding: 16, flex: 1, overflow: 'hidden',
            }}>
                {/* ── Map Card ──────────────────────────────────────────────── */}
                <div style={{
                    position: 'relative', borderRadius: 20, overflow: 'hidden',
                    border: `1px solid ${C.border}`,
                    boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
                }}>
                    <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

                    <div style={{
                        position: 'absolute', top: 16, left: 16, zIndex: 10,
                        background: 'rgba(15,23,42,0.92)',
                        backdropFilter: 'blur(16px)',
                        border: `1px solid ${C.border}`,
                        padding: '10px 14px', borderRadius: 14,
                        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                    }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: C.primary }}>Municipal Monitoring Map</div>
                        <div style={{ fontSize: 12, color: C.muted }}>Fishing sessions and violations</div>
                    </div>

                    <div style={{ position: 'absolute', bottom: 16, right: 16, zIndex: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <button
                            onClick={() => { const v = mapObjectRef.current?.getView(); if (v) v.animate({ zoom: v.getZoom() + 1, duration: 250 }); }}
                            style={{ width: 34, height: 34, background: 'rgba(15,23,42,0.92)', backdropFilter: 'blur(16px)', border: `1px solid ${C.border}`, borderRadius: 8, cursor: 'pointer', color: '#f8fafc', fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, fontFamily: 'monospace' }}>+</button>
                        <button
                            onClick={() => { const v = mapObjectRef.current?.getView(); if (v) v.animate({ zoom: v.getZoom() - 1, duration: 250 }); }}
                            style={{ width: 34, height: 34, background: 'rgba(15,23,42,0.92)', backdropFilter: 'blur(16px)', border: `1px solid ${C.border}`, borderRadius: 8, cursor: 'pointer', color: '#f8fafc', fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, fontFamily: 'monospace' }}>−</button>
                    </div>

                    <div ref={overlayRef} className="ol-popup" style={{
                        background: 'rgba(15,23,42,0.95)',
                        backdropFilter: 'blur(16px)',
                        border: `1px solid ${C.border}`,
                        borderRadius: 12, padding: '10px 14px', maxWidth: 260, fontSize: 13,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                    }}>
                        <button ref={popupCloserRef} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, lineHeight: 1, color: C.muted }}>✕</button>
                        <div ref={popupContentRef} />
                    </div>
                </div>

                {/* ── Sidebar ────────────────────────────────────────────────── */}
                <div style={{
                    display: 'flex', flexDirection: 'column', overflow: 'hidden',
                    background: C.sidebar,
                    backdropFilter: 'blur(20px)',
                    border: `1px solid ${C.border}`,
                    borderRadius: 20,
                    boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
                }}>
                    <DashboardTabs activeTab={activeTab} setActiveTab={setActiveTab} />

                    <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
                        {activeTab === 'summary' && (
                            <SummaryTab
                                summaryMonth={summaryMonth} setSummaryMonth={setSummaryMonth}
                                summaryYear={summaryYear} setSummaryYear={setSummaryYear}
                                summaryBarangay={summaryBarangay} setSummaryBarangay={setSummaryBarangay}
                                barangayList={barangayList}
                                violData={violData} violLoading={violLoading}
                                cpueData={cpueData} cpueLoading={cpueLoading}
                                expandedCpueUser={expandedCpueUser} setExpandedCpueUser={setExpandedCpueUser}
                            />
                        )}
                        {activeTab === 'sessions' && (
                            <SessionsTab
                                sessionsDate={sessionsDate} setSessionsDate={setSessionsDate}
                                sessionsBarangay={sessionsBarangay} setSessionsBarangay={setSessionsBarangay}
                                barangayList={barangayList}
                                sessionsData={sessionsData} sessionsLoading={sessionsLoading}
                                sessionChartData={sessionChartData} filteredSessionUsers={filteredSessionUsers}
                                selectedSessionUser={selectedSessionUser} setSelectedSessionUser={setSelectedSessionUser}
                                sessionNavIdx={sessionNavIdx} setSessionNavIdx={setSessionNavIdx}
                                fetchSessionsData={fetchSessionsData} clearMapLayers={clearMapLayers}
                            />
                        )}
                        {activeTab === 'violations' && (
                            <ViolationsTab
                                violsDate={violsDate} setViolsDate={setViolsDate}
                                violsBarangay={violsBarangay} setViolsBarangay={setViolsBarangay}
                                barangayList={barangayList}
                                violsData={violsData} violsLoading={violsLoading}
                                violsChartData={violsChartData} filteredViolsUsers={filteredViolsUsers}
                                selectedViolUser={selectedViolUser} setSelectedViolUser={setSelectedViolUser}
                                violNavIdx={violNavIdx} setViolNavIdx={setViolNavIdx}
                                fetchViolsData={fetchViolsData} clearMapLayers={clearMapLayers}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MunicipalDashboard;
