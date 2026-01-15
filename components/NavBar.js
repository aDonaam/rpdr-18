// components/NavBar.js
import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/router";

export default function NavBar() {
  const queensBtnRef = useRef(null);
  queensBtnRef.current = null;
  const queensMenuRef = useRef(null);
  queensMenuRef.current = null;
  const categoriesBtnRef = useRef(null);
  categoriesBtnRef.current = null;
  const categoriesMenuRef = useRef(null);
  categoriesMenuRef.current = null;
  // Always initialize as empty arrays to avoid undefined
  const [queens, setQueens] = useState(() => []);
  const [categories, setCategories] = useState(() => []);
  const [openMenu, setOpenMenu] = useState(null); // "queens" | "categories" | null
  const [user, setUser] = useState(null);
  // Mobile detection (CSR only)
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth <= 600);
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Only render dropdowns after queens/categories are loaded and valid
  const queensReady = Array.isArray(queens) && queens.length > 0 && queens.every(q => typeof q === "string");
  const categoriesReady = Array.isArray(categories) && categories.length > 0 && categories.every(c => typeof c === "string");

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

  useEffect(() => {
    if (typeof window === "undefined") return;

    const fetchOptions = async () => {
      // Fetch all contestant_name and categories from Supabase, including sequence
      const { data: looks, error } = await require("../lib/supabaseClient").supabase
        .from("looks")
        .select("contestant_name, category, sequence");
      // eslint-disable-next-line no-console
      console.log("[NavBar] Raw looks data:", looks);
      if (!error && looks) {
        // Unique contestant_name only, sorted alphabetically
        const qSet = new Set();
        looks.forEach(l => {
          if (l.contestant_name && typeof l.contestant_name === "string") {
            qSet.add(l.contestant_name);
          }
        });
        const q = Array.from(qSet).sort((a, b) => a.localeCompare(b));
        // For categories, get unique category names with their minimum sequence
        const catMap = {};
        looks.forEach(l => {
          if (!catMap[l.category] || l.sequence < catMap[l.category]) {
            catMap[l.category] = l.sequence;
          }
        });
        const c = Object.entries(catMap)
          .sort((a, b) => (a[1] ?? 99999) - (b[1] ?? 99999))
          .map(([cat]) => cat);
        // eslint-disable-next-line no-console
        console.log("[NavBar] queens (contestant_name):", q);
        console.log("[NavBar] categories (by sequence):", c);
        setQueens(q);
        setCategories(c);
      }
    };
    fetchOptions();
  }, []);


  function toggleMenu(name) {
    setOpenMenu((prev) => (prev === name ? null : name));
  }

  // Close dropdown on outside click
  useEffect(() => {
    if (!openMenu) return;
    function handleClick(e) {
      if (openMenu === "queens") {
        if (
          queensBtnRef.current && queensBtnRef.current.contains(e.target)
        ) return;
        if (
          queensMenuRef.current && queensMenuRef.current.contains(e.target)
        ) return;
      } else if (openMenu === "categories") {
        if (
          categoriesBtnRef.current && categoriesBtnRef.current.contains(e.target)
        ) return;
        if (
          categoriesMenuRef.current && categoriesMenuRef.current.contains(e.target)
        ) return;
      }
      closeMenu();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [openMenu]);

  function closeMenu() {
    setOpenMenu(null);
  }

  // Helper to merge base and mobile styles
  function mergeStyles(base, mobile) {
    if (!isMobile) return base;
    return { ...base, ...mobile };
  }

  // Mobile style overrides
  const mobileStyles = {
    header: { padding: "4px 8px 2px" },
    logoImg: { width: "120px" },
    title: { fontSize: "14px" },
    nav: { flexWrap: "wrap", gap: "10px", rowGap: "2px" },
    navLink: { fontSize: "12px", padding: "2px 6px" },
    navButton: { fontSize: "12px" },
    dropdownItem: { fontSize: "12px", padding: "4px 8px" },
    authBox: { fontSize: "11px" },
  };

  return (
    <header style={mergeStyles(styles.header, mobileStyles.header)}>
      <div style={styles.topRow}>
        <img
          src="/rpdr-18/brand/s18-logo.png"
          alt="Season 18 logo"
          style={mergeStyles(styles.logoImg, mobileStyles.logoImg)}
        />
        <h1 style={mergeStyles(styles.title, mobileStyles.title)}>Season 18 Runway Review</h1>
      </div>

      <nav style={mergeStyles(styles.nav, mobileStyles.nav)}>
        {/* HOME */}
        <Link href="/" style={mergeStyles(styles.navLink, mobileStyles.navLink)}>
          HOME
        </Link>

        <Link href="/looks" style={mergeStyles(styles.navLink, mobileStyles.navLink)}>ALL LOOKS</Link>

        {/* QUEENS DROPDOWN */}
        {queensReady && (
          <div style={styles.dropdownWrapper}>
            <button
              type="button"
              ref={queensBtnRef}
              style={{ ...mergeStyles(styles.navLink, mobileStyles.navLink), ...mergeStyles(styles.navButton, mobileStyles.navButton), display: "flex", alignItems: "center", gap: 4 }}
              onClick={() => toggleMenu("queens")}
            >
              <span>QUEENS</span>
              <span style={{ fontSize: isMobile ? 11 : 14, marginLeft: 2 }}>▾</span>
            </button>
            {openMenu === "queens" && (
              <div style={styles.dropdownMenu} ref={queensMenuRef}>
                {queens.map((q) => (
                  <Link
                    key={q}
                    href={`/queen/${slugify(q)}`}
                    style={mergeStyles(styles.dropdownItem, mobileStyles.dropdownItem)}
                    onClick={closeMenu}
                  >
                    {q}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* CATEGORIES DROPDOWN */}
        {categoriesReady && (
          <div style={styles.dropdownWrapper}>
            <button
              type="button"
              ref={categoriesBtnRef}
              style={{ ...mergeStyles(styles.navLink, mobileStyles.navLink), ...mergeStyles(styles.navButton, mobileStyles.navButton), display: "flex", alignItems: "center", gap: 4 }}
              onClick={() => toggleMenu("categories")}
            >
              <span>CATEGORIES</span>
              <span style={{ fontSize: isMobile ? 11 : 14, marginLeft: 2 }}>▾</span>
            </button>
            {openMenu === "categories" && (
              <div style={styles.dropdownMenu} ref={categoriesMenuRef}>
                {categories.map((c) => (
                  <Link
                    key={c}
                    href={`/category/${slugify(c)}`}
                    style={mergeStyles(styles.dropdownItem, mobileStyles.dropdownItem)}
                    onClick={closeMenu}
                  >
                    {c}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* USER */}
        {user ? (
          <Link
            href={`/user/${encodeURIComponent(user.username)}`}
            style={mergeStyles(styles.navLink, mobileStyles.navLink)}
          >
            {user.username}
          </Link>
        ) : (
          <Link href="/login" style={mergeStyles(styles.navLink, mobileStyles.navLink)}>
            Log in
          </Link>
        )}
      </nav>
      <div style={mergeStyles(styles.authBox, mobileStyles.authBox)}>
        {user ? (
          <>
            <span style={styles.authText}>Logged in as: {user.username}</span>
            <Link href="/logout" style={styles.authLink}>
              (log out)
            </Link>
          </>
        ) : (
          <Link href="/login" style={styles.authLink}>
            Log in with PIN
          </Link>
        )}
      </div>

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
    background: "rgb(54, 28, 4)",
    borderBottom: "1px solid rgba(255, 255, 255, 0.07)",
    zIndex: 1000,
  },
  topRow: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    marginBottom: "6px",
  },
  logoImg: {
    width: "240px",
    height: "auto",
    objectFit: "contain",
    display: "block",
    maxWidth: "100%",
  },

  title: {
    margin: 0,
    fontSize: "20px",
    fontWeight: 600,
    fontStyle: "italic",
    color: "#facbb8",
  },
  nav: {
    display: "flex",
    gap: "24px",
    alignItems: "center",
    justifyContent: "center",
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
  authBox: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    fontSize: "13px",
    opacity: 0.95,
    whiteSpace: "nowrap",
  },
  authText: {
    opacity: 0.9,
  },
  authLink: {
    color: "inherit",
    textDecoration: "none",
    cursor: "pointer",
    fontWeight: 600,
  },

};
