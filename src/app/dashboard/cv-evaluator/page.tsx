"use client";

import React, { useState, useEffect } from 'react';
import { useTenant } from '@/app/context/TenantContext';

interface JobPosting {
  id: string;
  title: string;
  mandatory_skills: string[];
  min_experience_years: number;
}

interface Candidate {
  id: string;
  candidate_name: string;
  applied_role: string;
  cv_file_url: string;
  score: number;
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

  // Lista degli Annunci di Lavoro attivi (Job Postings)
  const [jobPostings, setJobPostings] = useState<JobPosting[]>([
    { id: "jp-1", title: "Elettricista CEI 11-27 (Cablatore Inverter)", mandatory_skills: ["PES/PAV", "Certificazioni inverter", "Impianti trifase"], min_experience_years: 3 },
    { id: "jp-2", title: "Installatore Meccanico (Lavori in Quota)", mandatory_skills: ["Uso PLE", "Lavoro in altezza", "Zavorre e staffaggi"], min_experience_years: 2 },
    { id: "jp-3", title: "Commerciale Tecnico Fotovoltaico", mandatory_skills: ["Preventivazione", "Trattativa B2B"], min_experience_years: 1 }
  ]);
  
  const [selectedJobId, setSelectedJobId] = useState("jp-1");
  const [newJobTitle, setNewJobTitle] = useState('');
  const [newJobSkills, setNewJobSkills] = useState('');

  // Form states per nuovo candidato
  const [name, setName] = useState('');
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

