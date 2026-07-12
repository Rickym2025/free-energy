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
  const [polygonPoints, setPolygonPoints] = useState<Coordinate[]>([]);
  const [isCalculated, setIsCalculated] = useState(false);

  // Configurazione dei parametri economici dell'installatore (personalizzabili)
  const [costPerKwp, setCostPerKwp] = useState(1500); // Costo moduli e posa per kWp
  const [fixedCosts, setFixedCosts] = useState(1200);  // Costi fissi pratiche, progettazione, collaudo
  const [includeStorage, setIncludeStorage] = useState(false); // Opzione Batteria
  const [storageCapacity, setStorageCapacity] = useState(5); // Capacità in kWh
  const [costPerKwhStorage, setCostPerKwhStorage] = useState(700); // Costo accumulo per kWh

  // Campi di output calcolati ed editabili per l'anteprima
  const [areaSqm, setAreaSqm] = useState(0);
  const [peakPower, setPeakPower] = useState(0);
  const [annualProduction, setAnnualProduction] = useState(0);
  const [annualSavings, setAnnualSavings] = useState(0);
  const [estimatedCost, setEstimatedCost] = useState(0);

  const [monthlyBill, setMonthlyBill] = useState('150');

  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polygonRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Iniezione CSS per la mappa con mirino di precisione e corretta stampa
    const styleEl = document.createElement('style');
    styleEl.innerHTML = `
      .leaflet-container { cursor: crosshair !important; }
      @media print {
        body { background: white !important; color: black !important; }
        header, aside, footer, .print\\:hidden { display: none !important; }
        .print\\:block { display: block !important; }
        .print\\:grid { display: grid !important; }
        #map-pv { height: 350px !important; border: 1px solid #ccc !important; }
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

    // Impostiamo maxZoom a 19 per evitare l'errore 401 delle API Esri
    const map = L.map('map-pv', { maxZoom: 19 }).setView([41.9028, 12.4964], 6);
    mapRef.current = map;

    // Anche il TileLayer deve bloccarsi a zoom 19
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
        clearMapPoints();
        if (mapRef.current) {
          mapRef.current.setView([newCoords.lat, newCoords.lng], 19); // Puntiamo il satellite ad altissima risoluzione
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
      alert("Attenzione: clicca sulla mappa satellitare per posizionare almeno 3 punti ed identificare il tetto.");
      return;
    }

    const area = calculateAreaInSqm(polygonPoints);
    setAreaSqm(area);
    const estimPeakPower = (area / 1.65) * 0.43;
    setPeakPower(estimPeakPower);

    const success = await deductCredits(150, `Elaborazione Preventivo Tecnico Solare: ${address}`);
    if (!success) return;

    setLoadingGeocode(true);
    try {
      const pvgisUrl = `https://re.jrc.ec.europa.eu/api/v5_2/PVcalc?lat=${polygonPoints[0].lat}&lon=${polygonPoints[0].lng}&peakpower=${estimPeakPower.toFixed(2)}&loss=14&outputformat=json`;
      const response = await fetch(pvgisUrl);
      const data = await response.json();
      const productionVal = data.outputs?.totals?.fixed?.E_y || (estimPeakPower * 1350);
      setAnnualProduction(productionVal);
      setAnnualSavings(Math.min(parseFloat(monthlyBill) * 12 * 0.85, productionVal * 0.25));
      
      // Calcolo economico basato sui parametri personalizzati
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

  const panelCount = areaSqm ? Math.floor(areaSqm / 1.65) : 0;
  const brandColor = tenant?.brand_color_hex || '#0284c7';

  return (
    <div className="space-y-8">
      {/* Intestazione visibile solo a schermo */}
      <div className="print:hidden">
        <h1 className="text-3xl font-bold tracking-tight text-white">PV Planner</h1>
        <p className="text-zinc-400 mt-1">Disegna il tetto tramite il mirino di precisione satellitare, configura i costi aziendali e genera il PDF dell'offerta.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 print:hidden">
        
        {/* Barra laterale controlli */}
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl space-y-6">
          <form onSubmit={handleSearch} className="space-y-2">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Cerca l'indirizzo dell'edificio</label>
            <div className="flex gap-2">
              <input type="text" placeholder="Es: Via Roma 10, Milano" value={address} onChange={(e) => setAddress(e.target.value)} className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none" />
              <button type="submit" className="bg-zinc-800 border border-zinc-700 px-4 rounded-xl text-white transition">🔍</button>
            </div>
          </form>

          {/* Configurazione Parametri Economici */}
          <div className="border-t border-zinc-800 pt-4 space-y-4">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Tariffazione Azienda</span>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-zinc-500 font-semibold block uppercase">Costo al kWp (€)</label>
                  <input type="number" value={costPerKwp} onChange={(e) => setCostPerKwp(parseInt(e.target.value) || 0)} className="w-full bg-zinc-850 border border-zinc-750 text-xs text-white p-2 rounded-lg mt-1" />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 font-semibold block uppercase">Fissi & Pratiche (€)</label>
                  <input type="number" value={fixedCosts} onChange={(e) => setFixedCosts(parseInt(e.target.value) || 0)} className="w-full bg-zinc-850 border border-zinc-750 text-xs text-white p-2 rounded-lg mt-1" />
                </div>
              </div>

              <div className="bg-zinc-850 p-3 rounded-xl border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-300 font-bold">Includi Accumulo (Batteria)</span>
                  <input type="checkbox" checked={includeStorage} onChange={(e) => setIncludeStorage(e.target.checked)} className="rounded text-emerald-500" />
                </div>
                {includeStorage && (
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800">
                    <div>
                      <label className="text-[10px] text-zinc-500 font-semibold block uppercase">Capacità (kWh)</label>
                      <input type="number" value={storageCapacity} onChange={(e) => setStorageCapacity(parseInt(e.target.value) || 0)} className="w-full bg-zinc-800 border border-zinc-700 text-xs text-white p-2 rounded-lg mt-1" />
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-500 font-semibold block uppercase">Costo per kWh (€)</label>
                      <input type="number" value={costPerKwhStorage} onChange={(e) => setCostPerKwhStorage(parseInt(e.target.value) || 0)} className="w-full bg-zinc-800 border border-zinc-700 text-xs text-white p-2 rounded-lg mt-1" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2 border-t border-zinc-800 pt-4">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Bolletta Media (€/Mese)</label>
            <input type="number" value={monthlyBill} onChange={(e) => setMonthlyBill(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none" />
          </div>

          <div className="flex flex-col gap-3">
            <button onClick={handleGenerateReport} className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-xl transition">🚀 Elabora Preventivo (150 crediti)</button>
            <button onClick={clearMapPoints} className="w-full py-2 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded-xl text-sm transition">Reset Mappa</button>
          </div>
        </div>

        {/* Contenitore Mappa */}
        <div className="lg:col-span-2 flex flex-col h-[500px] bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden relative">
          <div id="map-pv" className="w-full h-full z-10" />
        </div>
      </div>

      {/* Output del Preventivo e foglio di stampa A4 */}
      {isCalculated && (
        <div className="bg-zinc-900 border-2 border-emerald-500/30 p-8 rounded-3xl space-y-8 print:bg-white print:text-black print:border-0 print:p-0">
          
          {/* Header del preventivo: Visualizza i dati commerciali dell'installatore */}
          <div className="flex items-start justify-between border-b border-zinc-800 pb-6 print:border-zinc-300">
            <div className="space-y-1">
              <h2 className="text-2xl font-black text-white print:text-black uppercase tracking-tight">{tenant?.company_name || 'Nova Solar SRL'}</h2>
              <p className="text-xs text-zinc-400 print:text-zinc-600 font-medium">Offerta economica per impianto fotovoltaico connesso in rete con formula "chiavi in mano"</p>
              {address && <p className="text-xs text-zinc-500 font-semibold">📍 Edificio sito in: {address}</p>}
            </div>
            
            <div className="text-right text-xs text-zinc-400 print:text-zinc-700 space-y-1">
              <span className="font-bold text-white print:text-black text-sm block">Riferimenti Commerciali</span>
              <p>Email: {tenant?.notification_email || 'tecnico@novasolar.it'}</p>
              <p>Data Offerta: {new Date().toLocaleDateString()}</p>
            </div>
          </div>

          {/* Dettagli tecnici dell'offerta */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 print:grid-cols-5">
            <div className="bg-zinc-800 p-4 rounded-xl border border-zinc-750 print:bg-zinc-100 print:border-zinc-300">
              <span className="text-[10px] text-zinc-400 print:text-zinc-600 uppercase font-bold block">Superficie Misurata</span>
              <input type="number" value={areaSqm.toFixed(1)} onChange={(e) => setAreaSqm(parseFloat(e.target.value) || 0)} className="bg-transparent text-xl font-bold text-white print:text-black focus:outline-none border-b border-dashed border-zinc-700 w-full mt-1" />
              <span className="text-[9px] text-zinc-500 block mt-1">Spazio occupato sul tetto</span>
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
              <span className="text-[9px] text-zinc-500 block mt-1">Tecnologia Ioni di Litio</span>
            </div>
            <div className="bg-zinc-800 p-4 rounded-xl border border-zinc-750 print:bg-zinc-100 print:border-zinc-300">
              <span className="text-[10px] text-zinc-400 print:text-zinc-600 uppercase font-bold block">Risparmio Stimato</span>
              <input type="number" value={Math.round(annualSavings)} onChange={(e) => setAnnualSavings(parseInt(e.target.value) || 0)} className="bg-transparent text-xl font-bold text-emerald-400 print:text-emerald-700 focus:outline-none border-b border-dashed border-zinc-700 w-full mt-1" />
              <span className="text-[9px] text-zinc-500 block mt-1">Risparmio economico annuo</span>
            </div>
          </div>

          {/* Dettaglio descrittivo dei servizi inclusi */}
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

            {/* Specifica dei Costi Complessivi */}
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

          {/* Area di firma per accettazione */}
          <div className="hidden print:flex items-center justify-between pt-16 mt-8 border-t border-zinc-200">
            <div className="text-center w-64 border-b border-zinc-400 pb-2">
              <p className="text-[10px] text-zinc-500">Timbro e Firma per Conferma (Azienda)</p>
            </div>
            <div className="text-center w-64 border-b border-zinc-400 pb-2">
              <p className="text-[10px] text-zinc-500">Firma per Accettazione (Cliente)</p>
            </div>
          </div>

          {/* Pulsante di esportazione visibile solo a schermo */}
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
