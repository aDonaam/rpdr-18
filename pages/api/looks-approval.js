// pages/api/looks-approval.js
import { supabase } from "../../lib/supabaseClient";

export default async function handler(req, res) {
  const { look_uuid } = req.query;
  if (!look_uuid) {
    return res.status(400).json({ error: "Missing look_uuid" });
  }
  // Fetch all votes for this look
  const { data: votes, error } = await supabase
    .from("votes")
    .select("vote")
    .eq("look_uuid", look_uuid);
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  let toot = 0, total = 0;
  (votes || []).forEach((row) => {
    if (row.vote === "TOOT") toot += 1;
    total += 1;
  });
  const overallApproval = total > 0 ? Math.round((toot / total) * 100) : null;
  return res.status(200).json({ overallApproval, overallVoteCount: total });
}
