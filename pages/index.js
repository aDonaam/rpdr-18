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
    rankCol: { width: "28px", padding: "6px 4px", fontSize: "12px", verticalAlign: "middle", textAlign: "center" },
    imageCol: { width: "40px", padding: "4px 2px", verticalAlign: "middle", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center" },
    nameCol: { padding: "6px 4px", width: "auto", verticalAlign: "middle", textAlign: "center" },
    approvalCol: { width: "60px", padding: "6px 0px", fontSize: "12px", verticalAlign: "middle", textAlign: "center" },
    votesCol: { width: "50px", padding: "6px 0px", fontSize: "12px", verticalAlign: "middle", textAlign: "center" },
    nameLink: { fontSize: "13px", wordBreak: "break-word", whiteSpace: "normal", lineHeight: "1.2", textAlign: "center" },
    row: { height: "40px" },
    thumb: { width: 32, height: 32, borderRadius: 8 },
    avatarPlaceholder: { width: 32, height: 32, borderRadius: 8, fontSize: "8px" },
    approvalBadge: { fontSize: "13px", width: "44px", padding: "2px 0px" },
    votesBadge: { fontSize: "10px", width: "32px", padding: "2px 4px" },
    tableWrapper: { margin: "16px auto", width: "100%" },
    table: { width: "100%" },
  };

  function mergeStyles(base, mobile) {
    if (!isMobile) return base;
    return { ...base, ...mobile };
  }

  // Mobile page style override - reduce padding; minimize top spacing
  const mobilePageStyle = { paddingTop: "0px", paddingLeft: "10px", paddingRight: "10px", paddingBottom: "10px" };
  const mobileHeaderStyle = { paddingTop: "0px", marginBottom: "2px" };

  return (
    <div style={mergeStyles(styles.page, mobilePageStyle)}>
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
          <table style={mergeStyles(styles.table, mobileTableStyles.table)}>
            <thead>
              <tr>
                <th style={mergeStyles(styles.rankCol, mobileTableStyles.rankCol)}>Rank</th>
                <th style={mergeStyles(styles.imageCol, mobileTableStyles.imageCol)}></th>
                <th style={mergeStyles(styles.nameCol, mobileTableStyles.nameCol)}>Queen</th>
                <th style={mergeStyles(styles.approvalCol, mobileTableStyles.approvalCol)}>Approval</th>
                <th style={mergeStyles(styles.votesCol, mobileTableStyles.votesCol)}>Votes</th>
              </tr>
            </thead>
            <tbody>
              {initialLooks.map((q) => (
                <tr key={q.slug} style={mergeStyles(styles.row, mobileTableStyles.row)}>
                  <td style={mergeStyles(styles.rankCol, mobileTableStyles.rankCol)}>{q.rank}</td>
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
    color: "#fdf4e3",
    padding: "24px",
  },
  header: {
    marginBottom: "6px",
    paddingTop: "12px",
    textAlign: "center",
  },
  title: {
    fontSize: "26px",
    fontWeight: 700,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    marginBottom: "6px",
    textAlign: "center",
  },
  subtitle: {
    fontSize: "14px",
    opacity: 0.9,
    maxWidth: "640px",
    margin: "0 auto 18px auto",
    padding: 0,
    textAlign: "center",
  },
  empty: {
    fontSize: "14px",
    opacity: 0.9,
    marginTop: "16px",
  },
  tableWrapper: {
    marginTop: "16px",
    borderRadius: "10px",
    overflow: "hidden",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    background:
      "radial-gradient(circle at top, rgba(255,255,255,0.05), transparent 55%), #140a06",
    margin: "16px auto",
    width: "fit-content",
  },
  table: {
    borderCollapse: "collapse",
  },
  row: {
    borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
  },
  rankCol: {
    width: "40px",
    padding: "12px 16px",
    fontWeight: 700,
    textAlign: "center",
  },
  imageCol: {
    width: "80px",
    padding: "8px 8px",
    textAlign: "center",
  },
  nameCol: {
    padding: "12px 16px",
    textAlign: "center",
    width: "300px",
  },
  approvalCol: {
    width: "120px",
    padding: "12px 0px",
    textAlign: "center",
  },
  votesCol: {
    width: "100px",
    padding: "12px 0px",
    textAlign: "center",
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
    fontWeight: 700,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    color: "#fdf4e3",
    cursor: "pointer",
    textDecoration: "none",
    display: "inline-block",
  },
  approvalBadge: {
    display: "inline-block",
    fontSize: "20px",
    padding: "4px 0px",
    borderRadius: "12px",
    background: "rgba(255, 207, 122, 0.15)",
    border: "1px solid rgba(255, 207, 122, 0.6)",
    width: "76px", // Ensures enough space for '100%'
    textAlign: "center",
  },
  votesBadge: {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: "10px",
    background: "rgba(255, 207, 122, 0.15)",
    border: "1px solid rgba(255, 207, 122, 0.6)",
    fontSize: "12px",
    width: "48px"
  },
  approvalLabel: {
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    opacity: 0.9,
  },
  thumb: {
    width: 60,
    height: 60,
    borderRadius: 12,
    objectFit: "cover",
    background: "rgba(255, 207, 122, 0.15)",
    border: "2px solid rgba(255, 207, 122, 0.6)",
    flex: "0 0 auto",
  },

};
