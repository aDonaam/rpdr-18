// pages/category/[category].js
import { supabaseAdmin } from "../../lib/supabaseAdmin";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import LookCard from "../../components/LookCard";
import { supabase } from "../../lib/supabaseClient";

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


function CategoryPage({ initialLooks, categoryName: initialCategoryName }) {
  const router = useRouter();
  const [categoryName, setCategoryName] = useState(initialCategoryName);
  const [user, setUser] = useState(null);
  const [userInitialized, setUserInitialized] = useState(false); // Track if user hydration is complete
  const [votes, setVotes] = useState({});
  const [looks, setLooks] = useState(initialLooks);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);  const [sortOption, setSortOption] = useState("chronological");
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
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

  function getSortedLooks() {
    const looksCopy = [...looks];
    
    if (sortOption === "approval") {
      looksCopy.sort((a, b) => {
        const approvalDiff = (b.overallApproval || 0) - (a.overallApproval || 0);
        if (approvalDiff !== 0) return approvalDiff;
        const voteCountDiff = (b.overallVoteCount || 0) - (a.overallVoteCount || 0);
        if (voteCountDiff !== 0) return voteCountDiff;
        return a.sequence - b.sequence;
      });
    } else {
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
  useEffect(() => {
    async function fetchLooks() {
      if (!router.isReady) return;

      // Use slug directly for filtering
      const categorySlug = router.query.category;
      if (!categorySlug) return;
      // Optionally, fetch display name from first look
      const { data: looksData, error: looksError } = await supabase
        .from("looks")
        .select("id, look_id, display_name, contestant_name, category, category_slug, sequence, image_url")
        .eq("category_slug", categorySlug)
        .order("contestant_name", { ascending: true });

      let displayCategoryName = categorySlug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      if (looksData && looksData.length > 0 && looksData[0].category) {
        displayCategoryName = looksData[0].category;
      }
      setCategoryName(displayCategoryName);

      if (looksError || !looksData) {
        setLooks([]);
        return;
      }

      // Use id as look_uuid for votes, but also keep look_id for legacy/compat
      const lookIds = looksData.map(l => l.id);
      const { data: allVotesData } = await supabase
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
      // Sort by contestant_name alphabetically, then display_name for ties
      looksWithStats.sort((a, b) => {
        const cmp = (a.contestant_name || "").localeCompare(b.contestant_name || "");
        if (cmp !== 0) return cmp;
        return (a.display_name || "").localeCompare(b.display_name || "");
      });
      setLooks(looksWithStats);
    }

    fetchLooks();
  }, [router.isReady, router.query.category]);

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
      setLoading(false);
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
          <h1 style={styles.title}>{categoryName}</h1>
        </header>
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
              />
            ))}
        </div>
      </div>
    </div>
  );

}



export async function getServerSideProps(context) {

  const { category } = context.params;
  // Use slug directly for filtering
  const categorySlug = category;

  // Fetch all looks for this category_slug
  const { data: looksRaw, error: looksError } = await supabaseAdmin
    .from("looks")
    .select("id, look_id, display_name, contestant_name, category, category_slug, sequence, image_url")
    .eq("category_slug", categorySlug)
    .order("contestant_name", { ascending: true });
  if (looksError || !looksRaw) {
    console.error("Supabase error:", looksError);
    return { props: { initialLooks: [], categoryName: categorySlug } };
  }

  // Use display name from first look if available
  let displayCategoryName = categorySlug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  if (looksRaw && looksRaw.length > 0 && looksRaw[0].category) {
    displayCategoryName = looksRaw[0].category;
  }

  // Fetch all votes for these looks using the UUID (id field)
  const lookIds = looksRaw.map(l => l.id);
  const { data: votesRaw, error: votesError } = await supabaseAdmin
    .from("votes")
    .select("look_uuid, vote, user_id, updated_at")
    .in("look_uuid", lookIds);

  // Aggregate votes per look row
  const latestByUserLook = {};
  (votesRaw || []).forEach((row) => {
    const lookId = String(row.look_uuid || "").trim();
    const userId = String(row.user_id || "").trim();
    const vote = String(row.vote || "").toUpperCase().trim();
    if (!lookId || !userId) return;
    if (vote !== "TOOT" && vote !== "BOOT") return;
    const key = `${lookId}::${userId}`;
    if (!latestByUserLook[key] || new Date(row.updated_at) > new Date(latestByUserLook[key].updated_at)) {
      latestByUserLook[key] = { lookId, vote, updated_at: row.updated_at };
    }
  });

  // Calculate approval per look row
  const grouped = {}; // lookId -> { toot, total }
  Object.values(latestByUserLook).forEach(({ lookId, vote }) => {
    if (!grouped[lookId]) grouped[lookId] = { toot: 0, total: 0 };
    grouped[lookId].total += 1;
    if (vote === "TOOT") grouped[lookId].toot += 1;
  });

  const looks = (looksRaw || []).map((look) => {
    const g = grouped[look.id];
    if (!g || g.total === 0) {
      return { ...look, overallApproval: null, overallVoteCount: 0 };
    }
    const pct = Math.round((g.toot / g.total) * 100);
    return { ...look, overallApproval: pct, overallVoteCount: g.total };
  });
  // Sort by contestant_name alphabetically, then display_name for ties
  looks.sort((a, b) => {
    const cmp = (a.contestant_name || "").localeCompare(b.contestant_name || "");
    if (cmp !== 0) return cmp;
    return (a.display_name || "").localeCompare(b.display_name || "");
  });

  return { props: { initialLooks: looks, categoryName: displayCategoryName } };
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
    margin: "0 0 6px 0",
    padding: "12px 0 0 0",
    textAlign: "center",
  },
  title: {
    fontSize: "32px",
    fontWeight: 500,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "#feefd0",
    margin: "0 0 6px 0",
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
    margin: "0 auto 10px auto",
    padding: "12px 0",
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
  sorterContainer: {
    display: "flex",
    justifyContent: "center",
    marginBottom: "28px",
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
export default CategoryPage;
