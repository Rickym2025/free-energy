"use client";

import React, { useState } from 'react';

export default function LandingPage() {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const modules = [
    {
      title: "PV Planner & Report PVGIS",
      desc: "Traccia la falda del tetto direttamente dalle immagini satellitari. Il sistema calcola all'istante l'area, i moduli installabili e interroga l'API ufficiale europea PVGIS per darti una stima precisa di produzione annuale, risparmio e tempo di rientro.",
      icon: (
        <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
        </svg>
      )
    },
    {
      title: "Widget AI Qualificatore Lead",
      desc: "Un assistente virtuale fluttuante da inserire sul tuo sito web. Il visitatore inserisce l'indirizzo e l'importo della bolletta: l'AI esegue una stima immediata e registra un contatto già qualificato direttamente nella tua dashboard.",
      icon: (
        <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      )
    },
    {
      title: "Screening dei CV Automatizzato",
      desc: "Trova installatori e tecnici in pochissimo tempo. Carica i PDF dei curriculum ricevuti: l'AI analizza le competenze tecniche, valuta la vicinanza geografica e assegna un punteggio da 0 a 100 con un report strutturato dei punti di forza.",
      icon: (
        <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    {
      title: "Sopralluogo Digitale Rapido",
      desc: "Fornisci ai tuoi tecnici sul campo un'interfaccia mobile semplice per scattare foto al quadro elettrico, al contatore e al tetto. L'applicazione archivia tutto nel fascicolo del cliente per evitare dimenticanze e doppie trasferte.",
      icon: (
        <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    },
    {
      title: "Social Creator Integrato",
      desc: "Genera in pochi secondi pacchetti completi di comunicazione per Facebook, Instagram e TikTok. Ottieni testi persuasivi focalizzati sul superamento delle obiezioni (costi, burocrazia, meteo) strutturati con ganci psicologici efficaci.",
      icon: (
        <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      )
    },
    {
      title: "White-Label e Brandizzazione",
      desc: "Piattaforma interamente personalizzabile. Carica il tuo logo e imposta i colori del tuo brand in pochi istanti. Ogni report scaricabile in PDF e ogni interazione con i clienti presenterà l'identità visiva della tua azienda.",
      icon: (
        <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
        </svg>
      )
    }
  ];

  const faqs = [
    {
      q: "Come funziona il modello a crediti senza abbonamento?",
      a: "Nessun canone mensile fisso. Acquisti un pacchetto di crediti iniziale che puoi spendere liberamente all'interno di tutti i moduli (es: 50 crediti per analizzare un CV, 150 crediti per generare un report fotovoltaico completo). I crediti non hanno alcuna scadenza."
    },
    {
      q: "I report PDF generati usano i dati reali del territorio?",
      a: "Sì, interroghiamo direttamente le coordinate geografiche tramite il database scientifico PVGIS della Commissione Europea. Questo assicura dati accurati sull'irraggiamento solare specifico del tetto analizzato."
    },
    {
      q: "Posso installare il widget di Free Energy su un sito web esistente?",
      a: "Certamente. Forniamo un semplice codice JavaScript (una sola riga) da copiare e incollare all'interno del tuo sito web, indipendentemente dal fatto che sia sviluppato in WordPress, Webflow o HTML statico."
    }
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-emerald-500 selection:text-zinc-950">
      
      {/* Header */}
      <header className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="w-4 h-4 bg-emerald-500 rounded-full animate-pulse"></span>
          <span className="font-bold text-xl tracking-tight text-white">Free Energy</span>
        </div>
        <nav className="hidden md:flex space-x-8 text-sm font-medium text-zinc-400">
          <a href="#features" className="hover:text-white transition">Moduli</a>
          <a href="#pricing" className="hover:text-white transition">Prezzi</a>
          <a href="#faq" className="hover:text-white transition">FAQ</a>
        </nav>
        <a href="#pricing" className="bg-zinc-900 border border-zinc-800 hover:border-emerald-500 hover:text-emerald-400 px-4 py-2 rounded-lg text-sm font-medium transition">
          Inizia Ora
        </a>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 pt-16 pb-24 text-center md:pt-24 md:pb-32">
        <div className="inline-flex items-center space-x-2 bg-emerald-950/50 border border-emerald-800/60 px-3 py-1.5 rounded-full text-xs font-semibold text-emerald-400 mb-8">
          <span>Infrastruttura per Installatori Fotovoltaici</span>
        </div>
        <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-none max-w-4xl mx-auto">
          Meno sopralluoghi inutili. <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">Più impianti venduti.</span>
        </h1>
        <p className="mt-6 text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
          La piattaforma B2B white-label progettata per digitalizzare la tua azienda di fotovoltaico. Qualifica i contatti, stima i tetti via satellite e gestisci il team con un unico ecosistema a crediti.
        </p>

        {/* Dual High-Contrast CTAs */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <a href="#pricing" className="w-full sm:w-auto px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-xl shadow-lg shadow-emerald-500/10 transition duration-250 text-lg">
            Prova Gratuita (10.000 Crediti)
          </a>
          <a href="https://wa.me/39160349206" target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto px-8 py-4 bg-zinc-900 hover:bg-zinc-850 text-white font-medium rounded-xl border border-zinc-800 hover:border-zinc-700 transition duration-250 text-lg">
            Parla con un Esperto
          </a>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="bg-zinc-900/40 border-t border-b border-zinc-900 py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">Tutti i moduli di cui hai bisogno in un unico posto</h2>
            <p className="mt-4 text-zinc-400 leading-relaxed">Abbiamo centralizzato le operazioni ripetitive per consentire alla tua azienda di focalizzarsi solo sulla posa dei pannelli.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {modules.map((mod, i) => (
              <div key={i} className="bg-zinc-900/60 border border-zinc-800/80 p-8 rounded-2xl hover:border-emerald-500/40 transition duration-300">
                <div className="w-12 h-12 bg-emerald-950/40 border border-emerald-900/50 rounded-xl flex items-center justify-center mb-6">
                  {mod.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{mod.title}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">{mod.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Credit Pricing Section */}
      <section id="pricing" className="py-24 max-w-7xl mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">Modello Pay-As-You-GO. Nessun abbonamento.</h2>
          <p className="mt-4 text-zinc-400 leading-relaxed">Nessuna carta di credito richiesta all'iscrizione. Ricevi subito 10.000 crediti gratuiti per testare la piattaforma, poi ricarichi solo quando ne hai bisogno.</p>
        </div>

        <div className="max-w-md mx-auto bg-zinc-900 border border-zinc-800 p-8 rounded-3xl relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-emerald-500 text-zinc-950 text-xs font-bold px-3 py-1 rounded-bl-xl tracking-wide uppercase">Consigliato</div>
          <div className="text-zinc-400 font-semibold text-sm uppercase tracking-wider">Start Pack</div>
          <div className="mt-4 flex items-baseline">
            <span className="text-5xl font-black text-white">€199</span>
            <span className="text-zinc-400 ml-2 font-medium">/ ricarica</span>
          </div>
          <p className="mt-4 text-zinc-400 text-sm leading-relaxed">Ideale per installatori locali che vogliono digitalizzare il proprio processo d'ufficio e qualificare i contatti dal sito.</p>
          
          <ul className="mt-8 space-y-4 text-sm font-medium text-zinc-300 border-t border-zinc-800 pt-6">
            <li className="flex items-center space-x-3">
              <svg className="w-5 h-5 text-emerald-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
              <span>10.000 crediti inclusi</span>
            </li>
            <li className="flex items-center space-x-3">
              <svg className="w-5 h-5 text-emerald-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
              <span>Tutti i moduli sbloccati ed utilizzabili</span>
            </li>
            <li className="flex items-center space-x-3">
              <svg className="w-5 h-5 text-emerald-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
              <span>Crediti senza alcuna data di scadenza</span>
            </li>
            <li className="flex items-center space-x-3">
              <svg className="w-5 h-5 text-emerald-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
              <span>White-label: inserisci il tuo logo e colore</span>
            </li>
          </ul>

          <div className="mt-8">
            <button className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-xl transition duration-200">
              Inizia Ora il Prova Gratuito
            </button>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 bg-zinc-900/20 border-t border-zinc-900">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-white mb-12 tracking-tight">Domande Frequenti</h2>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
                <button onClick={() => toggleFaq(i)} className="w-full text-left p-6 font-semibold text-white flex justify-between items-center hover:bg-zinc-850 transition">
                  <span>{faq.q}</span>
                  <span className="text-zinc-500">{activeFaq === i ? "−" : "+"}</span>
                </button>
                {activeFaq === i && (
                  <div className="p-6 pt-0 text-zinc-400 text-sm leading-relaxed border-t border-zinc-800/50">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <section className="bg-emerald-950/20 border-t border-emerald-900/30 py-16 text-center">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-white tracking-tight">Pronto a trasformare la tua azienda in un'attività digitale?</h2>
          <p className="mt-4 text-emerald-400 max-w-xl mx-auto">Non rimandare il cambiamento operativo. Registrati in pochi secondi e ottieni subito i tuoi 10.000 crediti inclusi per fare i primi test.</p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button className="w-full sm:w-auto px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-xl transition duration-200">
              Registrati Subito Gratis
            </button>
            <a href="https://wa.me/39160349206" target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto px-8 py-4 bg-zinc-900 border border-zinc-800 text-white font-medium rounded-xl hover:border-zinc-700 transition duration-200">
              Contattaci su WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 py-8 text-center text-xs text-zinc-600 border-t border-zinc-900">
        <p>&copy; {new Date().getFullYear()} RM Studio - Free Energy. Tutti i diritti riservati. P.IVA 01646270298</p>
      </footer>
    </div>
  );
}
