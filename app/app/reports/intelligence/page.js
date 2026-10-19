
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const green = "#245c4a";
const ink = "#193d31";
const border = "#e0eae3";

const activeStages = [
  "Applied",
  "Screening",
  "Interview",
  "Shortlisted",
];

const stages = [...activeStages, "Hired", "Rejected"];

function daysOld(value) {
  if (!value) return null;

  const time = Date.parse(value);

  return Number.isFinite(time)
    ? Math.max(
        0,
        Math.floor((Date.now() - time) / 86400000)
      )
    : null;
}

function CountCard({ label, value, note, color = green }) {
  return (
    <article
      style={{
        background: "white",
        padding: 22,
        border: `1px solid ${border}`,
        borderRadius: 16,
      }}
    >
      <div
        style={{
          fontSize: 11,
          letterSpacing: 1.1,
          fontWeight: 800,
          color: "#688073",
        }}
      >
        {label}
      </div>

      <div
        style={{
          color,
          fontWeight: 850,
          fontSize: 35,
          margin: "10px 0 6px",
        }}
      >
        {value}
      </div>

      <div
        style={{
          color: "#7b8980",
          fontSize: 12,
          lineHeight: 1.5,
        }}
      >
        {note}
      </div>
    </article>
  );
}

function Section({ kicker, title, children }) {
  return (
    <section
      style={{
        background: "white",
        padding: 25,
        border: `1px solid ${border}`,
        borderRadius: 18,
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 850,
          color: green,
          letterSpacing: 2,
          marginBottom: 8,
        }}
      >
        {kicker}
      </div>

      <h2
        style={{
          fontFamily: "Georgia,serif",
          color: ink,
          fontSize: 24,
          margin: "0 0 20px",
        }}
      >
        {title}
      </h2>

      {children}
    </section>
  );
}

