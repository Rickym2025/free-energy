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

interface AttendanceRecord {
  id: string;
  worker_id: string;
  cantiere_id: string;
  check_in_time: string | null;
  check_out_time: string | null;
  distance_meters: number | null;
  is_valid_distance: boolean;
  created_at: string;
  workers?: { name: string };
  leads?: { customer_name: string };
}

const getEnvVar = (value: string | undefined, fallback: string): string => {
  if (!value || value === "undefined" || value.trim() === "" || value === "null") return fallback;
  return value.replace(/^["']|["']$/g, '').trim();
};

const SUPABASE_URL = getEnvVar(process.env.NEXT_PUBLIC_SUPABASE_URL, "https://hmpxgbzykwwqgfzifdlc.supabase.co").replace(/\/$/, '');
const SUPABASE_ANON_KEY = getEnvVar(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmcHhnYnp5a3d3cWdmemlmZGxjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4MTA0NjAsImV4cCI6MjA5OTM4NjQ2MH0.eAq1O2IOiSRPYewnBTi9xuxeJlPxVa5OIW6f7qN9hIw");

export default function AttendancePage() {
  const { tenant } = useTenant();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [cantieri, setCantieri] = useState<Cantiere[]>([]);
  const [loading, setLoading] = useState(true);

  // Stati per Modali (Inserimento / Modifica)
  const [showModal, setShowModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);

  // Campi del form
  const [formWorkerId, setFormWorkerId] = useState('');
  const [formCantiereId, setFormCantiereId] = useState('');
  const [formCheckIn, setFormCheckIn] = useState('');
  const [formCheckOut, setFormCheckOut] = useState('');
  const [formIsValidDistance, setFormIsValidDistance] = useState(true);

  useEffect(() => {
    if (tenant) {
      fetchData();
    }
  }, [tenant]);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchAttendance(),
        fetchWorkers(),
        fetchCantieri()
      ]);
    } catch (err) {
      console.error("Errore caricamento presenze:", err);
    } finally {
      setLoading(false);
    }
  };

  // 1. Scarica Registro Timbrature (Esegue un JOIN implicito con workers e leads)
  const fetchAttendance = async () => {
    if (!tenant) return;
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/worker_attendance?tenant_id=eq.${tenant.id}&select=*,workers(name),leads(customer_name)&order=created_at.desc`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      }
    );
    if (response.ok) {
      const data = await response.json();
      setRecords(data);
    }
  };

  // 2. Scarica Anagrafica Operai per i menu a tendina
  const fetchWorkers = async () => {
    if (!tenant) return;
    const response = await fetch(`${SUPABASE_URL}/rest/v1/workers?tenant_id=eq.${tenant.id}&select=id,name`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });
    if (response.ok) {
      const data = await response.json();
      setWorkers(data);
    }
  };

  // 3. Scarica Cantieri Attivi (leads) per i menu a tendina
  const fetchCantieri = async () => {
    if (!tenant) return;
    const response = await fetch(`${SUPABASE_URL}/rest/v1/leads?tenant_id=eq.${tenant.id}&select=id,customer_name`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });
    if (response.ok) {
      const data = await response.json();
      setCantieri(data);
    }
  };

  // Apertura modale per NUOVO inserimento manuale
  const handleOpenCreateModal = () => {
    setEditingRecord(null);
    setFormWorkerId(workers[0]?.id || '');
    setFormCantiereId(cantieri[0]?.id || '');
    setFormCheckIn(new Date().toISOString().substring(0, 16));
    setFormCheckOut('');
    setFormIsValidDistance(true);
    setShowModal(true);
  };

  // Apertura modale per MODIFICA record esistente
  const handleOpenEditModal = (rec: AttendanceRecord) => {
    setEditingRecord(rec);
    setFormWorkerId(rec.worker_id);
    setFormCantiereId(rec.cantiere_id);
    setFormCheckIn(rec.check_in_time ? rec.check_in_time.substring(0, 16) : '');
    setFormCheckOut(rec.check_out_time ? rec.check_out_time.substring(0, 16) : '');
    setFormIsValidDistance(rec.is_valid_distance);
    setShowModal(true);
  };

  // Invio Form (Salva Nuovo o Aggiorna Esistente)
  const handleSaveRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant || !formWorkerId || !formCantiereId || !formCheckIn) return;

    const payload = {
      tenant_id: tenant.id,
      worker_id: formWorkerId,
      cantiere_id: formCantiereId,
      check_in_time: new Date(formCheckIn).toISOString(),
      check_out_time: formCheckOut ? new Date(formCheckOut).toISOString() : null,
      is_valid_distance: formIsValidDistance,
      distance_meters: formIsValidDistance ? 0 : 500 // Imposta distanza fittizia se non valido
    };

    try {
      let res;
      if (editingRecord) {
        // MODIFICA (PATCH)
        res = await fetch(`${SUPABASE_URL}/rest/v1/worker_attendance?id=eq.${editingRecord.id}`, {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
      } else {
        // CREAZIONE MANUALE (POST)
        res = await fetch(`${SUPABASE_URL}/rest/v1/worker_attendance`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        setShowModal(false);
        await fetchAttendance();
      }
    } catch (err) {
      console.error("Errore salvataggio timbratura:", err);
    }
  };

  // Eliminazione manuale record
  const handleDeleteRecord = async (id: string) => {
    if (!confirm("Sei sicuro di voler eliminare definitivamente questa registrazione?")) return;

    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/worker_attendance?id=eq.${id}`, {
        method: 'DELETE',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      });
      if (res.ok) {
        setShowModal(false);
        await fetchAttendance();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const formatDateTime = (isoString: string | null) => {
    if (!isoString) return "-";
    const date = new Date(isoString);
    return date.toLocaleString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  // Calcolo delle statistiche rapide
  const activeWorkersCount = records.filter(r => r.check_out_time === null).length;
  const alertCount = records.filter(r => !r.is_valid_distance).length;

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16">
      
      {/* INTESTAZIONE E COMPORTAMENTI RAPIDI */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-800 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Registro Presenze</h1>
          <p className="text-zinc-400 mt-2 text-sm leading-relaxed">
            Monitora in tempo reale gli ingressi e le uscite degli operai dai cantieri tramite il Bot di Telegram aziendale.
          </p>
        </div>
        <button 
          onClick={handleOpenCreateModal}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm py-3 px-6 rounded-xl transition duration-200 shadow-lg shadow-emerald-950/20 shrink-0"
        >
          ➕ Aggiungi Timbratura Manuale
        </button>
      </div>

      {/* STATISTICHE RAPIDE */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-xl space-y-2">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block font-mono">Operai in Cantiere Ora</span>
          <span className="text-3xl font-black text-emerald-400 block">{activeWorkersCount}</span>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-xl space-y-2">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block font-mono">Alert GPS Rilevati</span>
          <span className="text-3xl font-black text-rose-400 block">{alertCount}</span>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-xl space-y-2">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block font-mono">Totale Registrazioni</span>
          <span className="text-3xl font-black text-white block">{records.length}</span>
        </div>
      </div>

      {/* TABELLA REGISTRO TIMBRATURE (LARGHEZZA INTERA) */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-6 border-b border-zinc-800">
          <h2 className="text-lg font-bold text-white">Log di Ingresso/Uscita dei Lavoratori</h2>
        </div>

        {loading ? (
          <div className="p-12 text-center text-zinc-500 text-sm">Caricamento presenze in corso...</div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 text-sm">Nessuna timbratura registrata oggi.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950/40 text-zinc-400 font-semibold font-mono text-xs uppercase">
                  <th className="p-4 pl-6">Dipendente</th>
                  <th className="p-4">Cantiere</th>
                  <th className="p-4">Ingresso (Check-In)</th>
                  <th className="p-4">Uscita (Check-Out)</th>
                  <th className="p-4">Stato GPS</th>
                  <th className="p-4 pr-6 text-right">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {records.map((rec) => (
                  <tr key={rec.id} className="hover:bg-zinc-850/50 transition duration-150">
                    <td className="p-4 pl-6 font-bold text-white">{rec.workers?.name || "Lavoratore Eliminato"}</td>
                    <td className="p-4 text-zinc-300">{rec.leads?.customer_name || "Cantiere Eliminato"}</td>
                    <td className="p-4 text-zinc-300 font-semibold">{formatDateTime(rec.check_in_time)}</td>
                    <td className="p-4 text-zinc-300">
                      {rec.check_out_time ? (
                        <span className="font-semibold">{formatDateTime(rec.check_out_time)}</span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 text-[10px] font-extrabold uppercase bg-emerald-950 text-emerald-400 border border-emerald-800 rounded">In Cantiere</span>
                      )}
                    </td>
                    <td className="p-4">
                      {rec.is_valid_distance ? (
                        <span className="inline-block px-2.5 py-1 text-[10px] font-bold bg-emerald-950/40 text-emerald-400 border border-emerald-800/50 rounded-lg">📍 Verificata</span>
                      ) : (
                        <span className="inline-block px-2.5 py-1 text-[10px] font-bold bg-rose-950/40 text-rose-400 border border-rose-800/50 rounded-lg" title={`Distanza: ${Math.round(rec.distance_meters || 0)} metri`}>
                          ⚠️ Alert ({Math.round(rec.distance_meters || 0)}m)
                        </span>
                      )}
                    </td>
                    <td className="p-4 pr-6 text-right">
                      <button 
                        onClick={() => handleOpenEditModal(rec)}
                        className="text-xs bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-semibold px-3 py-1.5 rounded-lg transition-colors"
                      >
                        ⚙️ Modifica / Rettifica
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* COMPORTAMENTO MODALE: REGISTRAZIONE MANUALE / RETTIFICA */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-fadeIn">
          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl w-full max-w-lg relative space-y-6 shadow-2xl">
            
            <button 
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white"
            >
              ✕
            </button>

            <div>
              <h2 className="text-xl font-bold text-white">
                {editingRecord ? "Modifica e Rettifica Timbratura" : "Nuova Timbratura Manuale"}
              </h2>
              <p className="text-xs text-zinc-500 mt-1">Inserisci o rettifica l'orario di cantiere per correggere errori o dimenticanze dell'operaio.</p>
            </div>

            <form onSubmit={handleSaveRecord} className="space-y-4">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Operaio dropdown */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-450 uppercase tracking-wider block">Dipendente</label>
                  <select 
                    value={formWorkerId}
                    onChange={(e) => setFormWorkerId(e.target.value)}
                    disabled={!!editingRecord}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none cursor-pointer"
                  >
                    {workers.map(w => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>

                {/* Cantiere dropdown */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-450 uppercase tracking-wider block">Cantiere di lavoro</label>
                  <select 
                    value={formCantiereId}
                    onChange={(e) => setFormCantiereId(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none cursor-pointer"
                  >
                    {cantieri.map(c => (
                      <option key={c.id} value={c.id}>{c.customer_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Check In Time */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-450 uppercase tracking-wider block">Orario d'Ingresso (Check-In)</label>
                  <input 
                    type="datetime-local" 
                    value={formCheckIn}
                    onChange={(e) => setFormCheckIn(e.target.value)}
                    required
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none"
                  />
                </div>

                {/* Check Out Time */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-450 uppercase tracking-wider block">Orario d'Uscita (Check-Out)</label>
                  <input 
                    type="datetime-local" 
                    value={formCheckOut}
                    onChange={(e) => setFormCheckOut(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Distanza valida toggle */}
              <div className="flex items-center space-x-3 pt-2">
                <input 
                  type="checkbox" 
                  id="validDistance"
                  checked={formIsValidDistance}
                  onChange={(e) => setFormIsValidDistance(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-800 bg-zinc-950 text-emerald-500 focus:ring-transparent focus:ring-offset-0 cursor-pointer"
                />
                <label htmlFor="validDistance" className="text-xs text-zinc-400 cursor-pointer uppercase font-mono tracking-wider font-semibold">
                  Sblocca GPS (Convalida la distanza dal cantiere come corretta)
                </label>
              </div>

              {/* Pulsanti finali */}
              <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
                {editingRecord ? (
                  <button 
                    type="button"
                    onClick={() => handleDeleteRecord(editingRecord.id)}
                    className="text-xs bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-400 font-bold px-4 py-2.5 rounded-xl transition-all"
                  >
                    🗑️ Elimina Timbratura
                  </button>
                ) : (
                  <div />
                )}
                
                <div className="flex space-x-3">
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
                    {editingRecord ? "Salva Rettifica" : "Registra Presenza"}
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
