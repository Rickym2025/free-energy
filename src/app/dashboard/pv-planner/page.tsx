"use client";

import React, { useState } from 'react';
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
  const [address, setAddress] = useState('');
  const [loadingGeocode, setLoadingGeocode] = useState(false);
  const [isCalculated, setIsCalculated] = useState(false);

  const [savedRoofs, setSavedRoofs] = useState<SavedRoof[]>([]);
  const [currentPoints, setCurrentPoints] = useState<Coordinate[]>([]);
  const [panelRotation, setPanelRotation] = useState(0); // Slider 0-360 gradi

  // Configurazione dei parametri economici
  const [costPerKwp, setCostPerKwp] = useState(1300);
  const [fixedCosts, setFixedCosts] = useState(1500);
  const [includeStorage, setIncludeStorage] = useState(false);
  const [storageCapacity, setStorageCapacity] = useState(15);
  const [costPerKwhStorage, setCostPerKwhStorage] = useState(600);

  // Output preventivatore
  const [totalAreaSqm, setTotalAreaSqm] = useState(0);
  const [peakPower, setPeakPower] = useState(0);
  const [annualProduction, setAnnualProduction] = useState(0);
  const [annualSavings, setAnnualSavings] = useState(0);
  const [estimatedCost, setEstimatedCost] = useState(0);
  const [monthlyBill, setMonthlyBill] = useState('600');

  const handleMapClick = (point: Coordinate) => {
    if (isCalculated) return;
    setCurrentPoints(prev => [...prev, point]);
  };

  const handleUndoLastPoint = () => {
    setCurrentPoints(prev => prev.slice(0, -1));
  };

  const handleSaveCurrentRoof = () => {
    if (currentPoints.length < 3) {
      alert("Definisci almeno 3 segnaposto sulla mappa satellitare prima di salvare l'area.");
      return;
    }
    const area = calculateAreaInSqm(currentPoints);
    
    // Stima iniziale del numero di pannelli inseriti
    const panelWidth = tenant?.panel_width_m || 1.65;
    const panelHeight = tenant?.panel_height_m || 1.0;
    const initialPanelCount = Math.floor((area * 0.8) / (panelWidth * panelHeight)); // Stima prudenziale

    const newRoof: SavedRoof = {
      id: `roof-${Date.now()}`,
      name: `Area Tetto #${savedRoofs.length + 1}`,
      points: currentPoints,
      area,
      panelCount: initialPanelCount
    };

    setSavedRoofs(prev => [...prev, newRoof]);
    setCurrentPoints([]);
  };

  // Callback attivata quando l'utente fa clic su un pannello per eliminarlo (es. lucernari)
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
      alert("Traccia e conferma almeno un'area del tetto.");
      return;
    }

    const totalArea = savedRoofs.reduce((acc, r) => acc + r.area, 0);
    setTotalAreaSqm(totalArea);

    const totalActualPanels = savedRoofs.reduce((acc, r) => acc + r.panelCount, 0);
    const estimPeakPower = totalActualPanels * 0.430; // 430W a modulo reale
    setPeakPower(estimPeakPower);

    const success = await deductCredits(150, `Studio di Fattibilità Industriale: ${address}`);
    if (!success) return;

    setLoadingGeocode(true);
    try {
      const pvgisUrl = `https://re.jrc.ec.europa.eu/api/v5_2/PVcalc?lat=${savedRoofs[0].points[0].lat}&lon=${savedRoofs[0].points[0].lng}&peakpower=${estimPeakPower.toFixed(2)}&loss=14&outputformat=json`;
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
      setIsCalculated(true);
    } finally {
      setLoadingGeocode(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="print:hidden">
        <h1 className="text-3xl font-bold tracking-tight text-white">PV Planner Industriale</h1>
        <p className="text-zinc-400 mt-1">Traccia le falde del capannone. Regola l'angolo di rotazione e clicca su un pannello per rimuoverlo.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 print:hidden">
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl h-fit space-y-6">
          <form onSubmit={(e) => e.preventDefault()} className="space-y-2">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Punta il Capannone</label>
            <input type="text" placeholder="Cerca capannone..." value={address} onChange={(e) => setAddress(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none" />
          </form>

          {/* Slider di rotazione manuale e precisissimo */}
          <div className="bg-zinc-800 p-4 rounded-xl border border-zinc-700 space-y-2">
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

          <div className="border-t border-zinc-800 pt-4 space-y-4">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Listino Tariffe</span>
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
          </div>

          <button onClick={handleGenerateReport} className="w-full py-4 bg-emerald-500 text-zinc-950 font-bold rounded-xl text-sm transition">
            🚀 Genera Preventivo Totale
          </button>
        </div>

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
