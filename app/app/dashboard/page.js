"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { supabase } from "@/lib/supabase";
import NotificationBell from "@/components/NotificationBell";


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

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        setCandidates([]);
        setJobs([]);
        return;
      }

      const { data: memberships, error: membershipError } =
        await supabase
          .from("company_members")
          .select("company_id")
          .eq("user_id", user.id)
          .limit(2);

      if (membershipError) throw membershipError;

      if (!memberships || memberships.length !== 1) {
        setCandidates([]);
        setJobs([]);
        return;
      }

      const companyId = memberships[0].company_id;

      const filter =
        `company_id.eq.${companyId},` +
        `and(company_id.is.null,user_id.eq.${user.id})`;

      const [candidateResponse, jobResponse] =
        await Promise.all([
          supabase
            .from("candidates")
            .select("*")
            .or(filter)
            .order("created_at", { ascending: false }),

          supabase
            .from("jobs")
            .select("*")
            .or(filter)
            .order("created_at", { ascending: false }),
        ]);

      if (candidateResponse.error) {
        throw candidateResponse.error;
      }

      if (jobResponse.error) {
        throw jobResponse.error;
      }

      setCandidates(candidateResponse.data || []);
      setJobs(jobResponse.data || []);
    } catch (error) {
      console.error("Could not load dashboard:", error);
      setCandidates([]);
      setJobs([]);
    } finally {
      setLoading(false);
    }
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
      

{/* CLEAN PROFESSIONAL HEADER */}
<header
  style={{
    background: "#ffffff",
    border: "1px solid #e3e9e5",
    borderRadius: 18,
    padding: "30px 32px",
    marginBottom: 18,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 20,
    boxShadow: "0 3px 16px rgba(20,45,35,0.035)",
  }}
>
  <div>
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 9,
        marginBottom: 12,
      }}
    >
      <span
        style={{
          width: 9,
          height: 9,
          borderRadius: "50%",
          background: "#328364",
        }}
      />

      <span
        style={{
          color: "#476557",
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: 1.7,
        }}
      >
        INSPIRE MATCH ATS
      </span>
    </div>

    <h1
      style={{
        color: "#182d25",
        fontFamily: "Arial, sans-serif",
        fontSize: "clamp(26px, 3vw, 36px)",
        fontWeight: 800,
        letterSpacing: "-0.8px",
        lineHeight: 1.2,
        margin: 0,
      }}
    >
      Recruitment Overview
    </h1>

    <p
      style={{
        margin: "10px 0 0",
        color: "#596c62",
        fontSize: 14,
        lineHeight: 1.6,
      }}
    >
      Manage your talent pipeline and hiring performance
      in one workspace.
    </p>
  </div>

  <div
    style={{
      display: "flex",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 10,
    }}
  >
    <NotificationBell />

    <Link
      href="/"
      style={{
        background: "#f4f7f5",
        color: "#253d31",
        border: "1px solid #dfe8e2",
        borderRadius: 10,
        padding: "11px 16px",
        textDecoration: "none",
        fontSize: 13,
        fontWeight: 700,
      }}
    >
      ATS Home
    </Link>

    <button
      onClick={async () => {
        await supabase.auth.signOut();
        window.location.href = "/app/login";
      }}
      style={{
        background: "#253d31",
        color: "#ffffff",
        border: "1px solid #253d31",
        borderRadius: 10,
        padding: "11px 16px",
        fontSize: 13,
        fontWeight: 700,
        cursor: "pointer",
      }}
    >
      Log Out
    </button>
  </div>
</header>

<div
  id="notifications-panel"
  style={{
    display: "flex",
    justifyContent: "flex-end",
    width: "100%",
    marginBottom: 16,
  }}
/>

{/* CLEAN NAVIGATION */}
<nav
  aria-label="Recruitment navigation"
  style={{
    display: "flex",
    flexWrap: "nowrap",
    alignItems: "center",
    gap: 5,
    overflowX: "auto",
    background: "#ffffff",
    border: "1px solid #e3e9e5",
    borderRadius: 14,
    padding: 9,
    marginBottom: 28,
  }}
