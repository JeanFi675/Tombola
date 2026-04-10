const SESSION_KEY = 'tombola_authed';

/** Hash SHA-256 du mot de passe via Web Crypto API (navigateur). */
export async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(password));
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function login(password: string): Promise<boolean> {
  const hash = await hashPassword(password);
  const expected = process.env.NEXT_PUBLIC_SITE_PASSWORD_HASH ?? '';
  if (hash !== expected) return false;
  sessionStorage.setItem(SESSION_KEY, '1');
  return true;
}

export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(SESSION_KEY) === '1';
}

export function logout(): void {
  sessionStorage.removeItem(SESSION_KEY);
}
