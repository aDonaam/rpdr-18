// pages/api/vote.js
import { supabaseAdmin } from "../../lib/supabaseAdmin";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    console.error("[vote API] Invalid method:", req.method);
    res.status(405).json({ success: false, error: "Method not allowed" });
    return;
  }

  try {
    const { look_uuid, user_id, vote } = req.body || {};
    const normalizedVote = String(vote || "").toUpperCase().trim();

    if (!look_uuid || !user_id || !normalizedVote) {
      const msg = `[vote API] Missing fields: look_uuid=${look_uuid}, user_id=${user_id}, vote=${vote}`;
      console.error(msg);
      res.status(400).json({
        success: false,
        error: "Missing fields (look_uuid, user_id, vote).",
        details: msg,
      });
      return;
    }

    if (!["TOOT", "BOOT"].includes(normalizedVote)) {
      const msg = `[vote API] Invalid vote value: ${normalizedVote}`;
      console.error(msg);
      res.status(400).json({
        success: false,
        error: "Invalid vote. Must be TOOT or BOOT.",
        details: msg,
      });
      return;
    }

    // UPSERT: one row per (look_uuid, user_id) in votes table
    // vote_id is auto-generated (uuid), user_id and look_uuid are fkeys, vote is text (TOOT/BOOT), updated_at is timestamptz
    const { data, error } = await supabaseAdmin
      .from("votes")
      .upsert(
        {
          look_uuid,
          user_id,
          vote: normalizedVote,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "look_uuid,user_id",
        }
      )
      .select()
      .maybeSingle();

    if (error) {
      const msg = `[vote API] Supabase upsert error: ${error.message || error}`;
      console.error(msg, error);
      res.status(500).json({ success: false, error: "Error saving vote in database.", details: msg });
      return;
    }

    res.status(200).json({ success: true, vote: data || null });
  } catch (err) {
    const msg = `[vote API] Server error: ${err && err.message ? err.message : err}`;
    console.error(msg, err);
    res.status(500).json({ success: false, error: "Server error while saving vote.", details: msg });
  }
}
