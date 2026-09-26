/**
 * components/UserPage.js
 *
 * Shared presentation component for user-page (personal leaderboards) views.
 * Used by both temporary (/user/[username]) and canonical
 * (/drag-race/[franchise]/[season]/users/[username]) routes.
 *
 * All UI and styling is defined here. Routes inject season-aware data via props.
 */

import React from "react";
import { useRouter } from "next/router";
import { seasonQueenRoute, seasonCategoryRoute } from "../lib/routeHelpers";
import { getQueenImagePath } from "../lib/queenImagePath";

export default function UserPage({ username, displayUsername, rows, categories, franchiseSlug, seasonNumber }) {
  const router = useRouter();

  // Mobile detection
  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth <= 600);
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Mobile table styles
  const mobileTableStyles = {
    rankCol: { width: "28px", paddingTop: "6px", paddingRight: "4px", paddingBottom: "6px", paddingLeft: "4px", fontSize: "14px", verticalAlign: "middle", textAlign: "center", fontWeight: 600 },
    rankBadge: { display: "inline-block", fontSize: "13px", paddingTop: "4px", paddingRight: "4px", paddingBottom: "4px", paddingLeft: "4px", borderRadius: "8px", background: "var(--theme-page-background)", border: "2px solid var(--theme-element-border)", color: "var(--theme-ground-text-secondary)", fontWeight: 700, width: "14px", textAlign: "center", verticalAlign: "middle" },
    imageCol: { width: "40px", paddingTop: "6px", paddingRight: "2px", paddingBottom: "6px", paddingLeft: "2px", verticalAlign: "middle", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center" },
    nameCol: { paddingTop: "6px", paddingRight: "4px", paddingBottom: "6px", paddingLeft: "4px", width: "auto", verticalAlign: "middle", textAlign: "center" },
    approvalCol: { width: "60px", paddingTop: "6px", paddingRight: "0px", paddingBottom: "6px", paddingLeft: "0px", fontSize: "12px", verticalAlign: "middle", textAlign: "center" },
    votesCol: { width: "64px", paddingTop: "6px", paddingRight: "0px", paddingBottom: "6px", paddingLeft: "0px", fontSize: "12px", verticalAlign: "middle", textAlign: "center" },
    nameLink: { fontSize: "13px", wordBreak: "break-word", whiteSpace: "normal", lineHeight: "1.2", textAlign: "center", textWrap: "balance" },
    row: { height: "40px" },
    thumb: { width: 32, height: 32, borderRadius: 8 },
    avatarPlaceholder: { width: 32, height: 32, borderRadius: 8, fontSize: "8px" },
    approvalBadge: { fontSize: "13px", width: "44px", paddingTop: "2px", paddingRight: "0px", paddingBottom: "2px", paddingLeft: "0px", borderRadius: "8px", verticalAlign: "middle" },
    votesBadge: { fontSize: "10px", width: "37px", height: "28px", boxSizing: "border-box", padding: "0px", lineHeight: "1.1", borderRadius: "8px", verticalAlign: "middle" },
    rankColHeader: { width: "28px", paddingTop: "8px", paddingRight: "4px", paddingBottom: "10px", paddingLeft: "4px", fontSize: "13px", verticalAlign: "middle", textAlign: "center", fontWeight: 700 },
    imageColHeader: { width: "40px", paddingTop: "6px", paddingRight: "2px", paddingBottom: "8px", paddingLeft: "2px", verticalAlign: "middle", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center" },
    nameColHeader: { paddingTop: "8px", paddingRight: "4px", paddingBottom: "10px", paddingLeft: "4px", width: "auto", verticalAlign: "middle", textAlign: "center", fontSize: "13px" },
    approvalColHeader: { width: "60px", paddingTop: "8px", paddingRight: "0px", paddingBottom: "10px", paddingLeft: "0px", fontSize: "13px", verticalAlign: "middle", textAlign: "center", fontWeight: 700 },
    votesColHeader: { width: "64px", paddingTop: "8px", paddingRight: "0px", paddingBottom: "10px", paddingLeft: "0px", fontSize: "13px", verticalAlign: "middle", textAlign: "center", fontWeight: 700 },
    categoryNameCol: { paddingTop: "8px", paddingRight: "12px", paddingBottom: "8px", paddingLeft: "12px", width: "auto", verticalAlign: "middle", textAlign: "center" },
    categoryNameColHeader: { paddingTop: "8px", paddingRight: "4px", paddingBottom: "10px", paddingLeft: "4px", width: "auto", verticalAlign: "middle", textAlign: "center", fontSize: "13px" },
    categoryNameLink: { fontSize: "12px", wordBreak: "break-word", whiteSpace: "normal", lineHeight: "1.3", textAlign: "center", textWrap: "balance" },
    tableWrapper: { margin: "16px auto", width: "98%" },
    table: { width: "100%" },
    paddingRow: { height: "8px" }, // ← Adjust for mobile padding row height
  };

  function mergeStyles(base, mobile) {
    if (!isMobile) return base;
    return { ...base, ...mobile };
  }

  // Mobile page style override - reduce padding; minimize top spacing
  const mobilePageStyle = { paddingTop: "8px", paddingLeft: "10px", paddingRight: "10px", paddingBottom: "10px" };
  const mobileHeaderStyle = { paddingTop: "0px", marginBottom: "2px" };

  const title = displayUsername
    ? `${displayUsername} - PERSONAL LEADERBOARDS`
    : "PERSONAL LEADERBOARDS";

  return (
    <div suppressHydrationWarning style={mergeStyles(styles.page, mobilePageStyle)}>
      <header style={mergeStyles(styles.header, mobileHeaderStyle)}>
        <h1 style={styles.title}>{title}</h1>
      </header>
      <p style={styles.subtitle}>
        <b>{displayUsername || username}</b>&apos;s personal fashion bias report for this season.
      </p>

      <div style={mergeStyles(styles.leaderboardsContainer, isMobile ? styles.leaderboardsContainerMobile : {})}>
        {/* Queens Leaderboard */}
        <div style={mergeStyles(styles.leaderboardSection, isMobile ? styles.leaderboardSectionMobile : {})}>
          <h2 style={styles.sectionTitle}>Queens Leaderboard
          </h2>
          <p style={styles.sectionSubtitle}>Queens ranked by {displayUsername}&apos;s overall approval percentage only</p>
          {rows.length === 0 && (
            <p style={styles.empty}>
              This user hasn&apos;t voted on any looks yet.
            </p>
          )}
          {rows.length > 0 && (
            <div style={mergeStyles(styles.tableWrapper, mobileTableStyles.tableWrapper)}>
              <table suppressHydrationWarning style={mergeStyles(styles.table, mobileTableStyles.table)}>
                <thead>
                  <tr style={styles.headerRow}>
                    <th style={mergeStyles(styles.rankColHeader, mobileTableStyles.rankColHeader)}>Rank</th>
                    <th style={mergeStyles(styles.imageColHeader, mobileTableStyles.imageColHeader)}></th>
                    <th style={mergeStyles(styles.nameColHeader, mobileTableStyles.nameColHeader)}>Queen</th>
                    <th style={mergeStyles(styles.approvalColHeader, mobileTableStyles.approvalColHeader)}>Approval</th>
                    <th style={mergeStyles(styles.votesColHeader, mobileTableStyles.votesColHeader)}>Votes</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={mergeStyles(styles.paddingRow, mobileTableStyles.paddingRow)}>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                  </tr>
                  {rows.map((q) => (
                    <tr key={q.slug} style={mergeStyles(styles.row, mobileTableStyles.row)}>
                      <td style={mergeStyles(styles.rankCol, mobileTableStyles.rankCol)} className="rank-cell">
                        <span style={mergeStyles(styles.rankBadge, mobileTableStyles.rankBadge)}>{q.rank}</span>
                      </td>
                      <td style={mergeStyles(styles.imageCol, mobileTableStyles.imageCol)}>
                        {q.image_path ? (
                          <img
                            src={getQueenImagePath(q.image_path, q.slug, "")}
                            alt={`${q.appearanceDisplayName} thumbnail`}
                            style={mergeStyles(styles.thumb, mobileTableStyles.thumb)}
                            onError={(e) => {
                              e.currentTarget.src = `/thumbnails/queens/_default.jpg`;
                            }}
                          />
                        ) : (
                          <div style={mergeStyles(styles.avatarPlaceholder, mobileTableStyles.avatarPlaceholder)}>No image</div>
                        )}
                      </td>
                      <td style={mergeStyles(styles.nameCol, mobileTableStyles.nameCol)}>
                        <span
                          style={mergeStyles(styles.nameLink, mobileTableStyles.nameLink)}
                          onClick={() => franchiseSlug && router.push(seasonQueenRoute(franchiseSlug, seasonNumber, q.slug))}
                        >
                          {q.appearanceDisplayName.toUpperCase()}
                        </span>
                      </td>
                      <td style={mergeStyles(styles.approvalCol, mobileTableStyles.approvalCol)}>
                        {q.approvalPct != null ? (
                          <span style={mergeStyles(styles.approvalBadge, mobileTableStyles.approvalBadge)}>
                            {q.approvalPct.toFixed(1)}%
                          </span>
                        ) : (
                          <span style={styles.approvalLabel}>no votes yet</span>
                        )}
                      </td>
                      <td style={mergeStyles(styles.votesCol, mobileTableStyles.votesCol)}>
                        <span style={mergeStyles(styles.votesBadge, mobileTableStyles.votesBadge)}>
                          <><span style={{ flexShrink: 0 }}>{q.totalVotes}</span><span style={{ flexShrink: 0 }}>votes</span></>
                        </span>
                      </td>
                    </tr>
                  ))}
                  <tr style={mergeStyles(styles.paddingRow, mobileTableStyles.paddingRow)}>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Categories Leaderboard */}
        <div style={mergeStyles(styles.leaderboardSection, isMobile ? styles.leaderboardSectionMobile : {})}>
          <h2 style={styles.sectionTitle}>Categories Leaderboard</h2>
          <p style={styles.sectionSubtitle}>Categories ranked by {displayUsername}&apos;s overall approval percentage only</p>
          {categories.length === 0 && (
            <p style={styles.empty}>
              No categories yet.
            </p>
          )}
          {categories.length > 0 && (
            <div style={mergeStyles(styles.tableWrapper, mobileTableStyles.tableWrapper)}>
              <table suppressHydrationWarning style={mergeStyles(styles.table, mobileTableStyles.table)}>
                <thead>
                  <tr style={styles.headerRow}>
                    <th style={mergeStyles(styles.rankColHeader, mobileTableStyles.rankColHeader)}>Rank</th>
                    <th style={mergeStyles(styles.categoryNameColHeader, mobileTableStyles.categoryNameColHeader)}>Category</th>
                    <th style={mergeStyles(styles.approvalColHeader, mobileTableStyles.approvalColHeader)}>Approval</th>
                    <th style={mergeStyles(styles.votesColHeader, mobileTableStyles.votesColHeader)}>Votes</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={mergeStyles(styles.paddingRow, mobileTableStyles.paddingRow)}>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                  </tr>
                  {categories.map((c) => (
                    <tr key={c.slug} style={mergeStyles(styles.row, mobileTableStyles.row)}>
                      <td style={mergeStyles(styles.rankCol, mobileTableStyles.rankCol)} className="rank-cell">
                        <span style={mergeStyles(styles.rankBadge, mobileTableStyles.rankBadge)}>{c.rank}</span>
                      </td>
                      <td style={mergeStyles(styles.categoryNameCol, isMobile ? mobileTableStyles.categoryNameCol : {})}>
                        <span
                          style={mergeStyles(styles.categoryNameLink, isMobile ? mobileTableStyles.categoryNameLink : {})}
                          onClick={() => franchiseSlug && router.push(seasonCategoryRoute(franchiseSlug, seasonNumber, c.slug))}
                        >
                          {c.categoryDisplayName.toUpperCase()}
                        </span>
                      </td>
                      <td style={mergeStyles(styles.approvalCol, mobileTableStyles.approvalCol)}>
                        {c.approvalPct != null ? (
                          <span style={mergeStyles(styles.approvalBadge, mobileTableStyles.approvalBadge)}>
                            {c.approvalPct.toFixed(1)}%
                          </span>
                        ) : (
                          <span style={styles.approvalLabel}>no votes yet</span>
                        )}
                      </td>
                      <td style={mergeStyles(styles.votesCol, mobileTableStyles.votesCol)}>
                        <span style={mergeStyles(styles.votesBadge, mobileTableStyles.votesBadge)}>
                          <><span style={{ flexShrink: 0 }}>{c.totalVotes}</span><span style={{ flexShrink: 0 }}>votes</span></>
                        </span>
                      </td>
                    </tr>
                  ))}
                  <tr style={mergeStyles(styles.paddingRow, mobileTableStyles.paddingRow)}>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  rankBadge: {
    display: "inline-block",
    fontSize: "20px",
    paddingTop: "4px",
    paddingRight: "8px",
    paddingBottom: "4px",
    paddingLeft: "8px",
    borderRadius: "12px",
    background: "var(--theme-page-background)",
    border: "2px solid var(--theme-element-border)",
    color: "var(--theme-ground-text-secondary)",
    fontWeight: 500,
    width: "20px",
    textAlign: "center",
    verticalAlign: "middle",
  },
  approvalLabel: {
    fontSize: "13px",
    fontWeight: 400,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    opacity: 0.9,
  },
  page: {
    minHeight: "100vh",
    background: "var(--theme-page-background)",
    color: "var(--theme-ground-text-primary)",
    paddingTop: "12px",
    paddingRight: "24px",
    paddingBottom: "24px",
    paddingLeft: "24px",
  },
  header: {
    marginBottom: "6px",
    paddingTop: "0px",
    textAlign: "center",
  },
  title: {
    fontSize: "32px",
    fontWeight: 500,
    letterSpacing: "0.06em",
    textTransform: "none",
    color: "var(--theme-ground-text-primary)",
    marginBottom: "6px",
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
    margin: "0 auto 36px auto",
    padding: "12px 0",
    textAlign: "center",
    color: "var(--theme-ground-text-secondary)",
  },
  empty: {
    fontSize: "14px",
    opacity: 0.9,
    marginTop: "16px",
  },
  leaderboardsContainer: {
    display: "flex",
    gap: "64px",
    justifyContent: "center",
    flexWrap: "wrap",
  },
  leaderboardsContainerMobile: {
    display: "block",
  },
  leaderboardSection: {
    flex: "0",
    minWidth: "fit-content",
  },
  leaderboardSectionMobile: {
    marginBottom: "16px",
  },
  tableWrapper: {
    marginTop: "16px",
    borderRadius: "16px",
    overflow: "hidden",
    border: "2px solid var(--theme-element-border)",
    background: "var(--theme-element-fill)",
    margin: "16px auto",
    width: "fit-content",
  },
  table: {
    borderCollapse: "collapse",
  },
  row: {
    height: "84px",
  },
  rankCol: {
    width: "40px",
    paddingTop: "12px",
    paddingRight: "16px",
    paddingBottom: "12px",
    paddingLeft: "16px",
    fontWeight: 500,
    textAlign: "center",
    verticalAlign: "middle",
    fontSize: "24px",
    color: "var(--theme-element-text-primary)",
  },
  rankColHeader: {
    width: "40px",
    paddingTop: "10px",
    paddingRight: "16px",
    paddingBottom: "16px",
    paddingLeft: "16px",
    fontWeight: 500,
    textAlign: "center",
    verticalAlign: "middle",
    fontSize: "20px",
    fontStyle: "italic",
    color: "var(--theme-element-text-secondary)",
  },
  imageCol: {
    width: "80px",
    paddingTop: "10px",
    paddingRight: "8px",
    paddingBottom: "10px",
    paddingLeft: "8px",
    textAlign: "center",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  imageColHeader: {
    width: "80px",
    paddingTop: "10px",
    paddingRight: "8px",
    paddingBottom: "16px",
    paddingLeft: "8px",
    textAlign: "center",
    verticalAlign: "middle",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  nameCol: {
    paddingTop: "12px",
    paddingRight: "16px",
    paddingBottom: "12px",
    paddingLeft: "16px",
    textAlign: "center",
    verticalAlign: "middle",
    width: "300px",
  },
  nameColHeader: {
    paddingTop: "10px",
    paddingRight: "16px",
    paddingBottom: "16px",
    paddingLeft: "16px",
    textAlign: "center",
    verticalAlign: "middle",
    width: "300px",
    fontSize: "20px",
    fontWeight: 500,
    fontStyle: "italic",
    color: "var(--theme-element-text-secondary)",
  },
  categoryNameCol: {
    paddingTop: "12px",
    paddingRight: "16px",
    paddingBottom: "12px",
    paddingLeft: "16px",
    textAlign: "center",
    width: "394px",
    verticalAlign: "middle",
    overflow: "hidden",
  },
  categoryNameColHeader: {
    paddingTop: "10px",
    paddingRight: "16px",
    paddingBottom: "16px",
    paddingLeft: "16px",
    textAlign: "center",
    verticalAlign: "middle",
    width: "394px",
    fontSize: "20px",
    fontWeight: 500,
    fontStyle: "italic",
    color: "var(--theme-element-text-secondary)",
  },
  approvalCol: {
    width: "120px",
    paddingTop: "12px",
    paddingRight: "0px",
    paddingBottom: "12px",
    paddingLeft: "0px",
    textAlign: "center",
    verticalAlign: "middle",
  },
  approvalColHeader: {
    width: "120px",
    paddingTop: "10px",
    paddingRight: "0px",
    paddingBottom: "16px",
    paddingLeft: "0px",
    textAlign: "center",
    verticalAlign: "middle",
    fontSize: "20px",
    fontWeight: 500,
    fontStyle: "italic",
    color: "var(--theme-element-text-secondary)",
  },
  votesCol: {
    width: "100px",
    paddingTop: "12px",
    paddingRight: "0px",
    paddingBottom: "12px",
    paddingLeft: "0px",
    textAlign: "center",
    verticalAlign: "middle",
  },
  votesColHeader: {
    width: "100px",
    paddingTop: "10px",
    paddingRight: "0px",
    paddingBottom: "16px",
    paddingLeft: "0px",
    textAlign: "center",
    verticalAlign: "middle",
    fontSize: "20px",
    fontWeight: 500,
    fontStyle: "italic",
    color: "var(--theme-element-text-secondary)",
  },
  avatar: {
    width: "56px",
    height: "56px",
    borderRadius: "12px",
    objectFit: "cover",
    border: "1px solid rgba(255, 255, 255, 0.25)",
  },
  avatarPlaceholder: {
    width: "56px",
    height: "56px",
    borderRadius: "12px",
    border: "1px dashed rgba(255, 255, 255, 0.25)",
    fontSize: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.7,
  },
  nameLink: {
    fontSize: "26px",
    fontWeight: 500,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "var(--theme-element-text-primary)",
    cursor: "pointer",
    textDecoration: "none",
    display: "inline-block",
    textAlign: "center",
    textWrap: "balance",
  },
  categoryNameLink: {
    fontSize: "24px",
    fontWeight: 500,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "var(--theme-element-text-primary)",
    cursor: "pointer",
    textDecoration: "none",
    display: "inline-block",
    textAlign: "center",
    wordBreak: "break-word",
    maxWidth: "320px",
    lineHeight: "1.2",
    whiteSpace: "normal",
    textWrap: "balance",
  },
  approvalBadge: {
     display: "inline-block",
     fontSize: "20px",
     paddingTop: "4px",
     paddingRight: "0px",
     paddingBottom: "4px",
     paddingLeft: "0px",
     borderRadius: "12px",
     background: "var(--theme-stacked-element-fill)",
    border: "2px solid var(--theme-element-border)",
    color: "var(--theme-stacked-element-text)",
    fontWeight: 500,
     width: "76px",
     textAlign: "center",
     verticalAlign: "middle",
  },
  votesBadge: {
    display: "inline-flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    width: "52px",
    height: "42px",
    boxSizing: "border-box",
    padding: "0px",
    borderRadius: "10px",
   background: "var(--theme-page-background)",
    border: "2px solid var(--theme-element-border)",
    color: "var(--theme-ground-text-secondary)",
    fontSize: "12px",
    fontWeight: 400,
    lineHeight: "1.1",
    verticalAlign: "middle",
  },
  thumb: {
    width: 60,
    height: 60,
    borderRadius: 12,
    objectFit: "cover",
    background: "var(--theme-stacked-element-fill)",
    border: "2px solid var(--theme-element-border)",
    flex: "0 0 auto",
  },
  headerRow: {
    borderBottom: "2px solid var(--theme-element-border)",
  },
  paddingRow: {
    height: "8px", // ← Adjust this value to customize padding row height
  },
  sectionTitle: {
    fontSize: "24px",
    fontWeight: 500,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "var(--theme-ground-text-primary)",
    marginBottom: "4px",
    textAlign: "center",
    lineHeight: "1.2",
  },
  sectionSubtitle: {
    fontSize: "14px",
    fontWeight: 300,
    letterSpacing: "0.04em",
    fontStyle: "italic",
    textAlign: "center",
    color: "var(--theme-ground-text-secondary)",
    marginBottom: "12px",
    margin: "0 auto 12px auto",
  },
};
