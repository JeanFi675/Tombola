'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import { loadState, saveState, resetState, buildTickets, type DrawState, type Ticket } from '@/lib/storage';
import { fetchLots } from '@/lib/nocodb';

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmt(val: number) {
  return val % 1 === 0 ? `${val} €` : `${val.toFixed(2).replace('.', ',')} €`;
}

function dayLabel(day: 'samedi' | 'dimanche') {
  return day === 'samedi' ? 'Samedi 16 mai' : 'Dimanche 17 mai';
}

function dayColors(day: 'samedi' | 'dimanche' | null) {
  if (day === 'samedi') return { badge: 'bg-blue-600 text-white', btn: 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800', light: 'bg-blue-50 border-blue-200 text-blue-800' };
  if (day === 'dimanche') return { badge: 'bg-yellow-400 text-slate-900', btn: 'bg-yellow-400 hover:bg-yellow-500 active:bg-yellow-600 text-slate-900', light: 'bg-yellow-50 border-yellow-200 text-yellow-800' };
  return { badge: 'bg-slate-600 text-white', btn: 'bg-slate-600 hover:bg-slate-700', light: 'bg-slate-50 border-slate-200 text-slate-800' };
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function DaySelection({ onSelect, loading }: { onSelect: (day: 'samedi' | 'dimanche') => void; loading: boolean }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md text-center">
        <div className="text-5xl mb-4">🧗</div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Tombola Escalade</h1>
        <p className="text-slate-500 mb-8">Choisissez la journée à initialiser</p>

        <div className="space-y-4">
          <button
            onClick={() => onSelect('samedi')}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white font-bold py-5 rounded-xl text-xl transition-colors"
          >
            Samedi 16 mai
            <span className="block text-sm font-normal opacity-80 mt-1">63 lots · ~1 837 €</span>
          </button>

          <button
            onClick={() => onSelect('dimanche')}
            disabled={loading}
            className="w-full bg-yellow-400 hover:bg-yellow-500 active:bg-yellow-600 disabled:opacity-50 text-slate-900 font-bold py-5 rounded-xl text-xl transition-colors"
          >
            Dimanche 17 mai
            <span className="block text-sm font-normal opacity-60 mt-1">58 lots · ~1 832 €</span>
          </button>
        </div>

        {loading && <p className="text-slate-400 mt-4 text-sm">Chargement des lots depuis NocoDB…</p>}
      </div>
    </div>
  );
}

function PendingCard({
  ticket,
  onCollect,
  loading,
  colors,
}: {
  ticket: Ticket;
  onCollect: () => void;
  loading: boolean;
  colors: ReturnType<typeof dayColors>;
}) {
  return (
    <div className={`rounded-2xl border-2 p-6 ${colors.light} mb-6`}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium opacity-70">Numéro tiré</span>
        <span className="text-4xl font-black">#{ticket.number}</span>
      </div>

      <h2 className="text-2xl font-bold mb-1">{ticket.description}</h2>
      <p className="text-lg opacity-80 mb-1">{ticket.annonceur}</p>
      <p className="text-2xl font-bold">{fmt(ticket.valeur)}</p>

      <button
        onClick={onCollect}
        disabled={loading}
        className="mt-6 w-full bg-green-600 hover:bg-green-700 active:bg-green-800 disabled:opacity-50 text-white font-bold py-4 rounded-xl text-lg transition-colors flex items-center justify-center gap-2"
      >
        <span>✓</span>
        {loading ? 'Confirmation…' : 'Lot remis au gagnant'}
      </button>
    </div>
  );
}

function DrawButton({
  disabled,
  loading,
  colors,
  remaining,
  onDraw,
}: {
  disabled: boolean;
  loading: boolean;
  colors: ReturnType<typeof dayColors>;
  remaining: number;
  onDraw: () => void;
}) {
  return (
    <button
      onClick={onDraw}
      disabled={disabled || loading || remaining === 0}
      className={`w-full font-black py-8 rounded-2xl text-3xl transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-lg ${colors.btn}`}
    >
      {loading ? (
        <span className="animate-pulse">Tirage…</span>
      ) : remaining === 0 ? (
        <span>Tous les lots sont tirés !</span>
      ) : (
        <>
          🎲 TIRER UN NUMÉRO
          <span className="block text-base font-normal mt-1 opacity-80">
            {remaining} lot{remaining > 1 ? 's' : ''} disponible{remaining > 1 ? 's' : ''}
          </span>
        </>
      )}
    </button>
  );
}

function HistoryList({ tickets }: { tickets: Ticket[] }) {
  const drawn = [...tickets].filter(t => t.drawn).sort((a, b) => {
    // Les non collectés en premier
    if (!a.collected && b.collected) return -1;
    if (a.collected && !b.collected) return 1;
    return (b.drawnAt ?? '').localeCompare(a.drawnAt ?? '');
  });

  if (drawn.length === 0) return null;

  return (
    <div className="mt-6">
      <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-3">
        Lots tirés ({drawn.length})
      </h3>
      <div className="space-y-2">
        {drawn.map(t => (
          <div
            key={t.number}
            className={`flex items-center gap-3 rounded-xl px-4 py-3 ${
              t.collected ? 'bg-slate-800' : 'bg-orange-900/40 border border-orange-600'
            }`}
          >
            <span className={`text-lg font-mono font-bold ${t.collected ? 'text-slate-400' : 'text-orange-400'}`}>
              #{t.number}
            </span>
            <div className="flex-1 min-w-0">
              <p className={`font-medium truncate ${t.collected ? 'text-slate-400' : 'text-white'}`}>
                {t.description}
              </p>
              <p className="text-slate-500 text-sm truncate">{t.annonceur} · {fmt(t.valeur)}</p>
            </div>
            <span className={`text-sm font-medium shrink-0 ${t.collected ? 'text-green-500' : 'text-orange-400'}`}>
              {t.collected ? '✓ Remis' : '⏳ En attente'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function TiragePage() {
  const [state, setState] = useState<DrawState | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  // Vérification auth côté client au montage
  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/');
      return;
    }
    setState(loadState());
  }, [router]);

  const refresh = useCallback(() => {
    setState(loadState());
  }, []);

  async function handleInit(day: 'samedi' | 'dimanche') {
    setActionLoading(true);
    setError('');
    try {
      const lots = await fetchLots();
      const tickets = buildTickets(lots, day);
      const newState: DrawState = { day, initialized: true, pendingNumber: null, tickets };
      saveState(newState);
      refresh();
    } catch (e) {
      setError(`Erreur chargement NocoDB : ${e}`);
    } finally {
      setActionLoading(false);
    }
  }

  function handleDraw() {
    if (!state) return;
    const remaining = state.tickets.filter(t => !t.drawn);
    if (remaining.length === 0 || state.pendingNumber !== null) return;

    const winner = remaining[Math.floor(Math.random() * remaining.length)];
    const now = new Date().toISOString();
    const next: DrawState = {
      ...state,
      pendingNumber: winner.number,
      tickets: state.tickets.map(t =>
        t.number === winner.number ? { ...t, drawn: true, drawnAt: now } : t
      ),
    };
    saveState(next);
    setState(next);
  }

  function handleCollect(number: number) {
    if (!state) return;
    const now = new Date().toISOString();
    const next: DrawState = {
      ...state,
      pendingNumber: state.pendingNumber === number ? null : state.pendingNumber,
      tickets: state.tickets.map(t =>
        t.number === number ? { ...t, collected: true, collectedAt: now } : t
      ),
    };
    saveState(next);
    setState(next);
  }

  function handleReset() {
    if (!confirm('Remettre à zéro tout le tirage ? Cette action est irréversible.')) return;
    resetState();
    setState(loadState());
  }

  // ── Loading ──
  if (!state) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400 text-lg">
        Chargement…
      </div>
    );
  }

  // ── Sélection du jour ──
  if (!state.initialized) {
    return <DaySelection onSelect={handleInit} loading={actionLoading} />;
  }

  const colors = dayColors(state.day);
  const total = state.tickets.length;
  const drawn = state.tickets.filter(t => t.drawn).length;
  const remaining = total - drawn;
  const pendingTicket = state.pendingNumber != null
    ? state.tickets.find(t => t.number === state.pendingNumber)
    : null;
  const allDone = remaining === 0 && state.pendingNumber === null;

  return (
    <div className="min-h-screen p-4 pb-8 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between py-4 mb-4">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-bold px-3 py-1 rounded-full ${colors.badge}`}>
            {state.day && dayLabel(state.day)}
          </span>
        </div>
        <div className="text-right">
          <span className="text-white font-bold text-lg">{drawn}</span>
          <span className="text-slate-400 text-sm"> / {total} tirés</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-slate-700 rounded-full h-2 mb-6">
        <div
          className="h-2 rounded-full transition-all duration-500 bg-green-500"
          style={{ width: total > 0 ? `${(drawn / total) * 100}%` : '0%' }}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-900/50 border border-red-600 text-red-300 rounded-xl px-4 py-3 mb-4 text-sm">
          {error}
        </div>
      )}

      {/* Lot en attente de remise */}
      {pendingTicket && (
        <PendingCard
          ticket={pendingTicket}
          onCollect={() => handleCollect(pendingTicket.number)}
          loading={actionLoading}
          colors={colors}
        />
      )}

      {/* Bouton de tirage */}
      {!allDone && (
        <DrawButton
          disabled={state.pendingNumber !== null}
          loading={actionLoading && state.pendingNumber === null}
          colors={colors}
          remaining={remaining}
          onDraw={handleDraw}
        />
      )}

      {/* Message de fin */}
      {allDone && (
        <div className="bg-green-900/40 border border-green-600 rounded-2xl p-8 text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-green-400 mb-2">Tirage terminé !</h2>
          <p className="text-slate-400">Tous les lots ont été distribués.</p>
        </div>
      )}

      {/* Historique */}
      <HistoryList tickets={state.tickets} />

      {/* Reset */}
      <div className="mt-8 pt-6 border-t border-slate-700">
        <button
          onClick={handleReset}
          className="text-slate-500 hover:text-red-400 text-sm transition-colors"
        >
          Réinitialiser le tirage
        </button>
      </div>
    </div>
  );
}
