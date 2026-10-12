
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
          "id, full_name, current_title, status, created_at"
        )
        .or(
          `company_id.eq.${companyId},and(company_id.is.null,user_id.eq.${authData.user.id})`
        )
        .gte("created_at", start.toISOString())
        .lt("created_at", end.toISOString())
        .order("created_at", { ascending: false });


      if (!active) return;

      if (queryError) {
        setError("Could not load report data.");
        setCandidates([]);
      } else {
        setCandidates(data || []);
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
