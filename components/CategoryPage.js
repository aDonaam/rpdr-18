/**
 * components/CategoryPage.js
 *
 * Shared presentation component for category-page views.
 * Used by both temporary (/category/[category]) and canonical
 * (/drag-race/[franchise]/[season]/categories/[category]) routes.
 *
 * All UI, state management, styling, and interactivity is defined here.
 * Routes inject season-aware data via props.
 */

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import LookCard from "./LookCard";
import { supabase } from "../lib/supabaseClient";

export default function CategoryPage({
  initialLooks,
  categoryName: initialCategoryName,
  categorySlug: initialCategorySlug,
  initialPublicRank,
  totalCategories: initialTotalCategories,
  allLooksData: initialAllLooksData,
  allVotesData: initialAllVotesData,
  franchiseSlug,
  seasonNumber,
}) {
  const router = useRouter();
  const [categoryName, setCategoryName] = useState(initialCategoryName);
  const [categorySlug, setCategorySlug] = useState(initialCategorySlug);
  const [user, setUser] = useState(null);
  const [userInitialized, setUserInitialized] = useState(false);
  const [votes, setVotes] = useState({});
  const [looks, setLooks] = useState(initialLooks);
  const [isMobile, setIsMobile] = useState(false);
  const [sortOption, setSortOption] = useState("chronological");
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [publicApproval, setPublicApproval] = useState(null);
  const [publicVoteCount, setPublicVoteCount] = useState(0);
  const [userApproval, setUserApproval] = useState(null);
  const [userVoteCount, setUserVoteCount] = useState(0);
  const [publicRank, setPublicRank] = useState(initialPublicRank || null);
  const [userRank, setUserRank] = useState(null);
  const [totalCategories, setTotalCategories] = useState(initialTotalCategories || 0);
  const sortBtnRef = useRef(null);
  const sortMenuRef = useRef(null);
  const userRankDataCache = useRef(initialAllLooksData && initialAllVotesData ? { allLooks: initialAllLooksData, allVotes: initialAllVotesData } : null);

  // Update cache when server props change
  useEffect(() => {
    if (initialAllLooksData && initialAllVotesData) {
      userRankDataCache.current = { allLooks: initialAllLooksData, allVotes: initialAllVotesData };
    }
  }, [initialAllLooksData, initialAllVotesData]);

  // Sync looks/name/slug/rank when server props change (e.g. client-side navigation
  // between two category pages reuses this component and gets fresh SSR props)
  useEffect(() => {
    setLooks(initialLooks);
    setCategoryName(initialCategoryName || "");
    setCategorySlug(initialCategorySlug || "");
    setTotalCategories(initialTotalCategories || 0);
  }, [initialLooks, initialCategoryName, initialCategorySlug, initialTotalCategories]);

  useEffect(() => {
    setPublicRank(initialPublicRank || null);
  }, [initialPublicRank]);

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

  function getSortedLooks() {
    const looksCopy = [...looks];

    // Every look here belongs to the same category, so looks.sequence (nullable,
    // within-category only) is the primary ordering key; the season-appearance
    // display name is the alphabetical fallback when sequence is absent.
    function lookSeq(look) {
      return look.sequence !== null && look.sequence !== undefined ? look.sequence : 999;
    }
    function appearanceName(look) {
      return look.appearanceDisplayName || look.display_name || "";
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
        const seqDiff = lookSeq(a) - lookSeq(b);
        if (seqDiff !== 0) return seqDiff;
        const nameCmp = appearanceName(a).localeCompare(appearanceName(b));
        if (nameCmp !== 0) return nameCmp;
        return deterministicFallback(a, b);
      });
    } else {
      looksCopy.sort((a, b) => {
        const seqDiff = lookSeq(a) - lookSeq(b);
        if (seqDiff !== 0) return seqDiff;
        const nameCmp = appearanceName(a).localeCompare(appearanceName(b));
        if (nameCmp !== 0) return nameCmp;
        return deterministicFallback(a, b);
      });
    }

    return looksCopy;
  }

  // Calculate approval stats and ranking (season-scoped via cached allLooksData/allVotesData)
  useEffect(() => {
    function calculateStats() {
      if (looks.length === 0) {
        setPublicApproval(null);
        setUserApproval(null);
        setPublicRank(null);
        setUserRank(null);
        return;
      }

      // Calculate public approval for all looks in this category
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

      // Calculate user approval for all looks in this category
      let userToots = 0, userTotal = 0;
      looks.forEach((look) => {
        if (votes[look.id] === "TOOT") userToots += 1;
        if (votes[look.id]) userTotal += 1;
      });
      const userApprovalPct = userTotal > 0 ? (userToots / userTotal) * 100 : null;
      setUserApproval(userApprovalPct);
      setUserVoteCount(userTotal);

      const cache = userRankDataCache.current;
      if (!cache) {
        setPublicRank(initialPublicRank || null);
        setUserRank(null);
        return;
      }

      const { allLooks: allLooksData, allVotes: allVotesData } = cache;
      if (!allLooksData || !allVotesData) return;

      const currentCategoryId = looks[0]?.category_id;

      // Group season-scoped looks by category_id
      const categoryLooks = {};
      allLooksData.forEach((look) => {
        if (!categoryLooks[look.category_id]) categoryLooks[look.category_id] = [];
        categoryLooks[look.category_id].push(look.id);
      });

      // Calculate public approval per category (season-scoped)
      const categoryPublicApprovals = {};
      Object.entries(categoryLooks).forEach(([catId, lookIds]) => {
        let toots = 0, total = 0;
        allVotesData.forEach((vote) => {
          if (lookIds.includes(vote.look_uuid)) {
            if (vote.vote === "TOOT") toots += 1;
            total += 1;
          }
        });
        categoryPublicApprovals[catId] = total > 0 ? (toots / total) * 100 : 0;
      });

      const categoryRows = Object.entries(categoryPublicApprovals).map(([catId, approval]) => ({
        catId,
        approval,
      }));
      categoryRows.sort((a, b) => b.approval - a.approval);

      let lastApproval = null;
      let currentRank = 0;
      categoryRows.forEach((row, index) => {
        const approvalKey = row.approval.toFixed(6);
        if (index === 0 || approvalKey !== lastApproval) {
          currentRank = index + 1;
          lastApproval = approvalKey;
        }
        row.rank = currentRank;
      });

      setTotalCategories(categoryRows.length);
      const currentCategoryRow = categoryRows.find((row) => row.catId === currentCategoryId);
      setPublicRank(currentCategoryRow ? currentCategoryRow.rank : null);

      // Calculate user rank across all categories (only if user is logged in)
      if (user && user.user_id) {
        const categoryUserApprovals = {};
        Object.entries(categoryLooks).forEach(([catId, lookIds]) => {
          let toots = 0, total = 0;
          allVotesData.forEach((vote) => {
            if (vote.user_id === user.user_id && lookIds.includes(vote.look_uuid)) {
              if (vote.vote === "TOOT") toots += 1;
              total += 1;
            }
          });
          categoryUserApprovals[catId] = total > 0 ? { approval: (toots / total) * 100, total } : null;
        });

        const categoryUserRows = Object.entries(categoryUserApprovals)
          .filter(([, data]) => data !== null)
          .map(([catId, data]) => ({ catId, approval: data.approval }));
        categoryUserRows.sort((a, b) => b.approval - a.approval);

        let lastUserApproval = null;
        let currentUserRank = 0;
        categoryUserRows.forEach((row, index) => {
          const approvalKey = row.approval.toFixed(6);
          if (index === 0 || approvalKey !== lastUserApproval) {
            currentUserRank = index + 1;
            lastUserApproval = approvalKey;
          }
          row.rank = currentUserRank;
        });

        const currentUserCategoryRow = categoryUserRows.find((row) => row.catId === currentCategoryId);
        setUserRank(currentUserCategoryRow ? currentUserCategoryRow.rank : null);
      } else {
        setUserRank(null);
      }
    }

    calculateStats();
  }, [looks, votes, user]);

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

    // Fetch latest approval and vote count for this look directly from Supabase for immediate update
    try {
      const { data: voteRows, error } = await supabase
        .from("votes")
        .select("vote")
        .eq("look_uuid", lookUuid);
      if (!error && voteRows) {
        let toot = 0, total = 0;
        voteRows.forEach((row) => {
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

    // Clear rank calculation cache so fresh data is fetched on next calculateStats run
    userRankDataCache.current = null;
  }

  const mobileContentStyle = { paddingTop: "0px", paddingLeft: "10px", paddingRight: "10px", paddingBottom: "32px" };
  const mobileHeaderStyle = { paddingTop: "0px", marginBottom: "2px" };

  return (
    <div style={styles.page}>
      <div style={mergeStyles(styles.content, mobileContentStyle)}>
        <header style={mergeStyles(styles.header, mobileHeaderStyle)}>
          <h1 style={styles.title}>{categoryName}</h1>
        </header>
        <div style={mergeStyles(styles.approvalHeaderContainer, isMobile ? mobileApprovalHeaderStyle : {})}>
          <div style={mergeStyles(styles.queenStatCol, isMobile ? styles.queenStatColMobile : {})}>
            <div style={styles.statLabel}>Public Approval</div>
            <div style={styles.statValue}>{publicApproval !== null ? `${publicApproval.toFixed(1)}%` : "—"}</div>
            {publicRank && totalCategories > 0 && <div style={styles.statRank}>{publicRank}{publicRank === 1 ? "st" : publicRank === 2 ? "nd" : publicRank === 3 ? "rd" : "th"} of {totalCategories} categories ({publicVoteCount} {publicVoteCount === 1 ? "vote" : "votes"})</div>}
          </div>
          <div style={mergeStyles(styles.queenStatCol, isMobile ? styles.queenStatColMobile : {})}>
            <div style={styles.statLabel}>{user ? `${user.username}'s Approval` : "Your Approval"}</div>
            <div style={styles.statValue}>{userApproval !== null ? `${userApproval.toFixed(1)}%` : "—"}</div>
            {userVoteCount > 0 && totalCategories > 0 && <div style={styles.statRank}>{userRank}{userRank === 1 ? "st" : userRank === 2 ? "nd" : userRank === 3 ? "rd" : "th"} of {totalCategories} categories ({userVoteCount} {userVoteCount === 1 ? "vote" : "votes"})</div>}
          </div>
        </div>
        <p style={styles.subtitle}>
          All looks in the <b>{categoryName}</b> category.
        </p>
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
                headerMode="category"
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
    whiteSpace: "nowrap",
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
