"use client";

import React, { useState, useEffect } from 'react';
import { useTenant } from '../../../context/TenantContext';

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
  };
  status: string;
  created_at: string;
}

const SUPABASE_URL = "https://hmpxgbzykwwqgfzifdlc.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtcHhnYnp5a3d3cWdmemlmZGxjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4MTA0NjAsImV4cCI6MjA5OTM4NjQ2MH0.eAq1O2IOiSRPYewnBTi9xuxeJlPxVa5OIW6f7qN9hIw";

export default function CvEvaluator() {
  const { tenant, deductCredits } = useTenant();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

  // Form states per nuovo inserimento
  const [name, setName] = useState('');
  const [role, setRole] = useState('Installatore Senior');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    fetchCandidates();
  }, [tenant]);

  // Recupera i candidati da Supabase
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
      console.error("Errore nel recupero dei candidati:", err);
    } finally {
      setLoading(false);
    }
  };

  // Aggiorna lo stato di un candidato (es. da valutare -> colloquio)
  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/cv_candidates?id=eq.${id}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        setCandidates(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c));
        if (selectedCandidate && selectedCandidate.id === id) {
          setSelectedCandidate(prev => prev ? { ...prev, status: newStatus } : null);
        }
      }
    } catch (err) {
      console.error("Errore durante l'aggiornamento dello stato:", err);
    }
  };

  // Simula il parsing AI ed inserisce i dati su Supabase scalandone 50 crediti
  const handleAnalyzeNewCv = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Controllo e scalata crediti
    const success = await deductCredits(50, `Analisi CV AI: ${name} (${role})`);
    if (!success) return;

    setIsAnalyzing(true);

    try {
      // Generazione dati fittizi realistici dell'AI per il caricamento
      const randomScore = Math.floor(Math.random() * 30) + 65; // Punteggio realistico tra 65 e 95
      const mockAnalysis = {
        strengths: [
          role === 'Installatore Senior' ? 'Esperienza decennale nel montaggio di strutture zavorrate e staffe per tetti in tegole.' : 'Abilitazione alla firma di conformità impianti civili ed industriali.',
          'Ottima manualità, abitudine a lavorare ad altezza elevata.',
          'Disponibilità immediata a trasferte regionali.'
        ],
        weaknesses: [
          'Scarsa confidenza con software di monitoraggio inverter da remoto.',
          'Richiede affiancamento per la prima configurazione di sistemi di accumulo Tesla Powerwall.'
        ],
        certifications: [
          'Certificazione PES/PAV (CEI 11-27)',
          'Abilitazione all\'uso di piattaforme aeree (PLE)'
        ],
        location_proximity: 'Molto vicino (Abita a soli 12km dal tuo magazzino principale)'
      };

      const payload = {
        tenant_id: tenant?.id,
        candidate_name: name,
        applied_role: role,
        cv_file_url: 'https://hmpxgbzykwwqgfzifdlc.supabase.co/storage/v1/object/public/cv/esempio.pdf',
        score: randomScore,
        ai_analysis_json: mockAnalysis,
        status: 'da_valutare'
      };

      // Inseriamo il record su Supabase
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
        await fetchCandidates(); // Ricarica la lista dal DB
      }
    } catch (err) {
      console.error("Errore durante l'inserimento del candidato:", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Valutazione CV</h1>
        <p className="text-zinc-400 mt-1">Carica e analizza i curriculum dei candidati con l'AI. Filtra le competenze specifiche per il fotovoltaico.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Pannello Caricamento CV */}
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl h-fit space-y-6">
          <h2 className="text-lg font-bold text-white">Analizza Nuovo Candidato</h2>
          
          <form onSubmit={handleAnalyzeNewCv} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Nome Candidato</label>
              <input 
                type="text" 
                placeholder="Es: Mario Rossi" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-zinc-850 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 text-white"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Ruolo Candidato</label>
              <select 
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-zinc-850 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 text-white"
              >
                <option value="Installatore Senior">Installatore Senior (Tetti)</option>
                <option value="Elettricista di Cantiere">Elettricista di Cantiere (Cablaggi)</option>
                <option value="Commerciale Tecnico">Commerciale Tecnico (Vendite)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">File Curriculum (PDF)</label>
              <div className="border-2 border-dashed border-zinc-800 rounded-xl p-6 text-center hover:border-emerald-500/40 transition cursor-pointer">
                <span className="text-sm text-zinc-500 block">Sfoglia o trascina qui il file CV</span>
                <span className="text-xs text-zinc-600 mt-1 block">Dimensione max 10MB</span>
              </div>
            </div>

            <button 
              type="submit"
              disabled={isAnalyzing || !name}
              className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-bold rounded-xl transition duration-200"
            >
              {isAnalyzing ? "Analisi in corso..." : "✨ Analizza CV (50 crediti)"}
            </button>
          </form>
        </div>

        {/* Lista Candidati e Dettaglio */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-zinc-800">
              <h2 className="text-lg font-bold text-white">Candidati Caricati</h2>
            </div>
            
            {loading ? (
              <div className="p-10 text-center text-zinc-500 text-sm">Caricamento candidati in corso...</div>
            ) : candidates.length === 0 ? (
              <div className="p-10 text-center text-zinc-500 text-sm">Nessun candidato caricato. Esegui il tuo primo screening.</div>
            ) : (
              <div className="divide-y divide-zinc-800">
                {candidates.map((candidate) => (
                  <div 
                    key={candidate.id} 
                    onClick={() => setSelectedCandidate(candidate)}
                    className="p-6 flex items-center justify-between hover:bg-zinc-850 cursor-pointer transition"
                  >
                    <div>
                      <h3 className="font-bold text-white">{candidate.candidate_name}</h3>
                      <p className="text-xs text-zinc-400 mt-1">{candidate.applied_role} &bull; Caricato il {new Date(candidate.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        candidate.status === 'assunto' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50' :
                        candidate.status === 'colloquio' ? 'bg-amber-950 text-amber-400 border border-amber-800/50' :
                        candidate.status === 'scartato' ? 'bg-red-950 text-red-400 border border-red-800/50' :
                        'bg-zinc-850 text-zinc-400 border border-zinc-800'
                      }`}>
                        {candidate.status.replace('_', ' ')}
                      </span>
                      <span className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                        candidate.score >= 80 ? 'bg-emerald-950 text-emerald-400' : 'bg-amber-950 text-amber-400'
                      }`}>
                        {candidate.score}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Dettagli AI del Candidato Selezionato */}
          {selectedCandidate && (
            <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <div>
                  <h3 className="text-2xl font-bold text-white">{selectedCandidate.candidate_name}</h3>
                  <p className="text-sm text-zinc-400">{selectedCandidate.applied_role}</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleUpdateStatus(selectedCandidate.id, 'colloquio')}
                    className="px-4 py-2 bg-amber-950 text-amber-400 hover:bg-amber-900 border border-amber-800 text-xs font-semibold rounded-lg transition"
                  >
                    Sposta a Colloquio
                  </button>
                  <button 
                    onClick={() => handleUpdateStatus(selectedCandidate.id, 'assunto')}
                    className="px-4 py-2 bg-emerald-950 text-emerald-400 hover:bg-emerald-900 border border-emerald-800 text-xs font-semibold rounded-lg transition"
                  >
                    Imposta come Assunto
                  </button>
                  <button 
                    onClick={() => handleUpdateStatus(selectedCandidate.id, 'scartato')}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-750 text-zinc-400 text-xs font-semibold rounded-lg transition"
                  >
                    Scarta
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">Punti di Forza AI</span>
                  <ul className="text-sm text-zinc-300 space-y-2 list-disc pl-4">
                    {selectedCandidate.ai_analysis_json.strengths.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
                
                <div className="space-y-2">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Punti di Attenzione</span>
                  <ul className="text-sm text-zinc-400 space-y-2 list-disc pl-4">
                    {selectedCandidate.ai_analysis_json.weaknesses.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </div>

                <div className="space-y-2 md:col-span-2 pt-4 border-t border-zinc-800/60">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Abilitazioni e Sicurezza Rilevate nel CV</span>
                  <div className="flex gap-2 flex-wrap mt-2">
                    {selectedCandidate.ai_analysis_json.certifications.map((c, i) => (
                      <span key={i} className="px-3 py-1 bg-zinc-850 border border-zinc-800 text-xs font-medium text-zinc-300 rounded-lg">
                        🛡️ {c}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="space-y-1 md:col-span-2 pt-4 border-t border-zinc-800/60">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Vicinanza Geografica</span>
                  <p className="text-sm text-zinc-300">📍 {selectedCandidate.ai_analysis_json.location_proximity}</p>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
