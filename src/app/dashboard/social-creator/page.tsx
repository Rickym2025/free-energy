"use client";

import React, { useState } from 'react';
import { useTenant } from '@/app/context/TenantContext';

interface SocialCopy {
  instagram: string;
  facebook: string;
  tiktok: string;
}

export default function SocialCreator() {
  const { tenant, deductCredits } = useTenant();
  const [targetLocation, setTargetLocation] = useState('Ariano nel Polesine');
  const [systemDetails, setSystemDetails] = useState('Impianto 6 kWp con accumulo da 10kWh e detrazione fiscale al 50%');
  const [platform, setPlatform] = useState('instagram');
  const [marketingAngle, setMarketingAngle] = useState('risparmio');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSlides, setGeneratedSlides] = useState<string[]>([]);
  const [socialCopy, setSocialCopy] = useState<SocialCopy | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  const N8N_WEBHOOK_URL = "https://n8n.rmstudio.app/webhook/free-energy-social-creator";

  const handleGenerateSocialKit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetLocation.trim() || !systemDetails.trim()) return;

    const success = await deductCredits(100, `Generazione Carosello Grafico per: ${targetLocation}`);
    if (!success) return;

    setIsGenerating(true);
    setGeneratedSlides([]);
    setSocialCopy(null);
    setCurrentSlideIndex(0);

    try {
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: tenant?.id,
          location: targetLocation,
          details: systemDetails,
          platform: platform,
          angle: marketingAngle
        })
      });

      if (response.ok) {
        const data = await response.json();
        // Carica le slide Base64 ed il copy generati in tempo reale da n8n
        if (data && data.slides) {
          setGeneratedSlides(data.slides);
          setSocialCopy(data.social_copy || null);
          setIsGenerating(false);
          return;
        }
      }
      throw new Error("Avvio Fallback Mockup");
    } catch (err) {
      setTimeout(() => {
        // Fallback grafico pre-compilato di test se n8n è offline
        setGeneratedSlides([
          "https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=600&q=80",
          "https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?auto=format&fit=crop&w=600&q=80",
          "https://images.unsplash.com/photo-1620052581237-5d36667be337?auto=format&fit=crop&w=600&q=80"
        ]);
        setSocialCopy({
          instagram: `🌞 Riduci i costi energetici a ${targetLocation}! Con il nostro impianto fotovoltaico personalizzato da 6 kWp con accumulo da 10kWh, risparmi subito sulle bollette. \n\nBenefici inclusi:\n✓ Taglio dei costi in bolletta\n✓ Detrazione fiscale al 50%\n\nCommenta "energia" per ricevere la nostra guida completa all'installazione! #fotovoltaico #energia #polesine`,
          facebook: `Costi elettrici alle stelle? Con Sipro Energy e il nostro impianto fotovoltaico su misura per le aziende di ${targetLocation}, puoi finalmente azzerare gli sprechi energetici del tuo capannone!\n\n💡 Dettagli offerta:\n- Potenza: 6 kWp\n- Accumulo integrato: 10 kWh\n- Detrazione fiscale: 50% di rimborso\n\nCommenta "energia" per ricevere un'analisi di cantiere gratuita!`,
          tiktok: `Risparmia sulla bolletta! Scopri come il nostro impianto fotovoltaico da 6 kWp a ${targetLocation} ti aiuta ad azzerare i costi energetici. Commenta "energia" per la guida all'installazione! 🔋☀️ #fotovoltaico #solare #risparmio`
        });
        setIsGenerating(false);
      }, 2000);
    }
  };

  const handleDownloadSlide = (url: string, index: number) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `Slide_${index + 1}_${targetLocation}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const brandColor = tenant?.brand_color_hex || '#0284c7';

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      
      {/* INTESTAZIONE */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Social Creator</h1>
        <p className="text-zinc-400 mt-2 text-sm leading-relaxed">
          Genera in tempo reale caroselli grafici ad alto impatto nel formato verticale 4:5, completi di testi asimmetrici, logo e colori aziendali.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* PANNELLO INPUT (FASE 1) */}
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl h-fit space-y-6 shadow-xl">
          <h2 className="text-lg font-bold text-white flex items-center">
            Fase 1: Configura la campagna
            <span className="group relative ml-2 inline-block cursor-help text-zinc-500 hover:text-emerald-400 text-xs">
              ℹ️
              <span className="pointer-events-none absolute bottom-full right-0 z-50 mb-2 w-48 rounded-lg bg-zinc-950 border border-zinc-850 p-3 text-center text-xs text-zinc-200 shadow-2xl invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-200 whitespace-normal font-normal">
                Imposta la località ed i dettagli dell'offerta solare per generare la grafica pre-brandizzata. (Costo: 100 crediti).
              </span>
            </span>
          </h2>
          
          <form onSubmit={handleGenerateSocialKit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Località Target (Comune)</label>
              <input 
                type="text" 
                value={targetLocation} 
                onChange={(e) => setTargetLocation(e.target.value)} 
                required 
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500" 
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Dettagli Impianto</label>
              <textarea 
                value={systemDetails} 
                onChange={(e) => setSystemDetails(e.target.value)} 
                rows={3} 
                required 
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none resize-none focus:border-emerald-500" 
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Formato e Canale</label>
              <select 
                value={platform} 
                onChange={(e) => setPlatform(e.target.value)} 
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="instagram">Instagram Carousel Verticale (4:5)</option>
                <option value="facebook">Post Facebook (4:5)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Angolo di Scrittura</label>
              <select 
                value={marketingAngle} 
                onChange={(e) => setMarketingAngle(e.target.value)} 
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="risparmio">Risparmio e Bollette Zero</option>
                <option value="indipendenza">Indipendenza Energetica</option>
                <option value="burocrazia">Burocrazia e Iter Semplificato</option>
              </select>
            </div>

            <button 
              type="submit" 
              disabled={isGenerating} 
              className="w-full py-4 text-zinc-950 font-bold rounded-xl transition-all shadow-lg hover:brightness-110 disabled:opacity-50 text-sm" 
              style={{ backgroundColor: brandColor }}
            >
              {isGenerating ? "Creazione Grafica..." : "✨ Genera Carosello (100 crediti)"}
            </button>
          </form>
        </div>

        {/* VISUALIZZATORE ANTEPRIMA (FASE 2) */}
        <div className="lg:col-span-2 flex flex-col min-h-[500px] bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden relative shadow-xl">
          <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Anteprima Carosello 4:5</h2>
            {generatedSlides.length > 0 && (
              <button 
                onClick={() => handleDownloadSlide(generatedSlides[currentSlideIndex], currentSlideIndex)}
                className="px-4 py-2 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-xs font-semibold text-zinc-300 transition-colors"
              >
                📥 Scarica Slide Corrente
              </button>
            )}
          </div>
          
          <div className="flex-1 p-8 flex flex-col items-center justify-center">
            {isGenerating ? (
              <div className="flex flex-col items-center space-y-4 text-center max-w-xs">
                <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm text-zinc-400">Sto disegnando le tue slide fotografiche in formato 4:5 con il tuo brand...</p>
              </div>
            ) : generatedSlides.length > 0 ? (
              <div className="flex flex-col items-center space-y-6 w-full max-w-[340px]">
                {/* Visualizzatore Slide 4:5 (Aspect Verticale) */}
                <div className="aspect-[4/5] w-full bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden relative shadow-2xl">
                  <img 
                    src={generatedSlides[currentSlideIndex]} 
                    alt={`Slide ${currentSlideIndex + 1}`}
                    className="w-full h-full object-cover animate-fadeIn" 
                  />
                  <div className="absolute top-4 left-4 bg-zinc-950/80 border border-zinc-800 px-3 py-1 rounded-lg text-xs text-zinc-300 font-bold font-mono">
                    Slide {currentSlideIndex + 1} di {generatedSlides.length}
                  </div>
                </div>

                {/* Comandi di Navigazione Carosello */}
                <div className="flex items-center space-x-4 w-full">
                  <button 
                    disabled={currentSlideIndex === 0}
                    onClick={() => setCurrentSlideIndex(prev => prev - 1)}
                    className="flex-1 py-3 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 disabled:opacity-30 text-white font-bold text-xs rounded-xl transition-all"
                  >
                    ◀ Precedente
                  </button>
                  <button 
                    disabled={currentSlideIndex === generatedSlides.length - 1}
                    onClick={() => setCurrentSlideIndex(prev => prev + 1)}
                    className="flex-1 py-3 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 disabled:opacity-30 text-white font-bold text-xs rounded-xl transition-all"
                  >
                    Successiva ▶
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center max-w-sm">
                <span className="text-4xl block mb-4">🎨</span>
                <p className="text-sm text-zinc-500">Configura i parametri a sinistra per ottenere il tuo carosello di slide da scaricare e pubblicare sui social.</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* DIDASCALIE SOCIAL GENERATE (FASE 3) */}
      {socialCopy && (
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl space-y-4 shadow-xl animate-fadeIn">
          <h3 className="text-lg font-bold text-white">Didascalie e Hashtag per i tuoi Canali</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Instagram */}
            {socialCopy.instagram && (
              <div className="bg-zinc-950 p-5 rounded-xl border border-zinc-800/80 space-y-3">
                <span className="text-xs text-zinc-500 font-mono block uppercase tracking-wider font-bold">📸 Instagram</span>
                <p className="text-sm text-zinc-350 whitespace-pre-wrap leading-relaxed">
                  {socialCopy.instagram}
                </p>
              </div>
            )}
            
            {/* Facebook */}
            {socialCopy.facebook && (
              <div className="bg-zinc-950 p-5 rounded-xl border border-zinc-800/80 space-y-3">
                <span className="text-xs text-zinc-500 font-mono block uppercase tracking-wider font-bold">👥 Facebook</span>
                <p className="text-sm text-zinc-350 whitespace-pre-wrap leading-relaxed">
                  {socialCopy.facebook}
                </p>
              </div>
            )}
            
            {/* TikTok */}
            {socialCopy.tiktok && (
              <div className="bg-zinc-950 p-5 rounded-xl border border-zinc-800/80 space-y-3">
                <span className="text-xs text-zinc-500 font-mono block uppercase tracking-wider font-bold">🎵 TikTok</span>
                <p className="text-sm text-zinc-350 whitespace-pre-wrap leading-relaxed">
                  {socialCopy.tiktok}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
