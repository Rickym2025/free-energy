import React from 'react';
import './globals.css';

export const metadata = {
  title: 'Free Energy - Piattaforma per Installatori Fotovoltaici',
  description: 'Meno sopralluoghi inutili, più impianti venduti. L’ecosistema digitale per la tua azienda di fotovoltaico.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it" className="scroll-smooth">
      {/* Sostituito bg-zinc-950 dal body per evitare la copertura del video */}
      <body className="antialiased bg-transparent text-zinc-100 relative min-h-screen">
        
        {/* PIANO -3: Sfondo solido scuro di base */}
        <div className="fixed inset-0 bg-zinc-950 z-[-3] pointer-events-none"></div>

        {/* PIANO -2: Video Loop ad opacità percettibile (15%) */}
        <video 
          autoPlay 
          loop 
          muted 
          playsInline 
          className="fixed inset-0 w-full h-full object-cover z-[-2] pointer-events-none opacity-[0.15]"
        >
          <source src="/background.mp4" type="video/mp4" />
        </video>

        {/* PIANO -1: Overlay scuro per garantire il contrasto di lettura dei testi */}
        <div className="fixed inset-0 bg-zinc-950/40 z-[-1] pointer-events-none"></div>

        {/* PIANO 0: Contenuto dell'applicazione Next.js */}
        {children}
      </body>
    </html>
  );
}
