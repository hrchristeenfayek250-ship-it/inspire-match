"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [inviteToken, setInviteToken] = useState("");
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("invite") || "";
    setInviteToken(token);
  }, []);

  const inviteDestination = inviteToken
    ? "/app/accept-invite?token=" + encodeURIComponent(inviteToken)
    : "/app/dashboard";

  async function handleSubmit(event) {
    event.preventDefault();
    if (loading) return;

    setLoading(true);
    setNotice("");
    setError("");

    try {
      if (mode === "signup") {
        // Direct company self-service signup is disabled. This UI only
        // supports new HR team members who arrived via an invitation link.
        if (!inviteToken) throw new Error("A company invitation is required to create an account.");
        const { data, error: signupError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (signupError) throw signupError;
        if (data?.session) {
          router.replace(inviteDestination);
          router.refresh();
        } else {
          setMode("login");
          setNotice(
            "Your account request was received. Confirm your email if asked, then sign in and return to your invitation to join the workspace."
          );
        }
        return;
      }

      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (loginError) throw loginError;
      router.replace(inviteDestination);
      router.refresh();
    } catch (err) {
      setError(err?.message || "Could not complete your request. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{
      minHeight: "100vh", display: "grid", placeItems: "center",
      padding: "28px 18px", background: "radial-gradient(circle at 80% 7%,#dceee1 0,transparent 38%),#f5f8f6",
      fontFamily: "Arial, Helvetica, sans-serif", color: "#193f2d"
    }}>
      <div style={{ width: "100%", maxWidth: 440 }}>
        <Link href="/" style={{
          display: "inline-flex", alignItems: "center", gap: 9,
          color: "#265a3d", textDecoration: "none", fontWeight: 800,
          fontSize: 12, marginBottom: 21
        }}>
          <span aria-hidden="true">←</span> Back to Inspire Match
        </Link>
        <section style={{
          borderRadius: 21, padding: "clamp(24px, 6vw, 41px)",
          background: "#fff", border: "1px solid #e0ebe3",
          boxShadow: "0 20px 55px #1f5c3920"
        }}>
          <div style={{ textAlign: "center", marginBottom: 27 }}>
            <div style={{
              margin: "0 auto 15px", display: "grid", placeItems: "center",
              width: 48, height: 48, borderRadius: 15, background: "#1e6848",
              color: "white", fontSize: 28
            }} aria-hidden="true">✳</div>
            <div style={{ color: "#6f987c", fontSize: 10, letterSpacing: 2, fontWeight: 900 }}>
              INSPIRE MATCH
            </div>
            <h1 style={{
              margin: "13px 0 8px", fontSize: 29, fontFamily: "Georgia, serif",
              color: "#1c4430", letterSpacing: "-.8px"
            }}>
              {mode === "signup" ? "Join your team" : "Welcome back"}
            </h1>
            <p style={{ margin: 0, fontSize: 13, color: "#7a9080", lineHeight: 1.75 }}>
              {mode === "signup"
                ? "Create an account using your company invitation."
                : "Sign in to your existing recruitment workspace."}
            </p>
          </div>

          {inviteToken && (
            <div style={{
              background: "#edf7ef", color: "#276647", borderRadius: 11,
              padding: "11px 13px", fontSize: 12, lineHeight: 1.7, marginBottom: 20
            }}>
              Company invitation detected. Use the invited email address.
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <label htmlFor="login-email" style={{ display: "block", fontSize: 12, fontWeight: 800, marginBottom: 8 }}>
              Email address
            </label>
            <input id="login-email" type="email" autoComplete="email"
              value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@company.com" required
              style={{
                width: "100%", padding: "13px 14px", border: "1px solid #d7e5db",
                borderRadius: 11, outlineColor: "#39855a", marginBottom: 18, color: "#1b4630"
              }} />

            <label htmlFor="login-password" style={{ display: "block", fontSize: 12, fontWeight: 800, marginBottom: 8 }}>
              Password
            </label>
            <input id="login-password" type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              minLength={6} required value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Enter your password"
              style={{
                width: "100%", padding: "13px 14px", border: "1px solid #d7e5db",
                borderRadius: 11, outlineColor: "#39855a", marginBottom: 18, color: "#1b4630"
              }} />

            {error && <p role="alert" style={{
              fontSize: 12, lineHeight: 1.7, padding: 13,
              borderRadius: 10, background: "#fff1ed", color: "#a43f2d"
            }}>{error}</p>}

            {notice && <p role="status" style={{
              fontSize: 12, lineHeight: 1.7, padding: 13,
              borderRadius: 10, background: "#eaf6ec", color: "#1d6a3c"
            }}>{notice}</p>}

            <button type="submit" disabled={loading} style={{
              width: "100%", padding: "14px 18px", border: 0, borderRadius: 11,
              background: "#196c4a", color: "white", fontWeight: 850, fontSize: 13,
              opacity: loading ? .65 : 1, cursor: loading ? "wait" : "pointer"
            }}>
              {loading ? "Please wait..." : mode === "signup" ? "Create invited account" : "Sign In"}
            </button>
          </form>

          {inviteToken ? (
            <div style={{ textAlign: "center", marginTop: 22, fontSize: 12, color: "#718778" }}>
              {mode === "login" ? "New to this HR team?" : "Already have an account?"}
              <button type="button" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); setNotice(""); }}
                style={{ border: 0, background: "transparent", fontWeight: 850, color: "#196c4a", cursor: "pointer", marginLeft: 6 }}>
                {mode === "login" ? "Create invited account" : "Sign in"}
              </button>
            </div>
          ) : (
            <p style={{ fontSize: 12, color: "#768b7e", textAlign: "center", lineHeight: 1.8, margin: "20px 0 0" }}>
              Don't have workspace access?
              <Link href="/" style={{ color: "#196c4a", fontWeight: 850, marginLeft: 5 }}>
                Request a demo
              </Link>
            </p>
          )}
        </section>
        <p style={{ textAlign: "center", fontSize: 11, color: "#8ba390", marginTop: 19 }}>
          HIRE BETTER. INSPIRE MORE.
        </p>
      </div>
    </main>
  );
}
