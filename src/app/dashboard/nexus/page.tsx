"use client";

import React, { useState } from 'react';
import { useTenant } from '@/app/context/TenantContext';

export default function NexusServicePage() {
  const { tenant, activateService } = useTenant();
  const [copied, setCopied] = useState(false);
  const [activating, setActivating] = useState(false);

  const costCredits = 1000;

  const handleUnlock = async () => {
    setActivating(true);
    const success = await activateService('nexus', costCredits);
    if (success) {
      alert("Servizio Nexus AI sbloccato con successo!");
    }
    setActivating(false);
  };

  const embedCode = `<script \n  src="https://free-energy.rmstudio.app/custom-widget.js" \n  data-tenant="${tenant?.id || 'sipro-energy'}" \n  data-color="${tenant?.brand_color_hex || '#0284c7'}"\n></script>`;

  if (!tenant?.nexus_active) {
    return (
      <div className="max-w-5xl mx-auto space-y-12 py-8 animate-fadeIn">
        
        {/* Hero Section con Effetto Glow */}
        <div className="text-center space-y-4 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="inline-flex items-center space-x-2 bg-emerald-950/40 border border-emerald-800/60 px-3 py-1 rounded-full text-xs font-semibold text-emerald-400">
            <span>Modulo Aggiuntivo Premium</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">
            Cattura ogni lead dal tuo sito.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">Mentre la tua azienda dorme.</span>
          </h1>
          <p className="text-zinc-400 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
            Trasforma il tuo sito web vetrina in un venditore attivo 24 ore su 24, 7 giorni su 7. Nexus AI risponde a tutte le domande dei visitatori e qualifica i contatti inserendoli direttamente nella tua Dashboard.
          </p>
        </div>

        {/* Video Mockup ed Elementi di Conversione */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-center">
          
          {/* Colonna Sinistra: Video Mockup Placeholder */}
          <div className="lg:col-span-3 bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden aspect-video flex flex-col justify-center items-center relative group shadow-[0_0_30px_rgba(16,185,129,0.05)]">
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 to-transparent opacity-80 z-10"></div>
            <div className="w-16 h-14 bg-emerald-500 hover:bg-emerald-400 rounded-2xl flex items-center justify-center cursor-pointer transition z-20 shadow-lg shadow-emerald-500/20">
              <span className="text-zinc-950 text-xl font-black">▶</span>
            </div>
            <span className="text-xs font-bold text-zinc-400 mt-4 uppercase tracking-widest z-20">Guarda la Video Demo [1 Minuto]</span>
          </div>

          {/* Colonna Destra: Valore e Prezzo */}
          <div className="lg:col-span-2 space-y-6">
            <h3 className="text-xl font-bold text-white">Perché non puoi farne a meno:</h3>
            
            <ul className="space-y-4 text-sm text-zinc-300">
              <li className="flex items-start space-x-3">
                <span className="text-emerald-400 text-lg">✓</span>
                <span><strong>Zero Frizione:</strong> Risponde istantaneamente alle FAQ dei clienti, abbattendo i tempi d'attesa.</span>
              </li>
              <li className="flex items-start space-x-3">
                <span className="text-emerald-400 text-lg">✓</span>
                <span><strong>Qualificazione Lead:</strong> Chiede le bollette e l'indirizzo, scremando i perditempo in automatico.</span>
              </li>
              <li className="flex items-start space-x-3">
                <span className="text-emerald-400 text-lg">✓</span>
                <span><strong>ROI Immediato:</strong> Un solo impianto venduto grazie al widget ripaga anni di canone crediti.</span>
              </li>
            </ul>

            <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-2 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-emerald-500 text-zinc-950 text-[10px] font-black px-2.5 py-0.5 rounded-bl-xl uppercase tracking-wider">Pay-As-You-GO</div>
              <span className="text-xs text-zinc-500 font-semibold uppercase block">Investimento Mensile</span>
              <div className="flex items-baseline">
                <span className="text-4xl font-black text-white">1.000</span>
                <span className="text-zinc-500 text-sm ml-1">crediti / mese</span>
              </div>
            </div>

            <button 
              onClick={handleUnlock}
              disabled={activating}
              className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-black rounded-xl text-sm transition uppercase tracking-wider shadow-lg shadow-emerald-500/10"
            >
              {activating ? "Sblocco in corso..." : "⚡ Attiva Nexus AI (1.000 crediti)"}
            </button>
          </div>
        </div>

      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Modulo Nexus AI (Attivo)</h1>
        <p className="text-zinc-400 mt-1">Copia il codice di iniezione ed incollalo nel codice del tuo sito web per far apparire l'assistente.</p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl flex flex-col justify-between">
        <div>
          <h2 className="text-xl font-bold text-white mb-4">Codice di Iniezione HTML</h2>
          <pre className="bg-zinc-950 p-6 rounded-xl border border-zinc-850 text-xs font-mono text-emerald-400 overflow-x-auto leading-relaxed whitespace-pre-wrap">
            {embedCode}
          </pre>
        </div>

        <button 
          onClick={() => {
            navigator.clipboard.writeText(embedCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="w-full py-4 mt-6 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-xl transition"
        >
          {copied ? "Codice Copiato! ✅" : "📋 Copia Codice Widget"}
        </button>
      </div>
    </div>
  );
}
