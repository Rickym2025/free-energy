"use client";

import React, { useState, useEffect } from 'react';

interface SavedRoof {
  id: string;
  name: string;
  area: number;
  panelCount: number;
}

interface ReportPreviewProps {
  tenant: any;
  address: string;
  savedRoofs: SavedRoof[];
  totalArea: number;
  initialPower: number;
  initialProduction: number;
  initialSavings: number;
  initialCost: number;
}

export default function ReportPreview({
  tenant,
  address,
  savedRoofs,
  totalArea,
  initialPower,
  initialProduction,
  initialSavings,
  initialCost
}: ReportPreviewProps) {
  const [areaSqm, setAreaSqm] = useState(totalArea);
  const [peakPower, setPeakPower] = useState(initialPower);
  const [annualProduction, setAnnualProduction] = useState(initialProduction);
  const [annualSavings, setAnnualSavings] = useState(initialSavings);
  const [estimatedCost, setEstimatedCost] = useState(initialCost);

  useEffect(() => {
    setAreaSqm(totalArea);
    setPeakPower(initialPower);
    setAnnualProduction(initialProduction);
    setAnnualSavings(initialSavings);
    setEstimatedCost(initialCost);
  }, [totalArea, initialPower, initialProduction, initialSavings, initialCost]);

  // Conteggio totale dei pannelli effettivamente sopravvissuti (non cancellati dall'utente)
  const totalPanels = savedRoofs.reduce((acc, r) => acc + r.panelCount, 0);
  const brandColor = tenant?.brand_color_hex || '#0284c7';

  return (
    <div className="bg-zinc-900 border-2 border-emerald-500/30 p-8 rounded-3xl space-y-8 print:bg-white print:text-black print:border-0 print:p-0 animate-fadeIn">
      
      {/* Intestazione Commerciale con i dati dell'Installatore (White-Label) */}
      <div className="flex items-start justify-between border-b border-zinc-800 pb-6 print:border-zinc-300">
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-white print:text-black uppercase tracking-tight">{tenant?.company_name || 'Solis Energy SRL'}</h2>
          <p className="text-xs text-zinc-400 print:text-zinc-600 font-medium">Offerta economica per impianto fotovoltaico connesso in rete con formula "chiavi in mano"</p>
          {address && <p className="text-xs text-zinc-500 font-semibold mt-1">📍 Edificio / Capannone sito in: {address}</p>}
        </div>
        
        <div className="text-right text-xs text-zinc-400 print:text-zinc-700 space-y-1">
          <span className="font-bold text-white print:text-black text-sm block">Riferimenti Commerciali</span>
          <p>Email: {tenant?.notification_email || 'tecnico@novasolar.it'}</p>
          <p>Data Offerta: {new Date().toLocaleDateString()}</p>
        </div>
      </div>

      {/* Elenco dettagliato delle aree del capannone tracciate con relativo numero di pannelli */}
      <div className="space-y-3">
        <span className="text-xs font-bold text-zinc-400 print:text-zinc-700 uppercase tracking-wider block">Specifiche delle Falde Rilevate</span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 print:grid-cols-3">
          {savedRoofs.map((roof) => (
            <div key={roof.id} className="bg-zinc-800 p-4 rounded-xl border border-zinc-750 print:bg-zinc-100 print:border-zinc-300">
              <span className="font-bold text-white print:text-black text-xs block">{roof.name}</span>
              <p className="text-sm text-emerald-400 font-bold mt-1">{Math.round(roof.area)} mq</p>
              <span className="text-[10px] text-zinc-500 block mt-0.5">Moduli posizionati: {roof.panelCount}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Dati tecnici finali del preventivo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 print:grid-cols-4 pt-4 border-t border-zinc-800 print:border-zinc-300">
        <div className="bg-zinc-800 p-4 rounded-xl border border-zinc-750 print:bg-zinc-100 print:border-zinc-300">
          <span className="text-[10px] text-zinc-400 print:text-zinc-600 uppercase font-bold block">Superficie Totale</span>
          <span className="text-xl font-bold text-white print:text-black block mt-1">{areaSqm.toFixed(1)} mq</span>
        </div>
        <div className="bg-zinc-800 p-4 rounded-xl border border-zinc-750 print:bg-zinc-100 print:border-zinc-300">
          <span className="text-[10px] text-zinc-400 print:text-zinc-600 uppercase font-bold block">Potenza Nominale</span>
          <input type="number" step="0.1" value={peakPower.toFixed(2)} onChange={(e) => setPeakPower(parseFloat(e.target.value) || 0)} className="bg-transparent text-xl font-bold text-emerald-400 print:text-emerald-700 focus:outline-none border-b border-dashed border-zinc-700 w-full mt-1" />
          <span className="text-[9px] text-zinc-500 block mt-1">Esattamente {totalPanels} moduli installati</span>
        </div>
        <div className="bg-zinc-800 p-4 rounded-xl border border-zinc-750 print:bg-zinc-100 print:border-zinc-300">
          <span className="text-[10px] text-zinc-400 print:text-zinc-600 uppercase font-bold block">Produzione Annua</span>
          <input type="number" value={Math.round(annualProduction)} onChange={(e) => setAnnualProduction(parseInt(e.target.value) || 0)} className="bg-transparent text-xl font-bold text-white print:text-black focus:outline-none border-b border-dashed border-zinc-700 w-full mt-1" />
          <span className="text-[9px] text-zinc-500 block mt-1">Stima database PVGIS</span>
        </div>
        <div className="bg-zinc-800 p-4 rounded-xl border border-zinc-750 print:bg-zinc-100 print:border-zinc-300">
          <span className="text-[10px] text-zinc-400 print:text-zinc-600 uppercase font-bold block">Risparmio Stimato</span>
          <input type="number" value={Math.round(annualSavings)} onChange={(e) => setAnnualSavings(parseInt(e.target.value) || 0)} className="bg-transparent text-xl font-bold text-emerald-400 print:text-emerald-700 focus:outline-none border-b border-dashed border-zinc-700 w-full mt-1" />
          <span className="text-[9px] text-zinc-500 block mt-1">Risparmio economico annuo</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-zinc-300 print:text-zinc-800 uppercase tracking-wider">Servizi inclusi nella nostra fornitura:</h3>
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
  );
}
