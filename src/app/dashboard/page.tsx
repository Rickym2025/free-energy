"use client";

import React from 'react';
import Link from 'next/link';
import { useTenant } from '@/context/TenantContext';

export default function DashboardHome() {
  const { tenant } = useTenant();

  const stats = [
    { name: "Crediti Disponibili", value: tenant?.credits.toLocaleString() || "10.000", desc: "Nessuna scadenza", color: "text-emerald-400" },
    { name: "Lead Qualificati", value: "0", desc: "Dal tuo sito web", color: "text-zinc-400" },
    { name: "Report Generati", value: "0", desc: "Rilievi satellitari", color: "text-zinc-400" },
    { name: "CV in Valutazione", value: "0", desc: "Posa e cablaggi", color: "text-zinc-400" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Pannello di Controllo</h1>
        <p className="text-zinc-400 mt-1">Benvenuto in Free Energy. Monitora i consumi, calcola i tetti e qualifica i contatti.</p>
      </div>

      {/* Grid delle Statistiche */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
            <span className="text-xs text-zinc-500 font-semibold uppercase tracking-wider block">{stat.name}</span>
            <span className={`text-3xl font-bold mt-2 block ${stat.color}`}>{stat.value}</span>
            <span className="text-xs text-zinc-500 mt-1 block">{stat.desc}</span>
          </div>
        ))}
      </div>

      {/* Collegamenti Rapidi ai Moduli */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl flex flex-col justify-between">
          <div>
            <span className="text-2xl block">🛰️</span>
            <h2 className="text-xl font-bold text-white mt-4">PV Planner</h2>
            <p className="text-sm text-zinc-400 mt-2 leading-relaxed">Disegna il tetto via satellite ed elabora la stima dei pannelli in tempo reale tramite le API ufficiali di PVGIS.</p>
          </div>
          <Link href="/dashboard/pv-planner" className="mt-6 inline-block text-sm font-semibold text-emerald-400 hover:text-emerald-300">
            Apri Modulo &rarr;
          </Link>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl flex flex-col justify-between">
          <div>
            <span className="text-2xl block">📄</span>
            <h2 className="text-xl font-bold text-white mt-4">Valutatore CV</h2>
            <p className="text-sm text-zinc-400 mt-2 leading-relaxed">Analizza i profili dei candidati installatori ed elettricisti tramite intelligenza artificiale estraendo le certificazioni di sicurezza.</p>
          </div>
          <Link href="/dashboard/cv-evaluator" className="mt-6 inline-block text-sm font-semibold text-emerald-400 hover:text-emerald-300">
            Apri Modulo &rarr;
          </Link>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl flex flex-col justify-between">
          <div>
            <span className="text-2xl block">✍️</span>
            <h2 className="text-xl font-bold text-white mt-4">Social Creator</h2>
            <p className="text-sm text-zinc-400 mt-2 leading-relaxed">Genera campagne pubblicitarie per Facebook, script per Reels e sequenze Instagram Stories localizzate per il tuo comune target.</p>
          </div>
          <Link href="/dashboard/social-creator" className="mt-6 inline-block text-sm font-semibold text-emerald-400 hover:text-emerald-300">
            Apri Modulo &rarr;
          </Link>
        </div>

      </div>
    </div>
  );
}