export default function HiringIntelligencePage() {
  const [candidates, setCandidates] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("Active");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const {
          data: auth,
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !auth?.user) {
          throw new Error(
            "Please log in to view company analytics."
          );
        }

        const {
          data: memberships,
          error: membershipError,
        } = await supabase
          .from("company_members")
          .select("company_id")
          .eq("user_id", auth.user.id)
          .limit(2);

        if (
          membershipError ||
          memberships?.length !== 1
        ) {
          throw new Error(
            "Could not verify your company membership."
          );
        }

        const companyId = memberships[0].company_id;

        const scope =
          `company_id.eq.${companyId},` +
          `and(company_id.is.null,user_id.eq.${auth.user.id})`;

        const [candidateResult, jobResult] =
          await Promise.all([
            supabase
              .from("candidates")
              .select(
                "id, status, created_at, job_id, recruitment_type"
              )
              .or(scope),

            supabase
              .from("jobs")
              .select(
                "id, title, status, created_at"
              )
              .or(scope),
          ]);

        if (candidateResult.error) {
          throw candidateResult.error;
        }

        if (jobResult.error) {
          throw jobResult.error;
        }

        if (!active) return;

        setCandidates(candidateResult.data || []);
        setJobs(jobResult.data || []);
      } catch (e) {
        if (active) {
          setError(
            e.message ||
              "Could not load intelligence report."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  const report = useMemo(() => {
    const matches = (candidate, status) =>
      String(candidate.status || "").toLowerCase() ===
      status.toLowerCase();

    const activeJobs = jobs.filter(
      (job) => (job.status || "Active") === "Active"
    );

    const recruiting = candidates.filter(
      (candidate) =>
        candidate.recruitment_type ===
        "Active Recruitment"
    );

    const stageCounts = stages.map((stage) => ({
      stage,
      count: recruiting.filter((c) =>
        matches(c, stage)
      ).length,
    }));

    const jobRows = jobs.map((job) => {
      const linked = recruiting.filter(
        (c) =>
          c.job_id != null &&
          String(c.job_id) === String(job.id)
      );

      const stage = (status) =>
        linked.filter((c) =>
          matches(c, status)
        ).length;

      const activeCandidates = linked.filter(
        (c) =>
          activeStages.some((s) =>
            matches(c, s)
          )
      ).length;

      const age = daysOld(job.created_at);

      const isActive =
        (job.status || "Active") === "Active";

      const hires = stage("Hired");
      const shortlisted = stage("Shortlisted");

      let attention = "On track";
      let reason = "Current pipeline snapshot";

      if (isActive && linked.length === 0) {
        attention = "No pipeline";
        reason =
          "No Active Recruitment candidates assigned";
      } else if (
        isActive &&
        age !== null &&
        age >= 30 &&
        hires === 0
      ) {
        attention = "30+ days open";
        reason =
          "Job is at least 30 days old with no recorded hire";
      } else if (
        isActive &&
        shortlisted > 0
      ) {
        attention = "Decision ready";
        reason =
          "Shortlisted candidates may need a next step";
      }

      return {
        ...job,
        total: linked.length,
        activeCandidates,
        hires,
        shortlisted,
        age,
        attention,
        reason,
      };
    });

    const covered = activeJobs.filter(
      (job) =>
        jobRows.some(
          (row) =>
            String(row.id) === String(job.id) &&
            row.activeCandidates > 0
        )
    ).length;

    const agedApplied = recruiting.filter(
      (c) =>
        matches(c, "Applied") &&
        daysOld(c.created_at) !== null &&
        daysOld(c.created_at) >= 14
    ).length;

    return {
      recruiting,
      activeJobs,
      jobRows,
      stageCounts,
      covered,
      agedApplied,

      last30: candidates.filter(
        (c) =>
          daysOld(c.created_at) !== null &&
          daysOld(c.created_at) < 30
      ).length,

      unassigned: recruiting.filter(
        (c) => c.job_id == null
      ).length,

      hired: recruiting.filter(
        (c) => matches(c, "Hired")
      ).length,
    };
  }, [candidates, jobs]);

  const priorityRank = {
    "No pipeline": 0,
    "30+ days open": 1,
    "Decision ready": 2,
    "On track": 3,
  };

  const visibleJobs = report.jobRows
    .filter(
      (job) =>
        filter === "All" ||
        (job.status || "Active") === filter
    )
    .sort(
      (a, b) =>
        priorityRank[a.attention] -
          priorityRank[b.attention] ||
        (b.age ?? -1) - (a.age ?? -1)
    );

  const topStage = report.stageCounts.reduce(
    (best, row) =>
      row.count > best.count ? row : best,
    { stage: "—", count: 0 }
  );

  const grid = {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(185px,1fr))",
    gap: 14,
  };

  const panels = {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(310px,1fr))",
    gap: 16,
  };

  return (
    <main
      style={{
        background: "#f6faf7",
        color: ink,
        minHeight: "100vh",
        padding: "32px 18px 70px",
        fontFamily: "Arial,sans-serif",
      }}
    >
      <style>
        {`
          @media print {
            .no-print {
              display: none !important;
            }

            section, article {
              break-inside: avoid;
            }

            @page {
              size: A4 landscape;
              margin: 12mm;
            }
          }
        `}
      </style>

      <div
        style={{
          maxWidth: 1280,
          margin: "auto",
        }}
      >
        <nav
          className="no-print"
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 20,
            fontSize: 13,
            marginBottom: 25,
          }}
        >
          <Link
            href="/app/reports"
            style={{ color: green }}
          >
            ← Inspire Reports
          </Link>

          <Link
            href="/app/dashboard"
            style={{ color: green }}
          >
            Dashboard
          </Link>

          <Link
            href="/app/executive"
            style={{ color: green }}
          >
            Executive Intelligence
          </Link>
        </nav>

        <header
          style={{
            background: ink,
            color: "#fff",
            borderRadius: 22,
            padding: "36px 32px",
            marginBottom: 18,
          }}
        >
          <div
            style={{
              color: "#bee1ce",
              fontSize: 11,
              letterSpacing: 2.2,
              fontWeight: 800,
            }}
          >
            HIRE & INSPIRE · INSPIRE MATCH ATS
          </div>

          <h1
            style={{
              fontFamily: "Georgia,serif",
              fontSize: 39,
              margin: "12px 0",
            }}
          >
            Hiring Intelligence
          </h1>

          <p
            style={{
              color: "#d6e8dd",
              lineHeight: 1.7,
              margin: 0,
            }}
          >
            Hiring priorities, job coverage and
            operational aging signals — grounded in
            live company data.
          </p>

          <button
            className="no-print"
            onClick={() => window.print()}
            disabled={loading || !!error}
            style={{
              background: "#dff4e5",
              color: ink,
              padding: "12px 17px",
              marginTop: 23,
              border: 0,
              borderRadius: 10,
              cursor: "pointer",
              fontWeight: 800,
            }}
          >
            Export PDF ↓
          </button>
        </header>

        {loading ? (
          <p>Loading hiring intelligence...</p>
        ) : error ? (
          <p
            role="alert"
            style={{ color: "#b91c1c" }}
          >
            {error}
          </p>
        ) : (
          <>
            <div style={grid}>
              <CountCard
                label="ACTIVE JOBS"
                value={report.activeJobs.length}
                note="Current active job openings"
              />

              <CountCard
                label="PIPELINE COVERAGE"
                value={`${report.covered} / ${report.activeJobs.length}`}
                note="Active jobs with active-stage candidates"
              />

              <CountCard
                label="NEW CANDIDATES · 30 DAYS"
                value={report.last30}
                note="New records across all classifications"
              />

              <CountCard
                label="APPLIED · RECORD AGE 14D+"
                value={report.agedApplied}
                color="#a9602c"
                note="Time since profile creation, not stage aging"
              />
            </div>

            <div
              style={{
                ...panels,
                marginTop: 17,
              }}
            >
              <Section
                kicker="TALENT PIPELINE"
                title="Stage Distribution"
              >
                {report.stageCounts.map(
                  ({ stage, count }) => {
                    const max = Math.max(
                      1,
                      ...report.stageCounts.map(
                        (item) => item.count
                      )
                    );

                    return (
                      <div
                        key={stage}
                        style={{
                          marginBottom: 17,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent:
                              "space-between",
                            fontSize: 13,
                            marginBottom: 8,
                          }}
                        >
                          <strong>{stage}</strong>
                          <strong>{count}</strong>
                        </div>

                        <div
                          style={{
                            background: "#eaf0eb",
                            height: 10,
                            borderRadius: 15,
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              width: `${(count / max) * 100}%`,
                              height: "100%",
                              background:
                                stage === "Rejected"
                                  ? "#c38a8a"
                                  : stage === "Hired"
                                  ? "#50a384"
                                  : green,
                            }}
                          />
                        </div>
                      </div>
                    );
                  }
                )}

                <p
                  style={{
                    fontSize: 11,
                    color: "#73867a",
                  }}
                >
                  Current statuses of{" "}
                  {report.recruiting.length} Active
                  Recruitment candidates, not historical
                  conversion rates.
                </p>
              </Section>

              <Section
                kicker="EXECUTIVE SIGNALS"
                title="What Needs Attention"
              >
                {[
                  [
                    "Coverage of active jobs",
                    report.activeJobs.length
                      ? `${Math.round(
                          (report.covered /
                            report.activeJobs.length) *
                            100
                        )}%`
                      : "—",
                    "Active jobs with active-stage candidates",
                  ],
                  [
                    "Largest current stage",
                    topStage.count
                      ? topStage.stage
                      : "—",
                    `${topStage.count} candidates currently in this stage`,
                  ],
                  [
                    "Unassigned active recruits",
                    report.unassigned,
                    "Active Recruitment candidates with no linked job",
                  ],
                  [
                    "Current hired records",
                    report.hired,
                    "Current Hired status; not monthly hiring flow",
                  ],
                ].map(
                  ([label, value, note]) => (
                    <div
                      key={label}
                      style={{
                        display: "flex",
                        justifyContent:
                          "space-between",
                        gap: 20,
                        padding: "16px 0",
                        borderBottom:
                          `1px solid ${border}`,
                      }}
                    >
                      <div>
                        <strong
                          style={{
                            fontSize: 14,
                          }}
                        >
                          {label}
                        </strong>

                        <div
                          style={{
                            color: "#7f8c82",
                            fontSize: 12,
                            marginTop: 6,
                          }}
                        >
                          {note}
                        </div>
                      </div>

                      <strong
                        style={{
                          color: green,
                          fontSize: 24,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {value}
                      </strong>
                    </div>
                  )
                )}
              </Section>
            </div>

            <div style={{ marginTop: 18 }}>
              <Section
                kicker="RECRUITMENT PRIORITIES"
                title="Requisition Attention Board"
              >
                <div
                  className="no-print"
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    gap: 15,
                    flexWrap: "wrap",
                    marginBottom: 17,
                  }}
                >
                  <p
                    style={{
                      color: "#7a8a81",
                      fontSize: 12,
                      margin: 0,
                    }}
                  >
                    Rule-based priorities,
                    sorted by severity and age
                  </p>

                  <select
                    value={filter}
                    onChange={(event) =>
                      setFilter(event.target.value)
                    }
                    style={{
                      border:
                        `1px solid ${border}`,
                      background: "#fff",
                      borderRadius: 9,
                      padding: 10,
                    }}
                  >
                    {[
                      "Active",
                      "Paused",
                      "Closed",
                      "All",
                    ].map((status) => (
                      <option
                        key={status}
                        value={status}
                      >
                        {status} jobs
                      </option>
                    ))}
                  </select>
                </div>

                {visibleJobs.length === 0 ? (
                  <p
                    style={{
                      color: "#7a8a81",
                    }}
                  >
                    No matching jobs for this company.
                  </p>
                ) : (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit,minmax(245px,1fr))",
                      gap: 13,
                    }}
                  >
                    {visibleJobs.map((job) => (
                      <article
                        key={job.id}
                        style={{
                          borderRadius: 15,
                          border:
                            `1px solid ${border}`,
                          padding: 19,
                          background: "#fbfdfb",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 850,
                            letterSpacing: 1,
                            color:
                              job.attention ===
                              "No pipeline"
                                ? "#b35e44"
                                : green,
                          }}
                        >
                          {job.attention.toUpperCase()}
                        </div>

                        <h3
                          style={{
                            fontSize: 17,
                            margin: "11px 0",
                          }}
                        >
                          {job.title ||
                            "Untitled job"}
                        </h3>

                        <p
                          style={{
                            color: "#74877b",
                            fontSize: 12,
                            minHeight: 32,
                          }}
                        >
                          {job.reason}
                        </p>

                        <div
                          style={{
                            color: green,
                            fontSize: 12,
                            lineHeight: 1.9,
                          }}
                        >
                          {job.age === null
                            ? "Job age unavailable"
                            : `${job.age} days since job creation`}

                          <br />

                          {job.activeCandidates} in
                          active stages ·{" "}
                          {job.total} linked

                          <br />

                          {job.shortlisted} shortlisted
                          · {job.hires} hired
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </Section>
            </div>

            <p
              style={{
                marginTop: 20,
                color: "#75877b",
                fontSize: 11,
                lineHeight: 1.8,
              }}
            >
              Methodology: candidate and job ages use
              created_at. Candidate age is not time in
              stage. All figures are current snapshots;
              they do not represent historical funnel
              conversions, Time to Hire or Time to Fill.
              Access is scoped to your company plus
              your own legacy records without
              company_id.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
