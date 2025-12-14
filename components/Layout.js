// components/Layout.js
import NavBar from "./NavBar";

export default function Layout({ children }) {
  return (
    <div style={styles.page}>
      <NavBar />
      <main style={styles.main}>{children}</main>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    width: "100%",          // use normal document flow
    margin: 0,
   background: "#120902",  // bronze-brown
    color: "#fef7e8",
    fontFamily:
      "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    overflowX: "hidden",    // belt-and-suspenders to kill horizontal scroll
  },
  main: {
    padding: "110px 0 0 0", // only top padding for navbar clearance
  },
};
