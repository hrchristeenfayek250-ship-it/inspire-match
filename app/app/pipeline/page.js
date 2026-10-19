
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import ATSNavigation from "@/components/ATSNavigation";

const stages = [
  "Applied",
  "Screening",
  "Interview",
  "Shortlisted",
  "Hired",
  "Rejected",
];



const stageColors = {
  Applied: "#64748b",
  Screening: "#4b7eb5",
  Interview: "#8065a7",
  Shortlisted: "#b48a42",
  Hired: "#278560",
  Rejected: "#ba6b70",
  Unassigned: "#9ca3af",
};

function Metric({ label, value, icon, subtitle }) {
  return (
    <section className="pl-metric">
      <div className="pl-metric-head">
        <span>{label}</span>
        <div className="pl-metric-icon">{icon}</div>
      </div>

      <strong>{value}</strong>
      <small>{subtitle}</small>
    </section>
  );
}

export default function PipelinePage() {
  const [candidates, setCandidates] = useState([]);
  const [jobs, setJobs] = useState([]);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [search, setSearch] = useState("");
  const [jobFilter, setJobFilter] = useState("all");

  const [mobileNav, setMobileNav] = useState(false);
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverStage, setDragOverStage] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    loadPipeline();
  }, []);

  async function getCompanyScope() {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error("Please log in again.");
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
      throw new Error(
        "A single company membership is required."
      );
    }

    const companyId = memberships[0].company_id;

    const filter =
      `company_id.eq.${companyId},` +
      `and(company_id.is.null,user_id.eq.${user.id})`;

    return { filter };
  }

  async function loadPipeline() {
    setLoading(true);
    setErrorMessage("");

    try {
      const { filter } = await getCompanyScope();

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
            .select("id, title, status")
            .or(filter)
            .order("created_at", {
              ascending: false,
            }),
        ]);

      if (candidateResponse.error) {
        throw candidateResponse.error;
      }

      setCandidates(candidateResponse.data || []);

      if (jobResponse.error) {
        console.error(
          "Could not load job filters:",
          jobResponse.error
        );
        setJobs([]);
      } else {
        setJobs(jobResponse.data || []);
      }
    } catch (error) {
      console.error("Could not load pipeline:", error);

      setCandidates([]);
      setJobs([]);
      setErrorMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function changeStage(candidateId, stage) {
    if (!stages.includes(stage)) {
      setErrorMessage("Invalid recruitment stage.");
      return;
    }

    if (updatingId !== null) return;

    const candidate = candidates.find(
      (item) => String(item.id) === String(candidateId)
    );

    if (!candidate) return;

    if (candidate.status === stage) return;

    setUpdatingId(candidateId);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const { filter } = await getCompanyScope();

      const { data, error } = await supabase
        .from("candidates")
        .update({ status: stage })
        .eq("id", candidateId)
        .or(filter)
        .select("id, status")
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        throw new Error(
          "Candidate not found or update not permitted."
        );
      }

      setCandidates((current) =>
        current.map((item) =>
          String(item.id) === String(data.id)
            ? { ...item, status: data.status }
            : item
        )
      );

      setSuccessMessage(
        `${candidate.full_name || "Candidate"} moved to ${stage}.`
      );
    } catch (error) {
      console.error("Could not update candidate:", error);

      setErrorMessage(
        `Could not update candidate: ${error.message}`
      );
    } finally {
      setUpdatingId(null);
      setDraggingId(null);
      setDragOverStage(null);
    }
  }

  function handleDragStart(event, candidateId) {
    if (updatingId !== null) {
      event.preventDefault();
      return;
    }

    const id = String(candidateId);

    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", id);

    setDraggingId(id);
  }

  function handleDragOver(event, stage) {
    if (updatingId !== null) return;

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDragOverStage(stage);
  }

  function handleDrop(event, stage) {
    event.preventDefault();

    if (updatingId !== null) return;

    const candidateId =
      event.dataTransfer.getData("text/plain") ||
      draggingId;

    setDragOverStage(null);
    setDraggingId(null);

    if (candidateId) {
      changeStage(candidateId, stage);
    }
  }

  const filteredCandidates = useMemo(() => {
    const query = search.trim().toLowerCase();

    return candidates.filter((candidate) => {
      const searchable = [
        candidate.full_name,
        candidate.current_title,
        candidate.location,
        candidate.email,
        candidate.skills,
      ]
        .filter(Boolean)
        .map((value) =>
          Array.isArray(value)
            ? value.join(" ")
            : String(value)
        )
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !query || searchable.includes(query);

      const matchesJob =
        jobFilter === "all" ||
        (jobFilter === "unassigned"
          ? candidate.job_id == null
          : String(candidate.job_id) === jobFilter);

      return matchesSearch && matchesJob;
    });
  }, [candidates, search, jobFilter]);

  const stageGroups = useMemo(() => {
    const groups = {};

    for (const stage of stages) {
      groups[stage] = [];
    }

    groups.Unassigned = [];

    for (const candidate of filteredCandidates) {
      const status = candidate.status;

      if (stages.includes(status)) {
        groups[status].push(candidate);
      } else {
        groups.Unassigned.push(candidate);
      }
    }

    return groups;
  }, [filteredCandidates]);

  const metrics = useMemo(() => {
    const total = filteredCandidates.length;

    const hired = stageGroups.Hired.length;
    const rejected = stageGroups.Rejected.length;

    const inProgress =
      stageGroups.Applied.length +
      stageGroups.Screening.length +
      stageGroups.Interview.length +
      stageGroups.Shortlisted.length;

    return {
      total,
      inProgress,
      hired,
      rejected,
    };
  }, [filteredCandidates, stageGroups]);

  const visibleStages =
    stageGroups.Unassigned.length > 0
      ? [...stages, "Unassigned"]
      : stages;

  async function logOut() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    window.location.href = "/app/login";
  }

  const sidebar = (
    <div className="pl-sidebar-inner">
      <div className="pl-brand">
        <div className="pl-logo">I</div>

        <div>
          <strong>Inspire Match</strong>
          <small>TALENT INTELLIGENCE</small>
        </div>
      </div>

      <div className="pl-sidebar-label">
        WORKSPACE
      </div>

     <ATSNavigation
  className="pl-navigation"
  linkClassName="pl-nav-item"
  onNavigate={() => setMobileNav(false)}
/>

      <div className="pl-sidebar-footer">
        <Link href="/">↗ ATS Home</Link>

        <button onClick={logOut}>
          ↪ Log out
        </button>

        <small>© Inspire Match ATS</small>
      </div>
    </div>
  );

  return (
    <main className="pl-root">
      <style>{`
        .pl-root {
          width: 100%;
          max-width: none;
          min-height: 100vh;
          padding: 0;
          margin: 0;
          background: #f6f8fb;
          color: #1e293b;
          font-family: Arial, sans-serif;
          font-size: 14px;
          line-height: 1.5;
        }

        .pl-root * {
          box-sizing: border-box;
        }

        .pl-root h1,
        .pl-root h2,
        .pl-root h3,
        .pl-root h4 {
          color: #1e293b;
          font-family: Arial, sans-serif;
        }

        .pl-shell {
          display: grid;
          grid-template-columns: 254px minmax(0, 1fr);
          min-height: 100vh;
        }

        .pl-sidebar {
          background: #fff;
          border-right: 1px solid #e6eaf0;
          height: 100vh;
          position: sticky;
          top: 0;
          overflow-y: auto;
          padding: 24px 15px;
        }

        .pl-sidebar-inner {
          height: 100%;
          min-height: 600px;
          display: flex;
          flex-direction: column;
        }

        .pl-brand {
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 7px 12px 26px;
          border-bottom: 1px solid #edf0f2;
          margin-bottom: 25px;
        }

        .pl-logo {
          width: 42px;
          height: 42px;
          background: #284e42;
          color: #fff;
          border-radius: 12px;
          flex-shrink: 0;
          display: grid;
          place-items: center;
          font-size: 23px;
          font-weight: 800;
        }

        .pl-brand strong {
          display: block;
          font-size: 17px;
          letter-spacing: -.5px;
          color: #1e293b;
        }

        .pl-brand small {
          display: block;
          margin-top: 4px;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 1.4px;
          color: #8795a4;
        }

        .pl-sidebar-label {
          color: #9ba6b2;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1.5px;
          padding: 0 14px;
          margin-bottom: 10px;
        }

        .pl-navigation {
          display: grid;
          gap: 4px;
        }

        .pl-nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 13px 15px;
          border-radius: 10px;
          color: #657285;
          font-size: 13px;
          font-weight: 600;
          text-decoration: none;
          border-left: 3px solid transparent;
          white-space: nowrap;
        }

        .pl-nav-item span {
          width: 23px;
          text-align: center;
          font-size: 19px;
        }

        .pl-nav-item:hover {
          background: #f4f7f6;
        }

        .pl-nav-item.active {
          background: #eaf3ee;
          color: #245340;
          border-left-color: #315f50;
          font-weight: 800;
        }

        .pl-sidebar-footer {
          display: grid;
          gap: 9px;
          margin-top: auto;
          padding-top: 30px;
        }

        .pl-sidebar-footer a {
          padding: 12px 15px;
          color: #657285;
          font-size: 13px;
          text-decoration: none;
        }

        .pl-sidebar-footer button {
          background: #f7f8fa;
          border: 1px solid #e6eaf0;
          color: #526073;
          border-radius: 10px;
          padding: 12px 15px;
          text-align: left;
          cursor: pointer;
          font-weight: 700;
        }

        .pl-sidebar-footer small {
          margin-top: 7px;
          color: #a1acb8;
          font-size: 10px;
        }

        .pl-content {
          min-width: 0;
          padding: 29px clamp(17px, 3vw, 46px) 60px;
        }

        .pl-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 20px;
          margin-bottom: 28px;
        }

        .pl-breadcrumb {
          color: #8390a0;
          font-size: 12px;
          margin-bottom: 9px;
        }

        .pl-breadcrumb strong {
          color: #315f50;
        }

        .pl-title {
          font-size: clamp(29px, 3vw, 38px);
          font-weight: 800;
          letter-spacing: -1.1px;
          margin: 0;
        }

        .pl-subtitle {
          color: #8390a0;
          font-size: 13px;
          margin: 10px 0 0;
        }

        .pl-primary,
        .pl-secondary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border-radius: 10px;
          padding: 12px 17px;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
          text-decoration: none;
        }

        .pl-primary {
          background: #284e42;
          border: 1px solid #284e42;
          color: #fff;
        }

        .pl-secondary {
          background: #fff;
          border: 1px solid #e1e6ed;
          color: #526073;
        }

        .pl-metrics {
          display: grid;
          grid-template-columns:
            repeat(4, minmax(0, 1fr));
          gap: 15px;
          margin-bottom: 25px;
        }

        .pl-metric,
        .pl-panel {
          background: #fff;
          border: 1px solid #e6eaf0;
          border-radius: 16px;
          box-shadow: 0 4px 18px rgba(23,35,50,.035);
        }

        .pl-metric {
          padding: 21px;
        }

        .pl-metric-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          color: #647182;
          font-size: 12px;
          font-weight: 700;
        }

        .pl-metric-icon {
          width: 38px;
          height: 38px;
          background: #edf4f0;
          color: #315f50;
          border-radius: 10px;
          display: grid;
          place-items: center;
          font-size: 20px;
        }

        .pl-metric strong {
          display: block;
          font-size: 32px;
          font-weight: 800;
          color: #1e293b;
          margin-top: 11px;
          letter-spacing: -1px;
        }

        .pl-metric small {
          display: block;
          color: #96a0ad;
          font-size: 11px;
          margin-top: 5px;
        }

        .pl-panel {
          padding: 20px;
          margin-bottom: 24px;
        }

        .pl-filters {
          display: flex;
          align-items: center;
          gap: 13px;
          flex-wrap: wrap;
        }

        .pl-search,
        .pl-select {
          min-height: 44px;
          border: 1px solid #e1e6ed;
          background: #fff;
          color: #526073;
          border-radius: 10px;
          padding: 11px 13px;
          font-size: 13px;
          outline: none;
        }

        .pl-search {
          flex: 1;
          min-width: 190px;
        }

        .pl-select {
          min-width: 180px;
        }

        .pl-search:focus,
        .pl-select:focus {
          border-color: #6e9a86;
          box-shadow: 0 0 0 3px #eaf3ee;
        }

        .pl-board-heading {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
          flex-wrap: wrap;
          margin: 27px 0 17px;
        }

        .pl-board-heading h2 {
          font-size: 19px;
          font-weight: 800;
          margin: 0;
        }

        .pl-board-heading p {
          color: #8994a3;
          font-size: 12px;
          margin: 7px 0 0;
        }

        .pl-board-scroll {
          overflow-x: auto;
          width: 100%;
          padding-bottom: 16px;
          scrollbar-color: #c9d5d0 transparent;
        }

        .pl-board {
          display: grid;
          grid-auto-flow: column;
          grid-auto-columns: minmax(248px, 1fr);
          gap: 14px;
          align-items: stretch;
          min-width: max-content;
        }

        .pl-column {
          width: 248px;
          min-height: 490px;
          background: #f0f3f6;
          border: 1px solid #e7ebef;
          border-radius: 15px;
          padding: 13px;
          transition: background .15s, border-color .15s;
        }

        .pl-column.drop-active {
          background: #e6f0ea;
          border-color: #75a28c;
        }

        .pl-column-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 5px 3px 15px;
          border-bottom: 1px solid #dde4ea;
          margin-bottom: 13px;
        }

        .pl-column-title {
          display: flex;
          align-items: center;
          gap: 9px;
          font-size: 13px;
          font-weight: 800;
          color: #344256;
        }

        .pl-column-dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .pl-count {
          padding: 4px 9px;
          background: #fff;
          border: 1px solid #e3e8ed;
          color: #526073;
          border-radius: 15px;
          font-size: 11px;
          font-weight: 800;
        }

        .pl-cards {
          display: grid;
          align-content: start;
          gap: 11px;
        }

        .pl-candidate {
          background: #fff;
          border: 1px solid #e3e8ed;
          border-radius: 12px;
          padding: 15px;
          box-shadow: 0 3px 10px rgba(23,35,50,.035);
          cursor: grab;
          transition: border-color .15s, transform .15s;
        }

        .pl-candidate:hover {
          border-color: #b6cfc1;
          transform: translateY(-1px);
        }

        .pl-candidate:active {
          cursor: grabbing;
        }

        .pl-candidate.dragging {
          opacity: .45;
        }

        .pl-candidate-head {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 12px;
        }

        .pl-avatar {
          width: 36px;
          height: 36px;
          flex-shrink: 0;
          display: grid;
          place-items: center;
          background: #eaf3ee;
          color: #315f50;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 800;
        }

        .pl-candidate-name {
          font-size: 12px;
          color: #1e293b;
          font-weight: 800;
          text-decoration: none;
          overflow-wrap: anywhere;
        }

        .pl-candidate-name:hover {
          color: #315f50;
        }

        .pl-candidate-role {
          color: #8390a0;
          font-size: 11px;
          line-height: 1.5;
          margin: 0;
          overflow-wrap: anywhere;
        }

        .pl-candidate-meta {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #96a0ad;
          font-size: 11px;
          margin-top: 10px;
          overflow-wrap: anywhere;
        }

        .pl-candidate-footer {
          border-top: 1px solid #eef0f3;
          margin-top: 13px;
          padding-top: 12px;
        }

        .pl-stage-control {
          width: 100%;
          min-height: 36px;
          padding: 8px 10px;
          border-radius: 8px;
          border: 1px solid #e1e6ed;
          background: #f8fafb;
          color: #315f50;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
        }

        .pl-empty {
          border: 1px dashed #d4dce4;
          border-radius: 10px;
          text-align: center;
          color: #a1acb8;
          font-size: 12px;
          padding: 28px 12px;
        }

        .pl-alert {
          background: #fff7f3;
          border: 1px solid #e8c7b7;
          border-radius: 10px;
          color: #a14e31;
          padding: 14px 17px;
          margin-bottom: 18px;
          font-size: 13px;
        }

        .pl-success {
          background: #edf8f1;
          border: 1px solid #cde7d5;
          border-radius: 10px;
          color: #276446;
          padding: 14px 17px;
          margin-bottom: 18px;
          font-size: 13px;
        }

        .pl-mobile-top {
          display: none;
        }

        @media (max-width: 1150px) {
          .pl-metrics {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 800px) {
          .pl-shell {
            grid-template-columns: 1fr;
          }

          .pl-sidebar {
            display: none;
          }

          .pl-mobile-top {
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: #fff;
            padding: 15px 19px;
            border-bottom: 1px solid #e6eaf0;
          }

          .pl-mobile-menu {
            background: #fff;
            padding: 14px 18px;
            border-bottom: 1px solid #e6eaf0;
          }

          .pl-mobile-menu .pl-sidebar-inner {
            min-height: auto;
          }

          .pl-content {
            padding: 24px 16px;
          }
        }

        @media (max-width: 540px) {
          .pl-metrics {
            gap: 10px;
          }

          .pl-metric {
            padding: 16px;
          }

          .pl-metric strong {
            font-size: 27px;
          }

          .pl-title {
            font-size: 29px;
          }

          .pl-panel {
            padding: 15px;
          }

          .pl-column {
            width: 240px;
          }
        }
      `}</style>

      <div className="pl-shell">
        <aside className="pl-sidebar">
          {sidebar}
        </aside>

        <div style={{ minWidth: 0 }}>
          <div className="pl-mobile-top">
            <strong style={{ color: "#284e42" }}>
              ◈ Inspire Match
            </strong>

            <button
              onClick={() => setMobileNav((value) => !value)}
              style={{
                border: 0,
                borderRadius: 9,
                padding: "10px 14px",
                background: "#eaf3ee",
                color: "#284e42",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {mobileNav ? "Close ✕" : "☰ Menu"}
            </button>
          </div>

          {mobileNav && (
            <div className="pl-mobile-menu">
              {sidebar}
            </div>
          )}

          <div className="pl-content">
            {/* HEADER */}

            <header className="pl-header">
              <div>
                <div className="pl-breadcrumb">
                  Workspace
                  <span style={{ margin: "0 9px" }}>/</span>
                  <strong>Pipeline</strong>
                </div>

                <h1 className="pl-title">
                  Candidate Pipeline
                </h1>

                <p className="pl-subtitle">
                  Track candidates, manage hiring stages
                  and move talent forward.
                </p>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <button
                  className="pl-secondary"
                  type="button"
                  onClick={loadPipeline}
                  disabled={loading}
                >
                  ↻ Refresh
                </button>

                <Link
                  href="/app/candidates"
                  className="pl-primary"
                >
                  View Candidates →
                </Link>
              </div>
            </header>

            {errorMessage && (
              <div className="pl-alert" role="alert">
                {errorMessage}
              </div>
            )}

            {successMessage && (
              <div className="pl-success" role="status">
                {successMessage}
              </div>
            )}

            {/* PIPELINE METRICS */}

            <div className="pl-metrics">
              <Metric
                label="Total Candidates"
                value={loading ? "—" : metrics.total}
                icon="♙"
                subtitle="In current pipeline view"
              />

              <Metric
                label="In Progress"
                value={loading ? "—" : metrics.inProgress}
                icon="◉"
                subtitle="Across active hiring stages"
              />

              <Metric
                label="Hired"
                value={loading ? "—" : metrics.hired}
                icon="✓"
                subtitle="Successfully hired"
              />

              <Metric
                label="Rejected"
                value={loading ? "—" : metrics.rejected}
                icon="×"
                subtitle="Closed candidate journeys"
              />
            </div>

            {/* FILTERS */}

            <section className="pl-panel">
              <div className="pl-filters">
                <input
                  className="pl-search"
                  value={search}
                  onChange={(e) =>
                    setSearch(e.target.value)
                  }
                  placeholder="Search candidates, skills, location..."
                  aria-label="Search candidates"
                />

                <select
                  className="pl-select"
                  value={jobFilter}
                  onChange={(e) =>
                    setJobFilter(e.target.value)
                  }
                  aria-label="Filter by job"
                >
                  <option value="all">
                    All Jobs
                  </option>

                  <option value="unassigned">
                    No Assigned Job
                  </option>

                  {jobs.map((job) => (
                    <option
                      key={job.id}
                      value={String(job.id)}
                    >
                      {job.title}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  className="pl-secondary"
                  onClick={() => {
                    setSearch("");
                    setJobFilter("all");
                  }}
                >
                  Clear Filters
                </button>
              </div>
            </section>

            {/* BOARD HEADING */}

            <div className="pl-board-heading">
              <div>
                <h2>Recruitment Board</h2>

                <p>
                  Drag cards between stages or use
                  the stage selector on each card.
                </p>
              </div>

              <span
                style={{
                  fontSize: 12,
                  color: "#8390a0",
                }}
              >
                {loading
                  ? "Loading..."
                  : `${filteredCandidates.length} candidates`}
              </span>
            </div>

            {/* KANBAN BOARD */}

            {loading ? (
              <div className="pl-panel">
                Loading recruitment pipeline...
              </div>
            ) : (
              <div className="pl-board-scroll">
                <div className="pl-board">
                  {visibleStages.map((stage) => {
                    const stageCandidates =
                      stageGroups[stage] || [];

                    const canDrop =
                      stages.includes(stage);

                    const highlight =
                      dragOverStage === stage && canDrop;

                    return (
                      <section
                        key={stage}
                        className={
                          highlight
                            ? "pl-column drop-active"
                            : "pl-column"
                        }
                        onDragOver={
                          canDrop
                            ? (event) =>
                                handleDragOver(event, stage)
                            : undefined
                        }
                        onDragLeave={() =>
                          setDragOverStage((current) =>
                            current === stage ? null : current
                          )
                        }
                        onDrop={
                          canDrop
                            ? (event) =>
                                handleDrop(event, stage)
                            : undefined
                        }
                      >
                        <div className="pl-column-header">
                          <div className="pl-column-title">
                            <span
                              className="pl-column-dot"
                              style={{
                                background:
                                  stageColors[stage],
                              }}
                            />

                            {stage}
                          </div>

                          <span className="pl-count">
                            {stageCandidates.length}
                          </span>
                        </div>

                        <div className="pl-cards">
                          {stageCandidates.length === 0 ? (
                            <div className="pl-empty">
                              {highlight
                                ? "Drop candidate here"
                                : "No candidates"}
                            </div>
                          ) : (
                            stageCandidates.map(
                              (candidate) => {
                                const name =
                                  candidate.full_name ||
                                  "Unnamed Candidate";

                                return (
                                  <article
                                    key={candidate.id}
                                    draggable={
                                      updatingId === null
                                    }
                                    onDragStart={(event) =>
                                      handleDragStart(
                                        event,
                                        candidate.id
                                      )
                                    }
                                    onDragEnd={() => {
                                      setDraggingId(null);
                                      setDragOverStage(null);
                                    }}
                                    className={
                                      String(draggingId) ===
                                      String(candidate.id)
                                        ? "pl-candidate dragging"
                                        : "pl-candidate"
                                    }
                                  >
                                    <div className="pl-candidate-head">
                                      <div className="pl-avatar">
                                        {name
                                          .charAt(0)
                                          .toUpperCase()}
                                      </div>

                                      <Link
                                        href={`/app/candidates/${candidate.id}`}
                                        className="pl-candidate-name"
                                      >
                                        {name}
                                      </Link>
                                    </div>

                                    <p className="pl-candidate-role">
                                      {candidate.current_title ||
                                        "Title not specified"}
                                    </p>

                                    {candidate.location && (
                                      <div className="pl-candidate-meta">
                                        ◎ {candidate.location}
                                      </div>
                                    )}

                                    {candidate.created_at && (
                                      <div className="pl-candidate-meta">
                                        ◷ Added{" "}
                                        {new Date(
                                          candidate.created_at
                                        ).toLocaleDateString(
                                          "en-GB"
                                        )}
                                      </div>
                                    )}

                                    <div className="pl-candidate-footer">
                                      <select
                                        className="pl-stage-control"
                                        value={
                                          stages.includes(
                                            candidate.status
                                          )
                                            ? candidate.status
                                            : ""
                                        }
                                        disabled={
                                          updatingId !== null
                                        }
                                        aria-label={`Stage for ${name}`}
                                        onChange={(event) =>
                                          changeStage(
                                            candidate.id,
                                            event.target.value
                                          )
                                        }
                                      >
                                        <option
                                          value=""
                                          disabled
                                        >
                                          Select Stage
                                        </option>

                                        {stages.map(
                                          (option) => (
                                            <option
                                              key={option}
                                              value={option}
                                            >
                                              {option}
                                            </option>
                                          )
                                        )}
                                      </select>
                                    </div>
                                  </article>
                                );
                              }
                            )
                          )}
                        </div>
                      </section>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
