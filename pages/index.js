import Papa from "papaparse";
import { csvUrl, LOOKS_GID, VOTES_GID } from "../config";
import { useRouter } from "next/router";


function slugify(str) {
  return (str || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Build “latest vote per (look_id, user)” from raw Votes rows
function buildLatestVotes(votesRaw) {
  const latestByKey = {}; // key = `${lookId}::${user}`

  (votesRaw || []).forEach((row) => {
    const lookId = String(row.look_id || "").trim();
    const user = String(row.user || "").trim();
    const vote = String(row.vote || "").toUpperCase().trim();

    if (!lookId || !user) return;
    if (vote !== "TOOT" && vote !== "BOOT") return;

    const key = `${lookId}::${user}`;
    // Because rows are appended, later rows overwrite earlier ones
    latestByKey[key] = { lookId, user, vote };
  });

  return Object.values(latestByKey);
}

// Aggregate approval per queen
function buildQueenStats(looks, latestVotes) {
  // Map look_id -> look (to know which queen each vote belongs to)
  const lookById = {};
  looks.forEach((look) => {
    lookById[look.look_id] = look;
  });

  const queenStats = {}; // queenName -> stats object

  latestVotes.forEach(({ lookId, vote }) => {
    const look = lookById[lookId];
    if (!look) return;

    const qName = look.queen;
    if (!queenStats[qName]) {
      queenStats[qName] = {
        queen: qName,
        slug: slugify(qName),
        // Use the first look's image as thumbnail for now
        image_url: look.image_url || "",
        toot: 0,
        total: 0,
      };
    }

    const stats = queenStats[qName];
    stats.total += 1;
    if (vote === "TOOT") stats.toot += 1;
  });

  // Convert to list + compute pct + totalVotes
  const queenRows = Object.values(queenStats).map((q) => {
    const pct =
      q.total > 0 ? Math.round((q.toot / q.total) * 100) : null;

    return {
      queen: q.queen,
      slug: q.slug,
      image_url: q.image_url,
      approvalPct: pct,
      totalVotes: q.total,
    };
  });

  // Sort by approval % desc, then totalVotes desc, then name asc
  queenRows.sort((a, b) => {
    const pa = a.approvalPct ?? -1;
    const pb = b.approvalPct ?? -1;
    if (pb !== pa) return pb - pa;

    if (b.totalVotes !== a.totalVotes) {
      return b.totalVotes - a.totalVotes;
    }

    return a.queen.localeCompare(b.queen);
  });

  // Dense ranking: 1,2,2,3,...
  let currentRank = 0;
  let lastPct = null;

  queenRows.forEach((row, idx) => {
    if (row.approvalPct !== lastPct) {
      currentRank = idx + 1;
      lastPct = row.approvalPct;
    }
    row.rank = currentRank;
  });

  return queenRows;
}

export default function Home({ queens }) {
  const router = useRouter();
  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.title}>
          Season 18 Queens Public Approval Leaderboard
        </h1>
      </header>

      <p style={styles.subtitle}>
        Rankings are based on all toot/boot votes across every look,
        using only each user&apos;s most recent vote per look.
      </p>

      <div style={styles.list}>
        {queens.map((q) => (
          <div key={q.slug} style={styles.row}>
            {/* Rank */}
            <div style={styles.rankBox}>
              <span style={styles.rankText}>#{q.rank}</span>
            </div>

            {/* Thumbnail */}
            <div style={styles.thumbBox}>
              {q.image_url ? (
                <img
                  src={q.image_url}
                  alt={q.queen}
                  style={styles.thumbImage}
                />
              ) : (
                <div style={styles.thumbPlaceholder}>No image</div>
              )}
            </div>

            {/* Name (links to queen page) */}
            <div style={styles.nameBox}>
                <span
    style={styles.nameLink}
    onClick={() => router.push(`/queen/${q.slug}`)}
  >
    {q.queen.toUpperCase()}
  </span>
            </div>

            {/* Public approval + total votes */}
            <div style={styles.statsBox}>
              {q.approvalPct != null ? (
                <>
                  <div style={styles.approvalPct}>
                    {q.approvalPct}%
                  </div>
                </>
              ) : (
                <div style={styles.approvalLabel}>no votes yet</div>
              )}

              <div style={styles.totalVotes}>
                {q.totalVotes}{" "}
                {q.totalVotes === 1 ? "vote" : "votes"}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Server-side: fetch Looks + Votes and compute queen rows
export async function getServerSideProps() {
  const looksUrl = csvUrl(LOOKS_GID);
  const votesUrl = csvUrl(VOTES_GID);

  const [looksRes, votesRes] = await Promise.all([
    fetch(looksUrl),
    fetch(votesUrl),
  ]);

  const looksText = await looksRes.text();
  const votesText = await votesRes.text();

  const looksResult = Papa.parse(looksText, {
    header: true,
    skipEmptyLines: true,
  });

  const votesResult = Papa.parse(votesText, {
    header: true,
    skipEmptyLines: true,
  });

  const looks = (looksResult.data || [])
    .filter((row) => row.look_id && row.queen && row.category)
    .map((row) => ({
      look_id: String(row.look_id).trim(),
      queen: String(row.queen).trim(),
      category: String(row.category).trim(),
      image_url: (row.image_url || "").trim(),
    }));

  const votes = (votesResult.data || []).filter(
    (row) => row.look_id && row.user && row.vote
  );

  const latestVotes = buildLatestVotes(votes);
  const queens = buildQueenStats(looks, latestVotes);

  return {
    props: { queens },
  };
}

const styles = {
  page: {
    // Layout padding/background comes from Layout.js
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: "8px",
  },
  title: {
    fontSize: "26px",
    fontWeight: 700,
  },
  subtitle: {
    fontSize: "14px",
    opacity: 0.85,
    marginBottom: "18px",
    maxWidth: "620px",
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  row: {
    display: "grid",
    gridTemplateColumns: "70px 80px 1fr 160px",
    alignItems: "center",
    gap: "12px",
    padding: "10px 14px",
    borderRadius: "16px",
    background: "rgba(0, 0, 0, 0.25)", // tweak to match your card color
    border: "1px solid rgba(255, 255, 255, 0.07)",
  },
  rankBox: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  rankText: {
    fontSize: "24px",
    fontWeight: 700,
  },
  thumbBox: {
    width: "70px",
    height: "70px",
    borderRadius: "12px",
    overflow: "hidden",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    background: "rgba(0,0,0,0.3)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  thumbImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },
  thumbPlaceholder: {
    fontSize: "10px",
    opacity: 0.7,
    textAlign: "center",
    padding: "4px",
  },
  nameBox: {
    padding: "0 4px",
  },
  nameLink: {
    fontSize: "24px",
    fontWeight: 700,
    letterSpacing: "0.05em",
  },
  statsBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: "2px",
  },
  approvalPct: {
    fontSize: "20px",
    fontWeight: 700,
  },
  approvalLabel: {
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    opacity: 0.9,
  },
  totalVotes: {
    marginTop: "4px",
    fontSize: "11px",
    opacity: 0.85,
  },
};
