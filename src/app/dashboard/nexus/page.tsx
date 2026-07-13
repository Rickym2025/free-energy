"use client";

import React, { useState } from 'react';
import { useTenant } from '@/app/context/TenantContext';

export default function NexusServicePage() {
  const { tenant, activateService } = useTenant();
  const [copied, setCopied] = useState(false);
  const [activating, setActivating] = useState(false);

  const costCredits = 1000; // Costo mensile in crediti

  const handleUnlock = async () => {
    setActivating(true);
    const success = await activateService('nexus', costCredits);
    if (success) {
      alert("Servizio Nexus AI attivato con successo! Abbiamo detratto i 1000 crediti di canone mensile.");
    }
    setActivating(false);
  };

  const embedCode = `<script \n  src="https://free-energy.rmstudio.app/custom-widget.js" \n  data-tenant="${tenant?.id || 'sipro-energy'}" \n  data-color="${tenant?.brand_color_hex || '#0284c7'}"\n></script>`;

  if (!tenant?.nexus_active) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16 space-y-6">
        <span className="text-6xl block">🔒</span>
        <h1 className="text-3xl font-extrabold text-white">Sblocca il modulo Nexus AI</h1>
        <p className="text-zinc-400 text-sm leading-relaxed max-w-lg mx-auto">
          Attiva un assistente chat intelligente sul tuo sito web per catturare leads in modo automatico. Il canone mensile viene scalato comodamente dal tuo wallet di crediti, senza canoni esterni.
        </p>
        
        <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl max-w-sm mx-auto space-y-2">
          <span className="text-xs text-zinc-500 uppercase block font-semibold">Canone di Sblocco Mensile</span>
          <span className="text-3xl font-black text-emerald-400 block">1.000 Crediti</span>
          <span className="text-[10px] text-zinc-500 block">Il canone si rinnova automaticamente ogni 30 giorni</span>
        </div>

        <button 
          onClick={handleUnlock}
          disabled={activating}
          className="px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-xl text-sm transition"
        >
          {activating ? "Sblocco in corso..." : "Sblocca Nexus AI ora"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Modulo Nexus AI (Attivo)</h1>
        <p className="text-zinc-400 mt-1">Il tuo assistente virtuale è pronto. Copia il codice qui sotto per inserirlo sul tuo sito web.</p>
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
