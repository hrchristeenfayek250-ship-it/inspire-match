
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const STAGES = [
  "Applied",
  "Screening",
  "Interview",
  "Shortlisted",
  "Hired",
  "Rejected",
];

const normalize = (value) =>
  String(value || "").trim().toLowerCase();

const panel = {
  background: "#FFFFFF",
  border: "1px solid #DCE9DF",
  borderRadius: 18,
  padding: 24,
};

export default function ExecutivePage() {
  const [candidates, setCandidates] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        const { data: auth, error: authError } =
          await supabase.auth.getUser();

        if (authError || !auth.user) {
          throw new Error("Please log in first.");
        }

        const { data: memberships, error: memberError } =
          await supabase
            .from("company_members")
            .select("company_id")
            .eq("user_id", auth.user.id)
            .limit(2);

        if (
          memberError ||
          !memberships ||
          memberships.length !== 1
        ) {
          throw new Error(
            "A valid company membership is required."
          );
        }

        const companyId = memberships[0].company_id;

        const filter =
          `company_id.eq.${companyId},` +
          `and(company_id.is.null,user_id.eq.${auth.user.id})`;

        const [candidateResult, jobResult] =
          await Promise.all([
            supabase
              .from("candidates")
              .select("id, status, job_id, current_title")
              .or(filter),

            supabase
              .from("jobs")
              .select("id, title, status")
              .or(filter),
          ]);

        if (candidateResult.error || jobResult.error) {
          throw new Error(
            "Could not load executive analytics."
          );
        }

        if (active) {
          setCandidates(candidateResult.data || []);
          setJobs(jobResult.data || []);
        }
      } catch (err) {
        if (active) {
          setError(
            err.message || "Could not load executive analytics."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadData();

    return () => {
      active = false;
    };
  }, []);

  const countStage = (stage) =>
    candidates.filter(
      (candidate) =>
        normalize(candidate.status) === normalize(stage)
    ).length;

  const activeJobs = jobs.filter(
    (job) => normalize(job.status) !== "closed"
  );

  const totalCandidates = candidates.length;

  const interviewReady =
    countStage("Interview") +
    countStage("Shortlisted");

  const hired = countStage("Hired");

  const jobIds = new Set(
    jobs.map((job) => String(job.id))
  );

  const unmatchedCandidates = candidates.filter(
    (candidate) =>
      !jobIds.has(String(candidate.job_id))
  ).length;

  const jobAnalysis = activeJobs.map((job) => {
    const linked = candidates.filter(
      (candidate) =>
        String(candidate.job_id) === String(job.id)
    );

    const early = linked.filter((candidate) =>
      ["applied", "screening"].includes(
        normalize(candidate.status)
      )
    ).length;

    return {
      id: job.id,
      title: job.title || "Untitled Job",
      total: linked.length,
      early,
      concentration:
        linked.length >= 3 &&
        early / linked.length >= 0.7,
    };
  });

  const noCandidateJobs = jobAnalysis.filter(
    (job) => job.total === 0
  );

  const earlyConcentrationJobs = jobAnalysis.filter(
    (job) => job.concentration
  );

  const priorities = [];

  if (noCandidateJobs.length > 0) {
    priorities.push({
      title: "Review Job Coverage",
      detail: `${noCandidateJobs.length} jobs not marked Closed have no linked candidates in the available records.`,
      action:
        "Check whether these jobs are actively hiring and review sourcing and candidate assignment.",
      level: "Review",
    });
  }

  if (earlyConcentrationJobs.length > 0) {
    priorities.push({
      title: "Review Early-Stage Pipelines",
      detail: `${earlyConcentrationJobs.length} jobs have at least 70% of their linked candidates in Applied or Screening.`,
      action:
        "Review screening outcomes and identify candidates ready for further assessment.",
      level: "Review",
    });
  }

  if (
    totalCandidates > 0 &&
    unmatchedCandidates / totalCandidates >= 0.2
  ) {
    priorities.push({
      title: "Improve Data Quality",
      detail: `${unmatchedCandidates} candidates are not linked to a job in the available records.`,
      action:
        "Verify candidate-to-job assignments for more reliable reporting.",
      level: "Data",
    });
  }

  const metrics = [
    {
      label: "Total Candidates",
      value: totalCandidates,
    },
    {
      label: "Jobs Not Marked Closed",
      value: activeJobs.length,
    },
    {
      label: "Interview & Shortlisted",
      value: interviewReady,
    },
    {
      label: "Currently Hired",
      value: hired,
    },
  ];

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#F7F9F7",
        padding: "38px 22px",
        fontFamily: "Arial, sans-serif",
        color: "#173F3A",
      }}
    >
      <div
        style={{
          maxWidth: 1300,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 18,
            marginBottom: 32,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                letterSpacing: 2.5,
                color: "#347A65",
                fontWeight: 800,
              }}
            >
              INSPIRE MATCH | EXECUTIVE INTELLIGENCE
            </div>

            <h1
              style={{
                fontFamily: "Georgia, serif",
                fontSize: "clamp(28px, 4vw, 40px)",
                marginBottom: 10,
              }}
            >
              Executive Recruitment Dashboard
            </h1>

            <p
              style={{
                color: "#71847A",
                fontSize: 14,
                lineHeight: 1.7,
              }}
            >
              Leadership overview of your recruitment operation.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            <Link
              href="/app/dashboard"
              style={{
                padding: "12px 16px",
                borderRadius: 10,
                background: "#FFFFFF",
                border: "1px solid #DCE9DF",
                color: "#245C4A",
                textDecoration: "none",
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              ← Dashboard
            </Link>

            <Link
              href="/app/reports"
              style={{
                padding: "12px 16px",
                borderRadius: 10,
                background: "#245C4A",
                color: "#FFFFFF",
                textDecoration: "none",
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              Detailed Reports
            </Link>
          </div>
        </div>

        {loading ? (
          <div style={panel}>
            Loading executive analytics...
          </div>
        ) : error ? (
          <div
            style={{
              ...panel,
              color: "#A64639",
            }}
          >
            {error}
          </div>
        ) : (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(210px, 1fr))",
                gap: 16,
                marginBottom: 26,
              }}
            >
              {metrics.map((metric) => (
                <div
                  key={metric.label}
                  style={{
                    ...panel,
                    borderTop: "4px solid #347A65",
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      color: "#71847A",
                      fontWeight: 700,
                    }}
                  >
                    {metric.label}
                  </div>

                  <div
                    style={{
                      fontSize: 38,
                      fontWeight: 800,
                      marginTop: 14,
                    }}
                  >
                    {metric.value}
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(min(100%, 340px), 1fr))",
                gap: 20,
                marginBottom: 26,
              }}
            >
              <section style={panel}>
                <h2
                  style={{
                    fontFamily: "Georgia, serif",
                    fontSize: 23,
                    marginTop: 0,
                  }}
                >
                  Recruitment Pipeline
                </h2>

                <p
                  style={{
                    color: "#71847A",
                    fontSize: 12,
                    marginBottom: 24,
                  }}
                >
                  Current stages across all candidate records.
                </p>

                {STAGES.map((stage) => {
                  const count = countStage(stage);
                  const percent = totalCandidates
                    ? Math.round(
                        (count / totalCandidates) * 100
                      )
                    : 0;

                  return (
                    <div
                      key={stage}
                      style={{ marginBottom: 19 }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 13,
                          marginBottom: 8,
                        }}
                      >
                        <strong>{stage}</strong>
                        <span>
                          {count} ({percent}%)
                        </span>
                      </div>

                      <div
                        style={{
                          background: "#EAF1EC",
                          height: 12,
                          borderRadius: 8,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${percent}%`,
                            height: "100%",
                            background: "#347A65",
                            borderRadius: 8,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </section>

              <section style={panel}>
                <h2
                  style={{
                    fontFamily: "Georgia, serif",
                    fontSize: 23,
                    marginTop: 0,
                  }}
                >
                  Executive Priorities
                </h2>

                <p
                  style={{
                    color: "#71847A",
                    fontSize: 12,
                    marginBottom: 24,
                  }}
                >
                  Operational signals requiring review.
                </p>

                {priorities.length === 0 ? (
                  <p
                    style={{
                      color: "#347A65",
                      lineHeight: 1.8,
                      fontSize: 14,
                    }}
                  >
                    No priority signals triggered by the
                    current rules.
                  </p>
                ) : (
                  priorities.map((item) => (
                    <div
                      key={item.title}
                      style={{
                        background: "#F7FAF8",
                        border: "1px solid #E1EBE4",
                        borderLeft: "4px solid #D2A85F",
                        padding: 16,
                        borderRadius: 10,
                        marginBottom: 14,
                      }}
                    >
                      <strong
                        style={{
                          fontSize: 14,
                        }}
                      >
                        {item.title}
                      </strong>

                      <p
                        style={{
                          color: "#52665A",
                          fontSize: 12,
                          lineHeight: 1.7,
                        }}
                      >
                        {item.detail}
                      </p>

                      <p
                        style={{
                          color: "#245C4A",
                          fontSize: 12,
                          lineHeight: 1.7,
                          marginBottom: 0,
                        }}
                      >
                        <strong>Action:</strong>{" "}
                        {item.action}
                      </p>
                    </div>
                  ))
                )}
              </section>
            </div>

            <section style={panel}>
              <h2
                style={{
                  fontFamily: "Georgia, serif",
                  fontSize: 23,
                  marginTop: 0,
                }}
              >
                Jobs Requiring Attention
              </h2>

              <p
                style={{
                  color: "#71847A",
                  fontSize: 13,
                  lineHeight: 1.7,
                }}
              >
                Jobs without linked candidates or with a high
                concentration in early recruitment stages.
              </p>

              {jobAnalysis
                .filter(
                  (job) =>
                    job.total === 0 ||
                    job.concentration
                )
                .slice(0, 8)
                .map((job) => (
                  <div
                    key={job.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: 12,
                      borderBottom: "1px solid #E2ECE5",
                      padding: "17px 0",
                    }}
                  >
                    <div>
                      <strong>{job.title}</strong>
                      <div
                        style={{
                          fontSize: 12,
                          color: "#71847A",
                          marginTop: 6,
                        }}
                      >
                        {job.total === 0
                          ? "No linked candidates"
                          : "Early-stage concentration"}
                      </div>
                    </div>

                    <strong
                      style={{
                        color: "#347A65",
                        fontSize: 13,
                      }}
                    >
                      {job.total} Candidates
                    </strong>
                  </div>
                ))}

              {jobAnalysis.every(
                (job) =>
                  job.total > 0 &&
                  !job.concentration
              ) && (
                <p
                  style={{
                    color: "#347A65",
                    fontSize: 13,
                  }}
                >
                  No jobs triggered the current attention rules.
                </p>
              )}
            </section>

            <p
              style={{
                color: "#819388",
                fontSize: 11,
                lineHeight: 1.8,
                marginTop: 24,
              }}
            >
              Executive analytics use current candidate
              statuses across available company records.
              These are operational indicators, not
              historical conversion rates, confirmed delays,
              or predictive AI assessments.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
