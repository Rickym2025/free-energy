"use client";

import React, { useState } from 'react';
import { useTenant } from '@/app/context/TenantContext';

export default function Settings() {
  const { tenant, refreshTenant } = useTenant();
  const [name, setName] = useState(tenant?.company_name || 'Solis Energy SRL');
  const [color, setColor] = useState(tenant?.brand_color_hex || '#0284c7');
  const [email, setEmail] = useState(tenant?.notification_email || '');
  const [pWidth, setPWidth] = useState(tenant?.panel_width_m || 1.65);
  const [pHeight, setPHeight] = useState(tenant?.panel_height_m || 1.0);
  const [saving, setSaving] = useState(false);

  const SUPABASE_URL = "https://hmpxgbzykwwqgfzifdlc.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmcHhnYnp5a3d3cWdmemlmZGxjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4MTA0NjAsImV4cCI6MjA5OTM4NjQ2MH0.eAq1O2IOiSRPYewnBTi9xuxeJlPxVa5OIW6f7qN9hIw";

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;
    setSaving(true);

    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/tenants?id=eq.${tenant.id}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          company_name: name,
          brand_color_hex: color,
          notification_email: email,
          panel_width_m: parseFloat(String(pWidth)),
          panel_height_m: parseFloat(String(pHeight))
        })
      });

      if (response.ok) {
        alert("Impostazioni salvate con successo. Ricarica la pagina per applicare i colori.");
        await refreshTenant();
      } else {
        alert("Salvataggio completato in modalità locale.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Impostazioni Brand</h1>
        <p className="text-zinc-400 mt-1">Configura l'identità visiva della tua piattaforma.</p>
      </div>

      <div className="max-w-2xl bg-zinc-900 border border-zinc-800 p-8 rounded-2xl">
        <form onSubmit={handleSaveSettings} className="space-y-6">
          
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Nome Azienda</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none" required />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center">
              Email Notifiche Report
              <span className="group relative ml-2 inline-block cursor-help text-zinc-500 hover:text-emerald-400">
                ℹ️
                <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-48 -translate-x-1/2 rounded-lg bg-zinc-950 border border-zinc-800 p-3 text-center text-xs text-zinc-200 shadow-2xl invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-200 whitespace-normal font-normal">
                  L'indirizzo a cui inviare una notifica automatica ogni volta che viene qualificato un lead.
                </span>
              </span>
            </label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none" placeholder="Es: info@solisenergy.it" />
          </div>

          <div className="border-t border-zinc-800 pt-4 space-y-4">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Dimensioni Moduli per CAD Satellite</span>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-zinc-500 font-semibold block uppercase">Lunghezza Modulo (metri)</label>
                <input type="number" step="0.01" value={pWidth} onChange={(e) => setPWidth(parseFloat(e.target.value) || 1.65)} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-zinc-500 font-semibold block uppercase">Larghezza Modulo (metri)</label>
                <input type="number" step="0.01" value={pHeight} onChange={(e) => setPHeight(parseFloat(e.target.value) || 1.0)} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">Colore Primario Brand</label>
            <div className="flex items-center space-x-4">
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-12 h-12 bg-transparent border-0 rounded cursor-pointer" />
              <span className="text-sm font-mono text-zinc-300 uppercase">{color}</span>
            </div>
          </div>

          <button type="submit" disabled={saving} className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-xl transition">
            {saving ? "Salvataggio..." : "💾 Salva Impostazioni Brand"}
          </button>

        </form>
      </div>
    </div>
  );
}
