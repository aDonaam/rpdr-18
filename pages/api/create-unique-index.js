import { supabaseAdmin } from '../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end('Method Not Allowed');
  }

  const sql = `CREATE UNIQUE INDEX IF NOT EXISTS votes_one_per_user_per_look ON public.votes (username, look_id);`;

  try {
    if (typeof supabaseAdmin.postgres?.query === 'function') {
      const r = await supabaseAdmin.postgres.query({ sql });
      return res.status(200).json({ ok: true, result: r });
    }

    // Some versions may support rpc('sql') but not all
    try {
      const { data, error } = await supabaseAdmin.rpc('sql', { sql_text: sql });
      if (error) return res.status(500).json({ ok: false, error });
      return res.status(200).json({ ok: true, data });
    } catch (err) {
      return res.status(500).json({ ok: false, error: 'No method available to execute raw SQL via this Supabase client. Please run this SQL in the Supabase SQL editor or provide a DB connection string.' });
    }
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
}
