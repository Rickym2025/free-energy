"use client";

import React, { useState, useEffect } from 'react';
import { useTenant } from '@/app/context/TenantContext';

interface Worker {
  id: string;
  name: string;
  telegram_chat_id?: string;
  created_at?: string;
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

interface Rapportino {
  id: string;
  tenant_id: string;
  worker_id: string;
  cantiere_id: string;
  photo_url: string;
  notes: string;
  created_at: string;
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
  const [activeTab, setActiveTab] = useState<'timbrature' | 'dipendenti'>('timbrature');
  
  // Dati scaricati dal database
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [cantieri, setCantieri] = useState<Cantiere[]>([]);
  const [rapportini, setRapportini] = useState<Rapportino[]>([]);
  const [loading, setLoading] = useState(true);

  // Stato per il lavoratore attualmente selezionato per visualizzare il suo storico personale
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);

  // Stato per ingrandire la foto del rapportino a schermo intero (Lightbox)
  const [fullscreenPhotoUrl, setFullscreenPhotoUrl] = useState<string | null>(null);

  // Stati per Modale (Rettifica / Inserimento)
  const [showModal, setShowModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);

  // Campi del form di timbratura manuale
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

  // Risolve il bug del lifecycle: seleziona automaticamente il primo operaio non appena caricato
  useEffect(() => {
    if (workers.length > 0 && !formWorkerId) {
      setFormWorkerId(workers[0].id);
    }
  }, [workers]);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchAttendance(),
        fetchWorkers(),
        fetchCantieri(),
        fetchRapportini()
      ]);
    } catch (err) {
      console.error("Errore scaricamento dati presenze:", err);
    } finally {
      setLoading(false);
    }
  };

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

  const fetchWorkers = async () => {
    if (!tenant) return;
    const response = await fetch(`${SUPABASE_URL}/rest/v1/workers?tenant_id=eq.${tenant.id}&select=*&order=name.asc`, {
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
      if (data.length > 0) setFormCantiereId(data[0].id);
    }
  };

  // Carica i Rapportini di fine giornata inviati su Telegram
  const fetchRapportini = async () => {
    if (!tenant) return;
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/rapportini?tenant_id=eq.${tenant.id}&select=*,leads(customer_name)&order=created_at.desc`,
        {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          }
        }
      );
      if (response.ok) {
        const data = await response.json();
        setRapportini(data);
      }
    } catch (e) {
      console.error("Errore fetch rapportini:", e);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingRecord(null);
    setFormWorkerId(workers[0]?.id || '');
    setFormCantiereId(cantieri[0]?.id || '');
    setFormCheckIn(new Date().toISOString().substring(0, 16));
    setFormCheckOut('');
    setFormIsValidDistance(true);
    setShowModal(true);
  };

  const handleOpenEditModal = (rec: AttendanceRecord) => {
    setEditingRecord(rec);
    setFormWorkerId(rec.worker_id);
    setFormCantiereId(rec.cantiere_id);
    setFormCheckIn(rec.check_in_time ? rec.check_in_time.substring(0, 16) : '');
    setFormCheckOut(rec.check_out_time ? rec.check_out_time.substring(0, 16) : '');
    setFormIsValidDistance(rec.is_valid_distance);
    setShowModal(true);
  };

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
      distance_meters: formIsValidDistance ? 0 : 500
    };

    try {
      let res;
      if (editingRecord) {
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
      console.error(err);
    }
  };

  const handleDeleteRecord = async (id: string) => {
    if (!confirm("Sei sicuro di voler eliminare questa timbratura?")) return;
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

  const getWorkerRecords = (workerId: string) => {
    return records.filter(r => r.worker_id === workerId);
  };

  const getWorkerRapportini = (workerId: string) => {
    return rapportini.filter(r => r.worker_id === workerId);
  };

  const activeWorkersCount = records.filter(r => r.check_out_time === null).length;
  const alertCount = records.filter(r => !r.is_valid_distance).length;

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16">
      
      {/* INTESTAZIONE */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-800 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Registro Presenze & Rapportini</h1>
          <p className="text-zinc-400 mt-2 text-sm leading-relaxed">
            Gestisci in modo centralizzato gli orari d'ingresso, le uscite e le foto dei rapportini giornalieri inviati dagli operai in cantiere.
          </p>
        </div>
        <button 
          onClick={handleOpenCreateModal}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm py-3 px-6 rounded-xl transition duration-200 shadow-lg shrink-0"
        >
          ➕ Timbratura Manuale
        </button>
      </div>

      {/* SCHEDE PRINCIPALI (TAB) */}
      <div className="flex space-x-2 bg-zinc-950 p-1.5 rounded-xl border border-zinc-850 w-full md:w-fit">
        <button 
          onClick={() => { setActiveTab('timbrature'); setSelectedWorker(null); }} 
          className={`flex-1 md:flex-initial py-2.5 px-6 text-xs font-bold rounded-lg transition-all ${activeTab === 'timbrature' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-400 hover:text-zinc-200'}`}
        >
          🕒 Registro Timbrature
        </button>
        <button 
          onClick={() => { setActiveTab('dipendenti'); setSelectedWorker(null); }} 
          className={`flex-1 md:flex-initial py-2.5 px-6 text-xs font-bold rounded-lg transition-all ${activeTab === 'dipendenti' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-400 hover:text-zinc-200'}`}
        >
          👥 Anagrafica Dipendenti
        </button>
      </div>

      {/* SCHEDA 1: REGISTRO TIMBRATURE */}
      {activeTab === 'timbrature' && (
        <div className="space-y-8 animate-fadeIn">
          {/* STATISTICHE VELOCI */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-xl space-y-1">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider block font-mono">Dipendenti in Cantiere Ora</span>
              <span className="text-3xl font-black text-emerald-400 block">{activeWorkersCount}</span>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-xl space-y-1">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider block font-mono">Alert GPS Rilevati</span>
              <span className="text-3xl font-black text-rose-400 block">{alertCount}</span>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-xl space-y-1">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider block font-mono">Totale Timbrature</span>
              <span className="text-3xl font-black text-white block">{records.length}</span>
            </div>
          </div>

          {/* TABELLA LOG REGISTRO */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-6 border-b border-zinc-800">
              <h2 className="text-lg font-bold text-white">Registro d'Ingresso e Uscita Giornaliero</h2>
            </div>
            {loading ? (
              <div className="p-12 text-center text-zinc-500 text-sm">Caricamento log presenze in corso...</div>
            ) : records.length === 0 ? (
              <div className="p-12 text-center text-zinc-500 text-sm">Nessuna timbratura registrata nel database.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-zinc-950/40 text-zinc-400 font-semibold font-mono text-xs uppercase">
                      <th className="p-4 pl-6">Dipendente</th>
                      <th className="p-4">Cantiere Associato</th>
                      <th className="p-4">Timbratura Ingresso</th>
                      <th className="p-4">Timbratura Uscita</th>
                      <th className="p-4">Convalida GPS</th>
                      <th className="p-4 pr-6 text-right">Rettifica</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {records.map((rec) => (
                      <tr key={rec.id} className="hover:bg-zinc-850/50 transition duration-150">
                        <td className="p-4 pl-6 font-bold text-white">{rec.workers?.name || "Lavoratore rimosso"}</td>
                        <td className="p-4 text-zinc-300">{rec.leads?.customer_name || "Cantiere rimosso"}</td>
                        <td className="p-4 text-zinc-300 font-semibold">{formatDateTime(rec.check_in_time)}</td>
                        <td className="p-4 text-zinc-300">
                          {rec.check_out_time ? (
                            <span className="font-semibold">{formatDateTime(rec.check_out_time)}</span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 text-[10px] font-extrabold uppercase bg-emerald-950 text-emerald-400 border border-emerald-800 rounded">Al Lavoro</span>
                          )}
                        </td>
                        <td className="p-4">
                          {rec.is_valid_distance ? (
                            <span className="inline-block px-2.5 py-1 text-[10px] font-bold bg-emerald-950/40 text-emerald-400 border border-emerald-800/50 rounded-lg">📍 Valida</span>
                          ) : (
                            <span className="inline-block px-2.5 py-1 text-[10px] font-bold bg-rose-950/40 text-rose-400 border border-rose-800/50 rounded-lg" title={`Distanza: ${Math.round(rec.distance_meters || 0)} metri`}>
                              ⚠️ Alert ({Math.round(rec.distance_meters || 0)}m)
                            </span>
                          )}
                        </td>
                        <td className="p-4 pr-6 text-right">
                          <button onClick={() => handleOpenEditModal(rec)} className="text-xs bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-semibold px-3 py-1.5 rounded-lg transition-colors">
                            ⚙️ Rettifica
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SCHEDA 2: ANAGRAFICA DIPENDENTI (STORICO E RAPPORTINI) */}
      {activeTab === 'dipendenti' && (
        <div className="space-y-6 animate-fadeIn">
          {loading ? (
            <div className="p-12 text-center text-zinc-500 text-sm">Caricamento elenco dipendenti...</div>
          ) : workers.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 text-sm">Nessun dipendente registrato in piattaforma.</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* LISTA SINISTRA: SCHEDE DIPENDENTI (4 COLONNE) */}
              <div className="lg:col-span-5 space-y-3">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider block font-mono px-1">Seleziona un Lavoratore per ispezionare il registro:</span>
                {workers.map((w) => {
                  const workerRecs = getWorkerRecords(w.id);
                  const activeRecord = workerRecs.find(r => r.check_out_time === null);
                  const workerAlerts = workerRecs.filter(r => !r.is_valid_distance).length;

                  return (
                    <div 
                      key={w.id} 
                      onClick={() => setSelectedWorker(w)}
                      className={`p-5 rounded-2xl border cursor-pointer transition-all duration-200 flex items-center justify-between ${selectedWorker?.id === w.id ? 'bg-zinc-800/60 border-emerald-500/50' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'}`}
                    >
                      <div className="space-y-1">
                        <h3 className="text-base font-bold text-white">{w.name}</h3>
                        <p className="text-xs text-zinc-400">
                          {activeRecord ? `🟢 Attivo su: ${activeRecord.leads?.customer_name}` : "🔴 Non in Cantiere"}
                        </p>
                      </div>
                      <div className="flex items-center space-x-3">
                        {workerAlerts > 0 && (
                          <span className="text-[10px] bg-rose-950 text-rose-400 px-2 py-1 rounded font-bold font-mono">⚠️ {workerAlerts} Alert</span>
                        )}
                        <span className="text-xs bg-zinc-950 border border-zinc-800 px-2.5 py-1 rounded text-zinc-350 font-semibold font-mono">
                          {workerRecs.length} Giornate
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* DETTAGLIO SITUAZIONE E GALLERY RAPPORTINI (8 COLONNE) */}
              <div className="lg:col-span-7 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl min-h-[450px] space-y-8">
                {selectedWorker ? (
                  <div className="space-y-8 animate-fadeIn">
                    
                    {/* Intestazione Dipendente */}
                    <div className="border-b border-zinc-800 pb-4">
                      <h3 className="text-xl font-bold text-white">{selectedWorker.name}</h3>
                      <p className="text-xs text-zinc-500 mt-1">Registrato il: {new Date(selectedWorker.created_at || '').toLocaleDateString('it-IT')}</p>
                    </div>

                    {/* STORICO RAPPORTINI FOTOGRAFICI (GALLERY) */}
                    <div className="space-y-3">
                      <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block font-mono">📸 Rapportini Fotografici di Fine Giornata:</span>
                      
                      {getWorkerRapportini(selectedWorker.id).length === 0 ? (
                        <p className="text-sm text-zinc-500 italic">Nessun rapportino fotografico inviato da questo dipendente.</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {getWorkerRapportini(selectedWorker.id).map((rap) => (
                            <div key={rap.id} className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-md flex flex-col justify-between">
                              {/* Thumbnail Immagine */}
                              <div 
                                onClick={() => setFullscreenPhotoUrl(rap.photo_url)}
                                className="aspect-[4/3] w-full bg-black cursor-zoom-in relative overflow-hidden group"
                              >
                                <img 
                                  src={rap.photo_url} 
                                  alt="Rapportino" 
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                              </div>
                              {/* Testo e Dati del Rapporto */}
                              <div className="p-4 space-y-2">
                                <div className="flex justify-between items-start text-[10px] text-zinc-500 font-semibold font-mono">
                                  <span>{formatDateTime(rap.created_at)}</span>
                                  <span className="text-emerald-400 truncate max-w-[150px]">{rap.leads?.customer_name || "Cantiere Sconosciuto"}</span>
                                </div>
                                {rap.notes ? (
                                  <p className="text-xs text-zinc-300 leading-relaxed italic bg-zinc-900 p-2.5 rounded border border-zinc-800">
                                    "{rap.notes}"
                                  </p>
                                ) : (
                                  <p className="text-xs text-zinc-600 italic">Nessuna nota descrittiva inviata.</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* TABELLA STORICO TIMBRATURE PERSONALE */}
                    <div className="space-y-3 border-t border-zinc-800 pt-6">
                      <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block font-mono">🕒 Registro Timbrature Personale:</span>
                      
                      {getWorkerRecords(selectedWorker.id).length === 0 ? (
                        <p className="text-sm text-zinc-500 italic">Nessun ingresso registrato per questo dipendente.</p>
                      ) : (
                        <div className="space-y-2 max-h-[220px] overflow-y-auto no-scrollbar divide-y divide-zinc-800">
                          {getWorkerRecords(selectedWorker.id).map((rec) => (
                            <div key={rec.id} className="pt-3 flex items-center justify-between text-xs">
                              <div>
                                <span className="font-semibold text-zinc-300 block">{rec.leads?.customer_name}</span>
                                <span className="text-zinc-550 block mt-0.5">
                                  {formatDateTime(rec.check_in_time)} → {rec.check_out_time ? formatDateTime(rec.check_out_time) : "In Cantiere"}
                                </span>
                              </div>
                              <div>
                                {rec.is_valid_distance ? (
                                  <span className="text-emerald-400 font-bold">📍 OK</span>
                                ) : (
                                  <span className="text-rose-400 font-bold" title={`Distanza: ${rec.distance_meters} metri`}>⚠️ Alert ({Math.round(rec.distance_meters || 0)}m)</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8 h-full">
                    <span className="text-4xl block mb-4">👷‍♂️</span>
                    <p className="text-sm text-zinc-500">Seleziona un lavoratore dall'elenco a sinistra per visualizzare la sua anagrafica, i suoi rapportini e lo storico presenze.</p>
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      )}

      {/* COMPORTAMENTO MODALE: INSERIMENTO TIMBRATURA MANUALE / RETTIFICA */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-fadeIn">
          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl w-full max-w-lg relative space-y-6 shadow-2xl">
            
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-zinc-400 hover:text-white">✕</button>

            <div>
              <h2 className="text-xl font-bold text-white">
                {editingRecord ? "Rettifica Timbratura di Cantiere" : "Nuova Registrazione Presenza Manuale"}
              </h2>
              <p className="text-xs text-zinc-500 mt-1">Correggi o inserisci manualmente gli orari d'ingresso ed uscita in caso di errori o dimenticanze dell'operaio.</p>
            </div>

            <form onSubmit={handleSaveRecord} className="space-y-4">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Operaio dropdown */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">Dipendente</label>
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
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">Cantiere di lavoro</label>
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
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">Timbratura Ingresso (Check-In)</label>
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
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">Timbratura Uscita (Check-Out)</label>
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
                    className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-xl transition-all shadow"
                  >
                    {editingRecord ? "Salva Rettifica" : "Registra Presenza"}
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* COMPORTAMENTO LIGHTBOX: INGRANDIMENTO FOTO A SCHERMO INTERO */}
      {fullscreenPhotoUrl && (
        <div 
          onClick={() => setFullscreenPhotoUrl(null)}
          className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 cursor-zoom-out animate-fadeIn"
        >
          <img 
            src={fullscreenPhotoUrl} 
            alt="Rapportino Ingrandito" 
            className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl border border-zinc-800"
          />
          <button className="absolute top-6 right-6 text-white bg-zinc-900/60 border border-zinc-800 p-3 rounded-full text-xl hover:bg-zinc-800">✕</button>
        </div>
      )}

    </div>
  );
}
