
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function AcceptInvitePage() {
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    async function checkInvitation() {
      const params = new URLSearchParams(window.location.search);
      const invitationToken = params.get("token") || "";

      setToken(invitationToken);

      if (!invitationToken) {
        setError("Invitation link is missing or invalid.");
      }

      setLoading(false);
    }

    checkInvitation();
  }, []);

  async function acceptInvitation() {
    if (!token || working) return;

    setWorking(true);
    setError("");
    setMessage("");

    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError) throw authError;

      if (!authData?.user) {
        throw new Error(
          "Please sign in with your invited email, then open this link again."
        );
      }

      const { data, error: acceptError } =
        await supabase.rpc("accept_company_invitation", {
          p_token: token,
        });

      if (acceptError) throw acceptError;

      setMessage(data || "Invitation accepted successfully!");
      setAccepted(true);
    } catch (err) {
      setError(err.message || "Unable to accept invitation.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#faf9f6",
        padding: "80px 20px",
        fontFamily: "Arial, sans-serif",
        color: "#173f3a",
      }}
    >
      <section
        style={{
          maxWidth: 520,
          margin: "0 auto",
          background: "white",
          padding: 35,
          borderRadius: 20,
          border: "1px solid #dce5de",
          textAlign: "center",
        }}
      >
        <p style={{ letterSpacing: 2, fontSize: 12 }}>
          INSPIRE MATCH
        </p>

        <h1 style={{ fontFamily: "Georgia, serif" }}>
          Join Your HR Team
        </h1>

        <p style={{ color: "#718078", lineHeight: 1.7 }}>
          You've been invited to join a recruitment workspace.
          Please sign in with the email address that received
          the invitation.
        </p>

        {loading ? (
          <p>Loading invitation...</p>
        ) : (
          <>
            {error && (
              <p role="alert" style={{ color: "#b42318" }}>
                {error}
              </p>
            )}

            {message && (
              <p style={{ color: "#23734e" }}>
                {message}
              </p>
            )}

            {!accepted && token && (
              <button
                type="button"
                onClick={acceptInvitation}
                disabled={working}
                style={{
                  background: "#173f3a",
                  color: "white",
                  border: "none",
                  borderRadius: 10,
                  padding: "15px 25px",
                  cursor: "pointer",
                  marginTop: 18,
                }}
              >
                {working
                  ? "Accepting Invitation..."
                  : "Accept Invitation"}
              </button>
            )}

            {accepted && (
              <p style={{ marginTop: 25 }}>
                <Link href="/app/dashboard">
                  Go to Dashboard →
                </Link>
              </p>
            )}
          </>
        )}
      </section>
    </main>
  );
}
