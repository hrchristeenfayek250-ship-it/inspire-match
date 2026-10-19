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
      
{/* PREMIUM HEADER */}
<div
  style={{
    background: "linear-gradient(135deg, #173b30, #285b49)",
    borderRadius: 24,
    padding: "32px",
    color: "#fff",
    marginBottom: 22,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 24,
  }}
>
  <div>
    <div
      style={{
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: 3,
        color: "#b9d7c1",
        marginBottom: 12,
      }}
    >
      INSPIRE MATCH • TALENT INTELLIGENCE
    </div>

    <h1
      style={{
        fontFamily: "Georgia, serif",
        fontSize: "clamp(28px, 4vw, 42px)",
        fontWeight: 500,
        margin: 0,
      }}
    >
      Recruitment Overview
    </h1>

    <p
      style={{
        color: "#d5e4d9",
        marginTop: 12,
        marginBottom: 0,
        fontSize: 14,
      }}
    >
      Your entire hiring operation. One intelligent workspace.
    </p>
  </div>

  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 10,
      flexWrap: "wrap",
    }}
  >
    <NotificationBell />

    <Link
      href="/"
      style={{
        padding: "11px 16px",
        background: "rgba(255,255,255,0.12)",
        border: "1px solid rgba(255,255,255,0.2)",
        borderRadius: 12,
        color: "#fff",
        textDecoration: "none",
        fontSize: 13,
        fontWeight: 600,
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
        padding: "11px 16px",
        background: "#fff",
        border: "none",
        borderRadius: 12,
        color: "#173b30",
        cursor: "pointer",
        fontWeight: 700,
      }}
    >
      Log Out
    </button>
  </div>
</div>

<div
  id="notifications-panel"
  style={{
    display: "flex",
    justifyContent: "flex-end",
    width: "100%",
    marginBottom: 16,
  }}
/>

{/* WORKSPACE NAVIGATION */}
<nav
  aria-label="Recruitment navigation"
  style={{
    background: "#fff",
    border: "1px solid #e5ebe6",
    borderRadius: 20,
    padding: 14,
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 30,
    boxShadow: "0 6px 24px rgba(25,55,43,0.04)",
  }}
>
  {[
    { label: "Overview", href: "/app/dashboard", icon: "◫" },
    { label: "Jobs", href: "/app/jobs", icon: "▣" },
    { label: "Candidates", href: "/app/candidates", icon: "♙" },
    { label: "Pipeline", href: "/app/pipeline", icon: "↗" },
    { label: "AI Matching", href: "/app/matching", icon: "✦" },
    { label: "Reports", href: "/app/reports", icon: "▥" },
    { label: "Executive", href: "/app/executive", icon: "◈" },
    { label: "Team", href: "/app/team", icon: "♧" },
  ].map((item) => {
    const isActive = item.href === "/app/dashboard";

    return (
      <Link
        key={item.href}
        href={item.href}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 9,
          padding: "12px 16px",
          borderRadius: 12,
          textDecoration: "none",
          fontSize: 13,
          fontWeight: 650,
          background: isActive ? "#173b30" : "#f6f8f6",
          color: isActive ? "#fff" : "#44574c",
          border: isActive
            ? "1px solid #173b30"
            : "1px solid transparent",
          transition: "all 0.2s ease",
        }}
      >
        <span style={{ fontSize: 16 }}>{item.icon}</span>
        {item.label}
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
