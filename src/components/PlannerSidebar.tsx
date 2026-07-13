"use client";

import React from 'react';

interface Coordinate {
  lat: number;
  lng: number;
}

interface SavedRoof {
  id: string;
  name: string;
  area: number;
  panelCount: number;
  lengths: number[]; // Array di segmenti modificabili
}

interface PlannerSidebarProps {
  address: string;
  setAddress: (val: string) => void;
  panelRotation: number;
  setPanelRotation: (val: number) => void;
  currentPoints: Coordinate[];
  savedRoofs: SavedRoof[];
  costPerPanel: number;
  setCostPerPanel: (val: number) => void;
  fixedCosts: number;
  setFixedCosts: (val: number) => void;
  includeStorage: boolean;
  setIncludeStorage: (val: boolean) => void;
  storageCapacity: number;
  setStorageCapacity: (val: number) => void;
  costPerKwhStorage: number;
  setCostPerKwhStorage: (val: number) => void;
  monthlyBill: string;
  setMonthlyBill: (val: string) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
  onUndoPoint: () => void;
  onSaveRoof: () => void;
  onRenameRoof: (id: string, name: string) => void;
  onDeleteRoof: (id: string) => void;
  onUpdateLength: (id: string, index: number, newVal: number) => void; // Nuova prop per aggiornare i lati
  onGenerateReport: () => void;
  onResetPlanner: () => void;
}

