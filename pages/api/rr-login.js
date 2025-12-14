// pages/api/rr-login.js

// TODO: paste your actual published CSV URL here:
const USERS_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT7gkI28VAaSH3ZQwKjaLjTnRGy6su8BvnTSYQCa1brfYzmYT1Rnnu749UvpCZb8j_O3j4UBDHxE7Ie/pub?gid=1969364061&single=true&output=csv";

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

    // Fetch the Users sheet as CSV
    const csvRes = await fetch(USERS_CSV_URL);
    if (!csvRes.ok) {
      res
        .status(500)
        .json({ success: false, error: "Unable to read users sheet." });
      return;
    }

    const text = await csvRes.text();
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) {
      res
        .status(500)
        .json({ success: false, error: "No users are configured yet." });
      return;
    }

    // basic CSV parsing – fine for simple username/pin rows
    const header = lines[0].split(",");
    const usernameCol = header.indexOf("username");
    const pinCol = header.indexOf("pin");

    if (usernameCol === -1 || pinCol === -1) {
      res.status(500).json({
        success: false,
        error:
          "Users sheet must have 'username' and 'pin' columns in the header row.",
      });
      return;
    }

    const trimmedUser = String(username).trim();
    const trimmedPin = String(pin).trim();

    let matchingRow = null;

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",");
      const u = (cols[usernameCol] || "").trim();
      if (u === trimmedUser) {
        matchingRow = cols;
        break;
      }
    }

    if (!matchingRow) {
      res.status(200).json({
        success: false,
        error: "Account not found. Please contact Andrew to be added.",
      });
      return;
    }

    const storedPin = (matchingRow[pinCol] || "").trim();
    if (storedPin !== trimmedPin) {
      res
        .status(200)
        .json({ success: false, error: "Incorrect PIN for this username." });
      return;
    }

    // Success!
    res.status(200).json({
      success: true,
      username: trimmedUser,
    });
  } catch (err) {
    console.error("Error in /api/rr-login:", err);
    res
      .status(500)
      .json({ success: false, error: "Server error while logging in." });
  }
}
