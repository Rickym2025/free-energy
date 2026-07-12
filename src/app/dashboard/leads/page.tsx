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

const SUPABASE_URL = "https://hmpxgbzykwwqgfzifdlc.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmcHhnYnp5a3d3cWdmemlmZGxjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4MTA0NjAsImV4cCI6MjA5OTM4NjQ2MH0.eAq1O2IOiSRPYewnBTi9xuxeJlPxVa5OIW6f7qN9hIw";

export default function LeadsCRM() {
  const { tenant } = useTenant();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // Form states per nuovo inserimento manuale
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [bill, setBill] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchLeads();
  }, [tenant]);

  const fetchLeads = async () => {
    if (!tenant) return;
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/leads?tenant_id=eq.${tenant.id}&order=created_at.desc`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setLeads(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
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

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Gestione Lead & CRM</h1>
          <p className="text-zinc-400 mt-1">Registra manualmente i contatti e tieni traccia dello stato delle trattative e dei sopralluoghi.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-xl text-sm transition"
        >
          + Registra Nuovo Contatto
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Tabella dei contatti */}
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-zinc-800">
            <h2 className="text-lg font-bold text-white">Anagrafica Clienti</h2>
          </div>

          {loading ? (
            <div className="p-10 text-center text-zinc-500">Recupero contatti in corso...</div>
          ) : leads.length === 0 ? (
            <div className="p-10 text-center text-zinc-500 text-sm">Nessun lead inserito. Clicca sul pulsante in alto per aggiungere il primo contatto.</div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {leads.map((lead) => (
                <div 
                  key={lead.id} 
                  onClick={() => setSelectedLead(lead)}
                  className="p-6 flex items-center justify-between hover:bg-zinc-800 cursor-pointer transition"
                >
                  <div>
                    <h3 className="font-bold text-white">{lead.customer_name}</h3>
                    <p className="text-xs text-zinc-400 mt-1">📍 {lead.address} &bull; Bolletta: € {lead.monthly_bill_euro}/mese</p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                      lead.status === 'chiuso' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50' :
                      lead.status === 'sopralluogo' ? 'bg-amber-950 text-amber-400 border border-amber-800/50' :
                      'bg-zinc-800 text-zinc-400 border border-zinc-700'
                    }`}>
                      {lead.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Dettaglio Lead ed Azioni Rapide */}
        <div>
          {selectedLead ? (
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl space-y-6 animate-fadeIn">
              <div className="border-b border-zinc-800 pb-4">
                <h3 className="text-xl font-bold text-white">{selectedLead.customer_name}</h3>
                <p className="text-xs text-zinc-400 mt-1">Registrato il {new Date(selectedLead.created_at).toLocaleDateString()}</p>
              </div>

              <div className="space-y-4 text-sm text-zinc-300">
                <p><strong>📍 Indirizzo:</strong> {selectedLead.address}</p>
                <p><strong>📞 Cellulare:</strong> {selectedLead.customer_phone}</p>
                {selectedLead.customer_email && <p><strong>✉️ Email:</strong> {selectedLead.customer_email}</p>}
                <p><strong>⚡ Bolletta Mensile:</strong> € {selectedLead.monthly_bill_euro}</p>
                <p className="bg-zinc-800 p-4 rounded-xl text-xs text-zinc-400 border border-zinc-750">
                  <strong>Note di cantiere:</strong><br />
                  {selectedLead.notes}
                </p>
              </div>

              <div className="flex flex-col gap-3 pt-4 border-t border-zinc-800">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Azioni Trattativa</span>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleUpdateStatus(selectedLead.id, 'sopralluogo')}
                    className="flex-1 py-2 bg-amber-950 text-amber-400 border border-amber-800/50 text-xs font-bold rounded-lg hover:bg-amber-900 transition"
                  >
                    Fissa Sopralluogo
                  </button>
                  <button 
                    onClick={() => handleUpdateStatus(selectedLead.id, 'chiuso')}
                    className="flex-1 py-2 bg-emerald-950 text-emerald-400 border border-emerald-800/50 text-xs font-bold rounded-lg hover:bg-emerald-900 transition"
                  >
                    Contratto Chiuso
                  </button>
                </div>

                <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest mt-2">Ricontatta</span>
                <div className="flex gap-2">
                  <a 
                    href={`tel:${selectedLead.customer_phone}`}
                    className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-750 text-white text-xs font-bold rounded-lg text-center border border-zinc-700 transition"
                  >
                    📞 Chiama
                  </a>
                  <a 
                    href={`https://wa.me/${selectedLead.customer_phone.replace(/\D/g, '')}?text=Ciao%20${encodeURIComponent(selectedLead.customer_name)},%20ti%20contatto%20da%20${encodeURIComponent(tenant?.company_name || '')}%20in%20merito%20all'impianto%20fotovoltaico.`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-3 bg-emerald-950 hover:bg-emerald-900 text-emerald-400 text-xs font-bold rounded-lg text-center border border-emerald-900/40 transition"
                  >
                    💬 WhatsApp
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl text-center text-zinc-500 text-sm">
              Seleziona un contatto dalla lista per visualizzarne i dettagli ed attivare le scorciatoie di chiamata e WhatsApp.
            </div>
          )}
        </div>

      </div>

      {/* Modal Aggiunta Lead */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl w-full max-w-lg space-y-6 relative">
            <button 
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white"
            >
              ✕
            </button>
            <h2 className="text-xl font-bold text-white">Aggiungi Contatto Lead</h2>
            
            <form onSubmit={handleCreateLead} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-zinc-400 font-semibold uppercase">Nome Cliente</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-zinc-400 font-semibold uppercase">Cellulare</label>
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-zinc-400 font-semibold uppercase">Email (Opzionale)</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-zinc-400 font-semibold uppercase">Spesa Bolletta (€/Mese)</label>
                  <input type="number" value={bill} onChange={(e) => setBill(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-zinc-400 font-semibold uppercase">Indirizzo Installazione</label>
                <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} required className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white" />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-zinc-400 font-semibold uppercase">Note Preliminari</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white resize-none" />
              </div>

              <button 
                type="submit"
                disabled={saving}
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-bold rounded-xl transition"
              >
                {saving ? "Salvataggio..." : "💾 Salva Contatto in Anagrafica"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
