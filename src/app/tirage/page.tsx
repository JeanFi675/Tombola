'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { isAuthenticated } from '@/lib/auth';
import { buildTickets, fromTirageTickets, sessionKey, type DrawState, type Ticket } from '@/lib/storage';
import { fetchLots, fetchTirageSession, insertTirageTickets, updateTirageTicket, clearTirageSession } from '@/lib/nocodb';

const POLL_MS = 4000;

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmt(val: number) {
  return val % 1 === 0 ? `${val} €` : `${val.toFixed(2).replace('.', ',')} €`;
}

function dayLabel(day: 'samedi' | 'dimanche') {
  return day === 'samedi' ? 'Samedi 16 mai' : 'Dimanche 17 mai';
}

type DayColors = {
  badge: string;
  btn: string;
  cardBg: string;
  cardText: string;
  progressFill: string;
};

function dayColors(day: 'samedi' | 'dimanche' | null): DayColors {
  if (day === 'samedi') return {
    badge: 'bg-ice border-2 border-black text-black',
    btn: 'bg-ice text-black shadow-[6px_6px_0px_#000000]',
    cardBg: 'bg-ice',
    cardText: 'text-black',
    progressFill: 'bg-ice',
  };
  if (day === 'dimanche') return {
    badge: 'bg-black border-2 border-black text-white',
    btn: 'bg-black text-white shadow-[6px_6px_0px_#8bbfd5]',
    cardBg: 'bg-black',
    cardText: 'text-white',
    progressFill: 'bg-black',
  };
  return {
    badge: 'bg-white border-2 border-black text-black',
    btn: 'bg-white text-black shadow-[6px_6px_0px_#000000]',
    cardBg: 'bg-white',
    cardText: 'text-black',
    progressFill: 'bg-black',
  };
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function DaySelection({ onSelect, loading }: { onSelect: (day: 'samedi' | 'dimanche') => void; loading: boolean }) {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="border-2 border-black shadow-[6px_6px_0px_#000000] bg-white p-8 w-full max-w-md">
        <h1 className="font-title text-4xl font-black text-black uppercase leading-tight tracking-tight mb-2">
          Tombola<br />Escalade
        </h1>
        <div className="border-l-4 border-ice pl-3 mb-8">
          <p className="text-black text-sm font-medium">Choisissez la journée</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => onSelect('samedi')}
            disabled={loading}
            className="w-full bg-ice border-2 border-black shadow-[4px_4px_0px_#000000] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] disabled:opacity-50 disabled:cursor-not-allowed text-black font-black py-5 text-xl transition-all uppercase"
          >
            Samedi 16 mai
            <span className="block text-sm font-normal mt-1">63 lots · ~1 837 €</span>
          </button>

          <button
            onClick={() => onSelect('dimanche')}
            disabled={loading}
            className="w-full bg-black border-2 border-black shadow-[4px_4px_0px_#8bbfd5] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] disabled:opacity-50 disabled:cursor-not-allowed text-white font-black py-5 text-xl transition-all uppercase"
          >
            Dimanche 17 mai
            <span className="block text-sm font-normal mt-1 opacity-60">58 lots · ~1 832 €</span>
          </button>
        </div>

        {loading && (
          <p className="text-black text-sm mt-4 border-l-4 border-ice pl-3">
            Chargement…
          </p>
        )}
      </div>
    </div>
  );
}

function PendingCard({
  ticket,
  onCollect,
  onUndo,
  loading,
  colors,
}: {
  ticket: Ticket;
  onCollect: () => void;
  onUndo: () => void;
  loading: boolean;
  colors: DayColors;
}) {
  return (
    <div className={`border-2 border-black shadow-[4px_4px_0px_#000000] p-6 mb-6 ${colors.cardBg} ${colors.cardText}`}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-black uppercase tracking-widest opacity-60">Numéro tiré</span>
        <span className="font-title text-5xl font-black">#{ticket.number}</span>
      </div>

      <h2 className="font-title text-2xl font-black mb-1 leading-tight">{ticket.description}</h2>
      <p className="text-lg opacity-70 mb-1">{ticket.annonceur}</p>
      <p className="font-title text-2xl font-black">{fmt(ticket.valeur)}</p>

      <button
        onClick={onCollect}
        disabled={loading}
        className="mt-6 w-full bg-black border-2 border-black shadow-[4px_4px_0px_#8bbfd5] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] disabled:opacity-50 disabled:cursor-not-allowed text-white font-black py-4 text-lg transition-all uppercase tracking-wide"
      >
        {loading ? 'Confirmation…' : '✓ Lot remis au gagnant'}
      </button>
      <button
        onClick={onUndo}
        disabled={loading}
        className="mt-4 w-full text-center text-xs opacity-20 hover:opacity-60 transition-opacity text-black disabled:cursor-not-allowed"
      >
        erreur de clic
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
  colors: DayColors;
  remaining: number;
  onDraw: () => void;
}) {
  const isDisabled = disabled || loading || remaining === 0;
  return (
    <button
      onClick={onDraw}
      disabled={isDisabled}
      className={`w-full font-title font-black py-8 text-3xl border-2 border-black transition-all uppercase tracking-wide
        ${isDisabled
          ? 'opacity-30 cursor-not-allowed shadow-none'
          : `${colors.btn} hover:shadow-none hover:translate-x-[6px] hover:translate-y-[6px]`
        }`}
    >
      {loading ? (
        <span>Tirage…</span>
      ) : remaining === 0 ? (
        <span>Tous les lots sont tirés !</span>
      ) : (
        <>
          TIRER UN NUMÉRO
          <span className="block text-base font-normal mt-1 opacity-70">
            {remaining} lot{remaining > 1 ? 's' : ''} disponible{remaining > 1 ? 's' : ''}
          </span>
        </>
      )}
    </button>
  );
}

