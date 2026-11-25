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
    let active = true;
    const token = new URLSearchParams(window.location.search).get("invite") || "";
    setInviteToken(token);
    // On the same origin, skip the login form when a session already exists.
    // Company authorization still runs in the protected root layout.
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active || error || !data?.session) return;
      router.replace(token
        ? "/app/accept-invite?token=" + encodeURIComponent(token)
        : "/app/dashboard");
    }).catch(() => {});
    return () => { active = false; };
  }, [router]);

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
      const rawMessage = String(err?.message || "").toLowerCase();
      const networkFailure = err?.name === "TypeError" ||
        /failed to fetch|networkerror|network request failed|load failed|fetch failed|network failed/.test(rawMessage);
      if (networkFailure) {
        // Check the provider from our server, without sending passwords or email.
        // A reachable provider here points to a browser-specific connection issue.
        let serviceReachable = null;
        try {
          const response = await fetch("/api/auth/connectivity", { cache: "no-store" });
          if (response.ok) {
            const result = await response.json();
            serviceReachable = result.reachable === true;
          }
        } catch {
          // Keep the fallback message when the check itself is unavailable.
        }
        setError(serviceReachable === true
          ? "This browser could not connect to our secure sign-in service. Check your internet connection, browser privacy settings or blockers, then retry. You can also try signing in from your usual browser."
          : serviceReachable === false
            ? "Our sign-in service is temporarily unreachable. Please try again shortly. If this continues, contact your workspace administrator."
            : "Unable to connect to the sign-in service. Please check your connection and retry, or try another browser.");
      } else if (/invalid login credentials|invalid email or password/.test(rawMessage)) {
        setError("The email or password is incorrect. Please check your details and try again.");
      } else if (/email not confirmed/.test(rawMessage)) {
        setError("Please confirm your email address before signing in.");
      } else {
        setError(err?.message || "Could not complete your request. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }


  return (
    <main className="im2-auth-page">
      <section className="im2-auth-story" aria-label="Inspire Match introduction">
        <Link href="/" className="im2-auth-brand">
          <span className="im2-auth-monogram" aria-hidden="true">I</span>
          <span>INSPIRE <b>MATCH</b><small>BY HIRE &amp; INSPIRE</small></span>
        </Link>
        <div className="im2-auth-story-content">
          <span className="im2-auth-overline">A BETTER WAY TO HIRE</span>
          <h2>Exceptional talent.<br /><em>Beautifully connected.</em></h2>
          <p>Everything your team needs to discover talent, manage decisions and move hiring forward — in one thoughtfully designed workspace.</p>
          <div className="im2-auth-story-line" aria-hidden="true"><span /></div>
          <div className="im2-auth-story-points">
            <span><span aria-hidden="true">✧</span> Intelligent matching</span>
            <span><span aria-hidden="true">◈</span> Connected workflows</span>
            <span><span aria-hidden="true">◎</span> Confident decisions</span>
          </div>
        </div>
        <div className="im2-auth-story-footer">
          <span>HIRE BETTER. INSPIRE MORE.</span>
          <span>INSPIRE MATCH ATS</span>
        </div>
      </section>

      <section className="im2-auth-form-area" aria-label="Secure workspace sign in">
        <div className="im2-auth-form-wrap">
          <Link href="/" className="im2-auth-back">← Back to Inspire Match</Link>
          <div className="im2-auth-mobile-brand">INSPIRE <b>MATCH</b></div>
          <div className="im2-auth-intro">
            <span className="im2-auth-overline">YOUR WORKSPACE AWAITS</span>
            <h1>{mode === "signup" ? "Join your team." : "Welcome back."}</h1>
            <p>{mode === "signup"
              ? "Create your account using the invitation from your company."
              : "Sign in to your recruitment workspace."}</p>
          </div>

          {inviteToken && (
            <div className="im2-auth-invitation" role="status">
              <span aria-hidden="true">✦</span> Company invitation detected. Use the invited email address.
            </div>
          )}

          <form className="im2-auth-form" onSubmit={handleSubmit}>
            <label htmlFor="login-email">Work email address</label>
            <input id="login-email" type="email" autoComplete="email"
              value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@company.com" required />

            <label htmlFor="login-password">Password</label>
            <input id="login-password" type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              minLength={6} required value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Enter your password" />

            {error && <p className="im2-auth-message im2-auth-error" role="alert">{error}</p>}
            {notice && <p className="im2-auth-message im2-auth-notice" role="status">{notice}</p>}

            <button className="im2-auth-submit" type="submit" disabled={loading}>
              {loading ? "Please wait..." : mode === "signup" ? "Create invited account" : "Sign in to workspace"}
              {!loading && <span aria-hidden="true">→</span>}
            </button>
          </form>

          {inviteToken ? (
            <p className="im2-auth-help">
              {mode === "login" ? "New to this HR team?" : "Already have an account?"}
              <button type="button" onClick={() => {
                setMode(mode === "login" ? "signup" : "login");
                setError(""); setNotice("");
              }}>
                {mode === "login" ? "Create invited account" : "Sign in"}
              </button>
            </p>
          ) : (
            <p className="im2-auth-help">
              Don't have workspace access? <Link href="/">Request a demo</Link>
            </p>
          )}
          <p className="im2-auth-secure">✧ Private, secure access for your recruitment team.</p>
        </div>
      </section>
    </main>
  );
}
