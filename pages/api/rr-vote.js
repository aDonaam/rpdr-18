import { supabaseAdmin } from "../../lib/supabaseAdmin";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const { look_uuid, user_id, vote } = req.body || {};

    if (!look_uuid || !user_id || !vote) {
      return res.status(400).json({
        success: false,
        error: "Missing look_uuid, user_id, or vote",
      });
    }

    const v = String(vote).toUpperCase().trim();
    if (v !== "TOOT" && v !== "BOOT") {
      return res.status(400).json({ success: false, error: "Vote must be TOOT or BOOT" });
    }

    // Uses your UNIQUE (look_uuid, user_id) constraint for overwrite behavior
    const { error } = await supabaseAdmin
      .from("votes")
      .upsert(
        {
          look_uuid: String(look_uuid).trim(),
          user_id, // uuid
          vote: v,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "look_uuid,user_id" }
      );

    if (error) {
      console.error("Supabase rr-vote upsert error:", error);
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("rr-vote handler error:", err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
}