function HistoryList({ tickets }: { tickets: Ticket[] }) {
  const drawn = [...tickets].filter(t => t.drawn).sort((a, b) => {
    if (!a.collected && b.collected) return -1;
    if (a.collected && !b.collected) return 1;
    return (b.drawnAt ?? '').localeCompare(a.drawnAt ?? '');
  });

  if (drawn.length === 0) return null;

  return (
    <div className="mt-6">
      <h3 className="text-black text-xs font-black uppercase tracking-widest mb-3 border-b-2 border-black pb-2">
        Lots tirés ({drawn.length})
      </h3>
      <div className="space-y-2">
        {drawn.map(t => (
          <div
            key={t.number}
            className={`flex items-center gap-3 border-2 border-black px-4 py-3 ${
              t.collected ? 'bg-white' : 'bg-ice'
            }`}
          >
            <span className="text-lg font-mono font-black text-black">
              #{t.number}
            </span>
            <div className="flex-1 min-w-0">
              <p className={`font-bold truncate text-black ${t.collected ? 'opacity-40' : ''}`}>
                {t.description}
              </p>
              <p className="text-black text-sm truncate opacity-50">{t.annonceur} · {fmt(t.valeur)}</p>
            </div>
            <span className={`text-xs font-black shrink-0 uppercase tracking-wide ${t.collected ? 'text-black opacity-40' : 'text-black'}`}>
              {t.collected ? '✓ Remis' : '⏳ Attente'}
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
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/');
    } else {
      setState({ day: null, initialized: false, pendingNumber: null, tickets: [] });
    }
  }, [router]);

  const refreshState = useCallback(async (day: 'samedi' | 'dimanche') => {
    const tickets = await fetchTirageSession(sessionKey(day));
    setState(fromTirageTickets(tickets, day));
  }, []);

  // Polling toutes les POLL_MS ms pour synchroniser les appareils
  useEffect(() => {
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
    if (!state?.initialized || !state.day) return;
    const day = state.day;
    pollingRef.current = setInterval(async () => {
      try { await refreshState(day); } catch { /* ignore silently */ }
    }, POLL_MS);
    return () => { if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; } };
  }, [state?.initialized, state?.day, refreshState]);

  // Sélection du jour : charge la session existante si elle existe
  async function handleSelectDay(day: 'samedi' | 'dimanche') {
    setActionLoading(true);
    setError('');
    try {
      const tirageTickets = await fetchTirageSession(sessionKey(day));
      if (tirageTickets.length > 0) {
        setState(fromTirageTickets(tirageTickets, day));
      } else {
        // Pas encore de session → affiche l'écran d'initialisation
        setState({ day, initialized: false, pendingNumber: null, tickets: [] });
      }
    } catch (e) {
      setError(`Erreur NocoDB : ${e}`);
    } finally {
      setActionLoading(false);
    }
  }

  // Initialisation explicite : lit Tombola_Lots et crée les tickets dans NocoDB
  async function handleCreateSession() {
    if (!state?.day) return;
    setActionLoading(true);
    setError('');
    try {
      const lots = await fetchLots();
      const tickets = buildTickets(lots, state.day);
      await insertTirageTickets(tickets);
      const tirageTickets = await fetchTirageSession(sessionKey(state.day));
      setState(fromTirageTickets(tirageTickets, state.day));
    } catch (e) {
      setError(`Erreur initialisation : ${e}`);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDraw() {
    if (!state?.day) return;
    const remaining = state.tickets.filter(t => !t.drawn);
    if (remaining.length === 0 || state.pendingNumber !== null) return;

    const winner = remaining[Math.floor(Math.random() * remaining.length)];
    setActionLoading(true);
    try {
      await updateTirageTicket(winner.nocoId, { Drawn: true, Drawn_At: new Date().toISOString() });
      await refreshState(state.day);
    } catch (e) {
      setError(`Erreur tirage : ${e}`);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleUndo(number: number) {
    if (!state?.day) return;
    const ticket = state.tickets.find(t => t.number === number);
    if (!ticket) return;
    setActionLoading(true);
    try {
      await updateTirageTicket(ticket.nocoId, { Drawn: false, Drawn_At: null });
      await refreshState(state.day);
    } catch (e) {
      setError(`Erreur : ${e}`);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCollect(number: number) {
    if (!state?.day) return;
    const ticket = state.tickets.find(t => t.number === number);
    if (!ticket) return;

    setActionLoading(true);
    try {
      await updateTirageTicket(ticket.nocoId, { Collected: true });
      await refreshState(state.day);
    } catch (e) {
      setError(`Erreur confirmation : ${e}`);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReset() {
    if (!confirm('Remettre à zéro tout le tirage ? Cette action est irréversible.')) return;
    if (!state?.day) return;

    setActionLoading(true);
    try {
      await clearTirageSession(sessionKey(state.day));
      setState({ day: null, initialized: false, pendingNumber: null, tickets: [] });
    } catch (e) {
      setError(`Erreur réinitialisation : ${e}`);
    } finally {
      setActionLoading(false);
    }
  }

  // ── Loading ──
  if (!state) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-black font-black uppercase tracking-widest text-sm">Chargement…</p>
      </div>
    );
  }

  // ── Sélection du jour ──
  if (!state.day) {
    return <DaySelection onSelect={handleSelectDay} loading={actionLoading} />;
  }

  // ── Session inexistante : proposer l'initialisation ──
  if (!state.initialized) {
    const dayLabel2 = state.day === 'samedi' ? 'Samedi 16 mai' : 'Dimanche 17 mai';
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="border-2 border-black shadow-[6px_6px_0px_#000000] bg-white p-8 w-full max-w-md">
          <span className={`inline-block text-sm font-black px-3 py-1 uppercase tracking-wide mb-6 ${state.day === 'samedi' ? 'bg-ice border-2 border-black text-black' : 'bg-black border-2 border-black text-white'}`}>
            {dayLabel2}
          </span>
          <h2 className="font-title text-2xl font-black text-black uppercase tracking-tight mb-2">
            Aucun tirage<br />initialisé
          </h2>
          <p className="text-black text-sm opacity-60 mb-8">
            Cliquez sur le bouton ci-dessous pour lire les lots depuis NocoDB et créer la session de tirage.
          </p>
          {error && (
            <div className="border-2 border-black bg-ice px-4 py-3 mb-4">
              <p className="text-black text-sm font-bold">{error}</p>
            </div>
          )}
          <button
            onClick={handleCreateSession}
            disabled={actionLoading}
            className="w-full bg-black text-white font-black py-5 text-xl border-2 border-black shadow-[4px_4px_0px_#8bbfd5] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] disabled:opacity-50 disabled:cursor-not-allowed transition-all uppercase tracking-wide"
          >
            {actionLoading ? 'Création en cours…' : '▶ Initialiser le tirage'}
          </button>
          <button
            onClick={() => setState({ day: null, initialized: false, pendingNumber: null, tickets: [] })}
            disabled={actionLoading}
            className="mt-4 w-full text-black opacity-40 hover:opacity-100 text-sm font-bold uppercase tracking-wider transition-opacity"
          >
            ← Changer de journée
          </button>
        </div>
      </div>
    );
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
    <div className="min-h-screen bg-white p-4 pb-8 max-w-lg mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between py-4 mb-4">
        <span className={`text-sm font-black px-3 py-1 uppercase tracking-wide ${colors.badge}`}>
          {state.day && dayLabel(state.day)}
        </span>
        <div className="text-right">
          <span className="font-title font-black text-black text-lg">{drawn}</span>
          <span className="text-black opacity-40 text-sm"> / {total} tirés</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-white border-2 border-black h-3 mb-6">
        <div
          className={`h-full transition-all duration-500 ${colors.progressFill}`}
          style={{ width: total > 0 ? `${(drawn / total) * 100}%` : '0%' }}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="border-2 border-black bg-ice px-4 py-3 mb-4">
          <p className="text-black text-sm font-bold">{error}</p>
        </div>
      )}

      {/* Lot en attente de remise */}
      {pendingTicket && (
        <PendingCard
          ticket={pendingTicket}
          onCollect={() => handleCollect(pendingTicket.number)}
          onUndo={() => handleUndo(pendingTicket.number)}
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
        <div className="border-2 border-black bg-ice p-8 text-center">
          <h2 className="font-title text-3xl font-black text-black uppercase tracking-tight mb-2">
            Tirage terminé !
          </h2>
          <p className="text-black opacity-60 font-medium">Tous les lots ont été distribués.</p>
        </div>
      )}

      {/* Historique */}
      <HistoryList tickets={state.tickets} />

      {/* Bas de page */}
      <div className="mt-8 pt-6 border-t-2 border-black space-y-3">
        <button
          onClick={handleReset}
          disabled={actionLoading}
          className="w-full border-2 border-black bg-white text-black font-black py-3 text-sm uppercase tracking-wide shadow-[4px_4px_0px_#000000] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          ↺ Réinitialiser le tirage
        </button>
        <Link
          href="/liste-lots"
          className="block text-center text-black opacity-40 hover:opacity-100 text-sm font-bold uppercase tracking-wider transition-opacity"
        >
          Liste des lots →
        </Link>
      </div>
    </div>
  );
}
