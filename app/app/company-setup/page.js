"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const brand = "#174c39";
const muted = "#668275";

export default function CompanySetupPage() {
  const [loading, setLoading] = useState(true);
  const [workspaces, setWorkspaces] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadExistingAccess() {
      try {
        const { data: auth, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;

        if (!auth?.user) {
          window.location.replace("/app/login");
          return;
        }

        // Read existing approved-by-membership access only.
        // This page must never create a company or assign an admin role.
        const { data: memberships, error: membershipError } = await supabase
          .from("company_members")
          .select("company_id, role")
          .eq("user_id", auth.user.id)
          .limit(50);

        if (membershipError) throw membershipError;
        const accessible = memberships || [];

        let companyNames = [];
        const companyIds = [...new Set(accessible.map((m) => m.company_id).filter(Boolean))];
        if (companyIds.length) {
          const { data: companies, error: companyError } = await supabase
            .from("companies")
            .select("id, name")
            .in("id", companyIds);

          // A company may be intentionally hidden by RLS; do not expose it.
          if (companyError) throw companyError;
          companyNames = companies || [];
        }

        const names = new Map(companyNames.map((c) => [c.id, c.name]));
        if (mounted) {
          setWorkspaces(
            accessible
              .filter((m) => names.has(m.company_id))
              .map((m) => ({
                id: m.company_id,
                name: names.get(m.company_id),
                role: m.role,
              }))
          );
        }
      } catch (err) {
        if (mounted) setError(err?.message || "Unable to load your workspace access.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadExistingAccess();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f5f8f6",
        padding: "48px 18px",
        color: brand,
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <div style={{ maxWidth: 660, margin: "0 auto" }}>
        <Link
          href="/app/dashboard"
          style={{ color: brand, textDecoration: "none", fontSize: 13, fontWeight: 700 }}
        >
          ← Back to Dashboard
        </Link>

        <section
          style={{
            background: "#fff",
            border: "1px solid #dce9e0",
            borderRadius: 22,
            marginTop: 26,
            padding: "clamp(24px, 5vw, 42px)",
            boxShadow: "0 16px 45px rgba(18, 66, 42, .06)",
          }}
        >
          <p
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: 2,
              color: "#658a76",
              margin: "0 0 16px",
            }}
          >
            HIRE & INSPIRE BY CHRISTINE
          </p>
          <h1
            style={{
              fontFamily: "Georgia, serif",
              fontSize: "clamp(29px, 5vw, 39px)",
              margin: "0 0 12px",
              color: "#163c2d",
            }}
          >
            Inspire Match Workspace Access
          </h1>
          <p style={{ color: muted, lineHeight: 1.8, fontSize: 14, marginBottom: 26 }}>
            Inspire Match is available through a guided, sales-led onboarding process.
            Company workspaces and administrator access are prepared by our team after
            the required commercial and security reviews.
          </p>

          {error && (
            <p
              role="alert"
              style={{
                borderRadius: 11,
                padding: "13px 15px",
                color: "#a23a29",
                background: "#fff1ed",
                fontSize: 13,
              }}
            >
              {error}
            </p>
          )}

          {loading ? (
            <p style={{ color: muted, fontSize: 13 }}>Checking your workspace access...</p>
          ) : workspaces.length > 0 ? (
            <div style={{ marginBottom: 27 }}>
              <h2 style={{ marginBottom: 13, fontSize: 17, color: brand }}>
                Your existing workspaces
              </h2>
              {workspaces.map((workspace) => (
                <div
                  key={workspace.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    flexWrap: "wrap",
                    padding: "15px 17px",
                    border: "1px solid #dce9e0",
                    background: "#f7fbf8",
                    borderRadius: 12,
                    marginBottom: 9,
                  }}
                >
                  <strong style={{ fontSize: 14 }}>{workspace.name}</strong>
                  <span style={{ color: muted, fontSize: 12 }}>
                    {String(workspace.role || "member").replaceAll("_", " ")}
                  </span>
                </div>
              ))}
              <p style={{ color: muted, fontSize: 12, lineHeight: 1.7 }}>
                Existing membership is shown for reference. Product access remains
                subject to applicable workspace permissions and activation controls.
              </p>
              <Link
                href="/app/dashboard"
                style={{
                  display: "inline-block",
                  padding: "12px 19px",
                  borderRadius: 11,
                  background: brand,
                  color: "#fff",
                  textDecoration: "none",
                  fontWeight: 800,
                  fontSize: 13,
                }}
              >
                Open Dashboard
              </Link>
            </div>
          ) : (
            <div
              style={{
                border: "1px solid #d9e7dc",
                background: "#f3f9f4",
                borderRadius: 13,
                padding: 19,
                marginBottom: 26,
              }}
            >
              <strong style={{ fontSize: 15 }}>No workspace assigned yet</strong>
              <p style={{ color: muted, fontSize: 13, lineHeight: 1.8, marginBottom: 0 }}>
                If your organization is an existing client, ask your company administrator
                or Inspire Match team to arrange your access. New organizations can
                request a product demo and private consultation.
              </p>
            </div>
          )}

          <div
            style={{
              borderTop: "1px solid #e4ece6",
              paddingTop: 25,
              marginTop: 10,
            }}
          >
            <h2 style={{ fontSize: 18, margin: "0 0 8px" }}>
              New to Inspire Match?
            </h2>
            <p style={{ color: muted, lineHeight: 1.8, fontSize: 13 }}>
              Speak with Sales about your recruitment needs, a tailored demonstration,
              and the onboarding process. Packages and pricing are discussed privately.
            </p>
            <a
              href="https://hireandinspirebychristine.com/"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-block",
                background: brand,
                color: "#fff",
                padding: "13px 22px",
                borderRadius: 11,
                textDecoration: "none",
                fontWeight: 800,
                fontSize: 13,
                marginTop: 4,
              }}
            >
              Visit Hire & Inspire to Contact Sales
            </a>
          </div>
        </section>

        <p style={{ textAlign: "center", color: "#829c8d", fontSize: 11, marginTop: 22 }}>
          INSPIRE MATCH · HIRE BETTER. INSPIRE MORE.
        </p>
      </div>
    </main>
  );
}
