"use client";

import React, { useState } from 'react';
import { useTenant } from '@/app/context/TenantContext';

export default function Settings() {
  const { tenant, refreshTenant } = useTenant();
  const [name, setName] = useState(tenant?.company_name || 'Solis Energy SRL');
  const [logoUrl, setLogoUrl] = useState(tenant?.logo_url || '');
  const [color, setColor] = useState(tenant?.brand_color_hex || '#0284c7');
  const [email, setEmail] = useState(tenant?.notification_email || '');
  const [pWidth, setPWidth] = useState(tenant?.panel_width_m || 1.65);
  const [pHeight, setPHeight] = useState(tenant?.panel_height_m || 1.0);
  const [saving, setSaving] = useState(false);

  const SUPABASE_URL = "https://hmpxgbzykwwqgfzifdlc.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmcHhnYnp5a3d3cWdmemlmZGxjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4MTA0NjAsImV4cCI6MjA5OTM4NjQ2MH0.eAq1O2IOiSRPYewnBTi9xuxeJlPxVa5OIW6f7qN9hIw";

  // Gestione del caricamento di file fisici PNG/JPG locali ed autoconversione in Base64
  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      // Imposta la stringa Base64 generata nello stato per salvarla nel database
      setLogoUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;
    setSaving(true);

    try {
      await fetch(`${SUPABASE_URL}/rest/v1/tenants?id=eq.${tenant.id}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          company_name: name,
          logo_url: logoUrl || null,
          brand_color_hex: color,
          notification_email: email,
          panel_width_m: parseFloat(String(pWidth)),
          panel_height_m: parseFloat(String(pHeight))
        })
      });

      alert("Impostazioni salvate con successo. Ricarica la pagina per applicare le modifiche.");
      await refreshTenant();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Impostazioni Brand</h1>
        <p className="text-zinc-400 mt-1">Configura l'identità visiva della tua piattaforma.</p>
      </div>

      <div className="bg-zinc-900/80 border border-zinc-800 p-8 rounded-2xl">
        <form onSubmit={handleSaveSettings} className="space-y-6">
          
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Nome Azienda</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none" required />
          </div>

          {/* Sezione Caricamento Logo (File o URL) */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">Logo Azienda (PNG / JPG)</label>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              {/* Uploader File Locale */}
              <div className="border-2 border-dashed border-zinc-800 hover:border-emerald-500/40 rounded-xl p-4 text-center cursor-pointer relative bg-zinc-950/40">
                <input 
                  type="file" 
                  accept="image/png, image/jpeg, image/jpg" 
                  onChange={handleLogoFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                />
                <span className="text-xs text-zinc-400 block font-semibold">📁 Seleziona PNG o JPG</span>
                <span className="text-[10px] text-zinc-500 block mt-1">Carica direttamente dal tuo computer</span>
              </div>

              {/* Anteprima visiva */}
              {logoUrl ? (
                <div className="flex items-center space-x-3 bg-zinc-800/40 p-3 rounded-xl border border-zinc-800">
                  <img src={logoUrl} alt="Anteprima Logo" className="h-10 w-24 object-contain rounded" />
                  <button type="button" onClick={() => setLogoUrl('')} className="text-xs text-red-400 hover:text-red-300">Rimuovi</button>
                </div>
              ) : (
                <span className="text-xs text-zinc-500 italic block">Nessun logo caricato</span>
              )}
            </div>

            <div className="space-y-1.5 pt-2">
              <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Oppure inserisci URL diretto del Logo</span>
              <input type="url" placeholder="Es: https://solisenergy.it/logo.png" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Email Notifiche Report</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none" />
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
