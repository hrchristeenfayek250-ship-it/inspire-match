
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

import ATSNavigation from "@/components/ATSNavigation";


export default function RecycleBinPage() {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [restoringId, setRestoringId] = useState(null);

  useEffect(() => {
    loadDeletedCandidates();
  }, []);

  async function loadDeletedCandidates() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("Please sign in again.");
      }

      const { data: memberships, error: membershipError } =
        await supabase
          .from("company_members")
          .select("company_id, role")
          .eq("user_id", user.id)
          .limit(2);

      if (membershipError || memberships?.length !== 1) {
        throw new Error("Company access denied.");
      }

      const { company_id: companyId, role } = memberships[0];

      const managerRoles = [
        "admin",
        "hr_manager",
        "senior_recruiter",
      ];

      const ownerRoles = [
        "hr",
        "recruiter",
        "hr_specialist",
      ];

      if (
        !managerRoles.includes(role) &&
        !ownerRoles.includes(role)
      ) {
        throw new Error("You do not have access to Recycle Bin.");
      }

      let query = supabase
        .from("candidates")
        .select("id, full_name, deleted_at, user_id")
        .eq("company_id", companyId)
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false });

      if (!managerRoles.includes(role)) {
        query = query.eq("user_id", user.id);
      }

      const { data, error: queryError } = await query;

      if (queryError) throw queryError;

      setCandidates(data || []);
    } catch (err) {
      setError(err.message || "Could not load Recycle Bin.");
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  }

  async function restoreCandidate(candidateId) {
    if (restoringId) return;

    const confirmed = window.confirm(
      "Restore this candidate to the Candidates Database?"
    );

    if (!confirmed) return;

    setRestoringId(candidateId);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        throw new Error("Please sign in again.");
      }

      const response = await fetch("/api/restore-candidate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ candidateId }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Restoration failed.");
      }

      setCandidates((previous) =>
        previous.filter((item) => item.id !== candidateId)
      );

      alert("Candidate restored successfully.");
    } catch (err) {
      alert(err.message || "Could not restore candidate.");
    } finally {
      setRestoringId(null);
    }
  }


  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        background: "#f4f8f6",
        color: "#173b30",
        fontFamily: "inherit",
      }}
    >
      <aside
        style={{
          width: 245,
          flexShrink: 0,
          background: "#103f32",
          color: "#fff",
          padding: "28px 18px",
          minHeight: "100vh",
        }}
      >
        <div style={{ padding: "0 12px", marginBottom: 38 }}>
          <div style={{ fontSize: 21, fontWeight: 800 }}>
            Inspire Match
          </div>
          <div
            style={{
              fontSize: 11,
              color: "#a8d8c5",
              marginTop: 5,
              letterSpacing: 1.5,
            }}
          >
            AI RECRUITMENT PLATFORM
          </div>
        </div>

        <ATSNavigation
          className="im-recycle-navigation"
          linkClassName="im-recycle-link"
        />

        <style>{`
          .im-recycle-navigation {
            display: flex;
            flex-direction: column;
            gap: 6px;
          }
          .im-recycle-link {
            display: flex;
            align-items: center;
            gap: 12px;
            color: #d1e9df;
            text-decoration: none;
            padding: 12px 14px;
            border-radius: 10px;
            font-size: 14px;
            font-weight: 600;
            transition: background .2s ease;
          }
          .im-recycle-link:hover {
            background: rgba(255,255,255,.10);
          }
          .im-recycle-link.active {
            background: #237a5b;
            color: white;
          }
          .im-recycle-link span {
            font-size: 18px;
          }
          @media (max-width: 760px) {
            .im-recycle-layout {
              flex-direction: column;
            }
            .im-recycle-sidebar {
              width: 100% !important;
              min-height: auto !important;
            }
          }
        `}</style>
      </aside>

      <div style={{ flex: 1, minWidth: 0 }}>
        <header
          style={{
            background: "#fff",
            borderBottom: "1px solid #e1eae5",
            padding: "22px 36px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ fontSize: 12, color: "#7b9287" }}>
              WORKSPACE / CANDIDATES
            </div>
            <strong style={{ fontSize: 20 }}>
              Recycle Bin
            </strong>
          </div>

          <Link
            href="/app/candidates"
            style={{
              background: "#edf7f1",
              color: "#166344",
              padding: "11px 18px",
              borderRadius: 10,
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            ← Back to Candidates
          </Link>
        </header>

        <main
          style={{
            maxWidth: 1150,
            margin: "0 auto",
            padding: "38px 32px",
          }}
        >
          <div
            style={{
              background:
                "linear-gradient(120deg,#104734,#238462)",
              borderRadius: 20,
              padding: "32px 34px",
              color: "white",
              marginBottom: 28,
            }}
          >
            <div
              style={{
                fontSize: 12,
                letterSpacing: 2,
                opacity: 0.8,
                marginBottom: 12,
              }}
            >
              CANDIDATE MANAGEMENT
            </div>

            <h1
              style={{
                fontSize: 32,
                fontWeight: 800,
                margin: "0 0 10px",
              }}
            >
              Recycle Bin
            </h1>

            <p
              style={{
                margin: 0,
                color: "#d9f4e7",
                lineHeight: 1.7,
              }}
            >
              Recover deleted candidates while preserving
              their CVs, notes, and recruitment history.
            </p>
          </div>

          <div
            style={{
              background: "#fff",
              border: "1px solid #e0ebe4",
              borderRadius: 18,
              padding: 26,
              boxShadow: "0 8px 30px rgba(16,63,50,.04)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 24,
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <h2 style={{ margin: 0, fontSize: 20 }}>
                Deleted Candidates
              </h2>

              <span
                style={{
                  background: "#e9f6ee",
                  color: "#14724d",
                  borderRadius: 30,
                  padding: "7px 14px",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {candidates.length} candidates
              </span>
            </div>

            {loading && <p>Loading deleted candidates...</p>}

            {error && (
              <p role="alert" style={{ color: "#b91c1c" }}>
                {error}
              </p>
            )}

            {!loading && !error && candidates.length === 0 && (
              <div
                style={{
                  textAlign: "center",
                  padding: "65px 20px",
                  background: "#f8fbf9",
                  borderRadius: 16,
                  border: "1px dashed #c9ded2",
                }}
              >
                <div style={{ fontSize: 46, marginBottom: 16 }}>
                  ♻
                </div>
                <h3 style={{ fontSize: 21, margin: "0 0 8px" }}>
                  Your Recycle Bin is empty
                </h3>
                <p style={{ color: "#6c8577", margin: 0 }}>
                  Deleted candidates will appear here
                  and can be restored when needed.
                </p>
              </div>
            )}

            {!loading && !error && candidates.length > 0 && (
              <div style={{ display: "grid", gap: 14 }}>
                {candidates.map((candidate) => (
                  <div
                    key={candidate.id}
                    style={{
                      border: "1px solid #e0ebe4",
                      borderRadius: 14,
                      padding: 20,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: 16,
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: 16 }}>
                        {candidate.full_name || "Unnamed Candidate"}
                      </strong>

                      <p
                        style={{
                          color: "#82968b",
                          fontSize: 13,
                          margin: "8px 0 0",
                        }}
                      >
                        Deleted:{" "}
                        {new Date(
                          candidate.deleted_at
                        ).toLocaleString()}
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={restoringId !== null}
                      onClick={() =>
                        restoreCandidate(candidate.id)
                      }
                      style={{
                        background: "#167a54",
                        color: "#fff",
                        border: 0,
                        borderRadius: 10,
                        padding: "12px 22px",
                        fontWeight: 700,
                        cursor: "pointer",
                        opacity: restoringId !== null ? 0.6 : 1,
                      }}
                    >
                      {restoringId === candidate.id
                        ? "Restoring..."
                        : "↺ Restore Candidate"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

}
