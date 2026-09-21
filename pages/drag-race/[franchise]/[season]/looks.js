/**
 * pages/drag-race/[franchise]/[season]/looks.js
 *
 * Canonical All Looks page for any franchise/season within the Drag Race project.
 *
 * Dynamic route parameters:
 * - [franchise]: franchise slug (e.g. "us", "uk", "es-all-stars")
 * - [season]: season number (e.g. 18, 5, 1)
 *
 * Example URLs:
 * - /drag-race/us/18/looks
 * - /drag-race/uk/3/looks
 * - /drag-race/es-all-stars/1/looks
 *
 * Reuses the same LooksPage component and data-loading logic as pages/looks.js,
 * but obtains franchise/season from URL parameters instead of hardcoding.
 *
 * No hardcoded franchise or season; all resolved dynamically.
 */

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import LookCard from "../../../../components/LookCard";
import { supabase } from "../../../../lib/supabaseClient";
import { getLooksPageData } from "../../../../lib/looksPageData";
import { getSeasonNavContext } from "../../../../lib/seasonNavData";

/**
 * Reusable LooksPage component (shared with pages/looks.js).
 * Displays all looks for a season with chronological/approval sorting and voting.
 */
function LooksPage({ initialLooks = [], initialPublicApproval = null, initialUserApproval = null, categorySequenceMap = {}, franchiseSlug = "", seasonNumber = null }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [userInitialized, setUserInitialized] = useState(false);
  const [votes, setVotes] = useState({});
  const [looks, setLooks] = useState(initialLooks);
  const [isMobile, setIsMobile] = useState(false);
  const [sortOption, setSortOption] = useState("chronological");
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

  useEffect(() => {
    if (looks.length === 0) {
      setPublicApproval(null);
      setUserApproval(null);
      return;
    }

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

    let userToots = 0, userTotal = 0;
    looks.forEach((look) => {
      if (votes[look.id] === "TOOT") userToots += 1;
      if (votes[look.id]) userTotal += 1;
    });
    const userApprovalPct = userTotal > 0 ? (userToots / userTotal) * 100 : null;
    setUserApproval(userApprovalPct);
    setUserVoteCount(userTotal);
  }, [looks, votes]);

  function getSortedLooks() {
    const looksCopy = [...looks];

    if (sortOption === "approval") {
      looksCopy.sort((a, b) => {
        const approvalDiff = (b.overallApproval || 0) - (a.overallApproval || 0);
        if (approvalDiff !== 0) return approvalDiff;
        const voteCountDiff = (b.overallVoteCount || 0) - (a.overallVoteCount || 0);
        if (voteCountDiff !== 0) return voteCountDiff;
        const catSeqA = categorySequenceMap[a.category_id] || 999;
        const catSeqB = categorySequenceMap[b.category_id] || 999;
        if (catSeqA !== catSeqB) return catSeqA - catSeqB;
        const lookSeqA = a.sequence !== null ? a.sequence : 999;
        const lookSeqB = b.sequence !== null ? b.sequence : 999;
        if (lookSeqA !== 999 || lookSeqB !== 999) {
          if (lookSeqA !== lookSeqB) return lookSeqA - lookSeqB;
        }
        return (a.appearanceDisplayName || "").localeCompare(b.appearanceDisplayName || "");
      });
    } else {
      looksCopy.sort((a, b) => {
        const catSeqA = categorySequenceMap[a.category_id] || 999;
        const catSeqB = categorySequenceMap[b.category_id] || 999;
        if (catSeqA !== catSeqB) return catSeqA - catSeqB;

        const lookSeqA = a.sequence !== null ? a.sequence : 999;
        const lookSeqB = b.sequence !== null ? b.sequence : 999;
        if (lookSeqA !== 999 || lookSeqB !== 999) {
          if (lookSeqA !== lookSeqB) return lookSeqA - lookSeqB;
        }
        return (a.appearanceDisplayName || "").localeCompare(b.appearanceDisplayName || "");
      });
    }

    return looksCopy;
  }

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

  useEffect(() => {
    setLooks(initialLooks);
  }, [initialLooks]);

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

    setVotes((prev) => ({ ...prev, [lookUuid]: value }));
    await fetch(`/api/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        look_uuid: lookUuid,
        user_id: user.userId || user.user_id || user.id,
        vote: value,
      }),
    });

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

  const titleText = seasonNumber ? `Season ${seasonNumber} - Full Catalog` : "Looks";

  return (
    <div style={styles.page}>
      <div style={mergeStyles(styles.content, mobileContentStyle)}>
        <header style={mergeStyles(styles.header, mobileHeaderStyle)}>
          <h1 style={styles.title}>{titleText}</h1>
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
        <p style={styles.subtitle}>{looks.length} looks from {seasonNumber ? `Season ${seasonNumber}` : "this season"}</p>
        <div style={styles.sorterContainer}>
          <button
            type="button"
            ref={sortBtnRef}
            onClick={() => setSortMenuOpen(!sortMenuOpen)}
            style={styles.sorterButton}
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
              franchiseSlug={franchiseSlug}
              seasonNumber={seasonNumber}
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
    background: "var(--theme-page-background)",
    color: "var(--theme-ground-text-primary)",
  },
  content: {
    padding: "0 24px 32px 24px",
  },
  header: {
    margin: "0 0 0 0",
    padding: "12px 0 0 0",
    textAlign: "center",
  },
  title: {
    fontSize: "32px",
    fontWeight: 500,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "var(--theme-ground-text-primary)",
    margin: "0 0 20px 0",
    padding: 0,
    textAlign: "center",
    lineHeight: "1.2",
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
    color: "var(--theme-ground-text-secondary)",
  },
  cardGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
    gap: "16px",
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
    border: "2px solid var(--theme-element-border)",
    background: "var(--theme-element-fill)",
    minWidth: "188px",
  },
  queenStatColMobile: {
    maxWidth: "280px",
  },
  statLabel: {
    fontSize: "14px",
    fontWeight: 400,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "var(--theme-element-text-secondary)",
    marginBottom: "6px",
    fontFamily: "Oswald, sans-serif",
  },
  statValue: {
    fontSize: "28px",
    fontWeight: 600,
    color: "var(--theme-element-text-primary)",
    fontFamily: "Oswald, sans-serif",
    marginBottom: "6px",
  },
  statRank: {
    fontSize: "14px",
    fontWeight: 400,
    letterSpacing: "0.04em",
    color: "var(--theme-element-text-secondary)",
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
    border: "2px solid var(--theme-element-border)",
    background: "var(--theme-element-fill)",
    color: "var(--theme-element-text-primary)",
    cursor: "pointer",
    fontFamily: "Oswald, sans-serif",
    outline: "none",
    textAlign: "center",
    transition: "all 0.15s ease",
    minWidth: "240px",
    justifyContent: "center",
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
    background: "var(--theme-page-background)",
    border: "2px solid var(--theme-element-border)",
    borderRadius: "16px",
    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.5)",
    zIndex: 1100,
    overflow: "hidden",
  },
  sorterMenuItem: {
    display: "block",
    width: "100%",
    padding: "8px 14px",
    color: "var(--theme-ground-text-primary)",
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

export default LooksPage;

/**
 * Server-side data loading for canonical route.
 * Reads franchise and season from URL params.
 */
export async function getServerSideProps({ params }) {
  const { franchise, season } = params;

  // Validate season parameter: must be exactly a positive integer (no leading zeros, no decimals, no extra chars)
  if (!/^[1-9]\d*$/.test(season)) {
    // Invalid season format
    return {
      notFound: true,
    };
  }

  const seasonNumber = parseInt(season, 10);

  // Load data using shared utility
  const [pageData, seasonNav] = await Promise.all([
    getLooksPageData(franchise, seasonNumber),
    getSeasonNavContext(franchise, seasonNumber),
  ]);

  if (!pageData) {
    // Franchise/season combination not found or error loading data
    return {
      notFound: true,
    };
  }

  // Return props with franchise/season info for title
  return {
    props: {
      ...pageData,
      franchiseSlug: franchise,
      seasonNumber: seasonNumber,
      seasonNav,
    },
  };
}
