"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();

    setLoading(true);
    setError("");
    setMessage("");

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          throw error;
        }

        router.push("/app/dashboard");
        router.refresh();
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) {
          throw error;
        }

        if (data?.session) {
          router.push("/app/dashboard");
          router.refresh();
        } else {
          setMessage(
            "Account created successfully. Please check your email to confirm your account before signing in."
          );
          setMode("login");
        }
      }
    } catch (err) {
      setError(
        err?.message ||
          "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background:
          "linear-gradient(135deg, #f7f4ef 0%, #ffffff 50%, #eef5f3 100%)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "440px",
          background: "#ffffff",
          borderRadius: "24px",
          padding: "42px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.10)",
          border: "1px solid #eeeeee",
        }}
      >
        <div
          style={{
            textAlign: "center",
            marginBottom: "32px",
          }}
        >
          <div
            style={{
              fontSize: "30px",
              fontWeight: 700,
              letterSpacing: "-1px",
              color: "#173f3a",
            }}
          >
            Hire & Inspire
          </div>

          <div
            style={{
              marginTop: "4px",
              fontSize: "14px",
              color: "#777777",
              letterSpacing: "1px",
            }}
          >
            INSPIRE MATCH
          </div>

          <h1
            style={{
              marginTop: "28px",
              marginBottom: "8px",
              fontSize: "28px",
              color: "#222222",
            }}
          >
            {mode === "login"
              ? "Welcome Back"
              : "Create Your Account"}
          </h1>

          <p
            style={{
              margin: 0,
              color: "#777777",
              fontSize: "14px",
            }}
          >
            {mode === "login"
              ? "Sign in to your recruitment workspace"
              : "Create your recruiter account"}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <label
            style={{
              display: "block",
              marginBottom: "8px",
              fontWeight: 600,
              color: "#333333",
            }}
          >
            Email
          </label>

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            required
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "14px 16px",
              borderRadius: "12px",
              border: "1px solid #dddddd",
              fontSize: "15px",
              marginBottom: "18px",
              outline: "none",
            }}
          />

          <label
            style={{
              display: "block",
              marginBottom: "8px",
              fontWeight: 600,
              color: "#333333",
            }}
          >
            Password
          </label>

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
            minLength={6}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "14px 16px",
              borderRadius: "12px",
              border: "1px solid #dddddd",
              fontSize: "15px",
              marginBottom: "20px",
              outline: "none",
            }}
          />

          {error && (
            <div
              style={{
                padding: "12px 14px",
                marginBottom: "16px",
                borderRadius: "10px",
                background: "#fff1f1",
                color: "#b42318",
                fontSize: "13px",
                lineHeight: 1.5,
              }}
            >
              {error}
            </div>
          )}

          {message && (
            <div
              style={{
                padding: "12px 14px",
                marginBottom: "16px",
                borderRadius: "10px",
                background: "#edf8f3",
                color: "#176b4d",
                fontSize: "13px",
                lineHeight: 1.5,
              }}
            >
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "15px",
              border: "none",
              borderRadius: "12px",
              background: "#173f3a",
              color: "#ffffff",
              fontSize: "16px",
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading
              ? "Please wait..."
              : mode === "login"
              ? "Sign In"
              : "Create Account"}
          </button>
        </form>

        <div
          style={{
            textAlign: "center",
            marginTop: "24px",
            fontSize: "14px",
            color: "#777777",
          }}
        >
          {mode === "login"
            ? "Don't have an account?"
            : "Already have an account?"}

          <button
            type="button"
            onClick={() => {
              setMode(
                mode === "login" ? "signup" : "login"
              );
              setError("");
              setMessage("");
            }}
            style={{
              border: "none",
              background: "transparent",
              color: "#173f3a",
              fontWeight: 700,
              marginLeft: "6px",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            {mode === "login"
              ? "Create one"
              : "Sign in"}
          </button>
        </div>

        <div
          style={{
            textAlign: "center",
            marginTop: "28px",
            fontSize: "12px",
            color: "#999999",
          }}
        >
          Hire & Inspire by Christine
        </div>
      </div>
    </main>
  );
}
