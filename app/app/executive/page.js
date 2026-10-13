
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
      
      {/* EXECUTIVE REPORT COVER - PRINT ONLY */}
      <style>{`
        .executive-print-cover {
          display: none;
        }

        @media print {
          .executive-print-cover {
            display: flex !important;
            flex-direction: column;
            justify-content: space-between;
            box-sizing: border-box;
            height: 260mm;
            padding: 22mm 14mm;
            background: #FFFFFF !important;
            border-top: 9px solid #245C4A;
            break-after: page;
            page-break-after: always;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>

      <div className="executive-print-cover">
        <div>
          <div
            style={{
              fontSize: 13,
              letterSpacing: 3,
              fontWeight: 800,
              color: "#347A65",
            }}
          >
            INSPIRE MATCH
          </div>

          <div
            style={{
              fontSize: 12,
              color: "#71847A",
              marginTop: 10,
            }}
          >
            HIRE & INSPIRE BY CHRISTINE
          </div>
        </div>

        <div>
          <div
            style={{
              width: 85,
              height: 6,
              background: "#347A65",
              marginBottom: 35,
            }}
          />

          <div
            style={{
              fontSize: 14,
              fontWeight: 800,
              letterSpacing: 3,
              color: "#347A65",
              marginBottom: 22,
            }}
          >
            EXECUTIVE INTELLIGENCE
          </div>

          <h1
            style={{
              fontFamily: "Georgia, serif",
              fontSize: 48,
              lineHeight: 1.2,
              color: "#173F3A",
              margin: 0,
            }}
          >
            Executive
            <br />
            Recruitment
            <br />
            Report
          </h1>

          <p
            style={{
              fontSize: 17,
              color: "#71847A",
              marginTop: 28,
              lineHeight: 1.8,
            }}
          >
            Recruitment Performance, Workforce Insights
            & Strategic Hiring Priorities
          </p>
        </div>

        <div
          style={{
            borderTop: "1px solid #DCE9DF",
            paddingTop: 25,
          }}
        >
          <div
            style={{
              fontSize: 12,
              color: "#71847A",
              marginBottom: 8,
            }}
          >
            REPORT GENERATED ON
          </div>

          <div
            style={{
              fontSize: 19,
              fontWeight: 800,
              color: "#173F3A",
            }}
          >
            {new Date().toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </div>

          <div
            style={{
              marginTop: 30,
              fontSize: 12,
              letterSpacing: 2,
              color: "#A45232",
              fontWeight: 800,
            }}
          >
            CONFIDENTIAL — MANAGEMENT USE ONLY
          </div>

          <div
            style={{
              fontSize: 12,
              color: "#71847A",
              marginTop: 12,
            }}
          >
            Powered by Inspire Match ATS
          </div>
        </div>

      
      </div>
      {/* EXECUTIVE SUMMARY - PRINT ONLY */}

      <style>{`
        .executive-print-summary {
          display: none;
        }

        @media print {
          .executive-print-summary {
            display: block !important;
            box-sizing: border-box;
            min-height: 245mm;
            padding: 8mm 4mm;
            background: #FFFFFF !important;
            break-after: page;
            page-break-after: always;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .executive-print-summary .summary-block {
            break-inside: avoid-page;
            page-break-inside: avoid;
          }
        }
      `}</style>

      <div className="executive-print-summary">
        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: 2,
            color: "#347A65",
            marginBottom: 12,
          }}
        >
          INSPIRE MATCH | LEADERSHIP BRIEF
        </div>

        <h1
          style={{
            fontFamily: "Georgia, serif",
            fontSize: 34,
            color: "#173F3A",
            margin: "0 0 12px",
          }}
        >
          Executive Summary
        </h1>

        <p
          style={{
            fontSize: 12,
            color: "#71847A",
            lineHeight: 1.7,
            marginBottom: 22,
          }}
        >
          A management snapshot of current recruitment
          records, operational priorities and suggested
          next steps.
        </p>

        <div
          className="summary-block"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 10,
            marginBottom: 22,
          }}
        >
          {[
            ["Candidates", totalCandidates],
            ["Jobs Not Closed", activeJobs.length],
            ["Interview / Shortlist", interviewReady],
            ["Hired", hired],
          ].map(([label, value]) => (
            <div
              key={label}
              style={{
                background: "#F1F7F3",
                border: "1px solid #DCE9DF",
                borderRadius: 10,
                padding: 13,
              }}
            >
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 800,
                  color: "#245C4A",
                }}
              >
                {value}
              </div>

              <div
                style={{
                  fontSize: 10,
                  color: "#71847A",
                  marginTop: 6,
                }}
              >
                {label}
              </div>
            </div>
          ))}
        </div>

        <div
          className="summary-block"
          style={{
            borderLeft: "5px solid #347A65",
            background: "#F7FAF8",
            padding: 17,
            borderRadius: 10,
            marginBottom: 20,
          }}
        >
          <h2
            style={{
              fontSize: 17,
              margin: "0 0 10px",
              color: "#173F3A",
            }}
          >
            Overall Recruitment Performance
          </h2>

          <p
            style={{
              fontSize: 12,
              lineHeight: 1.8,
              margin: 0,
              color: "#52665A",
            }}
          >
            Current records include {totalCandidates} candidates
            across {jobs.length} recorded jobs.
            {" "}{interviewReady} candidates are currently
            in Interview or Shortlisted stages, and {hired}
            are marked Hired.
            {" "}These figures describe current statuses,
            not historical conversion rates.
          </p>
        </div>

        <div className="summary-block" style={{ marginBottom: 20 }}>
          <h2
            style={{
              fontSize: 17,
              color: "#173F3A",
              marginBottom: 10,
            }}
          >
            Top Business Risks
          </h2>

          {priorities.length > 0 ? (
            priorities.slice(0, 3).map((item, index) => (
              <div
                key={item.title}
                style={{
                  borderBottom: "1px solid #E1EBE4",
                  padding: "9px 0",
                }}
              >
                <strong
                  style={{
                    fontSize: 12,
                    color: "#A45232",
                  }}
                >
                  {index + 1}. {item.title}
                </strong>

                <p
                  style={{
                    fontSize: 11,
                    color: "#52665A",
                    lineHeight: 1.6,
                    margin: "5px 0 0",
                  }}
                >
                  {item.detail}
                </p>
              </div>
            ))
          ) : (
            <p style={{ fontSize: 12, color: "#347A65" }}>
              No operational priority signals triggered
              by the current rules.
            </p>
          )}
        </div>

        <div className="summary-block" style={{ marginBottom: 20 }}>
          <h2
            style={{
              fontSize: 17,
              color: "#173F3A",
              marginBottom: 10,
            }}
          >
            Key Performance Indicators
          </h2>

          <p
            style={{
              fontSize: 12,
              color: "#52665A",
              lineHeight: 1.8,
              margin: 0,
            }}
          >
            {activeJobs.length - noCandidateJobs.length}
            {" "}of {activeJobs.length} jobs not marked Closed
            have at least one linked candidate.
            {" "}{totalCandidates - unmatchedCandidates}
            {" "}of {totalCandidates} candidates are linked
            to recorded jobs.
          </p>
        </div>

        <div className="summary-block">
          <h2
            style={{
              fontSize: 17,
              color: "#173F3A",
              marginBottom: 10,
            }}
          >
            Recommended 30-Day Action Plan
          </h2>

          {[
            [
              "Days 1–7",
              noCandidateJobs.length > 0
                ? `Review sourcing and candidate assignment for ${noCandidateJobs.length} jobs without linked candidates.`
                : "Validate current job coverage and hiring priorities.",
            ],
            [
              "Days 8–14",
              earlyConcentrationJobs.length > 0
                ? `Review screening progress for ${earlyConcentrationJobs.length} early-stage-heavy jobs.`
                : "Review screening outcomes and interview readiness.",
            ],
            [
              "Days 15–21",
              unmatchedCandidates > 0
                ? `Review job assignments for ${unmatchedCandidates} unmatched candidates.`
                : "Audit candidate records and reporting completeness.",
            ],
            [
              "Days 22–30",
              "Recheck operational indicators and compare the updated snapshot with this report.",
            ],
          ].map(([period, action]) => (
            <div
              key={period}
              style={{
                display: "flex",
                gap: 14,
                padding: "9px 0",
                borderBottom: "1px solid #E1EBE4",
              }}
            >
              
              <strong
                style={{
                  minWidth: 85,
                  fontSize: 11,
                  color: "#347A65",
                }}
              >
                {period}
              </strong>

               
              <span
                style={{

                  fontSize: 11,
                  color: "#52665A",
                  lineHeight: 1.6,
                }}
              >
                {action}
              </span>
            </div>
          ))}
        </div>

        <p
          style={{
            fontSize: 10,
            color: "#819388",
            lineHeight: 1.7,
            marginTop: 18,
          }}
        >
          This summary is generated from current ATS records
          using transparent operational rules. Recommendations
          are suggested actions, not confirmed risks,
          forecasts or predictive AI assessments.
        </p>
      </div>



     <style>{`

        @page {
          size: A4 portrait;
          margin: 12mm;
        }

        @media print {
          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: #FFFFFF !important;
          }

          main {
            background: #FFFFFF !important;
            padding: 0 !important;
            min-height: auto !important;
            color: #173F3A !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          
          main > div:not(.executive-print-cover):not(.executive-print-summary) {
            max-width: 100% !important;
            margin: 0 !important;
          }


          main a,
          main button {
            display: none !important;
          }

          main > div > div:first-child {
            margin-bottom: 16px !important;
          }

          main h1 {
            font-size: 28px !important;
            break-after: avoid-page;
          }

          main h2 {
            break-after: avoid-page;
          }

          main > div > div:nth-child(2) {
            grid-template-columns:
              repeat(4, minmax(0, 1fr)) !important;
            gap: 8px !important;
            margin-bottom: 14px !important;
          }

          main > div > div:nth-child(2) > div {
            padding: 12px !important;
            border-radius: 8px !important;
            break-inside: avoid-page;
          }

         
          
         
         
          
          main > div > div:nth-child(4) {
            gap: 12px !important;
            margin-bottom: 14px !important;
            break-before: page !important;
            page-break-before: always !important;
            break-inside: avoid-page !important;
            page-break-inside: avoid !important;
          }

          main > div > section:nth-of-type(2),
          main > div > section:nth-of-type(3) {
            break-before: auto !important;
            page-break-before: auto !important;
          }

         


          main section {
            padding: 16px !important;
            border-radius: 10px !important;
            box-shadow: none !important;
            margin-bottom: 14px !important;
            break-inside: auto;
          }

          main section > div {
            break-inside: avoid-page;
          }

          main section p {
            orphans: 3;
            widows: 3;
          }
        }
      `}</style>

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

              <button
                type="button"
                onClick={() => window.print()}
                disabled={loading || Boolean(error)}
                style={{
                  padding: "12px 18px",
                  borderRadius: 10,
                  background:
                    loading || error
                      ? "#AAB8AE"
                      : "linear-gradient(135deg, #245C4A, #347A65)",
                  color: "#FFFFFF",
                  border: "1px solid #245C4A",
                  fontSize: 13,
                  fontWeight: 800,
                  cursor:
                    loading || error
                      ? "not-allowed"
                      : "pointer",
                  boxShadow: "0 5px 14px rgba(36,92,74,0.15)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                📄 Export Executive Report – PDF
              </button>
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


            {/* RECRUITMENT HEALTH SCORE */}
            {(() => {
              const activeJobIds = new Set(
                activeJobs.map((job) => String(job.id))
              );

              const linkedActive = candidates.filter(
                (candidate) =>
                  activeJobIds.has(String(candidate.job_id))
              );

              const advanced = linkedActive.filter(
                (candidate) =>
                  ["interview", "shortlisted", "hired"].includes(
                    normalize(candidate.status)
                  )
              ).length;

              const linkedCount =
                totalCandidates - unmatchedCandidates;

              const coveragePoints = activeJobs.length
                ? Math.round(
                    (40 *
                      (activeJobs.length -
                        noCandidateJobs.length)) /
                      activeJobs.length
                  )
                : 0;

              const pipelinePoints = linkedActive.length
                ? Math.round(
                    (30 * advanced) / linkedActive.length
                  )
                : 0;

              const qualityPoints = totalCandidates
                ? Math.round(
                    (30 * linkedCount) / totalCandidates
                  )
                : 0;

              const hasScore =
                activeJobs.length > 0 && totalCandidates > 0;

              const score = Math.min(
                100,
                coveragePoints +
                  pipelinePoints +
                  qualityPoints
              );

              const scoreColor =
                score >= 80
                  ? "#247A57"
                  : score >= 60
                  ? "#C18B31"
                  : "#BF5C49";

              const scoreLabel =
                score >= 80
                  ? "Strong"
                  : score >= 60
                  ? "Needs Attention"
                  : "Priority Review";

              const breakdown = [
                {
                  label: "Job Coverage",
                  value: coveragePoints,
                  max: 40,
                  detail: `${
                    activeJobs.length -
                    noCandidateJobs.length
                  } of ${activeJobs.length} jobs have linked candidates.`,
                  action:
                    "Review sourcing for jobs without candidates.",
                  color: "#347A65",
                },
                {
                  label: "Pipeline Progress",
                  value: pipelinePoints,
                  max: 30,
                  detail: `${advanced} of ${linkedActive.length} linked candidates are in Interview, Shortlisted or Hired.`,
                  action:
                    "Review screening and assessment progression.",
                  color: "#C89B47",
                },
                {
                  label: "Data Quality",
                  value: qualityPoints,
                  max: 30,
                  detail: `${linkedCount} of ${totalCandidates} candidates are linked to a recorded job.`,
                  action:
                    "Complete missing candidate-to-job assignments.",
                  color: "#6488A6",
                },
              ];

              return (
                <section
                  style={{
                    ...panel,
                    marginBottom: 26,
                    borderTop: "5px solid #347A65",
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      color: "#347A65",
                      letterSpacing: 2,
                    }}
                  >
                    RECRUITMENT PERFORMANCE INTELLIGENCE
                  </div>

                  <h2
                    style={{
                      fontFamily: "Georgia, serif",
                      fontSize: 26,
                      marginBottom: 8,
                    }}
                  >
                    Recruitment Health Score
                  </h2>

                  <p
                    style={{
                      color: "#71847A",
                      fontSize: 13,
                      lineHeight: 1.7,
                    }}
                  >
                    A transparent operational health indicator
                    based on current recruitment data.
                  </p>

                  <div
                    style={{
                      display: "flex",
                      gap: 22,
                      flexWrap: "wrap",
                      alignItems: "center",
                      margin: "26px 0",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 58,
                        fontWeight: 800,
                        color: hasScore
                          ? scoreColor
                          : "#819388",
                      }}
                    >
                      {hasScore ? score : "N/A"}
                      {hasScore && (
                        <span
                          style={{
                            fontSize: 20,
                            color: "#819388",
                          }}
                        >
                          /100
                        </span>
                      )}
                    </div>

                    <div style={{ flex: "1 1 220px" }}>
                      <div
                        style={{
                          fontWeight: 800,
                          fontSize: 15,
                          color: hasScore
                            ? scoreColor
                            : "#819388",
                        }}
                      >
                        {hasScore
                          ? scoreLabel
                          : "Insufficient Data"}
                      </div>

                      <div
                        style={{
                          height: 14,
                          background: "#EAF1EC",
                          borderRadius: 20,
                          overflow: "hidden",
                          marginTop: 12,
                        }}
                      >
                        <div
                          style={{
                            width: hasScore
                              ? `${score}%`
                              : "0%",
                            height: "100%",
                            background: scoreColor,
                            borderRadius: 20,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(220px, 1fr))",
                      gap: 16,
                    }}
                  >
                    {breakdown.map((item) => (
                      <div
                        key={item.label}
                        style={{
                          background: "#F7FAF8",
                          border: "1px solid #E1EBE4",
                          borderRadius: 14,
                          padding: 18,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 800,
                            marginBottom: 10,
                          }}
                        >
                          {item.label}
                        </div>

                        <div
                          style={{
                            fontSize: 25,
                            fontWeight: 800,
                            color: item.color,
                          }}
                        >
                          {hasScore
                            ? `${item.value}/${item.max}`
                            : "N/A"}
                        </div>

                        <div
                          style={{
                            height: 8,
                            background: "#E4EBE5",
                            borderRadius: 10,
                            margin: "12px 0",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              width: hasScore
                                ? `${
                                    (item.value / item.max) *
                                    100
                                  }%`
                                : "0%",
                              height: "100%",
                              background: item.color,
                            }}
                          />
                        </div>

                        <p
                          style={{
                            fontSize: 12,
                            color: "#65796D",
                            lineHeight: 1.7,
                          }}
                        >
                          {item.detail}
                        </p>

                        <p
                          style={{
                            fontSize: 12,
                            color: "#245C4A",
                            fontWeight: 700,
                            lineHeight: 1.7,
                          }}
                        >
                          Action: {item.action}
                        </p>
                      </div>
                    ))}
                  </div>

                  <p
                    style={{
                      fontSize: 11,
                      color: "#819388",
                      marginTop: 20,
                      lineHeight: 1.8,
                    }}
                  >
                    Scoring model: 40% job coverage,
                    30% pipeline stage progress,
                    30% candidate-to-job data quality.
                    A score is only shown when candidate
                    records and jobs not marked Closed exist.
                    This is a rule-based snapshot, not a
                    historical conversion rate or AI prediction.
                  </p>
                </section>
              );
            })()}

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

            
            {/* EXECUTIVE DECISION CENTER */}
            <section
              style={{
                ...panel,
                marginBottom: 26,
                borderTop: "5px solid #245C4A",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 14,
                  marginBottom: 20,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      letterSpacing: 2,
                      color: "#347A65",
                      fontWeight: 800,
                    }}
                  >
                    LEADERSHIP ACTION CENTER
                  </div>
                  <h2
                    style={{
                      fontFamily: "Georgia, serif",
                      fontSize: 25,
                      marginBottom: 8,
                    }}
                  >
                    Executive Decision Center
                  </h2>
                  <p
                    style={{
                      color: "#71847A",
                      fontSize: 13,
                      lineHeight: 1.7,
                    }}
                  >
                    Explainable recruitment priorities based on
                    current job and candidate records.
                  </p>
                </div>

                <Link
                  href="/app/jobs"
                  style={{
                    padding: "12px 18px",
                    background: "#245C4A",
                    color: "#FFFFFF",
                    textDecoration: "none",
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  Open Job Management →
                </Link>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: 12,
                  marginBottom: 24,
                }}
              >
                {[
                  {
                    label: "Jobs Without Candidates",
                    value: noCandidateJobs.length,
                  },
                  {
                    label: "Early-Stage Heavy Jobs",
                    value: earlyConcentrationJobs.length,
                  },
                  {
                    label: "Unmatched Candidates",
                    value: unmatchedCandidates,
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    style={{
                      background: "#F1F7F3",
                      borderRadius: 12,
                      padding: 18,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 30,
                        fontWeight: 800,
                        color: "#245C4A",
                      }}
                    >
                      {item.value}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "#63796C",
                        marginTop: 7,
                      }}
                    >
                      {item.label}
                    </div>
                  </div>
                ))}
              </div>

              {jobAnalysis
                .filter(
                  (job) => job.total === 0 || job.concentration
                )
                .sort(
                  (a, b) =>
                    Number(b.total === 0) -
                    Number(a.total === 0)
                )
                .slice(0, 5)
                .map((job, index) => (
                  <div
                    key={job.id}
                    style={{
                      padding: "18px 0",
                      borderTop: "1px solid #E1EBE4",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      flexWrap: "wrap",
                      gap: 14,
                    }}
                  >
                    <div style={{ flex: "1 1 260px" }}>
                      <div
                        style={{
                          fontSize: 11,
                          color: "#347A65",
                          fontWeight: 800,
                          marginBottom: 7,
                        }}
                      >
                        PRIORITY {index + 1}
                      </div>

                      <strong style={{ fontSize: 16 }}>
                        {job.title}
                      </strong>

                      <p
                        style={{
                          fontSize: 12,
                          color: "#667A6D",
                          lineHeight: 1.7,
                        }}
                      >
                        {job.total === 0
                          ? "Reason: No candidates are linked to this job."
                          : `Reason: ${job.early} of ${job.total} candidates are in Applied or Screening.`}
                      </p>

                      <div
                        style={{
                          fontSize: 13,
                          color: "#245C4A",
                          fontWeight: 600,
                          lineHeight: 1.7,
                        }}
                      >
                        Recommended Action:{" "}
                        {job.total === 0
                          ? "Verify hiring activity and review sourcing or candidate assignment."
                          : "Review screening outcomes and move suitable candidates to further assessment."}
                      </div>
                    </div>

                    <span
                      style={{
                        padding: "8px 12px",
                        borderRadius: 20,
                        background:
                          job.total === 0
                            ? "#FFF0E8"
                            : "#FFF7DF",
                        color:
                          job.total === 0
                            ? "#A45232"
                            : "#86651B",
                        fontSize: 11,
                        fontWeight: 800,
                      }}
                    >
                      {job.total === 0
                        ? "COVERAGE REVIEW"
                        : "PIPELINE REVIEW"}
                    </span>
                  </div>
                ))}

              {noCandidateJobs.length === 0 &&
                earlyConcentrationJobs.length === 0 && (
                  <p
                    style={{
                      color: "#347A65",
                      fontSize: 14,
                      lineHeight: 1.8,
                    }}
                  >
                    No jobs currently match the decision
                    center's review rules.
                  </p>
                )}

              <p
                style={{
                  fontSize: 11,
                  color: "#819388",
                  marginTop: 18,
                }}
              >
                Priorities are rule-based operational signals,
                not AI predictions or confirmed hiring delays.
              </p>
            </section>

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
