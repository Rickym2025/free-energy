"use client";

import React, { useState, useEffect } from 'react';
import { useTenant } from '@/app/context/TenantContext';
import { 
  TimbratureTab, 
  DipendentiTab, 
  TimbraturaModal, 
  Lightbox 
} from './AttendanceComponents';

export interface Worker {
  id: string;
  name: string;
  telegram_chat_id?: string;
  created_at?: string;
}

export interface Cantiere {
  id: string;
  customer_name: string;
}

export interface AttendanceRecord {
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

export interface Rapportino {
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
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [cantieri, setCantieri] = useState<Cantiere[]>([]);
  const [rapportini, setRapportini] = useState<Rapportino[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [fullscreenPhotoUrl, setFullscreenPhotoUrl] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);

  useEffect(() => {
    if (tenant) fetchData();
  }, [tenant]);

  // Seleziona automaticamente il primo lavoratore non appena caricato per evitare la schermata vuota
  useEffect(() => {
    if (workers.length > 0 && !selectedWorker) {
      setSelectedWorker(workers[0]);
    }
  }, [workers, selectedWorker]);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchAttendance(), fetchWorkers(), fetchCantieri(), fetchRapportini()]);
    } catch (err) {
      console.error("Errore scaricamento dati presenze:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendance = async () => {
    if (!tenant) return;
    const res = await fetch(`${SUPABASE_URL}/rest/v1/worker_attendance?tenant_id=eq.${tenant.id}&select=*,workers(name),leads(customer_name)&order=created_at.desc`, {
      headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
    });
    if (res.ok) setRecords(await res.json());
  };

  const fetchWorkers = async () => {
    if (!tenant) return;
    console.log(`[Attendance] Scaricamento tabella workers per tenant: ${tenant.id}`);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/workers?tenant_id=eq.${tenant.id}&select=*&order=name.asc`, {
      headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
    });
    if (res.ok) {
      const data = await res.json();
      console.log(`[Attendance] Dipendenti rilevati nel database:`, data);
      setWorkers(data);
    }
  };

  const fetchCantieri = async () => {
    if (!tenant) return;
    const res = await fetch(`${SUPABASE_URL}/rest/v1/leads?tenant_id=eq.${tenant.id}&select=id,customer_name`, {
      headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
    });
    if (res.ok) setCantieri(await res.json());
  };

  const fetchRapportini = async () => {
    if (!tenant) return;
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rapportini?tenant_id=eq.${tenant.id}&select=*,leads(customer_name)&order=created_at.desc`, {
      headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
    });
    if (res.ok) setRapportini(await res.json());
  };

  const handleOpenCreateModal = () => {
    setEditingRecord(null);
    setShowModal(true);
  };

  const handleOpenEditModal = (rec: AttendanceRecord) => {
    setEditingRecord(rec);
    setShowModal(true);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-800 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Registro Presenze & Rapportini</h1>
          <p className="text-zinc-400 mt-2 text-sm leading-relaxed">
            Gestisci in modo centralizzato gli orari d'ingresso, le uscite e le foto dei rapportini giornalieri inviati dagli operai in cantiere.
          </p>
        </div>
        <button onClick={handleOpenCreateModal} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm py-3 px-6 rounded-xl transition duration-200 shadow-lg shrink-0">
          ➕ Timbratura Manuale
        </button>
      </div>

      <div className="flex space-x-2 bg-zinc-950 p-1.5 rounded-xl border border-zinc-850 w-full md:w-fit">
        <button onClick={() => { setActiveTab('timbrature'); setSelectedWorker(null); }} className={`flex-1 md:flex-initial py-2.5 px-6 text-xs font-bold rounded-lg transition-all ${activeTab === 'timbrature' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-400 hover:text-zinc-200'}`}>
          🕒 Registro Timbrature
        </button>
        <button onClick={() => { setActiveTab('dipendenti'); setSelectedWorker(null); }} className={`flex-1 md:flex-initial py-2.5 px-6 text-xs font-bold rounded-lg transition-all ${activeTab === 'dipendenti' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-400 hover:text-zinc-200'}`}>
          👥 Anagrafica Dipendenti
        </button>
      </div>

      {activeTab === 'timbrature' ? (
        <TimbratureTab loading={loading} records={records} onEdit={handleOpenEditModal} />
      ) : (
        <DipendentiTab loading={loading} workers={workers} records={records} rapportini={rapportini} selectedWorker={selectedWorker} onSelectWorker={setSelectedWorker} onZoomPhoto={setFullscreenPhotoUrl} />
      )}

      {showModal && (
        <TimbraturaModal supabaseUrl={SUPABASE_URL} supabaseKey={SUPABASE_ANON_KEY} tenant={tenant} editingRecord={editingRecord} workers={workers} cantieri={cantieri} onClose={() => setShowModal(false)} onRefresh={fetchAttendance} />
      )}

      {fullscreenPhotoUrl && (
        <Lightbox url={fullscreenPhotoUrl} onClose={() => setFullscreenPhotoUrl(null)} />
      )}
    </div>
  );
}
