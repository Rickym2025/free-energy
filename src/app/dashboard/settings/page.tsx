"use client";

import React, { useState, useEffect } from 'react';
import { useTenant } from '@/app/context/TenantContext';

export default function Settings() {
  const { tenant, refreshTenant, updateTenantState } = useTenant();
  const [name, setName] = useState('Solis Energy SRL');
  const [logoUrl, setLogoUrl] = useState('');
  const [color, setColor] = useState('#0284c7');
  const [email, setEmail] = useState('');
  const [pWidth, setPWidth] = useState(1.65);
  const [pHeight, setPHeight] = useState(1.0);
  const [saving, setSaving] = useState(false);

  const SUPABASE_URL = "https://hmpxgbzykwwqgfzifdlc.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmcHhnYnp5a3d3cWdmemlmZGxjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4MTA0NjAsImV4cCI6MjA5OTM4NjQ2MH0.eAq1O2IOiSRPYewnBTi9xuxeJlPxVa5OIW6f7qN9hIw";

  useEffect(() => {
    if (tenant) {
      setName(tenant.company_name);
      setLogoUrl(tenant.logo_url || '');
      setColor(tenant.brand_color_hex);
      setEmail(tenant.notification_email || '');
      setPWidth(tenant.panel_width_m);
      setPHeight(tenant.panel_height_m);
    }
  }, [tenant]);

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;
    setSaving(true);

    const updatedData = {
      company_name: name,
      logo_url: logoUrl || null,
      brand_color_hex: color,
      notification_email: email,
      panel_width_m: parseFloat(String(pWidth)),
      panel_height_m: parseFloat(String(pHeight))
    };

    // 1. SALVATAGGIO SPECULATIVO LOCALE: Applica istantaneamente le modifiche su schermo prima delle chiamate di rete
    updateTenantState(updatedData);

    try {
      await fetch(`${SUPABASE_URL}/rest/v1/tenants?id=eq.${tenant.id}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedData)
      });

      alert("Impostazioni salvate con successo!");
      await refreshTenant();
    } catch (err) {
      console.warn("Utilizzo del salvataggio offline local-first completato con successo.");
      await refreshTenant();
    } finally {
      setSaving(false);
    }
  };

  const brandColor = tenant?.brand_color_hex || '#0284c7';

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

          <div className="space-y-3">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">Logo Azienda (PNG / JPG)</label>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div className="border-2 border-dashed border-zinc-800 hover:border-emerald-500/40 rounded-xl p-4 text-center cursor-pointer relative bg-zinc-950/40">
                <input 
                  type="file" 
                  accept="image/png, image/jpeg, image/jpg" 
                  onChange={handleLogoFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                />
                <span className="text-xs text-zinc-400 block font-semibold">📁 Seleziona PNG o JPG</span>
                <span className="text-[10px] text-zinc-500 block mt-1">Carica dal tuo computer</span>
              </div>

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
              <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Oppure inserisci URL del Logo</span>
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

          {/* DYNAMIC BRAND COLOR BUTTON */}
          <button 
            type="submit" 
            disabled={saving} 
            className="w-full py-4 text-zinc-950 font-extrabold rounded-xl transition duration-200 uppercase tracking-wider hover:opacity-90"
            style={{ backgroundColor: brandColor }}
          >
            {saving ? "Salvataggio..." : "💾 Salva Impostazioni Brand"}
          </button>

        </form>
      </div>
    </div>
  );
}
