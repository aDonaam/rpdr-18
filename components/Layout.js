// components/Layout.js
import React from "react";
import NavBar from "./NavBar";

export default function Layout({ children }) {
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth <= 1164);
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div style={styles.page}>
      <NavBar />
      <main style={isMobile ? { ...styles.main, ...styles.mainMobile } : styles.main}>
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
    background: "#120902",
    color: "#feefd0",
    overflowX: "hidden",
  },
  main: {
    paddingTop: "100px", // Desktop: 70px navbar (fixed height) + 12px top margin + 18px gap
  },
  mainMobile: {
    paddingTop: MOBILE_NAVBAR_TOP_PADDING, // Mobile: navbar wraps and is taller, adjust as needed
  },
};
