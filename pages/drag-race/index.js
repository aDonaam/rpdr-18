/**
 * pages/drag-race/index.js
 *
 * Drag Race Fashion Review project root.
 *
 * Lists valid seasons from the normalized franchises/seasons relationship
 * (never inferred from `looks`). Supplies no seasonNav, so the season navbar
 * does not render here - this page sits above any single season.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAvailableSeasons } from "../../lib/dragRaceProjectData";
import { seasonRoute } from "../../lib/routeHelpers";

export default function DragRaceProjectHome({ seasons }) {
  const [username, setUsername] = useState(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("rr_user");

      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setUsername(parsedUser?.username || null);
      }
    } catch {
      setUsername(null);
    }

    setIsHydrated(true);
  }, []);

  return (
    <div style={styles.page}>
      <main style={styles.content}>
        <h1 className="hub-title" style={styles.title}>
          DRAG RACE FASHION REVIEW
        </h1>

        <div className="hub-auth-area" style={styles.authArea}>
          {isHydrated &&
            (username ? (
              <div style={styles.loggedInGroup}>
                <span style={styles.loggedInText}>
                  Logged in as: <strong>{username}</strong>
                </span>

                <Link href="/logout" style={styles.button}>
                  Log out
                </Link>
              </div>
            ) : (
              <Link href="/login" style={styles.button}>
                Log in
              </Link>
            ))}
        </div>

        <div style={styles.hubArea}>
          <Link href="/" style={styles.button}>
            Return to domain hub
          </Link>
        </div>

        <section style={styles.seasons}>
          <h2 style={styles.sectionHeading}>Seasons</h2>

          {seasons.length === 0 ? (
            <p style={styles.empty}>No seasons available yet.</p>
          ) : (
            seasons.map((s) => (
              <Link
                key={`${s.franchiseSlug}-${s.seasonNumber}`}
                href={seasonRoute(s.franchiseSlug, s.seasonNumber)}
                style={styles.seasonLink}
              >
                {s.franchiseName} — Season {s.seasonNumber}
              </Link>
            ))
          )}
        </section>
      </main>
    </div>
  );
}

export async function getServerSideProps() {
  const seasons = await getAvailableSeasons();
  return { props: { seasons } };
}

const styles = {
  page: {
    minHeight: "100vh",
    padding: "56px 24px",
    background: "#0c0c0c",
    color: "#e7e7e7",
  },

  content: {
    width: "100%",
    maxWidth: "900px",
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
  },

  title: {
    margin: 0,
    height: "58px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "48px",
    lineHeight: 1,
    fontWeight: 800,
    letterSpacing: "0.04em",
  },

  hubArea: {
    marginTop: "24px",
    display: "flex",
    justifyContent: "center",
  },

  authArea: {
    minHeight: "44px",
    marginTop: "24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  loggedInGroup: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "14px",
    flexWrap: "wrap",
  },

  loggedInText: {
    fontSize: "24px",
  },

  button: {
    display: "inline-block",
    padding: "9px 18px",
    borderRadius: "8px",
    border: "1px solid #f2f0eb",
    background: "#202020",
    color: "#f2f0eb",
    textDecoration: "none",
    fontSize: "20px",
    fontWeight: 600,
  },

  seasons: {
    marginTop: "52px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "16px",
  },

  sectionHeading: {
    margin: 0,
    fontSize: "32px",
    fontWeight: 700,
  },

  seasonLink: {
    display: "inline-block",
    width: "fit-content",
    padding: "13px 20px",
    borderRadius: "8px",
    border: "1px solid #f2f0eb",
    background: "#202020",
    color: "#f2f0eb",
    textDecoration: "none",
    fontSize: "20px",
    fontWeight: 600,
  },

  empty: {
    margin: 0,
    fontSize: "20px",
    opacity: 0.8,
  },
};