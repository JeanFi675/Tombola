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
