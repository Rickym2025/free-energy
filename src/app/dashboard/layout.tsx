"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TenantProvider, useTenant } from '../../context/TenantContext';

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { tenant, loading } = useTenant();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Lista dei link di navigazione della Dashboard
  const navItems = [
    {
      name: "PV Planner (Mappa)",
      href: "/dashboard/pv-planner",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      )
    },
    {
      name: "Valutazione CV",
      href: "/dashboard/cv-evaluator",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    {
      name: "Social Creator",
      href: "/dashboard/social-creator",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      )
    },
    {
      name: "Widget Lead AI",
      href: "/dashboard/widget-config",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      )
    },
    {
      name: "Impostazioni Brand",
      href: "/dashboard/settings",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
      )
    }
  ];

  const brandColor = tenant?.brand_color_hex || '#0284c7';

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium">Inizializzazione Free Energy...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col md:flex-row"
      style={{ '--brand-color': brandColor } as React.CSSProperties}
    >
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-zinc-900 border-r border-zinc-800 p-6 space-y-8 flex-shrink-0">
        <div className="flex items-center space-x-3">
          {tenant?.logo_url ? (
            <img src={tenant.logo_url} alt="Logo" className="h-8 max-w-[120px] object-contain" />
          ) : (
            <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-sm" style={{ backgroundColor: brandColor }}>
              {tenant?.company_name.substring(0, 2).toUpperCase()}
            </div>
          )}
          <span className="font-bold text-lg text-white tracking-tight">{tenant?.company_name}</span>
        </div>

        <nav className="flex-1 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition duration-200 ${
                  isActive 
                    ? 'text-white' 
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
                }`}
                style={isActive ? { backgroundColor: `${brandColor}20`, borderLeft: `3px solid ${brandColor}` } : {}}
              >
                <span style={isActive ? { color: brandColor } : {}}>{item.icon}</span>
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Info Box Crediti residui */}
        <div className="bg-zinc-850 border border-zinc-800 p-4 rounded-2xl">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">Crediti Attivi</span>
          <span className="text-2xl font-black text-white mt-1 block">{tenant?.credits.toLocaleString()}</span>
          <span className="text-[10px] text-zinc-500 mt-1 block">Nessuna scadenza attiva</span>
        </div>
      </aside>

      {/* Header Mobile */}
      <header className="md:hidden bg-zinc-900 border-b border-zinc-800 p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-xs" style={{ backgroundColor: brandColor }}>
            {tenant?.company_name.substring(0, 2).toUpperCase()}
          </div>
          <span className="font-bold text-white">{tenant?.company_name}</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
          className="p-2 text-zinc-400 hover:text-white"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={isMobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
          </svg>
        </button>
      </header>

      {/* Menu Navigazione Mobile */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-zinc-900 border-b border-zinc-800 px-6 py-4 space-y-3">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link 
                key={item.href} 
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center space-x-3 p-3 rounded-lg text-sm font-medium ${
                  isActive ? 'bg-zinc-800 text-white' : 'text-zinc-400'
                }`}
              >
                {item.icon}
                <span>{item.name}</span>
              </Link>
            );
          })}
          <div className="bg-zinc-850 p-4 rounded-xl mt-4">
            <span className="text-xs text-zinc-400 block">Crediti Residui</span>
            <span className="text-lg font-bold text-white mt-1 block">{tenant?.credits.toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full overflow-y-auto">
        {children}
      </main>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <TenantProvider>
      <DashboardContent>{children}</DashboardContent>
    </TenantProvider>
  );
}
