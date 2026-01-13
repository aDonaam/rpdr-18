import { supabase } from '../../lib/supabaseClient';

export default async function handler(req, res) {
  try {
    const { data, error } = await supabase.from('votes').select('id').limit(1);
    if (error) return res.status(500).json({ ok: false, error: error.message });
    return res.status(200).json({ ok: true, rowCount: (data && data.length) || 0 });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
}
