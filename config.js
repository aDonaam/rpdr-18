// config.js

// Your published sheet base URL (the part before ?gid...&output=csv)
export const SHEET_BASE =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vT7gkI28VAaSH3ZQwKjaLjTnRGy6su8BvnTSYQCa1brfYzmYT1Rnnu749UvpCZb8j_O3j4UBDHxE7Ie";

// GIDs for each tab. We'll adjust if needed.
export const LOOKS_GID = "0";
export const VOTES_GID = "2025131587";

// For now: Simple PIN login
export const USERS = [
  { username: "Andrew", pin: "9124" },
];

// Helper to build CSV URLs for each tab
export function csvUrl(gid) {
  return `${SHEET_BASE}/pub?gid=${gid}&single=true&output=csv`;
}
