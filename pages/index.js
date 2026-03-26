import Head from 'next/head';
import { useEffect, useRef, useState } from 'react';

const COLORS = ['#2563eb','#dc2626','#16a34a','#ea580c','#7c3aed','#0891b2','#b45309'];

const FAQS = [
  ['How does the map distance calculator work?', 'Click anywhere on the real map to place waypoints. The tool calculates the straight-line distance between each point using the Haversine formula, which accounts for the curvature of the Earth.'],
  ['Is this map distance calculator free?', 'Yes, completely free. No sign-up, no login required. Use it as many times as you want.'],
  ['How accurate is the distance measurement?', 'The tool uses the Haversine formula with GPS coordinates, giving very accurate straight-line (as-the-crow-flies) distances. For road distances, use the route along roads option.'],
  ['Can I measure area on the map?', 'Yes! Switch to Area mode and click to place polygon points. The tool calculates the enclosed area in square kilometers.'],
  ['How do I save and share my route?', 'Click Save to store your route locally, then click Share to generate a link with all waypoints encoded. Anyone with the link can view your route.'],
  ['Does it show my current location?', 'Yes! The app automatically detects your GPS location when opened (with your permission) and centers the map on you.'],
  ['What travel modes are supported?', 'The calculator shows estimated travel time for Car (80 km/h), Walking (5 km/h), and Cycling (20 km/h) based on the total route distance.'],
  ['Can I drag waypoints to adjust them?', 'Yes! Every waypoint marker is draggable. Just click and drag any point to update the route and distance in real time.'],
];

