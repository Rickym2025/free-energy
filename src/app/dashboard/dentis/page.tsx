"use client";

import React, { useState } from 'react';
import { useTenant } from '@/app/context/TenantContext';

export default function DentisServicePage() {
  const { tenant, activateService } = useTenant();
  const [activating, setActivating] = useState(false);
  const [calendarId, setCalendarId] = useState('');
  const [activeStep, setActiveStep] = useState<number | null>(null);

  const costCredits = 1500;

  const handleUnlock = async () => {
    setActivating(true);
    const success = await activateService('dentis', costCredits);
    if (success) {
      alert("Servizio Receptionist AI H24 sbloccato con successo!");
    }
    setActivating(false);
  };

  const steps = [
    {
      title: "1. Apri Google Calendar",
      desc: "Accedi al tuo account Google Calendar dal computer aziendale."
    },
    {
      title: "2. Seleziona l'Agenda",
      desc: "Fai clic sui tre puntini accanto al calendario che usi per i sopralluoghi dei tuoi tecnici e seleziona 'Impostazioni e condivisione'."
    },
    {
      title: "3. Trova l'ID Calendario",
      desc: "Scorri verso il basso fino alla sezione 'Integra calendario' e copia il testo del campo 'ID calendario' (può essere la tua email o una stringa simile a xxxxxxx@group.calendar.google.com)."
    },
    {
      title: "4. Condividi l'Accesso",
      desc: "Nella stessa schermata, aggiungi l'email della nostra AI alle autorizzazioni con i permessi di scrittura per consentirle di fissare i sopralluoghi."
    }
  ];

  if (!tenant?.dentis_active) {
    return (
      <div className="max-w-5xl mx-auto space-y-12 py-8 animate-fadeIn">
        
        <div className="text-center space-y-4 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="inline-flex items-center space-x-2 bg-emerald-950/40 border border-emerald-800/60 px-3 py-1 rounded-full text-xs font-semibold text-emerald-400">
            <span>Modulo Aggiuntivo Premium</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">
            Rispondi al telefono 24 ore su 24.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">Azzera le chiamate perse.</span>
          </h1>
          <p className="text-zinc-400 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
            Serena AI è la tua segretaria virtuale intelligente. Parla con i clienti in tempo reale con un acting vocale iper-realistico, risponde fuori orario o su linea occupata, fissa i sopralluoghi su Google Calendar e invia promemoria WhatsApp automatici.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-center">
          
          <div className="lg:col-span-3 bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden aspect-video flex flex-col justify-center items-center relative group shadow-[0_0_30px_rgba(16,185,129,0.05)]">
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 to-transparent opacity-80 z-10"></div>
            <div className="w-16 h-14 bg-emerald-500 hover:bg-emerald-400 rounded-2xl flex items-center justify-center cursor-pointer transition z-20 shadow-lg shadow-emerald-500/20">
              <span className="text-zinc-950 text-xl font-black">▶</span>
            </div>
            <span className="text-xs font-bold text-zinc-400 mt-4 uppercase tracking-widest z-20">Ascolta come risponde Serena AI [Video]</span>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <h3 className="text-xl font-bold text-white">Perché digitalizzare il centralino:</h3>
            
            <ul className="space-y-4 text-sm text-zinc-300">
              <li className="flex items-start space-x-3">
                <span className="text-emerald-400 text-lg">✓</span>
                <span><strong>Disponibilità H24:</strong> Risponde di notte, nei weekend o mentre l'ufficio tecnico è in cantiere.</span>
              </li>
              <li className="flex items-start space-x-3">
                <span className="text-emerald-400 text-lg">✓</span>
                <span><strong>Zero Conflitti:</strong> Fissa i sopralluoghi direttamente sulla tua agenda Google in drag-and-drop.</span>
              </li>
              <li className="flex items-start space-x-3">
                <span className="text-emerald-400 text-lg">✓</span>
                <span><strong>Promemoria Automatici:</strong> Spedisce messaggi di cortesia via WhatsApp il giorno prima per abbattere i no-shows.</span>
              </li>
            </ul>

            <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-2 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-emerald-500 text-zinc-950 text-[10px] font-black px-2.5 py-0.5 rounded-bl-xl uppercase tracking-wider">Pay-As-You-GO</div>
              <span className="text-xs text-zinc-500 font-semibold uppercase block">Investimento Mensile</span>
              <div className="flex items-baseline">
                <span className="text-4xl font-black text-white">2.000</span>
                <span className="text-zinc-500 text-sm ml-1">crediti / mese</span>
              </div>
            </div>

            <button 
              onClick={handleUnlock}
              disabled={activating}
              className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-black rounded-xl text-sm transition uppercase tracking-wider shadow-lg shadow-emerald-500/10"
            >
              {activating ? "Attivazione..." : "⚡ Attiva Assistente Vocale (2.000 crediti)"}
            </button>
          </div>
        </div>

      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Receptionist AI H24 (Attivo)</h1>
        <p className="text-zinc-400 mt-1">L'assistente è operativa. Configura l'ID del Google Calendar per gestire l'agenda dei sopralluoghi tecnici.</p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl space-y-6">
        <h2 className="text-xl font-bold text-white">Collegamento Agenda Sopralluoghi</h2>
        
        {/* Accordion Istruzioni Passo-Passo */}
        <div className="space-y-3">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Guida al recupero dell'ID Calendario</span>
          <div className="space-y-2">
            {steps.map((step, i) => (
              <div key={i} className="bg-zinc-800/50 border border-zinc-750 rounded-xl overflow-hidden">
                <button 
                  onClick={() => setActiveStep(activeStep === i ? null : i)}
                  className="w-full text-left p-4 font-semibold text-xs text-zinc-200 flex justify-between items-center hover:bg-zinc-800 transition"
                >
                  <span>{step.title}</span>
                  <span className="text-zinc-500">{activeStep === i ? "−" : "+"}</span>
                </button>
                {activeStep === i && (
                  <div className="p-4 pt-0 text-zinc-400 text-xs leading-relaxed border-t border-zinc-800/40">
                    {step.desc}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2 pt-4 border-t border-zinc-800">
          <label className="text-xs text-zinc-400 font-semibold uppercase">Inserisci ID Google Calendar Rilevato</label>
          <input 
            type="text" 
            placeholder="Es: ufficio_tecnico@gmail.com oppure stringa @group.calendar.google.com" 
            value={calendarId}
            onChange={(e) => setCalendarId(e.target.value)}
            className="w-full bg-zinc-850 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none" 
          />
        </div>
        
        <button className="px-6 py-3 bg-emerald-500 text-zinc-950 font-bold rounded-xl text-xs transition">
          💾 Salva e Sincronizza Calendario
        </button>
      </div>
    </div>
  );
}
