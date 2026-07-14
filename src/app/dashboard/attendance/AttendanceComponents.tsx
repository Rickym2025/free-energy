"use client";

import React, { useState, useEffect } from 'react';
import { AttendanceRecord, Worker, Rapportino, Cantiere } from './page';

const formatDateTime = (isoString: string | null) => {
  if (!isoString) return "-";
  const date = new Date(isoString);
  return date.toLocaleString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

// SCHEDA 1: TABELLA TIMBRATURE
export function TimbratureTab({ loading, records, onEdit }: { loading: boolean, records: AttendanceRecord[], onEdit: (rec: AttendanceRecord) => void }) {
  const activeWorkersCount = records.filter(r => r.check_out_time === null).length;
  const alertCount = records.filter(r => !r.is_valid_distance).length;

  return (
    <div className="space-y-8 animate-fadeIn">
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
                  <tr key={rec.id} className="hover:bg-zinc-850/50 transition duration-155">
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
                      <button onClick={() => onEdit(rec)} className="text-xs bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-semibold px-3 py-1.5 rounded-lg transition-colors">
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
  );
}

// SCHEDA 2: SCHEDA ANAGRAFICA DIPENDENTI
export function DipendentiTab({ loading, workers, records, rapportini, selectedWorker, onSelectWorker, onZoomPhoto }: { loading: boolean, workers: Worker[], records: AttendanceRecord[], rapportini: Rapportino[], selectedWorker: Worker | null, onSelectWorker: (w: Worker) => void, onZoomPhoto: (url: string) => void }) {
  const getWorkerRecords = (id: string) => records.filter(r => r.worker_id === id);
  const getWorkerRapportini = (id: string) => rapportini.filter(r => r.worker_id === id);

  return (
    <div className="space-y-6 animate-fadeIn">
      {loading ? (
        <div className="p-12 text-center text-zinc-500 text-sm">Caricamento elenco dipendenti...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5 space-y-3">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider block font-mono px-1">Seleziona un Lavoratore per ispezionare il registro:</span>
            {workers.map((w) => {
              const workerRecs = getWorkerRecords(w.id);
              const activeRecord = workerRecs.find(r => r.check_out_time === null);
              const workerAlerts = workerRecs.filter(r => !r.is_valid_distance).length;

              return (
                <div key={w.id} onClick={() => onSelectWorker(w)} className={`p-5 rounded-2xl border cursor-pointer transition-all duration-200 flex items-center justify-between ${selectedWorker?.id === w.id ? 'bg-zinc-800/60 border-emerald-500/50' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'}`}>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-white">{w.name}</h3>
                    <p className="text-xs text-zinc-400">{activeRecord ? `🟢 Attivo su: ${activeRecord.leads?.customer_name}` : "🔴 Non in Cantiere"}</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    {workerAlerts > 0 && <span className="text-[10px] bg-rose-950 text-rose-400 px-2 py-1 rounded font-bold font-mono">⚠️ {workerAlerts} Alert</span>}
                    <span className="text-xs bg-zinc-950 border border-zinc-800 px-2.5 py-1 rounded text-zinc-350 font-semibold font-mono">{workerRecs.length} Giornate</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="lg:col-span-7 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl min-h-[450px] space-y-8">
            {selectedWorker ? (
              <div className="space-y-8 animate-fadeIn">
                <div className="border-b border-zinc-800 pb-4">
                  <h3 className="text-xl font-bold text-white">{selectedWorker.name}</h3>
                  <p className="text-xs text-zinc-500 mt-1">Registrato il: {new Date(selectedWorker.created_at || '').toLocaleDateString('it-IT')}</p>
                </div>

                <div className="space-y-3">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block font-mono">📸 Rapportini Fotografici di Fine Giornata:</span>
                  {getWorkerRapportini(selectedWorker.id).length === 0 ? (
                    <p className="text-sm text-zinc-500 italic">Nessun rapportino fotografico inviato da questo dipendente.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {getWorkerRapportini(selectedWorker.id).map((rap) => (
                        <div key={rap.id} className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-md flex flex-col justify-between">
                          <div onClick={() => onZoomPhoto(rap.photo_url)} className="aspect-[4/3] w-full bg-black cursor-zoom-in relative overflow-hidden group">
                            <img src={rap.photo_url} alt="Rapportino" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          </div>
                          <div className="p-4 space-y-2">
                            <div className="flex justify-between items-start text-[10px] text-zinc-500 font-semibold font-mono">
                              <span>{formatDateTime(rap.created_at)}</span>
                              <span className="text-emerald-400 truncate max-w-[150px]">{rap.leads?.customer_name || "Cantiere Sconosciuto"}</span>
                            </div>
                            {rap.notes ? <p className="text-xs text-zinc-300 leading-relaxed italic bg-zinc-900 p-2.5 rounded border border-zinc-800">"{rap.notes}"</p> : <p className="text-xs text-zinc-600 italic">Nessuna nota descrittiva inviata.</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

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
                            <span className="text-zinc-550 block mt-0.5">{formatDateTime(rec.check_in_time)} → {rec.check_out_time ? formatDateTime(rec.check_out_time) : "Al Lavoro"}</span>
                          </div>
                          <div>{rec.is_valid_distance ? <span className="text-emerald-400 font-bold">📍 OK</span> : <span className="text-rose-400 font-bold">⚠️ Alert ({Math.round(rec.distance_meters || 0)}m)</span>}</div>
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
  );
}

// COMPORTAMENTO MODALE: TIMBRATURA MANUALE / RETTIFICA
export function TimbraturaModal({ supabaseUrl, supabaseKey, tenant, editingRecord, workers, cantieri, onClose, onRefresh }: { supabaseUrl: string, supabaseKey: string, tenant: any, editingRecord: AttendanceRecord | null, workers: Worker[], cantieri: Cantiere[], onClose: () => void, onRefresh: () => Promise<void> }) {
  const [formWorkerId, setFormWorkerId] = useState(editingRecord ? editingRecord.worker_id : '');
  const [formCantiereId, setFormCantiereId] = useState(editingRecord ? editingRecord.cantiere_id : '');
  const [formCheckIn, setFormCheckIn] = useState('');
  const [formCheckOut, setFormCheckOut] = useState('');
  const [formIsValidDistance, setFormIsValidDistance] = useState(true);

  useEffect(() => {
    if (workers.length > 0 && !formWorkerId) {
      setFormWorkerId(workers[0].id);
    }
    if (cantieri.length > 0 && !formCantiereId) {
      setFormCantiereId(cantieri[0].id);
    }
  }, [workers, cantieri]);

  useEffect(() => {
    if (editingRecord) {
      setFormCheckIn(editingRecord.check_in_time ? editingRecord.check_in_time.substring(0, 16) : '');
      setFormCheckOut(editingRecord.check_out_time ? editingRecord.check_out_time.substring(0, 16) : '');
      setFormIsValidDistance(editingRecord.is_valid_distance);
    } else {
      setFormCheckIn(new Date().toISOString().substring(0, 16));
    }
  }, [editingRecord]);

  const handleSave = async (e: React.FormEvent) => {
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
        res = await fetch(`${supabaseUrl}/rest/v1/worker_attendance?id=eq.${editingRecord.id}`, {
          method: 'PATCH',
          headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch(`${supabaseUrl}/rest/v1/worker_attendance`, {
          method: 'POST',
          headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }
      if (res.ok) {
        onClose();
        await onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async () => {
    if (!editingRecord || !confirm("Sei sicuro di voler eliminare questa timbratura?")) return;
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/worker_attendance?id=eq.${editingRecord.id}`, {
        method: 'DELETE',
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
      });
      if (res.ok) {
        onClose();
        await onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-fadeIn">
      <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl w-full max-w-lg relative space-y-6 shadow-2xl">
        <button onClick={onClose} className="absolute top-4 right-4 text-zinc-400 hover:text-white">✕</button>
        <div>
          <h2 className="text-xl font-bold text-white">{editingRecord ? "Rettifica Timbratura di Cantiere" : "Nuova Registrazione Presenza Manuale"}</h2>
          <p className="text-xs text-zinc-500 mt-1">Correggi o inserisci manualmente gli orari d'ingresso ed uscita in caso di errori o dimenticanze dell'operaio.</p>
        </div>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">Dipendente</label>
              <select value={formWorkerId} onChange={(e) => setFormWorkerId(e.target.value)} disabled={!!editingRecord} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none cursor-pointer">{workers.map(w => (<option key={w.id} value={w.id}>{w.name}</option>))}</select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">Cantiere di lavoro</label>
              <select value={formCantiereId} onChange={(e) => setFormCantiereId(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none cursor-pointer">{cantieri.map(c => (<option key={c.id} value={c.id}>{c.customer_name}</option>))}</select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">Check-In</label>
              <input type="datetime-local" value={formCheckIn} onChange={(e) => setFormCheckIn(e.target.value)} required className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">Check-Out</label>
              <input type="datetime-local" value={formCheckOut} onChange={(e) => setFormCheckOut(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none" />
            </div>
          </div>
          <div className="flex items-center space-x-3 pt-2">
            <input type="checkbox" id="validDistance" checked={formIsValidDistance} onChange={(e) => setFormIsValidDistance(e.target.checked)} className="h-4 w-4 rounded border-zinc-800 bg-zinc-950 text-emerald-500 focus:ring-transparent cursor-pointer" />
            <label htmlFor="validDistance" className="text-xs text-zinc-400 cursor-pointer uppercase font-mono tracking-wider font-semibold">Sblocca GPS (Convalida la distanza dal cantiere come corretta)</label>
          </div>
          <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
            {editingRecord ? (<button type="button" onClick={handleDelete} className="text-xs bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-400 font-bold px-4 py-2.5 rounded-xl transition-all">🗑️ Elimina Timbratura</button>) : (<div />)}
            <div className="flex space-x-3">
              <button type="button" onClick={onClose} className="text-xs bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 font-bold px-4 py-2.5 rounded-xl transition-all">Annulla</button>
              <button type="submit" className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-xl transition-all shadow">{editingRecord ? "Salva Rettifica" : "Registra Presenza"}</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// COMPORTAMENTO LIGHTBOX: INGRANDIMENTO FOTO
export function Lightbox({ url, onClose }: { url: string, onClose: () => void }) {
  return (
    <div onClick={onClose} className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 cursor-zoom-out animate-fadeIn">
      <img src={url} alt="Ingrandito" className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl border border-zinc-800" />
      <button className="absolute top-6 right-6 text-white bg-zinc-900/60 border border-zinc-800 p-3 rounded-full text-xl hover:bg-zinc-800">✕</button>
    </div>
  );
}
