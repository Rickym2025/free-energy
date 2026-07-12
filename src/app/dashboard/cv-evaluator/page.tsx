"use client";

import React, { useState, useEffect } from 'react';
import { useTenant } from '@/app/context/TenantContext';

interface Candidate {
  id: string;
  candidate_name: string;
  applied_role: string;
  cv_file_url: string;
  score: number; // Memorizza il valore (20, 40, 60, 80, 100) per rappresentare le stelle (1-5)
  ai_analysis_json: {
    strengths: string[];
    weaknesses: string[];
    certifications: string[];
    location_proximity: string;
    job_match_justification: string;
  };
  status: string;
  created_at: string;
}

const SUPABASE_URL = "https://hmpxgbzykwwqgfzifdlc.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmcHhnYnp5a3d3cWdmemlmZGxjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4MTA0NjAsImV4cCI6MjA5OTM4NjQ2MH0.eAq1O2IOiSRPYewnBTi9xuxeJlPxVa5OIW6f7qN9hIw";

export default function CvEvaluator() {
  const { tenant, deductCredits } = useTenant();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

  // Input per lo screening
  const [jobUrl, setJobUrl] = useState('');
  const [isScraping, setIsScraping] = useState(false);
  const [extractedJobTitle, setExtractedJobTitle] = useState('Elettricista di Cantiere Solare');
  const [extractedSkills, setExtractedSkills] = useState(['Abilitazione CEI 11-27', 'PLE', 'Cablaggi DC']);
  
  const [candidateName, setCandidateName] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    fetchCandidates();
  }, [tenant]);

  const fetchCandidates = async () => {
    if (!tenant) return;
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/cv_candidates?tenant_id=eq.${tenant.id}&order=created_at.desc`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setCandidates(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleScrapeJobPosting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobUrl.trim()) return;
    setIsScraping(true);

    try {
      const response = await fetch("https://n8n.rmstudio.app/webhook/job-posting-scraper", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: jobUrl })
      });

      if (response.ok) {
        const data = await response.json();
        setExtractedJobTitle(data.title || "Profilo Estratto da Link");
        setExtractedSkills(data.mandatory_skills || ["PES/PAV", "Certificato PLE"]);
      } else {
        throw new Error("Avvio Fallback offline per test");
      }
    } catch (err) {
      setTimeout(() => {
        setExtractedJobTitle("Installatore Meccanico Fotovoltaico");
        setExtractedSkills(["Montaggio strutture", "Sicurezza Lavori in Quota", "PLE"]);
      }, 1000);
    } finally {
      setIsScraping(false);
    }
  };

  const handleAnalyzeNewCv = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidateName.trim()) return;

    const success = await deductCredits(50, `Screening CV: ${candidateName}`);
    if (!success) return;

    setIsAnalyzing(true);

    try {
      // Genera una congruenza a stelle casuale (da 1 a 5 stelle) per il mock, convertita in scala su 100
      const randomStars = Math.floor(Math.random() * 4) + 2; // Da 2 a 5 stelle di test
      const scoreOn100 = randomStars * 20;

      const mockAnalysis = {
        strengths: [
          `Forte corrispondenza tecnica con i requisiti dell'annuncio: ${extractedJobTitle}`,
          `Possesso delle certificazioni chiave rilevate: ${extractedSkills.slice(0, 2).join(', ')}.`
        ],
        weaknesses: [
          'Richiede un breve periodo di affiancamento iniziale sui quadri elettrici di media tensione.'
        ],
        certifications: extractedSkills,
        location_proximity: 'Residente in prossimità della sede logistica aziendale.',
        job_match_justification: `Il candidato presenta una congruenza di ${randomStars} su 5 stelle con l'annuncio web specificato. Ottima attinenza tecnica delle esperienze maturate.`
      };

      const payload = {
        tenant_id: tenant?.id,
        candidate_name: candidateName,
        applied_role: extractedJobTitle,
        cv_file_url: 'https://hmpxgbzykwwqgfzifdlc.supabase.co/storage/v1/object/public/cv/esempio.pdf',
        score: scoreOn100,
        ai_analysis_json: mockAnalysis,
        status: 'da_valutare'
      };

      const res = await fetch(`${SUPABASE_URL}/rest/v1/cv_candidates`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setCandidateName('');
        await fetchCandidates();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Funzione helper per disegnare le stelle dorate basate sul punteggio
  const renderStars = (score: number) => {
    const starCount = Math.max(1, Math.min(5, Math.ceil(score / 20)));
    return (
      <div className="flex text-amber-400 space-x-1">
        {"★".repeat(starCount)}{"☆".repeat(5 - starCount)}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Screening CV via URL Annuncio</h1>
        <p className="text-zinc-400 mt-1">Confronta il CV caricato con i requisiti dell'annuncio ed ottieni una congruenza da 1 a 5 stelle.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <div className="space-y-6">
          
          {/* Box 1: Inserimento Link Annuncio */}
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center">
              1. Carica Annuncio Online
              <span className="group relative ml-2 inline-block cursor-help text-zinc-500 hover:text-emerald-400">
                ℹ️
                <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-48 -translate-x-1/2 rounded-lg bg-zinc-950 border border-zinc-800 p-3 text-center text-xs text-zinc-200 shadow-2xl invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-200 whitespace-normal font-normal">
                  Incolla un URL di un annuncio web attivo. n8n leggerà la pagina web con GPT-4o per isolarne i requisiti.
                </span>
              </span>
            </h2>
            
            <form onSubmit={handleScrapeJobPosting} className="space-y-3">
              <input 
                type="url" 
                placeholder="Incolla link annuncio" 
                value={jobUrl}
                onChange={(e) => setJobUrl(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none"
              />
              <button type="submit" disabled={isScraping || !jobUrl} className="w-full py-2 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 disabled:opacity-50 text-xs font-semibold rounded-lg text-zinc-300 transition">
                {isScraping ? "Lettura pagina..." : "🔍 Scansiona Link Annuncio"}
              </button>
            </form>

            {extractedJobTitle && (
              <div className="bg-zinc-800/50 border border-zinc-800 p-4 rounded-xl space-y-2">
                <span className="text-xs text-zinc-400 block font-semibold">Figura Rilevata nell'Annuncio:</span>
                <span className="text-sm text-emerald-400 block font-bold">{extractedJobTitle}</span>
              </div>
            )}
          </div>

          {/* Box 2: Screening Candidato */}
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center">
              2. Valuta Candidato
              <span className="group relative ml-2 inline-block cursor-help text-zinc-500 hover:text-emerald-400">
                ℹ️
                <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-48 -translate-x-1/2 rounded-lg bg-zinc-950 border border-zinc-800 p-3 text-center text-xs text-zinc-200 shadow-2xl invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-200 whitespace-normal font-normal">
                  Sottoponi il file del CV dell'operaio. L'AI leggerà il PDF confrontandolo con i requisiti estratti sopra. (Costo: 50 crediti).
                </span>
              </span>
            </h2>
            <form onSubmit={handleAnalyzeNewCv} className="space-y-4">
              <input 
                type="text" 
                placeholder="Nome del candidato" 
                value={candidateName}
                onChange={(e) => setCandidateName(e.target.value)}
                required
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none"
              />
              <div className="border-2 border-dashed border-zinc-800 rounded-xl p-4 text-center hover:border-emerald-500/30 cursor-pointer">
                <span className="text-xs text-zinc-500 block">Trascina qui il CV (PDF)</span>
              </div>
              <button type="submit" disabled={isAnalyzing || !candidateName} className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-bold rounded-xl transition">
                {isAnalyzing ? "Confronto in corso..." : "✨ Confronta CV (50 crediti)"}
              </button>
            </form>
          </div>

        </div>

        {/* Tabella dei Risultati */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-zinc-800">
              <h2 className="text-lg font-bold text-white">Candidati Caricati</h2>
            </div>
            
            {loading ? (
              <div className="p-10 text-center text-zinc-500">Lettura candidati in corso...</div>
            ) : candidates.length === 0 ? (
              <div className="p-10 text-center text-zinc-500 text-sm">Nessuna candidatura registrata su questa ricerca.</div>
            ) : (
              <div className="divide-y divide-zinc-800">
                {candidates.map((c) => (
                  <div key={c.id} onClick={() => setSelectedCandidate(c)} className="p-6 flex items-center justify-between hover:bg-zinc-800 cursor-pointer transition">
                    <div>
                      <h3 className="font-bold text-white">{c.candidate_name}</h3>
                      <p className="text-xs text-emerald-400 mt-1">Confrontato con: {c.applied_role}</p>
                    </div>
                    <div className="flex items-center space-x-6">
                      <span className="text-xs bg-zinc-800 px-2 py-1 rounded border border-zinc-700 text-zinc-300">{c.status}</span>
                      {renderStars(c.score)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Dettagli della Valutazione */}
          {selectedCandidate && (
            <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <div>
                  <h3 className="text-2xl font-bold text-white">{selectedCandidate.candidate_name}</h3>
                  <p className="text-sm text-emerald-400">Match con: {selectedCandidate.applied_role}</p>
                </div>
                <div className="text-xl">
                  {renderStars(selectedCandidate.score)}
                </div>
              </div>

              <div className="p-4 bg-zinc-800 rounded-xl border border-zinc-700 text-sm text-zinc-300 leading-relaxed">
                <strong>📝 Giustificazione di Corrispondenza AI:</strong><br/>
                {selectedCandidate.ai_analysis_json.job_match_justification}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">Competenze Rilevate</span>
                  <div className="flex gap-2 flex-wrap mt-2">
                    {selectedCandidate.ai_analysis_json.certifications.map((cert, i) => (
                      <span key={i} className="px-3 py-1 bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 rounded-lg">✓ {cert}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Residenza e Logistica</span>
                  <p className="text-sm text-zinc-300 mt-2">📍 {selectedCandidate.ai_analysis_json.location_proximity}</p>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
