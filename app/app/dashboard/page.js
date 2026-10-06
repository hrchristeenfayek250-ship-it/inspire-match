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

    const [candidateResponse, jobResponse] = await Promise.all([
      supabase
        .from("candidates")
        .select("*")
        .order("created_at", { ascending: false }),

      supabase
        .from("jobs")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);

    if (candidateResponse.error) {
      console.error(
        "Could not load candidates:",
        candidateResponse.error
      );
    } else {
      setCandidates(candidateResponse.data || []);
    }

    if (jobResponse.error) {
      console.error(
        "Could not load jobs:",
        jobResponse.error
      );
    } else {
      setJobs(jobResponse.data || []);
    }

    setLoading(false);
  }

  function countStage(stage) {
    return candidates.filter(
      (candidate) =>
        String(candidate.status || "").toLowerCase() ===
        stage.toLowerCase()
    ).length;
  }

  const totalCandidates = candidates.length;
  const activeJobs = jobs.filter(
    (job) => job.status !== "Closed"
  ).length;

  const screening = countStage("Screening");
  const interviews = countStage("Interview");
  const shortlisted = countStage("Shortlisted");
  const hired = countStage("Hired");

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          padding: "60px 24px",
          background: "#faf9f6",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ maxWidth: 1400, margin: "0 auto" }}>
          <h1>Recruitment Dashboard</h1>
          <p>Loading dashboard...</p>
        </div>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "50px 24px",
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
            alignItems: "center",
            marginBottom: 30,
            gap: 20,
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
                fontFamily: "Georgia, serif",
                fontSize: 42,
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
              padding: "12px 20px",
              border: "1px solid #ddd",
              borderRadius: 10,
              background: "#fff",
              color: "#222",
            }}
          >
            ← ATS Home
          </Link>
        </div>

        {/* NAVIGATION */}

        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 35,
          }}
        >
          <Link
            href="/app/pipeline"
            style={{
              textDecoration: "none",
              padding: "14px 22px",
              borderRadius: 10,
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
              padding: "14px 22px",
              borderRadius: 10,
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
              padding: "14px 22px",
              borderRadius: 10,
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
          <StatCard
            icon="👥"
            number={totalCandidates}
            label="Total Candidates"
          />

          <StatCard
            icon="💼"
            number={activeJobs}
            label="Active Jobs"
          />

          <StatCard
            icon="🔎"
            number={screening}
            label="In Screening"
          />

          <StatCard
            icon="🎤"
            number={interviews}
            label="Interviews"
          />

          <StatCard
            icon="⭐"
            number={shortlisted}
            label="Shortlisted"
          />

          <StatCard
            icon="🎉"
            number={hired}
            label="Hired"
          />
        </div>

        {/* PIPELINE SUMMARY */}

        <section
          style={{
            background: "#fff",
            border: "1px solid #eee",
            borderRadius: 16,
            padding: 25,
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
                "repeat(auto-fit, minmax(140px, 1fr))",
              gap: 12,
            }}
          >
            {stages.map((stage) => (
              <div
                key={stage}
                style={{
                  background: "#f7f7f5",
                  borderRadius: 12,
                  padding: 18,
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    color: "#777",
                    marginBottom: 8,
                  }}
                >
                  {stage}
                </div>

                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 700,
                  }}
                >
                  {countStage(stage)}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* RECENT CANDIDATES */}

        <section
          style={{
            background: "#fff",
            border: "1px solid #eee",
            borderRadius: 16,
            padding: 25,
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
                }}
              >
                Latest candidates added to your database
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
              View Database →
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
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: 16,
                      border: "1px solid #eee",
                      borderRadius: 12,
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
                          fontSize: 13,
                          color: "#666",
                          marginTop: 5,
                        }}
                      >
                        {candidate.current_title || "—"}
                      </div>
                    </div>

                    <span
                      style={{
                        padding: "6px 10px",
                        borderRadius: 20,
                        background: "#f1f1ee",
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
      </div>
    </main>
  );
}

function StatCard({ icon, number, label }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #eee",
        borderRadius: 16,
        padding: 24,
        minHeight: 130,
      }}
    >
      <div
        style={{
          fontSize: 28,
          marginBottom: 15,
        }}
      >
        {icon}
      </div>

      <div
        style={{
          fontSize: 34,
          fontWeight: 700,
          marginBottom: 8,
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
