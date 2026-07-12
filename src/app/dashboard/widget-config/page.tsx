"use client";

import React, { useState } from 'react';
import { useTenant } from '@/app/context/TenantContext';

export default function WidgetConfig() {
  const { tenant } = useTenant();
  const [copied, setCopied] = useState(false);

  // Codice di iniezione personalizzato con i dati del tenant corrente
  const embedCode = `<script \n  src="https://free-energy.rmstudio.app/custom-widget.js" \n  data-tenant="${tenant?.id || 'sipro-energy'}" \n  data-color="${tenant?.brand_color_hex || '#0284c7'}"\n></script>`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Widget Generatore Lead AI</h1>
        <p className="text-zinc-400 mt-1">Genera contatti commerciali qualificati inserendo il widget di Free Energy direttamente sul tuo sito aziendale.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Pannello Istruzioni */}
        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl space-y-6">
          <h2 className="text-xl font-bold text-white">Come installarlo in 2 minuti:</h2>
          
          <ul className="space-y-4 text-sm text-zinc-300">
            <li className="flex items-start space-x-3">
              <span className="flex items-center justify-center w-6 h-6 bg-emerald-950 border border-emerald-800/60 rounded-full text-xs text-emerald-400 font-bold flex-shrink-0 mt-0.5">1</span>
              <span>Copia il codice di iniezione javascript che trovi nel pannello a destra.</span>
            </li>
            <li className="flex items-start space-x-3">
              <span className="flex items-center justify-center w-6 h-6 bg-emerald-950 border border-emerald-800/60 rounded-full text-xs text-emerald-400 font-bold flex-shrink-0 mt-0.5">2</span>
              <span>Incollalo prima della chiusura del tag <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-white text-xs">&lt;/body&gt;</code> all'interno del tuo sito web (WordPress, Webflow o HTML).</span>
            </li>
            <li className="flex items-start space-x-3">
              <span className="flex items-center justify-center w-6 h-6 bg-emerald-950 border border-emerald-800/60 rounded-full text-xs text-emerald-400 font-bold flex-shrink-0 mt-0.5">3</span>
              <span>Il widget fluttuante si adatterà automaticamente al colore del tuo brand e salverà ogni contatto direttamente nella tua Dashboard.</span>
            </li>
          </ul>

          <div className="bg-zinc-800/40 border border-zinc-800 p-4 rounded-xl">
            <span className="text-xs text-zinc-400 font-semibold block">⚠️ NOTA OPERATIVA</span>
            <span className="text-xs text-zinc-500 mt-1 block">L'utilizzo del widget pubblico da parte dei visitatori del sito non consuma i tuoi crediti prepagati. Le registrazioni contatti sono illimitate e totalmente incluse nella licenza.</span>
          </div>
        </div>

        {/* Pannello Codice */}
        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl flex flex-col justify-between">
          <div>
            <h2 className="text-xl font-bold text-white mb-4">Codice di Iniezione HTML</h2>
            <p className="text-xs text-zinc-400 mb-4">Il codice è già configurato con il tuo identificativo aziendale ({tenant?.company_name}).</p>
            
            <pre className="bg-zinc-950 p-6 rounded-xl border border-zinc-850 text-xs font-mono text-emerald-400 overflow-x-auto leading-relaxed whitespace-pre-wrap">
              {embedCode}
            </pre>
          </div>

          <button 
            onClick={copyToClipboard}
            className="w-full py-4 mt-6 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-xl transition duration-200"
          >
            {copied ? "Codice Copiato! ✅" : "📋 Copia Codice Widget"}
          </button>
        </div>

      </div>
    </div>
  );
}
