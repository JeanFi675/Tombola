'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { isAuthenticated } from '@/lib/auth';
import { fetchTirageSession } from '@/lib/nocodb';
import { sessionKey } from '@/lib/storage';
import type { TirageTicket } from '@/lib/nocodb';

function fmt(val: number) {
  return val % 1 === 0 ? `${val} €` : `${val.toFixed(2).replace('.', ',')} €`;
}

interface LotGroup {
  lotId: number;
  description: string;
  annonceur: string;
  valeur: number;
  numeros: number[];
}

function groupByLot(tickets: TirageTicket[]): LotGroup[] {
  const map = new Map<number, LotGroup>();
  for (const t of [...tickets].sort((a, b) => a.Numero - b.Numero)) {
    const existing = map.get(t.Lot_id);
    if (existing) {
      existing.numeros.push(t.Numero);
    } else {
      map.set(t.Lot_id, {
        lotId: t.Lot_id,
        description: t.Description,
        annonceur: t.Annonceur,
        valeur: t.Valeur,
        numeros: [t.Numero],
      });
    }
  }

  const groups = Array.from(map.values());

  // Total de valeur donné par chaque annonceur
  const annonceurTotaux = new Map<string, number>();
  for (const g of groups) {
    annonceurTotaux.set(g.annonceur, (annonceurTotaux.get(g.annonceur) ?? 0) + g.valeur * g.numeros.length);
  }

  return groups.sort((a, b) => {
    const totalA = annonceurTotaux.get(a.annonceur) ?? 0;
    const totalB = annonceurTotaux.get(b.annonceur) ?? 0;
    if (totalB !== totalA) return totalB - totalA; // annonceur le plus généreux en premier
    return b.valeur - a.valeur;                    // puis lot le plus cher en premier
  });
}

function formatNumeros(nums: number[]): string {
  if (nums.length === 0) return '';
  if (nums.length === 1) return `#${nums[0]}`;

  // Compacter les plages consécutives : 1,2,3,5 → #1–3, #5
  const ranges: string[] = [];
  let start = nums[0];
  let end = nums[0];

  for (let i = 1; i < nums.length; i++) {
    if (nums[i] === end + 1) {
      end = nums[i];
    } else {
      ranges.push(start === end ? `#${start}` : `#${start}–${end}`);
      start = nums[i];
      end = nums[i];
    }
  }
  ranges.push(start === end ? `#${start}` : `#${start}–${end}`);
  return ranges.join(', ');
}

