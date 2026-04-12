'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { isAuthenticated } from '@/lib/auth';

export default function PortailPage() {
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated()) router.push('/');
  }, [router]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="w-full max-w-md">

        <div className="mb-10">
          <h1 className="font-title text-4xl font-black text-black uppercase leading-tight tracking-tight">
            Tombola<br />Escalade
          </h1>
          <div className="mt-3 border-l-4 border-ice pl-3">
            <p className="text-black text-sm font-medium">
              Championnats de France<br />Difficulté Jeunes · 16 &amp; 17 mai 2026
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <Link
            href="/tirage?jour=samedi"
            className="block w-full bg-ice border-2 border-black shadow-[4px_4px_0px_#000000] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] text-black font-black py-5 text-xl transition-all uppercase text-center"
          >
            Tirage — Samedi 16 mai
          </Link>

          <Link
            href="/tirage?jour=dimanche"
            className="block w-full bg-black border-2 border-black shadow-[4px_4px_0px_#8bbfd5] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] text-white font-black py-5 text-xl transition-all uppercase text-center"
          >
            Tirage — Dimanche 17 mai
          </Link>

          <Link
            href="/liste-lots"
            className="block w-full bg-white border-2 border-black shadow-[4px_4px_0px_#000000] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] text-black font-black py-4 text-lg transition-all uppercase text-center"
          >
            Liste des lots
          </Link>

          <Link
            href="/regles"
            className="block w-full bg-white border-2 border-black shadow-[4px_4px_0px_#000000] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] text-black font-black py-4 text-lg transition-all uppercase text-center"
          >
            Règles &amp; Informations
          </Link>

          <Link
            href="/tutoriel"
            className="block w-full bg-white border-2 border-black shadow-[4px_4px_0px_#000000] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] text-black font-black py-4 text-lg transition-all uppercase text-center"
          >
            Tutoriel
          </Link>
        </div>
      </div>
    </div>
  );
}
