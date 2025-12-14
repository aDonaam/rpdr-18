// components/NavBar.js
import React, { useState, useEffect } from "react";
import Link from "next/link";

export default function NavBar() {
  const [user, setUser] = useState(null);

  useEffect(() => {
  const readUser = () => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem("rr_user");
    setUser(raw ? JSON.parse(raw) : null);
  };

  readUser();

  // update when other tabs change auth
  window.addEventListener("storage", readUser);

  // update when this tab logs in/out
  window.addEventListener("rr-auth-changed", readUser);

  return () => {
    window.removeEventListener("storage", readUser);
    window.removeEventListener("rr-auth-changed", readUser);
  };
}, []);


  const [queens, setQueens] = useState([]);
  const [categories, setCategories] = useState([]);
  const [openMenu, setOpenMenu] = useState(null); // "queens" | "categories" | null

  useEffect(() => {
    if (typeof window === "undefined") return;

    const saved = window.localStorage.getItem("rr_user");
    if (saved) {
      setUser(JSON.parse(saved));
    }

    const raw = window.localStorage.getItem("rr_looks_cache");
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        const q = [...new Set(parsed.map((l) => l.queen))].sort();
        const c = [...new Set(parsed.map((l) => l.category))].sort();
        setQueens(q);
        setCategories(c);
      } catch {
        // ignore bad JSON
      }
    }
  }, []);

  function toggleMenu(name) {
    setOpenMenu((prev) => (prev === name ? null : name));
  }

  function closeMenu() {
    setOpenMenu(null);
  }

  return (
    <header style={styles.header}>
      <div style={styles.topRow}>
        <div style={styles.logo} />
        <h1 style={styles.title}>Season 18 Runway Review</h1>
      </div>

      <nav style={styles.nav}>
        {/* HOME */}
        <Link href="/" style={styles.navLink}>
  HOME
</Link>

        <Link href="/looks"style={styles.navLink}>ALL LOOKS</Link>


        {/* QUEENS DROPDOWN */}
        <div style={styles.dropdownWrapper}>
          <button
            type="button"
            style={styles.navButton}
            onClick={() => toggleMenu("queens")}
          >
            QUEENS ▾
          </button>
          {openMenu === "queens" && (
            <div style={styles.dropdownMenu}>
              {queens.map((q) => (
                <Link
                  key={q}
                  href={`/queen/${slugify(q)}`}
                  style={styles.dropdownItem}
                  onClick={closeMenu}
                >
                  {q}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* CATEGORIES DROPDOWN */}
        <div style={styles.dropdownWrapper}>
          <button
            type="button"
            style={styles.navButton}
            onClick={() => toggleMenu("categories")}
          >
            CATEGORIES ▾
          </button>
          {openMenu === "categories" && (
            <div style={styles.dropdownMenu}>
              {categories.map((c) => (
                <Link
                  key={c}
                  href={`/category/${slugify(c)}`}
                  style={styles.dropdownItem}
                  onClick={closeMenu}
                >
                  {c}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* USER */}
       {user ? (
  <Link
    href={`/user/${encodeURIComponent(user.username)}`}
    style={styles.navLink}
  >
    {user.username}
  </Link>
) : (
  <Link href="/login" style={styles.navLink}>
    Log in
  </Link>
)}
      </nav>
    </header>
  );
}

function slugify(str) {
  return (str || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const styles = {
  header: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    padding: "10px 24px 6px",
    background: "#311202ff",
    borderBottom: "1px solid rgba(255, 255, 255, 0.07)",
    zIndex: 1000,
  },
  topRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "6px",
  },
  logo: {
    width: "38px",
    height: "38px",
    borderRadius: "6px",
    background: "rgba(255, 255, 255, 0.1)",
  },
  title: {
    margin: 0,
    fontSize: "20px",
    fontWeight: 700,
  },
  nav: {
    display: "flex",
    gap: "24px",
    alignItems: "center",
  },
  disabledLink: {
    opacity: 0.5,
    cursor: "default",
    fontWeight: 500,
  },
  navLink: {
    fontSize: "16px",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    padding: "4px 10px",
    borderRadius: "999px",
    color: "#fef7e8",
    textDecoration: "none",
    cursor: "pointer",
    transition: "color 0.15s ease, background-color 0.15s ease",
  },
  dropdownWrapper: {
    position: "relative",
  },
  navButton: {
    background: "transparent",
    border: "none",
    padding: 0,
    fontSize: "16px",
    letterSpacing: "0.06em",
    color: "#fef7e8",
    fontWeight: 500,
    cursor: "pointer",
  },
  dropdownMenu: {
    position: "absolute",
    top: "100%",
    left: 0,
    marginTop: "4px",
    minWidth: "180px",
    maxHeight: "60vh",
    overflowY: "auto",
    background: "#20100a",
    borderRadius: "10px",
    border: "1px solid rgba(244, 194, 122, 0.5)",
    boxShadow: "0 10px 24px rgba(0, 0, 0, 0.7)",
    padding: "6px 0",
    zIndex: 1100,
  },
  dropdownItem: {
    display: "block",
    padding: "6px 12px",
    color: "#fef7e8",
    textDecoration: "none",
    fontSize: "14px",
    whiteSpace: "nowrap",
  },
};