export default function ListeLotsPage() {
  const router = useRouter();
  const [day, setDay] = useState<'samedi' | 'dimanche' | null>(null);
  const [groups, setGroups] = useState<LotGroup[]>([]);
  const [totalTickets, setTotalTickets] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated()) router.push('/');
  }, [router]);

  async function loadSession(d: 'samedi' | 'dimanche') {
    setDay(d);
    setLoading(true);
    setError('');
    try {
      const tickets = await fetchTirageSession(sessionKey(d));
      if (tickets.length === 0) {
        setError('Aucune session initialisée pour ce jour. Lancez d\'abord le tirage.');
        setGroups([]);
        setTotalTickets(0);
      } else {
        setGroups(groupByLot(tickets));
        setTotalTickets(tickets.length);
      }
    } catch (e) {
      setError(`Erreur NocoDB : ${e}`);
    } finally {
      setLoading(false);
    }
  }

  const dayLabel = day === 'samedi' ? 'Samedi 16 mai' : 'Dimanche 17 mai';

  return (
    <div className="min-h-screen bg-white">

      {/* Header — masqué à l'impression */}
      <div className="print:hidden border-b-2 border-black px-4 py-4 flex items-center justify-between max-w-4xl mx-auto">
        <Link
          href="/tirage"
          className="text-black opacity-40 hover:opacity-100 text-sm font-bold uppercase tracking-wider transition-opacity"
        >
          ← Retour au tirage
        </Link>
        <h1 className="font-title text-xl font-black uppercase tracking-tight text-black">
          Liste des lots
        </h1>
        {groups.length > 0 && (
          <button
            onClick={() => window.print()}
            className="bg-black text-white font-black text-sm px-4 py-2 border-2 border-black shadow-[3px_3px_0px_#8bbfd5] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all uppercase tracking-wide"
          >
            Imprimer / PDF
          </button>
        )}
        {groups.length === 0 && <div className="w-32" />}
      </div>

      {/* Sélection du jour — masquée à l'impression */}
      {!day && (
        <div className="print:hidden flex items-center justify-center min-h-[calc(100vh-65px)] p-6">
          <div className="border-2 border-black shadow-[6px_6px_0px_#000000] bg-white p-8 w-full max-w-sm">
            <p className="text-black text-sm font-bold uppercase tracking-widest mb-6 border-l-4 border-ice pl-3">
              Choisir la journée
            </p>
            <div className="space-y-4">
              <button
                onClick={() => loadSession('samedi')}
                className="w-full bg-ice border-2 border-black shadow-[4px_4px_0px_#000000] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] text-black font-black py-4 text-lg transition-all uppercase"
              >
                Samedi 16 mai
              </button>
              <button
                onClick={() => loadSession('dimanche')}
                className="w-full bg-black border-2 border-black shadow-[4px_4px_0px_#8bbfd5] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] text-white font-black py-4 text-lg transition-all uppercase"
              >
                Dimanche 17 mai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Changement de jour — masqué à l'impression */}
      {day && (
        <div className="print:hidden flex gap-3 px-4 pt-4 max-w-4xl mx-auto">
          <button
            onClick={() => loadSession('samedi')}
            className={`font-black text-sm px-4 py-2 border-2 border-black uppercase tracking-wide transition-all ${
              day === 'samedi'
                ? 'bg-ice shadow-[3px_3px_0px_#000] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px]'
                : 'bg-white opacity-40 hover:opacity-100'
            }`}
          >
            Samedi
          </button>
          <button
            onClick={() => loadSession('dimanche')}
            className={`font-black text-sm px-4 py-2 border-2 border-black uppercase tracking-wide transition-all ${
              day === 'dimanche'
                ? 'bg-black text-white shadow-[3px_3px_0px_#8bbfd5] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px]'
                : 'bg-white opacity-40 hover:opacity-100'
            }`}
          >
            Dimanche
          </button>
        </div>
      )}

      {/* Contenu principal */}
      <div className="p-4 max-w-4xl mx-auto">

        {loading && (
          <p className="text-black font-black uppercase tracking-widest text-sm mt-8 print:hidden">
            Chargement…
          </p>
        )}

        {error && (
          <div className="border-2 border-black bg-ice px-4 py-3 mt-4 print:hidden">
            <p className="text-black text-sm font-bold">{error}</p>
          </div>
        )}

        {groups.length > 0 && (
          <>
            {/* En-tête d'impression */}
            <div className="hidden print:block mb-6">
              <h1 className="text-2xl font-black uppercase tracking-tight">
                Tombola Escalade — Liste des lots
              </h1>
              <p className="text-sm mt-1">{dayLabel} · {groups.length} lots · {totalTickets} tickets</p>
            </div>

            {/* Résumé — visible partout */}
            <div className="print:hidden mt-4 mb-4 text-black text-sm opacity-60 font-medium">
              {groups.length} lots · {totalTickets} tickets · {dayLabel}
            </div>

            {/* Tableau */}
            <div className="border-2 border-black overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-black bg-black text-white">
                    <th className="text-left font-black uppercase tracking-widest text-xs px-4 py-3 w-[25%]">Annonceur</th>
                    <th className="text-left font-black uppercase tracking-widest text-xs px-4 py-3 w-[40%]">Lot</th>
                    <th className="text-right font-black uppercase tracking-widest text-xs px-4 py-3 w-[12%]">Valeur</th>
                    <th className="text-right font-black uppercase tracking-widest text-xs px-4 py-3 w-[23%]">N° tickets</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((g, i) => (
                    <tr
                      key={g.lotId}
                      className={`border-b border-black last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                    >
                      <td className="px-4 py-3 font-black text-black">{g.annonceur}</td>
                      <td className="px-4 py-3 text-black opacity-70">{g.description}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-black">{fmt(g.valeur)}</td>
                      <td className="px-4 py-3 text-right font-mono text-black text-xs">{formatNumeros(g.numeros)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pied de page impression */}
            <div className="hidden print:block mt-6 text-xs text-gray-500">
              Généré le {new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
