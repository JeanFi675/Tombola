import type { Lot } from './nocodb';

const STATE_KEY = 'tombola_draw_state';

export interface Ticket {
  number: number;
  lotId: number;
  description: string;
  annonceur: string;
  valeur: number;
  drawn: boolean;
  drawnAt: string | null;
  collected: boolean;
  collectedAt: string | null;
}

export interface DrawState {
  day: 'samedi' | 'dimanche' | null;
  initialized: boolean;
  pendingNumber: number | null;
  tickets: Ticket[];
}

const DEFAULT: DrawState = {
  day: null,
  initialized: false,
  pendingNumber: null,
  tickets: [],
};

export function loadState(): DrawState {
  if (typeof window === 'undefined') return { ...DEFAULT };
  try {
    const raw = localStorage.getItem(STATE_KEY);
    return raw ? (JSON.parse(raw) as DrawState) : { ...DEFAULT };
  } catch {
    return { ...DEFAULT };
  }
}

export function saveState(state: DrawState): void {
  localStorage.setItem(STATE_KEY, JSON.stringify(state));
}

export function resetState(): void {
  localStorage.removeItem(STATE_KEY);
}

/** Génère les tickets numérotés à partir des lots NocoDB pour le jour choisi. */
export function buildTickets(lots: Lot[], day: 'samedi' | 'dimanche'): Ticket[] {
  const tickets: Ticket[] = [];
  let number = 1;

  const filtered = lots
    .filter(l => (day === 'samedi' ? l.Nb_Samedi : l.Nb_Dimanche) > 0)
    .sort((a, b) => a.Valeur_Unitaire - b.Valeur_Unitaire);

  for (const lot of filtered) {
    const qty = day === 'samedi' ? lot.Nb_Samedi : lot.Nb_Dimanche;
    const annonceur = lot.Annonceur?.Titre ?? 'Annonceur inconnu';
    for (let i = 0; i < qty; i++) {
      tickets.push({
        number: number++,
        lotId: lot.Id,
        description: lot.Description,
        annonceur,
        valeur: lot.Valeur_Unitaire,
        drawn: false,
        drawnAt: null,
        collected: false,
        collectedAt: null,
      });
    }
  }
  return tickets;
}
