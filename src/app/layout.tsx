import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Tombola — Escalade Difficulté Jeunes',
  description: 'Tirage au sort Championnats de France',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="bg-slate-900 min-h-screen antialiased">{children}</body>
    </html>
  );
}
