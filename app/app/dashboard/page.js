"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function DashboardPage() {
  const [stats, setStats] = useState({
    candidates: 0,
    jobs: 0,
    screening: 0,
    interviews: 0,
    shortlisted: 0,
    hired: 0,
    rejected: 0,
  });

  const [recentCandidates, setRecentCandidates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    const [
      candidatesResult,
      jobsResult,
      screeningResult,
      interviewsResult,
      shortlistedResult,
      hiredResult,
      rejectedResult,
    ] = await Promise.all([
      supabase.from("candidates").select("*", { count: "exact", head: false }),
      supabase.from("jobs").select("*", { count: "exact", head: true }),
      supabase
        .from("candidates")
        .select("*", { count: "exact", head: true })
        .eq("status", "Screening"),
      supabase
        .from("candidates")
        .select("*", { count: "exact", head: true })
        .eq("status", "Interview"),
      supabase
        .from("candidates")
        .select("*", { count: "exact", head: true })
        .eq("status", "Shortlisted"),
      supabase
        .from("candidates")
        .select("*", { count: "exact", head: true })
        .eq("status", "Hired"),
      supabase
        .from("candidates")
        .select("*", { count: "exact", head: true })
        .eq("status", "Rejected"),
    ]);

    setStats({
      candidates: candidatesResult.count || 0,
      jobs: jobsResult.count || 0,
      screening: screeningResult.count || 0,
      interviews: interviewsResult.count || 0,
      shortlisted: shortlistedResult.count || 0,
      hired: hiredResult.count || 0,
      rejected: rejectedResult.count || 0,
    });

    if (!candidatesResult.error) {
      setRecentCandidates((candidatesResult.data || []).slice(0, 5));
    }

    setLoading(false);
  }

  const cards = [
    {
      title: "Total Candidates",
      value: stats.candidates,
      icon: "👥",
      link: "/app/candidates",
    },
    {
      title: "Active Jobs",
      value: stats.jobs,
      icon: "💼",
      link: "/app",
    },
    {
      title: "In Screening",
      value: stats.screening,
      icon: "🔍",
      link: "/app/pipeline",
    },
    {
      title: "Interviews",
      value: stats.interviews,
      icon: "🎤",
      link: "/app/pipeline",
    },
    {
      title: "Shortlisted",
      value: stats.shortlisted,
      icon: "⭐",
      link: "/app/pipeline",
    },
    {
      title: "Hired",
      value: stats.hired,
      icon: "🎉",
      link: "/app/pipeline",
    },
  ];

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#faf9f6",
        fontFamily: "Arial, sans-serif",
        padding: "40px 24px",
      }}
    >
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>

        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 35,
            gap: 20,
          }}
        >
          <div>
            <p
              style={{
                margin: "0 0 8px",
                color: "#777",
                fontSize: 14,
              }}
            >
              INSPIRE MATCH
            </p>

            <h1
              style={{
                margin: 0,
                fontSize: 34,
                color: "#222",
              }}
            >
              Recruitment Dashboard
            </h1>

            <p
              style={{
                marginTop: 10,
                color: "#777",
              }}
            >
              Your recruitment activity at a glance.
            </p>
          </div>

          <Link
            href="/"
            style={{
              textDecoration: "none",
              padding: "11px 18px",
              borderRadius: 8,
              border: "1px solid #ddd",
              background: "#fff",
              color: "#222",
            }}
          >
            ← ATS Home
          </Link>
        </div>

        {/* Quick Actions */}
        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 30,
          }}
        >
          <Link
            href="/app/pipeline"
            style={{
              textDecoration: "none",
              padding: "12px 18px",
              borderRadius: 9,
              background: "#222",
              color: "#fff",
              fontWeight: 600,
            }}
          >
            🔄 Candidate Pipeline
          </Link>

          <Link
            href="/app/candidates"
            style={{
              textDecoration: "none",
              padding: "12px 18px",
              borderRadius: 9,
              background: "#fff",
              color: "#222",
              border: "1px solid #ddd",
              fontWeight: 600,
            }}
          >
            👥 Candidate Database
          </Link>

          <Link
            href="/"
            style={{
              textDecoration: "none",
              padding: "12px 18px",
              borderRadius: 9,
              background: "#fff",
              color: "#222",
              border: "1px solid #ddd",
              fontWeight: 600,
            }}
          >
            🤖 AI Matching
          </Link>
        </div>

        {/* Stats */}
        {loading ? (
          <p>Loading dashboard...</p>
        ) : (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(190px, 1fr))",
                gap: 18,
                marginBottom: 30,
              }}
            >
              {cards.map((card) => (
                <Link
                  key={card.title}
                  href={card.link}
                  style={{
                    textDecoration: "none",
                    color: "inherit",
                    background: "#fff",
                    border: "1px solid #e8e6e1",
                    borderRadius: 14,
                    padding: 22,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 26,
                      marginBottom: 15,
                    }}
                  >
                    {card.icon}
                  </div>

                  <div
                    style={{
                      fontSize: 30,
                      fontWeight: 700,
                      color: "#222",
                    }}
                  >
                    {card.value}
                  </div>

                  <div
                    style={{
                      marginTop: 6,
                      color: "#777",
                      fontSize: 14,
                    }}
                  >
                    {card.title}
                  </div>
                </Link>
              ))}
            </div>

            {/* Pipeline Overview */}
            <section
              style={{
                background: "#fff",
                border: "1px solid #e8e6e1",
                borderRadius: 14,
                padding: 24,
                marginBottom: 30,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 20,
                }}
              >
                <div>
                  <h2 style={{ margin: 0 }}>
                    Recruitment Pipeline
                  </h2>

                  <p
                    style={{
                      color: "#777",
                      fontSize: 14,
                    }}
                  >
                    Current candidate distribution
                  </p>
                </div>

                <Link
                  href="/app/pipeline"
                  style={{
                    textDecoration: "none",
                    color: "#222",
                    fontWeight: 600,
                  }}
                >
                  View Pipeline →
                </Link>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(140px, 1fr))",
                  gap: 12,
                }}
              >
                {[
                  ["Screening", stats.screening],
                  ["Interview", stats.interviews],
                  ["Shortlisted", stats.shortlisted],
                  ["Hired", stats.hired],
                  ["Rejected", stats.rejected],
                ].map(([stage, count]) => (
                  <div
                    key={stage}
                    style={{
                      background: "#f5f4f1",
                      borderRadius: 10,
                      padding: 16,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 24,
                        fontWeight: 700,
                      }}
                    >
                      {count}
                    </div>

                    <div
                      style={{
                        color: "#777",
                        marginTop: 5,
                        fontSize: 13,
                      }}
                    >
                      {stage}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Recent Candidates */}
            <section
              style={{
                background: "#fff",
                border: "1px solid #e8e6e1",
                borderRadius: 14,
                padding: 24,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 20,
                }}
              >
                <h2 style={{ margin: 0 }}>
                  Recent Candidates
                </h2>

                <Link
                  href="/app/candidates"
                  style={{
                    textDecoration: "none",
                    color: "#222",
                    fontWeight: 600,
                  }}
                >
                  View All →
                </Link>
              </div>

              {recentCandidates.length === 0 ? (
                <p style={{ color: "#999" }}>
                  No candidates yet.
                </p>
              ) : (
                recentCandidates.map((candidate) => (
                  <Link
                    key={candidate.id}
                    href={`/app/candidates/${candidate.id}`}
                    style={{
                      display: "block",
                      textDecoration: "none",
                      color: "inherit",
                      padding: "15px 0",
                      borderBottom: "1px solid #eee",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 20,
                      }}
                    >
                      <div>
                        <strong>
                          {candidate.full_name ||
                            "Unnamed Candidate"}
                        </strong>

                        <div
                          style={{
                            color: "#777",
                            fontSize: 13,
                            marginTop: 5,
                          }}
                        >
                          {candidate.current_title || "—"}
                          {" · "}
                          {candidate.location || "—"}
                        </div>
                      </div>

                      <span
                        style={{
                          fontSize: 12,
                          background: "#f1f1ee",
                          padding: "5px 9px",
                          borderRadius: 20,
                          height: "fit-content",
                        }}
                      >
                        {candidate.status || "Screening"}
                      </span>
                    </div>
                  </Link>
                ))
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
