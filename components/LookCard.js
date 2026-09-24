// components/LookCard.js
import Link from "next/link";
import { useRouter } from "next/router";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { seasonQueenRoute, seasonCategoryRoute } from "../lib/routeHelpers";

const QUEEN_NAME_FONT_SIZE = 19;
const QUEEN_NAME_MIN_FONT_SIZE = 13;

function ShrinkToFitName({ children, onClick }) {
  const nameRef = useRef(null);

  useLayoutEffect(() => {
    const fitName = () => {
      const element = nameRef.current;
      if (!element) return;

      element.style.fontSize = `${QUEEN_NAME_FONT_SIZE}px`;
      if (element.scrollWidth <= element.clientWidth) return;

      let smallestFit = QUEEN_NAME_MIN_FONT_SIZE;
      let largestOverflow = QUEEN_NAME_FONT_SIZE;

      element.style.fontSize = `${smallestFit}px`;
      if (element.scrollWidth > element.clientWidth) return;

      while (largestOverflow - smallestFit > 0.1) {
        const candidate = (smallestFit + largestOverflow) / 2;
        element.style.fontSize = `${candidate}px`;

        if (element.scrollWidth <= element.clientWidth) {
          smallestFit = candidate;
        } else {
          largestOverflow = candidate;
        }
      }

      element.style.fontSize = `${smallestFit}px`;
    };

    fitName();

    const observer = typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(fitName);
    if (observer && nameRef.current) observer.observe(nameRef.current);

    let active = true;
    document.fonts?.ready.then(() => {
      if (active) fitName();
    });

    return () => {
      active = false;
      observer?.disconnect();
    };
  }, [children]);

  return (
    <span
      ref={nameRef}
      style={{ ...styles.queenName, ...(onClick ? { cursor: "pointer" } : {}) }}
      onClick={onClick}
    >
      {children}
    </span>
  );
}

function LookImagePreview({ src, alt }) {
  const [status, setStatus] = useState(src ? "loading" : "missing");
  const imageRef = useRef(null);

  const markFailed = useCallback((image) => {
    if (!image) return;

    image.style.visibility = "hidden";
    setStatus("failed");
  }, []);

  useLayoutEffect(() => {
    const image = imageRef.current;
    if (image?.complete && image.naturalWidth === 0) {
      markFailed(image);
    }
  }, [markFailed]);

  if (!src || status === "failed") {
    return (
      <div suppressHydrationWarning style={styles.comingSoonLabel}>
        COMING SOON
      </div>
    );
  }

  return (
    <>
      <a
        href={src}
        target="_blank"
        rel="noreferrer"
        aria-label={alt}
        style={styles.imageLink}
      >
        <img
          ref={imageRef}
          src={src}
          alt=""
          width="764"
          height="1079"
          decoding="async"
          style={{
            ...styles.image,
            visibility: status === "failed" ? "hidden" : "visible",
          }}
          onLoad={() => setStatus("loaded")}
          onError={(event) => {
            markFailed(event.currentTarget);
          }}
        />
      </a>
    </>
  );
}

