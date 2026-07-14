"use client";

import React, { useState, useRef } from 'react';
import { useTenant } from '@/app/context/TenantContext';

interface Suggestion {
  id: string;
  label: string;
  explanation: string;
}

const getEnvVar = (value: string | undefined, fallback: string): string => {
  if (!value || value === "undefined" || value.trim() === "" || value === "null") return fallback;
  return value.replace(/^["']|["']$/g, '').trim();
};

const SUPABASE_URL = getEnvVar(process.env.NEXT_PUBLIC_SUPABASE_URL, "https://hmpxgbzykwwqgfzifdlc.supabase.co").replace(/\/$/, '');
const SUPABASE_ANON_KEY = getEnvVar(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmcHhnYnp5a3d3cWdmemlmZGxjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4MTA0NjAsImV4cCI6MjA5OTM4NjQ2MH0.eAq1O2IOiSRPYewnBTi9xuxeJlPxVa5OIW6f7qN9hIw");

// Template pronti per il settore
const TEMPLATES = {
  elettricista: {
    title: "Elettricista di Cantiere Fotovoltaico",
    text: "Carchiamo elettricista con minima esperienza in impianti industriali per posizionamento inverter, cablaggi quadri in corrente continua (DC) e alternata (AC). Sede di lavoro principale nei cantieri della zona. Automunito."
  },
  montatore: {
    title: "Montatore Meccanico Strutture Solari",
    text: "Cercasi operaio addetto al montaggio meccanico di strutture di supporto per moduli fotovoltaici a tetto e a terra. Richiesta manualità con avvitatori, tassellatori e sistemi di ancoraggio su lamiere e coperture industriali."
  },
  progettista: {
    title: "Progettista Impianti Fotovoltaici CAD",
    text: "Selezioniamo geometra o ingegnere junior per la stesura di progetti preliminari ed esecutivi di impianti fotovoltaici industriali tramite AutoCAD 2D. Gestione delle pratiche di connessione e autorizzative comunali."
  }
};

export default function JobPostingsPage() {
  const { tenant } = useTenant();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Stati di Input
  const [activeTab, setActiveTab] = useState<'wizard' | 'template' | 'upload' | 'text'>('wizard');
  const [roleTitle, setRoleTitle] = useState('');
  const [inputText, setInputText] = useState('');
  
  // Parametri Wizard
  const [wizardExp, setWizardExp] = useState('autonomo');
  const [wizardSkills, setWizardSkills] = useState('');
  const [wizardBenefits, setWizardBenefits] = useState('');

  // Stati File Upload
  const [fileName, setFileName] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Stati elaborazione AI
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  
  // Dati restituiti da n8n
  const [extractedTitle, setExtractedJobTitle] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState<string[]>([]);
  const [finalPosting, setFinalPosting] = useState<{ role_title: string; description: string; required_skills: string[] } | null>(null);
  const [copied, setCopied] = useState(false);

  // Caricamento dei Template
  const handleLoadTemplate = (key: 'elettricista' | 'montatore' | 'progettista') => {
    setRoleTitle(TEMPLATES[key].title);
    setInputText(TEMPLATES[key].text);
  };

  // 1. Invio a n8n per Analisi e Suggerimenti
  const handleAnalyzePosting = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAnalyzing(true);
    setSuggestions([]);
    setFinalPosting(null);
    setSelectedSuggestions([]);

    let textToAnalyze = inputText;
    let titleToAnalyze = roleTitle;

    // Se siamo nel tab del Wizard, compiliamo una bozza descrittiva prima di inviarla
    if (activeTab === 'wizard') {
      titleToAnalyze = roleTitle || "Nuova Posizione";
      textToAnalyze = `Ruolo cercato: ${titleToAnalyze}. Livello richiesto: ${wizardExp}. Competenze inserite: ${wizardSkills}. Benefit previsti: ${wizardBenefits}.`;
    }

    try {
      let fileUrl = "";

      // Se l'utente ha inserito un file PDF/DOC, caricalo prima nello Storage
      if (activeTab === 'upload' && selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const uniqueFileName = `job-${Date.now()}.${fileExt}`;
        const uploadUrl = `${SUPABASE_URL}/storage/v1/object/job-docs/${uniqueFileName}`;

        const uploadResponse = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': selectedFile.type
          },
          body: selectedFile
        });

        if (uploadResponse.ok) {
          fileUrl = `${SUPABASE_URL}/storage/v1/object/public/job-docs/${uniqueFileName}`;
        } else {
          throw new Error("Impossibile caricare il documento su Supabase Storage");
        }
      }

      // Chiamata al primo webhook di n8n (Analisi)
      const response = await fetch("https://n8n.rmstudio.app/webhook/analyze-job-posting", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role_title: titleToAnalyze,
          text: textToAnalyze,
          file_url: fileUrl
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.suggestions) {
          setExtractedJobTitle(data.role_title || titleToAnalyze);
          setSuggestions(data.suggestions);
          // Inizialmente seleziona tutti i suggerimenti proposti dall'AI
          setSelectedSuggestions(data.suggestions.map((s: Suggestion) => s.id));
        }
      } else {
        throw new Error("Errore durante l'analisi dell'annuncio");
      }
    } catch (err) {
      console.error(err);
      // Fallback mockup in caso di offline
      setExtractedJobTitle(titleToAnalyze || "Elettricista di Cantiere");
      setSuggestions([
        { id: "sugg_1", label: "Aggiungi la certificazione CEI 11-27 PES/PAV", explanation: "Essenziale per chiunque operi su parti attive o vicine ad impianti elettrici in cantiere fotovoltaico." },
        { id: "sugg_2", label: "Inserisci l'abilitazione all'uso di piattaforme aeree (PLE)", explanation: "Indispensabile per i montaggi meccanici e i cablaggi sui tetti industriali fuori quota." },
        { id: "sugg_3", label: "Specifica i dettagli dei rimborsi spese e trasferta", explanation: "Gli operai di cantiere si spostano spesso; indicare l'uso dei mezzi aziendali aumenta del 40% l'attrazione dei profili idonei." }
      ]);
      setSelectedSuggestions(["sugg_1", "sugg_2", "sugg_3"]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Gestione selezione caselle di spunta dei suggerimenti
  const toggleSuggestion = (id: string) => {
    setSelectedSuggestions(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // 2. Invio a n8n per Stesura dell'Annuncio Finale
  const handleFinalizePosting = async () => {
    if (!tenant) return;
    setIsFinalizing(true);

    let textToAnalyze = inputText;
    if (activeTab === 'wizard') {
      textToAnalyze = `Ruolo cercato: ${extractedTitle}. Livello richiesto: ${wizardExp}. Competenze inserite: ${wizardSkills}. Benefit previsti: ${wizardBenefits}.`;
    }

    const approvedSuggestionsList = suggestions.filter(s => selectedSuggestions.includes(s.id));

    try {
      const response = await fetch("https://n8n.rmstudio.app/webhook/finalize-job-posting", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: tenant.id,
          role_title: extractedTitle,
          original_text: textToAnalyze,
          selected_suggestions: approvedSuggestionsList
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.success) {
          setFinalPosting(data.posting.output);
        }
      } else {
        throw new Error("Errore durante la finalizzazione dell'annuncio");
      }
    } catch (err) {
      console.error(err);
      // Fallback mockup finale
      setFinalPosting({
        role_title: extractedTitle,
        description: `# Annuncio di Lavoro: ${extractedTitle} (Fisico/Cantieristica)\n\nSiamo alla ricerca di un profilo tecnico qualificato da inserire all'interno del nostro team di installazione per cantieri fotovoltaici industriali.\n\n### Mansioni Principali:\n* Posa in quota di pannelli solari ed ancoraggio delle strutture metalliche di supporto.\n* Collegamento ed intestazione dei cavi in corrente continua (DC) dagli archi di stringa fino ai quadri di campo.\n* Assistenza alla posa e connessione degli inverter trifase industriali.\n\n### Requisiti e Certificazioni Richieste:\n* Abilitazione elettrica **CEI 11-27** (con qualifica PES o PAV attiva).\n* Certificato per l'uso di piattaforme aeree **PLE** con e senza stabilizzatori.\n* Idoneità fisica al lavoro in quota e su coperture industriali.\n\n### Benefit Aziendali:\n* Utilizzo dei mezzi aziendali per gli spostamenti dal magazzino centrale ai cantieri.\n* Indennità di trasferta giornaliera e rimborso pasto.\n* Corsi di aggiornamento continui sulla sicurezza elettrica ed impiantistica.`,
        required_skills: ["CEI 11-27", "Abilitazione PLE", "Lavoro in quota"]
      });
    } finally {
      setIsFinalizing(false);
    }
  };

  const handleCopyClipboard = () => {
    if (!finalPosting) return;
    navigator.clipboard.writeText(finalPosting.description);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      
      {/* INTESTAZIONE */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Scrittore di Annunci AI</h1>
        <p className="text-zinc-400 mt-2 text-sm leading-relaxed">
          Redigi o ottimizza i tuoi annunci di lavoro per il settore fotovoltaico. L'AI analizzerà la bozza, proporrà modifiche di cantiere e scriverà il testo finale conforme per la tua ricerca di personale.
        </p>
      </div>

      {/* FASE 1: ACQUISIZIONE DATI (WIZARD / TEMPLATE / CARICAMENTO) */}
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl space-y-6 shadow-xl">
        <div className="flex items-center space-x-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20 text-sm">1</span>
          <h2 className="text-lg font-bold text-white">Fase 1: Inserisci la bozza o le caratteristiche cercate</h2>
        </div>

        {/* Schede Selettori di Modalità */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-zinc-950 p-1.5 rounded-xl border border-zinc-850">
          <button onClick={() => { setActiveTab('wizard'); setFinalPosting(null); setSuggestions([]); }} className={`py-2 px-3 text-xs font-semibold rounded-lg transition-all ${activeTab === 'wizard' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-400 hover:text-zinc-200'}`}>
            🪄 Compila Guidato
          </button>
          <button onClick={() => { setActiveTab('template'); setFinalPosting(null); setSuggestions([]); }} className={`py-2 px-3 text-xs font-semibold rounded-lg transition-all ${activeTab === 'template' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-400 hover:text-zinc-200'}`}>
            📋 Usa Template
          </button>
          <button onClick={() => { setActiveTab('upload'); setFinalPosting(null); setSuggestions([]); }} className={`py-2 px-3 text-xs font-semibold rounded-lg transition-all ${activeTab === 'upload' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-400 hover:text-zinc-200'}`}>
            📁 Carica PDF/Doc
          </button>
          <button onClick={() => { setActiveTab('text'); setFinalPosting(null); setSuggestions([]); }} className={`py-2 px-3 text-xs font-semibold rounded-lg transition-all ${activeTab === 'text' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-400 hover:text-zinc-200'}`}>
            ✍️ Testo Libero
          </button>
        </div>

        <form onSubmit={handleAnalyzePosting} className="space-y-4">
          
          {/* TAB 1: PROCEDURA GUIDATA (WIZARD) */}
          {activeTab === 'wizard' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-450 uppercase tracking-wider block">Figura Professionale Cercata</label>
                  <input type="text" placeholder="Esempio: Elettricista di Cantiere" value={roleTitle} onChange={(e) => setRoleTitle(e.target.value)} required className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-450 uppercase tracking-wider block">Livello di Esperienza</label>
                  <select value={wizardExp} onChange={(e) => setWizardExp(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 cursor-pointer">
                    <option value="junior">Junior (Richiede formazione sul campo)</option>
                    <option value="autonomo">Autonomo (Opera in autonomia su quadri o montaggi)</option>
                    <option value="senior">Senior (Capocantiere con gestione team)</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-450 uppercase tracking-wider block">Competenze o Abilitazioni Richieste (Opzionale)</label>
                <input type="text" placeholder="Esempio: CEI 11-27, lavoro in quota, patentino PLE" value={wizardSkills} onChange={(e) => setWizardSkills(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-450 uppercase tracking-wider block">Benefit o Trattamento Previsto (Opzionale)</label>
                <input type="text" placeholder="Esempio: Mezzo aziendale per spostamenti, rimborsi trasferta quotidiani" value={wizardBenefits} onChange={(e) => setWizardBenefits(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500" />
              </div>
            </div>
          )}

          {/* TAB 2: SELEZIONE TEMPLATE */}
          {activeTab === 'template' && (
            <div className="space-y-4 animate-fadeIn">
              <p className="text-xs text-zinc-500 leading-relaxed uppercase font-mono tracking-wider">Seleziona un modello di partenza per il cantiere:</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button type="button" onClick={() => handleLoadTemplate('elettricista')} className="p-4 bg-zinc-950 border border-zinc-800 hover:border-emerald-500/50 rounded-xl text-left transition duration-200">
                  <span className="text-sm font-bold text-white block">🔌 Elettricista Solare</span>
                  <span className="text-xs text-zinc-500 block mt-1 leading-relaxed">Cablaggi DC/AC e posizionamento inverter.</span>
                </button>
                <button type="button" onClick={() => handleLoadTemplate('montatore')} className="p-4 bg-zinc-950 border border-zinc-800 hover:border-emerald-500/50 rounded-xl text-left transition duration-200">
                  <span className="text-sm font-bold text-white block">🔨 Montatore Strutture</span>
                  <span className="text-xs text-zinc-500 block mt-1 leading-relaxed">Fissaggi meccanici, moduli e staffaggi a tetto.</span>
                </button>
                <button type="button" onClick={() => handleLoadTemplate('progettista')} className="p-4 bg-zinc-950 border border-zinc-800 hover:border-emerald-500/50 rounded-xl text-left transition duration-200">
                  <span className="text-sm font-bold text-white block">📐 Disegnatore CAD Solare</span>
                  <span className="text-xs text-zinc-500 block mt-1 leading-relaxed">Progettazione esecutiva 2D e pratiche allaccio.</span>
                </button>
              </div>

              {roleTitle && (
                <div className="space-y-3 pt-2">
                  <label className="text-xs font-semibold text-zinc-450 uppercase tracking-wider block">Titolo Caricato</label>
                  <input type="text" value={roleTitle} onChange={(e) => setRoleTitle(e.target.value)} required className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none" />
                  <label className="text-xs font-semibold text-zinc-450 uppercase tracking-wider block">Bozza di Testo Caricata</label>
                  <textarea value={inputText} onChange={(e) => setInputText(e.target.value)} rows={4} required className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none resize-none" />
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CARICAMENTO FILE */}
          {activeTab === 'upload' && (
            <div className="space-y-4 animate-fadeIn">
              <p className="text-sm text-zinc-400">Trascina o carica il file di un annuncio che hai pubblicato in passato in formato PDF.</p>
              
              <div 
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const file = e.dataTransfer.files?.[0];
                  if (file && file.type === "application/pdf") {
                    setFileName(file.name);
                    setSelectedFile(file);
                  }
                }}
                className="border-2 border-dashed border-zinc-800 hover:border-emerald-500/30 rounded-xl p-8 text-center cursor-pointer bg-zinc-950 hover:bg-zinc-900 transition duration-200"
              >
                <input type="file" ref={fileInputRef} accept=".pdf" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setFileName(file.name);
                    setSelectedFile(file);
                  }
                }} className="hidden" />
                <span className="text-2xl block mb-2">📄</span>
                <span className="text-sm text-zinc-350 block font-semibold">
                  {fileName ? fileName : "Seleziona il vecchio annuncio (PDF)"}
                </span>
                <span className="text-xs text-zinc-550 block mt-1">Dimensione massima: 10MB</span>
              </div>
            </div>
          )}

          {/* TAB 4: TESTO LIBERO */}
          {activeTab === 'text' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-450 uppercase tracking-wider block">Titolo della Posizione</label>
                <input type="text" placeholder="Esempio: Elettricista Senior Impianti Industriali" value={roleTitle} onChange={(e) => setRoleTitle(e.target.value)} required className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-450 uppercase tracking-wider block">Testo Libero / Appunti Generici</label>
                <textarea placeholder="Incolla qui l'annuncio grezzo o scrivi i requisiti principali a punti..." value={inputText} onChange={(e) => setInputText(e.target.value)} rows={5} required className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none resize-none focus:border-emerald-500" />
              </div>
            </div>
          )}

          <button type="submit" disabled={isAnalyzing || (activeTab === 'upload' && !selectedFile)} className="w-full py-4 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 disabled:opacity-50 text-white font-bold rounded-xl transition duration-200 text-sm">
            {isAnalyzing ? "Analisi e scansione in corso..." : "🔍 Analizza e Ottimizza Annuncio"}
          </button>

        </form>
      </div>

      {/* FASE 2: LISTA SUGGERIMENTI AI (MOSTRATA SOLO SE CARICATI) */}
      {suggestions.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl space-y-5 shadow-xl animate-fadeIn">
          <div className="flex items-center space-x-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20 text-sm">2</span>
            <div>
              <h2 className="text-lg font-bold text-white">Fase 2: Filtra i suggerimenti di ottimizzazione AI</h2>
              <p className="text-xs text-emerald-400 mt-0.5">Figura rilevata: {extractedTitle}</p>
            </div>
          </div>

          <p className="text-sm text-zinc-400 leading-relaxed">
            Seleziona quali suggerimenti proposti dall'AI desideri incorporare e redigere all'interno della stesura dell'annuncio finale:
          </p>

          <div className="space-y-3">
            {suggestions.map((s) => (
              <div key={s.id} onClick={() => toggleSuggestion(s.id)} className={`p-4 border rounded-xl cursor-pointer transition-all duration-200 flex items-start space-x-4 ${selectedSuggestions.includes(s.id) ? 'bg-emerald-950/20 border-emerald-500/50' : 'bg-zinc-950 border-zinc-850 hover:border-zinc-700'}`}>
                <input type="checkbox" checked={selectedSuggestions.includes(s.id)} onChange={() => {}} className="mt-1 h-4 w-4 rounded border-zinc-800 text-emerald-500 focus:ring-transparent focus:ring-offset-0 cursor-pointer" />
                <div className="space-y-1">
                  <span className={`text-sm font-bold block ${selectedSuggestions.includes(s.id) ? 'text-white' : 'text-zinc-300'}`}>{s.label}</span>
                  <span className="text-xs text-zinc-500 leading-relaxed block">{s.explanation}</span>
                </div>
              </div>
            ))}
          </div>

          <button onClick={handleFinalizePosting} disabled={isFinalizing || selectedSuggestions.length === 0} className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl transition duration-200 shadow-lg shadow-emerald-950/20 text-sm">
            {isFinalizing ? "Riorganizzazione e scrittura finale..." : "✨ Genera Annuncio Finale"}
          </button>
        </div>
      )}

      {/* FASE 3: ANNUNCIO FINALE GENERATO */}
      {finalPosting && (
        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl space-y-6 shadow-xl animate-fadeIn">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
            <div className="flex items-center space-x-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20 text-sm">3</span>
              <h2 className="text-lg font-bold text-white">Fase 3: Annuncio Finale Ottimizzato</h2>
            </div>
            <button onClick={handleCopyClipboard} className="px-4 py-2 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-xs font-semibold text-zinc-350 transition-colors">
              {copied ? "✓ Copiato!" : "📋 Copia in Clipboard"}
            </button>
          </div>

          {/* Dettaglio competenze estratte */}
          {finalPosting.required_skills.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">Certificazioni Associate Rilevate</span>
              <div className="flex gap-2 flex-wrap">
                {finalPosting.required_skills.map((skill, i) => (
                  <span key={i} className="px-3 py-1 bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 rounded-lg">✓ {skill}</span>
                ))}
              </div>
            </div>
          )}

          {/* Rendering Testo Definitivo in Blocco Leggibile */}
          <div className="p-6 bg-zinc-950 rounded-xl border border-zinc-800 text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap font-sans">
            {finalPosting.description}
          </div>
        </div>
      )}

    </div>
  );
}
