// pages/queen/[queen].js
import Papa from "papaparse";
import { csvUrl, LOOKS_GID, VOTES_GID } from "../../config";
import { useEffect, useState } from "react";
import Link from "next/link";
import LookCard from "../../components/LookCard";


function slugify(str) {
  return (str || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function enrichLooksWithApproval(looks, votesRaw) {
  const latestByUserLook = {}; // key: `${lookId}::${user}` -> { lookId, vote }

  (votesRaw || []).forEach((row) => {
    const lookId = (row.look_id || "").trim();
    const user = (row.user || "").trim();
    const vote = (row.vote || "").toUpperCase().trim();

    if (!lookId || !user) return;
    if (vote !== "TOOT" && vote !== "BOOT") return;

    const key = `${lookId}::${user}`;
    latestByUserLook[key] = { lookId, vote };
  });

  const grouped = {}; // lookId -> { toot, total }
  Object.values(latestByUserLook).forEach(({ lookId, vote }) => {
    if (!grouped[lookId]) {
      grouped[lookId] = { toot: 0, total: 0 };
    }
    grouped[lookId].total += 1;
    if (vote === "TOOT") grouped[lookId].toot += 1;
  });

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


export default function QueenPage({ initialLooks, queenName }) {

  const [user, setUser] = useState(null);
  const [votes, setVotes] = useState({});

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedUser = window.localStorage.getItem("rr_user");
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      setUser(parsed);

      const key = `rr_votes_${parsed.username}`;
      const savedVotes = window.localStorage.getItem(key);
      if (savedVotes) {
        try {
          setVotes(JSON.parse(savedVotes));
        } catch {
          // ignore
        }
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      "rr_looks_cache",
      JSON.stringify(initialLooks)
    );
  }, [initialLooks]);


  function handleVote(lookId, value) {
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
        <h1 style={styles.title}>{queenName}</h1>
      </header>

      <p style={styles.subtitle}>
        All looks walked by <b>{queenName}</b> this season.
      </p>

      <div style={styles.cardGrid}>
        {initialLooks.map((look) => (
          <LookCard
            key={look.look_id}
            look={look}
            userVote={votes[look.look_id]}
            onVote={handleVote}
            headerMode="queen"
          />
        ))}
      </div>
    </div>
  </div>
);

}

export async function getServerSideProps(context) {
  const { queen: queenSlug } = context.params;

  const looksUrl = csvUrl(LOOKS_GID);
  const votesUrl = csvUrl(VOTES_GID);

  const [looksRes, votesRes] = await Promise.all([
    fetch(looksUrl),
    fetch(votesUrl),
  ]);

  const looksText = await looksRes.text();
  const votesText = await votesRes.text();

  // --- PARSE LOOKS (all) ---
  const looksResult = Papa.parse(looksText, {
    header: true,
    skipEmptyLines: true,
  });

  const allLooks = (looksResult.data || [])
    .filter((row) => row.look_id && row.queen && row.category)
    .map((row) => ({
      look_id: row.look_id.trim(),
      queen: row.queen.trim(),
      category: row.category.trim(),
      image_url: (row.image_url || "").trim(),
    }));

  // Filter to just this queen
  const queenLooks = allLooks.filter(
    (look) => slugify(look.queen) === queenSlug
  );

  // --- PARSE VOTES ---
  const votesResult = Papa.parse(votesText, {
    header: true,
    skipEmptyLines: true,
  });

  const votes = (votesResult.data || []).filter(
    (row) => row.look_id && row.user && row.vote
  );

  // Attach approval stats (using *all* votes, but only queen's looks)
  const looksWithApproval = enrichLooksWithApproval(queenLooks, votes);

  const queenName =
    looksWithApproval[0]?.queen ||
    queenSlug.replace(/-/g, " ").toUpperCase();

  return {
    props: {
      initialLooks: looksWithApproval,
      queenName,
    },
  };
}


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
