"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Configurazione Supabase fornita
const SUPABASE_URL = "https://hmpxgbzykwwqgfzifdlc.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtcHhnYnp5a3d3cWdmemlmZGxjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4MTA0NjAsImV4cCI6MjA5OTM4NjQ2MH0.eAq1O2IOiSRPYewnBTi9xuxeJlPxVa5OIW6f7qN9hIw";

export interface Tenant {
  id: string;
  company_name: string;
  logo_url: string | null;
  brand_color_hex: string;
  notification_email: string | null;
  credits: number;
}

interface TenantContextType {
  tenant: Tenant | null;
  loading: boolean;
  error: string | null;
  refreshTenant: () => Promise<void>;
  deductCredits: (amount: number, description: string) => Promise<boolean>;
  setTenantId: (id: string) => void;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenantId, setTenantIdState] = useState<string>('sipro-energy'); // Tenant predefinito
  const [tenant, setTenant] = useState<Tenant | null>({
    id: 'sipro-energy',
    company_name: 'Sipro Energy',
    logo_url: null,
    brand_color_hex: '#0284c7', // Sky blue
    notification_email: 'info@siproenergy.it',
    credits: 10000
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Carica i dati del Tenant da Supabase via REST API (Zero dipendenze esterne necessarie)
  const fetchTenantData = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/tenants?id=eq.${id}&select=*`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      });

      if (!response.ok) {
        throw new Error('Errore durante il recupero dei dati dell\'azienda');
      }

      const data = await response.json();
      if (data && data.length > 0) {
        setTenant(data[0]);
      } else {
        // Se il tenant non esiste ancora nel DB, creiamo un record temporaneo dimostrativo
        await createDemoTenantIfNotExist(id);
      }
    } catch (err: any) {
      console.warn("Utilizzo del Tenant dimostrativo offline:", err.message);
    } finally {
      setLoading(false);
    }
  };

  // Crea un tenant di prova su Supabase se non presente
  const createDemoTenantIfNotExist = async (id: string) => {
    const demoPayload = {
      id: id,
      company_name: id === 'sipro-energy' ? 'Sipro Energy' : id.toUpperCase(),
      brand_color_hex: '#0284c7',
      credits: 10000
    };

    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/tenants`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(demoPayload)
      });
      if (res.ok) {
        const created = await res.json();
        if (created && created.length > 0) setTenant(created[0]);
      }
    } catch (e) {
      console.error("Impossibile creare il tenant demo:", e);
    }
  };

  useEffect(() => {
    fetchTenantData(tenantId);
  }, [tenantId]);

  const refreshTenant = async () => {
    await fetchTenantData(tenantId);
  };

  // Funzione per scalare crediti in tempo reale
  const deductCredits = async (amount: number, description: string): Promise<boolean> => {
    if (!tenant) return false;
    if (tenant.credits < amount) {
      alert("Crediti insufficienti. Ricarica il tuo pacchetto per continuare ad usare i moduli.");
      return false;
    }

    // Effettuiamo un aggiornamento ottimistico lato client
    setTenant(prev => prev ? { ...prev, credits: prev.credits - amount } : null);

    try {
      // Registriamo la transazione negativa su Supabase
      const transactionResponse = await fetch(`${SUPABASE_URL}/rest/v1/credit_transactions`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tenant_id: tenant.id,
          amount: -amount, // Importo negativo
          description: description
        })
      });

      if (!transactionResponse.ok) {
        console.error("Transazione fallita lato server, ripristino il saldo locale");
        await refreshTenant(); // Ripristina il valore reale
        return false;
      }

      return true;
    } catch (err) {
      console.error("Errore durante la registrazione della transazione:", err);
      await refreshTenant();
      return false;
    }
  };

  const setTenantId = (id: string) => {
    setTenantIdState(id);
  };

  return (
    <TenantContext.Provider value={{ tenant, loading, error, refreshTenant, deductCredits, setTenantId }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant deve essere usato all\'interno di un TenantProvider');
  }
  return context;
}
