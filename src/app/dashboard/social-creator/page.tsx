"use client";

import React, { useState } from 'react';
import { useTenant } from '@/app/context/TenantContext';

export default function SocialCreator() {
  const { tenant, deductCredits } = useTenant();
  const [targetLocation, setTargetLocation] = useState('Ariano nel Polesine');
  const [systemDetails, setSystemDetails] = useState('Impianto 6 kWp con accumulo da 10kWh e detrazione fiscale al 50%');
  const [platform, setPlatform] = useState('facebook');
  const [marketingAngle, setMarketingAngle] = useState('risparmio');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');
  const [copied, setCopied] = useState(false);

  const N8N_WEBHOOK_URL = "https://n8n.rmstudio.app/webhook/free-energy-social-creator";

  const handleGenerateSocialKit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetLocation.trim() || !systemDetails.trim()) return;

    const success = await deductCredits(100, `Generazione Post Social per: ${targetLocation}`);
    if (!success) return;

    setIsGenerating(true);
    setGeneratedContent('');
    setCopied(false);

    try {
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: tenant?.id,
          company_name: tenant?.company_name,
          location: targetLocation,
          details: systemDetails,
          platform: platform,
          angle: marketingAngle
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.text) {
          setGeneratedContent(data.text);
          setIsGenerating(false);
          return;
        }
      }
      throw new Error("Avvio Fallback offline");
    } catch (err) {
      setTimeout(() => {
        let fallbackText = "";
        if (platform === 'facebook') {
          fallbackText = `💡 BOLLETTE AZZERATE AD ${targetLocation.toUpperCase()}? ECCO COME STA CAMBIANDO IL MODO DI PRODURRE ENERGIA.\n\n` +
            `Molte famiglie a ${targetLocation} continuano a subire i rincari del mercato energetico nazionale, senza sapere che il proprio tetto potrebbe coprire fino al 90% dei loro consumi quotidiani.\n\n` +
            `Grazie alle nostre ultime installazioni di tipo: "${systemDetails}", i nostri clienti locali stanno riducendo drasticamente la dipendenza dalla rete elettrica.\n\n` +
            `✅ Autoconsumo immediato durante il giorno\n` +
            `✅ Energia accumulata per la sera grazie alle batterie di ultima generazione\n` +
            `✅ Pratiche burocratiche interamente gestite dal nostro ufficio tecnico\n\n` +
            `👉 Non rischiare un altro inverno di incertezze. Lascia un commento o inviaci un messaggio per richiedere una stima preliminare via satellite direttamente sulla tua casa.`;
        } else if (platform === 'reel_script') {
          fallbackText = `🎬 SCRIPT REEL / TIKTOK\n` +
            `⏱️ Durata stimata: 45 secondi\n` +
            `🎯 Gancio visivo: Inquadratura ravvicinata di una bolletta cartacea accartocciata e lanciata via. In sovrimpressione: "Ancora paghi questo a ${targetLocation}?".\n\n` +
            `[VOCE NARRANTE AI (Emozionale)]\n` +
            `"Se abiti a ${targetLocation}, smetti di scorrere. Questo è il tetto di una casa identica alla tua fino a ieri. Oggi, questo tetto produce energia pulita e gratuita ogni singolo giorno."\n\n` +
            `[TAGLIO VIDEO: Passaggio rapido a ripresa aerea dei pannelli installati sul tetto]\n\n` +
            `"Con una configurazione come questa: ${systemDetails}, non stai solo installando dei moduli. Stai mettendo al sicuro i risparmi della tua famiglia per i prossimi 25 anni. Senza pensieri, con burocrazia zero."\n\n` +
            `[TAGLIO VIDEO: Primo piano del tecnico sorridente che mostra lo schermo del telefono con il monitoraggio dell'inverter a zero consumi]\n\n` +
            `"Vuoi sapere se il tuo tetto è idoneo? Commenta qui sotto con la parola STIMA e faremo un'analisi satellitare gratuita in meno di 2 minuti."`;
        } else {
          fallbackText = `📸 SEQUENZA STORY INSTAGRAM (3 Slide)\n\n` +
            `⚠️ SLIDE 1: Foto di un cielo nuvoloso sopra ${targetLocation}.\n` +
            `Testo in evidenza: "Il fotovoltaico funziona anche quando è nuvoloso? 🌧️"\n\n` +
            `⚡ SLIDE 2: Grafico di produzione reale o foto di un inverter attivo.\n` +
            `Testo in evidenza: "Sì! Grazie ai pannelli ad alta efficienza e a un sistema di accumulo coordinato, raccogli energia anche con luce diffusa e la usi la sera."\n\n` +
            `🔥 SLIDE 3: Screenshot del nostro calcolatore satellitare di Free Energy.\n` +
            `Testo in evidenza: "Vuoi una simulazione per il tuo tetto a ${targetLocation}? Clicca sul link in bio e inserisci il tuo indirizzo!"\n` +
            `[INSERIRE STICKER LINK]`;
        }
        setGeneratedContent(fallbackText);
        setIsGenerating(false);
      }, 1500);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Social Creator</h1>
        <p className="text-zinc-400 mt-1">Genera campagne marketing iper-localizzate per attirare nuovi clienti nella tua zona operativa.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Pannello Input (Grigi solidi standard) */}
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl h-fit space-y-6">
          <h2 className="text-lg font-bold text-white flex items-center">
            Parametri Campagna
            <span className="group relative ml-2 inline-block cursor-help text-zinc-500 hover:text-emerald-400">
              ℹ️
              <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-48 -translate-x-1/2 rounded-lg bg-zinc-950 border border-zinc-800 p-3 text-center text-xs text-zinc-200 shadow-2xl invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-200 whitespace-normal">
                Configura i parametri geografici e dell'impianto per ottenere un copy ad alta conversione. (Costo: 100 crediti).
              </span>
            </span>
          </h2>
          
          <form onSubmit={handleGenerateSocialKit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Località Target (Comune)</label>
              <input type="text" value={targetLocation} onChange={(e) => setTargetLocation(e.target.value)} required className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none" />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Dettagli Soluzione / Offerta</label>
              <textarea value={systemDetails} onChange={(e) => setSystemDetails(e.target.value)} rows={3} required className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none resize-none" />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Piattaforma Social</label>
              <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none">
                <option value="facebook">Post Facebook</option>
                <option value="reel_script">Script Video Reel / TikTok</option>
                <option value="stories">Sequenza Instagram Stories</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Angolo di Copywriting</label>
              <select value={marketingAngle} onChange={(e) => setMarketingAngle(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none">
                <option value="risparmio">Risparmio Economico</option>
                <option value="indipendenza">Indipendenza Energetica</option>
                <option value="risoluzione_obiezioni">Burocrazia e Meteo</option>
              </select>
            </div>

            <button type="submit" disabled={isGenerating} className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-bold rounded-xl transition">
              {isGenerating ? "Scrittura..." : "✨ Genera Campagna (100 crediti)"}
            </button>
          </form>
        </div>

        {/* Pannello Output */}
        <div className="lg:col-span-2 flex flex-col min-h-[450px] bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Contenuto Generato dall'AI</h2>
            {generatedContent && (
              <button onClick={copyToClipboard} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-xs font-semibold text-zinc-300 transition">
                {copied ? "Copiato! ✅" : "Copia Testo 📋"}
              </button>
            )}
          </div>
          
          <div className="flex-1 p-8 bg-zinc-900 flex">
            {isGenerating ? (
              <div className="flex flex-col items-center justify-center w-full space-y-4">
                <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : generatedContent ? (
              <textarea value={generatedContent} readOnly className="w-full h-full min-h-[350px] bg-transparent text-zinc-200 text-sm leading-relaxed focus:outline-none resize-none font-mono" />
            ) : (
              <div className="text-center max-w-sm mx-auto flex flex-col justify-center">
                <span className="text-4xl block mb-4">✍️</span>
                <p className="text-sm text-zinc-500">Imposta i parametri a sinistra e clicca su "Genera" per ricevere il copy.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
