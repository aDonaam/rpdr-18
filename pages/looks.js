import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import LookCard from "../components/LookCard";
import { supabase } from "../lib/supabaseClient";
import { supabaseAdmin } from "../lib/supabaseAdmin";

export default function LooksPage({ initialLooks = [], initialPublicApproval = null, initialUserApproval = null }) {
    const router = useRouter();
  const [user, setUser] = useState(null);
  const [userInitialized, setUserInitialized] = useState(false); // Track if user hydration is complete
  const [votes, setVotes] = useState({}); // { [look_id]: "TOOT" | "BOOT" }
  const [looks, setLooks] = useState(initialLooks); // [{...look, overallApproval, overallVoteCount}]
  const [isMobile, setIsMobile] = useState(false);
  const [sortOption, setSortOption] = useState("chronological"); // "chronological" or "approval"
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [publicApproval, setPublicApproval] = useState(initialPublicApproval);
  const [publicVoteCount, setPublicVoteCount] = useState(0);
  const [userApproval, setUserApproval] = useState(initialUserApproval);
  const [userVoteCount, setUserVoteCount] = useState(0);
  const sortBtnRef = useRef(null);
  const sortMenuRef = useRef(null);

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth <= 600);
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Close sort menu on outside click
  useEffect(() => {
    if (!sortMenuOpen) return;

    function handleClick(e) {
      if (sortBtnRef.current?.contains(e.target) || sortMenuRef.current?.contains(e.target)) {
        return;
      }
      setSortMenuOpen(false);
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [sortMenuOpen]);

  function mergeStyles(base, mobile) {
    if (!isMobile) return base;
    return { ...base, ...mobile };
  }

  const mobileApprovalHeaderStyle = { gap: "16px", flexDirection: "column" };

  // Calculate overall approval stats
  useEffect(() => {
    if (looks.length === 0) {
      setPublicApproval(null);
      setUserApproval(null);
      return;
    }

    // Calculate public approval for all looks
    let publicToots = 0, publicTotal = 0;
    looks.forEach((look) => {
      if (look.overallApproval !== null) {
        const tootCount = Math.round((look.overallApproval / 100) * look.overallVoteCount);
        publicToots += tootCount;
        publicTotal += look.overallVoteCount;
      }
    });
    const publicApprovalPct = publicTotal > 0 ? (publicToots / publicTotal) * 100 : null;
    setPublicApproval(publicApprovalPct);
    setPublicVoteCount(publicTotal);

    // Calculate user approval for all looks
    let userToots = 0, userTotal = 0;
    looks.forEach((look) => {
      if (votes[look.id] === "TOOT") userToots += 1;
      if (votes[look.id]) userTotal += 1;
    });
    const userApprovalPct = userTotal > 0 ? (userToots / userTotal) * 100 : null;
    setUserApproval(userApprovalPct);
    setUserVoteCount(userTotal);
  }, [looks, votes]);

  // Sort looks based on current sort option
  function getSortedLooks() {
    const looksCopy = [...looks];
    
    if (sortOption === "approval") {
      // Sort by highest approval first, then by vote count, then chronologically for ties
      looksCopy.sort((a, b) => {
        const approvalDiff = (b.overallApproval || 0) - (a.overallApproval || 0);
        if (approvalDiff !== 0) return approvalDiff;
        const voteCountDiff = (b.overallVoteCount || 0) - (a.overallVoteCount || 0);
        if (voteCountDiff !== 0) return voteCountDiff;
        return a.sequence - b.sequence;
      });
    } else {
      // Chronological: already sorted by sequence, then name
      looksCopy.sort((a, b) => {
        if (a.sequence !== b.sequence) return a.sequence - b.sequence;
        return (a.contestant_name || "").localeCompare(b.contestant_name || "");
      });
    }
    
    return looksCopy;
  }

  // Initialize user from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedUser = window.localStorage.getItem("rr_user");
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser({ ...parsed, user_id: parsed.userId || parsed.user_id || parsed.id });
      } catch (err) {
        console.error("Failed to parse stored user:", err);
      }
    }
    setUserInitialized(true);
  }, []);

  // Fetch looks and global vote stats from Supabase (independent of user)
  // Data is pre-fetched on the server, so we don't need to fetch here
  useEffect(() => {
    // Update looks state if initialLooks changes (e.g., during route changes)
    setLooks(initialLooks);
  }, [initialLooks]);

  // Fetch user's votes when user is initialized
  useEffect(() => {
    async function fetchUserVotes() {
      if (!userInitialized) return;

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
    }

    fetchUserVotes();
  }, [user, userInitialized]);

  async function handleVote(lookUuid, value) {
    if (!user) { router.push("/login"); return; }

    // Update local state
    setVotes((prev) => ({ ...prev, [lookUuid]: value }));
    // Persist to Supabase
    await fetch(`${router.basePath}/api/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        look_uuid: lookUuid,
        user_id: user.userId || user.user_id || user.id,
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

  return (
    <div style={styles.page}>
      <div style={mergeStyles(styles.content, mobileContentStyle)}>
        <header style={mergeStyles(styles.header, mobileHeaderStyle)}>
          <h1 style={styles.title}>Season 18 - Full Catalog
          </h1>
        </header>
        <div style={mergeStyles(styles.approvalHeaderContainer, isMobile ? mobileApprovalHeaderStyle : {})}>
          <div style={mergeStyles(styles.queenStatCol, isMobile ? styles.queenStatColMobile : {})}>
            <div style={styles.statLabel}>Public Approval</div>
            <div style={styles.statValue}>{publicApproval !== null ? `${publicApproval.toFixed(1)}%` : "—"}</div>
            <div style={styles.statRank}>({publicVoteCount} {publicVoteCount === 1 ? "vote" : "votes"})</div>
          </div>
          <div style={mergeStyles(styles.queenStatCol, isMobile ? styles.queenStatColMobile : {})}>
            <div style={styles.statLabel}>{user ? `${user.username}'s Approval` : "Your Approval"}</div>
            <div style={styles.statValue}>{userApproval !== null ? `${userApproval.toFixed(1)}%` : "—"}</div>
            <div style={styles.statRank}>({userVoteCount} {userVoteCount === 1 ? "vote" : "votes"})</div>
          </div>
        </div>
        <p style={styles.subtitle}>All runway looks from Season 18</p>
        <div style={styles.sorterContainer}>
          <button
            type="button"
            ref={sortBtnRef}
            onClick={() => setSortMenuOpen(!sortMenuOpen)}
            style={{
              ...styles.sorterButton,
              ...(sortMenuOpen ? styles.sorterButtonActive : {}),
            }}
          >
            {sortOption === "chronological" ? "Chronological" : "Highest Public Approval"}
            <span style={styles.sorterArrow}>▼</span>
          </button>
          {sortMenuOpen && (
            <div style={styles.sorterMenu} ref={sortMenuRef}>
              <button
                type="button"
                onClick={() => {
                  setSortOption("chronological");
                  setSortMenuOpen(false);
                }}
                style={styles.sorterMenuItem}
              >
                Chronological
              </button>
              <button
                type="button"
                onClick={() => {
                  setSortOption("approval");
                  setSortMenuOpen(false);
                }}
                style={styles.sorterMenuItem}
              >
                Highest Public Approval
              </button>
            </div>
          )}
        </div>
        <div style={styles.cardGrid}>
          {getSortedLooks().map((look) => (
            <LookCard
              key={look.id}
              look={look}
              userVote={votes[look.id] || null}
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
    background: "#120902",
    color: "#feefd0",
  },

  content: {
    padding: "0 24px 32px 24px", // left/right + bottom padding
  },

  header: {
    margin: "0",
    padding: "12px 0 0 0",
    textAlign: "center",
  },
  title: {
    fontSize: "32px",
    fontWeight: 500,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "#feefd0",
    margin: "0 0 20px 0",
    padding: 0,
    textAlign: "center",
    lineHeight: "1.2",
  },
  userBox: {
    fontSize: "14px",
    opacity: 0.9,
  },
  link: {
    color: "#feefd0",
    textDecoration: "underline",
    cursor: "pointer",
  },

  subtitle: {
    fontSize: "16px",
    fontWeight: 300,
    letterSpacing: "0.04em",
    fontStyle: "italic",
    opacity: 0.9,
    maxWidth: "640px",
    margin: "0 auto 20px auto",
    padding: "0",
    textAlign: "center",
    color: "#facbb8",
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
    color: "#feefd0",
    textDecoration: "none",
  },
  pillLink: {
    textDecoration: "none",
    color: "#f9f5ff",
  },
  pill: {
    fontSize: "13px",
    fontWeight: 400,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    padding: "3px 8px",
    borderRadius: "999px",
    background: "rgba(255, 180, 150, 0.16)",
    border: "1px solid rgba(255, 180, 150, 0.7)",
    color: "#feefd0",
  },
  imageLink: {
    fontSize: "13px",
    textDecoration: "underline",
    color: "#feefd0",
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
    fontWeight: 400,
    letterSpacing: "0.04em",
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
  approvalHeaderContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "24px",
    marginBottom: "24px",
    padding: "0 12px",
  },
  queenStatCol: {
    flex: "0 1 auto",
    textAlign: "center",
    padding: "12px 16px",
    borderRadius: "12px",
    border: "2px solid rgba(255, 180, 150, 0.35)",
    background: "rgba(255, 195, 205, 0.12)",
    minWidth: "180px",
  },
  queenStatColMobile: {
    maxWidth: "280px",
  },
  statLabel: {
    fontSize: "14px",
    fontWeight: 400,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "#facbb8",
    marginBottom: "6px",
    fontFamily: "Oswald, sans-serif",
  },
  statValue: {
    fontSize: "28px",
    fontWeight: 600,
    color: "#feefd0",
    fontFamily: "Oswald, sans-serif",
    marginBottom: "6px",
  },
  statRank: {
    fontSize: "14px",
    fontWeight: 400,
    letterSpacing: "0.04em",
    color: "#facbb8",
    fontFamily: "Oswald, sans-serif",
    marginTop: "6px",
  },
  sorterContainer: {
    display: "flex",
    justifyContent: "center",
    marginBottom: "36px",
    position: "relative",
  },
  sorterButton: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 14px",
    fontSize: "16px",
    fontWeight: 400,
    letterSpacing: "0.04em",
    borderRadius: "16px",
    border: "2px solid rgba(255, 180, 150, 0.35)",
    background: "rgba(255, 195, 205, 0.12)",
    color: "#feefd0",
    cursor: "pointer",
    fontFamily: "Oswald, sans-serif",
    outline: "none",
    textAlign: "center",
    transition: "all 0.15s ease",
    minWidth: "240px",
    justifyContent: "center",
  },
  sorterButtonActive: {
    background: "rgba(255, 195, 205, 0.18)",
    border: "2px solid rgba(255, 180, 150, 0.45)",
  },
  sorterArrow: {
    fontSize: "11px",
    transition: "transform 0.2s ease",
    display: "inline-block",
  },
  sorterMenu: {
    position: "absolute",
    top: "calc(100% + 4px)",
    left: "50%",
    transform: "translateX(-50%)",
    width: "240px",
    background: "#0f0804",
    border: "2px solid rgba(255, 180, 150, 0.35)",
    borderRadius: "16px",
    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.5)",
    zIndex: 1100,
    overflow: "hidden",
  },
  sorterMenuItem: {
    display: "block",
    width: "100%",
    padding: "8px 14px",
    color: "#feefd0",
    background: "transparent",
    border: "none",
    fontSize: "14px",
    fontWeight: 300,
    letterSpacing: "0.06em",
    cursor: "pointer",
    transition: "background-color 0.15s ease",
    whiteSpace: "nowrap",
    fontFamily: "Oswald, sans-serif",
    textAlign: "left",
    outline: "none",
  },
};

export async function getServerSideProps() {
  // Fetch all looks, including sequence
  const { data: looksData, error: looksError } = await supabaseAdmin
    .from("looks")
    .select("id, display_name, contestant_name, category, sequence, image_url")
    .order("sequence", { ascending: true });

  if (looksError || !looksData) {
    return {
      props: {
        initialLooks: [],
        initialPublicApproval: null,
        initialUserApproval: null,
      },
    };
  }

  // Fetch all votes for all looks
  const lookIds = looksData.map(l => l.id);
  const { data: allVotesData } = await supabaseAdmin
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
      look_id: look.look_id || look.id,
      overallApproval: stats.total > 0 ? Math.round((stats.toot / stats.total) * 100) : null,
      overallVoteCount: stats.total,
    };
  });

  // Sort by sequence ascending, then queen alphabetically for ties
  looksWithStats.sort((a, b) => {
    if (a.sequence !== b.sequence) return a.sequence - b.sequence;
    return (a.contestant_name || "").localeCompare(b.contestant_name || "");
  });

  // Calculate public approval for all looks
  let publicToots = 0, publicTotal = 0;
  looksWithStats.forEach((look) => {
    if (look.overallApproval !== null) {
      const tootCount = Math.round((look.overallApproval / 100) * look.overallVoteCount);
      publicToots += tootCount;
      publicTotal += look.overallVoteCount;
    }
  });
  const publicApprovalPct = publicTotal > 0 ? (publicToots / publicTotal) * 100 : null;

  return {
    props: {
      initialLooks: looksWithStats,
      initialPublicApproval: publicApprovalPct,
      initialUserApproval: null,
    },
  };
}
