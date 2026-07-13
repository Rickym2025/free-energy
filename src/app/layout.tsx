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
      <body className="antialiased bg-zinc-950 text-zinc-100 relative min-h-screen">
        
        {/* Video Loop in Background Generico e Leggero */}
        <video 
          autoPlay 
          loop 
          muted 
          playsInline 
          className="fixed inset-0 w-full h-full object-cover z-[-2] pointer-events-none opacity-[0.08]"
        >
          <source src="/background.mp4" type="video/mp4" />
        </video>

        {/* Overlay scuro per garantire il contrasto di lettura */}
        <div className="fixed inset-0 bg-zinc-950/60 z-[-1] pointer-events-none"></div>

        {children}
      </body>
    </html>
  );
}
