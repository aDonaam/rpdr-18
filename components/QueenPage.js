/**
 * components/QueenPage.js
 *
 * Shared presentation component for queen-page views.
 * Used by both temporary (/queen/[queen]) and canonical (/drag-race/[franchise]/[season]/queens/[queen]) routes.
 *
 * All UI, state management, styling, and interactivity is defined here.
 * Routes inject season-aware data via props.
 */

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import LookCard from "./LookCard";
import { supabase } from "../lib/supabaseClient";
import { getQueenImagePath } from "../lib/queenImagePath";

export default function QueenPage({ initialLooks, queenName: initialQueenName, queenSlug: initialQueenSlug, queenImagePath: initialQueenImagePath, initialPublicRank, initialTotalQueens, allLooksData: initialAllLooksData, allVotesData: initialAllVotesData, categorySequenceMap = {}, franchiseSlug, seasonNumber }) {
  const router = useRouter();
  const [queenName, setQueenName] = useState(initialQueenName);
  const [queenSlug, setQueenSlug] = useState(initialQueenSlug);
  const [queenImagePath, setQueenImagePath] = useState(initialQueenImagePath);
  const [user, setUser] = useState(null);
  const [userInitialized, setUserInitialized] = useState(false);
  const [votes, setVotes] = useState({});
  const [looks, setLooks] = useState(initialLooks);
  const [isMobile, setIsMobile] = useState(false);
  const [sortOption, setSortOption] = useState("chronological");
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [publicApproval, setPublicApproval] = useState(null);
  const [publicRank, setPublicRank] = useState(initialPublicRank || null);
  const [publicVoteCount, setPublicVoteCount] = useState(0);
  const [userApproval, setUserApproval] = useState(null);
  const [userRank, setUserRank] = useState(null);
  const [userVoteCount, setUserVoteCount] = useState(0);
  const [totalQueens, setTotalQueens] = useState(initialTotalQueens || 0);
  const sortBtnRef = useRef(null);
  const sortMenuRef = useRef(null);
  const userRankDataCache = useRef(initialAllLooksData && initialAllVotesData ? { allLooks: initialAllLooksData, allVotes: initialAllVotesData } : null);

  // Update cache when server props change
  useEffect(() => {
    if (initialAllLooksData && initialAllVotesData) {
      userRankDataCache.current = { allLooks: initialAllLooksData, allVotes: initialAllVotesData };
    }
  }, [initialAllLooksData, initialAllVotesData]);

  // Sync publicRank/totalQueens when server props change
  useEffect(() => {
    setPublicRank(initialPublicRank || null);
    setTotalQueens(initialTotalQueens || 0);
  }, [initialPublicRank, initialTotalQueens]);

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

  function getSortedLooks() {
    const looksCopy = [...looks];

    // Category sequence is the authoritative season chronology; look.sequence only
    // orders looks within the same category and may be null.
    function categorySeq(look) {
      return categorySequenceMap[look.category_id] ?? 999;
    }
    function lookSeq(look) {
      return look.sequence !== null && look.sequence !== undefined ? look.sequence : 999;
    }
    function deterministicFallback(a, b) {
      return String(a.id).localeCompare(String(b.id));
    }

    if (sortOption === "approval") {
      looksCopy.sort((a, b) => {
        const approvalDiff = (b.overallApproval || 0) - (a.overallApproval || 0);
        if (approvalDiff !== 0) return approvalDiff;
        const voteCountDiff = (b.overallVoteCount || 0) - (a.overallVoteCount || 0);
        if (voteCountDiff !== 0) return voteCountDiff;
        const catSeqDiff = categorySeq(a) - categorySeq(b);
        if (catSeqDiff !== 0) return catSeqDiff;
        const lookSeqDiff = lookSeq(a) - lookSeq(b);
        if (lookSeqDiff !== 0) return lookSeqDiff;
        return deterministicFallback(a, b);
      });
    } else {
      looksCopy.sort((a, b) => {
        const catSeqDiff = categorySeq(a) - categorySeq(b);
        if (catSeqDiff !== 0) return catSeqDiff;
        const lookSeqDiff = lookSeq(a) - lookSeq(b);
        if (lookSeqDiff !== 0) return lookSeqDiff;
        return deterministicFallback(a, b);
      });
    }

    return looksCopy;
  }

  // Calculate approval stats and user ranking
  useEffect(() => {
    async function calculateStats() {
      if (looks.length === 0) return;

      // Calculate public approval for this queen
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

      // Calculate user approval for this queen
      let userToots = 0, userTotal = 0;
      looks.forEach((look) => {
        if (votes[look.id] === "TOOT") userToots += 1;
        if (votes[look.id]) userTotal += 1;
      });
      const userApprovalPct = userTotal > 0 ? (userToots / userTotal) * 100 : null;
      setUserApproval(userApprovalPct);
      setUserVoteCount(userTotal);

      // Calculate public rank across all queens (in this season)
      try {
        let allLooksData, allVotesData;
        if (!userRankDataCache.current) {
          // Should not happen if data loader passed data, but fallback just in case
          setPublicRank(initialPublicRank || null);
        } else {
          allLooksData = userRankDataCache.current.allLooks;
          allVotesData = userRankDataCache.current.allVotes;

          if (allLooksData && allVotesData) {
            // The current queen's own looks all share one appearance_id.
            const currentAppearanceId = looks[0]?.appearance_id;

            // Group looks by season appearance
            const appearanceLooks = {};
            allLooksData.forEach((look) => {
              if (!appearanceLooks[look.appearance_id]) {
                appearanceLooks[look.appearance_id] = [];
              }
              appearanceLooks[look.appearance_id].push(look.id);
            });

            // Calculate public approval per appearance
            const appearancePublicApprovals = {};
            Object.entries(appearanceLooks).forEach(([appearanceId, lookIds]) => {
              let toots = 0, total = 0;
              (allVotesData || []).forEach((vote) => {
                if (lookIds.includes(vote.look_uuid)) {
                  if (vote.vote === "TOOT") toots += 1;
                  total += 1;
                }
              });
              appearancePublicApprovals[appearanceId] = total > 0 ? (toots / total) * 100 : 0;
            });

            // Build array of appearances with approval percentages
            const appearanceRows = Object.entries(appearancePublicApprovals).map(([appearanceId, approval]) => ({
              appearanceId,
              approval,
            }));

            // Sort by approval descending
            appearanceRows.sort((a, b) => b.approval - a.approval);

            // Assign ranks with tie handling (dense rank)
            let lastApproval = null;
            let currentRank = 0;
            appearanceRows.forEach((row, index) => {
              const approvalKey = row.approval.toFixed(6);
              if (index === 0 || approvalKey !== lastApproval) {
                currentRank = index + 1;
                lastApproval = approvalKey;
              }
              row.rank = currentRank;
            });

            // Find rank of current queen
            const currentAppearanceRow = appearanceRows.find((row) => row.appearanceId === currentAppearanceId);
            setPublicRank(currentAppearanceRow ? currentAppearanceRow.rank : null);
            setTotalQueens(appearanceRows.length);
          }
        }
      } catch (err) {
        console.error("Error calculating public rank:", err);
      }

      // Calculate user rank across all queens (only if user is logged in)
      if (user && user.user_id) {
        try {
          let allLooksData, allVotesData;
          if (!userRankDataCache.current) {
            setUserRank(null);
          } else {
            allLooksData = userRankDataCache.current.allLooks;
            allVotesData = userRankDataCache.current.allVotes;

            if (allLooksData && allVotesData) {
              const currentAppearanceId = looks[0]?.appearance_id;

              const appearanceLooks = {};
              allLooksData.forEach((look) => {
                if (!appearanceLooks[look.appearance_id]) {
                  appearanceLooks[look.appearance_id] = [];
                }
                appearanceLooks[look.appearance_id].push(look.id);
              });

              const appearanceUserApprovals = {};
              Object.entries(appearanceLooks).forEach(([appearanceId, lookIds]) => {
                let toots = 0, total = 0;
                (allVotesData || []).forEach((vote) => {
                  if (vote.user_id === user.user_id && lookIds.includes(vote.look_uuid)) {
                    if (vote.vote === "TOOT") toots += 1;
                    total += 1;
                  }
                });
                appearanceUserApprovals[appearanceId] = total > 0 ? { approval: (toots / total) * 100, total } : null;
              });

              // Build array of appearances with user approval percentages (only ones with votes)
              const appearanceUserRows = Object.entries(appearanceUserApprovals)
                .filter(([, data]) => data !== null)
                .map(([appearanceId, data]) => ({
                  appearanceId,
                  approval: data.approval,
                }));

              // Sort by approval descending
              appearanceUserRows.sort((a, b) => b.approval - a.approval);

              // Assign ranks with tie handling (dense rank)
              let lastApproval = null;
              let currentRank = 0;
              appearanceUserRows.forEach((row, index) => {
                const approvalKey = row.approval.toFixed(6);
                if (index === 0 || approvalKey !== lastApproval) {
                  currentRank = index + 1;
                  lastApproval = approvalKey;
                }
                row.rank = currentRank;
              });

              // Find rank of current queen
              const currentAppearanceRow = appearanceUserRows.find((row) => row.appearanceId === currentAppearanceId);
              setUserRank(currentAppearanceRow ? currentAppearanceRow.rank : null);
            }
          }
        } catch (err) {
          console.error("Error calculating user rank:", err);
        }
      } else {
        setUserRank(null);
      }
    }

    calculateStats();
  }, [looks, votes, user, queenName]);

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

  // Sync looks/name/slug/portrait when server props change (e.g. client-side
  // navigation between two queen pages reuses this component and gets fresh SSR props)
  useEffect(() => {
    setLooks(initialLooks);
    setQueenName(initialQueenName || "");
    setQueenSlug(initialQueenSlug || "");
    setQueenImagePath(initialQueenImagePath || null);
  }, [initialLooks, initialQueenName, initialQueenSlug, initialQueenImagePath]);

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
    await fetch(`/api/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        look_uuid: lookUuid,
        user_id: user.userId || user.user_id,
        vote: value,
      }),
    });

    // Fetch latest approval and vote count for this look
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
        const overallApproval = total > 0 ? (toot / total) * 100 : null;
        setLooks((prevLooks) => prevLooks.map((look) =>
          look.id === lookUuid
            ? { ...look, overallApproval, overallVoteCount: total }
            : look
        ));
      }
    } catch (err) {
      // ignore
    }

    // Clear rank calculation cache so fresh data is fetched on next calculateStats run
    userRankDataCache.current = null;
  }

  const mobileContentStyle = { paddingTop: "0px", paddingLeft: "10px", paddingRight: "10px", paddingBottom: "32px" };
  const mobileHeaderStyle = { paddingTop: "0px", marginBottom: "2px" };
  const mobilePortraitStyle = { width: "96px", height: "96px" };
  const mobileStatBlockStyle = { minWidth: "140px", padding: "12px 16px" };

  return (
    <div style={styles.page}>
      <div style={mergeStyles(styles.content, mobileContentStyle)}>
        <header style={mergeStyles(styles.header, mobileHeaderStyle)}>
          <h1 style={styles.title}>{queenName}</h1>
        </header>
        {queenSlug && (
          <div style={mergeStyles(styles.queenHeaderContainer, isMobile ? styles.queenHeaderContainerMobile : {})}>
            <div style={mergeStyles(styles.queenPortraitCol, isMobile ? styles.queenPortraitColMobile : {})}>
              <img
                src={getQueenImagePath(queenImagePath, queenSlug, "")}
                alt={`${queenName} portrait`}
                style={{
                  ...styles.portrait,
                  ...(isMobile ? mobilePortraitStyle : {}),
                }}
              />
            </div>
            <div style={mergeStyles(styles.queenStatCol, isMobile ? styles.queenStatColMobile : {})}>
              <div style={styles.statLabel}>Public Approval</div>
              <div style={styles.statValue}>{publicApproval !== null ? `${publicApproval.toFixed(1)}%` : "—"}</div>
              {publicRank && totalQueens > 0 && <div style={styles.statRank}>{publicRank}{publicRank === 1 ? "st" : publicRank === 2 ? "nd" : publicRank === 3 ? "rd" : "th"} of {totalQueens} queens ({publicVoteCount} {publicVoteCount === 1 ? "vote" : "votes"})</div>}
            </div>
            <div style={mergeStyles(styles.queenStatCol, isMobile ? styles.queenStatColMobile : {})}>
              <div style={styles.statLabel}>{user ? `${user.username}'s Approval` : "Your Approval"}</div>
              <div style={styles.statValue}>{userApproval !== null ? `${userApproval.toFixed(1)}%` : "—"}</div>
              {userVoteCount > 0 && totalQueens > 0 && <div style={styles.statRank}>{userRank}{userRank === 1 ? "st" : userRank === 2 ? "nd" : userRank === 3 ? "rd" : "th"} of {totalQueens} queens ({userVoteCount} {userVoteCount === 1 ? "vote" : "votes"})</div>}
            </div>
          </div>
        )}
        <p style={styles.subtitle}>
          All looks walked by <b>{queenName}</b> this season.
        </p>
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
              headerMode="queen"
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
  userBox: {
    fontSize: "14px",
    opacity: 0.9,
  },
  link: {
    color: "var(--theme-element-text-primary)",
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
    color: "var(--theme-ground-text-secondary)",
  },
  cardGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
    gridAutoRows: "1fr",
    gap: "16px",
  },
  portraitSection: {
    display: "flex",
    justifyContent: "center",
    marginBottom: "24px",
  },
  queenHeaderContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "24px",
    marginBottom: "24px",
    padding: "0 12px",
  },
  queenHeaderContainerMobile: {
    flexDirection: "column",
    gap: "20px",
    padding: "0",
  },
  queenPortraitCol: {
    display: "flex",
    justifyContent: "center",
    flexShrink: 0,
  },
  queenPortraitColMobile: {
    width: "100%",
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
  portrait: {
    width: "120px",
    height: "120px",
    objectFit: "cover",
    borderRadius: "12px",
    border: "2px solid var(--theme-element-border)",
    background: "var(--theme-stacked-element-fill)",
  },
  statRowContainer: {
    display: "flex",
    justifyContent: "center",
    gap: "24px",
    marginBottom: "28px",
  },
  statRowContainerMobile: {
    flexDirection: "column",
    gap: "16px",
  },
  statBlock: {
    padding: "16px 24px",
    borderRadius: "12px",
    border: "2px solid var(--theme-element-border)",
    background: "var(--theme-element-fill)",
    textAlign: "center",
    minWidth: "160px",
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