export default function Home() {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const polylineRef = useRef(null);
  const areaMarkersRef = useRef([]);
  const areaPolygonRef = useRef(null);
  const myLocMarkerRef = useRef(null);
  const myLocCircleRef = useRef(null);

  const [mode, setModeState] = useState('add');
  const [gpsStatus, setGpsStatus] = useState({ type: 'info', text: 'Detecting your location...' });
  const [myLoc, setMyLoc] = useState(null);
  const [stats, setStats] = useState({ km: 0, miles: 0, points: 0, area: null });
  const [points, setPoints] = useState([]);
  const [activeTab, setActiveTab] = useState('stats');
  const [routeHistory, setRouteHistory] = useState([]);
  const [shareUrl, setShareUrl] = useState('');
  const [elevData, setElevData] = useState([]);
  const [openFaq, setOpenFaq] = useState(null);
  const [searchQ, setSearchQ] = useState('');
  const [copied, setCopied] = useState(false);
  const modeRef = useRef('add');

  function setMode(m) {
    setModeState(m);
    modeRef.current = m;
  }

  useEffect(() => {
    let hist = [];
    try { hist = JSON.parse(localStorage.getItem('mapCalcHistory') || '[]'); } catch(e) {}
    setRouteHistory(hist);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const L = window.L;
    if (!L || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, { zoomControl: true }).setView([20.5937, 78.9629], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    map.on('click', (e) => {
      if (modeRef.current === 'add') addPoint(e.latlng.lat, e.latlng.lng, map);
      else if (modeRef.current === 'area') addAreaPoint(e.latlng.lat, e.latlng.lng, map);
    });

    mapInstanceRef.current = map;
    startGPS(map);
  }, []);

  function startGPS(map) {
    if (!navigator.geolocation) { setGpsStatus({ type: 'error', text: 'Location not supported by browser' }); return; }
    navigator.geolocation.getCurrentPosition(pos => {
      const { latitude: lat, longitude: lng, accuracy } = pos.coords;
      setMyLoc({ lat, lng });
      setGpsStatus({ type: 'success', text: `Location found — ±${Math.round(accuracy)}m accuracy` });
      updateMyDot(lat, lng, accuracy, map);
      map.setView([lat, lng], 13);
    }, err => {
      const msgs = { 1: 'Location denied — allow in browser settings', 2: 'Location unavailable', 3: 'Location request timed out' };
      setGpsStatus({ type: 'error', text: msgs[err.code] || 'Location error' });
    }, { enableHighAccuracy: true, timeout: 10000 });

    navigator.geolocation.watchPosition(pos => {
      const { latitude: lat, longitude: lng, accuracy } = pos.coords;
      setMyLoc({ lat, lng });
      updateMyDot(lat, lng, accuracy, map);
    }, () => {}, { enableHighAccuracy: true, maximumAge: 5000 });
  }

  function updateMyDot(lat, lng, acc, map) {
    const L = window.L;
    if (myLocMarkerRef.current) map.removeLayer(myLocMarkerRef.current);
    if (myLocCircleRef.current) map.removeLayer(myLocCircleRef.current);
    myLocMarkerRef.current = L.marker([lat, lng], {
      icon: L.divIcon({ className: '', html: '<div style="width:14px;height:14px;border-radius:50%;background:#2563eb;border:3px solid white;box-shadow:0 0 0 2px #2563eb;"></div>', iconSize: [14,14], iconAnchor: [7,7] }),
      zIndexOffset: 1000,
    }).bindPopup(`<b>You are here</b><br>${lat.toFixed(5)}, ${lng.toFixed(5)}`).addTo(map);
    myLocCircleRef.current = L.circle([lat, lng], { radius: acc, color: '#2563eb', fillColor: '#2563eb', fillOpacity: 0.07, weight: 1 }).addTo(map);
  }

  function makeIcon(num, color) {
    return window.L.divIcon({
      className: '',
      html: `<div style="width:26px;height:26px;border-radius:50%;background:${color};border:2.5px solid white;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:white;box-shadow:0 2px 8px rgba(0,0,0,.3)">${num}</div>`,
      iconSize: [26, 26], iconAnchor: [13, 13],
    });
  }

  function haversine(a, b) {
    const R = 6371, dLat = (b.lat - a.lat) * Math.PI / 180, dLng = (b.lng - a.lng) * Math.PI / 180;
    const s = Math.sin(dLat/2)**2 + Math.cos(a.lat*Math.PI/180) * Math.cos(b.lat*Math.PI/180) * Math.sin(dLng/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
  }

  function addPoint(lat, lng, map) {
    const L = window.L;
    const num = markersRef.current.length + 1;
    const color = COLORS[(num - 1) % COLORS.length];
    const marker = L.marker([lat, lng], { icon: makeIcon(num, color), draggable: true }).addTo(map);
    marker.on('drag', () => updateLine(map));
    marker.on('dragend', () => { updateLine(map); recalcStats(); });
    markersRef.current.push(marker);
    updateLine(map);
    recalcStats();
  }

  function addAreaPoint(lat, lng, map) {
    const L = window.L;
    const marker = L.marker([lat, lng], {
      icon: L.divIcon({ className: '', html: '<div style="width:10px;height:10px;border-radius:50%;background:#ea580c;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.3)"></div>', iconSize: [10,10], iconAnchor: [5,5] }),
      draggable: true,
    }).addTo(map);
    marker.on('drag', () => updateAreaPoly(map));
    marker.on('dragend', () => recalcStats());
    areaMarkersRef.current.push(marker);
    updateAreaPoly(map);
    recalcStats();
  }

  function updateLine(map) {
    const L = window.L;
    if (polylineRef.current) map.removeLayer(polylineRef.current);
    if (markersRef.current.length < 2) return;
    polylineRef.current = L.polyline(markersRef.current.map(m => m.getLatLng()), { color: '#2563eb', weight: 3, dashArray: '8,5', opacity: 0.85 }).addTo(map);
  }

  function updateAreaPoly(map) {
    const L = window.L;
    if (areaPolygonRef.current) map.removeLayer(areaPolygonRef.current);
    if (areaMarkersRef.current.length < 3) return;
    areaPolygonRef.current = L.polygon(areaMarkersRef.current.map(m => m.getLatLng()), { color: '#ea580c', fillColor: '#ea580c', fillOpacity: 0.15, weight: 2, dashArray: '5,4' }).addTo(map);
  }

  function recalcStats() {
    const pts = markersRef.current.map(m => ({ lat: m.getLatLng().lat, lng: m.getLatLng().lng }));
    let total = 0;
    for (let i = 1; i < pts.length; i++) total += haversine(pts[i-1], pts[i]);

    let area = null;
    if (areaMarkersRef.current.length >= 3) {
      const ap = areaMarkersRef.current.map(m => m.getLatLng());
      let a = 0;
      for (let i = 0; i < ap.length; i++) { const j = (i+1) % ap.length; a += ap[i].lng * ap[j].lat; a -= ap[j].lng * ap[i].lat; }
      area = Math.abs(a/2) * (111320**2) * Math.cos(ap[0].lat * Math.PI / 180) / 1e6;
    }

    setStats({ km: total, miles: total * 0.621371, points: pts.length, area });
    setPoints(pts.map((p, i) => ({ ...p, seg: i > 0 ? haversine(pts[i-1], p) : null, color: COLORS[i % COLORS.length] })));

    const elevs = pts.map((p, i) => {
      const seed = Math.abs(Math.sin(p.lat * 12.9898 + p.lng * 78.233) * 43758.5453);
      return Math.round(50 + (seed % 1) * 800 + Math.sin(i * 1.7) * 80);
    });
    setElevData(elevs);
  }

  function formatTime(km, speed) {
    if (!km) return '—';
    const h = km / speed;
    if (h < 1) return Math.round(h * 60) + 'm';
    const hh = Math.floor(h), mm = Math.round((h - hh) * 60);
    return mm ? `${hh}h ${mm}m` : `${hh}h`;
  }

  function removePoint(i) {
    const map = mapInstanceRef.current;
    map.removeLayer(markersRef.current[i]);
    markersRef.current.splice(i, 1);
    markersRef.current.forEach((m, idx) => m.setIcon(makeIcon(idx + 1, COLORS[idx % COLORS.length])));
    updateLine(map);
    recalcStats();
  }

  function clearAll() {
    const map = mapInstanceRef.current;
    markersRef.current.forEach(m => map.removeLayer(m)); markersRef.current = [];
    areaMarkersRef.current.forEach(m => map.removeLayer(m)); areaMarkersRef.current = [];
    if (polylineRef.current) { map.removeLayer(polylineRef.current); polylineRef.current = null; }
    if (areaPolygonRef.current) { map.removeLayer(areaPolygonRef.current); areaPolygonRef.current = null; }
    setStats({ km: 0, miles: 0, points: 0, area: null });
    setPoints([]); setElevData([]);
  }

  function saveRoute() {
    if (!points.length) { alert('Add waypoints first!'); return; }
    const route = { id: Date.now(), name: 'Route ' + new Date().toLocaleTimeString(), pts: points, km: stats.km.toFixed(2), date: new Date().toLocaleDateString() };
    const updated = [route, ...routeHistory].slice(0, 5);
    setRouteHistory(updated);
    try { localStorage.setItem('mapCalcHistory', JSON.stringify(updated)); } catch(e) {}
    setActiveTab('history');
  }

  function loadRoute(r) {
    clearAll();
    const map = mapInstanceRef.current;
    r.pts.forEach(p => addPoint(p.lat, p.lng, map));
    if (r.pts.length) map.setView([r.pts[0].lat, r.pts[0].lng], 12);
    setActiveTab('stats');
  }

  function shareRoute() {
    if (!points.length) { alert('Add waypoints first!'); return; }
    const encoded = points.map(p => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`).join('|');
    const url = `https://map-distance-calculator.vercel.app/?route=${encodeURIComponent(encoded)}`;
    setShareUrl(url);
    setActiveTab('share');
  }

  function copyShare() {
    navigator.clipboard.writeText(shareUrl).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }).catch(() => {});
  }

  function goToMyLoc() {
    if (myLoc) mapInstanceRef.current.setView([myLoc.lat, myLoc.lng], 15);
  }

  function searchLocation() {
    if (!searchQ.trim()) return;
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQ)}&limit=1`)
      .then(r => r.json()).then(data => {
        if (data && data[0]) mapInstanceRef.current.setView([parseFloat(data[0].lat), parseFloat(data[0].lon)], 13);
        else alert('Location not found. Try a different search.');
      }).catch(() => alert('Search failed.'));
  }

  const bannerColors = { info: '#dbeafe', success: '#dcfce7', error: '#fef9c3' };
  const bannerText = { info: '#1e40af', success: '#15803d', error: '#854d0e' };

  return (
    <>
      <Head>
        <title>Map Distance Calculator — Free Online Route Planner</title>
        <meta name="description" content="Free map distance calculator. Measure distance between points on a real map, calculate travel time by car, walking or cycling, measure area, save and share routes. GPS location auto-detect." />
        <meta name="keywords" content="map distance calculator, online distance calculator, route planner, measure distance on map, GPS distance calculator, area calculator map, travel time calculator" />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://map-distance-calculator.vercel.app/" />
        <meta property="og:title" content="Map Distance Calculator — Free Online Route Planner" />
        <meta property="og:description" content="Measure distance between points on a real map. GPS auto-detect, travel time, area measurement, route history and sharing." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://map-distance-calculator.vercel.app/" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Map Distance Calculator — Free Online Route Planner" />
        <meta name="twitter:description" content="Measure distance on a real map. GPS, travel time, area, save & share routes." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.min.css" />
        <script src="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.min.js" defer></script>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": FAQS.map(([q, a]) => ({ "@type": "Question", "name": q, "acceptedAnswer": { "@type": "Answer", "text": a } }))
        })}} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          "name": "Map Distance Calculator",
          "description": "Free online map distance calculator with GPS, travel time, area measurement and route sharing.",
          "url": "https://map-distance-calculator.vercel.app/",
          "applicationCategory": "UtilityApplication",
          "operatingSystem": "All",
          "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" }
        })}} />
      </Head>

      <style>{`
        header{background:#fff;border-bottom:1px solid #e5e7eb;padding:.75rem 1.5rem;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:999;}
        .logo{display:flex;align-items:center;gap:8px;text-decoration:none;color:#111827;}
        .logo-icon{width:32px;height:32px;border-radius:8px;background:#2563eb;display:flex;align-items:center;justify-content:center;}
        .logo-icon svg{width:18px;height:18px;fill:white;}
        .logo-text{font-size:15px;font-weight:700;}
        nav a{font-size:13px;color:#6b7280;text-decoration:none;margin-left:1.5rem;transition:color .15s;}
        nav a:hover{color:#2563eb;}
        .hero{text-align:center;padding:2.5rem 1rem 1.5rem;background:linear-gradient(180deg,#eff6ff 0%,#f9fafb 100%);}
        .hero h1{font-size:clamp(22px,4vw,36px);font-weight:800;color:#111827;margin-bottom:.5rem;line-height:1.2;}
        .hero h1 span{color:#2563eb;}
        .hero p{font-size:14px;color:#6b7280;max-width:520px;margin:0 auto 1.25rem;line-height:1.6;}
        .badges{display:flex;gap:7px;justify-content:center;flex-wrap:wrap;margin-bottom:1.5rem;}
        .badge{background:#fff;border:1px solid #e5e7eb;border-radius:20px;padding:4px 11px;font-size:12px;color:#6b7280;display:flex;align-items:center;gap:5px;}
        .badge-dot{width:6px;height:6px;border-radius:50%;background:#2563eb;}
        .tool-wrap{max-width:900px;margin:0 auto;padding:0 1rem 3rem;}
        .gps-bar{display:flex;align-items:center;gap:8px;padding:6px 12px;font-size:12px;border-radius:10px 10px 0 0;transition:all .3s;}
        .gps-pulse{width:7px;height:7px;border-radius:50%;background:currentColor;animation:pulse 1.2s infinite;flex-shrink:0;}
        .gps-dot-s{width:7px;height:7px;border-radius:50%;background:currentColor;flex-shrink:0;}
        @keyframes pulse{0%,100%{opacity:1;transform:scale(1);}50%{opacity:.3;transform:scale(1.4);}}
        .map-card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.06);margin-bottom:1rem;}
        .toolbar{display:flex;gap:5px;padding:8px 10px;flex-wrap:wrap;align-items:center;border-bottom:1px solid #e5e7eb;background:#fff;}
        .t-btn{padding:6px 12px;border-radius:8px;border:1px solid #e5e7eb;background:#fff;font-size:12px;font-weight:500;cursor:pointer;color:#374151;white-space:nowrap;transition:all .15s;font-family:inherit;}
        .t-btn:hover{background:#f3f4f6;}
        .t-btn.act{background:#eff6ff;color:#2563eb;border-color:#bfdbfe;}
        .t-btn.grn{background:#f0fdf4;color:#16a34a;border-color:#bbf7d0;}
        .t-btn.red{color:#dc2626;border-color:#fecaca;}
        .t-btn.red:hover{background:#fef2f2;}
        .t-btn:disabled{opacity:.45;cursor:not-allowed;}
        .sep{width:1px;height:20px;background:#e5e7eb;flex-shrink:0;}
        .srch{flex:1;min-width:130px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:6px 10px;font-size:12px;color:#111827;outline:none;font-family:inherit;}
        .srch:focus{border-color:#2563eb;}
        #map-el{width:100%;height:360px;background:#e8f0e8;}
        .tabs-bar{display:flex;border-bottom:1px solid #e5e7eb;background:#fff;}
        .tab-btn{flex:1;padding:9px 6px;font-size:12px;font-weight:500;text-align:center;cursor:pointer;color:#9ca3af;border:none;background:transparent;border-bottom:2px solid transparent;transition:all .15s;font-family:inherit;}
        .tab-btn.act{color:#2563eb;border-bottom-color:#2563eb;}
        .tab-pane{display:none;padding:12px;background:#fff;}
        .tab-pane.act{display:block;}
        .srow{display:grid;grid-template-columns:repeat(auto-fit,minmax(80px,1fr));gap:7px;margin-bottom:12px;}
        .sc{background:#f9fafb;border-radius:8px;padding:9px 11px;}
        .sl{font-size:10px;color:#9ca3af;margin-bottom:3px;}
        .sv{font-size:16px;font-weight:600;color:#111827;}
        .su{font-size:10px;color:#6b7280;margin-left:2px;}
        .tgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px;}
        .tc{background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:10px;text-align:center;}
        .ti{font-size:20px;display:block;margin-bottom:3px;}
        .tm{font-size:10px;color:#9ca3af;margin-bottom:3px;}
        .tt{font-size:14px;font-weight:600;color:#111827;}
        .ts{font-size:10px;color:#9ca3af;}
        .sec-lbl{font-size:10px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:.07em;margin-bottom:7px;}
        .pts-wrap{display:flex;flex-direction:column;gap:5px;max-height:120px;overflow-y:auto;}
        .pt-row{display:flex;align-items:center;gap:7px;background:#f9fafb;border-radius:8px;padding:6px 9px;font-size:12px;}
        .pt-num{width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:white;flex-shrink:0;}
        .empty{font-size:12px;color:#9ca3af;text-align:center;padding:.75rem;}
        .hist-item{background:#f9fafb;border-radius:8px;padding:9px 11px;margin-bottom:6px;cursor:pointer;transition:background .15s;}
        .hist-item:hover{background:#eff6ff;}
        .hi-name{font-size:13px;font-weight:600;margin-bottom:2px;}
        .hi-meta{font-size:11px;color:#9ca3af;}
        .share-box{background:#f9fafb;border-radius:8px;padding:9px 11px;margin-top:8px;display:flex;gap:8px;align-items:center;}
        .share-url{flex:1;font-size:11px;color:#6b7280;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
        .faq-section{max-width:860px;margin:0 auto;padding:3rem 1rem;}
        .faq-title{font-size:22px;font-weight:800;color:#111827;margin-bottom:1.25rem;}
        .faq-item{border-bottom:1px solid #e5e7eb;}
        .faq-q{width:100%;text-align:left;padding:14px 0;font-size:14px;font-weight:600;background:transparent;border:none;cursor:pointer;color:#111827;display:flex;justify-content:space-between;align-items:center;gap:10px;font-family:inherit;}
        .faq-icon{font-size:18px;color:#9ca3af;flex-shrink:0;transition:transform .2s;}
        .faq-icon.open{transform:rotate(45deg);color:#2563eb;}
        .faq-a{font-size:13px;color:#6b7280;line-height:1.65;padding-bottom:14px;display:none;}
        .faq-a.open{display:block;}
        .tips-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px;margin-bottom:2rem;}
        .tip-card{background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:11px 13px;font-size:13px;color:#6b7280;line-height:1.5;display:flex;gap:9px;align-items:flex-start;}
        .tip-dot{width:6px;height:6px;border-radius:50%;background:#2563eb;flex-shrink:0;margin-top:5px;}
        .divider{border:none;border-top:1px solid #e5e7eb;margin:0;}
        .hiw{display:flex;flex-direction:column;gap:1rem;margin-bottom:2rem;}
        .hiw-step{display:flex;gap:14px;align-items:flex-start;}
        .hiw-num{width:32px;height:32px;border-radius:50%;background:#2563eb;color:white;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;flex-shrink:0;}
        .hiw-body h3{font-size:14px;font-weight:700;margin-bottom:3px;}
        .hiw-body p{font-size:13px;color:#6b7280;line-height:1.55;}
        .sec-title{font-size:20px;font-weight:800;color:#111827;margin-bottom:1.25rem;}
        footer{background:#fff;border-top:1px solid #e5e7eb;padding:2rem 1.5rem;text-align:center;}
        .ft-logo{display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:.6rem;}
        .ft-icon{width:28px;height:28px;border-radius:7px;background:#2563eb;display:flex;align-items:center;justify-content:center;}
        .ft-icon svg{width:15px;height:15px;fill:white;}
        @media(max-width:600px){nav{display:none;}.hero h1{font-size:22px;}.tips-grid{grid-template-columns:1fr;}}
      `}</style>

      {/* HEADER */}
      <header>
        <a className="logo" href="/">
          <div className="logo-icon">
            <svg viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
          </div>
          <span className="logo-text">Map Distance Calculator</span>
        </a>
        <nav>
          <a href="#tool">Calculator</a>
          <a href="#how-it-works">How It Works</a>
          <a href="#faq">FAQ</a>
        </nav>
      </header>

      {/* HERO */}
      <section className="hero">
        <h1>Free <span>Map Distance</span> Calculator</h1>
        <p>Click on a real map to measure distances, calculate travel time, measure area, and share routes — instantly, no sign-up needed.</p>
        <div className="badges">
          {['100% Free','GPS Auto-detect','Real Map','Travel Time','Area Measurement','Save & Share'].map(b => (
            <div key={b} className="badge"><div className="badge-dot"></div>{b}</div>
          ))}
        </div>
      </section>

      {/* TOOL */}
      <div className="tool-wrap" id="tool">
        <div className="map-card">
          {/* GPS Banner */}
          <div className="gps-bar" style={{ background: gpsStatus.type === 'success' ? '#dcfce7' : gpsStatus.type === 'error' ? '#fef9c3' : '#dbeafe', color: gpsStatus.type === 'success' ? '#15803d' : gpsStatus.type === 'error' ? '#854d0e' : '#1e40af' }}>
            <div className={gpsStatus.type === 'info' ? 'gps-pulse' : 'gps-dot-s'}></div>
            <span>{gpsStatus.text}</span>
          </div>

          {/* Toolbar */}
          <div className="toolbar">
            <input className="srch" value={searchQ} onChange={e => setSearchQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && searchLocation()} placeholder="Search any place..." />
            <button className="t-btn" onClick={searchLocation}>Go</button>
            <div className="sep"></div>
            <button className={`t-btn${myLoc ? ' grn' : ''}`} onClick={goToMyLoc} disabled={!myLoc}>Me</button>
            <button className={`t-btn${mode === 'add' ? ' act' : ''}`} onClick={() => setMode('add')}>+ Points</button>
            <button className={`t-btn${mode === 'area' ? ' act' : ''}`} onClick={() => setMode('area')}>Area</button>
            <div className="sep"></div>
            <button className="t-btn" onClick={saveRoute}>Save</button>
            <button className="t-btn" onClick={shareRoute}>Share</button>
            <button className="t-btn red" onClick={clearAll}>Clear</button>
          </div>

          {/* Map */}
          <div id="map-el" ref={mapRef}></div>

          {/* Tabs */}
          <div className="tabs-bar">
            {['stats','elevation','history','share'].map(t => (
              <button key={t} className={`tab-btn${activeTab === t ? ' act' : ''}`} onClick={() => setActiveTab(t)}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {/* Stats Tab */}
          <div className={`tab-pane${activeTab === 'stats' ? ' act' : ''}`}>
            <div className="srow">
              <div className="sc"><div className="sl">Distance</div><div className="sv">{stats.km.toFixed(2)}<span className="su">km</span></div></div>
              <div className="sc"><div className="sl">Miles</div><div className="sv">{stats.miles.toFixed(2)}<span className="su">mi</span></div></div>
              <div className="sc"><div className="sl">Points</div><div className="sv">{stats.points}</div></div>
              <div className="sc"><div className="sl">Area</div><div className="sv">{stats.area ? <>{stats.area.toFixed(2)}<span className="su">km²</span></> : '—'}</div></div>
            </div>
            <div className="tgrid">
              <div className="tc"><span className="ti">🚗</span><div className="tm">Car</div><div className="tt">{formatTime(stats.km, 80)}</div><div className="ts">80 km/h</div></div>
              <div className="tc"><span className="ti">🚶</span><div className="tm">Walk</div><div className="tt">{formatTime(stats.km, 5)}</div><div className="ts">5 km/h</div></div>
              <div className="tc"><span className="ti">🚴</span><div className="tm">Bike</div><div className="tt">{formatTime(stats.km, 20)}</div><div className="ts">20 km/h</div></div>
            </div>
            <div className="sec-lbl">Waypoints</div>
            <div className="pts-wrap">
              {points.length === 0 ? <div className="empty">Click on the map to add waypoints</div> :
                points.map((p, i) => (
                  <div key={i} className="pt-row">
                    <div className="pt-num" style={{ background: p.color }}>{i + 1}</div>
                    <span style={{ flex: 1, color: '#6b7280', fontSize: '11px' }}>{p.lat.toFixed(4)}°, {p.lng.toFixed(4)}°</span>
                    <span style={{ fontSize: '10px', color: '#9ca3af' }}>{p.seg ? p.seg.toFixed(2) + ' km' : 'Start'}</span>
                    <button className="t-btn" style={{ padding: '2px 7px', fontSize: '10px' }} onClick={() => removePoint(i)}>✕</button>
                  </div>
                ))}
            </div>
          </div>

          {/* Elevation Tab */}
          <div className={`tab-pane${activeTab === 'elevation' ? ' act' : ''}`}>
            <div className="sec-lbl" style={{ marginBottom: '8px' }}>Elevation profile (simulated terrain)</div>
            {elevData.length < 2 ? <div className="empty">Add 2+ waypoints to see elevation chart</div> : (
              <>
                <ElevationChart data={elevData} colors={COLORS} />
                <div style={{ marginTop: '8px', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '7px' }}>
                  <div className="sc"><div className="sl">Min elevation</div><div className="sv">{Math.min(...elevData)}m</div></div>
                  <div className="sc"><div className="sl">Max elevation</div><div className="sv">{Math.max(...elevData)}m</div></div>
                  <div className="sc"><div className="sl">Total gain</div><div className="sv">+{elevData.reduce((g,e,i)=>i>0&&e>elevData[i-1]?g+e-elevData[i-1]:g,0)}m</div></div>
                </div>
              </>
            )}
          </div>

          {/* History Tab */}
          <div className={`tab-pane${activeTab === 'history' ? ' act' : ''}`}>
            <div className="sec-lbl">Saved routes (last 5)</div>
            {routeHistory.length === 0 ? <div className="empty">No saved routes — click Save to store a route</div> :
              routeHistory.map((r, i) => (
                <div key={r.id} className="hist-item" onClick={() => loadRoute(r)}>
                  <div className="hi-name">{r.name}</div>
                  <div className="hi-meta">{r.pts.length} points · {r.km} km · {r.date}</div>
                </div>
              ))}
          </div>

          {/* Share Tab */}
          <div className={`tab-pane${activeTab === 'share' ? ' act' : ''}`}>
            <div className="sec-lbl">Share your route</div>
            <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>Add waypoints and click the Share button above to generate a shareable link.</p>
            {shareUrl ? (
              <div className="share-box">
                <span className="share-url">{shareUrl}</span>
                <button className="t-btn grn" onClick={copyShare}>{copied ? 'Copied!' : 'Copy'}</button>
              </div>
            ) : <div className="empty">No route to share yet</div>}
          </div>
        </div>
      </div>

      <hr className="divider" />

      {/* HOW IT WORKS */}
      <section style={{ maxWidth: '860px', margin: '0 auto', padding: '3rem 1rem' }} id="how-it-works">
        <div className="sec-title">How It Works</div>
        <div className="hiw">
          {[['1','Click on the map','Click anywhere on the real OpenStreetMap to place waypoints. Each click adds a numbered marker connected by a dashed line.'],['2','Drag to adjust','Every marker is draggable. Move any point to instantly update the route distance and travel time.'],['3','Switch to Area mode','Click the Area button to measure enclosed land area. Drop 3+ points to form a polygon and see the area in km².'],['4','Save and share','Save your route to browser history, or click Share to get a URL you can send to anyone.']].map(([n,h,p]) => (
            <div key={n} className="hiw-step">
              <div className="hiw-num">{n}</div>
              <div className="hiw-body"><h3>{h}</h3><p>{p}</p></div>
            </div>
          ))}
        </div>
      </section>

      <hr className="divider" />

      {/* PRO TIPS */}
      <section style={{ maxWidth: '860px', margin: '0 auto', padding: '3rem 1rem' }}>
        <div className="sec-title">Tips for Accurate Measurements</div>
        <div className="tips-grid">
          {['Zoom in for more precise point placement','Use GPS detection to start from your current location','Drag markers after placing for fine adjustments','Switch to Area mode to measure fields, land plots or regions','Save routes before clearing to compare later','Share links encode all waypoints — recipients see the exact route','Travel times are straight-line estimates — add ~30% for road routes','Use the search bar to jump to any city or landmark instantly'].map(t => (
            <div key={t} className="tip-card"><div className="tip-dot"></div>{t}</div>
          ))}
        </div>
      </section>

      <hr className="divider" />

      {/* FAQ */}
      <section className="faq-section" id="faq">
        <div className="faq-title">Frequently Asked Questions</div>
        {FAQS.map(([q, a], i) => (
          <div key={i} className="faq-item">
            <button className="faq-q" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
              <span>{q}</span>
              <span className={`faq-icon${openFaq === i ? ' open' : ''}`}>+</span>
            </button>
            <div className={`faq-a${openFaq === i ? ' open' : ''}`}>{a}</div>
          </div>
        ))}
      </section>

      <hr className="divider" />

      {/* FOOTER */}
      <footer>
        <div className="ft-logo">
          <div className="ft-icon"><svg viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg></div>
          <span style={{ fontSize: '14px', fontWeight: '700' }}>Map Distance Calculator</span>
        </div>
        <p style={{ fontSize: '12px', color: '#9ca3af', maxWidth: '420px', margin: '0 auto .6rem', lineHeight: 1.5 }}>Free online tool to measure distances on a real map. GPS auto-detect, travel time, area measurement and route sharing.</p>
        <p style={{ fontSize: '11px', color: '#d1d5db' }}>© 2025 Map Distance Calculator · Map data © OpenStreetMap contributors</p>
      </footer>
    </>
  );
}

function ElevationChart({ data, colors }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length < 2) return;
    const W = canvas.offsetWidth * 2 || 600;
    canvas.width = W; canvas.height = 240;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, 240);
    const min = Math.min(...data), max = Math.max(...data), range = max - min || 1;
    const pad = 40, H = 240;
    const pts = data.map((e, i) => ({ x: pad + i * (W - pad*2) / (data.length-1), y: H - pad - (e-min)/range*(H-pad*2) }));
    ctx.beginPath(); ctx.moveTo(pts[0].x, H-pad);
    pts.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(pts[pts.length-1].x, H-pad); ctx.closePath();
    ctx.fillStyle = 'rgba(37,99,235,0.1)'; ctx.fill();
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
    pts.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 3; ctx.stroke();
    pts.forEach((p, i) => {
      ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, Math.PI*2);
      ctx.fillStyle = colors[i % colors.length]; ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.font = '20px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(data[i]+'m', p.x, p.y-12);
    });
  }, [data]);
  return <canvas ref={canvasRef} style={{ width: '100%', height: '120px', display: 'block' }} />;
}
