// components/LookCard.js
import Link from "next/link";
import { useRouter } from "next/router";
import { useState, useMemo, useEffect } from "react";

function slugify(str) {
  return (str || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function LookCard({ look, userVote, onVote, headerMode = "home", onCategoryClick, disableQueenLink }) {
  const [imgFailed, setImgFailed] = useState(false);
  const hasImageUrl = typeof look.image_url === "string" && look.image_url.trim().length > 0;


  // Robust check for invalid look data
  if (
    !look ||
    typeof look !== "object" ||
    typeof look.contestant_name !== "string" ||
    typeof look.category !== "string" ||
    typeof look.id !== "string" // ✅ require UUID always
  ) {
    console.error("[LookCard] Invalid look prop on initial render", { look });
    return (
      <div style={{ background: "#1a0f08", color: "#fff", padding: 16, borderRadius: 8 }}>
        <b>Invalid Look Data</b>
        <pre style={{ fontSize: 12, marginTop: 8 }}>{JSON.stringify(look, null, 2)}</pre>
      </div>
    );
  }

  // Local state for approval and vote count
  const [approval, setApproval] = useState(look.overallApproval);
  const [voteCount, setVoteCount] = useState(look.overallVoteCount);

  useEffect(() => {
    // Update approval/vote count whenever the look prop changes
    setApproval(look.overallApproval);
    setVoteCount(look.overallVoteCount);
  }, [look.overallApproval, look.overallVoteCount]);

  useEffect(() => {
    setImgFailed(false);
  }, [look?.image_url]);

  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const goToQueen = () => {
    router.push(`/queen/${slugify(look.contestant_name)}`);
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
      const res = await fetch(`${router.basePath}/api/vote`, {
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
            {look.display_name || look.contestant_name}
          </span>
        ) : (
          <span style={styles.queenName}>{look.display_name || look.contestant_name}</span>
        )}
      </div>

      {/* Category area reserved under contestant name */}
      <div style={styles.categoryWrapper}>
        {categoryIsLink ? (
          <Link
            href={`/category/${slugify(look.category)}`}
            style={styles.pillLink}
          >
            <span style={styles.pill}>{look.category}</span>
          </Link>
        ) : (
          <span style={styles.pill}>{look.category}</span>
        )}
      </div>
    </div>
  );

  return (
    <div className="look-card" style={styles.card}>
      {headerContent}

      {hasImageUrl && !imgFailed ? (
        <a
          href={look.image_url}
          target="_blank"
          rel="noreferrer"
          style={styles.imageWrapper}
        >
          <img
            src={look.image_url}
            alt={`${look.display_name || look.contestant_name} – ${look.category}`}
            style={styles.image}
            onError={() => setImgFailed(true)}
          />
        </a>
      ) : (
        <div style={styles.comingSoonBox}>
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


      <div style={styles.voteNote}>
        {userVote === "TOOT"
          ? "You tooted this look."
          : userVote === "BOOT"
            ? "You booted this look."
            : "You have not reviewed this look."}
      </div>

      <div style={styles.publicNote}>
        Overall approval: {typeof approval === "number" && voteCount > 0 ? `${approval}% (${voteCount} ${voteCount === 1 ? "vote" : "votes"})` : "No votes yet"}
      </div>
    </div>
  );
}


const styles = {
  card: {
    background: "rgba(255, 195, 205, 0.12)",      // subtle warm glow
    borderRadius: "16px",
    padding: "12px 14px",
    border: "2px solid rgba(255, 180, 150, 0.35)", // warm gold border
    display: "flex",
    flexDirection: "column",
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
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    padding: "4px 12px",
    borderRadius: "999px",
    background: "rgba(255, 180, 150, 0.16)",       // soft gold
    border: "1px solid rgba(255, 180, 150, 0.7)",
    color: "#fee1d0",                               // light gold text
    textAlign: "center",
    fontStyle: "italic",
    lineHeight: 1.2,
    whiteSpace: "normal",
    wordBreak: "break-word",
  },

  imageWrapper: {
    marginTop: "6px",
    borderRadius: "12px",
    overflow: "hidden",
    display: "block",
    border: "1px solid rgba(255, 204, 128, 0.35)", // gold-ish border
    width: "100%",
    maxWidth: "275px",
    aspectRatio: "764 / 1079",
    /* height removed to let aspectRatio control height */
    marginLeft: "auto",
    marginRight: "auto",
    background: "#1a0f08",
  },

  image: {
    display: "block",
    width: "100%",
    aspectRatio: "764 / 1079",
    objectFit: "cover",
    background: "#1a0f08",
  },
  queenName: {
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    fontWeight: 700,
    fontSize: "16px",
    display: "block",
    textAlign: "center",
    color: "#fef7e8", // match global text
  },

  voteRow: {
    marginTop: "8px",
    display: "flex",
    gap: "8px",
  },
  voteButton: {
    flex: 1,
    borderRadius: "999px",
    padding: "6px 0",
    fontSize: "13px",
    border: "1px solid rgba(255, 204, 128, 0.45)", // warm border
    background: "rgba(0, 0, 0, 0.35)",
    color: "#fef7e8",
    cursor: "pointer",
  },
  voteButtonActiveToot: {
    background: "rgba(232, 202, 122, 0.95)",        // warm yellow
    borderColor: "rgba(232, 202, 122, 1)",
    color: "#241b05",
    fontWeight: 600,
  },
  voteButtonActiveBoot: {
    background: "rgba(232, 142, 122, 0.95)",        // warm coral
    borderColor: "rgba(232, 142, 122, 1)",
    color: "#3a120b",
    fontWeight: 600,
  },

  voteNote: {
    marginTop: "8px",
    fontSize: "12px",
    opacity: 0.90,
    textAlign: "center",
    color: "#fee1d0",
  },
  publicNote: {
    marginTop: 4,
    fontSize: "11px",
    color: "#f5b289",         // gold accent
    textAlign: "center",
  },

  comingSoonBox: {
    marginTop: "6px",
    borderRadius: "12px",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    width: "100%",
    maxWidth: "275px",
    aspectRatio: "764 / 1079",
    marginLeft: "auto",
    marginRight: "auto",
    background: "#1a0f08",
    border: "1px solid rgba(255, 204, 128, 0.35)",
    fontWeight: 600,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: "rgba(253, 244, 227, 0.9)",
  }

};
