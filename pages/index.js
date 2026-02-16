import React from "react";
import { useRouter } from "next/router";
import { supabaseAdmin } from "../lib/supabaseAdmin";

function slugify(str) {
  return (str || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function queenThumbSrc(contestant_name, basePath = "") {
  return `${basePath}/thumbnails/queens/${slugify(contestant_name)}.png`;
}

export default function Home({ initialLooks }) {
  const router = useRouter();
  const basePath = router.basePath || "";
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
    imageCol: { width: "40px", paddingTop: "6px", paddingRight: "2px", paddingBottom: "6px", paddingLeft: "2px", verticalAlign: "middle", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center" },
    nameCol: { paddingTop: "6px", paddingRight: "4px", paddingBottom: "6px", paddingLeft: "4px", width: "auto", verticalAlign: "middle", textAlign: "center" },
    approvalCol: { width: "60px", paddingTop: "6px", paddingRight: "0px", paddingBottom: "6px", paddingLeft: "0px", fontSize: "12px", verticalAlign: "middle", textAlign: "center" },
    votesCol: { width: "50px", paddingTop: "6px", paddingRight: "0px", paddingBottom: "6px", paddingLeft: "0px", fontSize: "12px", verticalAlign: "middle", textAlign: "center" },
    nameLink: { fontSize: "13px", wordBreak: "break-word", whiteSpace: "normal", lineHeight: "1.2", textAlign: "center" },
    row: { height: "40px" },
    thumb: { width: 32, height: 32, borderRadius: 8 },
    avatarPlaceholder: { width: 32, height: 32, borderRadius: 8, fontSize: "8px" },
    approvalBadge: { fontSize: "13px", width: "44px", paddingTop: "2px", paddingRight: "0px", paddingBottom: "2px", paddingLeft: "0px", borderRadius: "8px" },
    votesBadge: { fontSize: "10px", width: "32px", paddingTop: "2px", paddingRight: "4px", paddingBottom: "2px", paddingLeft: "4px", borderRadius: "8px" },
    rankColHeader: { width: "28px", paddingTop: "8px", paddingRight: "4px", paddingBottom: "8px", paddingLeft: "4px", fontSize: "13px", verticalAlign: "middle", textAlign: "center", fontWeight: 700 },
    imageColHeader: { width: "40px", paddingTop: "6px", paddingRight: "2px", paddingBottom: "6px", paddingLeft: "2px", verticalAlign: "middle", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center" },
    nameColHeader: { paddingTop: "8px", paddingRight: "4px", paddingBottom: "8px", paddingLeft: "4px", width: "auto", verticalAlign: "middle", textAlign: "center", fontSize: "13px" },
    approvalColHeader: { width: "60px", paddingTop: "8px", paddingRight: "0px", paddingBottom: "8px", paddingLeft: "0px", fontSize: "13px", verticalAlign: "middle", textAlign: "center", fontWeight: 700 },
    votesColHeader: { width: "50px", paddingTop: "8px", paddingRight: "0px", paddingBottom: "8px", paddingLeft: "0px", fontSize: "13px", verticalAlign: "middle", textAlign: "center", fontWeight: 700 },
    tableWrapper: { margin: "16px auto" },
    table: { width: "100%" },
  };

  function mergeStyles(base, mobile) {
    if (!isMobile) return base;
    return { ...base, ...mobile };
  }

  // Mobile page style override - reduce padding; minimize top spacing
  const mobilePageStyle = { paddingTop: "8px", paddingLeft: "10px", paddingRight: "10px", paddingBottom: "10px" };
  const mobileHeaderStyle = { paddingTop: "0px", marginBottom: "2px" };

  return (
    <div suppressHydrationWarning style={mergeStyles(styles.page, mobilePageStyle)}>
      <header style={mergeStyles(styles.header, mobileHeaderStyle)}>
        <h1 style={styles.title}>
          Public Leaderboard
        </h1>
      </header>
      <p style={styles.subtitle}>
        Queens are ranked by all votes across all looks.
      </p>
      {initialLooks.length === 0 && (
        <p style={styles.empty}>
          No votes have been cast yet.
        </p>
      )}
      {initialLooks.length > 0 && (
        <div style={mergeStyles(styles.tableWrapper, mobileTableStyles.tableWrapper)}>
          <table suppressHydrationWarning style={mergeStyles(styles.table, mobileTableStyles.table)}>
            <thead>
              <tr>
                <th style={mergeStyles(styles.rankColHeader, mobileTableStyles.rankColHeader)}>Rank</th>
                <th style={mergeStyles(styles.imageColHeader, mobileTableStyles.imageColHeader)}></th>
                <th style={mergeStyles(styles.nameColHeader, mobileTableStyles.nameColHeader)}>Queen</th>
                <th style={mergeStyles(styles.approvalColHeader, mobileTableStyles.approvalColHeader)}>Approval</th>
                <th style={mergeStyles(styles.votesColHeader, mobileTableStyles.votesColHeader)}>Votes</th>
              </tr>
            </thead>
            <tbody>
              {initialLooks.map((q) => (
                <tr key={q.slug} style={mergeStyles(styles.row, mobileTableStyles.row)}>
                  <td style={mergeStyles(styles.rankCol, mobileTableStyles.rankCol)} className="rank-cell">
                    <span style={mergeStyles(styles.rankBadge, mobileTableStyles.rankBadge)}>{q.rank}</span>
                  </td>
                  <td style={mergeStyles(styles.imageCol, mobileTableStyles.imageCol)}>
                    {q.image_url ? (
                      <img
                        src={queenThumbSrc(q.contestant_name, basePath)}
                        alt={`${q.display_name || q.contestant_name} thumbnail`}
                        style={mergeStyles(styles.thumb, mobileTableStyles.thumb)}
                        onError={(e) => {
                          e.currentTarget.src = `${basePath}/thumbnails/queens/_default.jpg`;
                        }}
                      />
                    ) : (
                      <div style={mergeStyles(styles.avatarPlaceholder, mobileTableStyles.avatarPlaceholder)}>No image</div>
                    )}
                  </td>
                  <td style={mergeStyles(styles.nameCol, mobileTableStyles.nameCol)}>
                    <span
                      style={mergeStyles(styles.nameLink, mobileTableStyles.nameLink)}
                      onClick={() => router.push(`/queen/${q.slug}`)}
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
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export async function getServerSideProps() {
  // 1) Fetch looks (use id — the uuid primary key)
  const { data: looks, error: looksError } = await supabaseAdmin
    .from("looks")
    .select("id, display_name, contestant_name, category, sequence, image_url");

  if (looksError || !looks) {
    console.error("looksError:", looksError);
    return { props: { initialLooks: [] } };
  }

  // 2) Fetch votes (look_uuid is FK -> looks.id)
  const { data: votes, error: votesError } = await supabaseAdmin
    .from("votes")
    .select("look_uuid, user_id, vote, updated_at");

  if (votesError || !votes) {
    console.error("votesError:", votesError);
    return { props: { initialLooks: [] } };
  }

  // 3) Map looks by their uuid id
  const lookByUuid = {};
  const queenInfo = {};

  for (const look of looks) {
    const lookUuid = String(look.id || "").trim(); // ✅ KEY CHANGE
    if (!lookUuid) continue;

    lookByUuid[lookUuid] = look;

    if (!queenInfo[look.contestant_name]) {
      queenInfo[look.contestant_name] = {
        contestant_name: look.contestant_name,
        display_name: look.display_name,
        slug: slugify(look.contestant_name),
        image_url: look.image_url,
      };
    }
  }

  // 4) Latest vote per (look_uuid, user_id)
  const latestVoteByLookUser = {};
  for (const v of votes) {
    const lookUuid = String(v.look_uuid || "").trim(); // this is looks.id
    const userId = String(v.user_id || "").trim();
    const vote = String(v.vote || "").toUpperCase().trim();
    if (!lookUuid || !userId) continue;
    if (vote !== "TOOT" && vote !== "BOOT") continue;

    const key = `${lookUuid}::${userId}`;
    const prev = latestVoteByLookUser[key];

    if (!prev || new Date(v.updated_at) > new Date(prev.updated_at)) {
      latestVoteByLookUser[key] = { lookUuid, vote, updated_at: v.updated_at };
    }
  }

  // 5) Initialize queen stats
  const queenStats = {};
  Object.values(queenInfo).forEach((info) => {
    queenStats[info.contestant_name] = {
      ...info,
      toots: 0,
      boots: 0,
      totalVotes: 0,
      approvalPct: null,
    };
  });

  // 6) Aggregate votes -> queen using lookByUuid[lookUuid]
  for (const key in latestVoteByLookUser) {
    const { lookUuid, vote } = latestVoteByLookUser[key];
    const look = lookByUuid[lookUuid]; // ✅ now this resolves
    if (!look) continue;

    const s = queenStats[look.contestant_name];
    if (!s) continue;

    if (vote === "TOOT") s.toots += 1;
    if (vote === "BOOT") s.boots += 1;
    s.totalVotes += 1;
  }

  // 7) Compute approval
  const rows = Object.values(queenStats).map((s) => {
    if (s.totalVotes > 0) {
      return { ...s, approvalPct: (s.toots / s.totalVotes) * 100 };
    }
    return { ...s, approvalPct: null };
  });

  // 8) Sort + dense rank
  rows.sort((a, b) => {
    if ((b.approvalPct ?? -1) !== (a.approvalPct ?? -1))
      return (b.approvalPct ?? -1) - (a.approvalPct ?? -1);
    if (b.totalVotes !== a.totalVotes) return b.totalVotes - a.totalVotes;
    return (a.display_name || a.contestant_name || "").localeCompare(
      b.display_name || b.contestant_name || ""
    );
  });

  let lastPct = null;
  let currentRank = 0;
  rows.forEach((row, index) => {
    const pctKey = row.approvalPct == null ? null : row.approvalPct.toFixed(6);
    if (index === 0 || pctKey !== lastPct) {
      currentRank = index + 1;
      lastPct = pctKey;
    }
    row.rank = currentRank;
  });

  return { props: { initialLooks: rows } };
}


const styles = {
  page: {
    minHeight: "100vh",
    background: "#120902", // match global background
    color: "#feefd0",                                 // light gold text
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
    maxWidth: "640px",
    margin: "0 auto 18px auto",
    padding: "12px 0",
    textAlign: "center",
    color: "#facbb8",
  },
  empty: {
    fontSize: "14px",
    opacity: 0.9,
    marginTop: "16px",
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
    paddingBottom: "8px",
    paddingLeft: "16px",
    fontWeight: 500,
    textAlign: "center",
    fontSize: "20px",
    fontStyle: "italic",
    color: "#feefd0",
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
    paddingBottom: "10px",
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
    paddingBottom: "8px",
    paddingLeft: "16px",
    textAlign: "center",
    width: "300px",
    fontSize: "20px",
    fontWeight: 500,
    fontStyle: "italic",
    color: "#feefd0",
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
    paddingBottom: "8px",
    paddingLeft: "0px",
    textAlign: "center",
    fontSize: "20px",
    fontWeight: 500,
    fontStyle: "italic",
    color: "#feefd0",
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
    paddingBottom: "8px",
    paddingLeft: "0px",
    textAlign: "center",
    fontSize: "20px",
    fontWeight: 500,
    fontStyle: "italic",
    color: "#feefd0",
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
    color: "#feefd0",                                 // light gold text
    cursor: "pointer",
    textDecoration: "none",
    display: "inline-block",
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
    fontSize: "12px",
    fontWeight: 200,
    width: "48px"
  },
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
  thumb: {
    width: 60,
    height: 60,
    borderRadius: 12,
    objectFit: "cover",
    background: "rgba(255, 180, 150, 0.16)",      // soft rose gold
    border: "2px solid rgba(255, 180, 150, 0.7)",
    flex: "0 0 auto",
  },

};
