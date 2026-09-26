/**
 * pages/index.js
 *
 * donaam platform root.
 *
 * Intentionally season-neutral: lists available projects and provides
 * platform-level login/logout access. This page supplies no seasonNav,
 * so the Drag Race season navbar does not render here.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { dragRaceHomeRoute } from "../lib/routeHelpers";

export default function DonaamHome() {
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
          DONAAM.APP DOMAIN HUB
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

        <section style={styles.projects}>
          <h2 style={styles.sectionHeading}>Projects</h2>

          <Link href={dragRaceHomeRoute()} style={styles.projectLink}>
            Drag Race Fashion Review
          </Link>
        </section>
      </main>
    </div>
  );
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
    border: "2px solid #f2f0eb",
    background: "#202020",
    color: "#f2f0eb",
    textDecoration: "none",
    fontSize: "20px",
    fontWeight: 600,
  },

  projects: {
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

  projectLink: {
    display: "inline-block",
    width: "fit-content",
    padding: "13px 20px",
    borderRadius: "8px",
    border: "2px solid #f2f0eb",
    background: "#202020",
    color: "#f2f0eb",
    textDecoration: "none",
    fontSize: "20px",
    fontWeight: 600,
  },
};