function CategoryPill({ categoryName, categoryHref, categoryIsLink }) {
  const expandedProbeRef = useRef(null);
  const compactProbeRef = useRef(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [pillWidth, setPillWidth] = useState(null);

  useLayoutEffect(() => {
    const getLines = (element) => {
      const range = document.createRange();
      range.selectNodeContents(element);
      const lines = [];

      for (const rect of range.getClientRects()) {
        const existingLine = lines.find((line) => Math.abs(line.top - rect.top) < 1);
        if (existingLine) {
          existingLine.left = Math.min(existingLine.left, rect.left);
          existingLine.right = Math.max(existingLine.right, rect.right);
        } else {
          lines.push({ top: rect.top, left: rect.left, right: rect.right });
        }
      }

      return lines;
    };

    const updateMeasurement = () => {
      const expandedProbe = expandedProbeRef.current;
      const compactProbe = compactProbeRef.current;
      const wrapper = expandedProbe?.parentElement;
      if (!expandedProbe || !compactProbe || !wrapper) return;

      // The wrapper is the stable card-width constraint. Neither probe ever
      // receives pillWidth, so an earlier result cannot constrain this pass.
      const availableWidth = wrapper.clientWidth;
      if (availableWidth <= 0) return;

      for (const probe of [expandedProbe, compactProbe]) {
        probe.style.width = "fit-content";
        probe.style.maxWidth = `${availableWidth}px`;
      }

      const expandedLines = getLines(expandedProbe);
      const nextIsExpanded = expandedLines.length <= 1;
      let nextWidth = null;

      if (!nextIsExpanded) {
        const compactLines = getLines(compactProbe);

        if (compactLines.length > 2) {
          // At this viewport even the full card width needs more than two
          // natural lines. Use all available space; the visible pill's clamp
          // remains the final safety constraint.
          nextWidth = availableWidth;
        } else if (compactLines.length === 2) {
          const computed = window.getComputedStyle(compactProbe);
          const horizontalChrome =
            Number.parseFloat(computed.paddingLeft) +
            Number.parseFloat(computed.paddingRight) +
            Number.parseFloat(computed.borderLeftWidth) +
            Number.parseFloat(computed.borderRightWidth);
          const widestLine = Math.max(
            ...compactLines.map((line) => line.right - line.left)
          );

          nextWidth = Math.min(
            availableWidth,
            Math.ceil(widestLine + horizontalChrome)
          );
        }
      }

      setIsExpanded((current) => current === nextIsExpanded ? current : nextIsExpanded);
      setPillWidth((current) => current === nextWidth ? current : nextWidth);
    };

    updateMeasurement();

    const observer = typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(updateMeasurement);
    const wrapper = expandedProbeRef.current?.parentElement;
    if (observer && wrapper) observer.observe(wrapper);

    let active = true;
    document.fonts?.ready.then(() => {
      if (active) updateMeasurement();
    });

    return () => {
      active = false;
      observer?.disconnect();
    };
  }, [categoryName]);

  const pillStyle = {
    ...styles.pill,
    ...(isExpanded ? styles.pillExpanded : {}),
    ...(pillWidth ? { width: `${pillWidth}px` } : {}),
  };
  const categoryPill = <span style={pillStyle}>{categoryName}</span>;

  return (
    <>
      {categoryIsLink ? (
        <Link href={categoryHref} style={styles.pillLink}>
          {categoryPill}
        </Link>
      ) : (
        // Keep the non-link category-page pill in the same inline formatting
        // wrapper as the linked variants so its metadata geometry is identical.
        <span style={styles.pillLink}>{categoryPill}</span>
      )}
      <span
        ref={expandedProbeRef}
        aria-hidden="true"
        style={{ ...styles.pill, ...styles.pillExpanded, ...styles.pillProbe }}
      >
        {categoryName}
      </span>
      <span
        ref={compactProbeRef}
        aria-hidden="true"
        style={{ ...styles.pill, ...styles.pillProbe }}
      >
        {categoryName}
      </span>
    </>
  );
}

export default function LookCard({ look, userVote = null, onVote, headerMode = "home", franchiseSlug, seasonNumber }) {
  const imageSrc = typeof look?.image_path === "string" ? look.image_path.trim() : "";
  const lookNote = typeof look?.look_note === "string" ? look.look_note.trim() : "";
  const [approval, setApproval] = useState(
    look?.overallApproval != null ? Math.round(look.overallApproval) : null
  );
  const [voteCount, setVoteCount] = useState(look?.overallVoteCount || 0);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setApproval(look?.overallApproval != null ? Math.round(look.overallApproval) : null);
    setVoteCount(look?.overallVoteCount || 0);
  }, [look?.overallApproval, look?.overallVoteCount]);

  // Keep this after hooks so a reused card never changes hook order while new
  // data is arriving.
  if (
    !look ||
    typeof look !== "object" ||
    typeof look.appearanceDisplayName !== "string" ||
    typeof look.categoryDisplayName !== "string" ||
    typeof look.id !== "string"
  ) {
    console.error("[LookCard] Invalid look prop on initial render", { look });
    return (
      <div style={styles.invalidCard}>
        <b>Invalid Look Data</b>
        <pre style={{ fontSize: 12, marginTop: 8 }}>{JSON.stringify(look, null, 2)}</pre>
      </div>
    );
  }

  const queenHref = seasonQueenRoute(franchiseSlug, seasonNumber, look.queenSlug);
  const categoryHref = seasonCategoryRoute(franchiseSlug, seasonNumber, look.categorySlug);
  const queenIsLink = headerMode !== "queen";
  const categoryIsLink = headerMode !== "category";

  async function handleClick(vote) {
    if (saving) return;

    // Preserve the parent-owned optimistic update that also drives approval
    // sorting on the All Looks page.
    if (onVote) onVote(look.id, vote);

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
      const res = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          look_uuid: look.id,
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

  return (
    <div className="look-card" style={styles.card}>
      <div style={styles.cardHeader}>
        <div style={styles.queenNameRow}>
          <ShrinkToFitName onClick={queenIsLink ? () => router.push(queenHref) : undefined}>
            {look.display_name || look.appearanceDisplayName}
          </ShrinkToFitName>
        </div>

        <div style={styles.metadataRegion}>
          <div style={styles.categoryWrapper}>
            <CategoryPill
              categoryName={look.categoryDisplayName}
              categoryHref={categoryHref}
              categoryIsLink={categoryIsLink}
            />
          </div>
          {lookNote && <div style={styles.lookNote}>{lookNote}</div>}
        </div>
      </div>

      <div style={styles.imageWrapper}>
        <LookImagePreview
          key={imageSrc || "missing"}
          src={imageSrc}
          alt={`${look.display_name || look.appearanceDisplayName} – ${look.categoryDisplayName}`}
        />
      </div>

      <div style={styles.voteRow}>
        <button
          className="look-card__vote-button"
          type="button"
          disabled={saving}
          onClick={() => handleClick("TOOT")}
          style={{
            ...styles.voteButton,
            ...(userVote === "TOOT" ? styles.voteButtonActiveToot : {}),
            ...(saving ? styles.voteButtonSaving : {}),
          }}
        >
          TOOT
        </button>
        <button
          className="look-card__vote-button"
          type="button"
          disabled={saving}
          onClick={() => handleClick("BOOT")}
          style={{
            ...styles.voteButton,
            ...(userVote === "BOOT" ? styles.voteButtonActiveBoot : {}),
            ...(saving ? styles.voteButtonSaving : {}),
          }}
        >
          BOOT
        </button>
      </div>

      <div style={styles.voteSummary}>
        <div suppressHydrationWarning style={styles.voteNote}>
          {userVote === "TOOT"
            ? "You reviewed this look positively."
            : userVote === "BOOT"
              ? "You reviewed this look negatively."
              : "You have not reviewed this look."}
        </div>
        <div style={styles.publicNote}>
          Public approval: {typeof approval === "number" && voteCount > 0
            ? `${Math.round(approval)}% (${voteCount} ${voteCount === 1 ? "vote" : "votes"})`
            : "No votes yet"}
        </div>
      </div>
    </div>
  );
}

