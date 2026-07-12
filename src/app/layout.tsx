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
      <body className="antialiased bg-zinc-950 text-zinc-100">
        {children}
      </body>
    </html>
  );
}
