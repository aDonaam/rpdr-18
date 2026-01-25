// pages/api/looks-approval.js
import { supabaseAdmin } from "../../lib/supabaseAdmin";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { look_uuid } = req.query;
  if (!look_uuid) {
    return res.status(400).json({ error: "Missing look_uuid" });
  }

  try {
    // Fetch all votes for this look
    const { data: votes, error } = await supabaseAdmin
      .from("votes")
      .select("vote")
      .eq("look_uuid", look_uuid);

    if (error) {
      console.error("[looks-approval] Supabase error:", error);
      return res.status(500).json({ error: error.message });
    }

    let toot = 0, total = 0;
    (votes || []).forEach((row) => {
      if (row.vote === "TOOT") toot += 1;
      total += 1;
    });

    const overallApproval = total > 0 ? Math.round((toot / total) * 100) : null;
    return res.status(200).json({ overallApproval, overallVoteCount: total });
  } catch (err) {
    console.error("[looks-approval] Unexpected error:", err);
    return res.status(500).json({ error: "Unexpected error" });
  }
}
