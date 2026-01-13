// pages/api/looks.js
import { supabaseAdmin } from "../../lib/supabaseAdmin";

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const { data, error } = await supabaseAdmin
        .from("looks")
        .select(
          "id, look_id, display_name, contestant_name, category, sequence, image_url"
        )
        .order("sequence", { ascending: true, nullsLast: true })
        .order("contestant_name", { ascending: true }) // <-- was queen
        .order("display_name", { ascending: true });   // nice tie-breaker

      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ looks: data || [] });
    } catch (err) {
      return res.status(500).json({ error: String(err) });
    }
  } else {
    res.setHeader("Allow", ["GET"]);
    res.status(405).end("Method Not Allowed");
  }
}
