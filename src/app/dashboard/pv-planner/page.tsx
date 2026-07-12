"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useTenant } from '@/app/context/TenantContext';

interface Coordinate {
  lat: number;
  lng: number;
}

export default function PvPlanner() {
  const { tenant, deductCredits } = useTenant();
  const [address, setAddress] = useState('');
  const [loadingGeocode, setLoadingGeocode] = useState(false);
  const [coords, setCoords] = useState<Coordinate | null>(null);
  const [polygonPoints, setPolygonPoints] = useState<Coordinate[]>([]);
  const [isCalculated, setIsCalculated] = useState(false);

  const [areaSqm, setAreaSqm] = useState(0);
  const [peakPower, setPeakPower] = useState(0);
  const [annualProduction, setAnnualProduction] = useState(0);
  const [annualSavings, setAnnualSavings] = useState(0);
  const [estimatedCost, setEstimatedCost] = useState(5500);

  const [monthlyBill, setMonthlyBill] = useState('150');

  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polygonRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

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
      link.remove();
      script.remove();
    };
  }, []);

  const initializeMap = () => {
    const L = (window as any).L;
    if (!L) return;

    const map = L.map('map-pv').setView([41.9028, 12.4964], 6);
    mapRef.current = map;

    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      attribution: 'Esri, Maxar'
    }).addTo(map);

    map.on('click', (e: any) => {
      const { lat, lng } = e.latlng;
      addPolygonPoint({ lat, lng });
    });
  };

  const addPolygonPoint = (point: Coordinate) => {
    const L = (window as any).L;
    if (!L || isCalculated) return;

    setPolygonPoints(prev => {
      const updated = [...prev, point];
      const marker = L.marker([point.lat, point.lng]).addTo(mapRef.current);
      markersRef.current.push(marker);

      if (polygonRef.current) {
        polygonRef.current.setLatLngs(updated.map(p => [p.lat, p.lng]));
      } else {
        polygonRef.current = L.polygon(updated.map(p => [p.lat, p.lng]), { color: tenant?.brand_color_hex || '#0284c7' }).addTo(mapRef.current);
      }

      return updated;
    });
  };

  const clearMapPoints = () => {
    setPolygonPoints([]);
    setIsCalculated(false);
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    if (polygonRef.current) {
      polygonRef.current.remove();
      polygonRef.current = null;
    }
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
        setCoords(newCoords);
        clearMapPoints();
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

  const handleGenerateReport = async () => {
    if (polygonPoints.length < 3) {
      alert("Attenzione: clicca sulla mappa satellitare per definire almeno 3 punti (il perimetro del tetto) prima di elaborare il report.");
      return;
    }

    const area = calculateAreaInSqm(polygonPoints);
    setAreaSqm(area);
    const estimPeakPower = (area / 1.65) * 0.43;
    setPeakPower(estimPeakPower);

    const success = await deductCredits(150, `Elaborazione Report Solare: ${address}`);
    if (!success) return;

    setLoadingGeocode(true);
    try {
      const pvgisUrl = `https://re.jrc.ec.europa.eu/api/v5_2/PVcalc?lat=${polygonPoints[0].lat}&lon=${polygonPoints[0].lng}&peakpower=${estimPeakPower.toFixed(2)}&loss=14&outputformat=json`;
      const response = await fetch(pvgisUrl);
      const data = await response.json();
      const productionVal = data.outputs?.totals?.fixed?.E_y || (estimPeakPower * 1350);
      setAnnualProduction(productionVal);
      setAnnualSavings(Math.min(parseFloat(monthlyBill) * 12 * 0.85, productionVal * 0.25));
      setEstimatedCost(Math.round(estimPeakPower * 1200));
      setIsCalculated(true);
    } catch (err) {
      const localProductionEstimate = estimPeakPower * 1350;
      setAnnualProduction(localProductionEstimate);
      setAnnualSavings(Math.min(parseFloat(monthlyBill) * 12 * 0.85, localProductionEstimate * 0.25));
      setEstimatedCost(Math.round(estimPeakPower * 1200));
      setIsCalculated(true);
    } finally {
      setLoadingGeocode(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="print:hidden">
        <h1 className="text-3xl font-bold tracking-tight text-white">PV Planner</h1>
        <p className="text-zinc-400 mt-1">Traccia la falda del tetto e personalizza il preventivo grafico per il tuo cliente prima di scaricarlo.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 print:hidden">
        
        {/* Pannello di Input */}
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl space-y-6">
          <form onSubmit={handleSearch} className="space-y-2">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center">
              Cerca Indirizzo
              <span className="group relative ml-2 inline-block cursor-help text-zinc-500 hover:text-emerald-400">
                ℹ️
                <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-48 -translate-x-1/2 rounded-lg bg-zinc-950 border border-zinc-800 p-3 text-center text-xs text-zinc-200 shadow-2xl invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-200 whitespace-normal">
                  Inserisci la via, il civico e il comune per allineare il satellite sul tetto.
                </span>
              </span>
            </label>
            <div className="flex gap-2">
              <input type="text" placeholder="Es: Via Roma 10, Milano" value={address} onChange={(e) => setAddress(e.target.value)} className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none" />
              <button type="submit" disabled={loadingGeocode} className="bg-zinc-800 border border-zinc-700 px-4 rounded-xl text-white transition">🔍</button>
            </div>
          </form>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center">
              Spesa Mensile (€)
              <span className="group relative ml-2 inline-block cursor-help text-zinc-500 hover:text-emerald-400">
                ℹ️
                <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-48 -translate-x-1/2 rounded-lg bg-zinc-950 border border-zinc-800 p-3 text-center text-xs text-zinc-200 shadow-2xl invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-200 whitespace-normal">
                  La bolletta media mensile del cliente, utile all'algoritmo per stimare l'ammortamento dell'investimento.
                </span>
              </span>
            </label>
            <input type="number" value={monthlyBill} onChange={(e) => setMonthlyBill(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none" />
          </div>

          <div className="flex flex-col gap-3">
            <button onClick={handleGenerateReport} className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-xl transition">🚀 Elabora Preventivo (150 crediti)</button>
            <button onClick={clearMapPoints} className="w-full py-2 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded-xl text-sm transition">Reset Mappa</button>
          </div>
        </div>

        {/* Mappa */}
        <div className="lg:col-span-2 flex flex-col h-[500px] bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden relative">
          <div id="map-pv" className="w-full h-full z-10" />
        </div>
      </div>

      {/* Output / Preventivo EDITABILE */}
      {isCalculated && (
        <div className="bg-zinc-900 border-2 border-emerald-500/30 p-8 rounded-3xl space-y-6 print:bg-white print:text-black print:border-0 print:p-0">
          
          <div className="flex items-center justify-between border-b border-zinc-800 pb-4 print:border-zinc-300">
            <div>
              <h2 className="text-2xl font-black text-white print:text-black">Studio di Fattibilità Preliminare</h2>
              <p className="text-xs text-zinc-400 print:text-zinc-600 mt-1">Elaborato per l'indirizzo: {address || "Coordinate satellite"}</p>
            </div>
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest print:hidden">Preventivo Modificabile</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            
            <div className="bg-zinc-800 p-6 rounded-2xl border border-zinc-700 print:bg-zinc-100 print:border-zinc-300">
              <label className="text-xs text-zinc-400 print:text-zinc-600 font-semibold uppercase block">Superficie (mq)</label>
              <input type="number" value={areaSqm.toFixed(1)} onChange={(e) => setAreaSqm(parseFloat(e.target.value) || 0)} className="bg-transparent text-3xl font-bold text-white print:text-black focus:outline-none w-full border-b border-dashed border-zinc-700 focus:border-emerald-500 mt-2" />
            </div>

            <div className="bg-zinc-800 p-6 rounded-2xl border border-zinc-700 print:bg-zinc-100 print:border-zinc-300">
              <label className="text-xs text-zinc-400 print:text-zinc-600 font-semibold uppercase block">Potenza (kWp)</label>
              <input type="number" step="0.1" value={peakPower.toFixed(2)} onChange={(e) => setPeakPower(parseFloat(e.target.value) || 0)} className="bg-transparent text-3xl font-bold text-emerald-400 print:text-emerald-700 focus:outline-none w-full border-b border-dashed border-zinc-700 focus:border-emerald-500 mt-2" />
            </div>

            <div className="bg-zinc-800 p-6 rounded-2xl border border-zinc-700 print:bg-zinc-100 print:border-zinc-300">
              <label className="text-xs text-zinc-400 print:text-zinc-600 font-semibold uppercase block">Produzione (kWh)</label>
              <input type="number" value={Math.round(annualProduction)} onChange={(e) => setAnnualProduction(parseFloat(e.target.value) || 0)} className="bg-transparent text-3xl font-bold text-white print:text-black focus:outline-none w-full border-b border-dashed border-zinc-700 focus:border-emerald-500 mt-2" />
            </div>

            <div className="bg-zinc-800 p-6 rounded-2xl border border-zinc-700 print:bg-zinc-100 print:border-zinc-300">
              <label className="text-xs text-zinc-400 print:text-zinc-600 font-semibold uppercase block">Risparmio (€/anno)</label>
              <input type="number" value={Math.round(annualSavings)} onChange={(e) => setAnnualSavings(parseFloat(e.target.value) || 0)} className="bg-transparent text-3xl font-bold text-emerald-400 print:text-emerald-700 focus:outline-none w-full border-b border-dashed border-zinc-700 focus:border-emerald-500 mt-2" />
            </div>

            <div className="bg-zinc-850 p-6 rounded-2xl border border-zinc-700 print:bg-zinc-100 print:border-zinc-300">
              <label className="text-xs text-zinc-400 print:text-zinc-600 font-semibold uppercase block">Costo Impianto (€)</label>
              <input type="number" value={estimatedCost} onChange={(e) => setEstimatedCost(parseFloat(e.target.value) || 0)} className="bg-transparent text-3xl font-bold text-white print:text-black focus:outline-none w-full border-b border-dashed border-zinc-700 focus:border-emerald-500 mt-2" />
            </div>

          </div>

          <div className="border-t border-zinc-800 pt-6 flex items-center justify-between print:border-zinc-300">
            <span className="text-xs text-zinc-500 print:text-zinc-600">
              *I valori sopra sono interamente modificabili. Puoi personalizzarli a piacimento prima di generare il PDF.
            </span>
            <button onClick={() => window.print()} className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-xl text-sm transition print:hidden">
              🖨️ Stampa / Esporta PDF
            </button>
          </div>

        </div>
      )}
    </div>
  );
}
