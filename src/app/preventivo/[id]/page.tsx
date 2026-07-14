"use client";

import React, { useState, useEffect } from 'react';

interface Tenant {
  company_name: string;
  logo_url: string | null;
  brand_color_hex: string;
  notification_email: string | null;
  phone?: string | null;
}

interface Report {
  id: string;
  project_name: string;
  address: string;
  total_power_kw: number;
  panel_count: number;
  estimated_cost_euro: number;
  total_area_sqm: number;
  annual_production_kwh: number;
  annual_savings_euro: number;
  monthly_bill_euro: number;
  tenants: Tenant;
}

const getEnvVar = (value: string | undefined, fallback: string): string => {
  if (!value || value === "undefined" || value.trim() === "" || value === "null") return fallback;
  return value.replace(/^["']|["']$/g, '').trim();
};

const SUPABASE_URL = getEnvVar(process.env.NEXT_PUBLIC_SUPABASE_URL, "https://hmpxgbzykwwqgfzifdlc.supabase.co").replace(/\/$/, '');
const SUPABASE_ANON_KEY = getEnvVar(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmcHhnYnp5a3d3cWdmemlmZGxjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4MTA0NjAsImV4cCI6MjA5OTM4NjQ2MH0.eAq1O2IOiSRPYewnBTi9xuxeJlPxVa5OIW6f7qN9hIw");

export default function JinglePage({ params }: { params: { id: string } }) {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [clientSignature, setClientSignature] = useState('');

  useEffect(() => {
    if (params.id) {
      fetchReportData();
    }
  }, [params.id]);

  const fetchReportData = async () => {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/pv_reports?id=eq.${params.id}&select=*,tenants(*)`,
        {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          }
        }
      );
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          setReport(data[0]);
        }
      }
    } catch (e) {
      console.error("Errore recupero presentazione:", e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-500 text-sm">
        ⚠️ Presentazione o preventivo non trovato. Verifica il link inserito.
      </div>
    );
  }

  const brandColor = report.tenants?.brand_color_hex || '#0284c7';
  
  // Calcolo del rientro dell'investimento (ROI)
  const paybackYears = report.estimated_cost_euro / report.annual_savings_euro;
  
  // Impatto ecologico stimato
  const co2SavedTons = (report.annual_production_kwh * 0.4) / 1000; // 0.4kg CO2 per kWh
  const treesPlanted = Math.round(co2SavedTons * 45); // ~45 alberi per tonnellata di CO2

  const totalSlides = 6;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between" style={{ '--brand-color': brandColor } as React.CSSProperties}>
      
      {/* 1. BARRA DI TESTATA (BRAND IDENTITY) */}
      <header className="p-6 bg-zinc-900/40 backdrop-blur border-b border-zinc-900 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          {report.tenants?.logo_url ? (
            <img src={report.tenants.logo_url} alt="Logo" className="h-10 max-w-[150px] object-contain" />
          ) : (
            <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-xs" style={{ backgroundColor: brandColor }}>
              {report.tenants?.company_name.substring(0, 2).toUpperCase()}
            </div>
          )}
          <span className="font-bold text-sm tracking-tight text-white">{report.tenants?.company_name}</span>
        </div>
        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Studio di Fattibilità Solare</span>
      </header>

      {/* 2. AREA DELLE SLIDE (CONTENUTO INTERATTIVO) */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-12 flex items-center justify-center">
        
        {/* SLIDE 1: COPERTINA E PRESENTAZIONE */}
        {currentSlide === 0 && (
          <div className="space-y-6 animate-fadeIn text-left w-full">
            <span className="text-xs font-bold uppercase tracking-widest block font-mono" style={{ color: brandColor }}>Slide 01 // Benvenuto</span>
            <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
              Studio di Fattibilità Fotovoltaica per <br />
              <span style={{ color: brandColor }}>{report.project_name.split('-').pop()?.trim()}</span>
            </h2>
            <p className="text-zinc-400 text-sm md:text-base leading-relaxed max-w-2xl">
              Abbiamo scansionato via satellite le coperture del tuo immobile situato in <strong className="text-white">{report.address}</strong>. Di seguito ti presentiamo la simulazione tecnica ed il rendimento finanziario stimato.
            </p>
            <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl flex items-center space-x-4 max-w-md">
              <span className="text-2xl">🛰️</span>
              <div className="text-xs text-zinc-400 space-y-0.5">
                <span className="font-bold text-white block text-sm">Analisi Satellitare Completata</span>
                <span>Struttura del tetto, inclinazione ed ostacoli verificati nel database.</span>
              </div>
            </div>
          </div>
        )}

        {/* SLIDE 2: IL RISPARMIO ENERGETICO */}
        {currentSlide === 1 && (
          <div className="space-y-6 animate-fadeIn text-left w-full">
            <span className="text-xs font-bold uppercase tracking-widest block font-mono" style={{ color: brandColor }}>Slide 02 // Risparmio Economico</span>
            <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">Il Risparmio Energetico nel Tempo</h2>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Installando un impianto da <strong className="text-white">{report.total_power_kw.toFixed(2)} kWp</strong>, riduci all'istante l'acquisto di energia dalla rete nazionale.
            </p>

            {/* Grafico di risparmio semplificato in puro CSS/HTML */}
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl space-y-4">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block font-mono">Risparmio Economico Accumulato (Stima):</span>
              <div className="space-y-3 pt-2">
                <div>
                  <div className="flex justify-between text-xs text-zinc-400 mb-1">
                    <span>Anno 1 (Risparmio immediato)</span>
                    <span className="font-bold text-white">€ {Math.round(report.annual_savings_euro).toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-zinc-950 h-3.5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ backgroundColor: brandColor, width: '10%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs text-zinc-400 mb-1">
                    <span>Anno 5 (Rientro investimento completato)</span>
                    <span className="font-bold text-white">€ {Math.round(report.annual_savings_euro * 5).toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-zinc-950 h-3.5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ backgroundColor: brandColor, width: '45%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs text-zinc-400 mb-1">
                    <span>Anno 15 (Puro Profitto Cumulato)</span>
                    <span className="font-bold text-emerald-400 font-extrabold">€ {Math.round(report.annual_savings_euro * 15).toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-zinc-950 h-3.5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: '100%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SLIDE 3: SPECIFICHE TECNICHE */}
        {currentSlide === 2 && (
          <div className="space-y-6 animate-fadeIn text-left w-full">
            <span className="text-xs font-bold uppercase tracking-widest block font-mono" style={{ color: brandColor }}>Slide 03 // Specifiche Tecniche</span>
            <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">Dimensionamento e Fornitura</h2>
            <p className="text-zinc-400 text-sm leading-relaxed">
              La configurazione strutturale prevede il posizionamento ottimale dei moduli per garantire la massima ricezione solare annua.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl">
                <span className="text-[10px] text-zinc-500 font-bold block uppercase font-mono">Moduli Fotovoltaici</span>
                <span className="text-3xl font-black text-white block mt-1">{report.panel_count}</span>
                <span className="text-xs text-zinc-400 block mt-0.5">Silicio monocristallino</span>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl">
                <span className="text-[10px] text-zinc-500 font-bold block uppercase font-mono">Superficie Coperta</span>
                <span className="text-3xl font-black text-white block mt-1">{Math.round(report.total_area_sqm)} mq</span>
                <span className="text-xs text-zinc-400 block mt-0.5">Strutture in alluminio</span>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl">
                <span className="text-[10px] text-zinc-500 font-bold block uppercase font-mono">Produzione Annua</span>
                <span className="text-3xl font-black text-emerald-400 block mt-1">{Math.round(report.annual_production_kwh).toLocaleString()} kWh</span>
                <span className="text-xs text-zinc-400 block mt-0.5">Stima database PVGIS</span>
              </div>
            </div>
          </div>
        )}

        {/* SLIDE 4: ANALISI FINANZIARIA (ROI) */}
        {currentSlide === 3 && (
          <div className="space-y-6 animate-fadeIn text-left w-full">
            <span className="text-xs font-bold uppercase tracking-widest block font-mono" style={{ color: brandColor }}>Slide 04 // Rientro Finanziario</span>
            <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">Ammortamento dell'Investimento (ROI)</h2>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Il fotovoltaico industriale non è un costo, ma un bene strumentale ad altissimo rendimento finanziario che si paga da solo nel tempo.
            </p>

            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div className="space-y-1">
                <span className="text-[10px] text-zinc-500 font-bold block uppercase font-mono">Tempo stimato di ammortamento:</span>
                <span className="text-4xl font-black text-white block" style={{ color: brandColor }}>
                  {paybackYears.toFixed(1)} Anni
                </span>
                <span className="text-xs text-zinc-400 block">Dopodiché l'energia prodotta sarà a costo zero.</span>
              </div>
              <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-850 text-xs text-zinc-450 leading-relaxed">
                <strong>💡 Perché è conveniente:</strong><br />
                Considerando un costo energetico medio, l'investimento si ripaga in meno di {Math.ceil(paybackYears)} anni. Nei successivi 20 anni di vita utile dell'impianto, l'azienda accumulerà puro profitto operativo.
              </div>
            </div>
          </div>
        )}

        {/* SLIDE 5: IMPATTO ECO-SOSTENIBILE (ESG) */}
        {currentSlide === 4 && (
          <div className="space-y-6 animate-fadeIn text-left w-full">
            <span className="text-xs font-bold uppercase tracking-widest block font-mono" style={{ color: brandColor }}>Slide 05 // Impatto Ambientale</span>
            <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">Sostenibilità e Bilancio ESG</h2>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Oltre al ritorno economico, l'impianto riduce drasticamente l'impronta di carbonio della tua azienda, migliorando il posizionamento sul mercato.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl flex items-start space-x-4">
                <span className="text-3xl shrink-0">🌿</span>
                <div>
                  <span className="text-[10px] text-zinc-500 font-bold block uppercase font-mono">CO2 Evitata All'Anno</span>
                  <span className="text-2xl font-black text-emerald-400 block mt-1">{co2SavedTons.toFixed(1)} Tonnellate</span>
                  <span className="text-xs text-zinc-400 block mt-0.5">Impronta ecologica ridotta</span>
                </div>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl flex items-start space-x-4">
                <span className="text-3xl shrink-0">🌳</span>
                <div>
                  <span className="text-[10px] text-zinc-500 font-bold block uppercase font-mono">Alberi Equivalenti Piantati</span>
                  <span className="text-2xl font-black text-emerald-400 block mt-1">{treesPlanted} Alberi</span>
                  <span className="text-xs text-zinc-400 block mt-0.5">Effetto ecologico compensato</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SLIDE 6: PROPOSTA COMMERCIALE & FIRMA DIGITALE */}
        {currentSlide === 5 && (
          <div className="space-y-6 animate-fadeIn text-left w-full">
            <span className="text-xs font-bold uppercase tracking-widest block font-mono" style={{ color: brandColor }}>Slide 06 // Proposta Economica</span>
            <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">Proposta Commerciale "Chiavi in Mano"</h2>

            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div>
                <span className="text-[10px] text-zinc-500 font-bold block uppercase font-mono">Investimento Totale Richiesto:</span>
                <span className="text-4xl font-black text-white block mt-1" style={{ color: brandColor }}>
                  € {report.estimated_cost_euro.toLocaleString()}
                </span>
                <span className="text-xs text-zinc-400 block mt-1">IVA agevolata 10% inclusa nella fornitura.</span>
              </div>

              {/* Form di accettazione rapida via WhatsApp */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block font-mono">Accettazione Rapida Proposta:</span>
                <input 
                  type="text" 
                  placeholder="Inserisci il tuo nome per la firma (es. Mario Rossi)" 
                  value={clientSignature}
                  onChange={(e) => setClientSignature(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
                <a 
                  href={`https://wa.me/${report.tenants?.phone ? report.tenants.phone.replace(/\D/g, '') : '3912345678'}?text=Ciao%20${encodeURIComponent(report.tenants?.company_name)},%20sono%20favorevole%20alla%20proposta%20fotovoltaica%20per%20l'impianto%20da%20${report.total_power_kw.toFixed(2)}%20kWp.%20Accetto%20con%20firma:%20${encodeURIComponent(clientSignature || 'Cliente')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs uppercase tracking-wider block text-center transition ${!clientSignature.trim() ? 'opacity-40 pointer-events-none' : ''}`}
                >
                  🚀 Accetta Proposta con 1 Clic
                </a>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* 3. COMANDI DI NAVIGAZIONE IN BASSO (DOCK) */}
      <footer className="p-6 bg-zinc-950 border-t border-zinc-900/60 flex flex-col sm:flex-row items-center justify-between gap-4">
        
        {/* Indicatore dei Punti/Pallini della Slide */}
        <div className="flex space-x-2">
          {Array.from({ length: totalSlides }).map((_, idx) => (
            <button 
              key={idx}
              onClick={() => setCurrentSlide(idx)}
              className="h-2.5 rounded-full transition-all duration-300"
              style={{ 
                width: currentSlide === idx ? '24px' : '10px', 
                backgroundColor: currentSlide === idx ? brandColor : '#27272a' 
              }}
              title={`Vai alla slide ${idx + 1}`}
            />
          ))}
        </div>

        {/* Tasti Avanti / Indietro */}
        <div className="flex space-x-3 w-full sm:w-auto">
          <button 
            disabled={currentSlide === 0}
            onClick={() => setCurrentSlide(prev => prev - 1)}
            className="flex-1 sm:flex-initial px-6 py-3 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-30 border border-zinc-800 text-white font-bold text-xs rounded-xl transition"
          >
            ◀ Precedente
          </button>
          <button 
            disabled={currentSlide === totalSlides - 1}
            onClick={() => setCurrentSlide(prev => prev + 1)}
            className="flex-1 sm:flex-initial px-6 py-3 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-30 border border-zinc-800 text-white font-bold text-xs rounded-xl transition"
          >
            Successiva ▶
          </button>
        </div>
      </footer>

    </div>
  );
}
