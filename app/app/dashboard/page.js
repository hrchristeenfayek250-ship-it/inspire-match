"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const stages = [
  "Applied",
  "Screening",
  "Interview",
  "Shortlisted",
  "Hired",
  "Rejected",
];

export default function DashboardPage() {
  const [candidates, setCandidates] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);

    const [candidateResult, jobResult] = await Promise.all([
      supabase
        .from("candidates")
        .select("*")
        .order("created_at", { ascending: false }),

      supabase
        .from("jobs")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);

    if (candidateResult.error) {
      console.error(
        "Could not load candidates:",
        candidateResult.error
      );
    } else {
      setCandidates(candidateResult.data || []);
    }

    if (jobResult.error) {
      console.error(
        "Could not load jobs:",
        jobResult.error
      );
    } else {
      setJobs(jobResult.data || []);
    }

    setLoading(false);
  }

  function countStage(stage) {
    return candidates.filter(
      (candidate) => candidate.status === stage
    ).length;
  }

  const totalCandidates = candidates.length;

  const activeJobs = jobs.filter(
    (job) => !job.status || job.status === "Active"
  ).length;

  const screeningCount = countStage("Screening");
  const interviewCount = countStage("Interview");
  const shortlistedCount = countStage("Shortlisted");
  const hiredCount = countStage("Hired");

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#faf9f6",
        padding: "50px 24px",
        fontFamily: "Arial, sans-serif",
        color: "#222",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 30,
            gap: 20,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 13,
                letterSpacing: 1,
                color: "#777",
                marginBottom: 8,
              }}
            >
              INSPIRE MATCH
            </div>

            <h1
              style={{
                fontFamily: "Georgia, serif",
                fontSize: 38,
                margin: 0,
              }}
            >
              Recruitment Dashboard
            </h1>

            <p
              style={{
                color: "#666",
                marginTop: 10,
              }}
            >
              Your recruitment activity at a glance.
            </p>
          </div>

          <Link
            href="/"
            style={{
              textDecoration: "none",
              border: "1px solid #ddd",
              background: "#fff",
              color: "#222",
              padding: "11px 18px",
              borderRadius: 8,
            }}
          >
            ← ATS Home
          </Link>
        </div>

        {/* Navigation */}
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
              background: "#222",
              color: "#fff",
              padding: "12px 18px",
              borderRadius: 8,
            }}
          >
            🔄 Candidate Pipeline
          </Link>

          <Link
            href="/app/candidates"
            style={{
              textDecoration: "none",
              background: "#fff",
              color: "#222",
              padding: "12px 18px",
              borderRadius: 8,
              border: "1px solid #ddd",
            }}
          >
            👥 Candidate Database
          </Link>

          <Link
            href="/"
            style={{
              textDecoration: "none",
              background: "#fff",
              color: "#222",
              padding: "12px 18px",
              borderRadius: 8,
              border: "1px solid #ddd",
            }}
          >
            🤖 AI Matching
          </Link>
        </div>

        {loading ? (
          <p>Loading dashboard...</p>
        ) : (
          <>
            {/* KPI Cards */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(190px, 1fr))",
                gap: 18,
                marginBottom: 35,
              }}
            >
              <KpiCard
                icon="👥"
                number={totalCandidates}
                label="Total Candidates"
              />

              <KpiCard
                icon="💼"
                number={activeJobs}
                label="Active Jobs"
              />

              <KpiCard
                icon="🔎"
                number={screeningCount}
                label="In Screening"
              />

              <KpiCard
                icon="🎤"
                number={interviewCount}
                label="Interviews"
              />

              <KpiCard
                icon="⭐"
                number={shortlistedCount}
                label="Shortlisted"
              />

              <KpiCard
                icon="🎉"
                number={hiredCount}
                label="Hired"
              />
            </div>

            {/* Recruitment Pipeline */}
            <section
              style={{
                background: "#fff",
                border: "1px solid #e5e5e5",
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
                  <h2
                    style={{
                      fontFamily: "Georgia, serif",
                      margin: 0,
                    }}
                  >
                    Recruitment Pipeline
                  </h2>

                  <p
                    style={{
                      color: "#777",
                      margin: "6px 0 0",
                      fontSize: 14,
                    }}
                  >
                    Current candidate distribution
                  </p>
                </div>

                <Link
                  href="/app/pipeline"
                  style={{
                    color: "#222",
                    textDecoration: "none",
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
                    "repeat(auto-fit, minmax(130px, 1fr))",
                  gap: 12,
                }}
              >
                {stages.map((stage) => (
                  <div
                    key={stage}
                    style={{
                      background: "#f7f7f4",
                      borderRadius: 10,
                      padding: 16,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 25,
                        fontWeight: 700,
                        marginBottom: 5,
                      }}
                    >
                      {countStage(stage)}
                    </div>

                    <div
                      style={{
                        color: "#777",
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
                border: "1px solid #e5e5e5",
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
                <div>
                  <h2
                    style={{
                      fontFamily: "Georgia, serif",
                      margin: 0,
                    }}
                  >
                    Recent Candidates
                  </h2>

                  <p
                    style={{
                      color: "#777",
                      margin: "6px 0 0",
                      fontSize: 14,
                    }}
                  >
                    Latest candidates added to your database
                  </p>
                </div>

                <Link
                  href="/app/candidates"
                  style={{
                    color: "#222",
                    textDecoration: "none",
                    fontWeight: 600,
                  }}
                >
                  View All →
                </Link>
              </div>

              {candidates.length === 0 ? (
                <p style={{ color: "#777" }}>
                  No candidates yet.
                </p>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gap: 12,
                  }}
                >
                  {candidates.slice(0, 5).map((candidate) => (
                    <Link
                      key={candidate.id}
                      href={`/app/candidates/${candidate.id}`}
                      style={{
                        textDecoration: "none",
                        color: "#222",
                      }}
                    >
                      <div
                        style={{
                          border: "1px solid #eee",
                          borderRadius: 10,
                          padding: 16,
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 15,
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
                          </div>
                        </div>

                        <span
                          style={{
                            background: "#f2f2ef",
                            padding: "6px 10px",
                            borderRadius: 20,
                            fontSize: 12,
                          }}
                        >
                          {candidate.status || "Screening"}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function KpiCard({ icon, number, label }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e5e5e5",
        borderRadius: 14,
        padding: 22,
        minHeight: 120,
      }}
    >
      <div
        style={{
          fontSize: 24,
          marginBottom: 12,
        }}
      >
        {icon}
      </div>

      <div
        style={{
          fontSize: 28,
          fontWeight: 700,
          marginBottom: 5,
        }}
      >
        {number}
      </div>

      <div
        style={{
          color: "#777",
          fontSize: 13,
        }}
      >
        {label}
      </div>
    </div>
  );
}
