// pages/logout.js
import { useEffect } from "react";
import { useRouter } from "next/router";

export default function Logout() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Capture current user BEFORE removing rr_user (so we can clear only their cache)
    let currentUsername = null;
    try {
      const saved = window.localStorage.getItem("rr_user");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.username) currentUsername = parsed.username;
      }
    } catch {
      // ignore
    }

    // remove logged-in user
    window.localStorage.removeItem("rr_user");
    window.dispatchEvent(new Event("rr-auth-changed"));

    // Clear only this user's cached votes (recommended)
    if (currentUsername) {
      window.localStorage.removeItem(`rr_votes_${currentUsername}`);
    }

    // If you *prefer* a total wipe on shared machines, uncomment this instead:
    Object.keys(window.localStorage).forEach((k) => {
      if (k.startsWith("rr_votes_")) window.localStorage.removeItem(k);
    });

    // Optional: clear cached looks if you want dropdowns to rebuild cleanly
    window.localStorage.removeItem("rr_looks_cache");

    // Hard redirect (replace avoids back-button returning to logged-in state)
    window.location.replace(`${router.basePath}/`);
  }, [router.basePath]);

  return null;
}