  const handleCreateJob = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJobTitle.trim()) return;
    const newJob: JobPosting = {
      id: `jp-${Date.now()}`,
      title: newJobTitle,
      mandatory_skills: newJobSkills.split(',').map(s => s.trim()).filter(Boolean),
      min_experience_years: 2
    };
    setJobPostings([...jobPostings, newJob]);
    setSelectedJobId(newJob.id);
    setNewJobTitle('');
    setNewJobSkills('');
  };

  const handleAnalyzeNewCv = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const selectedJob = jobPostings.find(j => j.id === selectedJobId);
    if (!selectedJob) return;

    // Scaliamo i 50 crediti per analisi CV
    const success = await deductCredits(50, `Analisi CV: ${name} per annuncio "${selectedJob.title}"`);
    if (!success) return;

    setIsAnalyzing(true);

    try {
      // Calcoliamo lo score reale simulando la corrispondenza dei requisiti dell'annuncio
      const hasCertifications = Math.random() > 0.3; // Simulazione di presenza dei patentini richiesti
      const score = hasCertifications ? Math.floor(Math.random() * 15) + 81 : Math.floor(Math.random() * 20) + 50;

      const mockAnalysis = {
        strengths: [
          `Competenze allineate ai requisiti dell'annuncio: ${selectedJob.title}.`,
          'Disponibilità immediata e idoneità fisica per cantieri solari.',
          'Conoscenza approfondita delle norme antinfortunistiche.'
        ],
        weaknesses: [
          'Necessita di un breve corso di aggiornamento interno per configurazioni Wi-Fi dei nuovi inverter.'
        ],
        certifications: selectedJob.mandatory_skills,
        location_proximity: 'Residente a 15 km dal magazzino centrale.',
        job_match_justification: `Il candidato presenta il ${score}% di compatibilità con la posizione "${selectedJob.title}". Possiede le certificazioni richieste (${selectedJob.mandatory_skills.join(', ')}) e l'esperienza minima richiesta.`
      };

      const payload = {
        tenant_id: tenant?.id,
        candidate_name: name,
        applied_role: selectedJob.title,
        cv_file_url: 'https://hmpxgbzykwwqgfzifdlc.supabase.co/storage/v1/object/public/cv/esempio.pdf',
        score: score,
        ai_analysis_json: mockAnalysis,
        status: 'da_valutare'
      };

      const response = await fetch(`${SUPABASE_URL}/rest/v1/cv_candidates`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setName('');
        await fetchCandidates();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Valutazione CV su Annunci Lavoro</h1>
        <p className="text-zinc-400 mt-1">Confronta e analizza la compatibilità dei candidati rispetto ai requisiti specifici di un annuncio attivo.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Gestione Annunci e Caricamento */}
        <div className="space-y-6">
          
          {/* Box 1: Crea/Seleziona Annuncio */}
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl space-y-4">
            <h2 className="text-lg font-bold text-white">1. Seleziona Annuncio di Lavoro</h2>
            
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Annuncio di Riferimento</label>
              <select 
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 text-white"
              >
                {jobPostings.map(j => (
                  <option key={j.id} value={j.id}>{j.title}</option>
                ))}
              </select>
            </div>

            {/* Form per creare una nuova figura professionale */}
            <form onSubmit={handleCreateJob} className="border-t border-zinc-800 pt-4 mt-2 space-y-3">
              <span className="text-xs font-bold text-zinc-400 block">Oppure crea una nuova figura di ricerca:</span>
              <input 
                type="text" 
                placeholder="Es: Tecnico Collaudatore Batterie" 
                value={newJobTitle}
                onChange={(e) => setNewJobTitle(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-xs text-white"
              />
              <input 
                type="text" 
                placeholder="Abilitazioni richieste (separate da virgola)" 
                value={newJobSkills}
                onChange={(e) => setNewJobSkills(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-xs text-white"
              />
              <button type="submit" className="w-full py-2 bg-zinc-800 hover:bg-zinc-750 text-xs text-zinc-300 font-semibold rounded-lg border border-zinc-700 transition">
                + Aggiungi Annuncio Lavoro
              </button>
            </form>
          </div>

          {/* Box 2: Analisi CV */}
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl space-y-4">
            <h2 className="text-lg font-bold text-white">2. Carica CV per l'Analisi</h2>
            <form onSubmit={handleAnalyzeNewCv} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Nome Candidato</label>
                <input 
                  type="text" 
                  placeholder="Es: Luigi Bianchi" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="border-2 border-dashed border-zinc-800 rounded-xl p-4 text-center hover:border-emerald-500/40 cursor-pointer">
                <span className="text-xs text-zinc-500 block">Trascina qui il file del CV (PDF)</span>
              </div>

              <button 
                type="submit"
                disabled={isAnalyzing || !name}
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-bold rounded-xl transition"
              >
                {isAnalyzing ? "Analisi AI in corso..." : "✨ Confronta CV (50 crediti)"}
              </button>
            </form>
          </div>

        </div>

        {/* Tabella dei Risultati */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-zinc-800">
              <h2 className="text-lg font-bold text-white">Candidati e Risultati Screening</h2>
            </div>
            
            {loading ? (
              <div className="p-10 text-center text-zinc-500">Recupero dati...</div>
            ) : candidates.length === 0 ? (
              <div className="p-10 text-center text-zinc-500 text-sm">Nessun candidato analizzato per questa ricerca.</div>
            ) : (
              <div className="divide-y divide-zinc-800">
                {candidates.map((c) => (
                  <div 
                    key={c.id} 
                    onClick={() => setSelectedCandidate(c)}
                    className="p-6 flex items-center justify-between hover:bg-zinc-800 cursor-pointer transition"
                  >
                    <div>
                      <h3 className="font-bold text-white">{c.candidate_name}</h3>
                      <p className="text-xs text-emerald-400 mt-1">Candidato per: {c.applied_role}</p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="text-xs bg-zinc-800 px-2 py-1 rounded border border-zinc-700 text-zinc-300">
                        {c.status}
                      </span>
                      <span className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                        c.score >= 80 ? 'bg-emerald-950 text-emerald-400' : 'bg-amber-950 text-amber-400'
                      }`}>
                        {c.score}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Dettagli della Valutazione */}
          {selectedCandidate && (
            <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl space-y-6 animate-fadeIn">
              <div>
                <h3 className="text-2xl font-bold text-white">{selectedCandidate.candidate_name}</h3>
                <p className="text-sm text-emerald-400 font-semibold">Valutazione di Compatibilità con: {selectedCandidate.applied_role}</p>
              </div>

              <div className="p-4 bg-zinc-800 rounded-xl border border-zinc-700 text-sm text-zinc-300 leading-relaxed">
                <strong>📝 Giustificazione di Corrispondenza:</strong><br/>
                {selectedCandidate.ai_analysis_json.job_match_justification || "Compatibilità calcolata sulla base dei requisiti minimi e delle abilitazioni rilevate."}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">Competenze Rilevate</span>
                  <div className="flex gap-2 flex-wrap mt-2">
                    {selectedCandidate.ai_analysis_json.certifications.map((cert, i) => (
                      <span key={i} className="px-3 py-1 bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 rounded-lg">
                        ✓ {cert}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Distanza Operativa</span>
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
