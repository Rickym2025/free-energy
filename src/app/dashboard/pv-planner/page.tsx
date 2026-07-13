"use client";

import React, { useEffect, useState } from 'react';
import { useTenant } from '@/app/context/TenantContext';
import MapPlanner from '@/components/MapPlanner';
import ReportPreview from '@/components/ReportPreview';

interface Coordinate {
  lat: number;
  lng: number;
}

interface SavedRoof {
  id: string;
  name: string;
  points: Coordinate[];
  area: number;
  panelCount: number;
}

export default function PvPlanner() {
  const { tenant, deductCredits } = useTenant();
  
  const brandColor = tenant?.brand_color_hex || '#0284c7';

  const [address, setAddress] = useState('');
  const [loadingGeocode, setLoadingGeocode] = useState(false);
  const [isCalculated, setIsCalculated] = useState(false);

  const [savedRoofs, setSavedRoofs] = useState<SavedRoof[]>([]);
  const [currentPoints, setCurrentPoints] = useState<Coordinate[]>([]);
  const [panelRotation, setPanelRotation] = useState(0); 

  // Configurazione dei parametri economici
  const [costPerKwp, setCostPerKwp] = useState(1300);
  const [fixedCosts, setFixedCosts] = useState(1500);
  const [includeStorage, setIncludeStorage] = useState(false);
  const [storageCapacity, setStorageCapacity] = useState(15);
  const [costPerKwhStorage, setCostPerKwhStorage] = useState(600);

  // Dati di output aggregati
  const [totalAreaSqm, setTotalAreaSqm] = useState(0);
  const [peakPower, setPeakPower] = useState(0);
  const [annualProduction, setAnnualProduction] = useState(0);
  const [annualSavings, setAnnualSavings] = useState(0);
  const [estimatedCost, setEstimatedCost] = useState(0);
  const [monthlyBill, setMonthlyBill] = useState('600');

  // Ricalcola istantaneamente i pannelli di tutte le aree ad ogni scatto dello slider
  useEffect(() => {
    const pWidth = tenant?.panel_width_m || 1.65;
    const pHeight = tenant?.panel_height_m || 1.0;

    setSavedRoofs(prev => prev.map(roof => {
      const updatedCount = calculatePanelCount(roof.points, pWidth, pHeight, panelRotation);
      return {
        ...roof,
        panelCount: updatedCount
      };
    }));
  }, [panelRotation, tenant?.panel_width_m, tenant?.panel_height_m]);

  const handleMapClick = (point: Coordinate) => {
    if (isCalculated) return;
    setCurrentPoints(prev => [...prev, point]);
  };

  const handleUndoLastPoint = () => {
    setCurrentPoints(prev => prev.slice(0, -1));
  };

  const clearMapPoints = () => {
    setCurrentPoints([]);
  };

  const handleSaveCurrentRoof = () => {
    if (currentPoints.length < 3) {
      alert("Definisci almeno 3 segnaposto sulla mappa satellitare prima di salvare l'area.");
      return;
    }

    const area = calculateAreaInSqm(currentPoints);
    const roofId = `roof-${Date.now()}`;

    const pWidth = tenant?.panel_width_m || 1.65;
    const pHeight = tenant?.panel_height_m || 1.0;
    const panelCount = calculatePanelCount(currentPoints, pWidth, pHeight, panelRotation);

    const newRoof: SavedRoof = {
      id: roofId,
      name: `Area Tetto #${savedRoofs.length + 1}`,
      points: currentPoints,
      area,
      panelCount
    };

    setSavedRoofs(prev => [...prev, newRoof]);
    clearMapPoints();
  };

  const handlePanelDeleted = (roofId: string) => {
    setSavedRoofs(prev => prev.map(r => {
      if (r.id === roofId) {
        return { ...r, panelCount: Math.max(0, r.panelCount - 1) };
      }
      return r;
    }));
  };

  const handleDeleteRoof = (id: string) => {
    setSavedRoofs(prev => prev.filter(r => r.id !== id));
  };

  const handleRenameRoof = (id: string, newName: string) => {
    setSavedRoofs(prev => prev.map(r => r.id === id ? { ...r, name: newName } : r));
  };

  const handleGenerateReport = async () => {
    if (savedRoofs.length === 0) {
      alert("Traccia e conferma almeno un'area del tetto prima di procedere.");
      return;
    }

    // 1. Calcolo geometrico e accorpamento dati di tetti e moduli reali (Eseguito subito prima delle chiamate di rete)
    const totalArea = savedRoofs.reduce((acc, r) => acc + r.area, 0);
    setTotalAreaSqm(totalArea);

    const totalActualPanels = savedRoofs.reduce((acc, r) => acc + r.panelCount, 0);
    const estimPeakPower = totalActualPanels * 0.430; 
    setPeakPower(estimPeakPower);

    // Calcolo preventivo finanziario esatto dell'installatore
    let costTotal = (estimPeakPower * costPerKwp) + fixedCosts;
    if (includeStorage) {
      costTotal += (storageCapacity * costPerKwhStorage);
    }
    const finalCostCalculated = Math.round(costTotal);
    setEstimatedCost(finalCostCalculated);

    const success = await deductCredits(150, `Studio di Fattibilità Industriale (${savedRoofs.length} falde): ${address}`);
    if (!success) return;

    setLoadingGeocode(true);
    try {
      const pvgisUrl = `https://re.jrc.ec.europa.eu/api/v5_2/PVcalc?lat=${savedRoofs[0].points[0].lat}&lon=${savedRoofs[0].points[0].lng}&peakpower=${estimPeakPower.toFixed(2)}&loss=14&outputformat=json`;
      const response = await fetch(pvgisUrl);
      const data = await response.json();
      const productionVal = data.outputs?.totals?.fixed?.E_y || (estimPeakPower * 1350);
      setAnnualProduction(productionVal);
      setAnnualSavings(Math.min(parseFloat(monthlyBill) * 12 * 0.85, productionVal * 0.25));
      setIsCalculated(true);
    } catch (err) {
      // Fallback in caso di blocco CORS di PVGIS: i calcoli monetari rimangono corretti
      console.warn("Calcolo locale di fallback energetico");
      const localProductionEstimate = estimPeakPower * 1350;
      setAnnualProduction(localProductionEstimate);
      setAnnualSavings(Math.min(parseFloat(monthlyBill) * 12 * 0.85, localProductionEstimate * 0.25));
      setIsCalculated(true);
    } finally {
      setLoadingGeocode(false);
    }
  };

  const handleResetPlanner = () => {
    clearMapPoints();
    setSavedRoofs([]);
    setIsCalculated(false);
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
        const L = (window as any).L;
        const map = (window as any).mapRef?.current; 
        if (map) {
          map.setView([newCoords.lat, newCoords.lng], 19);
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

  return (
    <div className="space-y-8">
      <div className="print:hidden">
        <h1 className="text-3xl font-bold tracking-tight text-white">PV Planner Industriale</h1>
        <p className="text-zinc-400 mt-1">Traccia le falde dei capannoni. Regola l'angolo di rotazione e clicca su un pannello per rimuoverlo.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 print:hidden">
        
        {/* Barra di comando */}
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl h-fit space-y-6">
          <form onSubmit={handleSearch} className="space-y-2">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Disegna impianto</label>
            <div className="flex gap-2">
              <input type="text" placeholder="Es: Zona Industriale, Frosinone" value={address} onChange={(e) => setAddress(e.target.value)} className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none" />
              <button type="submit" className="bg-zinc-800 border border-zinc-700 px-4 rounded-xl text-white transition">🔍</button>
            </div>
          </form>

          {/* Slider di rotazione manuale */}
          <div className="p-4 rounded-xl border border-zinc-700 space-y-2" style={{ backgroundColor: '#27272a' }}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">Rotazione Pannelli CAD</span>
              <span className="text-xs text-emerald-400 font-bold">{panelRotation}°</span>
            </div>
            <input type="range" min="0" max="360" value={panelRotation} onChange={(e) => setPanelRotation(parseInt(e.target.value))} className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
            <span className="text-[10px] text-zinc-500 block">Trascina per allineare perfettamente i pannelli alla grondaia.</span>
          </div>

          {currentPoints.length > 0 && (
            <div className="bg-zinc-800 p-4 rounded-xl border border-zinc-700 space-y-3">
              <span className="text-xs font-bold text-white block">Tracciamento Falda Corrente</span>
              <div className="flex gap-2">
                <button onClick={handleUndoLastPoint} className="flex-1 py-2 bg-zinc-700 text-white text-xs font-bold rounded-lg">Annulla Punto</button>
                <button onClick={handleSaveCurrentRoof} className="flex-1 py-2 bg-emerald-500 text-zinc-950 font-bold text-xs rounded-lg">Salva Falda</button>
              </div>
            </div>
          )}

          {savedRoofs.length > 0 && (
            <div className="space-y-3">
              <span className="text-xs font-bold text-zinc-400 uppercase block">Aree Capannone</span>
              <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar">
                {savedRoofs.map((roof) => (
                  <div key={roof.id} className="bg-zinc-800 p-3 rounded-xl border border-zinc-700 flex items-center justify-between gap-3">
                    <input type="text" value={roof.name} onChange={(e) => handleRenameRoof(roof.id, e.target.value)} className="bg-transparent font-bold text-xs text-white border-b border-zinc-700 focus:outline-none flex-1" />
                    <div className="text-right shrink-0">
                      <span className="text-xs text-zinc-300 block font-semibold">{Math.round(roof.area)} mq</span>
                      <span className="text-[10px] text-emerald-400 block">{roof.panelCount} Moduli</span>
                    </div>
                    <button onClick={() => handleDeleteRoof(roof.id)} className="text-red-400 text-xs">🗑️</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Parametri Economici */}
          <div className="border-t border-zinc-800 pt-4 space-y-4">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Preventivo costi impianto</span>
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
                      <input type="number" value={storageCapacity} onChange={(e) => setStorageCapacity(parseInt(e.target.value) || 0)} className="w-full bg-zinc-750 border border-zinc-650 text-xs text-white p-2 rounded-lg mt-1" />
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-500 font-semibold block uppercase">Costo/kWh (€)</label>
                      <input type="number" value={costPerKwhStorage} onChange={(e) => setCostPerKwhStorage(parseInt(e.target.value) || 0)} className="w-full bg-zinc-750 border border-zinc-650 text-xs text-white p-2 rounded-lg mt-1" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2 border-t border-zinc-800 pt-4">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Bolletta Elettrica Presunta (€/Mese)</label>
            <input type="number" value={monthlyBill} onChange={(e) => setMonthlyBill(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none" />
          </div>

          <div className="flex flex-col gap-2 pt-2 border-t border-zinc-800">
            <button onClick={handleGenerateReport} className="w-full py-4 bg-emerald-500 text-zinc-950 font-bold rounded-xl text-sm transition">
              🚀 Genera Preventivo Totale
            </button>
            <button onClick={handleResetPlanner} className="w-full py-2 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded-xl text-xs transition">
              Reset Progetto
            </button>
          </div>
        </div>

        {/* Contenitore Mappa */}
        <div className="lg:col-span-2 flex flex-col h-[520px] bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden relative">
          <MapPlanner 
            brandColor={brandColor}
            panelWidth={tenant?.panel_width_m || 1.65}
            panelHeight={tenant?.panel_height_m || 1.0}
            panelRotation={panelRotation}
            currentPoints={currentPoints}
            savedRoofs={savedRoofs}
            onMapClick={handleMapClick}
            onPanelDeleted={handlePanelDeleted}
          />
        </div>
      </div>

      {isCalculated && (
        <ReportPreview 
          tenant={tenant}
          address={address}
          savedRoofs={savedRoofs}
          totalArea={totalAreaSqm}
          initialPower={peakPower}
          initialProduction={annualProduction}
          initialSavings={annualSavings}
          initialCost={estimatedCost}
        />
      )}
    </div>
  );
}

// Spostati all'esterno del componente per risolvere l'hoisting
function calculateAreaInSqm(points: Coordinate[]) {
  if (points.length < 3) return 0;
  const latMid = points[0].lat * Math.PI / 180;
  const meters = points.map(p => ({ x: p.lng * 111320 * Math.cos(latMid), y: p.lat * 110540 }));
  let area = 0;
  for (let i = 0; i < meters.length; i++) {
    const j = (i + 1) % meters.length;
    area += meters[i].x * meters[j].y - meters[j].x * meters[i].y;
  }
  return Math.abs(area / 2);
}

function calculatePanelCount(points: Coordinate[], panelWidth: number, panelHeight: number, rotation: number): number {
  if (points.length < 3) return 0;

  const latMid = points[0].lat * Math.PI / 180;
  const project = (p: Coordinate) => ({ x: p.lng * 111320 * Math.cos(latMid), y: p.lat * 110540 });

  const m0 = project(points[0]);
  const m1 = project(points[1]);
  const angleRad = (rotation * Math.PI) / 180;

  const rotate = (p: { x: number; y: number }, rad: number) => ({
    x: p.x * Math.cos(rad) - p.y * Math.sin(rad),
    y: p.x * Math.sin(rad) + p.y * Math.cos(rad)
  });

  const localVertices = points.map(p => {
    const proj = project(p);
    return rotate({ x: proj.x - m0.x, y: proj.y - m0.y }, -angleRad);
  });

  const xs = localVertices.map(v => v.x);
  const ys = localVertices.map(v => v.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);

  let count = 0;

  for (let lx = minX; lx < maxX; lx += panelWidth) {
    for (let ly = minY; ly < maxY; ly += panelHeight) {
      const c1 = { x: lx + panelWidth * 0.05, y: ly + panelHeight * 0.05 };
      const c2 = { x: lx + panelWidth * 0.95, y: ly + panelHeight * 0.05 };
      const c3 = { x: lx + panelWidth * 0.95, y: ly + panelHeight * 0.95 };
      const c4 = { x: lx + panelWidth * 0.05, y: ly + panelHeight * 0.95 };

      if (
        isPointInPolygonLocal(c1, localVertices) &&
        isPointInPolygonLocal(c2, localVertices) &&
        isPointInPolygonLocal(c3, localVertices) &&
        isPointInPolygonLocal(c4, localVertices)
      ) {
        count++;
      }
    }
  }
  return count;
}

function isPointInPolygonLocal(point: { x: number; y: number }, polygon: { x: number; y: number }[]) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    const intersect = ((yi > point.y) !== (yj > point.y)) && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}
