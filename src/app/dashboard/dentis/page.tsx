"use client";

import React, { useState } from 'react';
import { useTenant } from '@/app/context/TenantContext';

export default function DentisServicePage() {
  const { tenant, activateService } = useTenant();
  const [activating, setActivating] = useState(false);

  const costCredits = 2000; // Costo canone mensile in crediti

  const handleUnlock = async () => {
    setActivating(true);
    const success = await activateService('dentis', costCredits);
    if (success) {
      alert("Servizio Dentis AI sbloccato con successo! Abbiamo detratto i 2000 crediti di canone mensile.");
    }
    setActivating(false);
  };

  if (!tenant?.dentis_active) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16 space-y-6">
        <span className="text-6xl block">🦷</span>
        <h1 className="text-3xl font-extrabold text-white">Sblocca Dentis AI (Serena)</h1>
        <p className="text-zinc-400 text-sm leading-relaxed max-w-lg mx-auto">
          Rispondi al telefono dello studio H24, fissa appuntamenti reali su Google Calendar e invia promemoria WhatsApp automatici ai pazienti scalandoli dai tuoi crediti di Free Energy.
        </p>
        
        <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl max-w-sm mx-auto space-y-2">
          <span className="text-xs text-zinc-500 uppercase block font-semibold">Canone di Sblocco Mensile</span>
          <span className="text-3xl font-black text-emerald-400 block">2.000 Crediti</span>
        </div>

        <button 
          onClick={handleUnlock}
          disabled={activating}
          className="px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-xl text-sm transition"
        >
          {activating ? "Attivazione..." : "Attiva Dentis AI con 2000 Crediti"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Dentis AI (Attivo)</h1>
        <p className="text-zinc-400 mt-1">Serena è operativa. Configura l'ID del Google Calendar dello studio odontoiatrico.</p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl space-y-6">
        <h2 className="text-xl font-bold text-white">ID Calendario Studio</h2>
        <input 
          type="text" 
          placeholder="Es: studio_dentistico@gmail.com" 
          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none" 
        />
        <button className="px-6 py-3 bg-emerald-500 text-zinc-950 font-bold rounded-xl text-xs transition">
          💾 Collega Calendario Google
        </button>
      </div>
    </div>
  );
}
