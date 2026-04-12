'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { isAuthenticated } from '@/lib/auth';
import { fetchTutoriel, updateTutoriel } from '@/lib/nocodb';

export default function TutorielPage() {
  const router = useRouter();
  const [recordId, setRecordId] = useState<number | null>(null);
  const [contenu, setContenu] = useState('');
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/'); return; }
    fetchTutoriel()
      .then(record => {
        if (!record) {
          setError('Aucun enregistrement trouvé (Id=2).');
          return;
        }
        setRecordId(record.Id);
        setContenu(record.Title ?? '');
        setDraft(record.Title ?? '');
      })
      .catch(e => setError(`Erreur NocoDB : ${e}`))
      .finally(() => setLoading(false));
  }, [router]);

  function handleEdit() {
    setDraft(contenu);
    setEditing(true);
    setSaved(false);
  }

  function handleCancel() {
    setDraft(contenu);
    setEditing(false);
  }

  async function handleSave() {
    if (recordId === null) return;
    setSaving(true);
    setError('');
    try {
      await updateTutoriel(recordId, draft);
      setContenu(draft);
      setEditing(false);
      setSaved(true);
    } catch (e) {
      setError(`Erreur sauvegarde : ${e}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-white">

      {/* Header */}
      <div className="print:hidden border-b-2 border-black px-4 py-4 flex items-center justify-between max-w-4xl mx-auto">
        <Link
          href="/portail"
          className="text-black opacity-40 hover:opacity-100 text-sm font-bold uppercase tracking-wider transition-opacity"
        >
          ← Portail
        </Link>
        <h1 className="font-title text-xl font-black uppercase tracking-tight text-black text-center px-4">
          Tutoriel : Gestion de la Tombola
        </h1>
        <div className="flex items-center gap-3">
          {saved && !editing && (
            <span className="text-xs font-black text-black opacity-40 uppercase tracking-wide">Sauvegardé ✓</span>
          )}
          {!editing && !loading && !error && (
            <button
              onClick={() => window.print()}
              className="bg-white text-black font-black text-sm px-4 py-2 border-2 border-black shadow-[3px_3px_0px_#000000] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all uppercase tracking-wide"
            >
              PDF
            </button>
          )}
          {!editing ? (
            <button
              onClick={handleEdit}
              disabled={loading || !!error}
              className="bg-black text-white font-black text-sm px-4 py-2 border-2 border-black shadow-[3px_3px_0px_#8bbfd5] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] disabled:opacity-40 disabled:cursor-not-allowed transition-all uppercase tracking-wide"
            >
              Modifier
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleCancel}
                disabled={saving}
                className="font-black text-sm px-4 py-2 border-2 border-black bg-white text-black opacity-60 hover:opacity-100 disabled:cursor-not-allowed transition-opacity uppercase tracking-wide"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-black text-white font-black text-sm px-4 py-2 border-2 border-black shadow-[3px_3px_0px_#8bbfd5] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] disabled:opacity-40 disabled:cursor-not-allowed transition-all uppercase tracking-wide"
              >
                {saving ? 'Sauvegarde…' : 'Enregistrer'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 max-w-4xl mx-auto">
        <div className="hidden print:block mb-6">
          <h1 className="text-2xl font-black uppercase tracking-tight">Tombola Escalade — Tutoriel Gestion</h1>
          <p className="text-xs text-gray-500 mt-1">Championnats de France Difficulté Jeunes · 16 &amp; 17 mai 2026</p>
        </div>

        {loading && (
          <p className="text-black font-black uppercase tracking-widest text-sm mt-8">Chargement…</p>
        )}

        {error && (
          <div className="border-2 border-black bg-ice px-4 py-3 mt-4">
            <p className="text-black text-sm font-bold font-mono">{error}</p>
          </div>
        )}

        {!loading && !error && (
          editing ? (
            /* ── Éditeur ── */
            <textarea
              value={draft}
              onChange={e => setDraft(e.target.value)}
              className="w-full min-h-[70vh] border-2 border-black p-4 font-mono text-sm text-black bg-white focus:outline-none focus:border-ice resize-y"
              spellCheck={false}
            />
          ) : (
            /* ── Vue rendue ── */
            <div className="prose prose-sm max-w-none prose-headings:font-black prose-headings:uppercase prose-headings:tracking-tight prose-h1:text-3xl prose-h2:text-xl prose-h2:border-b-2 prose-h2:border-black prose-h2:pb-1 prose-h3:text-base prose-table:border-2 prose-table:border-black prose-th:bg-black prose-th:text-white prose-th:font-black prose-th:text-xs prose-th:uppercase prose-th:tracking-widest prose-td:border prose-td:border-black prose-td:px-3 prose-td:py-2 prose-strong:font-black prose-hr:border-black prose-hr:border-t-2">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {contenu}
              </ReactMarkdown>
            </div>
          )
        )}
      </div>
    </div>
  );
}
