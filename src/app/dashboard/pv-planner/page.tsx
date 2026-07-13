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
  const [mapCenter, setMapCenter] = useState<Coordinate | null>(null);

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
    const pWidth = tenant?.panel_width_m || 1.65;
    const pHeight = tenant?.panel_height_m || 1.0;

    setSavedRoofs(prev => prev.map(roof => {
      const updatedCount = calculatePanelCount(roof.points, pWidth, pHeight, panelRotation);
      return { ...roof, panelCount: updatedCount };
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

  const handleMapClick = (point: Coordinate) => {
    if (isCalculated) return;
    setCurrentPoints(prev => [...prev, point]);
  };

  // Aggiorna lo stato dei punti quando un pin viene trascinato sulla mappa satellitare
  const handleMarkerDrag = (index: number, newCoord: Coordinate) => {
    setCurrentPoints(prev => prev.map((p, idx) => idx === index ? newCoord : p));
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
      lengths
    };

    setSavedRoofs(prev => [...prev, newRoof]);
    clearMapPoints();
  };

  const handlePanelDeleted = (roofId: string) => {
    setSavedRoofs(prev => prev.map(r => r.id === roofId ? { ...r, panelCount: Math.max(0, r.panelCount - 1) } : r));
  };

  const handleDeleteRoof = (id: string) => {
    setSavedRoofs(prev => prev.filter(r => r.id !== id));
  };

  const handleRenameRoof = (id: string, newName: string) => {
    setSavedRoofs(prev => prev.map(r => r.id === id ? { ...r, name: newName } : r));
  };

  // AGGIORNATO: Proporzionalità geometrica che allinea mq e numero di moduli modificando i lati
  const handleUpdateLength = (id: string, index: number, newVal: number) => {
    setSavedRoofs(prev => prev.map(r => {
      if (r.id === id) {
        const oldVal = r.lengths[index] || 1;
        const ratio = newVal / oldVal; // Fattore di scala proporzionale
        const nextLengths = [...r.lengths];
        nextLengths[index] = newVal;

        return {
          ...r,
          lengths: nextLengths,
          area: Math.max(1, r.area * ratio),
          panelCount: Math.max(0, Math.round(r.panelCount * ratio)) // Ricalcola i moduli attivi
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
            onMapClick={handleMapClick}
            onPanelDeleted={handlePanelDeleted}
            onMarkerDrag={handleMarkerDrag} // Passaggio del callback per i pin trascinabili
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
