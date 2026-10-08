
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
        .eq("user_id", authData.user.id)
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
              borderBottom: `3px solid ${green}`,
              paddingBottom: 20,
              marginBottom: 25,
            }}
          >
            <div
              style={{
                color: green,
                fontSize: 12,
                letterSpacing: 2,
                fontWeight: 700,
                marginBottom: 10,
              }}
            >
              HIRE & INSPIRE BY CHRISTINE
            </div>

            <h2
              style={{
                fontFamily: "Georgia, serif",
                fontSize: 28,
                margin: "0 0 8px",
              }}
            >
              Candidate Pipeline Report
            </h2>

            <p style={{ color: "#777", margin: 0 }}>
              Reporting Period: {periodLabel}
            </p>
          </div>

          {loading ? (
            <p>Loading report...</p>
          ) : error ? (
            <p style={{ color: "#b91c1c" }}>{error}</p>
          ) : (
            <>
              <div
                style={{
                  background: "#f0f6f2",
                  borderRadius: 12,
                  padding: 22,
                  marginBottom: 25,
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    color: "#666",
                    marginBottom: 8,
                  }}
                >
                  Total Candidates Added
                </div>

                <div
                  style={{
                    fontSize: 36,
                    fontWeight: 700,
                    color: green,
                  }}
                >
                  {candidates.length}
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(3, minmax(0, 1fr))",
                  gap: 12,
                  marginBottom: 30,
                }}
              >
                {stages.map((stage) => (
                  <div
                    key={stage}
                    style={{
                      border: "1px solid #dce9df",
                      borderTop: `3px solid ${green}`,
                      borderRadius: 10,
                      padding: 16,
                    }}
                  >
                    <div
                      style={{
                        color: "#777",
                        fontSize: 13,
                        marginBottom: 8,
                      }}
                    >
                      {stage}
                    </div>

                    <div
                      style={{
                        color: green,
                        fontSize: 26,
                        fontWeight: 700,
                      }}
                    >
                      {countStage(stage)}
                    </div>

                    <div
                      style={{
                        height: 6,
                        background: "#e3ece6",
                        borderRadius: 10,
                        overflow: "hidden",
                        marginTop: 12,
                      }}
                    >
                      <div
                        style={{
                          width: `${
                            candidates.length
                              ? (countStage(stage) /
                                  candidates.length) *
                                100
                              : 0
                          }%`,
                          height: "100%",
                          background: green,
                        }}
                      />
                    </div>
                  </div>
                ))}
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
