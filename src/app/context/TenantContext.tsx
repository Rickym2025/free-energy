"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Funzione di inizializzazione ultra-sicura per prevenire stringhe "undefined" o vuote
const getEnvVar = (value: string | undefined, fallback: string): string => {
  if (!value || value === "undefined" || value.trim() === "" || value === "null") return fallback;
  return value.replace(/^["']|["']$/g, '').trim();
};

const SUPABASE_URL = getEnvVar(process.env.NEXT_PUBLIC_SUPABASE_URL, "https://hmpxgbzykwwqgfzifdlc.supabase.co").replace(/\/$/, '');
const SUPABASE_ANON_KEY = getEnvVar(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmcHhnYnp5a3d3cWdmemlmZGxjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4MTA0NjAsImV4cCI6MjA5OTM4NjQ2MH0.eAq1O2IOiSRPYewnBTi9xuxeJlPxVa5OIW6f7qN9hIw");

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

  const fetchTenantData = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      if (id === 'modena.riccardo@gmail.com') {
        const adminData = {
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

      const response = await fetch(`${SUPABASE_URL}/rest/v1/tenants?id=eq.${id}&select=*`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      });

      if (!response.ok) throw new Error('Accesso non autorizzato (401/403)');

      const data = await response.json();
      if (data && data.length > 0) {
        const fullData = {
          ...data[0],
          panel_width_m: data[0].panel_width_m || 1.65,
          panel_height_m: data[0].panel_height_m || 1.0,
          nexus_active: data[0].nexus_active || false,
          dentis_active: data[0].dentis_active || false
        };
        setTenant(fullData);
        localStorage.setItem('fe_tenant_data', JSON.stringify(fullData));
      } else {
        await createDemoTenantIfNotExist(id);
      }
    } catch (err: any) {
      console.warn("Utilizzo cache locale:", err.message);
      const localCached = localStorage.getItem('fe_tenant_data');
      if (localCached && localCached !== "undefined" && localCached !== "null") {
        try { setTenant(JSON.parse(localCached)); } catch (_) {}
      } else {
        setTenant({
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
        });
      }
    } finally {
      setLoading(false);
    }
  };

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
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(demoPayload)
      });
      if (res.ok) {
        const created = await res.json();
        if (created && created.length > 0) {
          const fullData = {
            ...created[0],
            panel_width_m: created[0].panel_width_m || 1.65,
            panel_height_m: created[0].panel_height_m || 1.0,
            nexus_active: created[0].nexus_active || false,
            dentis_active: created[0].dentis_active || false
          };
          setTenant(fullData);
          localStorage.setItem('fe_tenant_data', JSON.stringify(fullData));
        }
      }
    } catch (e) {
      console.error("Errore durante la creazione del tenant demo:", e);
    }
  };

  useEffect(() => {
    const savedId = localStorage.getItem('fe_tenant_id') || 'sipro-energy';
    setTenantIdState(savedId);

    const localCached = localStorage.getItem('fe_tenant_data');
    if (localCached && localCached !== "undefined" && localCached !== "null") {
      try { setTenant(JSON.parse(localCached)); } catch (_) {}
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

  const deductCredits = async (amount: number, description: string): Promise<boolean> => {
    if (!tenant) return false;
    if (tenant.credits > 500000) return true;
    if (tenant.credits < amount) {
      alert("Crediti insufficienti.");
      return false;
    }

    const nextCredits = tenant.credits - amount;
    updateTenantState({ credits: nextCredits });

    try {
      await fetch(`${SUPABASE_URL}/rest/v1/credit_transactions`, {
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
      return true;
    } catch (err) {
      return true;
    }
  };

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
      return true;
    }
  };

  return (
    <TenantContext.Provider value={{ tenant, loading, error, refreshTenant, deductCredits, activateService, updateTenantState, setTenantId }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) throw new Error('useTenant deve essere usato in un TenantProvider');
  return context;
}
