"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useTenant } from '@/app/context/TenantContext';

interface Coordinate {
  lat: number;
  lng: number;
}

interface SavedRoof {
  id: string;
  points: Coordinate[];
  area: number;
}

export default function PvPlanner() {
  const { tenant, deductCredits } = useTenant();
  const [address, setAddress] = useState('');
  const [loadingGeocode, setLoadingGeocode] = useState(false);
  const [isCalculated, setIsCalculated] = useState(false);

  // Gestione di falde multiple (Tetti multipli del capannone)
  const [savedRoofs, setSavedRoofs] = useState<SavedRoof[]>([]);
  const [currentPoints, setCurrentPoints] = useState<Coordinate[]>([]);

  // Configurazione dei parametri economici
  const [costPerKwp, setCostPerKwp] = useState(1300); 
  const [fixedCosts, setFixedCosts] = useState(1500); 
  const [includeStorage, setIncludeStorage] = useState(false);
  const [storageCapacity, setStorageCapacity] = useState(15); 
  const [costPerKwhStorage, setCostPerKwhStorage] = useState(600);

  // Campi di output calcolati ed editabili
  const [totalAreaSqm, setTotalAreaSqm] = useState(0);
  const [peakPower, setPeakPower] = useState(0);
  const [annualProduction, setAnnualProduction] = useState(0);
  const [annualSavings, setAnnualSavings] = useState(0);
  const [estimatedCost, setEstimatedCost] = useState(0);
  const [monthlyBill, setMonthlyBill] = useState('600'); 

  const mapRef = useRef<any>(null);
  const activeMarkersRef = useRef<any[]>([]);
  const activePolygonRef = useRef<any>(null);
  const savedPolygonsRef = useRef<any[]>([]);
  const panelsLayerGroupRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const styleEl = document.createElement('style');
    styleEl.innerHTML = `
      .leaflet-container { cursor: crosshair !important; }
      .leaflet-tile {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      @media print {
        body { background: white !important; color: black !important; }
        header, aside, footer, .print\\:hidden { display: none !important; }
        .print\\:block { display: block !important; }
        .print\\:grid { display: grid !important; }
        #map-pv { height: 350px !important; width: 100% !important; visibility: visible !important; display: block !important; }
      }
    `;
    document.head.appendChild(styleEl);

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    script.onload = () => {
      initializeMap();
    };
    document.body.appendChild(script);

    return () => {
      styleEl.remove();
      link.remove();
      script.remove();
    };
  }, []);

  const initializeMap = () => {
    const L = (window as any).L;
    if (!L) return;

    // Zoom visivo della mappa esteso a 22, maxNativeZoom a 19 per prevenire errori 401
    const map = L.map('map-pv', { maxZoom: 22 }).setView([41.9028, 12.4964], 6);
    mapRef.current = map;

    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 22,
      maxNativeZoom: 19,
      attribution: 'Esri, Maxar'
    }).addTo(map);

    panelsLayerGroupRef.current = L.layerGroup().addTo(map);

    map.on('click', (e: any) => {
      const { lat, lng } = e.latlng;
      addPolygonPoint({ lat, lng });
    });
  };

  const addPolygonPoint = (point: Coordinate) => {
    const L = (window as any).L;
    if (!L || isCalculated) return;

    setCurrentPoints(prev => {
      const updated = [...prev, point];
      const marker = L.marker([point.lat, point.lng]).addTo(mapRef.current);
      activeMarkersRef.current.push(marker);

      if (activePolygonRef.current) {
        activePolygonRef.current.setLatLngs(updated.map(p => [p.lat, p.lng]));
      } else {
        activePolygonRef.current = L.polygon(updated.map(p => [p.lat, p.lng]), { color: tenant?.brand_color_hex || '#0284c7', fillOpacity: 0.25 }).addTo(mapRef.current);
      }

      return updated;
    });
  };

  // Funzione per ripulire la falda temporanea corrente (Richiamata in reset e salvataggio)
  const clearMapPoints = () => {
    setCurrentPoints([]);
    setIsCalculated(false);
    activeMarkersRef.current.forEach(m => m.remove());
    activeMarkersRef.current = [];
    if (activePolygonRef.current) {
      activePolygonRef.current.remove();
      activePolygonRef.current = null;
    }
  };

  const isPointInPolygon = (point: Coordinate, polygon: Coordinate[]) => {
    const x = point.lat, y = point.lng;
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].lat, yi = polygon[i].lng;
      const xj = polygon[j].lat, yj = polygon[j].lng;
      const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  };

  const drawPanelsInsidePolygon = (points: Coordinate[]) => {
    const L = (window as any).L;
    if (!L || points.length < 3) return;

    const lats = points.map(p => p.lat);
    const lngs = points.map(p => p.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const latStep = 0.000015; 
    const lngStep = 0.000012; 

    for (let lat = minLat; lat < maxLat; lat += latStep) {
      for (let lng = minLng; lng < maxLng; lng += lngStep) {
        const center = { lat: lat + latStep / 2, lng: lng + lngStep / 2 };
        
        if (isPointInPolygon(center, points)) {
          L.rectangle([
            [lat, lng],
            [lat + latStep * 0.9, lng + lngStep * 0.9]
          ], {
            color: '#1e293b', 
            fillColor: '#0f172a', 
            fillOpacity: 0.9,
            weight: 1
          }).addTo(panelsLayerGroupRef.current);
        }
      }
    }
  };

  const calculateAreaInSqm = (points: Coordinate[]) => {
    if (points.length < 3) return 0;
    const latMid = points[0].lat * Math.PI / 180;
    const meters = points.map(p => ({
      x: p.lng * 111320 * Math.cos(latMid),
      y: p.lat * 110540
    }));

    let area = 0;
    for (let i = 0; i < meters.length; i++) {
      const j = (i + 1) % meters.length;
      area += meters[i].x * meters[j].y - meters[j].x * meters[i].y;
    }
    return Math.abs(area / 2);
  };

  const handleSaveCurrentRoof = () => {
    if (currentPoints.length < 3) {
      alert("Definisci almeno 3 punti sulla mappa prima di salvare questa falda.");
      return;
    }

    const area = calculateAreaInSqm(currentPoints);
    const L = (window as any).L;

    drawPanelsInsidePolygon(currentPoints);

    const savedPolygon = L.polygon(currentPoints.map(p => [p.lat, p.lng]), { color: '#10b981', fillOpacity: 0.35 }).addTo(mapRef.current);
    savedPolygonsRef.current.push(savedPolygon);

    setSavedRoofs(prev => [...prev, { id: `roof-${Date.now()}`, points: currentPoints, area }]);
    
    // Pulisci l'area temporanea
    activeMarkersRef.current.forEach(m => m.remove());
    activeMarkersRef.current = [];
    if (activePolygonRef.current) activePolygonRef.current.remove();
    activePolygonRef.current = null;
    setCurrentPoints([]);
  };

  const handleGenerateReport = async () => {
    let finalRoofs = [...savedRoofs];
    if (currentPoints.length >= 3) {
      const area = calculateAreaInSqm(currentPoints);
      finalRoofs.push({ id: `roof-last`, points: currentPoints, area });
      drawPanelsInsidePolygon(currentPoints);
    }

    if (finalRoofs.length === 0) {
      alert("Traccia almeno una falda del tetto prima di procedere con l'elaborazione economica.");
      return;
    }

    const totalArea = finalRoofs.reduce((acc, r) => acc + r.area, 0);
    setTotalAreaSqm(totalArea);

    const estimPeakPower = (totalArea / 1.65) * 0.43;
    setPeakPower(estimPeakPower);

    const success = await deductCredits(150, `Studio di Fattibilità Industriale (${finalRoofs.length} falde): ${address}`);
    if (!success) return;

    setLoadingGeocode(true);
    try {
      const pvgisUrl = `https://re.jrc.ec.europa.eu/api/v5_2/PVcalc?lat=${finalRoofs[0].points[0].lat}&lon=${finalRoofs[0].points[0].lng}&peakpower=${estimPeakPower.toFixed(2)}&loss=14&outputformat=json`;
      const response = await fetch(pvgisUrl);
      const data = await response.json();
      const productionVal = data.outputs?.totals?.fixed?.E_y || (estimPeakPower * 1350);
      setAnnualProduction(productionVal);
      setAnnualSavings(Math.min(parseFloat(monthlyBill) * 12 * 0.85, productionVal * 0.25));

      let costTotal = (estimPeakPower * costPerKwp) + fixedCosts;
      if (includeStorage) {
        costTotal += (storageCapacity * costPerKwhStorage);
      }
      setEstimatedCost(Math.round(costTotal));
      setIsCalculated(true);
    } catch (err) {
      const localProductionEstimate = estimPeakPower * 1350;
      setAnnualProduction(localProductionEstimate);
      setAnnualSavings(Math.min(parseFloat(monthlyBill) * 12 * 0.85, localProductionEstimate * 0.25));

      let costTotal = (estimPeakPower * costPerKwp) + fixedCosts;
      if (includeStorage) {
        costTotal += (storageCapacity * costPerKwhStorage);
      }
      setEstimatedCost(Math.round(costTotal));
      setIsCalculated(true);
    } finally {
      setLoadingGeocode(false);
    }
  };

  const handleResetPlanner = () => {
    clearMapPoints();
    setSavedRoofs([]);
    savedPolygonsRef.current.forEach(p => p.remove());
    savedPolygonsRef.current = [];
    if (panelsLayerGroupRef.current) panelsLayerGroupRef.current.clearLayers();
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) return;
    setLoadingGeocode(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`);
      const data = await response.json();
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        const newCoords = { lat: parseFloat(lat), lng: parseFloat(lon) };
        handleResetPlanner();
        if (mapRef.current) {
          mapRef.current.setView([newCoords.lat, newCoords.lng], 19); 
        }
      } else {
        alert("Indirizzo non trovato.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingGeocode(false);
    }
  };

  const panelCount = totalAreaSqm ? Math.floor(totalAreaSqm / 1.65) : 0;
  const brandColor = tenant?.brand_color_hex || '#0284c7';

  return (
    <div className="space-y-8">
      <div className="print:hidden">
        <h1 className="text-3xl font-bold tracking-tight text-white">PV Planner Industriale</h1>
        <p className="text-zinc-400 mt-1">Progetta impianti multiarea su capannoni. Traccia le campate singolarmente, posa i pannelli in 3D e stampa l'offerta.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 print:hidden">
        
        {/* Controlli */}
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl space-y-5">
          <form onSubmit={handleSearch} className="space-y-2">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Cerca Capannone / Sito</label>
            <div className="flex gap-2">
              <input type="text" placeholder="Es: Zona Industriale, Frosinone" value={address} onChange={(e) => setAddress(e.target.value)} className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none" />
              <button type="submit" className="bg-zinc-800 border border-zinc-700 px-4 rounded-xl text-white transition">🔍</button>
            </div>
          </form>

          {/* Configurazione Parametri Economici */}
          <div className="border-t border-zinc-800 pt-4 space-y-4">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Listino Costi Industriali</span>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-zinc-500 font-semibold block uppercase">Modulo + Posa (€/kWp)</label>
                  <input type="number" value={costPerKwp} onChange={(e) => setCostPerKwp(parseInt(e.target.value) || 0)} className="w-full bg-zinc-800 border border-zinc-700 text-xs text-white p-2.5 rounded-lg mt-1" />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 font-semibold block uppercase">Progetto & Fissi (€)</label>
                  <input type="number" value={fixedCosts} onChange={(e) => setFixedCosts(parseInt(e.target.value) || 0)} className="w-full bg-zinc-800 border border-zinc-700 text-xs text-white p-2.5 rounded-lg mt-1" />
                </div>
              </div>

              <div className="bg-zinc-800 p-3 rounded-xl border border-zinc-700 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-300 font-bold">Batterie d'Accumulo (Industrial)</span>
                  <input type="checkbox" checked={includeStorage} onChange={(e) => setIncludeStorage(e.target.checked)} className="rounded text-emerald-500" />
                </div>
                {includeStorage && (
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-700">
                    <div>
                      <label className="text-[10px] text-zinc-500 font-semibold block uppercase">Capacità (kWh)</label>
                      <input type="number" value={storageCapacity} onChange={(e) => setStorageCapacity(parseInt(e.target.value) || 0)} className="w-full bg-zinc-700 border border-zinc-650 text-xs text-white p-2 rounded-lg mt-1" />
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-500 font-semibold block uppercase">Costo/kWh (€)</label>
                      <input type="number" value={costPerKwhStorage} onChange={(e) => setCostPerKwhStorage(parseInt(e.target.value) || 0)} className="w-full bg-zinc-700 border border-zinc-650 text-xs text-white p-2 rounded-lg mt-1" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2 border-t border-zinc-800 pt-4">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Bolletta Elettrica (€/Mese)</label>
            <input type="number" value={monthlyBill} onChange={(e) => setMonthlyBill(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none" />
          </div>

          <div className="flex flex-col gap-2 pt-2 border-t border-zinc-800">
            <button onClick={handleSaveCurrentRoof} className="w-full py-3 bg-zinc-850 hover:bg-zinc-800 text-white border border-zinc-700 font-bold text-xs rounded-xl transition">
              💾 Salva Falda Corrente ({savedRoofs.length} salvate)
            </button>
            <button onClick={handleGenerateReport} className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-xl text-sm transition">
              🚀 Genera Preventivo Totale
            </button>
            <button onClick={handleResetPlanner} className="w-full py-2 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded-xl text-xs transition">
              Reset Progetto
            </button>
          </div>
        </div>

        {/* Mappa */}
        <div className="lg:col-span-2 flex flex-col h-[520px] bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden relative">
          <div id="map-pv" className="w-full h-full z-10" />
        </div>
      </div>

      {/* Output del Preventivo e foglio di stampa A4 */}
      {isCalculated && (
        <div className="bg-zinc-900 border-2 border-emerald-500/30 p-8 rounded-3xl space-y-8 print:bg-white print:text-black print:border-0 print:p-0 animate-fadeIn">
          
          <div className="flex items-start justify-between border-b border-zinc-800 pb-6 print:border-zinc-300">
            <div className="space-y-1">
              <h2 className="text-2xl font-black text-white print:text-black uppercase tracking-tight">{tenant?.company_name || 'Solis Energy SRL'}</h2>
              <p className="text-xs text-zinc-400 print:text-zinc-600 font-medium">Offerta economica per impianto fotovoltaico connesso in rete con formula "chiavi in mano"</p>
              {address && <p className="text-xs text-zinc-500 font-semibold">📍 Edificio / Capannone sito in: {address}</p>}
            </div>
            
            <div className="text-right text-xs text-zinc-400 print:text-zinc-700 space-y-1">
              <span className="font-bold text-white print:text-black text-sm block">Riferimenti Commerciali</span>
              <p>Email: {tenant?.notification_email || 'tecnico@novasolar.it'}</p>
              <p>Data Offerta: {new Date().toLocaleDateString()}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 print:grid-cols-5">
            <div className="bg-zinc-800 p-4 rounded-xl border border-zinc-750 print:bg-zinc-100 print:border-zinc-300">
              <span className="text-[10px] text-zinc-400 print:text-zinc-600 uppercase font-bold block">Superficie Totale</span>
              <input type="number" value={totalAreaSqm.toFixed(1)} onChange={(e) => setTotalAreaSqm(parseFloat(e.target.value) || 0)} className="bg-transparent text-xl font-bold text-white print:text-black focus:outline-none border-b border-dashed border-zinc-700 w-full mt-1" />
              <span className="text-[9px] text-zinc-500 block mt-1">Falde tracciate: {savedRoofs.length || 1}</span>
            </div>
            <div className="bg-zinc-800 p-4 rounded-xl border border-zinc-750 print:bg-zinc-100 print:border-zinc-300">
              <span className="text-[10px] text-zinc-400 print:text-zinc-600 uppercase font-bold block">Potenza Nominale</span>
              <input type="number" step="0.1" value={peakPower.toFixed(2)} onChange={(e) => setPeakPower(parseFloat(e.target.value) || 0)} className="bg-transparent text-xl font-bold text-emerald-400 print:text-emerald-700 focus:outline-none border-b border-dashed border-zinc-700 w-full mt-1" />
              <span className="text-[9px] text-zinc-500 block mt-1">Circa {panelCount} moduli da 430W</span>
            </div>
            <div className="bg-zinc-800 p-4 rounded-xl border border-zinc-750 print:bg-zinc-100 print:border-zinc-300">
              <span className="text-[10px] text-zinc-400 print:text-zinc-600 uppercase font-bold block">Produzione Annua</span>
              <input type="number" value={Math.round(annualProduction)} onChange={(e) => setAnnualProduction(parseInt(e.target.value) || 0)} className="bg-transparent text-xl font-bold text-white print:text-black focus:outline-none border-b border-dashed border-zinc-700 w-full mt-1" />
              <span className="text-[9px] text-zinc-500 block mt-1">Stima database PVGIS</span>
            </div>
            <div className="bg-zinc-800 p-4 rounded-xl border border-zinc-750 print:bg-zinc-100 print:border-zinc-300">
              <span className="text-[10px] text-zinc-400 print:text-zinc-600 uppercase font-bold block">Accumulo (Batteria)</span>
              <span className="text-xl font-bold text-white print:text-black block mt-1">{includeStorage ? `${storageCapacity} kWh` : 'Non presente'}</span>
              <span className="text-[9px] text-zinc-500 block mt-1">Industrial Lithium Pack</span>
            </div>
            <div className="bg-zinc-800 p-4 rounded-xl border border-zinc-750 print:bg-zinc-100 print:border-zinc-300">
              <span className="text-[10px] text-zinc-400 print:text-zinc-600 uppercase font-bold block">Risparmio Stimato</span>
              <input type="number" value={Math.round(annualSavings)} onChange={(e) => setAnnualSavings(parseInt(e.target.value) || 0)} className="bg-transparent text-xl font-bold text-emerald-400 print:text-emerald-700 focus:outline-none border-b border-dashed border-zinc-700 w-full mt-1" />
              <span className="text-[9px] text-zinc-500 block mt-1">Risparmio economico annuo</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-zinc-300 print:text-zinc-800 uppercase tracking-wider">Cosa comprende l'offerta "Chiavi in Mano":</h3>
              <ul className="text-xs text-zinc-400 print:text-zinc-700 space-y-2.5 list-disc pl-4">
                <li>Progettazione esecutiva e redazione del fascicolo tecnico a cura di ingegneri abilitati.</li>
                <li>Fornitura dei moduli fotovoltaici in silicio monocristallino ad alta efficienza.</li>
                <li>Installazione meccanica con strutture certificate TUV resistenti ad agenti atmosferici.</li>
                <li>Pratiche burocratiche per la connessione alla rete elettrica nazionale (Enel) e G.S.E.</li>
                <li>Manutenzione ordinaria gratuita e monitoraggio Wi-Fi da remoto per i primi 12 mesi.</li>
              </ul>
            </div>

            <div className="bg-zinc-800/40 p-6 rounded-2xl border border-zinc-800 print:bg-zinc-100 print:border-zinc-300 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-zinc-400 print:text-zinc-600 uppercase block">Riepilogo Investimento Economico</span>
                <p className="text-[11px] text-zinc-500 mt-1">Importo complessivo omnicomprensivo comprensivo di IVA agevolata 10%.</p>
              </div>

              <div className="pt-4 border-t border-zinc-800 print:border-zinc-300 mt-4 flex items-baseline justify-between">
                <span className="text-sm font-bold text-zinc-300 print:text-black">Totale Investimento:</span>
                <div className="text-right">
                  <span className="text-3xl font-black text-white print:text-black" style={{ color: brandColor }}>
                    € {estimatedCost.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-zinc-500 block mt-0.5">IVA 10% COMPRESA</span>
                </div>
              </div>
            </div>
          </div>

          <div className="hidden print:flex items-center justify-between pt-16 mt-8 border-t border-zinc-200">
            <div className="text-center w-64 border-b border-zinc-400 pb-2">
              <p className="text-[10px] text-zinc-500">Timbro e Firma per Conferma (Azienda)</p>
            </div>
            <div className="text-center w-64 border-b border-zinc-400 pb-2">
              <p className="text-[10px] text-zinc-500">Firma per Accettazione (Cliente)</p>
            </div>
          </div>

          <div className="border-t border-zinc-800 pt-6 flex items-center justify-between print:hidden">
            <span className="text-xs text-zinc-500">
              *Il preventivo è interamente editabile. Modifica i numeri direttamente a schermo prima di premere esporta per allinearli ai tuoi listini esatti.
            </span>
            <button onClick={() => window.print()} className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-xl text-sm transition">
              🖨️ Stampa / Esporta PDF
            </button>
          </div>

        </div>
      )}
    </div>
  );
}
