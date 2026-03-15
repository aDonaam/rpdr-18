import React, { useEffect } from "react";
import { useRouter } from "next/router";
import Layout from "../components/Layout";
import { oswald } from "../lib/fonts";
import "../styles/globals.css";

const scrollToTop = () => {
  // Ensure scroll happens immediately
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
  
  // Also ensure it happens after a brief delay to override any restoration
  setTimeout(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, 0);
};

export default function App({ Component, pageProps }) {
  const router = useRouter();

  useEffect(() => {
    // Scroll to top when route change completes and new page loads
    const handleRouteChangeComplete = () => {
      // Use requestAnimationFrame to ensure the DOM has updated before scrolling
      requestAnimationFrame(() => {
        scrollToTop();
      });
    };

    router.events.on("routeChangeComplete", handleRouteChangeComplete);

    return () => {
      router.events.off("routeChangeComplete", handleRouteChangeComplete);
    };
  }, [router]);

  return (
    <div className={oswald.className}>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </div>
  );
}
