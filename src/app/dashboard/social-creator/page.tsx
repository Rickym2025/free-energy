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
  const [platform, setPlatform] = useState('instagram_carousel');
  const [marketingAngle, setMarketingAngle] = useState('risparmio');
  const [hook, setHook] = useState('curiosita');
  const [topic, setTopic] = useState('residenziale');
  const [numSlides, setNumSlides] = useState(5);
  const [tone, setTone] = useState('tecnico');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSlides, setGeneratedSlides] = useState<any[]>([]);
  const [socialCopy, setSocialCopy] = useState<SocialCopy | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  const N8N_WEBHOOK_URL = "https://n8n.rmstudio.app/webhook/free-energy-social-creator";

  // Calcola l'aspect ratio corretto da passare a fal.ai / nano-banana-pro
  const getAspectRatioForFal = (plat: string) => {
    if (plat === 'instagram_reel') return '9:16';
    if (plat === 'facebook_post') return '1:1';
    return '4:5'; // default per Carousel e LinkedIn
  };

  // Restituisce la classe CSS corretta per adattare l'anteprima visiva nel client
  const getPreviewAspectClass = (plat: string) => {
    if (plat === 'instagram_reel') return 'aspect-[9/16] max-w-[280px]';
    if (plat === 'facebook_post') return 'aspect-[1/1] max-w-[360px]';
    return 'aspect-[4/5] max-w-[360px]'; // 4:5 standard
  };

  const handleGenerateSocialKit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetLocation.trim() || !systemDetails.trim()) return;

    // Detrazione aggiornata a 500 crediti
    const success = await deductCredits(500, `Generazione Social Kit (${platform}) per: ${targetLocation}`);
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
          aspect_ratio: getAspectRatioForFal(platform),
          angle: marketingAngle,
          hook: hook,
          topic: topic,
          num_slides: numSlides,
          tone: tone
        })
      });

      if (response.ok) {
        const data = await response.json();
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
        setGeneratedSlides([
          "https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=600&q=80",
          "https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?auto=format&fit=crop&w=600&q=80",
          "https://images.unsplash.com/photo-1620052581237-5d36667be337?auto=format&fit=crop&w=600&q=80"
        ]);
        setSocialCopy({
          instagram: `🌞 Riduci i costi energetici a ${targetLocation}! Con il nostro impianto fotovoltaico personalizzato da 6 kWp con accumulo da 10kWh, risparmi subito sulle bollette. \n\nBenefici inclusi:\n✓ Taglio dei costi in bolletta\n✓ Detrazione fiscale al 50%\n\nCommenta "energia" per ricevere la nostra guida completa all'installazione! #fotovoltaico #energia`,
          facebook: `Costi elettrici alle stelle? Con Sipro Energy e il nostro impianto fotovoltaico su misura per le aziende di ${targetLocation}, puoi finalmente azzerare gli sprechi energetici del tuo capannone!\n\n💡 Dettagli offerta:\n- Potenza: 6 kWp\n- Accumulo integrato: 10 kWh\n- Detrazione fiscale: 50% di rimborso\n\nCommenta "energia" per ricevere un'analisi di cantiere gratuita!`,
          tiktok: `Risparmia sulla bolletta! Scopri come il nostro impianto fotovoltaico da 6 kWp a ${targetLocation} ti aiuta ad azzerare i costi energetici. Commenta "energia" per la guida all'installazione! 🔋☀️ #fotovoltaico #risparmio`
        });
        setIsGenerating(false);
      }, 2000);
    }
  };

  const handleDownloadSlide = async (url: string, index: number) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `Slide_${index + 1}_${targetLocation}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      window.open(url, '_blank');
    }
  };

  const brandColor = tenant?.brand_color_hex || '#0284c7';
  const getImageUrl = (slide: any) => {
    if (!slide) return '';
    return typeof slide === 'object' ? slide.image_url : slide;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 space-y-8 pb-16">
      {/* INTESTAZIONE */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Creatore Post Social</h1>
        <p className="text-zinc-400 mt-2 text-sm leading-relaxed">
          Genera in tempo reale grafiche ad alto impatto per i tuoi canali di marketing locale, complete di testi asimmetrici, ganci psicologici, logo e colori aziendali.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* PANNELLO INPUT (4 COLONNE) */}
        <div className="lg:col-span-4 bg-zinc-900 border border-zinc-800 p-6 rounded-2xl space-y-6 shadow-xl">
          <h2 className="text-lg font-bold text-white flex items-center">
            Fase 1: Configura la campagna
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
                rows={2} 
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
                <option value="instagram_carousel">Instagram Carousel (4:5)</option>
                <option value="instagram_reel">Instagram Reel / TikTok (9:16)</option>
                <option value="facebook_post">Post Facebook (1:1 Quadrato)</option>
                <option value="linkedin_post">Post LinkedIn (4:5)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Argomento Principale</label>
                <select 
                  value={topic} 
                  onChange={(e) => setTopic(e.target.value)} 
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="residenziale">Residenziale Classico</option>
                  <option value="accumulo">Batterie & Indipendenza Notturna</option>
                  <option value="aziende">Capannoni & B2B Aziendale</option>
                  <option value="pompa_calore">Integrazione Gas-Free (Pompa)</option>
                  <option value="efficienza">Manutenzione & Monitoraggio</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Gancio (Hook)</label>
                <select 
                  value={hook} 
                  onChange={(e) => setHook(e.target.value)} 
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="curiosita">Domanda Provocatoria</option>
                  <option value="numerico">Dati Reali e Numeri alla Mano</option>
                  <option value="fomo">Paura della Perdita / FOMO</option>
                  <option value="autorita">Autorità Locale / Credibilità</option>
                  <option value="urgente">Urgenza Scadenza Detrazioni</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">N. Slide / Scene</label>
                <select 
                  value={numSlides} 
                  onChange={(e) => setNumSlides(parseInt(e.target.value))} 
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value={3}>3 Slide</option>
                  <option value={4}>4 Slide</option>
                  <option value={5}>5 Slide</option>
                  <option value={6}>6 Slide</option>
                  <option value={7}>7 Slide</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Tono di Voce</label>
                <select 
                  value={tone} 
                  onChange={(e) => setTone(e.target.value)} 
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="professionale">Professionale</option>
                  <option value="amichevole">Entusiasta</option>
                  <option value="tecnico">Tecnico</option>
                </select>
              </div>
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
              {isGenerating ? "Creazione Grafica..." : `✨ Genera Social Kit (500 crediti)`}
            </button>
          </form>
        </div>

        {/* VISUALIZZATORE ANTEPRIMA LARGO (8 COLONNE) */}
        <div className="lg:col-span-8 flex flex-col min-h-[600px] bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden relative shadow-xl">
          <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">
              Anteprima ({getAspectRatioForFal(platform)})
            </h2>
            {generatedSlides.length > 0 && (
              <button 
                onClick={() => handleDownloadSlide(getImageUrl(generatedSlides[currentSlideIndex]), currentSlideIndex)}
                className="px-4 py-2 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-xs font-semibold text-zinc-300 transition-colors"
              >
                📥 Scarica Slide Corrente
              </button>
            )}
          </div>
          
          <div className="flex-1 p-8 flex flex-col items-center justify-center">
            {isGenerating ? (
              <div className="flex flex-col items-center space-y-4 text-center max-w-sm">
                <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm text-zinc-400">Generazione in corso delle {numSlides} scene con Nano Banana Pro...</p>
              </div>
            ) : generatedSlides.length > 0 ? (
              <div className="flex flex-col items-center space-y-6 w-full items-center justify-center">
                {/* Visualizzatore Slide con Aspect Ratio Dinamico */}
                <div className={`w-full bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden relative shadow-2xl transition-all duration-300 ${getPreviewAspectClass(platform)}`}>
                  <img 
                    src={getImageUrl(generatedSlides[currentSlideIndex])} 
                    alt={`Slide ${currentSlideIndex + 1}`}
                    className="w-full h-full object-cover animate-fadeIn" 
                  />
                  <div className="absolute top-4 left-4 bg-zinc-950/80 border border-zinc-800 px-3 py-1 rounded-lg text-xs text-zinc-300 font-bold font-mono">
                    Scena {currentSlideIndex + 1} di {generatedSlides.length}
                  </div>
                </div>

                {/* Comandi di Navigazione */}
                <div className="flex items-center space-x-4 w-full max-w-[360px]">
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
                <p className="text-sm text-zinc-500">Configura i parametri a sinistra per ottenere il tuo carosello o reel pronto da scaricare.</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* DIDASCALIE SOCIAL GENERATE */}
      {socialCopy && (
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl space-y-4 shadow-xl animate-fadeIn">
          <h3 className="text-lg font-bold text-white">Didascalie e Hashtag per i tuoi Canali</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {socialCopy.instagram && (
              <div className="bg-zinc-950 p-5 rounded-xl border border-zinc-800/80 space-y-3">
                <span className="text-xs text-zinc-500 font-mono block uppercase tracking-wider font-bold">📸 Instagram / Threads</span>
                <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">
                  {socialCopy.instagram}
                </p>
              </div>
            )}
            
            {socialCopy.facebook && (
              <div className="bg-zinc-950 p-5 rounded-xl border border-zinc-800/80 space-y-3">
                <span className="text-xs text-zinc-500 font-mono block uppercase tracking-wider font-bold">👥 Facebook</span>
                <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">
                  {socialCopy.facebook}
                </p>
              </div>
            )}
            
            {socialCopy.tiktok && (
              <div className="bg-zinc-950 p-5 rounded-xl border border-zinc-800/80 space-y-3">
                <span className="text-xs text-zinc-500 font-mono block uppercase tracking-wider font-bold">🎵 TikTok / YouTube Shorts</span>
                <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">
                  {socialCopy.tiktok}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SEZIONE CONTATTI WEB3FORMS - COSTO AGGIORNATO A 2000 CREDITI */}
      <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-3xl rounded-full pointer-events-none"></div>
        
        <h2 className="text-2xl font-bold mb-2 flex items-center gap-3 relative z-10 text-white">
          <span className="w-3 h-3 rounded-full bg-emerald-400 shadow-[0_0_10px_#4ade80]"></span>
          Richiedi Video Promozionale
        </h2>
        
        <p className="text-zinc-400 mb-8 text-sm relative z-10 leading-relaxed">
          Vuoi realizzare una video clip promozionale professionale dei tuoi pannelli solari o del lavoro ultimato? Compila il modulo caricando i tuoi video o foto grezze e i nostri Art Director realizzeranno una clip montata su misura per te entro 48 ore.
        </p>
        
        <form 
          action="https://api.web3forms.com/submit" 
          method="POST" 
          encType="multipart/form-data"
          className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10"
        >
          <input type="hidden" name="access_key" value="9013a8d5-0901-42a0-b9e6-4c45553f960d" />
          <input type="hidden" name="subject" value={`Richiesta Video Promozionale da: ${tenant?.company_name || 'Installatore'}`} />
          <input type="hidden" name="redirect" value="https://free-energy.rmstudio.app/dashboard/social-creator" />
          
          <div>
            <label className="block text-sm text-zinc-400 mb-2 uppercase tracking-widest font-bold text-xs">Nome di Riferimento</label>
            <input 
              type="text" 
              name="name" 
              required 
              className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-3 outline-none focus:border-emerald-500 transition-colors text-sm" 
              placeholder="Esempio: Riccardo Modena" 
            />
          </div>
          
          <div>
            <label className="block text-sm text-zinc-400 mb-2 uppercase tracking-widest font-bold text-xs">Email Aziendale</label>
            <input 
              type="email" 
              name="email" 
              required 
              className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-3 outline-none focus:border-emerald-500 transition-colors text-sm" 
              placeholder="Esempio: info@siproenergy.it" 
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm text-zinc-400 mb-2 uppercase tracking-widest font-bold text-xs">Formato e Servizio Video Richiesto</label>
            <select 
              name="video_package"
              required
              className="w-full bg-zinc-950 border border-zinc-800 text-zinc-400 rounded-xl px-4 py-3 outline-none focus:border-emerald-500 transition-colors text-sm cursor-pointer"
            >
              <option value="pro_video">Video Promozionale completo da 1 minuto (Costo: 2000 Crediti)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-2 uppercase tracking-widest font-bold text-xs">Carica File di Cantiere (ZIP, MP4, JPG)</label>
            <input 
              type="file" 
              name="attachment" 
              required 
              accept=".zip,.mp4,.mov,.avi,.jpg,.png"
              className="w-full bg-zinc-950 border border-zinc-800 text-zinc-400 rounded-xl px-4 py-3 outline-none focus:border-emerald-500 transition-colors text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-zinc-800 file:text-zinc-300 hover:file:bg-zinc-700 cursor-pointer" 
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm text-zinc-400 mb-2 uppercase tracking-widest font-bold text-xs">Istruzioni o Richieste Speciali</label>
            <textarea 
              name="message" 
              required 
              rows={4} 
              className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-3 outline-none focus:border-emerald-500 transition-colors resize-none text-sm leading-relaxed" 
              placeholder="Descrivi l'angolo comunicativo desiderato, il testo da inserire nei sottotitoli o eventuali brani musicali preferiti..."
            ></textarea>
          </div>
          
          <div className="md:col-span-2 mt-2">
            <button 
              type="submit" 
              className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-slate-200 transition-transform active:scale-95 text-lg"
            >
              Invia Richiesta Creazione Video
            </button>
          </div>
        </form>
      </div>

    </div>
  );
}
