import Papa from "papaparse";
import { csvUrl, LOOKS_GID, VOTES_GID } from "../config";
import { useEffect, useState } from "react";
import Link from "next/link";
import LookCard from "../components/LookCard";


function slugify(str) {
  return (str || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function enrichLooksWithApproval(looks, votesRaw) {
  // votesRaw should be the parsed rows from the Votes sheet
  const latestByUserLook = {}; // key: `${lookId}::${user}` -> { lookId, vote }

  (votesRaw || []).forEach((row) => {
    const lookId = (row.look_id || "").trim();
    const user = (row.user || "").trim();
    const vote = (row.vote || "").toUpperCase().trim();

    if (!lookId || !user) return;
    if (vote !== "TOOT" && vote !== "BOOT") return;

    const key = `${lookId}::${user}`;
    // Because the CSV preserves sheet order, and new votes are appended
    // at the bottom, simply overwriting here means:
    // "the last row for this (look, user) is the latest vote".
    latestByUserLook[key] = { lookId, vote };
  });

  // Aggregate per look_id
  const grouped = {}; // lookId -> { toot, total }
  Object.values(latestByUserLook).forEach(({ lookId, vote }) => {
    if (!grouped[lookId]) {
      grouped[lookId] = { toot: 0, total: 0 };
    }
    grouped[lookId].total += 1;
    if (vote === "TOOT") grouped[lookId].toot += 1;
  });

  // Attach approval stats onto each look
  return (looks || []).map((look) => {
    const g = grouped[look.look_id];
    if (!g || g.total === 0) {
      return {
        ...look,
        overallApproval: null,
        overallVoteCount: 0,
      };
    }
    const pct = Math.round((g.toot / g.total) * 100);
    return {
      ...look,
      overallApproval: pct,
      overallVoteCount: g.total,
    };
  });
}



export default function LooksPage({ initialLooks }) {
  const [user, setUser] = useState(null);
  const [votes, setVotes] = useState({}); // { [look_id]: "TOOT" | "BOOT" }
  const [looks, setLooks] = useState(initialLooks || []);

  // On client load, read user from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedUser = window.localStorage.getItem("rr_user");
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      setUser(parsed);

      // also load that user's saved votes
      const key = `rr_votes_${parsed.username}`;
      const savedVotes = window.localStorage.getItem(key);
      if (savedVotes) {
        try {
          setVotes(JSON.parse(savedVotes));
        } catch {
          // ignore bad JSON
        }
      }
    }
  }, []);

  // Save Looks so NavBar can populate Queen + Category dropdowns
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      "rr_looks_cache",
      JSON.stringify(initialLooks)
    );
  }, [initialLooks]);


  function handleVote(lookId, value) {
    // Only allow voting when logged in
    if (!user) {
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
      return;
    }

    setVotes((prev) => {
      const next = { ...prev, [lookId]: value };
      if (typeof window !== "undefined") {
        const key = `rr_votes_${user.username}`;
        window.localStorage.setItem(key, JSON.stringify(next));
      }
      return next;
    });
  }

return (
  <div style={styles.page}>
    <div style={styles.content}>
      <header style={styles.header}>
        <h1 style={styles.title}>Season 18 Runway Review</h1>   
      </header>

      <p style={styles.subtitle}>Subtitle here if wanted
      </p>

      <div style={styles.cardGrid}>
        {looks.map((look) => (
          <LookCard
            key={look.look_id}
            look={look}
            userVote={votes[look.look_id]}
            onVote={handleVote}
            headerMode="home"
          />
        ))}
      </div>
    </div>
  </div>
);

}

// Server-side fetch of CSV
export async function getServerSideProps() {
  const { data, error } = await supabase
    .from("looks")
    .select("look_id, queen, category, image_url, avg_toot_pct, total_votes")
    .order("queen", { ascending: true });

  if (error) {
    console.error("Supabase error:", error);
    return { props: { initialLooks: [] } };
  }

  const looks = (data || []).map((row) => ({
    look_id: row.look_id,
    queen: row.queen,
    category: row.category,
    image_url: row.image_url,
    overallApproval: row.avg_toot_pct ?? null,
    overallVoteCount: row.total_votes ?? 0,










  }));

  return { props: { initialLooks: looks } };




















}

// Inline styles for now (we'll convert to Tailwind later)
const styles = {
 page: {
    minHeight: "100vh",
  },

  content: {
    padding: "0 24px 32px 24px", // left/right + bottom padding
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: "12px",
  },
  title: {
    fontSize: "28px",
    fontWeight: 700,
  },
  userBox: {
    fontSize: "14px",
    opacity: 0.9,
  },
link: {
  color: "#f4c27a",            // gold accent
  textDecoration: "underline",
  cursor: "pointer",
},

  subtitle: {
    fontSize: "14px",
    opacity: 0.85,
    marginBottom: "16px",
    maxWidth: "600px",
  },
    cardGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
    gap: "16px",
  },
  card: {
    background: "rgba(255, 255, 255, 0.04)",
    borderRadius: "16px",
    padding: "12px 14px",
    border: "1px solid rgba(255, 255, 255, 0.07)",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "8px",
    fontSize: "14px",
  },
  cardTitleLink: {
    color: "#f9f5ff",
    textDecoration: "none",
  },
  pillLink: {
    textDecoration: "none",
    color: "#f9f5ff",
  },
  pill: {
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    padding: "3px 8px",
    borderRadius: "999px",
    background: "rgba(255, 179, 247, 0.12)",
    border: "1px solid rgba(255, 179, 247, 0.5)",
    color: "#f9f5ff",
  },
  imageLink: {
    fontSize: "13px",
    textDecoration: "underline",
    color: "#c9a8ff",
  },
  cardFooter: {
    marginTop: "4px",
    fontSize: "11px",
    opacity: 0.7,
  },
  voteRow: {
    marginTop: "10px",
    display: "flex",
    gap: "8px",
  },
  voteButton: {
    flex: 1,
    borderRadius: "999px",
    padding: "6px 0",
    fontSize: "13px",
    border: "1px solid rgba(255, 255, 255, 0.35)",
    background: "rgba(0, 0, 0, 0.35)",
    color: "#f9f5ff",
    cursor: "pointer",
  },
  voteButtonActiveToot: {
    background: "rgba(120, 237, 173, 0.9)",
    borderColor: "rgba(120, 237, 173, 1)",
    color: "#052417",
    fontWeight: 600,
  },
  voteButtonActiveBoot: {
    background: "rgba(255, 154, 162, 0.9)",
    borderColor: "rgba(255, 154, 162, 1)",
    color: "#3a0610",
    fontWeight: 600,
  },
  voteNote: {
    marginTop: "4px",
    fontSize: "12px",
    opacity: 0.9,
  },
};
