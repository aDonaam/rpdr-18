import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import LookCard from "../components/LookCard";
import { supabase } from "../lib/supabaseClient";

export default function LooksPage() {
    const router = useRouter();
  const [user, setUser] = useState(null);
  const [votes, setVotes] = useState({}); // { [look_id]: "TOOT" | "BOOT" }
  const [looks, setLooks] = useState([]); // [{...look, overallApproval, overallVoteCount}]
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth <= 600);
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  function mergeStyles(base, mobile) {
    if (!isMobile) return base;
    return { ...base, ...mobile };
  }

  // On client load, read user from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedUser = window.localStorage.getItem("rr_user");
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      // Map userId to user_id for consistency
      setUser({ ...parsed, user_id: parsed.userId });
    }
  }, []);

  // Fetch looks and votes from Supabase
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      // Fetch all looks, including sequence
      const { data: looksData, error: looksError } = await supabase
        .from("looks")
        .select("id, display_name, contestant_name, category, sequence, image_url")
        .order("sequence", { ascending: true });

      if (looksError || !looksData) {
        setLooks([]);
        setLoading(false);
        return;
      }

      // Fetch all votes for all looks
      // Use id as look_uuid for votes, but also keep look_id for legacy/compat
      const lookIds = looksData.map(l => l.id);
      const { data: allVotesData, error: votesError } = await supabase
        .from("votes")
        .select("look_uuid, vote")
        .in("look_uuid", lookIds);

      // Calculate approval % and vote count for each look
      const lookStats = {};
      (allVotesData || []).forEach((row) => {
        if (!lookStats[row.look_uuid]) lookStats[row.look_uuid] = { toot: 0, total: 0 };
        if (row.vote === "TOOT") lookStats[row.look_uuid].toot += 1;
        lookStats[row.look_uuid].total += 1;
      });

      // Attach stats to looks
      let looksWithStats = (looksData || []).map((look) => {
        const stats = lookStats[look.id] || { toot: 0, total: 0 };
        return {
          ...look,
          look_id: look.look_id || look.id, // ensure look_id is present for compatibility
          overallApproval: stats.total > 0 ? Math.round((stats.toot / stats.total) * 100) : null,
          overallVoteCount: stats.total,
        };
      });
      // Sort by sequence ascending, then queen alphabetically for ties
      looksWithStats.sort((a, b) => {
        if (a.sequence !== b.sequence) return a.sequence - b.sequence;
        return (a.contestant_name || "").localeCompare(b.contestant_name || "");
      });
      setLooks(looksWithStats);

      // Fetch votes for this user
      let userVotes = {};
      if (user && user.user_id) {
        const { data: userVotesData } = await supabase
          .from("votes")
          .select("look_uuid, vote")
          .eq("user_id", user.user_id);
        (userVotesData || []).forEach((row) => {
          userVotes[row.look_uuid] = row.vote;
        });
      }
      setVotes(userVotes);
      setLoading(false);
    }
    fetchData();
  }, [user]);

  async function handleVote(lookUuid, value) {
    if (!user) { window.location.href = "/login"; return; }

    // Update local state
    setVotes((prev) => ({ ...prev, [lookUuid]: value }));
    // Persist to Supabase
    await fetch(`${router.basePath}/api/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        look_uuid: lookUuid,
        user_id: user.userId || user.user_id,
        vote: value,
      }),
    });

    // Fetch latest approval and vote count for this look directly from Supabase for immediate update
    try {
      const { data: votes, error } = await supabase
        .from("votes")
        .select("vote")
        .eq("look_uuid", lookUuid);
      if (!error && votes) {
        let toot = 0, total = 0;
        votes.forEach((row) => {
          if (row.vote === "TOOT") toot += 1;
          total += 1;
        });
        const overallApproval = total > 0 ? Math.round((toot / total) * 100) : null;
        setLooks((prevLooks) => prevLooks.map((look) =>
          look.id === lookUuid
            ? { ...look, overallApproval, overallVoteCount: total }
            : look
        ));
      }
    } catch (err) {
      // ignore
    }
  }


  const mobileContentStyle = { paddingTop: "0px", paddingLeft: "10px", paddingRight: "10px", paddingBottom: "32px" };
  const mobileHeaderStyle = { paddingTop: "0px", marginBottom: "2px" };

  if (loading) return null;

  return (
    <div style={styles.page}>
      <div style={mergeStyles(styles.content, mobileContentStyle)}>
        <header style={mergeStyles(styles.header, mobileHeaderStyle)}>
          <h1 style={styles.title}>All runway looks from Season 18</h1>
        </header>
        <p style={styles.subtitle}>All runway looks from Season 18</p>
        <div style={styles.cardGrid}>
          {looks.map((look) => (
            <LookCard
              key={look.id}
              look={look}
              userVote={votes[look.id]}
              onVote={(ignoredLookId, voteValue) => handleVote(look.id, voteValue)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
  },

  content: {
    padding: "0 24px 32px 24px", // left/right + bottom padding
  },

  header: {
    margin: "0 0 6px 0",
    padding: "12px 0 0 0",
    textAlign: "center",
  },
  title: {
    fontSize: "26px",
    fontWeight: 700,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    margin: "0 0 6px 0",
    padding: 0,
    textAlign: "center",
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
    opacity: 0.9,
    maxWidth: "640px",
    margin: "0 auto 18px auto",
    padding: "0 0 0 0",
    textAlign: "center",
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
