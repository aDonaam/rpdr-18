// components/NavBar.js
import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/router";

export default function NavBar() {
  const [queens, setQueens] = useState([]);
  const [categories, setCategories] = useState([]);
  const [openMenu, setOpenMenu] = useState(null);
  const [user, setUser] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  const queensBtnRef = useRef(null);
  const queensMenuRef = useRef(null);
  const categoriesBtnRef = useRef(null);
  const categoriesMenuRef = useRef(null);

  // Mobile detection
  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth <= 768);
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Ready states
  const queensReady = Array.isArray(queens) && queens.length > 0 && queens.every(q => typeof q === "string");
  const categoriesReady = Array.isArray(categories) && categories.length > 0 && categories.every(c => typeof c === "string");

  // User auth state
  useEffect(() => {
    const readUser = () => {
      if (typeof window === "undefined") return;
      const raw = window.localStorage.getItem("rr_user");
      setUser(raw ? JSON.parse(raw) : null);
    };

    readUser();
    window.addEventListener("storage", readUser);
    window.addEventListener("rr-auth-changed", readUser);

    return () => {
      window.removeEventListener("storage", readUser);
      window.removeEventListener("rr-auth-changed", readUser);
    };
  }, []);

  // Fetch queens and categories
  useEffect(() => {
    if (typeof window === "undefined") return;

    const fetchOptions = async () => {
      const { data: looks, error } = await require("../lib/supabaseClient").supabase
        .from("looks")
        .select("contestant_name, category, sequence");

      if (!error && looks) {
        // Unique queens, sorted alphabetically
        const qSet = new Set();
        looks.forEach(l => {
          if (l.contestant_name && typeof l.contestant_name === "string") {
            qSet.add(l.contestant_name);
          }
        });
        const q = Array.from(qSet).sort((a, b) => a.localeCompare(b));

        // Unique categories, sorted by sequence
        const catMap = {};
        looks.forEach(l => {
          if (!catMap[l.category] || l.sequence < catMap[l.category]) {
            catMap[l.category] = l.sequence;
          }
        });
        const c = Object.entries(catMap)
          .sort((a, b) => (a[1] ?? 99999) - (b[1] ?? 99999))
          .map(([cat]) => cat);

        setQueens(q);
        setCategories(c);
      }
    };

    fetchOptions();
  }, []);


  function toggleMenu(name) {
    setOpenMenu((prev) => (prev === name ? null : name));
  }

  const closeMenu = () => setOpenMenu(null);

  // Close menu on outside click
  useEffect(() => {
    if (!openMenu) return;

    function handleClick(e) {
      const isQueensOpen = openMenu === "queens";
      const isCategoriesOpen = openMenu === "categories";

      if (isQueensOpen) {
        if (queensBtnRef.current?.contains(e.target) || queensMenuRef.current?.contains(e.target)) {
          return;
        }
      } else if (isCategoriesOpen) {
        if (categoriesBtnRef.current?.contains(e.target) || categoriesMenuRef.current?.contains(e.target)) {
          return;
        }
      }

      setOpenMenu(null);
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [openMenu]);

  return (
    <>
      <div style={isMobile ? styles.gradientBackdropMobile : styles.gradientBackdrop} />
      <header style={isMobile ? styles.headerMobile : styles.header}>
        {/* Main nav bar */}
      <div style={isMobile ? styles.containerMobile : styles.container}>
        {/* Logo + Brand */}
        <div style={isMobile ? styles.brandMobile : styles.brand}>
          <img
            src="/rpdr-18/brand/s18-logo.png"
            alt="Season 18"
            style={isMobile ? styles.logoMobile : styles.logo}
          />
          <div style={isMobile ? styles.titleSectionMobile : styles.titleSection}>
            <div style={isMobile ? styles.seasonLabelMobile : styles.seasonLabel}>Season 18</div>
            <h1 style={isMobile ? styles.titleMobile : styles.title}>Runway Review</h1>
          </div>
        </div>

        {/* Main Navigation */}
        <nav style={isMobile ? styles.navMobile : styles.nav}>
          <Link href="/" style={isMobile ? { ...styles.navLink, ...styles.navLinkMobile } : styles.navLink}>
            Home
          </Link>

          <Link href="/looks" style={isMobile ? { ...styles.navLink, ...styles.navLinkMobile } : styles.navLink}>
            All Looks
          </Link>

          {/* Queens Dropdown */}
          {queensReady && (
            <div style={styles.dropdownWrapper}>
              <button
                type="button"
                ref={queensBtnRef}
                onClick={() => toggleMenu("queens")}
                style={{
                  ...styles.navLink,
                  ...(isMobile ? styles.navLinkMobile : {}),
                  ...styles.dropdownButton,
                  ...(openMenu === "queens" ? styles.dropdownButtonActive : {}),
                }}
              >
                Queens
                <span style={styles.dropdownArrow}>▼</span>
              </button>
              {openMenu === "queens" && (
                <div style={styles.dropdownMenu} ref={queensMenuRef}>
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
          )}

          {/* Categories Dropdown */}
          {categoriesReady && (
            <div style={styles.dropdownWrapper}>
              <button
                type="button"
                ref={categoriesBtnRef}
                onClick={() => toggleMenu("categories")}
                style={{
                  ...styles.navLink,
                  ...(isMobile ? styles.navLinkMobile : {}),
                  ...styles.dropdownButton,
                  ...(openMenu === "categories" ? styles.dropdownButtonActive : {}),
                }}
              >
                Categories
                <span style={styles.dropdownArrow}>▼</span>
              </button>
              {openMenu === "categories" && (
                <div style={isMobile ? { ...styles.dropdownMenu, ...styles.dropdownMenuMobile } : styles.dropdownMenu} ref={categoriesMenuRef}>
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
          )}

        </nav>

        {/* User Section */}
        <div style={isMobile ? { ...styles.userSection, ...styles.userSectionMobile } : styles.userSection}>
          {user ? (
            <>
              <Link
                href={`/user/${encodeURIComponent(user.username)}`}
                style={isMobile ? { ...styles.userLink, ...styles.userLinkMobile } : styles.userLink}
              >
                {user.username}
              </Link>
              <Link href="/logout" style={isMobile ? { ...styles.logoutLink, fontSize: "11px" } : styles.logoutLink}>
                Log out
              </Link>
            </>
          ) : (
            <Link href="/login" style={isMobile ? { ...styles.loginLink, fontSize: "12px", padding: "4px 10px" } : styles.loginLink}>
              Log in
            </Link>
          )}
        </div>
      </div>
      </header>
    </>
  );
}

function slugify(str) {
  return (str || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const styles = {
  // Header
  header: {
    position: "fixed",
    top: "12px",
    left: "24px",
    right: "24px",
    zIndex: 1001,
    background: "#2e1f1a",
    borderTop: "2px solid rgba(255, 180, 150, 0.35)",
    borderLeft: "2px solid rgba(255, 180, 150, 0.35)",
    borderRight: "2px solid rgba(255, 180, 150, 0.35)",
    borderBottom: "2px solid rgba(255, 180, 150, 0.35)",
    borderRadius: "16px",
    padding: 0,
    height: "70px",
    display: "flex",
    alignItems: "center",
    boxSizing: "border-box",
  },

  headerMobile: {
    position: "fixed",
    top: "12px",
    left: "10px",
    right: "10px",
    zIndex: 1001,
    background: "#2e1f1a",
    borderTop: "2px solid rgba(255, 180, 150, 0.35)",
    borderLeft: "2px solid rgba(255, 180, 150, 0.35)",
    borderRight: "2px solid rgba(255, 180, 150, 0.35)",
    borderBottom: "2px solid rgba(255, 180, 150, 0.35)",
    borderRadius: "16px",
    padding: 0,
    minHeight: "auto",
    display: "flex",
    alignItems: "flex-start",
    boxSizing: "border-box",
  },

  // Container layouts
  container: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    padding: "8px 16px",
    gap: "16px",
    position: "relative",
    boxSizing: "border-box",
  },

  containerMobile: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "flex-start",
    justifyContent: "space-between",
    width: "100%",
    padding: "4px 8px",
    gap: "1px",
    boxSizing: "border-box",
  },

  brand: {
    display: "flex",
    alignItems: "center",
    gap: "20px",
    minWidth: "fit-content",
    flex: "0 0 auto",
  },

  brandMobile: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    minWidth: "fit-content",
    flex: "0 0 100%",
    justifyContent: "center",
    marginBottom: "8px",
  },

  logo: {
    width: "120px",
    height: "auto",
    objectFit: "contain",
    display: "block",
  },

  logoMobile: {
    width: "90px",
    height: "auto",
    objectFit: "contain",
    display: "block",
  },

  titleSection: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },

  titleSectionMobile: {
    display: "flex",
    flexDirection: "column",
    gap: "0px",
  },

  seasonLabel: {
    fontSize: "12px",
    fontWeight: 600,
    color: "#facbb8",
    letterSpacing: "0.04em",
    textTransform: "uppercase",
  },

  seasonLabelMobile: {
    fontSize: "11px",
    fontWeight: 600,
    color: "#facbb8",
    letterSpacing: "0.04em",
    textTransform: "uppercase",
  },

  title: {
    margin: 0,
    fontSize: "18px",
    fontWeight: 600,
    color: "#feefd0",                                 // light gold text
    whiteSpace: "nowrap",
    lineHeight: 1,
  },

  titleMobile: {
    margin: 0,
    fontSize: "14px",
    fontWeight: 600,
    color: "#feefd0",                                 // light gold text
    whiteSpace: "nowrap",
    lineHeight: 1,
  },

  // Navigation
  nav: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    position: "absolute",
    left: "50%",
    transform: "translateX(-50%)",
  },

  navMobile: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "1px",
    flex: "0 0 100%",
    justifyContent: "center",
  },

  navLink: {
    fontSize: "20px",
    fontWeight: 400,
    letterSpacing: "0.06em",
    padding: "6px 18px",
    color: "#feefd0",                                 // light gold text
    textDecoration: "none",
    cursor: "pointer",
    transition: "all 0.2s ease",
    whiteSpace: "nowrap",
    border: "1px solid transparent",
    borderRadius: "4px",
    outline: "none",
  },

  navLinkMobile: {
    fontSize: "14px",
    fontWeight: 400,
    padding: "0px 10px",
  },

  dropdownButton: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    background: "transparent",
    outline: "none",
    border: "1px solid transparent",
    boxShadow: "none",
    cursor: "pointer",
    fontFamily: "inherit",
    fontWeight: 400,
    letterSpacing: "0.06em",
  },

  dropdownButtonActive: {
    background: "rgba(244, 194, 122, 0.15)",
    border: "1px solid rgba(244, 194, 122, 0.3)",
  },

  dropdownArrow: {
    fontSize: "11px",
    transition: "transform 0.2s ease",
    display: "inline-block",
  },

  dropdownWrapper: {
    position: "relative",
  },

  dropdownMenu: {
    position: "absolute",
    top: "calc(100% + 4px)",
    left: 0,
    minWidth: "160px",
    background: "#0f0804",
    border: "1px solid rgba(244, 194, 122, 0.2)",
    borderRadius: "6px",
    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.5)",
    zIndex: 1100,
    overflow: "hidden",
  },

  dropdownMenuMobile: {
    left: "auto",
    right: 0,
  },

  dropdownItem: {
    display: "block",
    padding: "6px 14px",
    color: "#feefd0",                                 // light gold text
    textDecoration: "none",
    fontSize: "14px",
    fontWeight: 300,
    letterSpacing: "0.06em",
    cursor: "pointer",
    transition: "background-color 0.15s ease",
    whiteSpace: "nowrap",
    fontFamily: "inherit",
  },

  // User section
  userSection: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginLeft: "auto",
    flex: "0 0 auto",
  },

  userSectionMobile: {
    marginLeft: "0",
    flex: "0 0 100%",
    gap: "4px",
    justifyContent: "center",
  },

  loginLink: {
    fontSize: "16px",
    fontWeight: 400,
    letterSpacing: "0.04em",
    padding: "6px 14px",
    color: "#facbb8",
    textDecoration: "none",
    cursor: "pointer",
    transition: "all 0.2s ease",
    whiteSpace: "nowrap",
  },

  logoutLink: {
    fontSize: "16px",
    fontWeight: 400,
    letterSpacing: "0.04em",
    color: "#facbb8",
    textDecoration: "none",
    cursor: "pointer",
    transition: "opacity 0.2s ease",
  },

  userLink: {
    fontSize: "20px",
    fontWeight: 400,
    letterSpacing: "0.06em",
    padding: "6px 18px",
    textDecoration: "none",
    cursor: "pointer",
    transition: "all 0.2s ease",
    whiteSpace: "nowrap",
    border: "1px solid transparent",
    borderRadius: "4px",
    outline: "none",
  },

  userLinkMobile: {
    fontSize: "14px",
    fontWeight: 400,
    padding: "0px 10px",
  },

  // Gradient backdrop behind navbar
  gradientBackdrop: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    height: "110px",
    background: "linear-gradient(to bottom, #120902 0%, #120902 83%, transparent 100%)",
    zIndex: 1000,
    pointerEvents: "none",
  },

  gradientBackdropMobile: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    height: "133px",
    background: "linear-gradient(to bottom, #120902 0%, #120902 90%, transparent 100%)",
    zIndex: 1000,
    pointerEvents: "none",
  },
};
