/**
 * components/SeasonHome.js
 *
 * Shared presentation component for season homepage leaderboards.
 * Used by both:
 * - pages/index.js (temporary S18)
 * - pages/drag-race/[franchise]/[season]/index.js (canonical)
 *
 * Accepts season title as prop to remain dynamic.
 * All styling uses original large/spacious design from pages/index.js.
 */

import React from "react";
import { useRouter } from "next/router";
import { seasonQueenRoute, seasonCategoryRoute, seasonUserRoute } from "../lib/routeHelpers";
import { getQueenImagePath } from "../lib/queenImagePath";

function slugify(str) {
  return (str || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function SeasonHome({ initialLooks, initialCategories, initialUsers, seasonTitle, franchiseSlug, seasonNumber }) {
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
    rankBadge: { display: "inline-block", fontSize: "13px", paddingTop: "4px", paddingRight: "4px", paddingBottom: "4px", paddingLeft: "4px", borderRadius: "8px", background: "var(--theme-stacked-element-fill)", border: "2px solid var(--theme-element-border)", color: "var(--theme-stacked-element-text)", fontWeight: 600, width: "14px", textAlign: "center" },
    imageCol: { width: "40px", paddingTop: "7px", paddingRight: "2px", paddingBottom: "5px", paddingLeft: "2px", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center" },
    nameCol: { paddingTop: "6px", paddingRight: "4px", paddingBottom: "6px", paddingLeft: "4px", width: "auto", verticalAlign: "middle", textAlign: "center" },
    approvalCol: { width: "60px", paddingTop: "6px", paddingRight: "0px", paddingBottom: "6px", paddingLeft: "0px", fontSize: "12px", verticalAlign: "middle", textAlign: "center" },
    votesCol: { width: "64px", paddingTop: "6px", paddingRight: "0px", paddingBottom: "6px", paddingLeft: "0px", fontSize: "12px", verticalAlign: "middle", textAlign: "center" },
    nameLink: { fontSize: "13px", wordBreak: "break-word", whiteSpace: "normal", lineHeight: "1.2", textAlign: "center" },
    userNameLink: { fontSize: "13px", wordBreak: "break-word", whiteSpace: "normal", lineHeight: "1.2", textAlign: "center" },
    row: { height: "40px" },
    categoryNameCol: { paddingTop: "8px", paddingRight: "12px", paddingBottom: "8px", paddingLeft: "12px", width: "auto", verticalAlign: "middle", textAlign: "center" },
    categoryNameLink: { fontSize: "12px", wordBreak: "break-word", whiteSpace: "normal", lineHeight: "1.3", textAlign: "center" },
    thumb: { width: 32, height: 32, borderRadius: 8 },
    userBiasThumb: { width: 32, height: 32, borderRadius: 7 },
    userRow: { height: "40px" },
    avatarPlaceholder: { width: 32, height: 32, borderRadius: 8, fontSize: "8px" },
    approvalBadge: { fontSize: "13px", width: "44px", paddingTop: "2px", paddingRight: "0px", paddingBottom: "2px", paddingLeft: "0px", borderRadius: "8px" },
    votesBadge: { fontSize: "10px", width: "32px", paddingTop: "2px", paddingRight: "4px", paddingBottom: "2px", paddingLeft: "4px", borderRadius: "8px" },
    rankColHeader: { width: "28px", paddingTop: "8px", paddingRight: "4px", paddingBottom: "10px", paddingLeft: "4px", fontSize: "13px", verticalAlign: "middle", textAlign: "center", fontWeight: 700 },
    imageColHeader: { width: "40px", paddingTop: "6px", paddingRight: "2px", paddingBottom: "8px", paddingLeft: "2px", verticalAlign: "middle", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center" },
    nameColHeader: { paddingTop: "8px", paddingRight: "4px", paddingBottom: "10px", paddingLeft: "4px", width: "auto", verticalAlign: "middle", textAlign: "center", fontSize: "13px" },
    userNameColHeader: { paddingTop: "8px", paddingRight: "4px", paddingBottom: "10px", paddingLeft: "4px", width: "auto", verticalAlign: "middle", textAlign: "center", fontSize: "13px" },
    biasColHeader: { width: "52px", paddingTop: "8px", paddingRight: "2px", paddingBottom: "8px", paddingLeft: "2px", verticalAlign: "middle", textAlign: "center", fontSize: "13px", fontWeight: 700 },
    approvalColHeader: { width: "60px", paddingTop: "8px", paddingRight: "0px", paddingBottom: "10px", paddingLeft: "0px", fontSize: "13px", verticalAlign: "middle", textAlign: "center", fontWeight: 700 },
    votesColHeader: { width: "64px", paddingTop: "8px", paddingRight: "0px", paddingBottom: "10px", paddingLeft: "0px", fontSize: "13px", verticalAlign: "middle", textAlign: "center", fontWeight: 700 },
    userVotesBadge: { fontSize: "13px", width: "auto", paddingTop: "2px", paddingRight: "4px", paddingBottom: "2px", paddingLeft: "4px", borderRadius: "8px" },
    tableWrapper: { margin: "16px auto", width: "98%" },
    table: { width: "100%" },
    categoryNameColHeader: { paddingTop: "8px", paddingRight: "4px", paddingBottom: "10px", paddingLeft: "4px", width: "auto", verticalAlign: "middle", textAlign: "center", fontSize: "13px" },
    userNameCol: { paddingTop: "6px", paddingRight: "4px", paddingBottom: "6px", paddingLeft: "4px", width: "auto", verticalAlign: "middle", textAlign: "center" },
    biasCol: { width: "52px", paddingTop: "6px", paddingRight: "2px", paddingBottom: "6px", paddingLeft: "2px", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center" },
    paddingRow: { height: "8px" },
  };

  function mergeStyles(base, mobile) {
    if (!isMobile) return base;
    return { ...base, ...mobile };
  }

  // Mobile page style override
  const mobilePageStyle = { paddingTop: "8px", paddingLeft: "10px", paddingRight: "10px", paddingBottom: "10px" };
  const mobileHeaderStyle = { paddingTop: "0px", marginBottom: "2px" };

  return (
    <div suppressHydrationWarning style={mergeStyles(styles.page, mobilePageStyle)}>
      <header style={mergeStyles(styles.header, mobileHeaderStyle)}>
        <h1 style={styles.title}>
          {seasonTitle}
        </h1>
      </header>
      <p style={styles.subtitle}>
        Click on any queen, category, or user to see more detailed stats and associated looks.
      </p>

      <div style={mergeStyles(styles.leaderboardsContainer, isMobile ? styles.leaderboardsContainerMobile : {})}>
        {/* Queens Leaderboard */}
        <div style={mergeStyles(styles.leaderboardSection, isMobile ? styles.leaderboardSectionMobile : {})}>
          <h2 style={styles.sectionTitle}>Queens Leaderboard
          </h2>
          <p style={styles.sectionSubtitle}>Queens ranked by approval percentage across all votes from all users</p>
          {initialLooks.length === 0 && (
            <p style={styles.empty}>
              No votes have been cast yet.
            </p>
          )}
          {initialLooks.length > 0 && (
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
                  {initialLooks.map((q) => (
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
          <h2 style={styles.sectionTitle}>Categories Leaderboard
          </h2>
          <p style={styles.sectionSubtitle}>Categories ranked by approval percentage across all votes from all users</p>
          {initialCategories.length === 0 && (
            <p style={styles.empty}>
              No categories yet.
            </p>
          )}
          {initialCategories.length > 0 && (
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
                  {initialCategories.map((c) => (
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

        {/* Users Leaderboard */}
        <div style={mergeStyles(styles.leaderboardSection, isMobile ? styles.leaderboardSectionMobile : {})}>
          <h2 style={styles.sectionTitle}>Users Panel</h2>
          <p style={styles.sectionSubtitle}>All users who have ranked looks this season</p>
          {initialUsers.length === 0 && (
            <p style={styles.empty}>
              No users yet.
            </p>
          )}
          {initialUsers.length > 0 && (
            <div style={mergeStyles(styles.tableWrapper, mobileTableStyles.tableWrapper)}>
              <table suppressHydrationWarning style={mergeStyles(styles.table, mobileTableStyles.table)}>
                <thead>
                  <tr style={styles.headerRow}>
                    <th style={mergeStyles(styles.votesColHeader, mobileTableStyles.votesColHeader)}>Votes</th>
                    <th style={mergeStyles(styles.userNameColHeader, mobileTableStyles.userNameColHeader)}>Username</th>
                    <th style={mergeStyles(styles.approvalColHeader, mobileTableStyles.approvalColHeader)}>Approval</th>
                    <th style={mergeStyles(styles.biasColHeader, mobileTableStyles.biasColHeader)}>Bias</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={mergeStyles(styles.paddingRow, mobileTableStyles.paddingRow)}>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                  </tr>
                  {initialUsers.map((user) => (
                    <tr key={user.user_id} style={mergeStyles(styles.userRow, mobileTableStyles.userRow)}>
                      <td style={mergeStyles(styles.userVotesCol, mobileTableStyles.votesCol)}>
                        <span style={mergeStyles(styles.userVotesBadge, mobileTableStyles.votesBadge)}>
                          {user.totalVotes} {user.totalVotes === 1 ? "vote" : "votes"}
                        </span>
                      </td>
                      <td style={mergeStyles(styles.userNameCol, mobileTableStyles.userNameCol)}>
                        <span
                          style={mergeStyles(styles.userNameLink, mobileTableStyles.userNameLink)}
                          onClick={() => franchiseSlug && router.push(seasonUserRoute(franchiseSlug, seasonNumber, user.username))}
                        >
                          {user.username}
                        </span>
                      </td>
                      <td style={mergeStyles(styles.approvalCol, mobileTableStyles.approvalCol)}>
                        {user.approvalPct != null ? (
                          <span style={mergeStyles(styles.approvalBadge, mobileTableStyles.approvalBadge)}>
                            {user.approvalPct.toFixed(1)}%
                          </span>
                        ) : (
                          <span style={styles.approvalLabel}>no votes yet</span>
                        )}
                      </td>
                      <td style={mergeStyles(styles.biasCol, mobileTableStyles.biasCol)}>
                        {user.favorite_queen ? (() => {
                          const favoriteQueenData = initialLooks.find((q) => q.slug === user.favorite_queen);
                          const imagePath = favoriteQueenData?.image_path || null;
                          const queenSlug = favoriteQueenData?.slug || user.favorite_queen;
                          return (
                            <img
                              src={getQueenImagePath(imagePath, queenSlug, "")}
                              alt={`${favoriteQueenData?.appearanceDisplayName || user.favorite_queen} thumbnail`}
                              style={mergeStyles(styles.userBiasThumb, mobileTableStyles.userBiasThumb)}
                              onError={(e) => {
                                e.currentTarget.src = `/thumbnails/queens/_default.jpg`;
                              }}
                            />
                          );
                        })() : (
                          <div style={mergeStyles(styles.avatarPlaceholder, mobileTableStyles.avatarPlaceholder)}>No fave</div>
                        )}
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

// Shared styling (original large/spacious design from pages/index.js)
const styles = {
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
    textTransform: "uppercase",
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
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  biasColHeader: {
    width: "80px",
    paddingTop: "10px",
    paddingRight: "8px",
    paddingBottom: "16px",
    paddingLeft: "8px",
    textAlign: "center",
    fontSize: "20px",
    fontWeight: 500,
    fontStyle: "italic",
    color: "var(--theme-element-text-secondary)",
  },
  biasCol: {
    width: "80px",
    paddingTop: "7px",
    paddingRight: "8px",
    paddingBottom: "7px",
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
  userNameCol: {
    paddingTop: "8px",
    paddingRight: "16px",
    paddingBottom: "8px",
    paddingLeft: "16px",
    textAlign: "center",
    width: "328px",
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
    color: "var(--theme-element-text-secondary)",
  },
  userNameColHeader: {
    paddingTop: "10px",
    paddingRight: "16px",
    paddingBottom: "16px",
    paddingLeft: "16px",
    textAlign: "center",
    width: "328px",
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
    width: "394px",
    fontSize: "20px",
    fontWeight: 500,
    fontStyle: "italic",
    color: "var(--theme-element-text-secondary)",
  },
  approvalCol: {
    width: "120px",
    paddingTop: "8px",
    paddingRight: "0px",
    paddingBottom: "8px",
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
    color: "var(--theme-element-text-secondary)",
  },
  votesCol: {
    width: "100px",
    paddingTop: "12px",
    paddingRight: "0px",
    paddingBottom: "12px",
    paddingLeft: "0px",
    textAlign: "center",
  },
  userVotesCol: {
    width: "140px",
    paddingTop: "8px",
    paddingRight: "0px",
    paddingBottom: "8px",
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
    fontSize: "24px",
    fontWeight: 500,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "var(--theme-element-text-primary)",
    cursor: "pointer",
    textDecoration: "none",
    display: "inline-block",
  },
  userNameLink: {
    fontSize: "24px",
    fontWeight: 500,
    letterSpacing: "0.08em",
    color: "var(--theme-element-text-primary)",
    cursor: "pointer",
    textDecoration: "none",
    display: "inline-block",
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
    background: "var(--theme-stacked-element-fill)",
    border: "2px solid var(--theme-element-border)",
    color: "var(--theme-stacked-element-text)",
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
    background: "var(--theme-stacked-element-fill)",
    border: "2px solid var(--theme-element-border)",
    color: "var(--theme-stacked-element-text)",
    fontSize: "12px",
    fontWeight: 200,
    width: "48px"
  },
  userVotesBadge: {
    display: "inline-block",
    paddingTop: "4px",
    paddingRight: "12px",
    paddingBottom: "4px",
    paddingLeft: "12px",
    borderRadius: "10px",
    background: "var(--theme-stacked-element-fill)",
    border: "2px solid var(--theme-element-border)",
    color: "var(--theme-stacked-element-text)",
    fontSize: "16px",
    fontWeight: 200,
    width: "auto"
  },
  rankBadge: {
    display: "inline-block",
    fontSize: "20px",
    paddingTop: "4px",
    paddingRight: "8px",
    paddingBottom: "4px",
    paddingLeft: "8px",
    borderRadius: "12px",
    background: "var(--theme-stacked-element-fill)",
    border: "2px solid var(--theme-element-border)",
    color: "var(--theme-stacked-element-text)",
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
  thumb: {
    width: 60,
    height: 60,
    borderRadius: 12,
    objectFit: "cover",
    background: "var(--theme-stacked-element-fill)",
    border: "2px solid var(--theme-element-border)",
    flex: "0 0 auto",
  },
  userBiasThumb: {
    width: 45,
    height: 45,
    borderRadius: 10,
    objectFit: "cover",
    background: "var(--theme-stacked-element-fill)",
    border: "2px solid var(--theme-element-border)",
    flex: "0 0 auto",
  },
  userRow: {
    height: "44px",
  },
  headerRow: {
    borderBottom: "2px solid var(--theme-element-border)",
  },
  paddingRow: {
    height: "8px",
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
