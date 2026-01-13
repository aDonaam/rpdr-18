import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export default function AdminLooksPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [looks, setLooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [id, setId] = useState('');
  const [title, setTitle] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem('rr_user');
    if (!saved) return router.push(`${router.basePath}/login`);
    try {
      const parsed = JSON.parse(saved);
      setUser(parsed.username);
      // enforce admin username client-side
      const ADMIN = process.env.NEXT_PUBLIC_ADMIN_USERNAME;
      if (!ADMIN || String(parsed.username).trim() !== String(ADMIN).trim()) {
        setErr('Not authorized to access this page.');
      }
    } catch {
      return router.push(`${router.basePath}/login`);
    }
  }, []);

  useEffect(() => {
    fetch(`${router.basePath}/api/looks`).then((r) => r.json()).then((d) => {
      setLooks(d.looks || []);
      setLoading(false);
    }).catch((e) => { setErr('Failed to fetch looks'); setLoading(false); });
  }, []);

  async function handleAdd(e) {
    e.preventDefault();
    setErr('');
    if (!id || !title) return setErr('id and title required');

    // Ask for admin PIN (re-verify)
    const pin = window.prompt('Enter your admin PIN to confirm:');
    if (!pin) return setErr('Admin PIN required');

    const payload = { id, title, admin_username: user, admin_pin: pin };
    try {
      const res = await fetch(`${router.basePath}/api/looks`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) return setErr(data.error || 'Failed to add look');
      // success
      setLooks(prev => [data.look, ...prev]);
      setId(''); setTitle('');
    } catch (err) {
      setErr(String(err));
    }
  }

  if (err && !user) {
    return <div style={{ color: '#f97373', padding: 24 }}>{err}</div>;
  }

  return (
    <div style={{ padding: 24, color: '#fff' }}>
      <h2>Looks management</h2>
      {err && <div style={{ color: '#f97373' }}>{err}</div>}
      <form onSubmit={handleAdd} style={{ marginBottom: 16 }}>
        <input placeholder="id (e.g. L15)" value={id} onChange={(e) => setId(e.target.value)} />
        <input placeholder="title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <button type="submit">Add / Update look (admin only)</button>
      </form>

      {loading ? <div>Loading…</div> : (
        <ul>
          {looks.map(l => (
            <li key={l.id}><strong>{l.id}</strong>: {l.title}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