const styles = {
  invalidCard: {
    background: "var(--theme-page-background)",
    color: "var(--theme-ground-text-primary)",
    padding: 16,
    borderRadius: 8,
  },
  card: {
    background: "var(--theme-element-fill)",
    borderRadius: "16px",
    padding: "14px 14px",
    border: "2px solid var(--theme-element-border)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "8px",
    boxSizing: "border-box",
    height: "100%",
    minWidth: 0,
  },
  cardHeader: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "6px",
    fontSize: "14px",
    width: "100%",
  },
  queenNameRow: {
    width: "100%",
    height: "23px",
    minWidth: 0,
    display: "flex",
    alignItems: "center",
  },
  queenName: {
    display: "block",
    width: "100%",
    height: "23px",
    overflow: "hidden",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    fontWeight: 500,
    fontSize: `${QUEEN_NAME_FONT_SIZE}px`,
    lineHeight: "22px",
    textAlign: "center",
    color: "var(--theme-element-text-primary)",
  },
  metadataRegion: {
    height: "56px",
    width: "100%",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    gap: "1px",
    overflow: "hidden",
    textAlign: "center",
  },
  categoryWrapper: {
    position: "relative",
    width: "100%",
    minHeight: 0,
    textAlign: "center",
  },
  pillLink: {
    display: "inline-block",
    width: "fit-content",
    maxWidth: "100%",
  },
  pill: {
    display: "-webkit-box",
    WebkitBoxOrient: "vertical",
    WebkitLineClamp: 2,
    overflow: "hidden",
    width: "fit-content",
    maxWidth: "100%",
    marginInline: "auto",
    boxSizing: "border-box",
    fontSize: "12px",
    fontWeight: 400,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    padding: "2px 12px",
    borderRadius: "14px",
    background: "var(--theme-stacked-element-fill)",
    border: "2px solid var(--theme-element-border)",
    color: "var(--theme-stacked-element-text)",
    textAlign: "center",
    lineHeight: 1.1,
    whiteSpace: "normal",
    textWrap: "balance",
    wordBreak: "normal",
    overflowWrap: "break-word",
  },
  pillExpanded: {
    fontSize: "13px",
    lineHeight: 1.2,
    padding: "5px 13px",
  },
  pillProbe: {
    position: "absolute",
    visibility: "hidden",
    pointerEvents: "none",
    left: 0,
    top: 0,
    WebkitLineClamp: "unset",
    overflow: "visible",
  },
  lookNote: {
    display: "-webkit-box",
    WebkitBoxOrient: "vertical",
    WebkitLineClamp: 1,
    overflow: "hidden",
    maxWidth: "100%",
    padding: "0 4px",
    boxSizing: "border-box",
    fontSize: "11px",
    fontWeight: 300,
    lineHeight: 1.1,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    fontStyle: "italic",
    textAlign: "center",
    color: "var(--theme-element-text-secondary)",
  },
  imageWrapper: {
    marginTop: "1px",
    borderRadius: "12px",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "2px solid var(--theme-element-border)",
    width: "100%",
    maxWidth: "290px",
    aspectRatio: "764 / 1079",
    background: "var(--theme-page-background)",
    position: "relative",
    flexShrink: 0,
  },
  imageLink: {
    position: "absolute",
    inset: 0,
    display: "block",
    zIndex: 0,
  },
  image: {
    display: "block",
    width: "100%",
    height: "100%",
    objectFit: "cover",
    background: "var(--theme-page-background)",
  },
  comingSoonLabel: {
    position: "absolute",
    inset: 0,
    zIndex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    background: "var(--theme-page-background)",
    fontSize: "20px",
    fontWeight: 500,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    color: "var(--theme-ground-text-primary)",
  },
  voteRow: {
    marginTop: "6px",
    display: "flex",
    gap: "8px",
    width: "100%",
    minHeight: "29px",
  },
  voteButton: {
    flex: 1,
    borderRadius: "999px",
    padding: "4px 0",
    fontSize: "15px",
    fontWeight: 400,
    letterSpacing: "0.04em",
    borderWidth: "2px",
    borderStyle: "solid",
    borderColor: "var(--theme-element-border)",
    background: "var(--theme-page-background)",
    color: "var(--theme-ground-text-primary)",
    cursor: "pointer",
    fontFamily: "inherit",
    appearance: "none",
    WebkitAppearance: "none",
  },
  voteButtonSaving: {
    opacity: 0.5,
    cursor: "default",
  },
  voteButtonActiveToot: {
    background: "var(--theme-active-toot-fill)",
    color: "var(--theme-active-toot-text)",
    fontWeight: 500,
  },
  voteButtonActiveBoot: {
    background: "var(--theme-active-boot-fill)",
    color: "var(--theme-active-boot-text)",
    fontWeight: 500,
  },
  voteSummary: {
    height: "37px",
    width: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    overflow: "hidden",
    marginTop: "4px",
    paddingBottom: "2px",
    boxSizing: "content-box",
  },
  voteNote: {
    fontSize: "13px",
    lineHeight: 1.25,
    fontWeight: 300,
    letterSpacing: "0.06em",
    textAlign: "center",
    fontStyle: "italic",
    color: "var(--theme-element-text-primary)",
    width: "100%",
    whiteSpace: "nowrap",
    overflow: "visible",
    textOverflow: "ellipsis",
  },
  publicNote: {
    fontSize: "12px",
    fontWeight: 300,
    letterSpacing: "0.06em",
    color: "var(--theme-element-text-secondary)",
    textAlign: "center",
    width: "100%",
    whiteSpace: "nowrap",
    overflow: "visible",
    textOverflow: "ellipsis",
  },
};
