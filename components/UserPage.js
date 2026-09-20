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
    rankBadge: { display: "inline-block", fontSize: "13px", paddingTop: "4px", paddingRight: "4px", paddingBottom: "4px", paddingLeft: "4px", borderRadius: "8px", background: "rgba(255, 180, 150, 0.16)", border: "2px solid rgba(255, 180, 150, 0.35)", color: "#feefd0", fontWeight: 600, width: "14px", textAlign: "center" },
    imageCol: { width: "40px", paddingTop: "7px", paddingRight: "2px", paddingBottom: "5px", paddingLeft: "2px", verticalAlign: "middle", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center" },
    nameCol: { paddingTop: "6px", paddingRight: "4px", paddingBottom: "6px", paddingLeft: "4px", width: "auto", verticalAlign: "middle", textAlign: "center" },
    approvalCol: { width: "60px", paddingTop: "6px", paddingRight: "0px", paddingBottom: "6px", paddingLeft: "0px", fontSize: "12px", verticalAlign: "middle", textAlign: "center" },
    votesCol: { width: "64px", paddingTop: "6px", paddingRight: "0px", paddingBottom: "6px", paddingLeft: "0px", fontSize: "12px", verticalAlign: "middle", textAlign: "center" },
    nameLink: { fontSize: "13px", wordBreak: "break-word", whiteSpace: "normal", lineHeight: "1.2", textAlign: "center" },
    row: { height: "40px" },
    thumb: { width: 32, height: 32, borderRadius: 8 },
    avatarPlaceholder: { width: 32, height: 32, borderRadius: 8, fontSize: "8px" },
    approvalBadge: { fontSize: "13px", width: "44px", paddingTop: "2px", paddingRight: "0px", paddingBottom: "2px", paddingLeft: "0px", borderRadius: "8px" },
    votesBadge: { fontSize: "10px", width: "32px", paddingTop: "2px", paddingRight: "4px", paddingBottom: "2px", paddingLeft: "4px", borderRadius: "8px" },
    rankColHeader: { width: "28px", paddingTop: "8px", paddingRight: "4px", paddingBottom: "10px", paddingLeft: "4px", fontSize: "13px", verticalAlign: "middle", textAlign: "center", fontWeight: 700 },
    imageColHeader: { width: "40px", paddingTop: "6px", paddingRight: "2px", paddingBottom: "8px", paddingLeft: "2px", verticalAlign: "middle", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center" },
    nameColHeader: { paddingTop: "8px", paddingRight: "4px", paddingBottom: "10px", paddingLeft: "4px", width: "auto", verticalAlign: "middle", textAlign: "center", fontSize: "13px" },
    approvalColHeader: { width: "60px", paddingTop: "8px", paddingRight: "0px", paddingBottom: "10px", paddingLeft: "0px", fontSize: "13px", verticalAlign: "middle", textAlign: "center", fontWeight: 700 },
    votesColHeader: { width: "64px", paddingTop: "8px", paddingRight: "0px", paddingBottom: "10px", paddingLeft: "0px", fontSize: "13px", verticalAlign: "middle", textAlign: "center", fontWeight: 700 },
    categoryNameCol: { paddingTop: "8px", paddingRight: "12px", paddingBottom: "8px", paddingLeft: "12px", width: "auto", verticalAlign: "middle", textAlign: "center" },
    categoryNameColHeader: { paddingTop: "8px", paddingRight: "4px", paddingBottom: "10px", paddingLeft: "4px", width: "auto", verticalAlign: "middle", textAlign: "center", fontSize: "13px" },
    categoryNameLink: { fontSize: "12px", wordBreak: "break-word", whiteSpace: "normal", lineHeight: "1.3", textAlign: "center" },
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
                            alt={`${q.contestant_name} thumbnail`}
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
                          {q.contestant_name.toUpperCase()}
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
                          {q.totalVotes} {q.totalVotes === 1 ? "vote" : "votes"}
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
                          {c.category.toUpperCase()}
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
                          {c.totalVotes} {c.totalVotes === 1 ? "vote" : "votes"}
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
    background: "rgba(255, 180, 150, 0.16)",
    border: "2px solid rgba(255, 180, 150, 0.35)",
    color: "#feefd0",
    fontWeight: 400,
    width: "20px",
    textAlign: "center",
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
    background: "#120902",
    color: "#feefd0",
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
    color: "#feefd0",
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
    color: "#facbb8",
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
    border: "2px solid rgba(255, 180, 150, 0.35)",
    background: "rgba(255, 195, 205, 0.12)",
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
    fontSize: "24px",
    color: "#feefd0",
  },
  rankColHeader: {
    width: "40px",
    paddingTop: "10px",
    paddingRight: "16px",
    paddingBottom: "16px",
    paddingLeft: "16px",
    fontWeight: 500,
    textAlign: "center",
    fontSize: "20px",
    fontStyle: "italic",
    color: "#facbb8",
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
    width: "300px",
  },
  nameColHeader: {
    paddingTop: "10px",
    paddingRight: "16px",
    paddingBottom: "16px",
    paddingLeft: "16px",
    textAlign: "center",
    width: "300px",
    fontSize: "20px",
    fontWeight: 500,
    fontStyle: "italic",
    color: "#facbb8",
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
    width: "394px",
    fontSize: "20px",
    fontWeight: 500,
    fontStyle: "italic",
    color: "#facbb8",
  },
  approvalCol: {
    width: "120px",
    paddingTop: "12px",
    paddingRight: "0px",
    paddingBottom: "12px",
    paddingLeft: "0px",
    textAlign: "center",
  },
  approvalColHeader: {
    width: "120px",
    paddingTop: "10px",
    paddingRight: "0px",
    paddingBottom: "16px",
    paddingLeft: "0px",
    textAlign: "center",
    fontSize: "20px",
    fontWeight: 500,
    fontStyle: "italic",
    color: "#facbb8",
  },
  votesCol: {
    width: "100px",
    paddingTop: "12px",
    paddingRight: "0px",
    paddingBottom: "12px",
    paddingLeft: "0px",
    textAlign: "center",
  },
  votesColHeader: {
    width: "100px",
    paddingTop: "10px",
    paddingRight: "0px",
    paddingBottom: "16px",
    paddingLeft: "0px",
    textAlign: "center",
    fontSize: "20px",
    fontWeight: 500,
    fontStyle: "italic",
    color: "#facbb8",
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
    color: "#feefd0",
    cursor: "pointer",
    textDecoration: "none",
    display: "inline-block",
  },
  categoryNameLink: {
    fontSize: "24px",
    fontWeight: 500,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "#feefd0",
    cursor: "pointer",
    textDecoration: "none",
    display: "inline-block",
    wordBreak: "break-word",
    maxWidth: "320px",
    lineHeight: "1.2",
    whiteSpace: "normal",
  },
  approvalBadge: {
     display: "inline-block",
     fontSize: "20px",
     paddingTop: "4px",
     paddingRight: "0px",
     paddingBottom: "4px",
     paddingLeft: "0px",
     borderRadius: "12px",
     background: "rgba(255, 180, 150, 0.16)",
    border: "2px solid rgba(255, 180, 150, 0.35)",
    color: "#feefd0",
     width: "76px",
     textAlign: "center",
  },
  votesBadge: {
    display: "inline-block",
    paddingTop: "4px",
    paddingRight: "10px",
    paddingBottom: "4px",
    paddingLeft: "10px",
    borderRadius: "10px",
   background: "rgba(255, 180, 150, 0.16)",
    border: "2px solid rgba(255, 180, 150, 0.35)",
    color: "#feefd0",
    width: "48px",
    fontSize: "12px",
    fontWeight: 200,
  },
  thumb: {
    width: 60,
    height: 60,
    borderRadius: 12,
    objectFit: "cover",
    background: "rgba(255, 180, 150, 0.2)",       // soft rose gold
    border: "2px solid rgba(255, 180, 150, 0.7)",
    flex: "0 0 auto",
  },
  headerRow: {
    borderBottom: "2px solid rgba(255, 180, 150, 0.23)",
  },
  paddingRow: {
    height: "8px", // ← Adjust this value to customize padding row height
  },
  sectionTitle: {
    fontSize: "24px",
    fontWeight: 500,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "#feefd0",
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
    color: "#facbb8",
    marginBottom: "12px",
    margin: "0 auto 12px auto",
  },
};
