// pages/logout.js
import { useEffect } from "react";
import { useRouter } from "next/router";

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("rr_user");
      if (saved) {
        try {
          const { username } = JSON.parse(saved);
          if (username) {
            localStorage.removeItem(`rr_votes_${username}`);
          }
        } catch (e) {
          // ignore
        }
      }
      localStorage.removeItem("rr_user");
    }
    router.push("/");
  }, [router]);

  return null;
}
