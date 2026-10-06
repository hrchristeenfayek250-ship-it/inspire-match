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

    const [candidateResult, jobsResult] = await Promise.all([
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

    if (jobsResult.error) {
      console.error(
        "Could not load jobs:",
        jobsResult.error
      );
    } else {
      setJobs(jobsResult.data || []);
    }

    setLoading(false);
  }

  function countStage(stage) {
    return candidates.filter(
      (candidate) => candidate.status === stage
    ).length;
  }

  const totalCandidates = candidates.length;
  const activeJobs = jobs.length;
  const screeningCount = countStage("Screening");
  const interviewCount = countStage("Interview");
  const shortlistedCount = countStage("Shortlisted");
  const hiredCount = countStage("Hired");

  const pipelineTotal =
    countStage("Applied") +
    countStage("Screening") +
    countStage("Interview") +
    countStage("Shortlisted") +
    countStage("Hired") +
    countStage("Rejected");

  function percentage(count) {
    if (!pipelineTotal) return 0;
    return Math.round((count / pipelineTotal) * 100);
  }

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          padding: "50px 30px",
          background: "#faf9f6",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            maxWidth: 1400,
            margin: "0 auto",
          }}
        >
          <h1>Recruitment Dashboard</h1>
          <p>Loading recruitment data...</p>
        </div>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "50px 30px",
        background: "#faf9f6",
        fontFamily: "Arial, sans-serif",
        color: "#222",
      }}
    >
      <div
        style={{
          maxWidth: 1400,
          margin: "0 auto",
        }}
      >
        {/* HEADER */}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 20,
            marginBottom: 30,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 13,
                letterSpacing: 2,
                color: "#777",
                marginBottom: 8,
              }}
            >
              INSPIRE MATCH
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: 38,
                fontFamily: "Georgia, serif",
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
              padding: "12px 20px",
              border: "1px solid #ddd",
              borderRadius: 10,
              background: "#fff",
              color: "#222",
              fontWeight: 600,
            }}
          >
            ← ATS Home
          </Link>
        </div>

        {/* QUICK NAVIGATION */}

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
              padding: "12px 20px",
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
              padding: "12px 20px",
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
              padding: "12px 20px",
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

        {/* KPI CARDS */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(210px, 1fr))",
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

        {/* PIPELINE */}

        <section
          style={{
            background: "#fff",
            border: "1px solid #e5e5e5",
            borderRadius: 16,
            padding: 28,
            marginBottom: 30,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 25,
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  fontFamily: "Georgia, serif",
                }}
              >
                Recruitment Pipeline
              </h2>

              <p
                style={{
                  margin: "7px 0 0",
                  color: "#777",
                }}
              >
                Current candidate distribution
              </p>
            </div>

            <Link
              href="/app/pipeline"
              style={{
                color: "#222",
                fontWeight: 600,
                textDecoration: "none",
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
            {stages.map((stage) => {
              const count = countStage(stage);

              return (
                <div
                  key={stage}
                  style={{
                    padding: 18,
                    background: "#f7f7f5",
                    borderRadius: 12,
                  }}
                >
                  <div
                    style={{
                      fontSize: 28,
                      fontWeight: 700,
                      marginBottom: 5,
                    }}
                  >
                    {count}
                  </div>

                  <div
                    style={{
                      fontSize: 14,
                      color: "#555",
                      marginBottom: 12,
                    }}
                  >
                    {stage}
                  </div>

                  <div
                    style={{
                      height: 6,
                      background: "#e3e3e3",
                      borderRadius: 10,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${percentage(count)}%`,
                        height: "100%",
                        background: "#222",
                        borderRadius: 10,
                      }}
                    />
                  </div>

                  <div
                    style={{
                      marginTop: 7,
                      fontSize: 12,
                      color: "#888",
                    }}
                  >
                    {percentage(count)}%
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* RECENT CANDIDATES */}

        <section
          style={{
            background: "#fff",
            border: "1px solid #e5e5e5",
            borderRadius: 16,
            padding: 28,
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
                  margin: 0,
                  fontFamily: "Georgia, serif",
                }}
              >
                Recent Candidates
              </h2>

              <p
                style={{
                  margin: "7px 0 0",
                  color: "#777",
                }}
              >
                Latest candidates added to your ATS
              </p>
            </div>

            <Link
              href="/app/candidates"
              style={{
                color: "#222",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              View All →
            </Link>
          </div>

          {candidates.length === 0 ? (
            <p style={{ color: "#888" }}>
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
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 15,
                      padding: 16,
                      border: "1px solid #eee",
                      borderRadius: 12,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontWeight: 700,
                          marginBottom: 5,
                        }}
                      >
                        {candidate.full_name ||
                          "Unnamed Candidate"}
                      </div>

                      <div
                        style={{
                          fontSize: 13,
                          color: "#666",
                        }}
                      >
                        {candidate.current_title || "No title"}
                      </div>

                      <div
                        style={{
                          fontSize: 13,
                          color: "#888",
                          marginTop: 4,
                        }}
                      >
                        {candidate.location || "No location"}
                      </div>
                    </div>

                    <div
                      style={{
                        padding: "7px 12px",
                        borderRadius: 20,
                        background: "#f1f1ee",
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      {candidate.status || "Screening"}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* REFRESH */}

        <div
          style={{
            textAlign: "center",
            marginTop: 25,
          }}
        >
          <button
            onClick={loadDashboard}
            style={{
              padding: "10px 18px",
              borderRadius: 8,
              border: "1px solid #ddd",
              background: "#fff",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            ↻ Refresh Dashboard
          </button>
        </div>
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
        borderRadius: 16,
        padding: 24,
        minHeight: 125,
      }}
    >
      <div
        style={{
          fontSize: 25,
          marginBottom: 15,
        }}
      >
        {icon}
      </div>

      <div
        style={{
          fontSize: 30,
          fontWeight: 700,
          marginBottom: 5,
        }}
      >
        {number}
      </div>

      <div
        style={{
          color: "#777",
          fontSize: 14,
        }}
      >
        {label}
      </div>
    </div>
  );
}
