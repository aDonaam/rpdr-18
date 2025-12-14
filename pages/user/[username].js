// pages/user/[username].js
import Papa from "papaparse";
import { useRouter } from "next/router";
import { csvUrl, LOOKS_GID, VOTES_GID } from "../../config";

function slugify(str) {
  return (str || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function UserRankingsPage({ username, rows }) {
  const router = useRouter();

  const title = username
    ? `${username}'s Season 18 Rankings`
    : "Season 18 Rankings";

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.title}>{title}</h1>
        <p style={styles.subtitle}>
          Queens are ranked only by <b>{username}</b>&apos;s votes across all
          looks.
        </p>
      </header>

      {rows.length === 0 && (
        <p style={styles.empty}>
          This user hasn&apos;t voted on any looks yet.
        </p>
      )}

      {rows.length > 0 && (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.rankCol}>Rank</th>
                <th style={styles.imageCol}>Queen</th>
                <th style={styles.nameCol}></th>
                <th style={styles.approvalCol}>User approval</th>
                <th style={styles.votesCol}>User votes</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((q) => (
                <tr key={q.queen} style={styles.row}>
                  <td style={styles.rankCol}>{q.rank}</td>

                  <td style={styles.imageCol}>
                    {q.image_url ? (
                      <img
                        src={q.image_url}
                        alt={q.queen}
                        style={styles.avatar}
                      />
                    ) : (
                      <div style={styles.avatarPlaceholder}>No image</div>
                    )}
                  </td>

                  <td style={styles.nameCol}>
                    <span
                      style={styles.nameLink}
                      onClick={() => router.push(`/queen/${q.slug}`)}
                    >
                      {q.queen.toUpperCase()}
                    </span>
                  </td>

                  <td style={styles.approvalCol}>
                    <span style={styles.approvalBadge}>{q.pct}%</span>
                  </td>

                  <td style={styles.votesCol}>
                    <span style={styles.votesBadge}>
                      {q.total} {q.total === 1 ? "vote" : "votes"}
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

export async function getServerSideProps(context) {
  const usernameParam = context.params?.username || "";
  const username = String(usernameParam).trim();

  // If somehow empty, just show an empty state
  if (!username) {
    return {
      props: {
        username: "",
        rows: [],
      },
    };
  }

  const looksUrl = csvUrl(LOOKS_GID);
  const votesUrl = csvUrl(VOTES_GID);

  const [looksRes, votesRes] = await Promise.all([
    fetch(looksUrl),
    fetch(votesUrl),
  ]);

  if (!looksRes.ok || !votesRes.ok) {
  return {
    props: {
      username,
      rows: [],
      // you can add an error message prop if you want to display it
    },
  };
}

  const looksText = await looksRes.text();
  const votesText = await votesRes.text();

  // --- parse LOOKS ---
  const looksParsed = Papa.parse(looksText, {
    header: true,
    skipEmptyLines: true,
  });

  const looks = (looksParsed.data || [])
    .filter((row) => row.look_id && row.queen && row.category)
    .map((row) => ({
      look_id: String(row.look_id).trim(),
      queen: String(row.queen).trim(),
      category: String(row.category).trim(),
      image_url: (row.image_url || "").trim(),
    }));

  const lookById = {};
  const queenInfo = {};

  looks.forEach((look) => {
    lookById[look.look_id] = look;
    if (!queenInfo[look.queen]) {
      queenInfo[look.queen] = {
        queen: look.queen,
        slug: slugify(look.queen),
        image_url: look.image_url,
      };
    }
  });

  // --- parse VOTES ---
  const votesParsed = Papa.parse(votesText, {
    header: true,
    skipEmptyLines: true,
  });
  const allVotes = votesParsed.data || [];

  // Filter votes for this username
  const targetUser = username.toLowerCase();

 const userVotes = allVotes.filter((row) => {
  const u = String(row.user || row.User || "").trim().toLowerCase();
  return u === targetUser;
});

  // Latest vote per look_id
  const latestByLook = {}; // look_id -> vote
  userVotes.forEach((row) => {
  const lookId = String(row.look_id || row.LOOK_ID || "").trim();
  const vote = String(row.vote || row.Vote || "").toUpperCase().trim();

  if (!lookId) return;
  if (vote !== "TOOT" && vote !== "BOOT") return;

  latestByLook[lookId] = vote; // later rows overwrite earlier ones
});


  // Aggregate to queen stats
  const queenStats = {}; // queen -> { queen, slug, image_url, toots, boots, total, pct }

  Object.entries(latestByLook).forEach(([lookId, vote]) => {
    const look = lookById[lookId];
    if (!look) return;

    const qName = look.queen;
    if (!queenStats[qName]) {
      const info = queenInfo[qName] || {
        queen: qName,
        slug: slugify(qName),
        image_url: "",
      };
      queenStats[qName] = {
        queen: info.queen,
        slug: info.slug,
        image_url: info.image_url,
        toots: 0,
        boots: 0,
        total: 0,
        pct: 0,
      };
    }

    const s = queenStats[qName];
    if (vote === "TOOT") s.toots += 1;
    if (vote === "BOOT") s.boots += 1;
    s.total += 1;
  });

  const rows = Object.values(queenStats);
  rows.forEach((s) => {
    if (s.total > 0) {
      s.pct = Math.round((s.toots / s.total) * 100);
    } else {
      s.pct = 0;
    }
  });

  // Sort + dense rank
  rows.sort((a, b) => {
    if (b.pct !== a.pct) return b.pct - a.pct;
    if (b.total !== a.total) return b.total - a.total;
    return a.queen.localeCompare(b.queen);
  });

  let lastPct = null;
  let currentRank = 0;
  rows.forEach((row, index) => {
    if (lastPct === null || row.pct !== lastPct) {
      currentRank = index + 1;
      lastPct = row.pct;
    }
    row.rank = currentRank;
  });

  return {
    props: {
      username,
      rows,
    },
  };
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#1a0f08",
    color: "#fdf4e3",
    padding: "24px",
  },
  header: {
    marginBottom: "16px",
  },
  title: {
    fontSize: "26px",
    fontWeight: 700,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    marginBottom: "6px",
  },
  subtitle: {
    fontSize: "14px",
    opacity: 0.9,
    maxWidth: "640px",
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
    width: "50px",
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
    fontSize: "24px",
    padding: "4px 10px",
    borderRadius: "12px",
    background: "rgba(255, 207, 122, 0.15)",
    border: "1px solid rgba(255, 207, 122, 0.6)",
  },
  votesBadge: {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: "10px",
    background: "rgba(117, 90, 54, 0.35)",
    border: "1px solid rgba(255, 255, 255, 0.12)",
    fontSize: "14px",
  },
};
