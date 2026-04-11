'use client';
import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '@/lib/auth';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const ok = await login(password);
    if (ok) {
      router.push('/portail');
    } else {
      setError('Mot de passe incorrect');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="border-2 border-black shadow-[6px_6px_0px_#000000] bg-white p-8 w-full max-w-sm">

        <div className="mb-8">
          <h1 className="font-title text-4xl font-black text-black uppercase leading-tight tracking-tight">
            Tombola<br />Escalade
          </h1>
          <div className="mt-3 border-l-4 border-ice pl-3">
            <p className="text-black text-sm font-medium">
              Championnats de France<br />Difficulté Jeunes
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-black text-black mb-2 uppercase tracking-widest">
              Mot de passe bénévole
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border-2 border-black px-4 py-3 text-lg focus:outline-none focus:border-ice bg-white font-sans transition-colors"
              placeholder="••••••••"
              autoFocus
              required
            />
          </div>

          {error && (
            <div className="border-2 border-black bg-ice px-4 py-2 text-center">
              <p className="text-black text-sm font-bold">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-ice border-2 border-black shadow-[4px_4px_0px_#000000] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] disabled:opacity-50 disabled:cursor-not-allowed text-black font-black py-4 text-lg transition-all uppercase tracking-wider"
          >
            {loading ? 'Connexion…' : 'Accéder'}
          </button>
        </form>
      </div>
    </div>
  );
}
