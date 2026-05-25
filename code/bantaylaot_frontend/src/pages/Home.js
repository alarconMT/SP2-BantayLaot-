import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { fromLonLat } from 'ol/proj';
import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Accordion from 'react-bootstrap/Accordion';
import Tabs from 'react-bootstrap/Tabs';
import Tab from 'react-bootstrap/Tab';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Spinner from 'react-bootstrap/Spinner';
import { Chart } from 'react-google-charts';

const getServerUrl = () => localStorage.getItem('server_url') || 'http://localhost:3001';

const BOAT_COLORS = [
    '#007AFF', '#34C759', '#5856D6', '#FFD60A', '#5AC8FA',
    '#00BFFF', '#8E8E93', '#28CD41', '#8E44AD', '#FFCC00',
    '#00FA9A', '#1E90FF', '#6C757D', '#00CED1', '#4682B4',
];

const Home = () => {
    const [sessions, setSessions]               = useState([]);
    const [listOfDateStrings, setListOfDateStrings] = useState([]);
    const [summaryChart, setSummaryChart]       = useState([]);
    const [summaryGear1, setSummaryGear1]       = useState(0);
    const [summaryGear2, setSummaryGear2]       = useState(0);
    const [summaryGear3, setSummaryGear3]       = useState(0);
    const [vectorLayers, setVectorLayers]       = useState([]);
    const [isHovering, setIsHovering]           = useState(false);
    const [iuuReports, setIuuReports]           = useState([]);
    const [listOfIuuDateStrings, setListOfIuuDateStrings] = useState([]);
    const [key, setKey]                         = useState('dailySummary');

    // ── User management state ──────────────────────────────────────────────────
    const [allUsers, setAllUsers]               = useState([]);
    const [usersLoading, setUsersLoading]       = useState(false);
    const [statusFilter, setStatusFilter]       = useState('PENDING');
    const [actionLoading, setActionLoading]     = useState({});   // { [userId]: true }
    const [actionFeedback, setActionFeedback]   = useState({});   // { [userId]: 'approved'|'declined'|'error' }

    const mapRef           = useRef(null);
    const mapObjectRef     = useRef(null);
    const overlayRef       = useRef(null);
    const popupContentRef  = useRef(null);
    const popupCloserRef   = useRef(null);

    // ── Fetch users for the registrations tab ──────────────────────────────────
    const fetchUsers = useCallback(() => {
        const token     = localStorage.getItem('jwt_token');
        const serverUrl = getServerUrl();          // ← ADD THIS
        setUsersLoading(true);
        fetch(`${serverUrl}/api/users`, {          // ← WAS just '/api/users'
            headers: { Authorization: `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(data => {
            setAllUsers(Array.isArray(data) ? data : []);
            setUsersLoading(false);
        })
        .catch(err => {
            console.error('Error fetching users:', err);
            setUsersLoading(false);
        });
    }, []);


    // Fetch users when the registrations tab is first opened
    const handleTabSelect = useCallback((k) => {
        setKey(k);
        if (k === 'registrations' && allUsers.length === 0) {
            fetchUsers();
        }
    }, [allUsers.length, fetchUsers]);

    // ── Approve / Decline a user ───────────────────────────────────────────────
    const handleStatusChange = useCallback(async (userId, newStatus) => {
        const token     = localStorage.getItem('jwt_token');
        const serverUrl = getServerUrl();                              // ← ADD THIS
        setActionLoading(prev => ({ ...prev, [userId]: true }));
        try {
            const res = await fetch(`${serverUrl}/api/users/${userId}/status`, {  // ← WAS '/api/users/...'
                method:  'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization:  `Bearer ${token}`
                },
                body: JSON.stringify({ status: newStatus })
            });
            if (!res.ok) throw new Error('Failed');
            setAllUsers(prev =>
                prev.map(u => u._id === userId ? { ...u, status: newStatus } : u)
            );
            setActionFeedback(prev => ({
                ...prev,
                [userId]: newStatus === 'APPROVED' ? 'approved' : 'declined'
            }));
        } catch (err) {
            console.error('Status update error:', err);
            setActionFeedback(prev => ({ ...prev, [userId]: 'error' }));
        } finally {
            setActionLoading(prev => ({ ...prev, [userId]: false }));
        }
    }, []);

    useEffect(() => {
        const token = localStorage.getItem('jwt_token');
        console.log('Token found:', token ? 'yes' : 'NO TOKEN');

        const serverUrl = getServerUrl();

        if (!token) {
            window.location.href = '/login';
            return;
        }
        
        fetch(`${serverUrl}/api/dashboard/sessions`, {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => {
            console.log('Dashboard response status:', res.status);
            if (res.status === 401 || res.status === 403) {
                localStorage.clear();
                window.location.href = '/login';
                return null;
            }
            return res.json();
        })
            .then(data => {
                console.log('Dashboard data received:', data);
                console.log('Number of sessions:', data.length);
                if (!data) return;
                const enriched = data.map((item, index) => ({
                    ...item,
                    color: BOAT_COLORS[index % BOAT_COLORS.length]
                }));

                setSessions(enriched);

                const uniqueDates = [
                    'Choose a date',
                    ...new Set(
                        enriched.map(item =>
                            new Date(item.session.startDateTime).toLocaleDateString('en-us', {
                                weekday: 'long', year: 'numeric',
                                month: 'short', day: 'numeric'
                            })
                        )
                    )
                ];
                setListOfDateStrings(uniqueDates);

                const allReports = enriched.flatMap(item =>
                    item.reports.map(report => ({
                        ...report,
                        color: item.color,
                        boatName: item.boat?.boatName || item.session.userId
                    }))
                );
                setIuuReports(allReports);

                const uniqueReportDates = [
                    ...new Set(
                        allReports.map(r =>
                            new Date(r.timestamp).toLocaleDateString('en-us', {
                                weekday: 'long', year: 'numeric',
                                month: 'short', day: 'numeric'
                            })
                        )
                    )
                ];
                setListOfIuuDateStrings(uniqueReportDates);
            })
            .catch(err => console.error('Error fetching dashboard data:', err));

        const PhilippinesLonLat = fromLonLat([120.597137, 13.968827]);
        const vectorSource = new VectorSource({ features: [] });
        const vectorLayer  = new VectorLayer({ source: vectorSource });

        const newMap = new Map({
            target: mapRef.current,
            layers: [new TileLayer({ source: new OSM() }), vectorLayer],
            view:   new View({ center: PhilippinesLonLat, zoom: 6 }),
        });
        mapObjectRef.current = newMap;

        const overlay = new Overlay({
            element: overlayRef.current,
            autoPan: true,
            offset:  [0, -10],
        });
        newMap.addOverlay(overlay);

        popupCloserRef.current.onclick = () => {
            overlay.setPosition(undefined);
            return false;
        };

        newMap.on('click', (evt) => {
            const feature = newMap.forEachFeatureAtPixel(evt.pixel, f => f);
            if (feature) {
                const coord      = feature.getGeometry().getCoordinates();
                const properties = feature.get('properties');

                if (properties.type === 'iuuReport') {
                    popupContentRef.current.innerHTML = `
                        <div style="text-align:center">
                            <h5>Violation Report</h5>
                            <img src="${properties.imageUrl ? `${getServerUrl()}${properties.imageUrl}` : '/placeholder.jpg'}"
                                alt="Incident" 
                                style="width:100%; height:auto; margin-bottom:10px;" />
                                
                            <p><strong>Violator:</strong> ${properties.violator}</p>
                            <p><strong>Violation:</strong> ${properties.violation}</p>
                            <p><strong>Origin:</strong> ${properties.origin}</p>
                            <p><strong>Fishing Gear:</strong> ${properties.fishingGear}</p>
                            <p><strong>Fishing Vessel:</strong> ${properties.fishingVessel}</p>
                        </div>
                    `;
                } else {
                    popupContentRef.current.innerHTML = `
                        <p>
                            <strong>Latitude:</strong> ${properties.latitude}<br/>
                            <strong>Longitude:</strong> ${properties.longitude}<br/>
                            <strong>Timestamp:</strong> ${properties.timestamp}<br/>
                        </p>
                    `;
                }
                overlay.setPosition(coord);
            } else {
                overlay.setPosition(undefined);
            }
        });

        setVectorLayers([vectorLayer]);
        return () => newMap.setTarget(null);
    }, []);

    const plotSessionsOnMap = useCallback((sessionItems) => {
        const map = mapObjectRef.current;
        if (!map) return;

        vectorLayers.forEach(layer => map.removeLayer(layer));
        setVectorLayers([]);
        map.getOverlays().item(0)?.setPosition(undefined);

        const locationFeatures = sessionItems.flatMap(item =>
            item.locations.map(loc => {
                const f = new Feature({
                    geometry:   new Point(fromLonLat([loc.longitude, loc.latitude])),
                    properties: {
                        latitude:  loc.latitude,
                        longitude: loc.longitude,
                        timestamp: loc.timestamp,
                    }
                });
                f.setStyle(new Style({
                    image: new CircleStyle({
                        radius: 4,
                        fill:   new Fill({ color: `${item.color}B3` }),
                        stroke: new Stroke({ color: '#4A4A4A', width: 2 })
                    })
                }));
                return f;
            })
        );

        if (locationFeatures.length > 0) {
            const src   = new VectorSource({ features: locationFeatures });
            const layer = new VectorLayer({ source: src });
            map.addLayer(layer);
            setVectorLayers([layer]);
            map.getView().fit(src.getExtent(), { padding: [50, 50, 50, 50] });
        }

        const reportFeatures = sessionItems.flatMap(item =>
            item.reports.map(report => {
                const f = new Feature({
                    geometry:   new Point(fromLonLat([report.longitude, report.latitude])),
                    properties: { ...report, type: 'iuuReport' }
                });
                f.setStyle(new Style({
                    image: new CircleStyle({
                        radius: 6,
                        fill:   new Fill({ color: 'rgba(231,76,60,0.8)' }),
                        stroke: new Stroke({ color: '#4A4A4A', width: 2 })
                    })
                }));
                return f;
            })
        );

        if (reportFeatures.length > 0) {
            const src   = new VectorSource({ features: reportFeatures });
            const layer = new VectorLayer({ source: src });
            map.addLayer(layer);
            setVectorLayers(prev => [...prev, layer]);
        }
    }, [vectorLayers]);

    const handleIuuReportClick = useCallback((report) => {
        const map = mapObjectRef.current;
        if (!map) return;

        vectorLayers.forEach(layer => map.removeLayer(layer));
        setVectorLayers([]);
        map.getOverlays().item(0)?.setPosition(undefined);

        const f = new Feature({
            geometry:   new Point(fromLonLat([report.longitude, report.latitude])),
            properties: { ...report, type: 'iuuReport' }
        });
        f.setStyle(new Style({
            image: new CircleStyle({
                radius: 6,
                fill:   new Fill({ color: 'rgba(231,76,60,0.8)' }),
                stroke: new Stroke({ color: '#4A4A4A', width: 2 })
            })
        }));

        const src   = new VectorSource({ features: [f] });
        const layer = new VectorLayer({ source: src });
        map.addLayer(layer);
        setVectorLayers([layer]);
        map.getView().setCenter(fromLonLat([report.longitude, report.latitude]));
        map.getView().setZoom(14);
    }, [vectorLayers]);

    const updateSummary = useCallback((dateString) => {
        let totalWeightGear1 = 0, totalHoursGear1 = 0;
        let totalWeightGear2 = 0, totalHoursGear2 = 0;
        let totalWeightGear3 = 0, totalHoursGear3 = 0;
        const allFishCatches = {};

        sessions.forEach(item => {
            const sessionDate = new Date(item.session.startDateTime)
                .toLocaleDateString('en-us', {
                    weekday: 'long', year: 'numeric',
                    month: 'short', day: 'numeric'
                });
            if (sessionDate !== dateString) return;

            // ── Skip sessions with no end time ────────────────────────────────
            if (!item.session.endDateTime) return;

            const totalHours = (
                new Date(item.session.endDateTime) -
                new Date(item.session.startDateTime)
            ) / 36e5;

            // ── Skip if hours is zero or negative ─────────────────────────────
            if (totalHours <= 0) return;

            let used1 = false, used2 = false, used3 = false;

            item.fishings.forEach(f => {
                allFishCatches[f.fishSpecies] =
                    (allFishCatches[f.fishSpecies] || 0) + f.totalWeight;
                if (f.gear === 'Surface Gill Net')    { totalWeightGear1 += f.totalWeight; used1 = true; }
                if (f.gear === 'Bottom Set Gill Net') { totalWeightGear2 += f.totalWeight; used2 = true; }
                if (f.gear === 'Hook And Line')       { totalWeightGear3 += f.totalWeight; used3 = true; }
            });

            if (used1) totalHoursGear1 += totalHours;
            if (used2) totalHoursGear2 += totalHours;
            if (used3) totalHoursGear3 += totalHours;
        });

        setSummaryChart(Object.entries(allFishCatches));
        setSummaryGear1(totalHoursGear1 > 0 ? totalWeightGear1 / totalHoursGear1 : 0);
        setSummaryGear2(totalHoursGear2 > 0 ? totalWeightGear2 / totalHoursGear2 : 0);
        setSummaryGear3(totalHoursGear3 > 0 ? totalWeightGear3 / totalHoursGear3 : 0);
    }, [sessions]);

    const handleChangeDate = useCallback((event) => {
        const dateString = event.target.value;
        if (dateString === 'Choose a date') return;

        mapObjectRef.current?.getOverlays().item(0)?.setPosition(undefined);

        const filtered = sessions.filter(item =>
            new Date(item.session.startDateTime).toLocaleDateString('en-us', {
                weekday: 'long', year: 'numeric',
                month: 'short', day: 'numeric'
            }) === dateString
        );

        if (filtered.length > 0) {
            plotSessionsOnMap(filtered);
            updateSummary(dateString);
        } else {
            vectorLayers.forEach(l => mapObjectRef.current.removeLayer(l));
            setVectorLayers([]);
        }
    }, [sessions, plotSessionsOnMap, updateSummary, vectorLayers]);

    // const calculateCPUE = (item, gear) => {
    //     const hours = (
    //         new Date(item.session.endDateTime) -
    //         new Date(item.session.startDateTime)
    //     ) / 36e5;
    //     const weight = item.fishings
    //         .filter(f => f.gear === gear)
    //         .reduce((sum, f) => sum + f.totalWeight, 0);
    //     return hours > 0 ? weight / hours : 0;
    // };

    const calculateCPUE = (item, gear) => {
        console.log('Session dates:', {
        name:  item.user?.name,
        start: item.session.startDateTime,
        end:   item.session.endDateTime,
        });
        if (!item.session.endDateTime) return 0;  // ← add this guard
        const hours = (
            new Date(item.session.endDateTime) -
            new Date(item.session.startDateTime)
        ) / 36e5;
        if (hours <= 0) return 0;                 // ← and this
        const weight = item.fishings
            .filter(f => f.gear === gear)
            .reduce((sum, f) => sum + f.totalWeight, 0);
        return hours > 0 ? weight / hours : 0;
    };

    const buildFishCatchGraphData = (item) => {
        const catches = {};
        item.fishings.forEach(f => {
            catches[f.fishSpecies] = (catches[f.fishSpecies] || 0) + f.totalWeight;
        });
        return [['Species', 'Weight'], ...Object.entries(catches)];
    };

    const gearUsed = (item, gear) =>
        item.fishings.some(f => f.gear === gear);

    const handleSessionClick = (item) => {
        mapObjectRef.current?.getOverlays().item(0)?.setPosition(undefined);
        plotSessionsOnMap([item]);
    };

    // ── Derived: users filtered by status tab ─────────────────────────────────
    const filteredUsers = allUsers.filter(u => u.status === statusFilter);
    const pendingCount  = allUsers.filter(u => u.status === 'PENDING').length;

    const statusBadgeVariant = (status) => {
        if (status === 'APPROVED') return 'success';
        if (status === 'DECLINED') return 'danger';
        return 'warning';
    };

    return (
        <Container fluid className="p-0">
            <Row noGutters>
                <Col xs={12} md={8} className="map-container">
                    <div id="map" ref={mapRef} className="map"></div>
                    <div ref={overlayRef} className="ol-popup">
                        <button
                            ref={popupCloserRef}
                            className="ol-popup-closer"
                            aria-label="Close popup"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', float: 'right' }}
                        >✕</button>
                        <div id="popup-content" ref={popupContentRef}></div>
                    </div>
                </Col>
                <Col xs={12} md={4} className="sidebar">
                    <Tabs id="sidebar-tabs" activeKey={key} onSelect={handleTabSelect} className="mb-3">

                        <Tab eventKey="dailySummary" title="Daily Summary">
                            <div
                                className="summary-panel"
                                onMouseEnter={() => setIsHovering(true)}
                                onMouseLeave={() => setIsHovering(false)}
                                style={{ opacity: isHovering ? 1 : 0.9, transition: 'opacity 200ms' }}
                            >
                                <Form.Group controlId="dateSelect" className="mb-4">
                                    <Form.Label>Select Date</Form.Label>
                                    <Form.Control as="select" onChange={handleChangeDate}>
                                        {listOfDateStrings.map(d => (
                                            <option key={d} value={d}>{d}</option>
                                        ))}
                                    </Form.Control>
                                </Form.Group>
                                <Chart
                                    chartType="PieChart"
                                    data={[['Species', 'Weight'], ...summaryChart]}
                                    width="100%" height="300px"
                                    options={{
                                        title: 'Daily Fish Catch Summary',
                                        pieHole: 0.4,
                                        legend: { position: 'bottom' },
                                        chartArea: { width: '90%', height: '75%' }
                                    }}
                                />
                                <h5 className="mt-4">Catch per Unit Effort</h5>
                                <ul className="list-unstyled">
                                    <li><strong>Surface Gill Net:</strong> {summaryGear1.toFixed(2)} kg/hr</li>
                                    <li><strong>Bottom Set Gill Net:</strong> {summaryGear2.toFixed(2)} kg/hr</li>
                                    <li><strong>Hook And Line:</strong> {summaryGear3.toFixed(2)} kg/hr</li>
                                </ul>
                            </div>
                        </Tab>

                        <Tab eventKey="boats" title="Sessions">
                            <div className="boats-panel">
                                <Accordion>
                                    {sessions.map((item, index) => (
                                        <Accordion.Item eventKey={`${index}`} key={item.session._id}>
                                            <Accordion.Header onClick={() => handleSessionClick(item)}>
                                                <span style={{
                                                    display: 'inline-block', width: 10, height: 10,
                                                    backgroundColor: item.color,
                                                    marginRight: 10, borderRadius: '50%'
                                                }}/>
                                                {item.user?.name || item.session.userId} —{' '}
                                                {new Date(item.session.startDateTime).toLocaleDateString('en-us', {
                                                    weekday: 'long', year: 'numeric',
                                                    month: 'short', day: 'numeric'
                                                })}
                                            </Accordion.Header>
                                            <Accordion.Body>
                                                <Chart
                                                    chartType="PieChart"
                                                    data={buildFishCatchGraphData(item)}
                                                    width="100%" height="200px"
                                                    options={{
                                                        title: 'Fish Catch',
                                                        pieHole: 0.4,
                                                        legend: { position: 'bottom' },
                                                        chartArea: { width: '90%', height: '75%' }
                                                    }}
                                                />
                                                <h6 className="mt-3">Catch per Unit Effort</h6>
                                                <ul className="list-unstyled">
                                                    {gearUsed(item, 'Surface Gill Net') && (
                                                        <li><strong>Surface Gill Net:</strong> {calculateCPUE(item, 'Surface Gill Net').toFixed(2)} kg/hr</li>
                                                    )}
                                                    {gearUsed(item, 'Bottom Set Gill Net') && (
                                                        <li><strong>Bottom Set Gill Net:</strong> {calculateCPUE(item, 'Bottom Set Gill Net').toFixed(2)} kg/hr</li>
                                                    )}
                                                    {gearUsed(item, 'Hook And Line') && (
                                                        <li><strong>Hook And Line:</strong> {calculateCPUE(item, 'Hook And Line').toFixed(2)} kg/hr</li>
                                                    )}
                                                </ul>
                                            </Accordion.Body>
                                        </Accordion.Item>
                                    ))}
                                </Accordion>
                            </div>
                        </Tab>

                        <Tab eventKey="iuuReports" title="IUU Reports">
                            <div className="iuu-panel">
                                {iuuReports.length > 0 ? (
                                    <Accordion>
                                        {listOfIuuDateStrings.map((dateString, dateIndex) => {
                                            const reportsForDate = iuuReports.filter(r =>
                                                new Date(r.timestamp).toLocaleDateString('en-us', {
                                                    weekday: 'long', year: 'numeric',
                                                    month: 'short', day: 'numeric'
                                                }) === dateString
                                            );
                                            if (!reportsForDate.length) return null;
                                            return (
                                                <Accordion.Item eventKey={`${dateIndex}`} key={dateString}>
                                                    <Accordion.Header>{dateString}</Accordion.Header>
                                                    <Accordion.Body>
                                                        <Accordion>
                                                            {reportsForDate.map((report, ri) => (
                                                                <Accordion.Item
                                                                    eventKey={`${dateIndex}-${ri}`}
                                                                    key={report._id || `${report.timestamp}-${ri}`}
                                                                >
                                                                    <Accordion.Header
                                                                        onClick={() => handleIuuReportClick(report)}
                                                                    >
                                                                        {report.violator}
                                                                    </Accordion.Header>
                                                                    <Accordion.Body>
                                                                        <img
                                                                            src={report.imageUrl ? `${getServerUrl()}${report.imageUrl}` : '/placeholder.jpg'}
                                                                            alt="Incident"
                                                                            style={{ width: '100%', height: 'auto', marginBottom: 10 }}
                                                                        />
                                                                        <p><strong>Violator:</strong> {report.violator}</p>
                                                                        <p><strong>Violation:</strong> {report.violation}</p>
                                                                        <p><strong>Origin:</strong> {report.origin}</p>
                                                                        <p><strong>Fishing Gear:</strong> {report.fishingGear}</p>
                                                                        <p><strong>Fishing Vessel:</strong> {report.fishingVessel}</p>
                                                                        <p><strong>Timestamp:</strong> {report.timestamp}</p>
                                                                    </Accordion.Body>
                                                                </Accordion.Item>
                                                            ))}
                                                        </Accordion>
                                                    </Accordion.Body>
                                                </Accordion.Item>
                                            );
                                        })}
                                    </Accordion>
                                ) : (
                                    <p>There are no IUU reports.</p>
                                )}
                            </div>
                        </Tab>

                        {/* ── NEW: User Registrations Tab ─────────────────────────────── */}
                        <Tab
                            eventKey="registrations"
                            title={
                                <span>
                                    Registrations{' '}
                                    {pendingCount > 0 && (
                                        <Badge bg="warning" text="dark" pill style={{ fontSize: '0.7rem' }}>
                                            {pendingCount}
                                        </Badge>
                                    )}
                                </span>
                            }
                        >
                            <div className="registrations-panel px-2">
                                {/* Status filter tabs */}
                                <div className="d-flex gap-2 mb-3 flex-wrap">
                                    {['PENDING', 'APPROVED', 'DECLINED'].map(s => (
                                        <Button
                                            key={s}
                                            size="sm"
                                            variant={statusFilter === s ? 'primary' : 'outline-secondary'}
                                            onClick={() => setStatusFilter(s)}
                                        >
                                            {s.charAt(0) + s.slice(1).toLowerCase()}
                                            {' '}
                                            <Badge
                                                bg={s === 'PENDING' ? 'warning' : s === 'APPROVED' ? 'success' : 'danger'}
                                                text={s === 'PENDING' ? 'dark' : 'white'}
                                                pill
                                            >
                                                {allUsers.filter(u => u.status === s).length}
                                            </Badge>
                                        </Button>
                                    ))}
                                    <Button
                                        size="sm"
                                        variant="outline-secondary"
                                        className="ms-auto"
                                        onClick={fetchUsers}
                                        disabled={usersLoading}
                                        title="Refresh"
                                    >
                                        {usersLoading ? <Spinner animation="border" size="sm" /> : '↻'}
                                    </Button>
                                </div>

                                {/* User list */}
                                {usersLoading && allUsers.length === 0 ? (
                                    <div className="text-center py-4">
                                        <Spinner animation="border" />
                                        <p className="mt-2 text-muted">Loading registrations…</p>
                                    </div>
                                ) : filteredUsers.length === 0 ? (
                                    <p className="text-muted text-center py-3">
                                        No {statusFilter.toLowerCase()} registrations.
                                    </p>
                                ) : (
                                    <Accordion>
                                        {filteredUsers.map((user, idx) => (
                                            <Accordion.Item eventKey={`${idx}`} key={user._id}>
                                                <Accordion.Header>
                                                    <div className="d-flex align-items-center gap-2 w-100 me-2">
                                                        <Badge bg={statusBadgeVariant(user.status)} style={{ minWidth: 70 }}>
                                                            {user.status}
                                                        </Badge>
                                                        <span className="text-truncate">{user.name}</span>
                                                    </div>
                                                </Accordion.Header>
                                                <Accordion.Body>
                                                    {/* Fisher details */}
                                                    <h6 className="mb-2">Fisher Details</h6>
                                                    <table className="table table-sm table-borderless mb-3">
                                                        <tbody>
                                                            <tr><td><strong>Name</strong></td><td>{user.name}</td></tr>
                                                            <tr><td><strong>Email</strong></td><td>{user.email}</td></tr>
                                                            <tr><td><strong>Address</strong></td><td>{user.address || '—'}</td></tr>
                                                            <tr><td><strong>Birthdate</strong></td><td>{user.birthdate || '—'}</td></tr>
                                                            <tr>
                                                                <td><strong>Registered</strong></td>
                                                                <td>
                                                                    {user.createdAt
                                                                        ? new Date(user.createdAt).toLocaleDateString('en-us', {
                                                                            year: 'numeric', month: 'short', day: 'numeric'
                                                                        })
                                                                        : '—'}
                                                                </td>
                                                            </tr>
                                                        </tbody>
                                                    </table>

                                                    {/* Boat details */}
                                                    {user.boat && (
                                                        <>
                                                            <h6 className="mb-2">Boat Details</h6>
                                                            <table className="table table-sm table-borderless mb-3">
                                                                <tbody>
                                                                    <tr><td><strong>Boat Name</strong></td><td>{user.boat.boatName}</td></tr>
                                                                    <tr><td><strong>Type</strong></td><td>{user.boat.boatType}</td></tr>
                                                                    <tr><td><strong>Length</strong></td><td>{user.boat.length ? `${user.boat.length} m` : '—'}</td></tr>
                                                                    <tr><td><strong>Engine</strong></td><td>{user.boat.enginePower || '—'}</td></tr>
                                                                    <tr><td><strong>Reg. No.</strong></td><td>{user.boat.registrationNumber || '—'}</td></tr>
                                                                </tbody>
                                                            </table>
                                                        </>
                                                    )}

                                                    {/* Action feedback */}
                                                    {actionFeedback[user._id] === 'error' && (
                                                        <p className="text-danger small mb-2">
                                                            ⚠ Action failed. Please try again.
                                                        </p>
                                                    )}

                                                    {/* Approve / Decline buttons */}
                                                    <div className="d-flex gap-2">
                                                        <Button
                                                            variant="success"
                                                            size="sm"
                                                            disabled={user.status === 'APPROVED' || actionLoading[user._id]}
                                                            onClick={() => handleStatusChange(user._id, 'APPROVED')}
                                                        >
                                                            {actionLoading[user._id]
                                                                ? <Spinner animation="border" size="sm" />
                                                                : '✔ Approve'}
                                                        </Button>
                                                        <Button
                                                            variant="danger"
                                                            size="sm"
                                                            disabled={user.status === 'DECLINED' || actionLoading[user._id]}
                                                            onClick={() => handleStatusChange(user._id, 'DECLINED')}
                                                        >
                                                            {actionLoading[user._id]
                                                                ? <Spinner animation="border" size="sm" />
                                                                : '✖ Decline'}
                                                        </Button>
                                                    </div>
                                                </Accordion.Body>
                                            </Accordion.Item>
                                        ))}
                                    </Accordion>
                                )}
                            </div>
                        </Tab>

                    </Tabs>
                </Col>
            </Row>
        </Container>
    );
};

export default Home;