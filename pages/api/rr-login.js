// pages/api/rr-login.js
import { supabaseAdmin } from "../../lib/supabaseAdmin";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Method not allowed" });
    return;
  }

  try {
    const { username, pin } = req.body || {};
    if (!username || !pin) {
      res
        .status(400)
        .json({ success: false, error: "Username and PIN are required." });
      return;
    }

    const { data, error } = await supabaseAdmin
      .from("users")
      .select("user_id, username, pin_hash")
      .ilike("username", username.trim())
      .maybeSingle();

    if (error) {
  console.error("Supabase login error:", error);
  return res.status(500).json({
    success: false,
    error: "Error reading users table.",
    debug: {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    },
  });
}


    if (!data) {
      res.status(200).json({
        success: false,
        error: "Account not found. Please contact Andrew to be added.",
      });
      return;
    }

    // For now: plain compare. Later you can use a proper hash check.
    if (data.pin_hash !== pin.trim()) {
      res
        .status(200)
        .json({ success: false, error: "Incorrect PIN for this username." });
      return;
    }

    // Update last_login
    await supabaseAdmin
      .from("users")
      .update({ last_login: new Date().toISOString() })
      .eq("user_id", data.user_id);

    res.status(200).json({
      success: true,
      username: data.username,
      userId: data.user_id,
    });
  } catch (err) {
    console.error("Login server error:", err);
    res
      .status(500)
      .json({ success: false, error: "Server error while logging in." });
  }
}

