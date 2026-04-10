import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: 'Tombola — Escalade Difficulté Jeunes',
  description: 'Tirage au sort Championnats de France',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="bg-slate-900 min-h-screen antialiased">{children}</body>
    </html>
  );
}
