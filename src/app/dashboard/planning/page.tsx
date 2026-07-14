"use client";

import React, { useState, useEffect } from 'react';
import { useTenant } from '@/app/context/TenantContext';

interface Worker {
  id: string;
  name: string;
}

interface Cantiere {
  id: string;
  customer_name: string;
}

interface Assignment {
  id: string;
  worker_id: string;
  cantiere_id: string;
  scheduled_date: string; // formato YYYY-MM-DD
  notes: string;
  leads?: { customer_name: string };
}

const getEnvVar = (value: string | undefined, fallback: string): string => {
  if (!value || value === "undefined" || value.trim() === "" || value === "null") return fallback;
  return value.replace(/^["']|["']$/g, '').trim();
};

const SUPABASE_URL = getEnvVar(process.env.NEXT_PUBLIC_SUPABASE_URL, "https://hmpxgbzykwwqgfzifdlc.supabase.co").replace(/\/$/, '');
const SUPABASE_ANON_KEY = getEnvVar(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmcHhnYnp5a3d3cWdmemlmZGxjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4MTA0NjAsImV4cCI6MjA5OTM4NjQ2MH0.eAq1O2IOiSRPYewnBTi9xuxeJlPxVa5OIW6f7qN9hIw");

export default function PlanningPage() {
  const { tenant } = useTenant();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [cantieri, setCantieri] = useState<Cantiere[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  // Stati per Modale Assegnazione Turno
  const [showModal, setShowModal] = useState(false);
  const [selectedWorkerId, setSelectedWorkerId] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [formCantiereId, setFormCantiereId] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Genera le date della settimana corrente (da Lunedì a Domenica)
  const [weekDays, setWeekDays] = useState<{ name: string; dateStr: string; label: string }[]>([]);

  useEffect(() => {
    calculateCurrentWeek();
  }, []);

  useEffect(() => {
    if (tenant) {
      fetchData();
    }
  }, [tenant]);

  useEffect(() => {
    if (cantieri.length > 0 && !formCantiereId) {
      setFormCantiereId(cantieri[0].id);
    }
  }, [cantieri, formCantiereId]);

  const calculateCurrentWeek = () => {
    const now = new Date();
    const currentDay = now.getDay();
    // Calcola il lunedì della settimana corrente
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(now);
    monday.setDate(now.getDate() + distanceToMonday);

    const days = [];
    const italianDays = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = d.toISOString().split('T')[0]; // formato YYYY-MM-DD
      const label = d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
      days.push({
        name: italianDays[i],
        dateStr,
        label
      });
    }
    setWeekDays(days);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchWorkers(),
        fetchCantieri(),
        fetchAssignments()
      ]);
    } catch (e) {
      console.error("Errore scaricamento dati planning:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkers = async () => {
    if (!tenant) return;
    const res = await fetch(`${SUPABASE_URL}/rest/v1/workers?tenant_id=eq.${tenant.id}&select=id,name&order=name.asc`, {
      headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
    });
    if (res.ok) setWorkers(await res.json());
  };

  const fetchCantieri = async () => {
    if (!tenant) return;
    const res = await fetch(`${SUPABASE_URL}/rest/v1/leads?tenant_id=eq.${tenant.id}&select=id,customer_name&order=customer_name.asc`, {
      headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
    });
    if (res.ok) setCantieri(await res.json());
  };

  const fetchAssignments = async () => {
    if (!tenant) return;
    const res = await fetch(`${SUPABASE_URL}/rest/v1/worker_assignments?tenant_id=eq.${tenant.id}&select=*,leads(customer_name)`, {
      headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
    });
    if (res.ok) setAssignments(await res.json());
  };

  // Apertura modale per assegnare un turno
  const handleOpenAssignModal = (workerId: string, dateStr: string) => {
    setSelectedWorkerId(workerId);
    setSelectedDate(dateStr);
    setFormNotes('');
    if (cantieri.length > 0) setFormCantiereId(cantieri[0].id);
    setShowModal(true);
  };

  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant || !selectedWorkerId || !selectedDate || !formCantiereId) return;

    const payload = {
      tenant_id: tenant.id,
      worker_id: selectedWorkerId,
      cantiere_id: formCantiereId,
      scheduled_date: selectedDate,
      notes: formNotes
    };

    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/worker_assignments`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setShowModal(false);
        await fetchAssignments();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteAssignment = async (id: string) => {
    if (!confirm("Vuoi rimuovere questo lavoratore dal turno pianificato?")) return;
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/worker_assignments?id=eq.${id}`, {
        method: 'DELETE',
        headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
      });
      if (res.ok) {
        await fetchAssignments();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Funzione helper per trovare l'assegnazione di un determinato lavoratore in una data specifica
  const getAssignment = (workerId: string, dateStr: string) => {
    return assignments.find(a => a.worker_id === workerId && a.scheduled_date === dateStr);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16">
      
      {/* INTESTAZIONE */}
      <div className="border-b border-zinc-800 pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-white">Pianificazione Turni</h1>
        <p className="text-zinc-400 mt-2 text-sm leading-relaxed">
          Pianifica la settimana lavorativa assegnando gli operai ai cantieri attivi e inserendo istruzioni operative per ciascun giorno.
        </p>
      </div>

      {/* GRIGLIA DI PIANIFICAZIONE TRASCINABILE/ALLINEATA (LARGHEZZA INTERA) */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-950/20">
          <h2 className="text-lg font-bold text-white">Calendario Settimanale di Cantiere</h2>
          <span className="text-xs text-emerald-400 font-mono font-bold">Settimana Corrente</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-zinc-500 text-sm">Caricamento del piano settimanale in corso...</div>
        ) : workers.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 text-sm">Nessun dipendente registrato. Registra gli operai per pianificare i turni.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm min-w-[900px]">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950/40 text-zinc-400 font-semibold font-mono text-xs uppercase">
                  <th className="p-4 pl-6 w-[180px]">Dipendente</th>
                  {weekDays.map(day => (
                    <th key={day.dateStr} className="p-4 text-center">
                      <span className="block text-white font-bold">{day.name}</span>
                      <span className="text-[10px] text-zinc-500 block mt-0.5">{day.label}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {workers.map(w => (
                  <tr key={w.id} className="hover:bg-zinc-850/30 transition duration-150">
                    {/* Nome Operaio sulla Sinistra */}
                    <td className="p-4 pl-6 font-bold text-white bg-zinc-900/60 border-r border-zinc-800/80 sticky left-0 z-10">{w.name}</td>
                    
                    {/* Colonne dei Giorni della Settimana */}
                    {weekDays.map(day => {
                      const assign = getAssignment(w.id, day.dateStr);

                      return (
                        <td key={day.dateStr} className="p-4 text-center border-r border-zinc-800 last:border-r-0 min-w-[130px]">
                          {assign ? (
                            // Caso A: Lavoratore già assegnato (Mostra cartellino colorato con cestino)
                            <div className="p-3 bg-zinc-950 border border-zinc-850 rounded-xl space-y-1.5 shadowrelative group">
                              <div className="flex justify-between items-start gap-1">
                                <span className="text-[11px] font-bold text-emerald-400 text-left block leading-tight truncate max-w-[100px]" title={assign.leads?.customer_name}>
                                  {assign.leads?.customer_name}
                                </span>
                                <button 
                                  onClick={() => handleDeleteAssignment(assign.id)}
                                  className="text-[10px] text-zinc-650 hover:text-rose-400 transition-colors shrink-0"
                                  title="Rimuovi dal turno"
                                >
                                  🗑️
                                </button>
                              </div>
                              {assign.notes && (
                                <p className="text-[10px] text-zinc-500 text-left leading-snug italic truncate" title={assign.notes}>
                                  "{assign.notes}"
                                </p>
                              )}
                            </div>
                          ) : (
                            // Caso B: Lavoratore libero (Mostra tasto per assegnare)
                            <button 
                              onClick={() => handleOpenAssignModal(w.id, day.dateStr)}
                              className="w-full py-2 bg-zinc-950 hover:bg-zinc-800 border border-zinc-850 hover:border-zinc-700 text-zinc-500 hover:text-zinc-300 text-xs font-semibold rounded-lg transition-all"
                            >
                              + Assegna
                            </button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* FINESTRA MODALE: ASSEGNAZIONE TURNO DI LAVORO */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-fadeIn">
          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl w-full max-w-md relative space-y-6 shadow-2xl">
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-zinc-400 hover:text-white">✕</button>
            
            <div>
              <h2 className="text-xl font-bold text-white">Assegna Turno di Cantiere</h2>
              <p className="text-xs text-zinc-500 mt-1">Pianifica l'operaio selezionando uno dei cantieri di lavoro attivi della tua azienda.</p>
            </div>

            <form onSubmit={handleSaveAssignment} className="space-y-4">
              
              {/* Cantiere dropdown */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">Seleziona Cantiere</label>
                <select 
                  value={formCantiereId}
                  onChange={(e) => setFormCantiereId(e.target.value)}
                  required
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none cursor-pointer"
                >
                  {cantieri.map(c => (
                    <option key={c.id} value={c.id}>{c.customer_name}</option>
                  ))}
                </select>
              </div>

              {/* Note operative */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">Note Operative / Mansioni</label>
                <textarea 
                  placeholder="Es. Posa pannelli o cablaggi DC..." 
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  rows={3}
                  className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-3 text-sm focus:outline-none resize-none"
                />
              </div>

              {/* Bottoni finali */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-zinc-800">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="text-xs bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 font-bold px-4 py-2.5 rounded-xl transition-all"
                >
                  Annulla
                </button>
                <button 
                  type="submit" 
                  className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-xl transition-all shadow shadow-emerald-950/20"
                >
                  Pianifica Turno
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
