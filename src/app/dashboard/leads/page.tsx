"use client";

import React, { useState, useEffect } from 'react';
import { useTenant } from '@/app/context/TenantContext';

interface Lead {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  address: string;
  monthly_bill_euro: number;
  notes: string;
  status: string;
  created_at: string;
}

interface Rapportino {
  id: string;
  tenant_id: string;
  worker_id: string;
  cantiere_id: string;
  photo_url: string;
  notes: string;
  created_at: string;
  workers?: { name: string };
}

const getEnvVar = (value: string | undefined, fallback: string): string => {
  if (!value || value === "undefined" || value.trim() === "" || value === "null") return fallback;
  return value.replace(/^["']|["']$/g, '').trim();
};

const SUPABASE_URL = getEnvVar(process.env.NEXT_PUBLIC_SUPABASE_URL, "https://hmpxgbzykwwqgfzifdlc.supabase.co").replace(/\/$/, '');
const SUPABASE_ANON_KEY = getEnvVar(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmcHhnYnp5a3d3cWdmemlmZGxjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4MTA0NjAsImV4cCI6MjA5OTM4NjQ2MH0.eAq1O2IOiSRPYewnBTi9xuxeJlPxVa5OIW6f7qN9hIw");

export default function LeadsCRM() {
  const { tenant } = useTenant();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [rapportini, setRapportini] = useState<Rapportino[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const [fullscreenPhotoUrl, setFullscreenPhotoUrl] = useState<string | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [bill, setBill] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (tenant) {
      fetchData();
    }
  }, [tenant]);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchLeads(),
        fetchRapportini()
      ]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeads = async () => {
    if (!tenant) return;
    const response = await fetch(`${SUPABASE_URL}/rest/v1/leads?tenant_id=eq.${tenant.id}&order=created_at.desc`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });
    if (response.ok) {
      setLeads(await response.json());
    }
  };

  const fetchRapportini = async () => {
    if (!tenant) return;
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/rapportini?tenant_id=eq.${tenant.id}&select=*,workers(name)&order=created_at.desc`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      }
    );
    if (response.ok) {
      setRapportini(await response.json());
    }
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !address.trim()) return;
    setSaving(true);

    try {
      const payload = {
        tenant_id: tenant?.id,
        customer_name: name,
        customer_phone: phone,
        customer_email: email,
        address: address,
        monthly_bill_euro: parseFloat(bill) || 0,
        notes: notes || "Inserito manualmente in Dashboard.",
        status: "nuovo"
      };

      const res = await fetch(`${SUPABASE_URL}/rest/v1/leads`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setShowAddModal(false);
        setName('');
        setPhone('');
        setEmail('');
        setAddress('');
        setBill('');
        setNotes('');
        await fetchLeads();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/leads?id=eq.${id}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        setLeads(prev => prev.map(l => l.id === id ? { ...l, status: newStatus } : l));
        if (selectedLead && selectedLead.id === id) {
          setSelectedLead(prev => prev ? { ...prev, status: newStatus } : null);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filtra i rapportini associati a questo cantiere specifico
  const getCantiereRapportini = (cantiereId: string) => {
    return rapportini.filter(r => r.cantiere_id === cantiereId);
  };

  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16">
      
      {/* INTESTAZIONE */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-800 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Gestione Cantieri & CRM</h1>
          <p className="text-zinc-400 mt-2 text-sm leading-relaxed">
            Registra le anagrafiche dei clienti, fissa sopralluoghi ed ispeziona l'avanzamento visivo dei lavori tramite le foto dei dipendenti.
          </p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm py-3 px-6 rounded-xl transition duration-200 shadow-lg shrink-0"
        >
          ➕ Registra Nuovo Cantiere
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* TABELLA CANTIERI (7 COLONNE) */}
        <div className="lg:col-span-7 bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-6 border-b border-zinc-800">
            <h2 className="text-lg font-bold text-white">Anagrafica Clienti</h2>
          </div>

          {loading ? (
            <div className="p-10 text-center text-zinc-500 text-sm">Recupero cantieri in corso...</div>
          ) : leads.length === 0 ? (
            <div className="p-10 text-center text-zinc-500 text-sm">Nessun cantiere inserito in piattaforma. Clicca sul pulsante in alto per registrare il primo.</div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {leads.map((lead) => (
                <div 
                  key={lead.id} 
                  onClick={() => setSelectedLead(lead)}
                  className={`p-6 flex items-center justify-between hover:bg-zinc-850/50 cursor-pointer transition-colors duration-150 ${selectedLead?.id === lead.id ? 'bg-zinc-800/40' : ''}`}
                >
                  <div>
                    <h3 className="font-bold text-white text-base">{lead.customer_name}</h3>
                    <p className="text-xs text-zinc-400 mt-1.5">📍 {lead.address} &bull; Bolletta: € {lead.monthly_bill_euro}/mese</p>
                  </div>
                  <div className="flex items-center space-x-4 shrink-0">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                      lead.status === 'chiuso' ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800/50' :
                      lead.status === 'sopralluogo' ? 'bg-amber-950/80 text-amber-400 border-amber-800/50' :
                      'bg-zinc-950 text-zinc-400 border-zinc-800'
                    }`}>
                      {lead.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* DETTAGLIO CANTIERE SELEZIONATO (5 COLONNE) */}
        <div className="lg:col-span-5 bg-zinc-900 border border-zinc-800 p-6 rounded-2xl space-y-6 shadow-xl min-h-[450px]">
          {selectedLead ? (
            <div className="space-y-6 animate-fadeIn">
              <div className="border-b border-zinc-800 pb-4">
                <h3 className="text-xl font-bold text-white">{selectedLead.customer_name}</h3>
                <p className="text-xs text-zinc-500 mt-1">Registrato il {new Date(selectedLead.created_at).toLocaleDateString()}</p>
              </div>

              <div className="space-y-4 text-sm text-zinc-300">
                <p className="leading-relaxed"><strong>📍 Indirizzo:</strong> {selectedLead.address}</p>
                <p><strong>📞 Cellulare:</strong> {selectedLead.customer_phone}</p>
                {selectedLead.customer_email && <p><strong>✉️ Email:</strong> {selectedLead.customer_email}</p>}
                <p><strong>⚡ Bolletta Stimata:</strong> € {selectedLead.monthly_bill_euro}/mese</p>
                
                <div className="bg-zinc-950 p-4 rounded-xl text-xs text-zinc-400 border border-zinc-850 space-y-1.5">
                  <span className="text-[10px] text-zinc-550 block uppercase font-mono tracking-wider font-semibold">Note di cantiere:</span>
                  <p className="leading-relaxed whitespace-pre-wrap">{selectedLead.notes}</p>
                </div>
              </div>

              {/* INTEGRAZIONE RAPPORTINI FOTOGRAFICI (OPZIONE 1) */}
              <div className="space-y-3 pt-2 border-t border-zinc-800">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block font-mono">📸 Foto e Rapportini di Avanzamento Lavori:</span>
                
                {getCantiereRapportini(selectedLead.id).length === 0 ? (
                  <p className="text-xs text-zinc-500 italic">Nessun rapportino fotografico caricato per questo cantiere.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {getCantiereRapportini(selectedLead.id).map((rap) => (
                      <div key={rap.id} className="bg-zinc-950 border border-zinc-850 rounded-xl overflow-hidden shadow flex flex-col justify-between">
                        {/* Immagine */}
                        <div 
                          onClick={() => setFullscreenPhotoUrl(rap.photo_url)}
                          className="aspect-[4/3] w-full bg-black cursor-zoom-in overflow-hidden relative group"
                        >
                          <img 
                            src={rap.photo_url} 
                            alt="Foto Cantiere" 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                        {/* Info sotto foto */}
                        <div className="p-3 space-y-1.5 text-[10px]">
                          <div className="flex justify-between items-center text-zinc-550 font-mono font-semibold">
                            <span>{formatDateTime(rap.created_at)}</span>
                            <span className="text-emerald-400 font-bold truncate max-w-[80px]">{rap.workers?.name || "Operaio"}</span>
                          </div>
                          {rap.notes && (
                            <p className="text-[11px] text-zinc-350 leading-relaxed italic bg-zinc-900 p-1.5 rounded border border-zinc-850/80">
                              "{rap.notes}"
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* AZIONI E CONTATTI */}
              <div className="flex flex-col gap-3 pt-4 border-t border-zinc-800">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest font-mono">Azioni Trattativa</span>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleUpdateStatus(selectedLead.id, 'sopralluogo')}
                    className="flex-1 py-2 bg-amber-950/60 hover:bg-amber-900/80 text-amber-400 border border-amber-800/50 text-xs font-bold rounded-lg transition-colors"
                  >
                    Fissa Sopralluogo
                  </button>
                  <button 
                    onClick={() => handleUpdateStatus(selectedLead.id, 'chiuso')}
                    className="flex-1 py-2 bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-400 border border-emerald-800/50 text-xs font-bold rounded-lg transition-colors"
                  >
                    Contratto Chiuso
                  </button>
                </div>

                <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest font-mono mt-2">Ricontatta</span>
                <div className="flex gap-2">
                  <a 
                    href={`tel:${selectedLead.customer_phone}`}
                    className="flex-1 py-2.5 bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-bold rounded-lg text-center border border-zinc-800 transition-colors"
                  >
                    📞 Chiama
                  </a>
                  <a 
                    href={`https://wa.me/${selectedLead.customer_phone.replace(/\D/g, '')}?text=Ciao%20${encodeURIComponent(selectedLead.customer_name)},%20ti%20contatto%20da%20${encodeURIComponent(tenant?.company_name || '')}%20in%20merito%20all'impianto%20fotovoltaico.`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2.5 bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-400 text-xs font-bold rounded-lg text-center border border-emerald-900/50 transition-colors"
                  >
                    💬 WhatsApp
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl text-center text-zinc-500 text-sm">
              Seleziona un contatto dalla lista per visualizzarne i dettagli e gestire lo stato della trattativa o ispezionare le foto dei lavori.
            </div>
          )}
        </div>

      </div>

      {/* Modal Aggiunta Lead */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl w-full max-w-lg space-y-6 relative shadow-2xl">
            <button 
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white"
            >
              ✕
            </button>
            <h2 className="text-xl font-bold text-white">Aggiungi Contatto Cantiere</h2>
            
            <form onSubmit={handleCreateLead} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-zinc-400 font-semibold uppercase">Nome Cliente</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-zinc-400 font-semibold uppercase">Cellulare</label>
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-zinc-400 font-semibold uppercase">Email (Opzionale)</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-zinc-400 font-semibold uppercase">Spesa Bolletta (€/Mese)</label>
                  <input type="number" value={bill} onChange={(e) => setBill(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-zinc-400 font-semibold uppercase">Indirizzo Installazione</label>
                <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} required className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none" />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-zinc-400 font-semibold uppercase">Note Preliminari</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white resize-none focus:outline-none" />
              </div>

              <button 
                type="submit"
                disabled={saving}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all shadow"
              >
                {saving ? "Salvataggio..." : "💾 Salva Contatto in Anagrafica"}
              </button>
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
            alt="Foto Cantiere Ingrandita" 
            className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl border border-zinc-800"
          />
          <button className="absolute top-6 right-6 text-white bg-zinc-900/60 border border-zinc-800 p-3 rounded-full text-xl hover:bg-zinc-800">✕</button>
        </div>
      )}

    </div>
  );
}
