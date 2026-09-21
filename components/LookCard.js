// components/LookCard.js
import Link from "next/link";
import { useRouter } from "next/router";
import { useState, useMemo, useEffect } from "react";
import { seasonQueenRoute, seasonCategoryRoute } from "../lib/routeHelpers";

export default function LookCard({ look, userVote = null, onVote, headerMode = "home", franchiseSlug, seasonNumber }) {
  const [imgFailed, setImgFailed] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const hasImageUrl = typeof look.image_path === "string" && look.image_path.trim().length > 0;

  // Mark hydration complete after mount
  useEffect(() => {
    setIsHydrated(true);
  }, []);


  // Robust check for invalid look data
  if (
    !look ||
    typeof look !== "object" ||
    typeof look.appearanceDisplayName !== "string" ||
    typeof look.categoryDisplayName !== "string" ||
    typeof look.id !== "string" // ✅ require UUID always
  ) {
    console.error("[LookCard] Invalid look prop on initial render", { look });
    return (
      <div style={{ background: "var(--theme-page-background)", color: "var(--theme-ground-text-primary)", padding: 16, borderRadius: 8 }}>
        <b>Invalid Look Data</b>
        <pre style={{ fontSize: 12, marginTop: 8 }}>{JSON.stringify(look, null, 2)}</pre>
      </div>
    );
  }

  // Local state for approval and vote count
  const [approval, setApproval] = useState(look.overallApproval !== null ? Math.round(look.overallApproval) : null);
  const [voteCount, setVoteCount] = useState(look.overallVoteCount);

  useEffect(() => {
    // Update approval/vote count whenever the look prop changes
    // Ensure approval is always an integer
    setApproval(look.overallApproval !== null ? Math.round(look.overallApproval) : null);
    setVoteCount(look.overallVoteCount);
  }, [look.overallApproval, look.overallVoteCount]);

  useEffect(() => {
    setImgFailed(false);
  }, [look?.image_path, look?.id]);

  const router = useRouter();
  const [saving, setSaving] = useState(false);

  // All active callers (QueenPage, CategoryPage, canonical All Looks) supply
  // season context and normalized slugs from the loaders.
  const queenHref = seasonQueenRoute(franchiseSlug, seasonNumber, look.queenSlug);
  const categoryHref = seasonCategoryRoute(franchiseSlug, seasonNumber, look.categorySlug);

  const goToQueen = () => {
    router.push(queenHref);
  };

  async function handleClick(vote) {
    if (saving) return;
    // Optimistic UI update
    if (onVote) onVote(look.id, vote);
    // Read logged-in user (must include userId)
    let userId = null;
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("rr_user");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          userId = parsed?.userId || parsed?.user_id || null;
        } catch { }
      }
    }
    if (!userId) {
      router.push("/login");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          look_uuid: look.id,   // keep your current payload
          user_id: userId,
          vote,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        console.error("Vote save failed:", data || res.statusText);
      }
    } catch (err) {
      console.error("Error sending vote to Supabase:", err);
    } finally {
      setSaving(false);
    }
  }


  // Header layout depends on which page we're on
  let headerContent = null;

  const queenIsLink = headerMode !== "queen";      // queen page: static
  const categoryIsLink = headerMode !== "category"; // category page: static pill

  headerContent = (
    <div style={styles.cardHeader}>
      {/* Contestant name (always one line at top) */}
      <div>
        {queenIsLink ? (
          <span
            style={{ ...styles.queenName, cursor: "pointer" }}
            onClick={goToQueen}
          >
            {look.display_name || look.appearanceDisplayName}
          </span>
        ) : (
          <span style={styles.queenName}>{look.display_name || look.appearanceDisplayName}</span>
        )}
      </div>

      {/* Category area reserved under contestant name */}
      <div style={styles.categoryWrapper}>
        {categoryIsLink ? (
          <Link
            href={categoryHref}
            style={styles.pillLink}
          >
            <span style={styles.pill}>{look.categoryDisplayName}</span>
          </Link>
        ) : (
          <span style={styles.pill}>{look.categoryDisplayName}</span>
        )}
      </div>
    </div>
  );

  return (
    <div className="look-card" style={styles.card}>
      {headerContent}

      {hasImageUrl && !imgFailed ? (
        <a
          href={look.image_path}
          target="_blank"
          rel="noreferrer"
          style={styles.imageWrapper}
        >
          <img
            src={look.image_path}
            alt={`${look.display_name || look.appearanceDisplayName} – ${look.categoryDisplayName}`}
            style={styles.image}
            onError={() => setImgFailed(true)}
          />
        </a>
      ) : (
        <div suppressHydrationWarning style={styles.comingSoonBox}>
          COMING SOON
        </div>
      )}



      <div style={styles.voteRow}>
        <button
          type="button"
          disabled={saving}
          onClick={() => handleClick("TOOT")}
          style={{
            ...styles.voteButton,
            ...(userVote === "TOOT" ? styles.voteButtonActiveToot : {}),
            ...(saving ? { opacity: 0.5, cursor: "default" } : {}),
          }}
        >
          TOOT
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => handleClick("BOOT")}
          style={{
            ...styles.voteButton,
            ...(userVote === "BOOT" ? styles.voteButtonActiveBoot : {}),
            ...(saving ? { opacity: 0.5, cursor: "default" } : {}),
          }}
        >
          BOOT
        </button>
      </div>


      <div suppressHydrationWarning style={styles.voteNote}>
        {userVote === "TOOT"
          ? "You reviewed this look positively."
          : userVote === "BOOT"
            ? "You reviewed this look negatively."
            : "You have not reviewed this look."}
      </div>

      <div style={styles.publicNote}>
        Public approval: {typeof approval === "number" && voteCount > 0 ? `${Math.round(approval)}% (${voteCount} ${voteCount === 1 ? "vote" : "votes"})` : "No votes yet"}
      </div>
    </div>
  );
}


