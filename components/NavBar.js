// components/NavBar.js
import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  dragRaceHomeRoute,
  seasonRoute,
  seasonLooksRoute,
  seasonQueenRoute,
  seasonCategoryRoute,
  seasonUserRoute,
} from "../lib/routeHelpers";

const DEFAULT_SEASON_NUMBER = 18;

export default function NavBar({ seasonNav }) {
  const [openMenu, setOpenMenu] = useState(null);
  const [user, setUser] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  const queensBtnRef = useRef(null);
  const queensMenuRef = useRef(null);
  const categoriesBtnRef = useRef(null);
  const categoriesMenuRef = useRef(null);

  const franchiseSlug = seasonNav?.franchiseSlug || null;
  const seasonNumber = seasonNav?.seasonNumber ?? DEFAULT_SEASON_NUMBER;
  const queens = seasonNav?.queens || [];
  const categories = seasonNav?.categories || [];
  const logo = franchiseSlug
    ? { src: `/drag-race/${franchiseSlug}/${seasonNumber}/logo.png`, alt: `Season ${seasonNumber}` }
    : null;

  // Canonical destinations require a resolved franchise/season; pages that
  // don't supply seasonNav (e.g. login/admin) fall back to legacy routes.
  const homeHref = franchiseSlug ? seasonRoute(franchiseSlug, seasonNumber) : "/";
  const looksHref = franchiseSlug ? seasonLooksRoute(franchiseSlug, seasonNumber) : "/looks";
  const userHref = (username) =>
    franchiseSlug ? seasonUserRoute(franchiseSlug, seasonNumber, username) : `/user/${encodeURIComponent(username)}`;

  // Mobile detection
  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth <= 1164);
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Ready states
  const queensReady = queens.length > 0;
  const categoriesReady = categories.length > 0;

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
        {/* Logo + Brand (click navigates to the Drag Race project home) */}
        <Link href={dragRaceHomeRoute()} style={isMobile ? { ...styles.brandMobile, textDecoration: "none", cursor: "pointer" } : { ...styles.brand, textDecoration: "none", cursor: "pointer" }}>
          {logo && (
            <img
              src={logo.src}
              alt={logo.alt}
              style={isMobile ? styles.logoMobile : styles.logo}
            />
          )}
          <div style={isMobile ? styles.titleSectionMobile : styles.titleSection}>
            <div style={isMobile ? styles.seasonLabelMobile : styles.seasonLabel}>Season {seasonNumber}</div>
            <h1 style={isMobile ? styles.titleMobile : styles.title}>Runway Review</h1>
          </div>
        </Link>

        {/* Main Navigation */}
        <nav style={isMobile ? styles.navMobile : styles.nav}>
          <Link href={homeHref} style={isMobile ? { ...styles.navLink, ...styles.navLinkMobile } : styles.navLink}>
            Home
          </Link>

          <Link href={looksHref} style={isMobile ? { ...styles.navLink, ...styles.navLinkMobile } : styles.navLink}>
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
                }}
              >
                Queens
                <span style={styles.dropdownArrow}>▼</span>
              </button>
              {openMenu === "queens" && (
                <div style={styles.dropdownMenu} ref={queensMenuRef}>
                  {queens.map((q) => (
                    <Link
                      key={q.slug}
                      href={franchiseSlug ? seasonQueenRoute(franchiseSlug, seasonNumber, q.slug) : `/queen/${q.slug}`}
                      style={styles.dropdownItem}
                      onClick={closeMenu}
                    >
                      {q.displayName}
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
                }}
              >
                Categories
                <span style={styles.dropdownArrow}>▼</span>
              </button>
              {openMenu === "categories" && (
                <div style={isMobile ? { ...styles.dropdownMenu, ...styles.dropdownMenuMobile } : styles.dropdownMenu} ref={categoriesMenuRef}>
                  {categories.map((c) => (
                    <Link
                      key={c.slug}
                      href={franchiseSlug ? seasonCategoryRoute(franchiseSlug, seasonNumber, c.slug) : `/category/${c.slug}`}
                      style={styles.dropdownItem}
                      onClick={closeMenu}
                    >
                      {c.displayName}
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
                href={userHref(user.username)}
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

const styles = {
  // Header
  header: {
    position: "fixed",
    top: "12px",
    left: "24px",
    right: "24px",
    zIndex: 1001,
    background: "var(--theme-element-fill)",
    borderTop: "2px solid var(--theme-element-border)",
    borderLeft: "2px solid var(--theme-element-border)",
    borderRight: "2px solid var(--theme-element-border)",
    borderBottom: "2px solid var(--theme-element-border)",
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
    background: "var(--theme-element-fill)",
    borderTop: "2px solid var(--theme-element-border)",
    borderLeft: "2px solid var(--theme-element-border)",
    borderRight: "2px solid var(--theme-element-border)",
    borderBottom: "2px solid var(--theme-element-border)",
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
    color: "var(--theme-element-text-secondary)",
    letterSpacing: "0.04em",
    textTransform: "uppercase",
  },

  seasonLabelMobile: {
    fontSize: "11px",
    fontWeight: 600,
    color: "var(--theme-element-text-secondary)",
    letterSpacing: "0.04em",
    textTransform: "uppercase",
  },

  title: {
    margin: 0,
    fontSize: "18px",
    fontWeight: 600,
    color: "var(--theme-element-text-primary)",
    whiteSpace: "nowrap",
    lineHeight: 1,
  },

  titleMobile: {
    margin: 0,
    fontSize: "14px",
    fontWeight: 600,
    color: "var(--theme-element-text-primary)",
    whiteSpace: "nowrap",
    lineHeight: 1,
  },

  // Navigation
  nav: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
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
    color: "var(--theme-element-text-primary)",
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
    background: "var(--theme-page-background)",
    border: "1px solid var(--theme-element-border)",
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
    padding: "4px 14px",
    color: "var(--theme-ground-text-primary)",
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
    color: "var(--theme-element-text-secondary)",
    textDecoration: "none",
    cursor: "pointer",
    transition: "all 0.2s ease",
    whiteSpace: "nowrap",
  },

  logoutLink: {
    fontSize: "16px",
    fontWeight: 400,
    letterSpacing: "0.04em",
    color: "var(--theme-element-text-secondary)",
    textDecoration: "none",
    cursor: "pointer",
    transition: "opacity 0.2s ease",
  },

  userLink: {
    fontSize: "20px",
    fontWeight: 400,
    letterSpacing: "0.06em",
    padding: "6px 18px",
    color: "var(--theme-element-text-primary)",
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
    background: "linear-gradient(to bottom, var(--theme-page-background) 0%, var(--theme-page-background) 83%, transparent 100%)",
    zIndex: 1000,
    pointerEvents: "none",
  },

  gradientBackdropMobile: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    height: "133px",
    background: "linear-gradient(to bottom, var(--theme-page-background) 0%, var(--theme-page-background) 90%, transparent 100%)",
    zIndex: 1000,
    pointerEvents: "none",
  },
};