>
  {[
    ["Overview", "/app/dashboard"],
    ["Jobs", "/app/jobs"],
    ["Candidates", "/app/candidates"],
    ["Pipeline", "/app/pipeline"],
    ["AI Matching", "/app/matching"],
    ["Reports", "/app/reports"],
    ["Executive", "/app/executive"],
    ["Team", "/app/team"],
  ].map(([label, href]) => {
    const active = href === "/app/dashboard";

    return (
      <Link
        key={href}
        href={href}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          whiteSpace: "nowrap",
          padding: "11px 13px",
          borderRadius: 9,
          fontSize: 12,
          fontWeight: active ? 800 : 600,
          textDecoration: "none",
          color: active ? "#ffffff" : "#43564b",
          background: active
            ? "#253d31"
            : "transparent",
        }}
      >
        {label}
      </Link>
    );
  })}
</nav>





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

 
{/* RECRUITMENT INTELLIGENCE */}
{(() => {
  const now = new Date();

  const monthlyActivity = Array.from({ length: 6 }, (_, i) => {
    const start = new Date(
      now.getFullYear(),
      now.getMonth() - 5 + i,
      1
    );
    const end = new Date(
      start.getFullYear(),
      start.getMonth() + 1,
      1
    );

    const count = candidates.filter((candidate) => {
      if (!candidate.created_at) return false;
      const date = new Date(candidate.created_at);
      return !Number.isNaN(date.getTime()) &&
        date >= start && date < end;
    }).length;

    return {
      label: start.toLocaleDateString("en-US", {
        month: "short",
      }),
      count,
    };
  });

  const maxMonthly = Math.max(
    1,
    ...monthlyActivity.map((item) => item.count)
  );

  const pipelineData = stages.map((stage) => ({
    stage,
    count: countStage(stage),
  }));

  const maxStage = Math.max(
    1,
    ...pipelineData.map((item) => item.count)
  );

  const newLast30Days = candidates.filter((candidate) => {
    if (!candidate.created_at) return false;
    const date = new Date(candidate.created_at);
    return !Number.isNaN(date.getTime()) &&
      date >= new Date(now.getTime() - 30 * 86400000) &&
      date <= now;
  }).length;

  const unassigned = candidates.filter(
    (candidate) => !candidate.job_id
  ).length;

  const hiredCount = countStage("Hired");

  const hiringShare = totalCandidates
    ? Math.round((hiredCount / totalCandidates) * 100)
    : 0;

  const card = {
    background: "#ffffff",
    border: "1px solid #e5ebe6",
    borderRadius: 22,
    padding: 26,
    boxShadow: "0 6px 24px rgba(25,55,43,0.045)",
  };

  return (
    <section style={{ marginBottom: 30 }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{
          fontSize: 11,
          color: "#43866a",
          fontWeight: 800,
          letterSpacing: 2,
          marginBottom: 8,
        }}>
          TALENT INTELLIGENCE
        </div>

        <h2 style={{
          margin: 0,
          color: "#173b30",
          fontFamily: "Georgia, serif",
          fontSize: 28,
        }}>
          Recruitment Intelligence
        </h2>

        <p style={{
          color: "#7b8981",
          fontSize: 13,
          marginTop: 8,
        }}>
          Live recruitment analytics and hiring signals
        </p>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns:
          "repeat(auto-fit, minmax(min(100%, 340px), 1fr))",
        gap: 18,
      }}>
        {/* MONTHLY CHART */}
        <div style={card}>
          <h3 style={{
            margin: 0,
            fontSize: 17,
            color: "#173b30",
          }}>
            Candidate Growth
          </h3>

          <p style={{
            fontSize: 12,
            color: "#89958d",
            marginTop: 8,
          }}>
            New candidate records · Last 6 months
          </p>

          <div style={{
            display: "flex",
            alignItems: "end",
            justifyContent: "space-around",
            gap: 12,
            height: 190,
            paddingTop: 25,
            borderBottom: "1px solid #e5ebe6",
          }}>
            {monthlyActivity.map((item, index) => (
              <div
                key={index}
                style={{
                  flex: 1,
                  minWidth: 0,
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "end",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <span style={{
                  color: "#173b30",
                  fontSize: 12,
                  fontWeight: 700,
                }}>
                  {item.count}
                </span>

                <div
                  title={`${item.label}: ${item.count} candidates`}
                  style={{
                    width: "70%",
                    maxWidth: 48,
                    minHeight: 4,
                    height: `${
                      (item.count / maxMonthly) * 125
                    }px`,
                    background: index === 5
                      ? "linear-gradient(180deg,#3d9b72,#173b30)"
                      : "#d6e9db",
                    borderRadius: "9px 9px 2px 2px",
                  }}
                />

                <span style={{
                  color: "#849288",
                  fontSize: 11,
                }}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* PIPELINE DISTRIBUTION */}
        <div style={card}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "center",
          }}>
            <h3 style={{
              margin: 0,
              fontSize: 17,
              color: "#173b30",
            }}>
              Pipeline Distribution
            </h3>

            <Link
              href="/app/pipeline"
              style={{
                color: "#43866a",
                fontSize: 12,
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              View →
            </Link>
          </div>

          <p style={{
            fontSize: 12,
            color: "#89958d",
            marginTop: 8,
            marginBottom: 22,
          }}>
            Candidates by recruitment stage
          </p>

          <div style={{
            display: "grid",
            gap: 13,
          }}>
            {pipelineData.map((item) => (
              <div key={item.stage}>
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 12,
                  marginBottom: 6,
                }}>
                  <span style={{ color: "#53665b" }}>
                    {item.stage}
                  </span>

                  <strong style={{ color: "#173b30" }}>
                    {item.count}
                  </strong>
                </div>

                <div style={{
                  background: "#eef3ef",
                  height: 8,
                  borderRadius: 20,
                  overflow: "hidden",
                }}>
                  <div style={{
                    background: item.stage === "Hired"
                      ? "#43866a"
                      : item.stage === "Rejected"
                      ? "#c4a4a4"
                      : "#245c4a",
                    height: "100%",
                    width: `${
                      (item.count / maxStage) * 100
                    }%`,
                    borderRadius: 20,
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RECRUITMENT SIGNALS */}
      <div style={{
        display: "grid",
        gridTemplateColumns:
          "repeat(auto-fit, minmax(190px, 1fr))",
        gap: 14,
        marginTop: 18,
      }}>
        {[
          {
            icon: "↗",
            title: "Recent Intake",
            value: newLast30Days,
            detail: "Added in the last 30 days",
          },
          {
            icon: "◎",
            title: "Unassigned Talent",
            value: unassigned,
            detail: "Candidates without a job",
          },
          {
            icon: "✦",
            title: "Hired Share",
            value: `${hiringShare}%`,
            detail: "Of all candidate records",
          },
        ].map((item) => (
          <div key={item.title} style={{
            ...card,
            padding: 20,
            display: "flex",
            alignItems: "center",
            gap: 15,
          }}>
            <div style={{
              width: 42,
              height: 42,
              borderRadius: 13,
              background: "#edf4ef",
              color: "#245c4a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              flexShrink: 0,
            }}>
              {item.icon}
            </div>

            <div>
              <div style={{
                fontSize: 24,
                fontWeight: 800,
                color: "#173b30",
              }}>
                {item.value}
              </div>

              <div style={{
                fontSize: 12,
                fontWeight: 700,
                color: "#44574c",
                marginTop: 3,
              }}>
                {item.title}
              </div>

              <div style={{
                fontSize: 11,
                color: "#89958d",
                marginTop: 3,
              }}>
                {item.detail}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
})()}


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
        position: "relative",
        overflow: "hidden",
        background: "#ffffff",
        border: "1px solid #e5ebe6",
        borderRadius: 22,
        padding: "26px",
        minHeight: 160,
        boxShadow: "0 6px 24px rgba(25, 55, 43, 0.045)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: 20,
      }}
    >
      <div
        style={{
          position: "absolute",
          width: 125,
          height: 125,
          borderRadius: "50%",
          background: "#f1f7f2",
          top: -65,
          right: -45,
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 14,
          background: "#edf4ef",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 23,
          position: "relative",
        }}
      >
        {icon}
      </div>

      <div style={{ position: "relative" }}>
        <div
          style={{
            fontSize: 38,
            fontWeight: 750,
            letterSpacing: "-1.5px",
            color: "#173b30",
            lineHeight: 1.1,
            marginBottom: 10,
          }}
        >
          {number}
        </div>

        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "#718078",
            letterSpacing: "0.1px",
          }}
        >
          {label}
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 26,
          right: 26,
          height: 3,
          borderRadius: "3px 3px 0 0",
          background:
            "linear-gradient(90deg, #1e5945, #a9c9ad)",
        }}
      />
    </div>
  );
}