const styles = {
  card: {
    background: "var(--theme-element-fill)",
    borderRadius: "16px",
    padding: "12px 14px",
    border: "2px solid var(--theme-element-border)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "8px",
  },

  cardHeader: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "4px",
    fontSize: "14px",
    marginBottom: "0px",
  },


  categoryWrapper: {
    minHeight: "40px",      // space for up to ~2 lines of pill
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    textAlign: "center",
  },

  pill: {
    display: "inline-block",
    fontSize: "12px",
    fontWeight: 300,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    padding: "4px 12px",
    borderRadius: "999px",
    background: "var(--theme-stacked-element-fill)",
    border: "1px solid var(--theme-element-border)",
    color: "var(--theme-stacked-element-text)",
    textAlign: "center",
    fontStyle: "italic",
    lineHeight: 1.2,
    whiteSpace: "normal",
    wordBreak: "break-word",
  },

  imageWrapper: {
    marginTop: "3px",
    borderRadius: "12px",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "2px solid var(--theme-element-border)",
    width: "100%",
    maxWidth: "275px",
    aspectRatio: "764 / 1079",
    /* height removed to let aspectRatio control height */
    background: "var(--theme-stacked-element-fill)",
  },

  image: {
    display: "block",
    width: "100%",
    aspectRatio: "764 / 1079",
    objectFit: "cover",
    background: "var(--theme-stacked-element-fill)",
  },
  queenName: {
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    fontWeight: 500,
    fontSize: "19px",
    display: "block",
    textAlign: "center",
    color: "var(--theme-element-text-primary)",
  },

  voteRow: {
    marginTop: "6px",
    display: "flex",
    gap: "8px",
    width: "100%",
    paddingLeft: "0",
    paddingRight: "0",
  },
  voteButton: {
    flex: 1,
    borderRadius: "999px",
    padding: "4px 0",
    fontSize: "15px",
    fontWeight: 400,
    letterSpacing: "0.04em",
    border: "1px solid var(--theme-element-border)",
    background: "var(--theme-page-background)",
    color: "var(--theme-ground-text-primary)",
    cursor: "pointer",
    fontFamily: "inherit",
  },
  voteButtonActiveToot: {
    background: "var(--theme-active-toot-fill)",
    borderColor: "var(--theme-element-border)",
    color: "var(--theme-active-toot-text)",
    fontWeight: 500,
  },
  voteButtonActiveBoot: {
    background: "var(--theme-active-boot-fill)",
    borderColor: "var(--theme-element-border)",
    color: "var(--theme-active-boot-text)",
    fontWeight: 500,
  },

  voteNote: {
    marginTop: "2px",
    fontSize: "13px",
    fontWeight: 300,
    letterSpacing: "0.06em",
    textAlign: "center",
    fontStyle: "italic",
    color: "var(--theme-element-text-primary)",
  },
  publicNote: {
    fontSize: "12px",
    fontWeight: 300,
    letterSpacing: "0.06em",
    color: "var(--theme-element-text-secondary)",
    textAlign: "center",
  },

  comingSoonBox: {
    marginTop: "3px",
    borderRadius: "12px",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    width: "100%",
    maxWidth: "275px",
    aspectRatio: "764 / 1079",
    background: "var(--theme-page-background)",
    border: "2px solid var(--theme-element-border)",
    fontSize: "20px",
    fontWeight: 500,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    color: "var(--theme-ground-text-primary)",
  }

};
