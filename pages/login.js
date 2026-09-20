// pages/login.js
import { useState, useEffect } from "react";
import Link from "next/link";

export default function LoginPage() {

  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState(
    "Logging in will route you to the domain hub page."
  );

  // If user already saved, pre-fill username
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("rr_user");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed?.username) setUsername(parsed.username);
      } catch {
        // ignore bad JSON
      }
    }
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    try {
      setInfo("Logging in...");

      const res = await fetch(`/api/rr-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, pin }),
      });

      const ct = res.headers.get("content-type") || "";
      const text = await res.text();

      if (!ct.includes("application/json")) {
        throw new Error(`Login API returned non-JSON (${res.status}). Got: ${text.slice(0, 80)}...`);
      }

      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`Login API returned invalid JSON. Got: ${text.slice(0, 80)}...`);
      }


      if (data.success) {
        // 1) save login state
        window.localStorage.setItem(
          "rr_user",
          JSON.stringify({ username: data.username, userId: data.userId })
        );
        window.dispatchEvent(new Event("rr-auth-changed"));

        // 2) fire-and-forget vote rehydration (DON'T await)
        (async () => {
          try {
            const r = await fetch(
              `/api/user-votes?user_id=${encodeURIComponent(data.userId)}`
            );

            const ct2 = r.headers.get("content-type") || "";
            const t2 = await r.text();
            if (!ct2.includes("application/json")) {
              console.error("user-votes returned non-JSON:", r.status, t2.slice(0, 120));
              return;
            }

            const j = JSON.parse(t2);
            if (j?.success && j.votes) {
              window.localStorage.setItem(`rr_votes_${data.username}`, JSON.stringify(j.votes));
            }
          } catch (e) {
            console.error("vote rehydrate failed", e);
          }
        })();


        // 3) redirect to the platform root (no contextual return-to-origin yet)
        window.location.replace("/");
        return;
      } else {
        setError(data.error || "Login failed. Please try again.");
        setInfo("Logging in will route you to the domain hub page.");
        return;
      }
    } catch (err) {
      console.error("Login error", err);
      setInfo("Logging in will route you to the domain hub page.");
      setError(err?.message || "Network error while logging in.");
    }
  }

  // ----- styles -----
  const pageStyle = {
    minHeight: "100vh",
    padding: "56px 24px",
    background: "#0c0c0c",
    color: "#e7e7e7",
  };

  const contentStyle = {
    width: "100%",
    maxWidth: "900px",
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
  };

  const titleStyle = {
    margin: 0,
    height: "58px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "48px",
    lineHeight: 1,
    fontWeight: 800,
    letterSpacing: "0.04em",
  };

  const descriptionStyle = {
    maxWidth: "560px",
    margin: "32px 0 0",
    fontSize: "18px",
    lineHeight: 1.5,
  };

  const formStyle = {
    width: "100%",
    maxWidth: "420px",
    marginTop: "32px",
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    textAlign: "left",
  };

  const labelStyle = {
    fontSize: "20px",
    fontWeight: 600,
  };

  const inputStyle = {
    boxSizing: "border-box",
    width: "100%",
    padding: "12px 14px",
    marginTop: "8px",
    marginBottom: "20px",
    borderRadius: "8px",
    border: "1px solid #f2f0eb",
    backgroundColor: "#202020",
    color: "#f2f0eb",
    outline: "none",
    fontSize: "18px",
    fontWeight: 400,
    fontFamily: "inherit",
    textAlign: "left",
  };

  const buttonStyle = {
    alignSelf: "center",
    padding: "9px 18px",
    borderRadius: "8px",
    border: "1px solid #f2f0eb",
    cursor: "pointer",
    backgroundColor: "#202020",
    color: "#f2f0eb",
    fontWeight: 600,
    fontSize: "20px",
    fontFamily: "inherit",
  };

  const returnLinkStyle = {
    display: "inline-block",
    marginTop: "32px",
    padding: "9px 18px",
    borderRadius: "8px",
    border: "1px solid #f2f0eb",
    background: "#202020",
    color: "#f2f0eb",
    textDecoration: "none",
    fontSize: "20px",
    fontWeight: 600,
  };

  const errorStyle = {
    color: "#f97373",
    marginTop: "16px",
    textAlign: "center",
  };

  const infoStyle = {
    color: "#e7e7e7",
    marginTop: "16px",
    textAlign: "center",
  };

  // ----- component render -----
  return (
    <div style={pageStyle}>
      <main style={contentStyle}>
        <h1 className="hub-title" style={titleStyle}>
          LOG IN TO DONAAM.APP
        </h1>

        <p style={descriptionStyle}>
          Enter the username and PIN provided to you. If you don&apos;t have an
          account yet, please contact Andrew to be added.
        </p>

        <form onSubmit={handleSubmit} style={formStyle}>
          <label style={labelStyle}>
            Username
            <input
              className="donaam-login-input"
              style={inputStyle}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="off"
            />
          </label>

          <label style={labelStyle}>
            PIN
            <input
              className="donaam-login-input"
              style={inputStyle}
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              autoComplete="off"
            />
          </label>

          <button type="submit" style={buttonStyle}>
            Log in
          </button>

          {error && <div style={errorStyle}>{error}</div>}
          {info && <div style={infoStyle}>{info}</div>}
        </form>

        <Link href="/" style={returnLinkStyle}>
          Return to domain hub
        </Link>
      </main>
    </div>
  );
}