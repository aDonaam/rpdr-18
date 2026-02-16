import Layout from "../components/Layout";
import { oswald } from "../lib/fonts";
import "../styles/globals.css";

export default function App({ Component, pageProps }) {
  return (
    <div className={oswald.className}>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </div>
  );
}
