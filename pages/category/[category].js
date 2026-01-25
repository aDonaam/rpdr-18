// pages/category/[category].js
import { supabaseAdmin } from "../../lib/supabaseAdmin";
import { useEffect, useState } from "react";
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
  const [votes, setVotes] = useState({});
  const [looks, setLooks] = useState(initialLooks);
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
      setUser({ ...parsed, user_id: parsed.userId });
    }
  }, []);

  // Fetch looks and votes from Supabase
  useEffect(() => {
    async function fetchData() {
      if (!router.isReady) return;
      setLoading(true);

      // Use slug directly for filtering
      const categorySlug = router.query.category;
      if (!categorySlug) { setLoading(false); return; }
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
        setLoading(false);
        return;
      }

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
      // Sort by contestant_name alphabetically, then display_name for ties
      looksWithStats.sort((a, b) => {
        const cmp = (a.contestant_name || "").localeCompare(b.contestant_name || "");
        if (cmp !== 0) return cmp;
        return (a.display_name || "").localeCompare(b.display_name || "");
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
  }, [user, router.isReady, router.query.category]);

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
        <div style={styles.cardGrid}>
            {looks.map((look) => (
              <LookCard
                key={look.id}
                look={look}
                userVote={votes[look.id]}
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
export default CategoryPage;
