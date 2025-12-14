// pages/logout.js
import { useEffect } from "react";
import { useRouter } from "next/router";

export default function Logout() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;

    // remove logged-in user
    window.localStorage.removeItem("rr_user");
    window.dispatchEvent(new Event("rr-auth-changed"));


    // OPTIONAL: if you want to clear votes cache for safety:
    // (this removes ALL users' cached votes on this browser)
    Object.keys(window.localStorage).forEach((k) => {
      if (k.startsWith("rr_votes_")) window.localStorage.removeItem(k);
    });

    // also clear cached looks if you want the dropdown to rebuild cleanly
    // window.localStorage.removeItem("rr_looks_cache");

    // Hard redirect so nav + page state fully reset
    window.location.href = `${router.basePath}/`;
  }, [router.basePath]);

  return null;
}
