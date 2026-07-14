"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TenantProvider, useTenant } from '@/app/context/TenantContext';

interface ChatMessage {
  id: string;
  text: string;
  sender: 'bot' | 'user';
}

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { tenant, loading } = useTenant();
  const pathname = usePathname();
  const [showRicaricaModal, setShowRicaricaModal] = useState(false);
  
  // Gestione larghezza trascinabile (Draggable) e pulsante contrazione (Toggle)
  const [sidebarWidth, setSidebarWidth] = useState(256);
  const [lastExpandedWidth, setLastExpandedWidth] = useState(256); // Ricorda l'ultima larghezza allargata
  const [isResizing, setIsResizing] = useState(false);

  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'init-1', text: "Ciao! Sono Aurora, l'assistente virtuale ed ingegneristico di Free Energy. Sono qui per aiutarti a tracciare i tuoi capannoni ed attivare i moduli. Come posso esserti utile oggi?", sender: 'bot' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const WEBHOOK_ADMIN_CHATBOT = 'https://n8n.rmstudio.app/webhook/admin-chatbot';

  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = e.clientX;
      if (newWidth >= 180 && newWidth <= 380) {
        setSidebarWidth(newWidth);
        setLastExpandedWidth(newWidth); // Salva la preferenza di trascinamento
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // Gestore del pulsante di contrazione manuale (Toggle)
  const toggleSidebar = () => {
    if (sidebarWidth <= 80) {
      // Se è già contratta, espandila ripristinando l'ultima larghezza preferita dall'utente
      setSidebarWidth(lastExpandedWidth);
    } else {
      // Se è aperta, contratta a icona fissa (72px)
      setLastExpandedWidth(sidebarWidth);
      setSidebarWidth(72);
    }
  };

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  useEffect(() => {
    const styleSheet = document.createElement("style");
    styleSheet.innerHTML = `
      .no-scrollbar::-webkit-scrollbar { display: none !important; }
      .no-scrollbar { -ms-overflow-style: none !important; scrollbar-width: none !important; }
    `;
    document.head.appendChild(styleSheet);
    return () => styleSheet.remove();
  }, []);

  const sendChatMessage = async (textOverride?: string) => {
    const text = (textOverride || inputValue).trim();
    if (!text) return;

    setInputValue('');
    const userMsgId = 'user-' + Date.now();
    setMessages(prev => [...prev, { id: userMsgId, text, sender: 'user' }]);
    setIsTyping(true);

    try {
      const res = await fetch(WEBHOOK_ADMIN_CHATBOT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          sessionId: localStorage.getItem('fe_admin_session') || 'fe_' + Math.random().toString(36).substring(7),
          tenant_id: tenant?.id
        })
      });

      const raw = await res.text();
      let reply = 'Errore di risposta.';
      try {
        const data = JSON.parse(raw);
        reply = data.output || data.response || data.text || raw;
      } catch (_) {
        reply = raw;
      }

      setMessages(prev => [...prev, { id: 'bot-' + Date.now(), text: reply, sender: 'bot' }]);
    } catch (err) {
      setMessages(prev => [...prev, { id: 'bot-err-' + Date.now(), text: 'Connessione con Aurora temporaneamente offline.', sender: 'bot' }]);
    } finally {
      setIsTyping(false);
    }
  };

  const sidebarGroups = [
    {
      title: "Pianificazione & Cantieri",
      colorClass: "text-emerald-400",
      items: [
        { name: "Pianificatore (Mappa)", href: "/dashboard/pv-planner", active: true, icon: <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg> },
        { name: "Gestione Cantieri & CRM", href: "/dashboard/leads", active: true, icon: <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg> }
      ]
    },
    {
      title: "Risorse Umane (HR)",
      colorClass: "text-amber-400",
      items: [
        { 
          name: "Scrittore Annunci", 
          href: "/dashboard/job-postings", 
          active: true, 
          icon: (
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10l4 4v10a2 2 0 01-2 2z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 2v4a2 2 0 002 2h4" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12H8m0 4h8" />
            </svg>
          )
        },
        { name: "Valutazione CV", href: "/dashboard/cv-evaluator", active: true, icon: <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> },
        { 
          name: "Registro Presenze", 
          href: "/dashboard/attendance", 
          active: true, 
          icon: (
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )
        }
      ]
    },
    {
      title: "Marketing",
      colorClass: "text-sky-400",
      items: [
        { name: "Creatore Post Social", href: "/dashboard/social-creator", active: true, icon: <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg> }
      ]
    },
    {
      title: "Servizi Premium",
      colorClass: "text-purple-400", 
      items: [
        { name: "Nexus Assistente Sitoweb", href: "/dashboard/nexus", active: tenant?.nexus_active, icon: <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>, addon: true },
        { 
          name: "Centralino AI H24", 
          href: "/dashboard/dentis", 
          active: tenant?.dentis_active, 
          icon: (
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2zM9 9h6M9 13h3" />
            </svg>
          ), 
          addon: true 
        }
      ]
    },
    {
      title: "Amministrazione",
      colorClass: "text-zinc-500",
      items: [
        { name: "Impostazioni Marchio", href: "/dashboard/settings", icon: <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg> }
      ]
    }
  ];

  const brandColor = tenant?.brand_color_hex || '#0284c7';

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const isCollapsed = sidebarWidth <= 80;

  return (
    <div className="min-h-screen bg-transparent text-zinc-100 flex flex-col md:flex-row" style={{ '--brand-color': brandColor } as React.CSSProperties}>
      
      <aside 
        style={{ width: `${sidebarWidth}px` }}
        className="hidden md:flex flex-col h-screen sticky top-0 bg-zinc-900/90 backdrop-blur-md border-r border-zinc-800 p-6 flex-shrink-0 z-40 relative transition-all duration-300"
      >
        
        {/* Maniglia trascinabile sul bordo destro */}
        <div 
          onMouseDown={startResizing}
          className={`absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-emerald-500/50 transition-all z-50 ${isResizing ? 'bg-emerald-500' : ''}`}
          title="Trascina per allargare"
        />

        {/* Intestazione */}
        <div className="flex items-center space-x-3 w-full overflow-hidden">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-sm shrink-0" style={{ backgroundColor: brandColor }}>
            {tenant?.company_name.substring(0, 2).toUpperCase()}
          </div>
          {!isCollapsed && (
            <span className="font-bold text-lg text-white tracking-tight truncate animate-fadeIn">{tenant?.company_name}</span>
          )}
        </div>

        {/* Crediti Attivi */}
        <div 
          onClick={() => setShowRicaricaModal(true)}
          className={`bg-zinc-850/80 border border-zinc-800 p-4 rounded-2xl cursor-pointer hover:border-emerald-500/40 transition duration-200 w-full mt-4 ${isCollapsed ? 'text-center p-2' : ''}`}
        >
          {isCollapsed ? (
            <span className="text-xl block" title={`Crediti: ${tenant?.credits.toLocaleString()}`}>💳</span>
          ) : (
            <div className="animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-zinc-400 uppercase">Crediti</span>
                <span className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-wide">💳 Ricarica</span>
              </div>
              <span className="text-2xl font-black text-white mt-1 block truncate">{tenant?.credits.toLocaleString()}</span>
            </div>
          )}
        </div>

        {/* Menu Navigazione */}
        <nav className="flex-1 space-y-6 overflow-y-auto no-scrollbar w-full mt-6">
          {sidebarGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-2">
              {!isCollapsed && (
                <span className="text-[10px] font-extrabold uppercase tracking-widest block px-2 opacity-80 truncate animate-fadeIn" style={{ color: brandColor }}>
                  {group.title}
                </span>
              )}
              <div className="space-y-1">
                {group.items.map((item: any) => {
                  const isActive = pathname === item.href;
                  const isLockedAndGreyed = item.addon && !item.active;

                  return (
                    <Link 
                      key={item.href} 
                      href={item.href} 
                      className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-sm transition ${
                        isActive 
                          ? 'text-white bg-zinc-800/80 font-bold cursor-pointer' 
                          : isLockedAndGreyed 
                            ? 'text-zinc-650 opacity-40 hover:text-zinc-500 hover:opacity-60 bg-zinc-950/20 font-medium cursor-pointer' 
                            : 'text-zinc-300 hover:text-white hover:bg-zinc-800/30 font-semibold cursor-pointer' 
                      } ${isCollapsed ? 'justify-center px-2 py-3' : ''}`} 
                      title={isCollapsed ? item.name : undefined}
                      style={isActive && !isCollapsed ? { borderLeft: `3px solid ${brandColor}` } : {}}
                    >
                      <div className="flex items-center space-x-3 truncate">
                        <span style={isActive ? { color: brandColor } : {}}>{item.icon}</span>
                        {!isCollapsed && <span className="truncate animate-fadeIn">{item.name}</span>}
                      </div>
                      {!isCollapsed && isLockedAndGreyed && <span className="text-xs shrink-0">🔒</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Pulsante Toggle Comprimi/Espandi integrato */}
        <div className="pt-4 border-t border-zinc-800 w-full flex justify-center">
          <button 
            onClick={toggleSidebar}
            className="w-10 h-10 bg-zinc-950 hover:bg-zinc-800 border border-zinc-850 rounded-xl flex items-center justify-center text-sm transition-colors text-zinc-400"
            title={isCollapsed ? "Espandi Sidebar" : "Riduci a Icone"}
          >
            {isCollapsed ? "▶" : "◀"}
          </button>
        </div>

      </aside>

      <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full overflow-y-auto relative pb-24">
        {children}
      </main>

      {/* Finestra Modale per Ricarica Crediti (Nuovi Pacchetti Free Energy) */}
      {showRicaricaModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-fadeIn print:hidden">
          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl w-full max-w-lg relative space-y-6 shadow-2xl">
            <button 
              onClick={() => setShowRicaricaModal(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white"
            >
              ✕
            </button>
            
            <div className="text-center">
              <span className="text-3xl block mb-2">☀️</span>
              <h2 className="text-xl font-bold text-white">Ricarica Crediti Free Energy</h2>
              <p className="text-xs text-zinc-400 mt-1">Scegli un pacchetto di crediti prepagati senza scadenza per alimentare i tuoi preventivi e tenere attivi i servizi Premium.</p>
            </div>

            <div className="space-y-3">
              {/* Pacchetto 1: Base */}
              <a 
                href="https://buy.stripe.com/placeholder_ricarica_base" 
                target="_blank"
                rel="noopener noreferrer"
                className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 flex items-center justify-between hover:border-emerald-500/40 transition-colors block"
              >
                <div className="text-left">
                  <span className="font-bold text-white text-sm block">Ricarica Base</span>
                  <span className="text-[10px] text-zinc-500 block mt-0.5">Include 500 crediti prepagati (pari a €10,00/credito)</span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-black text-emerald-400">€ 49,00</span>
                  <span className="text-[10px] text-zinc-500 block">una tantum</span>
                </div>
              </a>

              {/* Pacchetto 2: Pro */}
              <a 
                href="https://buy.stripe.com/placeholder_ricarica_pro" 
                target="_blank"
                rel="noopener noreferrer"
                className="bg-zinc-950 p-4 rounded-xl border-2 border-emerald-500/30 flex items-center justify-between hover:border-emerald-500/60 transition-colors block relative"
              >
                <div className="absolute -top-2.5 right-4 bg-emerald-500 text-zinc-950 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">
                  🔥 Consigliato (+10% Bonus)
                </div>
                <div className="text-left">
                  <span className="font-bold text-white text-sm block">Ricarica Pro</span>
                  <span className="text-[10px] text-zinc-500 block mt-0.5">Include 2.200 crediti (200 crediti omaggio inclusi)</span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-black text-emerald-400">€ 179,00</span>
                  <span className="text-[10px] text-zinc-500 block">una tantum</span>
                </div>
              </a>

              {/* Pacchetto 3: Max */}
              <a 
                href="https://buy.stripe.com/placeholder_ricarica_max" 
                target="_blank"
                rel="noopener noreferrer"
                className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 flex items-center justify-between hover:border-emerald-500/40 transition-colors block"
              >
                <div className="text-left">
                  <span className="font-bold text-white text-sm block">Ricarica Max</span>
                  <span className="text-[10px] text-zinc-500 block mt-0.5">Include 4.500 crediti (1.000 crediti omaggio inclusi)</span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-black text-emerald-400">€ 349,00</span>
                  <span className="text-[10px] text-zinc-500 block">una tantum</span>
                </div>
              </a>
            </div>

            <p className="text-[10px] text-zinc-500 text-center leading-relaxed">
              La transazione è protetta e gestita in modo sicuro tramite crittografia Stripe. I crediti verranno accreditati istantaneamente sul tuo wallet aziendale al completamento dell'acquisto.
            </p>
          </div>
        </div>
      )}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <TenantProvider>
      <DashboardContent>{children}</DashboardContent>
    </TenantProvider>
  );
}
