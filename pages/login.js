// pages/login.js
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";

export default function LoginPage() {
  const router = useRouter();
  const basePath = router.basePath || "";

  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  // Store refs to input elements to forcefully manage their styles
  const usernameInputRef = useRef(null);
  const pinInputRef = useRef(null);

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

  // Force correct input colors to override browser autofill on page refresh
  useEffect(() => {
    // Apply corrections immediately and repeatedly to beat autofill timing
    const applyFix = () => {
      const inputs = [usernameInputRef.current, pinInputRef.current];
      inputs.forEach((input) => {
        if (!input) return;
        
        // Force remove autofill styles by setting properties directly on the DOM
        input.style.backgroundColor = 'rgba(255, 195, 205, 0.12)';
        input.style.WebkitTextFillColor = '#feefd0';
        input.style.color = '#feefd0';
        input.style.borderColor = 'rgba(255, 180, 150, 0.35)';
        
        // Also reset the webkit autofill pseudo-element appearance by removing and re-adding the element
        input.style.webkitUserSelect = 'textfield';
      });
    };

    // Run immediately (synchronously after refs are set)
    applyFix();
    
    // Continue running at short intervals during component mount
    const timers = [];
    for (let i = 1; i <= 20; i++) {
      timers.push(setTimeout(applyFix, i * 25));
    }

    return () => timers.forEach(clearTimeout);
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setInfo("");

    try {
      setInfo("Logging in...");

      const res = await fetch(`${basePath}/api/rr-login`, {
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
              `${basePath}/api/user-votes?user_id=${encodeURIComponent(data.userId)}`
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


        // 3) redirect immediately (IMPORTANT: include basePath)
        window.location.replace(`${basePath}/user/${encodeURIComponent(data.username)}`);
        return;
      } else {
        setError(data.error || "Login failed. Please try again.");
        setInfo("");
        return;
      }
    } catch (err) {
      console.error("Login error", err);
      setInfo("");
      setError(err?.message || "Network error while logging in.");
    }
  }

  // ----- styles -----
  const containerStyle = {
    padding: "40px",
    maxWidth: "480px",
    margin: "40px auto",
    color: "#feefd0",
  };

  const inputStyle = {
    width: "100%",
    padding: "10px 14px",
    marginTop: "4px",
    marginBottom: "16px",
    borderRadius: "16px",
    border: "2px solid rgba(255, 180, 150, 0.35)",
    backgroundColor: "rgba(255, 195, 205, 0.12)",
    color: "#feefd0",
    outline: "none",
    fontSize: "14px",
    fontWeight: 400,
    letterSpacing: "0.04em",
    fontFamily: "inherit",
    textAlign: "left",
  };

  const buttonStyle = {
    padding: "8px 20px",
    borderRadius: "16px",
    border: "2px solid rgba(232, 202, 122, 1)",
    cursor: "pointer",
    backgroundColor: "rgba(232, 202, 122, 0.95)",
    color: "#241b05f1",
    fontWeight: 600,
    fontSize: "14px",
    letterSpacing: "0.04em",
    marginTop: "8px",
    fontFamily: "inherit",
  };

  const errorStyle = { color: "#f97373", marginTop: "8px" };
  const infoStyle = { color: "#a5f3fc", marginTop: "8px" };

  // ----- component render -----
  return (
    <div style={containerStyle}>
      <h1 style={{ fontSize: "24px", marginBottom: "12px" }}>Log in with PIN</h1>
      <p style={{ fontSize: "14px", lineHeight: 1.5, marginBottom: "24px" }}>
        Enter the username and PIN provided to you. If you don&apos;t have an
        account yet, please contact Andrew to be added to the project.
      </p>

      <form onSubmit={handleSubmit}>
        <label style={{ fontSize: "14px" }}>
          Username
          <input
            ref={usernameInputRef}
            style={inputStyle}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="off"
          />
        </label>

        <label style={{ fontSize: "14px" }}>
          PIN
          <input
            ref={pinInputRef}
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
