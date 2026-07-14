"use client";

import React, { useState, useEffect } from 'react';

interface SavedRoof {
  id: string;
  name: string;
  area: number;
  panelCount: number;
  lengths: number[]; // Riceve i lati modificati
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

const getEnvVar = (value: string | undefined, fallback: string): string => {
  if (!value || value === "undefined" || value.trim() === "" || value === "null") return fallback;
  return value.replace(/^["']|["']$/g, '').trim();
};

const SUPABASE_URL = getEnvVar(process.env.NEXT_PUBLIC_SUPABASE_URL, "https://hmpxgbzykwwqgfzifdlc.supabase.co").replace(/\/$/, '');
const SUPABASE_ANON_KEY = getEnvVar(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmcHhnYnp5a3d3cWdmemlmZGxjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4MTA0NjAsImV4cCI6MjA5OTM4NjQ2MH0.eAq1O2IOiSRPYewnBTi9xuxeJlPxVa5OIW6f7qN9hIw");

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

  // Stati per la generazione del link pubblico
  const [isSaving, setIsSaving] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setAreaSqm(totalArea);
    setPeakPower(initialPower);
    setAnnualProduction(initialProduction);
    setAnnualSavings(initialSavings);
    setEstimatedCost(initialCost);
  }, [totalArea, initialPower, initialProduction, initialSavings, initialCost]);

  const handlePrintPdf = () => {
    const originalTitle = document.title;
    const cleanAddress = address ? ` - ${address.split(',')[0]}` : '';
    document.title = `${tenant?.company_name || 'Nova Solar SRL'} - Preventivo Fotovoltaico${cleanAddress}`;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  };

  // 1. Converte questo preventivo in un cantiere reale nel CRM
  const handleConvertToCantiere = async () => {
    if (!tenant) return;

    const payload = {
      tenant_id: tenant.id,
      customer_name: address ? `Cantiere ${address.split(',')[0]}` : "Nuovo Cantiere",
      address: address || "Indirizzo non specificato",
      monthly_bill_euro: Math.round(annualSavings / 12),
      status: "sopralluogo",
      notes: `Generato in automatico da PV Planner.\nPotenza impianto stimata: ${peakPower.toFixed(2)} kWp\nNumero moduli totali: ${totalPanels}\nRisparmio economico stimato: €${Math.round(annualSavings)}/anno\nCosto impianto totale: €${estimatedCost.toLocaleString()}`
    };

    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/leads`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        alert("Cantiere aperto e registrato con successo nel CRM!");
      } else {
        const errText = await response.text();
        console.error("Errore salvataggio cantiere:", errText);
      }
    } catch (err) {
      console.error("Errore di rete durante la conversione:", err);
    }
  };

  // 2. Salva il preventivo ed ottiene il Link pubblico della presentazione
  const handleSaveAndGenerateLink = async () => {
    if (!tenant || isSaving) return;
    setIsSaving(true);

    const payload = {
      tenant_id: tenant.id,
      project_name: address ? `Studio di Fattibilità - ${address.split(',')[0]}` : "Preventivo Fotovoltaico Industriale",
      address: address || "Indirizzo non specificato",
      total_power_kw: peakPower,
      panel_count: totalPanels,
      estimated_cost_euro: estimatedCost,
      total_area_sqm: areaSqm,
      annual_production_kwh: annualProduction,
      annual_savings_euro: annualSavings,
      monthly_bill_euro: Math.round(annualSavings / 12)
    };

    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/pv_reports`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation' // Chiede a Supabase di restituire la riga creata
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const createdData = await response.json();
        if (createdData && createdData.length > 0) {
          const reportId = createdData[0].id;
          const shareLink = `https://free-energy.rmstudio.app/preventivo/${reportId}`;
          setGeneratedLink(shareLink);
          setShowLinkModal(true);
        }
      } else {
        const errText = await response.text();
        console.error("Errore salvataggio preventivo:", errText);
      }
    } catch (err) {
      console.error("Errore di rete durante il salvataggio:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const totalPanels = savedRoofs.reduce((acc, r) => acc + r.panelCount, 0);
  const brandColor = tenant?.brand_color_hex || '#0284c7';

  return (
    <div className="bg-zinc-900 border-2 border-emerald-500/30 p-8 rounded-3xl space-y-8 print:bg-white print:text-black print:border-0 print:p-0 animate-fadeIn">
      
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { margin: 0; }
          body { 
            margin: 1.5cm !important; 
            background: white !important; 
            color: black !important; 
          }
          #map-pv { 
            display: block !important; 
            height: 280px !important; 
            width: 100% !important; 
            border: 1px solid #ddd !important; 
            border-radius: 12px; 
            margin: 15px 0 !important; 
          }
          .print-page-break {
            page-break-before: always !important;
            break-before: page !important;
            margin-top: 1.5cm !important;
            display: block !important;
          }
        }
      `}} />

      {/* --- PRIMA PAGINA DEL PREVENTIVO --- */}
      <div className="space-y-6">
        
        {/* Intestazione con Logo */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-6 print:border-zinc-300">
          <div className="flex items-center space-x-4">
            {tenant?.logo_url ? (
              <img 
                src={tenant.logo_url} 
                alt="Logo Azienda" 
                className="h-12 max-w-[200px] object-contain print:text-black" 
              />
            ) : (
              <div className="px-4 py-2 rounded-xl text-white font-black text-xl tracking-tight shrink-0" style={{ backgroundColor: brandColor }}>
                {tenant?.company_name ? tenant.company_name.substring(0, 2).toUpperCase() : 'SL'}
              </div>
            )}
            <div className="space-y-0.5">
              <h2 className="text-xl font-black text-white print:text-black uppercase tracking-tight">{tenant?.company_name || 'Solis Energy SRL'}</h2>
              <p className="text-[10px] text-zinc-400 print:text-zinc-600 font-medium">Fattibilità fotovoltaica connessa in rete con formula "chiavi in mano"</p>
              {address && <p className="text-xs text-emerald-400 print:text-emerald-700 font-bold">📍 Sito: {address}</p>}
            </div>
          </div>
          
          <div className="text-right text-xs text-zinc-400 print:text-zinc-700 space-y-1">
            <span className="font-bold text-white print:text-black text-sm block">Riferimenti Commerciali</span>
            <p>Email: {tenant?.notification_email || 'tecnico@novasolar.it'}</p>
            <p>Data Offerta: {new Date().toLocaleDateString()}</p>
          </div>
        </div>

        {/* Tabella Aree Capannone */}
        <div className="space-y-3">
          <span className="text-xs font-bold text-zinc-400 print:text-zinc-700 uppercase tracking-wider block">Specifiche delle Falde Rilevate</span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 print:grid-cols-3">
            {savedRoofs.map((roof) => (
              <div key={roof.id} className="bg-zinc-800 p-4 rounded-xl border border-zinc-750 print:bg-zinc-100 print:border-zinc-300">
                <span className="font-bold text-white print:text-black text-xs block">{roof.name}</span>
                <p className="text-sm text-emerald-400 font-bold mt-1">{Math.round(roof.area)} mq</p>
                <span className="text-[10px] text-zinc-500 block mt-0.5">Moduli posizionati: {roof.panelCount}</span>
                
                {/* Visualizzazione delle quotature dei lati modificati nel PDF */}
                {roof.lengths && roof.lengths.length > 0 && (
                  <p className="text-[9px] text-zinc-400 print:text-zinc-600 mt-2 font-mono">
                    Lati: {roof.lengths.map(l => `${l.toFixed(1)}m`).join(' - ')}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Specifiche Tecniche Impianto */}
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
            <input type="number" value={Math.round(annualSavings)} onChange={(e) => setAnnualSavings(parseFloat(e.target.value) || 0)} className="bg-transparent text-xl font-bold text-emerald-400 print:text-emerald-700 focus:outline-none border-b border-dashed border-zinc-700 w-full mt-1" />
            <span className="text-[9px] text-zinc-500 block mt-1">Risparmio economico annuo</span>
          </div>
        </div>
      </div>

      {/* --- SECONDA PAGINA DEL PREVENTIVO --- */}
      <div className="print-page-break pt-8 border-t border-zinc-800 print:break-before-page grid grid-cols-1 md:grid-cols-2 gap-8">
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

      {/* PANNELLO AZIONI (CONVERSIONE, GENERAZIONE E STAMPA) */}
      <div className="border-t border-zinc-800 pt-6 flex flex-col lg:flex-row items-center justify-between gap-4 print:hidden">
        <span className="text-xs text-zinc-500 max-w-sm">
          *Il preventivo è interamente editabile. Modifica i numeri direttamente a schermo prima di salvare la presentazione o stampare per allinearli ai tuoi listini esatti.
        </span>
        <div className="flex flex-wrap gap-3 w-full lg:w-auto">
          <button 
            onClick={handleConvertToCantiere}
            className="flex-1 lg:flex-initial px-5 py-3 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 font-bold rounded-xl text-sm transition"
          >
            🚀 Apri Cantiere
          </button>
          <button 
            onClick={handleSaveAndGenerateLink}
            disabled={isSaving}
            className="flex-1 lg:flex-initial px-5 py-3 bg-indigo-650 hover:bg-indigo-500 text-white font-bold rounded-xl text-sm transition disabled:opacity-50"
          >
            {isSaving ? "Generazione link..." : "🌐 Condividi Presentazione Web"}
          </button>
          <button 
            onClick={handlePrintPdf} 
            className="flex-1 lg:flex-initial px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-xl text-sm transition"
          >
            🖨️ Stampa / Esporta PDF
          </button>
        </div>
      </div>

      {/* POPUP MODALE DI CONDIVISIONE LINK GENERATO */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-fadeIn">
          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl w-full max-w-lg relative space-y-6 shadow-2xl">
            <button 
              onClick={() => setShowLinkModal(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white"
            >
              ✕
            </button>
            <div className="text-center">
              <span className="text-3xl block mb-2">🌐</span>
              <h2 className="text-xl font-bold text-white">Presentazione Web Generata!</h2>
              <p className="text-xs text-zinc-400 mt-1">
                La tua presentazione interattiva a slide è online. Copia il link pubblico qui sotto ed invialo al tuo cliente via WhatsApp o email.
              </p>
            </div>

            <div className="flex items-center space-x-2 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3">
              <input 
                type="text" 
                readOnly 
                value={generatedLink}
                className="bg-transparent text-sm text-zinc-300 focus:outline-none w-full select-all font-mono"
              />
              <button 
                onClick={handleCopyLink}
                className="bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold px-4 py-2 rounded-lg text-white transition shrink-0"
              >
                {copied ? "✓ Copiato" : "Copia Link"}
              </button>
            </div>

            <div className="flex justify-end pt-4 border-t border-zinc-800">
              <button 
                onClick={() => setShowLinkModal(false)}
                className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs rounded-xl transition"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
