
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

export default function ReportsPage() {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, "0")}`;
  });

 
  const [candidates, setCandidates] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");


  useEffect(() => {
    let active = true;

    async function loadReport() {
      setLoading(true);
      setError("");

      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (!active) return;

      if (authError || !authData.user) {
        setCandidates([]);
        setError("Please log in to view reports.");
        setLoading(false);
        return;
      }

     
      const { data: memberships, error: membershipError } =
        await supabase
          .from("company_members")
          .select("company_id")
          .eq("user_id", authData.user.id)
          .limit(2);

      if (!active) return;

      if (
        membershipError ||
        !memberships ||
        memberships.length !== 1
      ) {
        setCandidates([]);
        setError("Please join a company to view reports.");
        setLoading(false);
        return;
      }

      const companyId = memberships[0].company_id;

      const start = new Date(`${month}-01T00:00:00`);
      const end = new Date(
        start.getFullYear(),
        start.getMonth() + 1,
        1
      );

    
      const { data, error: queryError } = await supabase
        .from("candidates")
        .select(
"id, full_name, current_title, status, created_at, job_id, recruitment_type"
        )
        .or(
          `company_id.eq.${companyId},and(company_id.is.null,user_id.eq.${authData.user.id})`
        )
        .gte("created_at", start.toISOString())
        .lt("created_at", end.toISOString())
        .order("created_at", { ascending: false });

      const { data: jobData, error: jobError } =
        await supabase
          .from("jobs")
          .select("id, title, status")
          .or(
            `company_id.eq.${companyId},and(company_id.is.null,user_id.eq.${authData.user.id})`
          )
          .order("created_at", { ascending: false });

      if (!active) return;

      if (queryError || jobError) {
        setError("Could not load recruitment analytics.");
        setCandidates([]);
        setJobs([]);
      } else {
        setCandidates(data || []);
        setJobs(jobData || []);
      }

 
      setLoading(false);
    }


    loadReport();

    return () => {
      active = false;
    };
  }, [month]);

  function countStage(stage) {
    return candidates.filter(
      (candidate) =>
        String(candidate.status || "").toLowerCase() ===
        stage.toLowerCase()
    ).length;
  }


  const periodLabel = new Date(
    `${month}-01T12:00:00`
  ).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const green = "#245c4a";

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#faf9f6",
        padding: "40px 24px",
        fontFamily: "Arial, sans-serif",
        color: "#222",
      }}
    >
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 12mm;
          }

          body * {
            visibility: hidden !important;
          }

          .report-print,
          .report-print * {
            visibility: visible !important;
          }

          .report-print {
            position: absolute !important;
            top: 0;
            left: 0;
            width: 100%;
            padding: 0 !important;
            box-shadow: none !important;
          }

          .no-print {
            display: none !important;
          }

          thead {
            display: table-header-group;
          }

          tr {
            break-inside: avoid;
          }
                  .pipeline-print-grid {
            grid-template-columns: repeat(6, minmax(0, 1fr)) !important;
            gap: 8px !important;
            margin-bottom: 15px !important;
          }

          
table td,
table th {
  padding: 6px 8px !important;
  font-size: 11px !important;
}
          .pipeline-print-grid > div {
            padding: 10px !important;
          }
        }
      `}</style>

      <div style={{ maxWidth: 1250, margin: "auto" }}>
        <div
          className="no-print"
          style={{ marginBottom: 25 }}
        >
          <Link
            href="/app/dashboard"
            style={{
              color: green,
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            ← Back to Dashboard
          </Link>
        </div>

        <div
          className="no-print"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 15,
            marginBottom: 25,
          }}
        >
          <div>
            <h1
              style={{
                fontFamily: "Georgia, serif",
                fontSize: 34,
                margin: "0 0 8px",
              }}
            >
              Inspire Reports
            </h1>

            <p style={{ color: "#777", margin: 0 }}>
              Professional Recruitment Reporting
            </p>
          </div>

          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              style={{
                padding: 12,
                borderRadius: 10,
                border: "1px solid #ddd",
                fontSize: 14,
              }}
            />

            <button
              type="button"
              onClick={() => window.print()}
              disabled={loading || Boolean(error)}
              style={{
                background: green,
                color: "white",
                padding: "13px 20px",
                border: "none",
                borderRadius: 10,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Export PDF ↓
            </button>
          </div>
        </div>

        <section
          className="report-print"
          style={{
            background: "#fff",
            border: "1px solid #dce9df",
            borderRadius: 16,
            padding: 30,
            boxShadow: "0 8px 24px rgba(30,59,50,0.05)",
          }}
        >
          
          <div
            style={{
              background: "#edf5ef",
              border: "1px solid #d9e8dd",
              borderLeft: "7px solid #245c4a",
              borderRadius: 16,
              padding: "28px 30px",
              marginBottom: 26,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 20,
              }}
            >
              <div>
                <div
                  style={{
                    color: "#245c4a",
                    fontSize: 12,
                    fontWeight: 800,
                    letterSpacing: 2,
                    marginBottom: 14,
                  }}
                >
                  HIRE & INSPIRE BY CHRISTINE
                </div>

                <div
                  style={{
                    fontSize: 11,
                    color: "#738578",
                    fontWeight: 700,
                    letterSpacing: 1.5,
                    marginBottom: 8,
                  }}
                >
                  RECRUITMENT INTELLIGENCE REPORT
                </div>

                <h2
                  style={{
                    fontFamily: "Georgia, serif",
                    fontSize: 32,
                    color: "#173e32",
                    margin: "0 0 12px",
                  }}
                >
                  Candidate Pipeline Report
                </h2>

                <p
                  style={{
                    fontSize: 13,
                    color: "#576c5f",
                    margin: 0,
                  }}
                >
                  Talent pipeline overview, hiring progress
                  and candidate insights.
                </p>
              </div>

              <div
                style={{
                  background: "#ffffff",
                  border: "1px solid #d6e6d9",
                  borderRadius: 12,
                  padding: "15px 20px",
                }}
              >
                <div
                  style={{
                    color: "#7a8c80",
                    fontSize: 10,
                    letterSpacing: 1.5,
                    fontWeight: 700,
                    marginBottom: 7,
                  }}
                >
                  REPORTING PERIOD
                </div>
                <div
                  style={{
                    color: "#245c4a",
                    fontSize: 17,
                    fontWeight: 800,
                  }}
                >
                  {periodLabel}
                </div>
            </div>
          </div>
</div>

          {loading ? (
            <p>Loading report...</p>
          ) : error ? (
            <p style={{ color: "#b91c1c" }}>{error}</p>
          ) : (
            <>
              
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                  gap: 12,
                  marginBottom: 20,
                }}
              >
                {[
                  {
                    label: "CANDIDATES ADDED",
                    value: candidates.length,
                    note: "Added during this month",
                  },
                  {
                    label: "ACTIVE PIPELINE",
                    value: ["Applied", "Screening", "Interview", "Shortlisted"]
                      .reduce((sum, stage) => sum + countStage(stage), 0),
                    note: "Currently in active stages",
                  },
                  {
                    label: "HIRED SHARE",
                    value: `${candidates.length
                      ? Math.round((countStage("Hired") / candidates.length) * 100)
                      : 0}%`,
                    note: "Currently marked as hired",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    style={{
                      background: "#f0f6f2",
                      border: "1px solid #dce9df",
                      borderTop: "3px solid #245c4a",
                      borderRadius: 12,
                      padding: 16,
                    }}
                  >
                    <div style={{ fontSize: 11, color: "#66776b", fontWeight: 700 }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize: 30, fontWeight: 800, color: "#245c4a", margin: "10px 0" }}>
                      {item.value}
                    </div>
                    <div style={{ fontSize: 11, color: "#77867c" }}>
                      {item.note}
                    </div>
                  </div>
                ))}
              </div>

              <div
                style={{
                  background: "#f7faf8",
                  border: "1px solid #dce9df",
                  borderLeft: "4px solid #245c4a",
                  borderRadius: 14,
                  padding: 22,
                  marginBottom: 25,
                  breakInside: "avoid",
                }}
              >
                <div
                  style={{
                    color: "#245c4a",
                    fontSize: 12,
                    fontWeight: 800,
                    letterSpacing: 1.5,
                    marginBottom: 12,
                  }}
                >
                  EXECUTIVE SUMMARY
                </div>

                <p
                  style={{
                    color: "#33443b",
                    fontSize: 14,
                    lineHeight: 1.9,
                    margin: 0,
                  }}
                >
                  During {periodLabel}, a total of{" "}
                  <strong>{candidates.length} candidates</strong>{" "}
                  were added to the recruitment pipeline.
                  Currently, <strong>{countStage("Screening")}</strong>{" "}
                  are in screening,{" "}
                  <strong>{countStage("Shortlisted")}</strong>{" "}
                  are shortlisted, and{" "}
                  <strong>{countStage("Hired")}</strong>{" "}
                  are hired.
                </p>

                <div
                  style={{
                    marginTop: 14,
                    fontSize: 13,
                    color: "#245c4a",
                    fontWeight: 700,
                  }}
                >
                  Screening Share:{" "}
                  {candidates.length
                    ? Math.round(
                        (countStage("Screening") /
                          candidates.length) * 100
                      )
                    : 0}
                  %
                </div>
              </div>
              
              {(() => {
                const colors = [
                  "#173F3A",
                  "#347A65",
                  "#5DAA91",
                  "#9BCDBB",
                  "#D2A85F",
                  "#D97676",
                ];

                const chartData = stages.map((stage, index) => ({
                  name: stage,
                  count: countStage(stage),
                  color: colors[index],
                }));

                const tracked = chartData.reduce(
                  (sum, item) => sum + item.count,
                  0
                );

                if (candidates.length > tracked) {
                  chartData.push({
                    name: "Other",
                    count: candidates.length - tracked,
                    color: "#94A3A0",
                  });
                }

                let cumulative = 0;

                const donutBackground = candidates.length
                  ? `conic-gradient(${chartData
                      .map((item) => {
                        const start =
                          (cumulative / candidates.length) * 100;

                        cumulative += item.count;

                        const end =
                          (cumulative / candidates.length) * 100;

                        return `${item.color} ${start}% ${end}%`;
                      })
                      .join(", ")})`
                  : "#E8F0EB";

                return (
                  <section
                    style={{
                      background: "#F8FBF9",
                      border: "1px solid #DCE9DF",
                      borderRadius: 18,
                      padding: 24,
                      marginBottom: 28,
                      breakInside: "avoid",
                    }}
                  >
                    <div style={{ marginBottom: 24 }}>
                      <div
                        style={{
                          color: "#347A65",
                          fontSize: 11,
                          fontWeight: 800,
                          letterSpacing: 2,
                          marginBottom: 8,
                        }}
                      >
                        RECRUITMENT INTELLIGENCE
                      </div>

                      <h2
                        style={{
                          fontFamily: "Georgia, serif",
                          color: "#173F3A",
                          fontSize: 25,
                          margin: "0 0 8px",
                        }}
                      >
                        Pipeline Analytics
                      </h2>

                      <p
                        style={{
                          color: "#71847A",
                          fontSize: 13,
                          margin: 0,
                        }}
                      >
                        Current stages of candidates added in{" "}
                        {periodLabel}
                      </p>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fit, minmax(280px, 1fr))",
                        gap: 20,
                      }}
                    >
                      <div
                        style={{
                          background: "#FFFFFF",
                          border: "1px solid #E2ECE5",
                          borderRadius: 16,
                          padding: 22,
                        }}
                      >
                        <h3
                          style={{
                            fontSize: 16,
                            color: "#173F3A",
                            margin: "0 0 24px",
                          }}
                        >
                          Candidate Distribution
                        </h3>

                        <div
                          style={{
                            width: 210,
                            height: 210,
                            maxWidth: "100%",
                            borderRadius: "50%",
                            background: donutBackground,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            margin: "0 auto 25px",
                          }}
                        >
                          <div
                            style={{
                              width: 145,
                              height: 145,
                              borderRadius: "50%",
                              background: "#FFFFFF",
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <strong
                              style={{
                                fontSize: 38,
                                color: "#173F3A",
                              }}
                            >
                              {candidates.length}
                            </strong>
                            <span
                              style={{
                                fontSize: 12,
                                color: "#71847A",
                              }}
                            >
                              Candidates
                            </span>
                          </div>
                        </div>

                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns:
                              "repeat(2, minmax(0, 1fr))",
                            gap: 12,
                          }}
                        >
                          {chartData.map((item) => (
                            <div
                              key={item.name}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                fontSize: 12,
                              }}
                            >
                              <span
                                style={{
                                  width: 11,
                                  height: 11,
                                  flexShrink: 0,
                                  borderRadius: 4,
                                  background: item.color,
                                }}
                              />
                              <span style={{ color: "#52665A" }}>
                                {item.name}: {item.count}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div
                        style={{
                          background: "#FFFFFF",
                          border: "1px solid #E2ECE5",
                          borderRadius: 16,
                          padding: 22,
                        }}
                      >
                        <h3
                          style={{
                            fontSize: 16,
                            color: "#173F3A",
                            margin: "0 0 25px",
                          }}
                        >
                          Hiring Stage Breakdown
                        </h3>

                        {chartData.map((item) => {
                          const percentage = candidates.length
                            ? (item.count / candidates.length) * 100
                            : 0;

                          return (
                            <div
                              key={item.name}
                              style={{ marginBottom: 19 }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  gap: 10,
                                  marginBottom: 9,
                                  fontSize: 12,
                                }}
                              >
                                <strong
                                  style={{ color: "#415A4C" }}
                                >
                                  {item.name}
                                </strong>

                                <span
                                  style={{ color: "#71847A" }}
                                >
                                  {item.count} ·{" "}
                                  {percentage.toFixed(1)}%
                                </span>
                              </div>

                              <div
                                style={{
                                  height: 11,
                                  width: "100%",
                                  background: "#EDF3EF",
                                  borderRadius: 20,
                                  overflow: "hidden",
                                }}
                              >
                                <div
                                  style={{
                                    height: "100%",
                                    width: `${percentage}%`,
                                    background: item.color,
                                    borderRadius: 20,
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })}

                        <p
                          style={{
                            color: "#84938A",
                            fontSize: 11,
                            marginTop: 20,
                          }}
                        >
                          Based on current candidate status,
                          not historical conversion rates.
                        </p>
                      </div>
                    </div>
                  </section>
                );
              })()}


             
              {(() => {
                const daysInMonth = new Date(
                  Number(month.slice(0, 4)),
                  Number(month.slice(5, 7)),
                  0
                ).getDate();

                const weeks = Array.from(
                  { length: Math.ceil(daysInMonth / 7) },
                  (_, index) => ({
                    label: `Week ${index + 1}`,
                    range: `${index * 7 + 1}–${Math.min(
                      (index + 1) * 7,
                      daysInMonth
                    )}`,
                    count: 0,
                  })
                );

                candidates.forEach((candidate) => {
                  if (!candidate.created_at) return;

                  const date = new Date(candidate.created_at);
                  if (Number.isNaN(date.getTime())) return;

                  const weekIndex = Math.floor(
                    (date.getDate() - 1) / 7
                  );

                  if (weeks[weekIndex]) {
                    weeks[weekIndex].count += 1;
                  }
                });

                const maxCount = Math.max(
                  1,
                  ...weeks.map((week) => week.count)
                );

                return (
                  <section
                    style={{
                      background: "#FFFFFF",
                      border: "1px solid #DCE9DF",
                      borderRadius: 18,
                      padding: 26,
                      marginBottom: 28,
                      breakInside: "avoid",
                    }}
                  >
                    <div style={{ marginBottom: 25 }}>
                      <div
                        style={{
                          color: "#347A65",
                          fontSize: 11,
                          fontWeight: 800,
                          letterSpacing: 2,
                          marginBottom: 9,
                        }}
                      >
                        TALENT ACQUISITION TRENDS
                      </div>

                      <h2
                        style={{
                          fontFamily: "Georgia, serif",
                          color: "#173F3A",
                          fontSize: 25,
                          margin: "0 0 8px",
                        }}
                      >
                        Weekly Candidate Growth
                      </h2>

                      <p
                        style={{
                          color: "#71847A",
                          fontSize: 13,
                          margin: 0,
                        }}
                      >
                        New candidates added each week in {periodLabel}
                      </p>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))`,
                        gap: 12,
                        padding: "10px 0",
                      }}
                    >
                      {weeks.map((week) => (
                        <div
                          key={week.label}
                          style={{ textAlign: "center", minWidth: 0 }}
                        >
                          <div
                            style={{
                              height: 190,
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              justifyContent: "flex-end",
                              gap: 8,
                              borderBottom: "1px solid #DCE9DF",
                            }}
                          >
                            <strong
                              style={{
                                color: "#173F3A",
                                fontSize: 18,
                              }}
                            >
                              {week.count}
                            </strong>

                            <div
                              style={{
                                width: "65%",
                                maxWidth: 65,
                                height: `${
                                  (week.count / maxCount) * 145
                                }px`,
                                background:
                                  "linear-gradient(180deg, #65B596, #173F3A)",
                                borderRadius: "9px 9px 0 0",
                              }}
                            />
                          </div>

                          <div
                            style={{
                              fontWeight: 700,
                              color: "#173F3A",
                              fontSize: 13,
                              marginTop: 14,
                            }}
                          >
                            {week.label}
                          </div>

                          <div
                            style={{
                              color: "#819388",
                              fontSize: 11,
                              marginTop: 5,
                            }}
                          >
                            Days {week.range}
                          </div>
                        </div>
                      ))}
                    </div>

                    <p
                      style={{
                        color: "#819388",
                        fontSize: 11,
                        marginTop: 16,
                      }}
                    >
                      Based on candidate creation dates in the
                      selected reporting month.
                    </p>
                  </section>
                );
              })()}

              
              {(() => {
                const hired = countStage("Hired");
                const rejected = countStage("Rejected");

                const inProgress = [
                  "Applied",
                  "Screening",
                  "Interview",
                  "Shortlisted",
                ].reduce(
                  (sum, stage) => sum + countStage(stage),
                  0
                );

                const decided = hired + rejected;
                const other = Math.max(
                  0,
                  candidates.length - hired - rejected - inProgress
                );

                const metrics = [
                  {
                    label: "HIRED CANDIDATES",
                    value: hired,
                    color: "#173F3A",
                  },
                  {
                    label: "IN PROGRESS",
                    value: inProgress,
                    color: "#347A65",
                  },
                  {
                    label: "FINAL DECISIONS",
                    value: decided,
                    color: "#D2A85F",
                  },
                  {
                    label: "POSITIVE DECISION SHARE",
                    value: decided
                      ? `${Math.round((hired / decided) * 100)}%`
                      : "—",
                    color: "#5DAA91",
                  },
                ];

                const outcomeMix = [
                  {
                    name: "In Progress",
                    count: inProgress,
                    color: "#347A65",
                  },
                  {
                    name: "Hired",
                    count: hired,
                    color: "#173F3A",
                  },
                  {
                    name: "Rejected",
                    count: rejected,
                    color: "#D97676",
                  },
                  {
                    name: "Other",
                    count: other,
                    color: "#A7B7AF",
                  },
                ];

                return (
                  <section
                    style={{
                      background: "#FFFFFF",
                      border: "1px solid #DCE9DF",
                      borderRadius: 18,
                      padding: 26,
                      marginBottom: 28,
                      breakInside: "avoid",
                    }}
                  >
                    <div
                      style={{
                        color: "#347A65",
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: 2,
                        marginBottom: 10,
                      }}
                    >
                      HIRING INTELLIGENCE
                    </div>

                    <h2
                      style={{
                        fontFamily: "Georgia, serif",
                        color: "#173F3A",
                        fontSize: 25,
                        margin: "0 0 10px",
                      }}
                    >
                      Hiring Performance Overview
                    </h2>

                    <p
                      style={{
                        color: "#71847A",
                        fontSize: 13,
                        marginBottom: 25,
                      }}
                    >
                      Current hiring outcomes for candidates
                      added in {periodLabel}.
                    </p>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fit, minmax(165px, 1fr))",
                        gap: 14,
                        marginBottom: 30,
                      }}
                    >
                      {metrics.map((item) => (
                        <div
                          key={item.label}
                          style={{
                            background: "#F7FAF8",
                            border: "1px solid #E2ECE5",
                            borderTop: `4px solid ${item.color}`,
                            borderRadius: 14,
                            padding: 20,
                          }}
                        >
                          <div
                            style={{
                              fontSize: 11,
                              color: "#71847A",
                              fontWeight: 700,
                              minHeight: 30,
                            }}
                          >
                            {item.label}
                          </div>

                          <div
                            style={{
                              fontSize: 34,
                              fontWeight: 800,
                              color: item.color,
                              marginTop: 12,
                            }}
                          >
                            {item.value}
                          </div>
                        </div>
                      ))}
                    </div>

                    <h3
                      style={{
                        color: "#173F3A",
                        fontSize: 16,
                        marginBottom: 18,
                      }}
                    >
                      Hiring Outcome Mix
                    </h3>

                    <div
                      style={{
                        height: 26,
                        background: "#EDF3EF",
                        borderRadius: 12,
                        display: "flex",
                        overflow: "hidden",
                        marginBottom: 18,
                      }}
                    >
                      {outcomeMix.map((item) => (
                        <div
                          key={item.name}
                          title={`${item.name}: ${item.count}`}
                          style={{
                            width: `${
                              candidates.length
                                ? (item.count / candidates.length) * 100
                                : 0
                            }%`,
                            height: "100%",
                            background: item.color,
                          }}
                        />
                      ))}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 18,
                      }}
                    >
                      {outcomeMix.map((item) => (
                        <div
                          key={item.name}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            fontSize: 12,
                            color: "#52665A",
                          }}
                        >
                          <span
                            style={{
                              width: 12,
                              height: 12,
                              borderRadius: 3,
                              background: item.color,
                            }}
                          />
                          {item.name}: {item.count}
                        </div>
                      ))}
                    </div>

                    <p
                      style={{
                        fontSize: 11,
                        color: "#819388",
                        marginTop: 20,
                      }}
                    >
                      Positive Decision Share = Hired /
                      (Hired + Rejected). This is a current
                      status indicator, not a historical
                      conversion or offer acceptance rate.
                    </p>
                  </section>
                );
              
              })()}

              {/* JOB PERFORMANCE ANALYTICS */}
              {(() => {
                const jobRows = jobs
                  .map((job) => {
                    const linked = candidates.filter(
                      (candidate) =>
                        String(candidate.job_id || "") ===
                        String(job.id)
                    );

                    return {
                      id: job.id,
                      title: job.title || "Untitled Job",
                      total: linked.length,
                      hired: linked.filter(
                        (c) => c.status === "Hired"
                      ).length,
                      interview: linked.filter(
                        (c) => c.status === "Interview"
                      ).length,
                      shortlisted: linked.filter(
                        (c) => c.status === "Shortlisted"
                      ).length,
                    };
                  })
                  .sort((a, b) => b.total - a.total)
                  .slice(0, 8);

                const maxCount = Math.max(
                  1,
                  ...jobRows.map((job) => job.total)
                );

                return (
                  <section
                    style={{
                      background: "#FFFFFF",
                      border: "1px solid #DCE9DF",
                      borderRadius: 18,
                      padding: 26,
                      marginBottom: 28,
                      breakInside: "avoid",
                    }}
                  >
                    <div
                      style={{
                        color: "#347A65",
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: 2,
                      }}
                    >
                      JOB INTELLIGENCE
                    </div>

                    <h2
                      style={{
                        fontFamily: "Georgia, serif",
                        color: "#173F3A",
                        fontSize: 25,
                      }}
                    >
                      Job Performance Analytics
                    </h2>

                    <p
                      style={{
                        color: "#71847A",
                        fontSize: 13,
                        marginBottom: 26,
                      }}
                    >
                      Top 8 jobs by candidates added in {periodLabel}.
                    </p>

                    {jobRows.length === 0 ? (
                      <p style={{ color: "#819388" }}>
                        No jobs available for this company.
                      </p>
                    ) : (
                      jobRows.map((job) => (
                        <div
                          key={job.id}
                          style={{ marginBottom: 24 }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: 12,
                              marginBottom: 9,
                            }}
                          >
                            <strong
                              style={{
                                color: "#173F3A",
                                fontSize: 13,
                              }}
                            >
                              {job.title}
                            </strong>
                            <span
                              style={{
                                color: "#347A65",
                                fontWeight: 800,
                                fontSize: 13,
                              }}
                            >
                              {job.total} Candidates
                            </span>
                          </div>

                          <div
                            style={{
                              background: "#EDF3EF",
                              height: 16,
                              borderRadius: 10,
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                width: `${(job.total / maxCount) * 100}%`,
                                height: "100%",
                                background: "#347A65",
                                borderRadius: 10,
                              }}
                            />
                          </div>

                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 16,
                              marginTop: 10,
                              color: "#71847A",
                              fontSize: 12,
                            }}
                          >
                            <span>Interview: {job.interview}</span>
                            <span>Shortlisted: {job.shortlisted}</span>
                            <span>Hired: {job.hired}</span>
                          </div>
                        </div>
                      ))
                    )}

                    <p
                      style={{
                        marginTop: 20,
                        color: "#819388",
                        fontSize: 11,
                      }}
                    >
                      Based on current candidate statuses and
                      job-linked candidates in the selected month.
                    </p>
                  </section>
                );
              
              })()}

              {/* RECRUITMENT BOTTLENECK ANALYSIS */}
              {(() => {
                const activeStages = [
                  "Applied",
                  "Screening",
                  "Interview",
                  "Shortlisted",
                ];

                const stageRows = activeStages.map((stage) => ({
                  name: stage,
                  count: countStage(stage),
                }));

                const activeTotal = stageRows.reduce(
                  (sum, item) => sum + item.count,
                  0
                );

                const maxCount = Math.max(
                  0,
                  ...stageRows.map((item) => item.count)
                );

                const largestStage = stageRows.find(
                  (item) => item.count === maxCount
                );

                const recommendations = {
                  Applied: "Review new applications and prioritize initial screening.",
                  Screening: "Review screening decisions and move qualified candidates forward.",
                  Interview: "Follow up on interview feedback and pending decisions.",
                  Shortlisted: "Align with hiring managers on final selection and next steps.",
                };

                return (
                  <section
                    style={{
                      background: "#FFFFFF",
                      border: "1px solid #DCE9DF",
                      borderRadius: 18,
                      padding: 26,
                      marginBottom: 28,
                      breakInside: "avoid",
                    }}
                  >
                    <div
                      style={{
                        color: "#347A65",
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: 2,
                      }}
                    >
                      RECRUITMENT INTELLIGENCE
                    </div>

                    <h2
                      style={{
                        fontFamily: "Georgia, serif",
                        color: "#173F3A",
                        fontSize: 25,
                        marginBottom: 10,
                      }}
                    >
                      Recruitment Bottleneck Analysis
                    </h2>

                    <p
                      style={{
                        color: "#71847A",
                        fontSize: 13,
                        marginBottom: 24,
                      }}
                    >
                      Identify where active candidates are concentrated
                      during {periodLabel}.
                    </p>

                    {activeTotal === 0 ? (
                      <p style={{ color: "#819388" }}>
                        No active candidates available for this period.
                      </p>
                    ) : (
                      <>
                        <div
                          style={{
                            background: "#F2F8F4",
                            border: "1px solid #DCE9DF",
                            borderRadius: 14,
                            padding: 20,
                            marginBottom: 26,
                          }}
                        >
                          <div
                            style={{
                              fontSize: 11,
                              fontWeight: 800,
                              color: "#347A65",
                              letterSpacing: 1,
                            }}
                          >
                            LARGEST ACTIVE STAGE
                          </div>

                          <div
                            style={{
                              fontSize: 26,
                              fontWeight: 800,
                              color: "#173F3A",
                              marginTop: 10,
                            }}
                          >
                            {largestStage.name}
                          </div>

                          <div
                            style={{
                              fontSize: 13,
                              color: "#52665A",
                              marginTop: 6,
                            }}
                          >
                            {largestStage.count} of {activeTotal} active candidates
                            {" "}(
                            {Math.round(
                              (largestStage.count / activeTotal) * 100
                            )}
                            %)
                          </div>
                        </div>

                        {stageRows.map((item) => (
                          <div
                            key={item.name}
                            style={{ marginBottom: 22 }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                marginBottom: 8,
                                gap: 12,
                                fontSize: 13,
                              }}
                            >
                              <strong style={{ color: "#173F3A" }}>
                                {item.name}
                              </strong>

                              <span style={{ color: "#52665A" }}>
                                {item.count} candidates |{" "}
                                {Math.round(
                                  (item.count / activeTotal) * 100
                                )}
                                %
                              </span>
                            </div>

                            <div
                              style={{
                                height: 16,
                                background: "#EDF3EF",
                                borderRadius: 10,
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  height: "100%",
                                  width: `${
                                    (item.count / Math.max(1, maxCount)) * 100
                                  }%`,
                                  background:
                                    item.name === largestStage.name
                                      ? "#D2A85F"
                                      : "#347A65",
                                  borderRadius: 10,
                                }}
                              />
                            </div>
                          </div>
                        ))}

                        <div
                          style={{
                            borderLeft: "4px solid #347A65",
                            background: "#F7FAF8",
                            borderRadius: 10,
                            padding: 18,
                            marginTop: 24,
                          }}
                        >
                          <strong style={{ color: "#173F3A" }}>
                            Recommended Action
                          </strong>

                          <p
                            style={{
                              color: "#52665A",
                              fontSize: 13,
                              lineHeight: 1.7,
                              marginBottom: 0,
                            }}
                          >
                            {recommendations[largestStage.name]}
                          </p>
                        </div>
                      </>
                    )}

                    <p
                      style={{
                        color: "#819388",
                        fontSize: 11,
                        marginTop: 22,
                      }}
                    >
                      This analysis highlights candidate concentration
                      by current stage. A confirmed process bottleneck
                      requires stage entry dates and time-in-stage data.
                    </p>
                  </section>
                );
              
              })()}

              {/* RECRUITMENT DATA QUALITY SCORE */}
              {(() => {
                const total = candidates.length;

                const linked = candidates.filter((candidate) =>
                  jobs.some(
                    (job) =>
                      String(job.id) === String(candidate.job_id)
                  )
                ).length;

                const validStatus = candidates.filter((candidate) =>
                  stages.some(
                    (stage) =>
                      stage.toLowerCase() ===
                      String(candidate.status || "").toLowerCase()
                  )
                ).length;

                const withTitle = candidates.filter(
                  (candidate) =>
                    String(candidate.current_title || "").trim() !== ""
                ).length;

                const checks = [
                  { name: "Job Assignment", count: linked },
                  { name: "Pipeline Status", count: validStatus },
                  { name: "Candidate Job Title", count: withTitle },
                ];

                const score = total
                  ? Math.round(
                      (checks.reduce(
                        (sum, item) => sum + item.count,
                        0
                      ) /
                        (total * checks.length)) *
                        100
                    )
                  : null;

                const weakest = checks.reduce(
                  (lowest, item) =>
                    item.count < lowest.count ? item : lowest,
                  checks[0]
                );

                return (
                  <section
                    style={{
                      background: "#FFFFFF",
                      border: "1px solid #DCE9DF",
                      borderRadius: 18,
                      padding: 26,
                      marginBottom: 28,
                    }}
                  >
                    <div
                      style={{
                        color: "#347A65",
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: 2,
                      }}
                    >
                      DATA INTELLIGENCE
                    </div>

                    <h2
                      style={{
                        fontFamily: "Georgia, serif",
                        color: "#173F3A",
                        fontSize: 25,
                      }}
                    >
                      Recruitment Data Quality Score
                    </h2>

                    <p style={{ color: "#71847A", fontSize: 13 }}>
                      Data completeness for candidates added in {periodLabel}.
                    </p>

                    <div
                      style={{
                        fontSize: 48,
                        fontWeight: 800,
                        color: "#245C4A",
                        margin: "20px 0",
                      }}
                    >
                      {score === null ? "—" : `${score}%`}
                    </div>

                    {total === 0 ? (
                      <p style={{ color: "#71847A" }}>
                        No candidates available for this period.
                      </p>
                    ) : (
                      <>
                        {checks.map((item) => {
                          const percentage = Math.round(
                            (item.count / total) * 100
                          );

                          return (
                            <div
                              key={item.name}
                              style={{ marginBottom: 20 }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  gap: 12,
                                  marginBottom: 8,
                                  fontSize: 13,
                                }}
                              >
                                <strong>{item.name}</strong>
                                <span>
                                  {item.count}/{total} ({percentage}%)
                                </span>
                              </div>

                              <div
                                style={{
                                  height: 12,
                                  background: "#EDF3EF",
                                  borderRadius: 8,
                                  overflow: "hidden",
                                }}
                              >
                                <div
                                  style={{
                                    width: `${percentage}%`,
                                    height: "100%",
                                    background: "#347A65",
                                    borderRadius: 8,
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })}

                        <div
                          style={{
                            background: "#F7FAF8",
                            borderLeft: "4px solid #D2A85F",
                            padding: 16,
                            borderRadius: 10,
                            marginTop: 22,
                            fontSize: 13,
                            color: "#52665A",
                          }}
                        >
                          <strong>Priority Improvement:</strong>{" "}
                          {weakest.name === "Job Assignment"
                            ? "Link candidates to their relevant jobs."
                            : weakest.name === "Pipeline Status"
                            ? "Review missing or unrecognized candidate statuses."
                            : "Complete missing candidate job titles."}
                        </div>
                      </>
                    )}

                    <p
                      style={{
                        color: "#819388",
                        fontSize: 11,
                        marginTop: 20,
                      }}
                    >
                      Score is the average completeness of three
                      fields: valid job assignment, pipeline status,
                      and candidate title. This is a data quality
                      indicator, not an AI prediction.
                    </p>
                  </section>
                );
              
              })()}

              {/* PIPELINE HEALTH SCORE */}
              {(() => {
                const total = candidates.length;

                const applied = countStage("Applied");
                const screening = countStage("Screening");
                const interview = countStage("Interview");
                const shortlisted = countStage("Shortlisted");
                const hired = countStage("Hired");
                const rejected = countStage("Rejected");

                const active =
                  applied + screening + interview + shortlisted;

                const decided = hired + rejected;

                const decisionCoverage = total
                  ? Math.round((decided / total) * 100)
                  : 0;

                const progressionShare = active
                  ? Math.round(
                      ((interview + shortlisted) / active) * 100
                    )
                  : 0;

                const jobLinked = candidates.filter((candidate) =>
                  jobs.some(
                    (job) =>
                      String(job.id) === String(candidate.job_id)
                  )
                ).length;

                const assignmentCoverage = total
                  ? Math.round((jobLinked / total) * 100)
                  : 0;

                const score = total
                  ? Math.round(
                      decisionCoverage * 0.3 +
                      progressionShare * 0.35 +
                      assignmentCoverage * 0.35
                    )
                  : null;

                const components = [
                  {
                    label: "Decision Coverage",
                    value: decisionCoverage,
                    weight: "30%",
                  },
                  {
                    label: "Advanced Stage Share",
                    value: progressionShare,
                    weight: "35%",
                  },
                  {
                    label: "Job Assignment Coverage",
                    value: assignmentCoverage,
                    weight: "35%",
                  },
                ];

                const priority = [...components].sort(
                  (a, b) => a.value - b.value
                )[0];

                const advice = {
                  "Decision Coverage":
                    "Review candidates awaiting final decisions and follow up with hiring managers.",
                  "Advanced Stage Share":
                    "Review screening outcomes and move suitable candidates toward interviews.",
                  "Job Assignment Coverage":
                    "Assign candidates to the correct job openings to improve reporting accuracy.",
                };

                return (
                  <section
                    style={{
                      background: "#FFFFFF",
                      border: "1px solid #DCE9DF",
                      borderRadius: 18,
                      padding: 26,
                      marginBottom: 28,
                      breakInside: "avoid",
                    }}
                  >
                    <div
                      style={{
                        color: "#347A65",
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: 2,
                      }}
                    >
                      PIPELINE INTELLIGENCE
                    </div>

                    <h2
                      style={{
                        fontFamily: "Georgia, serif",
                        color: "#173F3A",
                        fontSize: 25,
                        marginBottom: 10,
                      }}
                    >
                      Pipeline Health Score
                    </h2>

                    <p
                      style={{
                        color: "#71847A",
                        fontSize: 13,
                        marginBottom: 20,
                      }}
                    >
                      A weighted operational indicator for candidates
                      added in {periodLabel}.
                    </p>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: 24,
                        marginBottom: 26,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 54,
                          fontWeight: 800,
                          color: "#173F3A",
                        }}
                      >
                        {score === null ? "—" : `${score}/100`}
                      </div>

                      <div
                        style={{
                          fontSize: 13,
                          color: "#52665A",
                          maxWidth: 360,
                          lineHeight: 1.7,
                        }}
                      >
                        {score === null
                          ? "No candidates available for this period."
                          : "A composite view of decisions, active-stage progression, and job assignment."}
                      </div>
                    </div>

                    {score !== null && (
                      <>
                        {components.map((item) => (
                          <div
                            key={item.label}
                            style={{ marginBottom: 20 }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                gap: 12,
                                fontSize: 13,
                                marginBottom: 8,
                              }}
                            >
                              <strong style={{ color: "#173F3A" }}>
                                {item.label}
                              </strong>

                              <span style={{ color: "#52665A" }}>
                                {item.value}% | Weight: {item.weight}
                              </span>
                            </div>

                            <div
                              style={{
                                height: 13,
                                background: "#EDF3EF",
                                borderRadius: 9,
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  width: `${item.value}%`,
                                  height: "100%",
                                  background: "#347A65",
                                  borderRadius: 9,
                                }}
                              />
                            </div>
                          </div>
                        ))}

                        <div
                          style={{
                            background: "#F7FAF8",
                            borderLeft: "4px solid #D2A85F",
                            borderRadius: 10,
                            padding: 18,
                            marginTop: 24,
                          }}
                        >
                          <strong
                            style={{
                              color: "#173F3A",
                              fontSize: 13,
                            }}
                          >
                            Recommended Priority
                          </strong>

                          <p
                            style={{
                              color: "#52665A",
                              fontSize: 13,
                              lineHeight: 1.7,
                              marginBottom: 0,
                            }}
                          >
                            {advice[priority.label]}
                          </p>
                        </div>
                      </>
                    )}

                    <p
                      style={{
                        color: "#819388",
                        fontSize: 11,
                        marginTop: 22,
                      }}
                    >
                      This is a custom weighted operational score,
                      not a validated prediction of hiring success.
                      Stage history and time-to-hire data are not
                      included.
                    </p>
                  </section>
                );
              
              })()}

              {/* SMART RECRUITMENT ALERTS */}
              {(() => {
                const total = candidates.length;
                const activeStages = [
                  "Applied",
                  "Screening",
                  "Interview",
                  "Shortlisted",
                ];

                const active = activeStages.reduce(
                  (sum, stage) => sum + countStage(stage),
                  0
                );

                const alerts = [];

                const missingJobs = candidates.filter(
                  (candidate) =>
                    !jobs.some(
                      (job) =>
                        String(job.id) === String(candidate.job_id)
                    )
                ).length;

                const missingTitles = candidates.filter(
                  (candidate) =>
                    !String(candidate.current_title || "").trim()
                ).length;

                const unknownStatuses = candidates.filter(
                  (candidate) =>
                    !stages.some(
                      (stage) =>
                        stage.toLowerCase() ===
                        String(candidate.status || "")
                          .trim()
                          .toLowerCase()
                    )
                ).length;

                

                if (
                  total >= 3 &&
                  missingTitles / total >= 0.25
                ) {
                  alerts.push({
                    level: "Medium",
                    title: "Incomplete Candidate Profiles",
                    detail: `${missingTitles} of ${total} candidates have no current job title.`,
                    action:
                      "Complete missing job titles to improve search, segmentation, and reporting.",
                  });
                }

                if (unknownStatuses > 0) {
                  alerts.push({
                    level: "High",
                    title: "Unrecognized Pipeline Status",
                    detail: `${unknownStatuses} candidate records have a missing or unrecognized pipeline status.`,
                    action:
                      "Review these records and update their recruitment stages.",
                  });
                }

                const screening = countStage("Screening");

                if (
                  active >= 3 &&
                  screening / active >= 0.4
                ) {
                  alerts.push({
                    level: "Medium",
                    title: "High Screening Concentration",
                    detail: `${screening} of ${active} active candidates (${Math.round(
                      (screening / active) * 100
                    )}%) are currently in Screening.`,
                    action:
                      "Review screening outcomes and identify candidates ready for the next stage.",
                  });
                }

                const interview = countStage("Interview");

                if (
                  active >= 3 &&
                  interview / active >= 0.5
                ) {
                  alerts.push({
                    level: "Medium",
                    title: "High Interview Concentration",
                    detail: `${interview} of ${active} active candidates are currently in Interview.`,
                    action:
                      "Check interview feedback and coordinate pending hiring decisions.",
                  });
                }

                alerts.sort(
                  (a, b) =>
                    (a.level === "High" ? 0 : 1) -
                    (b.level === "High" ? 0 : 1)
                );

                return (
                  <section
                    style={{
                      background: "#FFFFFF",
                      border: "1px solid #DCE9DF",
                      borderRadius: 18,
                      padding: 26,
                      marginBottom: 28,
                    }}
                  >
                    <div
                      style={{
                        color: "#347A65",
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: 2,
                      }}
                    >
                      RECRUITMENT INTELLIGENCE
                    </div>

                    <h2
                      style={{
                        fontFamily: "Georgia, serif",
                        color: "#173F3A",
                        fontSize: 25,
                        marginBottom: 10,
                      }}
                    >
                      Smart Recruitment Alerts
                    </h2>

                    <p
                      style={{
                        color: "#71847A",
                        fontSize: 13,
                        lineHeight: 1.7,
                      }}
                    >
                      Automated operational alerts based on candidates
                      added in {periodLabel}.
                    </p>

                    <div
                      style={{
                        background: "#F7FAF8",
                        padding: 16,
                        borderRadius: 12,
                        margin: "20px 0",
                      }}
                    >
                      <strong
                        style={{
                          fontSize: 28,
                          color: "#245C4A",
                        }}
                      >
                        {alerts.length}
                      </strong>
                      <span
                        style={{
                          marginLeft: 12,
                          color: "#52665A",
                          fontSize: 13,
                        }}
                      >
                        Alerts Detected
                      </span>
                    </div>

                    {total === 0 ? (
                      <p style={{ color: "#71847A" }}>
                        No candidates available for this period.
                      </p>
                    ) : alerts.length === 0 ? (
                      <div
                        style={{
                          background: "#F0F8F3",
                          border: "1px solid #D0E7D8",
                          padding: 20,
                          borderRadius: 12,
                          color: "#245C4A",
                          fontSize: 13,
                        }}
                      >
                        No alerts triggered by the current rules.
                        Continue monitoring recruitment data.
                      </div>
                    ) : (
                      <div
                        style={{
                          display: "grid",
                          gap: 16,
                          marginTop: 20,
                        }}
                      >
                        {alerts.map((alert, index) => (
                          <div
                            key={`${alert.title}-${index}`}
                            style={{
                              border:
                                "1px solid #E2ECE5",
                              borderLeft: `5px solid ${
                                alert.level === "High"
                                  ? "#C35A4A"
                                  : "#D2A85F"
                              }`,
                              borderRadius: 12,
                              padding: 20,
                              background: "#FCFDFC",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                gap: 12,
                                flexWrap: "wrap",
                              }}
                            >
                              <strong
                                style={{
                                  color: "#173F3A",
                                  fontSize: 15,
                                }}
                              >
                                {alert.title}
                              </strong>

                              <span
                                style={{
                                  color:
                                    alert.level === "High"
                                      ? "#A64639"
                                      : "#956A20",
                                  fontSize: 11,
                                  fontWeight: 800,
                                }}
                              >
                                {alert.level} Priority
                              </span>
                            </div>

                            <p
                              style={{
                                color: "#52665A",
                                fontSize: 13,
                                lineHeight: 1.7,
                                marginTop: 12,
                              }}
                            >
                              {alert.detail}
                            </p>

                            <div
                              style={{
                                background: "#F1F6F2",
                                padding: 14,
                                borderRadius: 8,
                                fontSize: 12,
                                color: "#245C4A",
                                lineHeight: 1.7,
                              }}
                            >
                              <strong>Recommended Action:</strong>{" "}
                              {alert.action}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <p
                      style={{
                        color: "#819388",
                        fontSize: 11,
                        marginTop: 22,
                        lineHeight: 1.7,
                      }}
                    >
                      Alerts are generated using transparent,
                      rule-based thresholds. High stage
                      concentration does not necessarily indicate
                      a delay. This feature is not yet powered
                      by a predictive AI model.
                    </p>
                  </section>
                );
              
              })()}

              {/* JOB-LEVEL INTELLIGENCE */}
              {(() => {
                const jobInsights = jobs
                  .map((job) => {
                    const linked = candidates.filter(
                      (candidate) =>
                        String(candidate.job_id || "") ===
                        String(job.id)
                    );

                    const count = (status) =>
                      linked.filter(
                        (candidate) =>
                          String(candidate.status || "")
                            .trim()
                            .toLowerCase() === status.toLowerCase()
                      ).length;

                    const total = linked.length;
                    const applied = count("Applied");
                    const screening = count("Screening");
                    const interview = count("Interview");
                    const shortlisted = count("Shortlisted");
                    const hired = count("Hired");

                    let insight = "Pipeline Activity";
                    let recommendation =
                      "Continue reviewing candidates and updating recruitment stages.";

                    if (total === 0) {
                      insight = "No New Candidates This Month";
                      recommendation =
                        "Review sourcing activity if this job is actively hiring.";
                    } else if (
                      total >= 3 &&
                      screening / total >= 0.5
                    ) {
                      insight = "Screening Concentration";
                      recommendation =
                        "Review screening decisions and identify candidates ready for interviews.";
                    } else if (
                      total >= 3 &&
                      applied / total >= 0.5
                    ) {
                      insight = "Application Review Priority";
                      recommendation =
                        "Prioritize initial application reviews and screening.";
                    } else if (
                      interview + shortlisted >= 2 &&
                      hired === 0
                    ) {
                      insight = "Candidates Awaiting Next Steps";
                      recommendation =
                        "Review interview feedback and coordinate next steps with the hiring manager.";
                    } else if (hired > 0) {
                      insight = "Hiring Outcome Recorded";
                      recommendation =
                        "Review remaining candidates and confirm whether further hiring is required.";
                    }

                    return {
                      id: job.id,
                      title: job.title || "Untitled Job",
                      total,
                      applied,
                      screening,
                      interview,
                      shortlisted,
                      hired,
                      insight,
                      recommendation,
                    };
                  })
                  .sort((a, b) => b.total - a.total)
                  .slice(0, 8);

                return (
                  <section
                    style={{
                      background: "#FFFFFF",
                      border: "1px solid #DCE9DF",
                      borderRadius: 18,
                      padding: 26,
                      marginBottom: 28,
                    }}
                  >
                    <div
                      style={{
                        color: "#347A65",
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: 2,
                      }}
                    >
                      JOB INTELLIGENCE
                    </div>

                    <h2
                      style={{
                        fontFamily: "Georgia, serif",
                        color: "#173F3A",
                        fontSize: 25,
                      }}
                    >
                      Job-Level Intelligence
                    </h2>

                    <p
                      style={{
                        color: "#71847A",
                        fontSize: 13,
                        lineHeight: 1.7,
                      }}
                    >
                      Individual job analysis and recommended
                      actions for candidates added in {periodLabel}.
                    </p>

                    {jobInsights.length === 0 ? (
                      <p style={{ color: "#71847A" }}>
                        No jobs available for analysis.
                      </p>
                    ) : (
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
                          gap: 18,
                          marginTop: 24,
                        }}
                      >
                        {jobInsights.map((job) => (
                          <div
                            key={job.id}
                            style={{
                              background: "#F9FBF9",
                              border: "1px solid #E1EBE4",
                              borderRadius: 14,
                              padding: 20,
                              minWidth: 0,
                            }}
                          >
                            <h3
                              style={{
                                color: "#173F3A",
                                fontSize: 17,
                                marginTop: 0,
                              }}
                            >
                              {job.title}
                            </h3>

                            <div
                              style={{
                                fontSize: 30,
                                fontWeight: 800,
                                color: "#245C4A",
                              }}
                            >
                              {job.total}
                            </div>

                            <p
                              style={{
                                color: "#71847A",
                                fontSize: 12,
                              }}
                            >
                              Candidates added this month
                            </p>

                            <div
                              style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 10,
                                fontSize: 12,
                                color: "#52665A",
                                marginBottom: 18,
                              }}
                            >
                              <span>Applied: {job.applied}</span>
                              <span>Screening: {job.screening}</span>
                              <span>Interview: {job.interview}</span>
                              <span>Shortlisted: {job.shortlisted}</span>
                              <span>Hired: {job.hired}</span>
                            </div>

                            <div
                              style={{
                                borderTop: "1px solid #DCE9DF",
                                paddingTop: 14,
                              }}
                            >
                              <strong
                                style={{
                                  color: "#245C4A",
                                  fontSize: 13,
                                }}
                              >
                                {job.insight}
                              </strong>

                              <p
                                style={{
                                  color: "#52665A",
                                  fontSize: 12,
                                  lineHeight: 1.7,
                                }}
                              >
                                {job.recommendation}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <p
                      style={{
                        color: "#819388",
                        fontSize: 11,
                        marginTop: 20,
                        lineHeight: 1.7,
                      }}
                    >
                      Insights use current statuses of candidates
                      created in the selected month. They do not
                      measure time in stage, historical conversion,
                      or actual hiring delays.
                    </p>
                  </section>
                );
              })()}

              <div






                style={{
                  breakBefore: "page",
                  pageBreakBefore: "always",
                  background: "#f7faf8",
                  border: "1px solid #dce9df",
                  borderLeft: "4px solid #245c4a",
                  borderRadius: 12,
                  padding: 18,
                  marginBottom: 18,
                }}
              >


                <div style={{
                  color: "#245c4a",
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: 1.2,
                  marginBottom: 12,
                }}>
                  KEY RECRUITMENT INSIGHTS
                </div>

                <div style={{ fontSize: 13, lineHeight: 2, color: "#33443b" }}>
                  <div>
                    <strong>Pipeline Focus:</strong>{" "}
                    {countStage("Screening")} candidates are currently in screening.
                  </div>
                  <div>
                    <strong>Hiring Outcome:</strong>{" "}
                    {countStage("Hired")} {countStage("Hired") === 1 ? "candidate is" : "candidates are"} currently marked as hired.
                  </div>
                  <div>
                    <strong>Interview Readiness:</strong>{" "}

{countStage("Interview") === 0
  ? `No interviews are currently scheduled in the pipeline. Recommended Action: Review the ${countStage("Screening")} candidates in screening and identify those ready for interviews.`
  : `${countStage("Interview")} candidates are currently in the interview stage. Recommended Action: Follow up on interview feedback and next steps.`}

                  </div>

                 
              </div>
</div>
              <h3
                style={{
                  fontFamily: "Georgia, serif",
                  fontSize: 21,
                  marginBottom: 15,
                
              }}
>
                Candidate Details
              </h3>

              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 13,
                  }}
                >
                  <thead>
                    <tr style={{ background: "#eaf2ed" }}>
                      {[
                        "Candidate Name",
                        "Current Title",
                        "Pipeline Status",
                        "Date Added",
                      ].map((heading) => (
                        <th
                          key={heading}
                          style={{
                            textAlign: "left",
                            padding: 12,
                            borderBottom:
                              "2px solid #dce9df",
                          }}
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {candidates.map((candidate) => (
                      <tr key={candidate.id}>
                        <td
                          style={{
                            padding: 12,
                            borderBottom: "1px solid #eee",
                          }}
                        >
                          {candidate.full_name || "Unnamed"}
                        </td>

                        <td
                          style={{
                            padding: 12,
                            borderBottom: "1px solid #eee",
                          }}
                        >
                          {candidate.current_title || "—"}
                        </td>

                        <td
                          style={{
                            padding: 12,
                            borderBottom: "1px solid #eee",
                          }}
                        >
                          {candidate.status || "—"}
                        </td>

                        <td
                          style={{
                            padding: 12,
                            borderBottom: "1px solid #eee",
                          }}
                        >
                          {candidate.created_at
                            ? new Date(
                                candidate.created_at
                              ).toLocaleDateString("en-GB")
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {candidates.length === 0 && (
                  <p
                    style={{
                      textAlign: "center",
                      color: "#777",
                      padding: 20,
                    }}
                  >
                    No candidates were added during this month.
                  </p>
                )}
              </div>
            </>
          )}

          <div
            style={{
              borderTop: "1px solid #eee",
              marginTop: 30,
              paddingTop: 15,
              color: "#888",
              fontSize: 11,
            }}
          >
            Generated by Inspire Match ATS
            <div style={{ marginTop: 5 }}>
              Hire Better. Inspire More.
            </div>
            <div style={{ marginTop: 8 }}>
              This report groups candidates added in the
              selected month by their current pipeline status.
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
