// pages/login.js
import { useState, useEffect } from "react";
import { useRouter } from "next/router";


export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwuGx0sBkvJMjP7cAmpT3uagpsTb6BT0i7Yqw0dLA2iq86Oh2ubSVxghIHSuE8gnB8A2Q/exec";


  // If user already saved, pre-fill username
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("rr_user");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.username) {
          setUsername(parsed.username);
        }
      } catch (e) {
        // ignore bad JSON
      }
    }
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setInfo("");

    try {
      const res = await fetch(`${router.basePath}/api/rr-login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username, pin }),
});

      const data = await res.json();

      if (!data.success) {
        setError(data.error || "Login failed.");
        return;
      }

      if (typeof window !== "undefined") {
        localStorage.setItem(
          "rr_user",
          JSON.stringify({ username: data.username })
        );
        window.dispatchEvent(new Event("rr-auth-changed"));

        try {
          const url = `${SCRIPT_URL}?action=getUserVotes&user=${encodeURIComponent(username)}`;
          const res = await fetch(url);
          const data = await res.json();

          if (data && data.success && data.votes) {
            const key = `rr_votes_${username}`;
            window.localStorage.setItem(key, JSON.stringify(data.votes));
          }
        } catch (err) {
          console.error("Failed to fetch user votes", err);
        }
      }

      setInfo("Logged in successfully. Redirecting...");
      window.location.href = `/rpdr-18/user/${encodeURIComponent(username)}`;


      setTimeout(() => {
        router.push("/");
      }, 800);
    } catch (err) {
      console.error(err);
      setError("Network error while logging in.");
    }
  }


  const containerStyle = {
    padding: "40px",
    maxWidth: "480px",
    margin: "40px auto",
    color: "#fff",
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  };

  const inputStyle = {
    width: "100%",
    padding: "10px 12px",
    marginTop: "4px",
    marginBottom: "16px",
    borderRadius: "999px",
    border: "1px solid #555",
    backgroundColor: "#1b1228",
    color: "#fff",
    outline: "none",
  };

  const buttonStyle = {
    padding: "10px 20px",
    borderRadius: "999px",
    border: "none",
    cursor: "pointer",
    backgroundColor: "#4ade80",
    fontWeight: 600,
  };

  const errorStyle = { color: "#f97373", marginTop: "8px" };
  const infoStyle = { color: "#a5f3fc", marginTop: "8px" };

  return (
    <div style={containerStyle}>
      <h1 style={{ fontSize: "24px", marginBottom: "12px" }}>Log in with PIN</h1>
      <p style={{ fontSize: "14px", lineHeight: 1.5, marginBottom: "24px" }}>
        Enter the username and PIN provided to you.
        If you don&apos;t have an account yet, please contact Andrew to be added
        to the project.
      </p>


      <form onSubmit={handleSubmit}>
        <label style={{ fontSize: "14px" }}>
          Username
          <input
            style={inputStyle}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="off"
          />
        </label>

        <label style={{ fontSize: "14px" }}>
          PIN
          <input
            style={inputStyle}
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            autoComplete="off"
          />
        </label>

        <button type="submit" style={buttonStyle}>
          Continue
        </button>

        {error && <div style={errorStyle}>{error}</div>}
        {info && <div style={infoStyle}>{info}</div>}
      </form>
    </div>
  );
}
