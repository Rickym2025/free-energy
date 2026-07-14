"use client";

import React, { useEffect, useState } from 'react';
import { useTenant } from '@/app/context/TenantContext';
import MapPlanner from '@/components/MapPlanner';
import PlannerSidebar from '@/components/PlannerSidebar';
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
  lengths: number[];
  deletedPanels: string[]; // Memorizza gli ID dei moduli rimossi manualmente (ostacoli)
}

const getEnvVar = (value: string | undefined, fallback: string): string => {
  if (!value || value === "undefined" || value.trim() === "" || value === "null") return fallback;
  return value.replace(/^["']|["']$/g, '').trim();
};

const SUPABASE_URL = getEnvVar(process.env.NEXT_PUBLIC_SUPABASE_URL, "https://hmpxgbzykwwqgfzifdlc.supabase.co").replace(/\/$/, '');
const SUPABASE_ANON_KEY = getEnvVar(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmcHhnYnp5a3d3cWdmemlmZGxjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4MTA0NjAsImV4cCI6MjA5OTM4NjQ2MH0.eAq1O2IOiSRPYewnBTi9xuxeJlPxVa5OIW6f7qN9hIw");

export default function PvPlanner() {
  const { tenant, deductCredits } = useTenant();
  
  const brandColor = tenant?.brand_color_hex || '#0284c7';

  // Storico preventivi cloud
  const [savedReports, setSavedReports] = useState<any[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);

  const [address, setAddress] = useState('');
  const [loadingGeocode, setLoadingGeocode] = useState(false);
  const [isCalculated, setIsCalculated] = useState(false);

  const [savedRoofs, setSavedRoofs] = useState<SavedRoof[]>([]);
  const [currentPoints, setCurrentPoints] = useState<Coordinate[]>([]);
  const [panelRotation, setPanelRotation] = useState(0); 
  const [mapCenter, setMapCenter] = useState<Coordinate | null>(null);

  // Stato per identificare quale area salvata è correntemente selezionata per il trascinamento dei punti
  const [selectedRoofId, setSelectedRoofId] = useState<string | null>(null);

  // Parametri economici
  const [costPerPanel, setCostPerPanel] = useState(450); 
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

  useEffect(() => {
    if (tenant) {
      fetchSavedReports();
    }
  }, [tenant]);

  useEffect(() => {
    const pWidth = tenant?.panel_width_m || 1.65;
    const pHeight = tenant?.panel_height_m || 1.0;

    setSavedRoofs(prev => prev.map(roof => {
      const updatedCount = calculatePanelCount(roof.points, pWidth, pHeight, panelRotation) - (roof.deletedPanels?.length || 0);
      return { ...roof, panelCount: Math.max(0, updatedCount) };
    }));
  }, [panelRotation, tenant?.panel_width_m, tenant?.panel_height_m]);

  useEffect(() => {
    if (isCalculated) {
      setTimeout(() => {
        const targetElement = document.getElementById('report-output-section');
        if (targetElement) {
          targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 350); 
    }
  }, [isCalculated]);

  // Scarica l'elenco dei preventivi generati in precedenza da Supabase
  const fetchSavedReports = async () => {
    if (!tenant) return;
    setLoadingReports(true);
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/pv_reports?tenant_id=eq.${tenant.id}&order=created_at.desc`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      });
      if (response.ok) {
        setSavedReports(await response.json());
      }
    } catch (e) {
      console.error("Errore fetch preventivi salvati:", e);
    } finally {
      setLoadingReports(false);
    }
  };

  // Carica ed inserisce in tempo reale le geometrie delle falde salvate sulla mappa
  const handleLoadSavedReport = (report: any) => {
    handleResetPlanner();
    setAddress(report.address);
    
    let parsedRoofs: SavedRoof[] = [];
    if (typeof report.raw_geojson === 'string') {
      try {
        parsedRoofs = JSON.parse(report.raw_geojson);
      } catch (err) {}
    } else if (report.raw_geojson) {
      parsedRoofs = report.raw_geojson;
    }

    setSavedRoofs(parsedRoofs);
    
    // Configura parametri economici salvati
    setPeakPower(report.estimated_power_kwp || 0);
    setEstimatedCost(report.estimated_cost_euro || 0);
    setTotalAreaSqm(report.roof_area_sqm || report.total_area_sqm || 0);
    setAnnualProduction(report.annual_production_kwh || 0);
    setAnnualSavings(report.annual_savings_euro || 0);
    setMonthlyBill(String(report.monthly_bill_euro || 600));

    // Centra la mappa satellitare sulle coordinate della prima falda caricata
    if (parsedRoofs.length > 0 && parsedRoofs[0].points.length > 0) {
      setMapCenter(parsedRoofs[0].points[0]);
    }
    
    setIsCalculated(true); // Mostra direttamente l'anteprima economica modificabile
  };

  const handleMapClick = (point: Coordinate) => {
    if (isCalculated) return;
    setCurrentPoints(prev => [...prev, point]);
  };

  const handleMarkerDrag = (index: number, newCoord: Coordinate) => {
    setCurrentPoints(prev => prev.map((p, idx) => idx === index ? newCoord : p));
  };

  const handleSavedRoofMarkerDrag = (roofId: string, index: number, newCoord: Coordinate) => {
    const pWidth = tenant?.panel_width_m || 1.65;
    const pHeight = tenant?.panel_height_m || 1.0;

    setSavedRoofs(prev => prev.map(r => {
      if (r.id === roofId) {
        const nextPoints = r.points.map((p, idx) => idx === index ? newCoord : p);
        const area = calculateAreaInSqm(nextPoints);
        
        const lengths: number[] = [];
        for (let i = 0; i < nextPoints.length; i++) {
          const p1 = nextPoints[i];
          const p2 = nextPoints[(i + 1) % nextPoints.length];
          lengths.push(calculateDistanceMeters(p1, p2));
        }

        const panelCount = Math.max(0, calculatePanelCount(nextPoints, pWidth, pHeight, panelRotation) - (r.deletedPanels?.length || 0));

        return {
          ...r,
          points: nextPoints,
          area,
          lengths,
          panelCount
        };
      }
      return r;
    }));
  };

  const handleUndoLastPoint = () => {
    setCurrentPoints(prev => prev.slice(0, -1));
  };

  const clearMapPoints = () => {
    setCurrentPoints([]);
  };

  const handleSaveCurrentRoof = () => {
    if (currentPoints.length < 3) {
      alert("Definisci almeno 3 segnaposto sulla mappa prima di salvare.");
      return;
    }

    const area = calculateAreaInSqm(currentPoints);
    const roofId = `roof-${Date.now()}`;

    const pWidth = tenant?.panel_width_m || 1.65;
    const pHeight = tenant?.panel_height_m || 1.0;
    const panelCount = calculatePanelCount(currentPoints, pWidth, pHeight, panelRotation);

    const lengths: number[] = [];
    for (let i = 0; i < currentPoints.length; i++) {
      const p1 = currentPoints[i];
      const p2 = currentPoints[(i + 1) % currentPoints.length];
      lengths.push(calculateDistanceMeters(p1, p2));
    }

    const newRoof: SavedRoof = {
      id: roofId,
      name: `Area Tetto #${savedRoofs.length + 1}`,
      points: currentPoints,
      area,
      panelCount,
      lengths,
      deletedPanels: [] 
    };

    setSavedRoofs(prev => [...prev, newRoof]);
    clearMapPoints();
  };

  const handlePanelDeleted = (roofId: string, panelKey: string) => {
    setSavedRoofs(prev => prev.map(r => {
      if (r.id === roofId) {
        const nextDeleted = r.deletedPanels ? [...r.deletedPanels, panelKey] : [panelKey];
        return { 
          ...r, 
          deletedPanels: nextDeleted,
          panelCount: Math.max(0, r.panelCount - 1) 
        };
      }
      return r;
    }));
  };

  const handleDeleteRoof = (id: string) => {
    setSavedRoofs(prev => prev.filter(r => r.id !== id));
    if (selectedRoofId === id) setSelectedRoofId(null);
  };

  const handleRenameRoof = (id: string, newName: string) => {
    setSavedRoofs(prev => prev.map(r => {
      if (r.id === id) {
        return { ...r, name: newName };
      }
      return r;
    }));
  };

  const handleUpdateLength = (id: string, index: number, newVal: number) => {
    setSavedRoofs(prev => prev.map(r => {
      if (r.id === id) {
        const oldVal = r.lengths[index] || 1;
        const ratio = newVal / oldVal;
        const nextLengths = [...r.lengths];
        nextLengths[index] = newVal;

        return {
          ...r,
          lengths: nextLengths,
          area: Math.max(1, r.area * ratio),
          panelCount: Math.max(0, Math.round(r.panelCount * ratio))
        };
      }
      return r;
    }));
  };

  const handleGenerateReport = async () => {
    if (savedRoofs.length === 0) {
      alert("Traccia e conferma almeno un'area del tetto prima di procedere.");
      return;
    }

    const totalArea = savedRoofs.reduce((acc, r) => acc + r.area, 0);
    setTotalAreaSqm(totalArea);

    const totalActualPanels = savedRoofs.reduce((acc, r) => acc + r.panelCount, 0);
    const estimPeakPower = totalActualPanels * 0.430; 
    setPeakPower(estimPeakPower);

    let costTotal = (totalActualPanels * costPerPanel) + fixedCosts;
    if (includeStorage) {
      costTotal += (storageCapacity * costPerKwhStorage);
    }
    const finalCostCalculated = Math.round(costTotal);
    setEstimatedCost(finalCostCalculated);

    const success = await deductCredits(100, `Studio di Fattibilità Industriale (${savedRoofs.length} falde): ${address}`);
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
      await fetchSavedReports(); // Ricarica lo storico per mostrare il preventivo appena generato
    } catch (err) {
      console.warn("Calcolo locale di fallback energetico");
      const localProductionEstimate = estimPeakPower * 1350;
      setAnnualProduction(localProductionEstimate);
      setAnnualSavings(Math.min(parseFloat(monthlyBill) * 12 * 0.85, localProductionEstimate * 0.25));
      setIsCalculated(true);
      await fetchSavedReports();
    } finally {
      setLoadingGeocode(false);
    }
  };

  const handleResetPlanner = () => {
    clearMapPoints();
    setSavedRoofs([]);
    setIsCalculated(false);
    setSelectedRoofId(null);
    if (typeof window !== 'undefined' && (window as any).tempLengthMarkers) {
      (window as any).tempLengthMarkers.forEach((m: any) => m.remove());
      (window as any).tempLengthMarkers = [];
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
        handleResetPlanner();
        setMapCenter(newCoords);
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
      {/* Intestazione di Stampa */}
      <div className="hidden print:flex print:items-start print:justify-between print:border-b print:border-zinc-300 print:pb-6 print:mb-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-black uppercase tracking-tight">{tenant?.company_name || 'Solis Energy SRL'}</h2>
          <p className="text-xs text-zinc-600 font-medium">Offerta economica per impianto fotovoltaico con formula "chiavi in mano"</p>
          {address && <p className="text-xs text-zinc-500 font-semibold mt-1">📍 Sito: {address}</p>}
        </div>
        <div className="text-right text-xs text-zinc-700 space-y-1">
          <span className="font-bold text-black text-sm block">Riferimenti Commerciali</span>
          <p>Email: {tenant?.notification_email || 'tecnico@novasolar.it'}</p>
        </div>
      </div>

      <div className="print:hidden">
        <h1 className="text-3xl font-bold tracking-tight text-white">PV Planner Industriale</h1>
        <p className="text-zinc-400 mt-1">Traccia le falde dei capannoni. Regola l'angolo di rotazione e clicca su un pannello per rimuoverlo.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 print:block">
        <PlannerSidebar 
          address={address} setAddress={setAddress}
          panelRotation={panelRotation} setPanelRotation={setPanelRotation}
          currentPoints={currentPoints} savedRoofs={savedRoofs}
          selectedRoofId={selectedRoofId}
          costPerPanel={costPerPanel} setCostPerPanel={setCostPerPanel}
          fixedCosts={fixedCosts} setFixedCosts={setFixedCosts}
          includeStorage={includeStorage} setIncludeStorage={setIncludeStorage}
          storageCapacity={storageCapacity} setStorageCapacity={setStorageCapacity}
          costPerKwhStorage={costPerKwhStorage} setCostPerKwhStorage={setCostPerKwhStorage}
          monthlyBill={monthlyBill} setMonthlyBill={setMonthlyBill}
          onSearchSubmit={handleSearch} onUndoPoint={handleUndoLastPoint}
          onSaveRoof={handleSaveCurrentRoof} onDeleteRoof={handleDeleteRoof}
          onRenameRoof={handleRenameRoof} onUpdateLength={handleUpdateLength}
          onGenerateReport={handleGenerateReport}
          onResetPlanner={handleResetPlanner}
          onSelectRoof={setSelectedRoofId} 
        />

        <div className="lg:col-span-2 flex flex-col h-[520px] bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden relative print:block print:h-[350px] print:w-full print:mb-8 print:border print:border-zinc-300 print:rounded-2xl">
          <MapPlanner 
            brandColor={brandColor}
            panelWidth={tenant?.panel_width_m || 1.65}
            panelHeight={tenant?.panel_height_m || 1.0}
            panelRotation={panelRotation}
            currentPoints={currentPoints}
            savedRoofs={savedRoofs}
            mapCenter={mapCenter}
            selectedRoofId={selectedRoofId}
            onMapClick={handleMapClick}
            onPanelDeleted={handlePanelDeleted}
            onMarkerDrag={handleMarkerDrag}
            onSavedRoofMarkerDrag={handleSavedRoofMarkerDrag} 
          />
        </div>
      </div>

      {isCalculated && (
        <div id="report-output-section">
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
        </div>
      )}

      {/* ARCHIVIO PREVENTIVI SALVATI IN CLOUD (FASE 3) */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl print:hidden">
        <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-950/20">
          <h2 className="text-lg font-bold text-white">Archivio Preventivi in Cloud</h2>
          <span className="text-xs font-mono font-bold" style={{ color: brandColor }}>Storico Analisi</span>
        </div>

        {loadingReports ? (
          <div className="p-12 text-center text-zinc-500 text-sm">Lettura archivio in corso...</div>
        ) : savedReports.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 text-sm">Nessun preventivo registrato finora. Genera un preventivo sopra per salvarlo.</div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {savedReports.map((report) => (
              <div 
                key={report.id} 
                onClick={() => handleLoadSavedReport(report)}
                className="p-6 flex flex-col md:flex-row md:items-center justify-between hover:bg-zinc-850/50 cursor-pointer transition duration-150 gap-4"
              >
                <div className="space-y-1">
                  <h3 className="font-bold text-white">{report.project_name || "Analisi Satellitare"}</h3>
                  <p className="text-xs text-zinc-400">📍 Sito: {report.address} &bull; Creato il: {new Date(report.created_at).toLocaleDateString('it-IT')}</p>
                </div>
                <div className="flex items-center space-x-6 justify-between md:justify-end shrink-0">
                  <div className="text-right">
                    <span className="text-sm font-bold text-emerald-400 block" style={{ color: brandColor }}>
                      {report.estimated_power_kwp ? `${report.estimated_power_kwp.toFixed(2)} kWp` : "- kWp"}
                    </span>
                    <span className="text-[10px] text-zinc-500 block">Potenza Stimata</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-white block">
                      {report.estimated_cost_euro ? `€ ${report.estimated_cost_euro.toLocaleString()}` : "Da calcolare"}
                    </span>
                    <span className="text-[10px] text-zinc-500 block">Prezzo Totale</span>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleLoadSavedReport(report); }}
                    className="text-xs bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-350 font-semibold px-4 py-2 rounded-xl transition"
                  >
                    📂 Riprendi e Modifica
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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

function calculateDistanceMeters(p1: Coordinate, p2: Coordinate): number {
  const rad = Math.PI / 180;
  const latMid = p1.lat * rad;
  const dx = (p2.lng - p1.lng) * 111320 * Math.cos(latMid);
  const dy = (p2.lat - p1.lat) * 110540;
  return Math.sqrt(dx * dx + dy * dy);
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
