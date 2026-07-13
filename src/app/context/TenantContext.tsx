"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

/**
 * Funzione di utilità per acquisire e sanificare in modo sicuro le variabili d'ambiente.
 * Rimuove eventuali virgolette singole/doppie, spazi o slash finali che causerebbero
 * errori di autorizzazione 401 o 400 Bad Request su Supabase.
 */
const getEnvVar = (value: string | undefined, fallback: string): string => {
  if (!value || value === "undefined" || value.trim() === "" || value === "null") {
    return fallback;
  }
  return value.replace(/^["']|["']$/g, '').trim();
};

// Inizializzazione pulita degli URL e delle Chiavi API
const SUPABASE_URL = getEnvVar(process.env.NEXT_PUBLIC_SUPABASE_URL, "https://hmpxgbzykwwqgfzifdlc.supabase.co").replace(/\/$/, '');
const SUPABASE_ANON_KEY = getEnvVar(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmcHhnYnp5a3d3cWdmemlmZGxjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4MTA0NjAsImV4cCI6MjA5OTM4NjQ2MH0.eAq1O2IOiSRPYewnBTi9xuxeJlPxVa5OIW6f7qN9hIw");

// Interfaccia del Tenant
export interface Tenant {
  id: string;
  company_name: string;
  logo_url: string | null;
  brand_color_hex: string;
  notification_email: string | null;
  credits: number;
  panel_width_m: number;
  panel_height_m: number;
  nexus_active: boolean; 
  dentis_active: boolean; 
}

// Tipo per il contesto del Tenant
interface TenantContextType {
  tenant: Tenant | null;
  loading: boolean;
  error: string | null;
  refreshTenant: () => Promise<void>;
  deductCredits: (amount: number, description: string) => Promise<boolean>;
  activateService: (serviceName: 'nexus' | 'dentis', cost: number) => Promise<boolean>;
  updateTenantState: (updated: Partial<Tenant>) => void;
  setTenantId: (id: string) => void;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenantId, setTenantIdState] = useState<string>('sipro-energy');
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Recupera i dati del Tenant dal database Supabase.
   * Se il database risponde con errore o non è raggiungibile, carica la versione cache locale o di backup.
   */
  const fetchTenantData = async (id: string) => {
    setLoading(true);
    setError(null);
    
    // Log diagnostico in console per facilitare il debugging delle chiavi
    console.log(`[TenantContext] Inizializzazione caricamento per il tenant: "${id}"`);
    console.log(`[TenantContext] Configurazione Supabase URL: "${SUPABASE_URL}"`);

    try {
      // Gestione utente Admin Riccardo
      if (id === 'modena.riccardo@gmail.com') {
        const adminData: Tenant = {
          id: 'admin-riccardo',
          company_name: 'Nova Solar (Admin)',
          logo_url: null,
          brand_color_hex: '#10b981',
          notification_email: 'modena.riccardo@gmail.com',
          credits: 99999999,
          panel_width_m: 1.65,
          panel_height_m: 1.0,
          nexus_active: true,
          dentis_active: true
        };
        setTenant(adminData);
        localStorage.setItem('fe_tenant_data', JSON.stringify(adminData));
        return;
      }

      // Query REST a Supabase
      const response = await fetch(`${SUPABASE_URL}/rest/v1/tenants?id=eq.${id}&select=*`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      });

      if (!response.ok) {
        const errBody = await response.text();
        console.error(`[TenantContext] Risposta di rete non valida da Supabase: ${response.status} - ${errBody}`);
        throw new Error(`Errore di connessione Supabase: ${response.status}`);
      }

      const data = await response.json();
      
      if (data && data.length > 0) {
        // Unione dati con valori predefiniti di sicurezza
        const fullData: Tenant = {
          ...data[0],
          panel_width_m: data[0].panel_width_m || 1.65,
          panel_height_m: data[0].panel_height_m || 1.0,
          nexus_active: data[0].nexus_active || false,
          dentis_active: data[0].dentis_active || false
        };
        
        console.log(`[TenantContext] Dati del tenant caricati correttamente in cloud:`, fullData);
        setTenant(fullData);
        localStorage.setItem('fe_tenant_data', JSON.stringify(fullData));
      } else {
        // Se l'ID cercato non esiste, avvia la creazione automatica del tenant demo
        console.log(`[TenantContext] Tenant "${id}" non trovato nel database. Creazione demo in corso...`);
        await createDemoTenantIfNotExist(id);
      }
    } catch (err: any) {
      console.warn(`[TenantContext] Connessione cloud fallita. Utilizzo cache locale:`, err.message);
      
      // Caricamento paracadute da localStorage
      const localCached = localStorage.getItem('fe_tenant_data');
      if (localCached && localCached !== "undefined" && localCached !== "null") {
        try { 
          const parsed = JSON.parse(localCached);
          setTenant(parsed); 
          console.log(`[TenantContext] Cache locale caricata con successo:`, parsed);
        } catch (_) {
          console.error(`[TenantContext] Errore di parsing della cache locale.`);
        }
      } else {
        // Creazione tenant mockup di backup se la cache locale è vuota
        const backupTenant: Tenant = {
          id: id,
          company_name: id === 'sipro-energy' ? 'Sipro Energy' : 'Solis Energy SRL',
          logo_url: null,
          brand_color_hex: '#0284c7',
          notification_email: id === 'sipro-energy' ? 'info@siproenergy.it' : 'info@solisenergy.it',
          credits: id === 'sipro-energy' ? 10000 : 500,
          panel_width_m: 1.65,
          panel_height_m: 1.0,
          nexus_active: false,
          dentis_active: false
        };
        console.log(`[TenantContext] Nessuna cache locale trovata. Caricamento backup offline:`, backupTenant);
        setTenant(backupTenant);
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Crea un Tenant demo di backup direttamente nel database di Supabase
   * qualora non fosse presente (evita l'errore 404 all'onboarding).
   */
  const createDemoTenantIfNotExist = async (id: string) => {
    const initialCredits = id === 'sipro-energy' ? 10000 : 500;
    const companyName = id === 'sipro-energy' ? 'Sipro Energy' : 'Solis Energy SRL';

    const demoPayload = {
      id: id,
      company_name: companyName,
      brand_color_hex: '#0284c7',
      credits: initialCredits,
      panel_width_m: 1.65,
      panel_height_m: 1.0,
      nexus_active: false,
      dentis_active: false
    };

    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/tenants`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation' // Forza Supabase a restituire il record inserito
        },
        body: JSON.stringify(demoPayload)
      });
      
      if (res.ok) {
        const created = await res.json();
        if (created && created.length > 0) {
          const fullData: Tenant = {
            ...created[0],
            panel_width_m: created[0].panel_width_m || 1.65,
            panel_height_m: created[0].panel_height_m || 1.0,
            nexus_active: created[0].nexus_active || false,
            dentis_active: created[0].dentis_active || false
          };
          console.log(`[TenantContext] Tenant demo creato ed inizializzato:`, fullData);
          setTenant(fullData);
          localStorage.setItem('fe_tenant_data', JSON.stringify(fullData));
        }
      } else {
        const errText = await res.text();
        console.error(`[TenantContext] Errore creazione tenant demo: ${res.status} - ${errText}`);
      }
    } catch (e) {
      console.error("[TenantContext] Eccezione riscontrata nella creazione del tenant demo:", e);
    }
  };

  /**
   * All'avvio dell'applicazione, recupera le impostazioni salvate
   * ed avvia l'interrogazione cloud del database.
   */
  useEffect(() => {
    const savedId = localStorage.getItem('fe_tenant_id') || 'sipro-energy';
    setTenantIdState(savedId);

    const localCached = localStorage.getItem('fe_tenant_data');
    if (localCached && localCached !== "undefined" && localCached !== "null") {
      try { 
        setTenant(JSON.parse(localCached)); 
      } catch (_) {}
    }
    fetchTenantData(savedId);
  }, []);

  const refreshTenant = async () => {
    await fetchTenantData(tenantId);
  };

  const updateTenantState = (updated: Partial<Tenant>) => {
    setTenant(prev => {
      if (!prev) return null;
      const next = { ...prev, ...updated };
      localStorage.setItem('fe_tenant_data', JSON.stringify(next));
      return next;
    });
  };

  const setTenantId = (id: string) => {
    localStorage.setItem('fe_tenant_id', id);
    setTenantIdState(id);
    fetchTenantData(id);
  };

  /**
   * Sottrae un ammontare di crediti e scrive la transazione sul database log di Supabase.
   */
  const deductCredits = async (amount: number, description: string): Promise<boolean> => {
    if (!tenant) return false;
    
    // Gestione crediti illimitati per gli amministratori
    if (tenant.credits > 500000) return true;
    
    if (tenant.credits < amount) {
      alert("Crediti insufficienti nel wallet.");
      return false;
    }

    const nextCredits = tenant.credits - amount;
    updateTenantState({ credits: nextCredits });

    console.log(`[TenantContext] Detrazione crediti: -${amount} per "${description}". Nuovi crediti stimati: ${nextCredits}`);

    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/credit_transactions`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tenant_id: tenant.id,
          amount: -amount,
          description: description
        })
      });
      
      if (!response.ok) {
        console.warn(`[TenantContext] Scrittura transazione rifiutata da Supabase. Stato: ${response.status}`);
      }
      return true;
    } catch (err) {
      console.warn("[TenantContext] Impossibile scrivere la transazione su Supabase. Crediti modificati localmente.");
      return true;
    }
  };

  /**
   * Attiva un servizio Premium (Nexus AI o Serena AI / Dentis)
   * detraendone il costo mensile dal wallet crediti.
   */
  const activateService = async (serviceName: 'nexus' | 'dentis', cost: number): Promise<boolean> => {
    if (!tenant) return false;
    
    const success = await deductCredits(cost, `Attivazione modulo: ${serviceName.toUpperCase()}`);
    if (!success) return false;

    const update: any = {};
    update[`${serviceName}_active`] = true;
    updateTenantState(update);

    try {
      await fetch(`${SUPABASE_URL}/rest/v1/tenants?id=eq.${tenant.id}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(update)
      });
      return true;
    } catch (err) {
      console.warn("[TenantContext] Impossibile persistere lo stato di attivazione in cloud.");
      return true;
    }
  };

  return (
    <TenantContext.Provider value={{ 
      tenant, 
      loading, 
      error, 
      refreshTenant, 
      deductCredits, 
      activateService, 
      updateTenantState, 
      setTenantId 
    }}>
      {children}
    </TenantContext.Provider>
  );
}

/**
 * Hook personalizzato per usufruire del Context del Tenant all'interno del frontend.
 */
export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant deve essere usato all\'interno di un TenantProvider');
  }
  return context;
}
