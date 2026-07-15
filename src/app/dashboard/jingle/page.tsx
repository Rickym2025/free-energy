"use client";

import React, { useState } from 'react';
import { useTenant } from '@/app/context/TenantContext';

export default function JinglePage() {
  const { tenant, deductCredits, updateTenantState } = useTenant();
  const [isActivating, setIsGenerating] = useState(false);
  const [stylePreference, setStylePreference] = useState('corporate_pop');
  const [notes, setNotes] = useState('');

  // Sanificazione chiavi Supabase
  const getEnvVar = (value: string | undefined, fallback: string): string => {
    if (!value || value === "undefined" || value.trim() === "" || value === "null") return fallback;
    return value.replace(/^["']|["']$/g, '').trim();
  };
  const SUPABASE_URL = getEnvVar(process.env.NEXT_PUBLIC_SUPABASE_URL, "https://hmpxgbzykwwqgfzifdlc.supabase.co").replace(/\/$/, '');
  const SUPABASE_ANON_KEY = getEnvVar(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmcHhnYnp5a3d3cWdmemlmZGxjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4MTA0NjAsImV4cCI6MjA5OTM4NjQ2MH0.eAq1O2IOiSRPYewnBTi9xuxeJlPxVa5OIW6f7qN9hIw");

  const handleUnlockJingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant || isActivating) return;

    if (tenant.jingle_active) {
      alert("Hai già un ordine attivo per un Brano d'Impresa. Il nostro team ti contatterà a breve.");
      return;
    }

    const success = await deductCredits(3000, "Acquisto modulo: BRANO JINGLE PERSONALIZZATO");
    if (!success) return;

    setIsGenerating(true);

    try {
      // Aggiorna lo stato nel database di Supabase impostando jingle_active = true
      const res = await fetch(`${SUPABASE_URL}/rest/v1/tenants?id=eq.${tenant.id}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          jingle_active: true,
          // Salviamo le note di stile nel campo note del tenant come log temporaneo
          notification_email: tenant.notification_email || `Preferenza: ${stylePreference}. Note: ${notes}`
        })
      });

      if (res.ok) {
        updateTenantState({ jingle_active: true });
        alert("Ordine inoltrato! 3.000 crediti sono stati detrati dal tuo wallet. Il nostro studio AI comporrà il tuo brano personalizzato entro 48 ore.");
      }
    } catch (err) {
      console.error(err);
      // Fallback locale in caso di blocco rete
      updateTenantState({ jingle_active: true });
    } finally {
      setIsGenerating(false);
    }
  };

  const brandColor = tenant?.brand_color_hex || '#0284c7';

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      
      {/* INTESTAZIONE */}
      <div className="border-b border-zinc-800 pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Brano d'Impresa AI</h1>
          <p className="text-zinc-400 mt-2 text-sm leading-relaxed">
            Componi una traccia audio o un jingle musicale identitario unico, generato dall'intelligenza artificiale per riflettere lo spirito della tua azienda.
          </p>
        </div>
        <a 
          href="https://ff.rmstudio.app/" 
          target="_blank"
          rel="noopener noreferrer"
          className="px-5 py-2.5 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-xs font-bold text-emerald-400 transition-colors"
        >
          🎵 Ascolta Esempi Reali
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        
        {/* OPZIONI DI UTILIZZO COMMERCIALE */}
        <div className="space-y-6">
          <h3 className="text-lg font-bold text-white uppercase tracking-wider font-mono text-xs text-zinc-500">Come utilizzare il tuo Brano:</h3>
          
          <div className="space-y-4">
            <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl flex items-start space-x-4">
              <span className="text-2xl shrink-0">📞</span>
              <div className="space-y-1">
                <h4 className="font-bold text-white text-sm">Musica d'Attesa Centralino</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Imposta il brano come sottofondo telefonico esclusivo per il tuo centralino aziendale o per l'assistente vocale H24.
                </p>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl flex items-start space-x-4">
              <span className="text-2xl shrink-0">📱</span>
              <div className="space-y-1">
                <h4 className="font-bold text-white text-sm">Video Social & Reels</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Utilizza la traccia audio libera da copyright come sottofondo musicale identitario per i tuoi post di cantiere su Instagram e TikTok.
                </p>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl flex items-start space-x-4">
              <span className="text-2xl shrink-0">🖥️</span>
              <div className="space-y-1">
                <h4 className="font-bold text-white text-sm">Sito Web & Preventivi</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Integra il brano come sigla di apertura o colonna sonora per i tuoi preventivi industriali o video presentazioni.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* MODULO DI SBLOCCO E ACQUISTO (3.000 CREDITI) */}
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl space-y-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/10 blur-3xl rounded-full pointer-events-none"></div>
          
          <div className="border-b border-zinc-800 pb-4">
            <h3 className="text-lg font-bold text-white">Configura e Ordina il Brano</h3>
            <p className="text-xs text-zinc-500 mt-1">Scegli lo stile e invia le note. Il nostro studio AI comporrà il file audio ad alta fedeltà entro 48 ore.</p>
          </div>

          <form onSubmit={handleUnlockJingle} className="space-y-4">
            
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">Stile Musicale Preferito</label>
              <select 
                value={stylePreference} 
                onChange={(e) => setStylePreference(e.target.value)}
                disabled={tenant?.jingle_active}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none cursor-pointer"
              >
                <option value="corporate_pop">Corporate Pop / Elettronica Moderna (Solare ed Energico)</option>
                <option value="epic_rock">Epic Rock / Chitarre Elettriche (Forte e Concreto)</option>
                <option value="lofi_ambient">Lofi Ambient / Rilassante (Elegante e Tecnologico)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">Note per il Compositore (Opzionali)</label>
              <textarea 
                placeholder="Es: Vorrei un ritmo incalzante con chitarre. La nostra azienda si occupa di fotovoltaico industriale ad Ariano nel Polesine..." 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                disabled={tenant?.jingle_active}
                className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-3 text-sm focus:outline-none resize-none leading-relaxed"
              />
            </div>

            <div className="pt-4 border-t border-zinc-800 flex flex-col items-center text-center gap-4">
              <div className="space-y-1">
                <span className="text-[10px] text-zinc-500 block uppercase font-mono tracking-wider font-semibold">Costo di Composizione Professionale</span>
                <span className="text-3xl font-black text-white" style={{ color: brandColor }}>3.000 Crediti</span>
                <span className="text-[10px] text-zinc-400 block mt-0.5">Una Tantum (€ 300,00 equivalenti)</span>
              </div>

              {tenant?.jingle_active ? (
                <div className="w-full py-4 bg-purple-950/60 text-purple-400 border border-purple-800/50 font-bold rounded-xl text-xs uppercase tracking-wider">
                  🎉 Ordine del Brano Attivo & In Lavorazione
                </div>
              ) : (
                <button 
                  type="submit"
                  disabled={isActivating}
                  className="w-full py-4 text-zinc-950 font-extrabold rounded-xl text-xs uppercase tracking-wider transition-all shadow hover:brightness-110 disabled:opacity-50"
                  style={{ backgroundColor: brandColor }}
                >
                  {isActivating ? "Elaborazione Ordine..." : "🚀 Ordina il tuo Brano d'Impresa AI"}
                </button>
              )}
            </div>

          </form>
        </div>

      </div>

    </div>
  );
}
