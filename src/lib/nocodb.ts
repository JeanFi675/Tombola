export interface Lot {
  Id: number;
  Description: string;
  Quantite: number;
  Nb_Dimanche: number;
  Nb_Samedi: number;
  Valeur_Unitaire: number;
  Tombola_id: number;
  Annonceur?: { Titre: string } | null;
  Total: number;
}

export async function fetchLots(): Promise<Lot[]> {
  const base = (process.env.NEXT_PUBLIC_NOCODB_URL ?? '').replace(/\/$/, '');
  const tableId = process.env.NEXT_PUBLIC_NOCODB_TABLE_ID ?? '';
  const token = process.env.NEXT_PUBLIC_NOCODB_TOKEN ?? '';

  const res = await fetch(`${base}/api/v2/tables/${tableId}/records?limit=200`, {
    headers: { 'xc-token': token },
  });

  if (!res.ok) throw new Error(`NocoDB ${res.status}`);
  const data = await res.json();
  return (data.list ?? []) as Lot[];
}

// ─── Tombola_Tirage ───────────────────────────────────────────────────────────

export interface TirageTicket {
  Id?: number;
  Numero: number;
  Lot_id: number;
  Description: string;
  Annonceur: string;
  Valeur: number;
  Jour: string;
  Session: string;
  Drawn: boolean;
  Drawn_At: string | null;
  Collected: boolean;
}

function tirageUrl(path = '') {
  const base = (process.env.NEXT_PUBLIC_NOCODB_URL ?? '').replace(/\/$/, '');
  const tableId = process.env.NEXT_PUBLIC_NOCODB_TIRAGE_TABLE_ID ?? '';
  return `${base}/api/v2/tables/${tableId}/records${path}`;
}

function tirageHeaders() {
  return {
    'xc-token': process.env.NEXT_PUBLIC_NOCODB_TOKEN ?? '',
    'Content-Type': 'application/json',
  };
}

export async function fetchTirageSession(session: string): Promise<TirageTicket[]> {
  const url = `${tirageUrl()}?where=(Session,eq,${encodeURIComponent(session)})&limit=500&sort=Numero`;
  const res = await fetch(url, { headers: tirageHeaders() });
  if (!res.ok) throw new Error(`NocoDB ${res.status}`);
  const data = await res.json();
  return (data.list ?? []) as TirageTicket[];
}

export async function insertTirageTickets(tickets: Omit<TirageTicket, 'Id'>[]): Promise<void> {
  const res = await fetch(tirageUrl(), {
    method: 'POST',
    headers: tirageHeaders(),
    body: JSON.stringify(tickets),
  });
  if (!res.ok) throw new Error(`NocoDB insert ${res.status}`);
}

export async function updateTirageTicket(id: number, patch: Partial<TirageTicket>): Promise<void> {
  const res = await fetch(tirageUrl(), {
    method: 'PATCH',
    headers: tirageHeaders(),
    body: JSON.stringify({ Id: id, ...patch }),
  });
  if (!res.ok) throw new Error(`NocoDB update ${res.status}`);
}

// ─── Tombola_Regles ───────────────────────────────────────────────────────────

const REGLES_TABLE_ID = 'm0jr27h7fzynhhu';

function reglesUrl(path = '') {
  const base = (process.env.NEXT_PUBLIC_NOCODB_URL ?? '').replace(/\/$/, '');
  return `${base}/api/v2/tables/${REGLES_TABLE_ID}/records${path}`;
}

function reglesHeaders() {
  return {
    'xc-token': process.env.NEXT_PUBLIC_NOCODB_TOKEN ?? '',
    'Content-Type': 'application/json',
  };
}

export interface ReglesRecord {
  Id: number;
  Title: string;
}

export async function fetchRegles(): Promise<ReglesRecord | null> {
  const res = await fetch(`${reglesUrl()}/1`, { headers: reglesHeaders() });
  if (!res.ok) throw new Error(`NocoDB ${res.status}`);
  return (await res.json()) as ReglesRecord;
}

export async function updateRegles(id: number, contenu: string): Promise<void> {
  const res = await fetch(reglesUrl(), {
    method: 'PATCH',
    headers: reglesHeaders(),
    body: JSON.stringify({ Id: id, Contenu: contenu }),
  });
  if (!res.ok) throw new Error(`NocoDB update ${res.status}`);
}

export async function clearTirageSession(session: string): Promise<void> {
  const tickets = await fetchTirageSession(session);
  if (tickets.length === 0) return;
  const res = await fetch(tirageUrl(), {
    method: 'DELETE',
    headers: tirageHeaders(),
    body: JSON.stringify(tickets.map(t => ({ Id: t.Id }))),
  });
  if (!res.ok) throw new Error(`NocoDB delete ${res.status}`);
}
