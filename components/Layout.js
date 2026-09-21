// components/Layout.js
import React from "react";
import NavBar from "./NavBar";

export default function Layout({ children, seasonNav }) {
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth <= 1164);
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // The season navbar is a season-site component: it only renders when a page
  // explicitly supplies seasonNav (i.e. it lives within a resolved season site).
  const showNavBar = !!seasonNav;
  const theme = seasonNav?.theme || null;

  // Season theme values become CSS custom properties on the season-scoped
  // wrapper only; neutral (non-season) pages never receive them, and a future
  // nested appearance wrapper can still override these same variable names.
  const themeVars = theme
    ? {
        "--theme-page-background": theme.pageBackground,
        "--theme-ground-text-primary": theme.groundTextPrimary,
        "--theme-ground-text-secondary": theme.groundTextSecondary,
        "--theme-element-fill": theme.elementFill,
        "--theme-element-text-primary": theme.elementTextPrimary,
        "--theme-element-text-secondary": theme.elementTextSecondary,
        "--theme-stacked-element-fill": theme.stackedElementFill,
        "--theme-stacked-element-text": theme.stackedElementText,
        "--theme-element-border": theme.elementBorder,
        "--theme-active-toot-fill": theme.activeTootFill,
        "--theme-active-toot-text": theme.activeTootText,
        "--theme-active-boot-fill": theme.activeBootFill,
        "--theme-active-boot-text": theme.activeBootText,
      }
    : null;

  const pageStyle = themeVars
    ? {
        ...styles.page,
        ...themeVars,
        background: "var(--theme-page-background)",
        color: "var(--theme-ground-text-primary)",
      }
    : styles.pageNeutral;

  return (
    <div style={pageStyle}>
      {showNavBar && <NavBar seasonNav={seasonNav} />}
      <main style={showNavBar ? (isMobile ? { ...styles.main, ...styles.mainMobile } : styles.main) : styles.mainNoNav}>
        {children}
      </main>
    </div>
  );
}

// Navbar height breakdown:
// DESKTOP: 70px navbar (fixed height) + 12px top margin + 18px gap = 100px total
// MOBILE: navbar wraps content, so it's taller than 70px due to flexWrap: "wrap"
//         Approximate mobile navbar height: 110-130px (depends on content wrapping)
//         MOBILE_NAVBAR_TOP_PADDING is the adjustment setting you can modify
const MOBILE_NAVBAR_TOP_PADDING = "132px"; // Adjust this value to fine-tune mobile navbar spacing

const styles = {
  page: {
    minHeight: "100vh",
    width: "100%",
    margin: 0,
    overflowX: "hidden",
  },
  // Non-season pages (donaam.app root, /drag-race project pages, login/admin)
  // supply their own backgrounds; the shared wrapper stays neutral for them.
  pageNeutral: {
    minHeight: "100vh",
    width: "100%",
    margin: 0,
    overflowX: "hidden",
  },
  main: {
    paddingTop: "100px", // Desktop: 70px navbar (fixed height) + 12px top margin + 18px gap
  },
  mainMobile: {
    paddingTop: MOBILE_NAVBAR_TOP_PADDING, // Mobile: navbar wraps and is taller, adjust as needed
  },
  mainNoNav: {
    paddingTop: 0,
  },
};