export default function PlannerSidebar({
  address,
  setAddress,
  panelRotation,
  setPanelRotation,
  currentPoints,
  savedRoofs,
  costPerPanel,
  setCostPerPanel,
  fixedCosts,
  setFixedCosts,
  includeStorage,
  setIncludeStorage,
  storageCapacity,
  setStorageCapacity,
  costPerKwhStorage,
  setCostPerKwhStorage,
  monthlyBill,
  setMonthlyBill,
  onSearchSubmit,
  onUndoPoint,
  onSaveRoof,
  onRenameRoof,
  onDeleteRoof,
  onUpdateLength,
  onGenerateReport,
  onResetPlanner
}: PlannerSidebarProps) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl h-fit space-y-6 print:hidden">
      
      {/* 1. Trova Area Impianto */}
      <form onSubmit={onSearchSubmit} className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5 font-sans">
            🗺️ Trova area impianto
          </label>
          <span className="group relative inline-block cursor-help text-zinc-500 hover:text-emerald-400">
            ℹ️
            <span className="pointer-events-none absolute bottom-full right-0 z-50 mb-2 w-48 rounded-lg bg-zinc-950 border border-zinc-850 p-3 text-center text-xs text-zinc-200 shadow-2xl invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-200 whitespace-normal font-normal">
              Digita l'indirizzo dell'edificio per centrare il satellite e trovare l'area esatta di installazione.
            </span>
          </span>
        </div>
        <div className="flex gap-2">
          <input type="text" placeholder="Es: Via Casilina Sud, Ferentino" value={address} onChange={(e) => setAddress(e.target.value)} className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-xs text-white placeholder-zinc-500 focus:outline-none" />
          <button type="submit" className="bg-zinc-800 border border-zinc-700 px-4 rounded-xl text-white transition">🔍</button>
        </div>
      </form>

      {/* 2. Rotazione Pannelli */}
      <div className="p-4 rounded-xl border border-zinc-750 space-y-2" style={{ backgroundColor: '#27272a' }}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-white flex items-center gap-1.5 font-sans">🔄 Rotazione Pannelli</span>
          <span className="group relative inline-block cursor-help text-zinc-500 hover:text-emerald-400">
            ℹ️
            <span className="pointer-events-none absolute bottom-full right-0 z-50 mb-2 w-48 rounded-lg bg-zinc-950 border border-zinc-850 p-3 text-center text-xs text-zinc-200 shadow-2xl invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-200 whitespace-normal font-normal">
              Trascina lo slider per allineare geometricamente la griglia dei moduli alla grondaia o alle linee del tetto.
            </span>
          </span>
        </div>
        <input type="range" min="0" max="360" value={panelRotation} onChange={(e) => setPanelRotation(parseInt(e.target.value))} className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
      </div>

      {/* 3. Tracciamento Corrente */}
      {currentPoints.length > 0 && (
        <div className="bg-zinc-800 p-4 rounded-xl border border-zinc-700 space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-white flex items-center gap-1.5 font-sans">📐 Tracciamento Corrente</span>
            <span className="group relative inline-block cursor-help text-zinc-500 hover:text-emerald-400">
              ℹ️
              <span className="pointer-events-none absolute bottom-full right-0 z-50 mb-2 w-48 rounded-lg bg-zinc-950 border border-zinc-850 p-3 text-center text-xs text-zinc-200 shadow-2xl invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-200 whitespace-normal font-normal">
                Visualizza i segnaposto temporanei. Fai clic su 'Salva' per congelare l'area e generare i pannelli cliccabili.
              </span>
            </span>
          </div>
          <p className="text-[11px] text-zinc-400">Segnaposto inseriti: <strong className="text-emerald-400">{currentPoints.length}</strong></p>
          <div className="flex gap-2">
            <button onClick={onUndoPoint} className="flex-1 py-2 bg-zinc-700 text-white text-xs font-bold rounded-lg">Annulla Punto</button>
            <button onClick={onSaveRoof} className="flex-1 py-2 bg-emerald-500 text-zinc-950 font-bold text-xs rounded-lg">Salva Falda</button>
          </div>
        </div>
      )}

      {/* 4. Aree Tetto Tracciate (Editabili in tempo reale) */}
      {savedRoofs.length > 0 && (
        <div className="space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 font-sans">🏢 Aree Tetto Tracciate</span>
            <span className="group relative inline-block cursor-help text-zinc-500 hover:text-emerald-400">
              ℹ️
              <span className="pointer-events-none absolute bottom-full right-0 z-50 mb-2 w-48 rounded-lg bg-zinc-950 border border-zinc-850 p-3 text-center text-xs text-zinc-200 shadow-2xl invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-200 whitespace-normal font-normal">
                Lista dei tetti salvati. Puoi rinominarli ed anche **modificare i singoli lati in metri** se il rilievo satellitare presenta lievi sfasature!
              </span>
            </span>
          </div>
          <div className="space-y-3 max-h-64 overflow-y-auto no-scrollbar">
            {savedRoofs.map((roof) => (
              <div key={roof.id} className="bg-zinc-800 p-4 rounded-xl border border-zinc-700 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <input type="text" value={roof.name} onChange={(e) => onRenameRoof(roof.id, e.target.value)} className="bg-transparent font-bold text-xs text-white border-b border-zinc-700 focus:outline-none flex-1 py-0.5" />
                  <div className="text-right shrink-0">
                    <span className="text-xs text-zinc-300 block font-semibold">{Math.round(roof.area)} mq</span>
                    <span className="text-[10px] text-emerald-400 block">{roof.panelCount} Moduli</span>
                  </div>
                  <button onClick={() => onDeleteRoof(roof.id)} className="text-red-400 text-xs px-1">🗑️</button>
                </div>

                {/* VISUALIZZAZIONE E MODIFICA DEI SINGOLI LATI IN METRI */}
                {roof.lengths && roof.lengths.length > 0 && (
                  <div className="pt-2 border-t border-zinc-750 space-y-1.5">
                    <span className="text-[10px] text-zinc-400 font-bold block uppercase tracking-wide">📐 Modifica Lati (Metri):</span>
                    <div className="flex flex-wrap gap-1.5">
                      {roof.lengths.map((len, idx) => (
                        <div key={idx} className="flex items-center space-x-1 bg-zinc-850 p-1.5 rounded-lg border border-zinc-700">
                          <span className="text-[9px] text-zinc-500 font-bold font-mono">L{idx+1}:</span>
                          <input 
                            type="number" 
                            step="0.1"
                            value={Number(len.toFixed(1))}
                            onChange={(e) => onUpdateLength(roof.id, idx, parseFloat(e.target.value) || 0)}
                            className="w-10 bg-transparent text-[11px] font-bold text-white focus:outline-none" 
                          />
                          <span className="text-[9px] text-zinc-400">m</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Preventivo Costi */}
      <div className="border-t border-zinc-800 pt-4 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-white flex items-center gap-1.5 font-sans">💶 Preventivo costi impianto</span>
          <span className="group relative inline-block cursor-help text-zinc-500 hover:text-emerald-400">
            ℹ️
            <span className="pointer-events-none absolute bottom-full right-0 z-50 mb-2 w-48 rounded-lg bg-zinc-950 border border-zinc-850 p-3 text-center text-xs text-zinc-200 shadow-2xl invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-200 whitespace-normal font-normal">
              Imposta il costo a singolo modulo reale e le pratiche di allacciamento Enel per compilare i prezzi in automatico.
            </span>
          </span>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-zinc-500 font-semibold block uppercase">Costo Singolo Pannello (€)</label>
              <input type="number" value={costPerPanel} onChange={(e) => setCostPerPanel(parseInt(e.target.value) || 0)} className="w-full bg-zinc-800 border border-zinc-700 text-xs text-white p-2.5 rounded-lg mt-1 focus:outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-zinc-500 font-semibold block uppercase">Progetto & Fissi (€)</label>
              <input type="number" value={fixedCosts} onChange={(e) => setFixedCosts(parseInt(e.target.value) || 0)} className="w-full bg-zinc-800 border border-zinc-700 text-xs text-white p-2.5 rounded-lg mt-1 focus:outline-none" />
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

      {/* 6. Bolletta Presunta */}
      <div className="space-y-2 border-t border-zinc-800 pt-4">
        <div className="flex items-center justify-between">
          <label className="text-sm font-bold text-white flex items-center gap-1.5 font-sans">⚡ Bolletta Presunta</label>
          <span className="group relative inline-block cursor-help text-zinc-500 hover:text-emerald-400">
            ℹ️
            <span className="pointer-events-none absolute bottom-full right-0 z-50 mb-2 w-48 rounded-lg bg-zinc-950 border border-zinc-850 p-3 text-center text-xs text-zinc-200 shadow-2xl invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-200 whitespace-normal font-normal">
              La spesa elettrica presunta o reale mensile del capannone per ricalcolare l'ammortamento dell'investimento.
            </span>
          </span>
        </div>
        <input type="number" value={monthlyBill} onChange={(e) => setMonthlyBill(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none" />
      </div>

      <div className="flex flex-col gap-2 pt-2 border-t border-zinc-800">
        <button onClick={onGenerateReport} className="w-full py-4 bg-emerald-500 text-zinc-950 font-bold rounded-xl text-sm transition">
          🚀 Genera Preventivo Totale (150 crediti)
        </button>
        <button onClick={onResetPlanner} className="w-full py-2 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded-xl text-xs transition">
          Reset Progetto
            </button>
          </div>
    </div>
  );
}
