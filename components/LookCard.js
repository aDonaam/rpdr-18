// components/LookCard.js
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";


function slugify(str) {
  return (str || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function LookCard({ look, userVote, onVote, headerMode = "home" }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

const goToQueen = () => {
  router.push(`/queen/${slugify(look.queen)}`);
};

  async function handleClick(vote) {
  if (saving) return; // avoid double-click spam
  setSaving(true);

  if (onVote) onVote(look.look_id, vote);

  try {
    let username = "unknown";

    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("rr_user");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.username) {
          username = parsed.username;
        }
      }
    }

    await fetch("https://script.google.com/macros/s/AKfycbwuGx0sBkvJMjP7cAmpT3uagpsTb6BT0i7Yqw0dLA2iq86Oh2ubSVxghIHSuE8gnB8A2Q/exec", {
      method: "POST",
      body: JSON.stringify({
        action: "vote",
        look_id: look.look_id,
        user: username,
        vote,
      }),
    });
  } catch (err) {
    console.error("Error sending vote", err);
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
      {/* Queen name (always one line at top) */}
            <div>
        {queenIsLink ? (
          <span
            style={{ ...styles.queenName, cursor: "pointer" }}
            onClick={goToQueen}
          >
            {look.queen}
          </span>
        ) : (
          <span style={styles.queenName}>{look.queen}</span>
        )}
      </div>


      {/* Category area reserved under queen name */}
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

      {look.image_url && (
        <a
          href={look.image_url}
          target="_blank"
          rel="noreferrer"
          style={styles.imageWrapper}
        >
          <img
            src={look.image_url}
            alt={`${look.queen} – ${look.category}`}
            style={styles.image}
          />
        </a>
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

            {userVote && (
        <div style={styles.voteNote}>
          {userVote === "TOOT"
            ? "You tooted this look."
            : "You booted this look."}
        </div>
      )}

      {typeof look.overallApproval === "number" && look.overallVoteCount > 0 && (
        <div style={styles.publicNote}>
          Overall approval: {look.overallApproval}% (
          {look.overallVoteCount}{" "}
          {look.overallVoteCount === 1 ? "vote" : "votes"})
        </div>
      )}
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
},

  image: {
    display: "block",
    width: "100%",
    maxHeight: "260px",
    objectFit: "cover",
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



};
