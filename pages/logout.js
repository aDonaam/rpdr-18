// pages/logout.js
import { useEffect } from "react";

export default function Logout() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Capture current user before removing rr_user
    let currentUsername = null;

    try {
      const saved = window.localStorage.getItem("rr_user");

      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.username) currentUsername = parsed.username;
      }
    } catch {
      // ignore bad JSON
    }

    // Remove logged-in user
    window.localStorage.removeItem("rr_user");
    window.dispatchEvent(new Event("rr-auth-changed"));

    // Clear only this user's cached votes
    if (currentUsername) {
      window.localStorage.removeItem(`rr_votes_${currentUsername}`);
    }

    // Clear cached looks
    window.localStorage.removeItem("rr_looks_cache");

    // Hard redirect; replace prevents back-button return to logout state
    window.location.replace("/");
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0c0c0c",
      }}
    />
  );
}