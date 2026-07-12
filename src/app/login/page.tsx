"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  const SUPABASE_URL = "https://hmpxgbzykwwqgfzifdlc.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmcHhnYnp5a3d3cWdmemlmZGxjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4MTA0NjAsImV4cCI6MjA5OTM4NjQ2MH0.eAq1O2IOiSRPYewnBTi9xuxeJlPxVa5OIW6f7qN9hIw";

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);

    const cleanId = email.toLowerCase().trim().replace(/[^a-z0-9@.]/g, '-');

    try {
      if (isSignUp && companyName.trim()) {
        // Registrazione nuovo installatore (500 crediti gratuiti inclusi)
        const initialCredits = cleanId === 'modena.riccardo@gmail.com' ? 99999999 : 500;
        
        await fetch(`${SUPABASE_URL}/rest/v1/tenants`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            id: cleanId,
            company_name: companyName,
            brand_color_hex: '#0284c7',
            credits: initialCredits,
            notification_email: email
          })
        });
      }

      // Impostiamo la sessione locale
      localStorage.setItem('fe_tenant_id', cleanId);
      router.push('/dashboard');
    } catch (err) {
      console.error(err);
      localStorage.setItem('fe_tenant_id', cleanId);
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 p-8 rounded-2xl space-y-6">
        <div className="text-center">
          <span className="font-bold text-2xl tracking-tight text-white block">Free Energy</span>
          <p className="text-sm text-zinc-400 mt-2">
            {isSignUp ? "Crea la tua licenza ed ottieni 500 crediti inclusi" : "Accedi alla tua Dashboard installatore"}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {isSignUp && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Nome Azienda</label>
              <input 
                type="text" 
                placeholder="Es: Solis Solar SRL" 
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">La tua Email</label>
            <input 
              type="email" 
              placeholder="Es: tecnico@solis.it" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-bold rounded-xl transition duration-200"
          >
            {loading ? "Attendi..." : isSignUp ? "Crea Profilo Gratis" : "Accedi alla Dashboard"}
          </button>
        </form>

        <div className="text-center pt-2">
          <button 
            type="button" 
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-xs text-emerald-400 hover:text-emerald-300 font-medium"
          >
            {isSignUp ? "Hai già una licenza? Accedi" : "Non hai ancora una licenza? Crea Account (500 crediti inclusi)"}
          </button>
        </div>
      </div>
    </div>
  );
}
