import type { Lot, TirageTicket } from './nocodb';

export interface Ticket {
  nocoId: number;
  number: number;
  lotId: number;
  description: string;
  annonceur: string;
  valeur: number;
  drawn: boolean;
  drawnAt: string | null;
  collected: boolean;
}

export interface DrawState {
  day: 'samedi' | 'dimanche' | null;
  initialized: boolean;
  pendingNumber: number | null;
  tickets: Ticket[];
}

export function sessionKey(day: 'samedi' | 'dimanche'): string {
  return `escalade2026_${day}`;
}

/** Génère les tickets numérotés à partir des lots NocoDB pour le jour choisi. */
export function buildTickets(lots: Lot[], day: 'samedi' | 'dimanche'): Omit<TirageTicket, 'Id'>[] {
  let number = 1;

  // Total de valeur donné par chaque annonceur pour ce jour
  const annonceurTotaux = new Map<string, number>();
  for (const l of lots) {
    const qty = day === 'samedi' ? l.Nb_Samedi : l.Nb_Dimanche;
    if (qty <= 0) continue;
    const titre = l.Annonceur?.Titre ?? 'Annonceur inconnu';
    annonceurTotaux.set(titre, (annonceurTotaux.get(titre) ?? 0) + l.Valeur_Unitaire * qty);
  }

  const filtered = lots
    .filter(l => (day === 'samedi' ? l.Nb_Samedi : l.Nb_Dimanche) > 0)
    .sort((a, b) => {
      const titreA = a.Annonceur?.Titre ?? 'Annonceur inconnu';
      const titreB = b.Annonceur?.Titre ?? 'Annonceur inconnu';
      const totalA = annonceurTotaux.get(titreA) ?? 0;
      const totalB = annonceurTotaux.get(titreB) ?? 0;
      if (totalB !== totalA) return totalB - totalA; // annonceur le plus généreux en premier
      return b.Valeur_Unitaire - a.Valeur_Unitaire;  // puis lot le plus cher en premier
    });

  const session = sessionKey(day);
  const result: Omit<TirageTicket, 'Id'>[] = [];

  for (const lot of filtered) {
    const qty = day === 'samedi' ? lot.Nb_Samedi : lot.Nb_Dimanche;
    const annonceur = lot.Annonceur?.Titre ?? 'Annonceur inconnu';
    for (let i = 0; i < qty; i++) {
      result.push({
        Numero: number++,
        Lot_id: lot.Id,
        Description: lot.Description,
        Annonceur: annonceur,
        Valeur: lot.Valeur_Unitaire,
        Jour: day,
        Session: session,
        Drawn: false,
        Drawn_At: null,
        Collected: false,
      });
    }
  }
  return result;
}

/** Convertit les enregistrements NocoDB en DrawState pour l'UI. */
export function fromTirageTickets(tirageTickets: TirageTicket[], day: 'samedi' | 'dimanche'): DrawState {
  const tickets: Ticket[] = tirageTickets
    .sort((a, b) => a.Numero - b.Numero)
    .map(t => ({
      nocoId: t.Id!,
      number: t.Numero,
      lotId: t.Lot_id,
      description: t.Description,
      annonceur: t.Annonceur,
      valeur: t.Valeur,
      drawn: t.Drawn,
      drawnAt: t.Drawn_At,
      collected: t.Collected,
    }));

  const pending = tickets.find(t => t.drawn && !t.collected);

  return {
    day,
    initialized: true,
    pendingNumber: pending?.number ?? null,
    tickets,
  };
}
