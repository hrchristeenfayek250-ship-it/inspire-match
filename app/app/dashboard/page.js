
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import NotificationBell from "@/components/NotificationBell";
import ATSNavigation from "@/components/ATSNavigation";

const stages = [
  "Applied",
  "Screening",
  "Interview",
  "Shortlisted",
  "Hired",
  "Rejected",
];



const palette = [
  "#315f50",
  "#6c9d8a",
  "#a3c6b7",
  "#d5e6de",
  "#b9cbbf",
  "#c8a6a2",
];
function Panel({ children, style = {} }) {
  return (
    <section
      style={{
        background: "#fff",
        border: "1px solid #e6eaf0",
        borderRadius: 16,
        boxShadow: "0 4px 18px rgba(23,35,50,.035)",
        ...style,
      }}
    >
      {children}
    </section>
  );
}

function Metric({ label, value, icon, note }) {
  return (
    <Panel
      style={{
        padding: 22,
        minHeight: 148,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <span
          style={{
            color: "#637083",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {label}
        </span>

        <span
          style={{
            width: 39,
            height: 39,
            background: "#edf4f0",
            color: "#315f50",
            borderRadius: 10,
            display: "grid",
            placeItems: "center",
            fontSize: 20,
          }}
        >
          {icon}
        </span>
      </div>

      <div>
        <div
          style={{
            color: "#1e293b",
            fontSize: 33,
            fontWeight: 800,
            letterSpacing: -1,
          }}
        >
          {value}
        </div>

        <div
          style={{
            color: "#8994a3",
            fontSize: 11,
            marginTop: 7,
          }}
        >
          {note}
        </div>
      </div>
    </Panel>
  );
}

function PanelHeading({ title, subtitle, action }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "start",
        flexWrap: "wrap",
        gap: 12,
        marginBottom: 24,
      }}
    >
      <div>
        <h2
          style={{
            color: "#1e293b",
            font: "700 17px Arial,sans-serif",
            margin: 0,
          }}
        >
          {title}
        </h2>

        <p
          style={{
            color: "#8994a3",
            fontSize: 12,
            margin: "8px 0 0",
          }}
        >
          {subtitle}
        </p>
      </div>

      {action}
    </div>
  );
}

export default function DashboardPage() {
  const [candidates, setCandidates] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mobileNav, setMobileNav] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    setError("");

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

      const {
        data: memberships,
        error: membershipError,
      } = await supabase
        .from("company_members")
        .select("company_id")
        .eq("user_id", user.id)
        .limit(2);

      if (membershipError) throw membershipError;

      if (!memberships || memberships.length !== 1) {
        setCandidates([]);
        setJobs([]);
        setError(
          "Your account needs one company membership to display recruitment data."
        );
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
            .order("created_at", {
              ascending: false,
            }),

          supabase
            .from("jobs")
            .select("*")
            .or(filter)
            .order("created_at", {
              ascending: false,
            }),
        ]);

      if (candidateResponse.error) {
        throw candidateResponse.error;
      }

      if (jobResponse.error) {
        throw jobResponse.error;
      }

      setCandidates(candidateResponse.data || []);
      setJobs(jobResponse.data || []);
    } catch (e) {
      console.error("Could not load dashboard:", e);

      setCandidates([]);
      setJobs([]);

      setError(
        "Could not load recruitment data. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  const analytics = useMemo(() => {
    const count = (stage) =>
      candidates.filter(
        (c) =>
          String(c.status || "").toLowerCase() ===
          stage.toLowerCase()
      ).length;

    const now = new Date();

    const monthly = Array.from(
      { length: 6 },
      (_, i) => {
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

        return {
          label: start.toLocaleDateString("en-US", {
            month: "short",
          }),

          count: candidates.filter((c) => {
            const date = new Date(c.created_at);

            return (
              c.created_at &&
              !Number.isNaN(date.getTime()) &&
              date >= start &&
              date < end
            );
          }).length,
        };
      }
    );

    const distribution = stages.map((stage) => ({
      stage,
      count: count(stage),
    }));

    const last30 = candidates.filter((c) => {
      const date = new Date(c.created_at);

      return (
        c.created_at &&
        !Number.isNaN(date.getTime()) &&
        date <= now &&
        date >=
          new Date(now.getTime() - 30 * 86400000)
      );
    }).length;

    
    const hired = count("Hired");

    const hiredCandidates = candidates.filter(
      (c) =>
        String(c.status || "").toLowerCase() === "hired"
    );

    const hiringDurations = hiredCandidates
      .map((c) => {
        const start = c.applied_at || c.created_at;
        const end = c.hired_at;

        if (!start || !end) return null;

        const startDate = new Date(start);
        const endDate = new Date(end);

        if (
          Number.isNaN(startDate.getTime()) ||
          Number.isNaN(endDate.getTime()) ||
          endDate < startDate
        ) {
          return null;
        }

        return (
          (endDate.getTime() - startDate.getTime()) /
          86400000
        );
      })
      .filter((days) => days !== null);

    const averageTimeToHire = hiringDurations.length
      ? (
          hiringDurations.reduce((sum, days) => sum + days, 0) /
          hiringDurations.length
        ).toFixed(1)
      : null;

    
    return {
      monthly,
      distribution,
      last30,
      hired,
      averageTimeToHire,
      hiringDurationsCount: hiringDurations.length,

      activeJobs: jobs.filter(
        (j) => j.status !== "Closed"
      ).length,

      unassigned: candidates.filter(
        (c) => !c.job_id
      ).length,

      hiredShare: candidates.length
        ? Math.round(
            (hired / candidates.length) * 100
          )
        : 0,
    };

  }, [candidates, jobs]);

  async function logOut() {
    const { error: logoutError } =
      await supabase.auth.signOut();

    if (!logoutError) {
      window.location.href = "/app/login";
    }
  }

  const sidebar = (
    <div className="im-side-inner">
      <div className="im-brand">
        <div className="im-logo">I</div>

        <div>
          <strong>Inspire Match</strong>
          <small>TALENT INTELLIGENCE</small>
        </div>
      </div>

      <div className="im-side-label">
        WORKSPACE
      </div>

   <ATSNavigation
  className="im-links"
  linkClassName="im-nav-link"
  onNavigate={() => setMobileNav(false)}
/>

      <div className="im-side-bottom">
        <Link href="/">
          ↗ ATS Home
        </Link>

        <button onClick={logOut}>
          ↪ Log out
        </button>

        <small>© Inspire Match ATS</small>
      </div>
    </div>
  );

  return (
    <main className="im-dashboard">
      <style>{`
        .im-dashboard {
          width: 100%;
          max-width: none;
          margin: 0;
          padding: 0;
          background: #f6f8fb;
          min-height: 100vh;
          color: #1e293b;
          font-family: Arial, sans-serif;
          font-size: 14px;
          line-height: 1.5;
        }

        .im-dashboard * {
          box-sizing: border-box;
        }

        .im-dashboard h1,
        .im-dashboard h2,
        .im-dashboard h3 {
          font-family: Arial, sans-serif;
          color: #1e293b;
        }

        .im-shell {
          display: grid;
          grid-template-columns: 254px minmax(0, 1fr);
          min-height: 100vh;
        }

        .im-sidebar {
          background: #fff;
          border-right: 1px solid #e6eaf0;
          padding: 24px 15px;
          position: sticky;
          top: 0;
          height: 100vh;
          overflow-y: auto;
        }

        .im-side-inner {
          height: 100%;
          display: flex;
          flex-direction: column;
          min-height: 600px;
        }

        .im-brand {
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 7px 12px 26px;
          border-bottom: 1px solid #edf0f2;
          margin-bottom: 25px;
        }

        .im-logo {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          background: #284e42;
          color: white;
          display: grid;
          place-items: center;
          font-size: 23px;
          font-weight: 800;
        }

        .im-brand strong {
          display: block;
          font-size: 17px;
          color: #1e293b;
          letter-spacing: -.5px;
        }

        .im-brand small {
          display: block;
          font-size: 9px;
          color: #8795a4;
          font-weight: 800;
          letter-spacing: 1.4px;
          margin-top: 4px;
        }

        .im-side-label {
          padding: 0 14px;
          color: #9ba6b2;
          font-size: 10px;
          letter-spacing: 1.5px;
          font-weight: 800;
          margin-bottom: 10px;
        }

        .im-links {
          display: grid;
          gap: 4px;
        }

        .im-nav-link {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 13px 15px;
          border-radius: 10px;
          text-decoration: none;
          color: #657285;
          font-size: 13px;
          font-weight: 600;
          border-left: 3px solid transparent;
          white-space: nowrap;
        }

        .im-nav-link span {
          width: 23px;
          text-align: center;
          font-size: 19px;
        }

        .im-nav-link.active {
          color: #245340;
          background: #eaf3ee;
          border-left-color: #315f50;
          font-weight: 800;
        }

        .im-nav-link:hover {
          background: #f4f7f6;
        }

        .im-side-bottom {
          margin-top: auto;
          display: grid;
          gap: 9px;
          padding-top: 30px;
        }

        .im-side-bottom a {
          text-decoration: none;
          color: #657285;
          padding: 12px 15px;
          font-size: 13px;
        }

        .im-side-bottom button {
          border: 1px solid #e6eaf0;
          background: #f7f8fa;
          color: #526073;
          text-align: left;
          border-radius: 10px;
          padding: 12px 15px;
          cursor: pointer;
          font-weight: 700;
        }

        .im-side-bottom small {
          color: #a1acb8;
          font-size: 10px;
          margin-top: 7px;
        }

        .im-content {
          min-width: 0;
          padding: 29px clamp(17px, 3vw, 46px) 60px;
        }

        .im-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          flex-wrap: wrap;
          margin-bottom: 29px;
        }

        .im-kpis {
          display: grid;
          grid-template-columns:
            repeat(3, minmax(0, 1fr));
          gap: 16px;
        }

        .im-charts {
          display: grid;
          grid-template-columns: 1.1fr 1fr;
          gap: 18px;
        }

        .im-signals {
          display: grid;
          grid-template-columns:
            repeat(3, minmax(0, 1fr));
          gap: 14px;
        }

        .im-mobile-top {
          display: none;
        }

        .im-bars {
          display: flex;
          align-items: flex-end;
          justify-content: space-around;
          gap: 12px;
          height: 215px;
          border-bottom: 1px solid #e6eaf0;
          padding-top: 22px;
        }

        @media (max-width: 1150px) {
          .im-kpis {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          .im-charts {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 800px) {
          .im-shell {
            grid-template-columns: 1fr;
          }

          .im-sidebar {
            display: none;
          }

          .im-mobile-top {
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: #fff;
            border-bottom: 1px solid #e6eaf0;
            padding: 14px 18px;
          }

          .im-mobile-menu {
            background: #fff;
            padding: 14px 18px;
            border-bottom: 1px solid #e6eaf0;
          }

          .im-mobile-menu .im-side-inner {
            min-height: auto;
          }

          .im-content {
            padding: 24px 16px;
          }

          .im-signals {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 540px) {
          .im-kpis {
            gap: 10px;
          }

          .im-kpis > section {
            padding: 15px !important;
            min-height: 138px !important;
          }

          .im-kpis > section > div:last-child
          > div:first-child {
            font-size: 27px !important;
          }

          .im-content h1 {
            font-size: 28px !important;
          }
        }
      `}</style>

      <div className="im-shell">
        <aside className="im-sidebar">
          {sidebar}
        </aside>

        <div style={{ minWidth: 0 }}>
          <div className="im-mobile-top">
            <strong
              style={{ color: "#284e42" }}
            >
              ◈ Inspire Match
            </strong>

            <button
              onClick={() =>
                setMobileNav((v) => !v)
              }
              style={{
                border: 0,
                borderRadius: 9,
                padding: "10px 13px",
                background: "#eaf3ee",
                color: "#284e42",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {mobileNav
                ? "Close ✕"
                : "☰ Menu"}
            </button>
          </div>

          {mobileNav && (
            <div className="im-mobile-menu">
              {sidebar}
            </div>
          )}

          <div className="im-content">
            <header className="im-top">
              <div>
                <div
                  style={{
                    color: "#8390a0",
                    fontSize: 12,
                    marginBottom: 9,
                  }}
                >
                  Workspace
                  <span
                    style={{
                      margin: "0 8px",
                    }}
                  >
                    /
                  </span>
                  <strong
                    style={{
                      color: "#315f50",
                    }}
                  >
                    Overview
                  </strong>
                </div>

                <h1
                  style={{
                    fontSize:
                      "clamp(29px, 3vw, 38px)",
                    letterSpacing: -1.1,
                    fontWeight: 800,
                    margin: 0,
                  }}
                >
                  Recruitment Overview
                </h1>

                <p
                  style={{
                    color: "#8390a0",
                    fontSize: 13,
                    margin: "10px 0 0",
                  }}
                >
                  A clearer view of your hiring
                  performance and talent pipeline.
                </p>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 13,
                }}
              >
                <NotificationBell />

                <Link
                  href="/app/jobs"
                  style={{
                    background: "#284e42",
                    color: "white",
                    textDecoration: "none",
                    borderRadius: 10,
                    padding: "13px 17px",
                    fontSize: 13,
                    fontWeight: 800,
                  }}
                >
                  ＋ Manage Jobs
                </Link>
              </div>
            </header>

            <div
              id="notifications-panel"
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginBottom: 10,
              }}
            />

            {error && (
              <Panel
                style={{
                  borderColor: "#e6cba9",
                  padding: 18,
                  color: "#946326",
                  marginBottom: 18,
                }}
              >
                {error}

                <button
                  onClick={loadDashboard}
                  style={{
                    marginLeft: 12,
                    cursor: "pointer",
                  }}
                >
                  Retry
                </button>
              </Panel>
            )}

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                alignItems: "center",
                margin: "20px 0 17px",
              }}
            >
              <h2
                style={{
                  fontSize: 16,
                  fontWeight: 800,
                  margin: 0,
                }}
              >
                Performance at a glance
              </h2>

              <span
                style={{
                  color: "#8a96a3",
                  fontSize: 12,
                }}
              >
                Recruitment data
              </span>
            </div>

            {/* KPI CARDS */}

            <div className="im-kpis">
              <Metric
                label="Total Candidates"
                value={
                  loading
                    ? "—"
                    : candidates.length
                }
                icon="♙"
                note="Profiles in your database"
              />

              <Metric
                label="Active Jobs"
                value={
                  loading
                    ? "—"
                    : analytics.activeJobs
                }
                icon="▣"
                note="Open recruitment opportunities"
              />

              <Metric
                label="In Screening"
                value={
                  loading
                    ? "—"
                    : analytics.distribution[1].count
                }
                icon="◉"
                note="Candidates under review"
              />

              <Metric
                label="Interviews"
                value={
                  loading
                    ? "—"
                    : analytics.distribution[2].count
                }
                icon="▤"
                note="In interview stage"
              />

              <Metric
                label="Shortlisted"
                value={
                  loading
                    ? "—"
                    : analytics.distribution[3].count
                }
                icon="☆"
                note="Potential hires"
              />

              <Metric
                label="Hired"
                value={
                  loading
                    ? "—"
                    : analytics.hired
                }
                icon="✓"
                note="Successfully hired"
              />
            </div>

            {/* RECRUITMENT INTELLIGENCE */}

            <div
              style={{
                margin: "34px 0 19px",
              }}
            >
              <h2
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  margin: 0,
                }}
              >
                Recruitment Intelligence
              </h2>

              <p
                style={{
                  color: "#8a96a3",
                  fontSize: 12,
                  margin: "8px 0 0",
                }}
              >
                Hiring trends and pipeline visibility
              </p>
            </div>

            <div className="im-charts">
              {/* CANDIDATE GROWTH */}

              <Panel style={{ padding: 26 }}>
                <PanelHeading
                  title="Candidate Growth"
                  subtitle="New profiles added over the last six months"
                />

                <div className="im-bars">
                  {analytics.monthly.map(
                    (item, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          flex: 1,
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent:
                            "flex-end",
                          gap: 9,
                          height: "100%",
                          minWidth: 0,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 12,
                            color: "#59697a",
                            fontWeight: 700,
                          }}
                        >
                          {loading
                            ? "—"
                            : item.count}
                        </span>

                        <div
                          title={`${item.label}: ${item.count} candidates`}
                          style={{
                            width: "65%",
                            maxWidth: 48,

                            height: Math.max(
                              4,
                              (item.count /
                                Math.max(
                                  1,
                                  ...analytics.monthly.map(
                                    (m) => m.count
                                  )
                                )) *
                                142
                            ),

                            background:
                              i === 5
                                ? "#315f50"
                                : "#c8ddd2",

                            borderRadius:
                              "7px 7px 0 0",
                          }}
                        />

                        <span
                          style={{
                            fontSize: 12,
                            color: "#8a96a3",
                          }}
                        >
                          {item.label}
                        </span>
                      </div>
                    )
                  )}
                </div>
              </Panel>

              {/* PIPELINE DISTRIBUTION */}

              <Panel style={{ padding: 26 }}>
                <PanelHeading
                  title="Pipeline Distribution"
                  subtitle="Candidates across hiring stages"
                  action={
                    <Link
                      href="/app/pipeline"
                      style={{
                        color: "#315f50",
                        fontSize: 12,
                        fontWeight: 800,
                        textDecoration: "none",
                      }}
                    >
                      View Pipeline →
                    </Link>
                  }
                />

                <div
                  style={{
                    display: "grid",
                    gap: 18,
                  }}
                >
                  {analytics.distribution.map(
                    (item, i) => (
                      <div key={item.stage}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent:
                              "space-between",
                            fontSize: 12,
                            marginBottom: 8,
                          }}
                        >
                          <span
                            style={{
                              color: "#647182",
                            }}
                          >
                            {item.stage}
                          </span>

                          <strong>
                            {loading
                              ? "—"
                              : item.count}
                          </strong>
                        </div>

                        <div
                          style={{
                            height: 8,
                            background: "#eff2f5",
                            borderRadius: 20,
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              width: `${
                                (item.count /
                                  Math.max(
                                    1,
                                    ...analytics.distribution.map(
                                      (s) => s.count
                                    )
                                  )) *
                                100
                              }%`,

                              height: "100%",
                              background: palette[i],
                              borderRadius: 20,
                            }}
                          />
                        </div>
                      </div>
                    )
                  )}
                </div>
              </Panel>
            </div>

            
            {/* RECRUITMENT SIGNALS */}

            <div
              className="im-signals"
              style={{ marginTop: 18 }}
            >
              <Metric
                label="Recent Intake"
                value={loading ? "—" : analytics.last30}
                icon="↗"
                note="Candidates added in the last 30 days"
              />

              <Metric
                label="Unassigned Talent"
                value={loading ? "—" : analytics.unassigned}
                icon="◎"
                note="Candidates without a linked job"
              />

              <Metric
                label="Hired Share"
                value={
                  loading
                    ? "—"
                    : `${analytics.hiredShare}%`
                }
                icon="◈"
                note="Hired candidates / total candidates"
              />

              <Metric
                label="Candidates per Active Job"
                value={
                  loading
                    ? "—"
                    : analytics.activeJobs
                      ? (
                          candidates.filter(c => c.job_id).length /
                          analytics.activeJobs
                        ).toFixed(1)
                      : "N/A"
                }
                icon="▤"
                note="Linked candidates / active jobs"
              />

              <Metric
                label="Interview Pipeline"
                value={
                  loading
                    ? "—"
                    : analytics.distribution.find(
                        s => s.stage === "Interview"
                      )?.count ?? 0
                }
                icon="◉"
                note="Candidates currently in Interview"
              />

              <Metric
                label="Shortlisted Talent"
                value={
                  loading
                    ? "—"
                    : analytics.distribution.find(
                        s => s.stage === "Shortlisted"
                      )?.count ?? 0
                }
                icon="✦"
                note="Candidates currently shortlisted"
              />
            </div>

            {/* TIME TO HIRE */}

            <Panel
              style={{
                padding: 26,
                marginTop: 22,
              }}
            >
              <PanelHeading
                title="Time to Hire"
                subtitle="Average days from application to hiring"
              />

              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 10,
                }}
              >
                <strong
                  style={{
                    fontSize: 38,
                    color: "#315f50",
                    fontWeight: 800,
                  }}
                >
                  {loading
                    ? "—"
                    : analytics.averageTimeToHire ?? "N/A"}
                </strong>

                {analytics.averageTimeToHire !== null &&
                  !loading && (
                    <span style={{ color: "#8994a3" }}>
                      days
                    </span>
                  )}
              </div>

              <p
                style={{
                  color: "#8994a3",
                  fontSize: 12,
                  marginBottom: 0,
                }}
              >
                Based on{" "}
                {loading
                  ? "—"
                  : analytics.hiringDurationsCount}{" "}
                hired candidates with valid application
                and hiring dates.
              </p>
            </Panel>


            {/* RECRUITMENT FUNNEL REPORT */}

            <Panel
              style={{
                padding: 26,
                marginTop: 26,
              }}
            >
              <PanelHeading
                title="Recruitment Funnel"
                subtitle="Current candidate distribution by hiring stage"
                action={
                  <Link
                    href="/app/pipeline"
                    style={{
                      color: "#315f50",
                      fontSize: 12,
                      fontWeight: 800,
                      textDecoration: "none",
                    }}
                  >
                    View Pipeline →
                  </Link>
                }
              />

              <div style={{ display: "grid", gap: 18 }}>
                {analytics.distribution
                  .filter(item => item.stage !== "Rejected")
                  .map((item, index) => {
                    const total = candidates.length;

                    const percentage = total
                      ? (item.count / total) * 100
                      : 0;

                    return (
                      <div key={item.stage}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginBottom: 8,
                            fontSize: 13,
                          }}
                        >
                          <strong>{item.stage}</strong>

                          <span>
                            {loading ? "—" : item.count}
                            {" · "}
                            {loading
                              ? "—"
                              : `${percentage.toFixed(1)}%`}
                          </span>
                        </div>

                        <div
                          style={{
                            height: 13,
                            background: "#edf3ef",
                            borderRadius: 20,
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              width: `${percentage}%`,
                              background:
                                palette[index] || "#315f50",
                              borderRadius: 20,
                              transition: "width .3s ease",
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>

              <p
                style={{
                  fontSize: 12,
                  color: "#8994a3",
                  marginTop: 20,
                  marginBottom: 0,
                }}
              >
                Percentages represent current candidate
                distribution, not historical stage conversion.
                Rejected candidates are excluded from the
                displayed stages but included in the total.
              </p>
            </Panel>


            {/* RECENT CANDIDATES */}

            <Panel
              style={{
                padding: 26,
                marginTop: 26,
              }}
            >
              <PanelHeading
                title="Recent Candidates"
                subtitle="Latest talent profiles in your database"
                action={
                  <Link
                    href="/app/candidates"
                    style={{
                      color: "#315f50",
                      fontSize: 12,
                      fontWeight: 800,
                      textDecoration: "none",
                    }}
                  >
                    View Database →
                  </Link>
                }
              />

              {loading ? (
                <p
                  style={{
                    color: "#8a96a3",
                  }}
                >
                  Loading candidates...
                </p>
              ) : candidates.length === 0 ? (
                <p
                  style={{
                    color: "#8a96a3",
                  }}
                >
                  No candidates yet.
                </p>
              ) : (
                <div>
                  {candidates
                    .slice(0, 5)
                    .map((candidate, i) => (
                      <Link
                        key={candidate.id}
                        href={`/app/candidates/${candidate.id}`}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent:
                            "space-between",
                          gap: 14,
                          flexWrap: "wrap",
                          textDecoration: "none",
                          padding: "15px 3px",
                          borderTop:
                            "1px solid #eef0f3",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                          }}
                        >
                          <div
                            style={{
                              width: 39,
                              height: 39,
                              background:
                                i % 2
                                  ? "#eaf1f8"
                                  : "#eaf3ee",
                              color: "#315f50",
                              borderRadius: 11,
                              display: "grid",
                              placeItems: "center",
                              fontWeight: 800,
                            }}
                          >
                            {String(
                              candidate.full_name ||
                                "?"
                            )
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <div>
                            <strong
                              style={{
                                color: "#1e293b",
                                fontSize: 13,
                              }}
                            >
                              {candidate.full_name ||
                                "Unnamed Candidate"}
                            </strong>

                            <div
                              style={{
                                color: "#8a96a3",
                                fontSize: 12,
                                marginTop: 4,
                              }}
                            >
                              {candidate.current_title ||
                                "No title specified"}
                            </div>
                          </div>
                        </div>

                        <span
                          style={{
                            background: "#f1f5f3",
                            color: "#456457",
                            padding: "7px 12px",
                            borderRadius: 20,
                            fontSize: 11,
                            fontWeight: 700,
                          }}
                        >
                          {candidate.status ||
                            "Not classified"}
                        </span>
                      </Link>
                    ))}
                </div>
              )}
            </Panel>
          </div>
        </div>
      </div>
    </main>
  );
}
