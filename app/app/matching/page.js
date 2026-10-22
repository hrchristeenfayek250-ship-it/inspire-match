
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const NAV = [
  ["Overview", "/app/dashboard", "◫"],
  ["Jobs", "/app/jobs", "▣"],
  ["Candidates", "/app/candidates", "♙"],
  ["Pipeline", "/app/pipeline", "⇄"],
  ["AI Matching", "/app/matching", "✧"],
  ["Reports", "/app/reports", "▥"],
  ["Executive", "/app/executive", "◈"],
  ["Team", "/app/team", "♧"],
];

const STAGES = [
  "Applied", "Screening", "Interview",
  "Shortlisted", "Hired", "Rejected",
];

function Icon({ name, size = 20 }) {
  const paths = {
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    spark: <><path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5z" /></>,
    refresh: <><path d="M20 11a8 8 0 0 0-14-5L4 8" /><path d="M4 3v5h5" /><path d="M4 13a8 8 0 0 0 14 5l2-2" /><path d="M20 21v-5h-5" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
    users: <><circle cx="9" cy="8" r="3" /><path d="M3 20v-2a6 6 0 0 1 12 0v2" /><path d="M17 5a3 3 0 0 1 0 6M19 20v-2a6 6 0 0 0-3-5" /></>,
    briefcase: <><rect x="3" y="7" width="18" height="14" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18" /></>,
    chart: <><path d="M4 20V10M10 20V4M16 20v-8M22 20v-6" /></>,
  };

  return (
    <svg width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round">
      {paths[name] || paths.spark}
    </svg>
  );
}

function normalizeList(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
    return value.trim() ? [value] : [];
  }
  return [];
}

function normalizeResult(saved) {
  return {
    jobId: saved.job_id,
    candidateId: saved.candidate_id,
    score: saved.score,
    confidence: saved.confidence,
    verdict: saved.verdict,
    summary: saved.summary,
    strengths: normalizeList(saved.strengths),
    gaps: normalizeList(saved.gaps),
    interviewQuestions: normalizeList(saved.interview_questions),
    evaluatedAt: saved.evaluated_at,
    saved: true,
    error: null,
  };
}

function getScore(result) {
  if (!result || result.error || result.score == null) return null;
  const score = Number(result.score);
  return Number.isFinite(score) ? score : null;
}

function scoreTone(score) {
  if (score == null) return "neutral";
  if (score >= 80) return "high";
  if (score >= 60) return "medium";
  return "low";
}

function Metric({ icon, label, value, note }) {
  return (
    <div className="am-metric">
      <div className="am-metric-top">
        <span>{label}</span>
        <span className="am-metric-icon"><Icon name={icon} /></span>
      </div>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  );
}

function ResultList({ title, items, type }) {
  const list = normalizeList(items);
  if (!list.length) return null;

  return (
    <div className="am-result-section">
      <h4>{title}</h4>
      <div className="am-result-list">
        {list.map((item, index) => (
          <div className="am-result-line" key={index}>
            <span className={`am-list-mark ${type}`}>
              {type === "positive" ? "✓" : type === "question" ? "?" : "!"}
            </span>
            <span>
              {typeof item === "string"
                ? item
                : JSON.stringify(item)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MatchingPage() {
  const [jobs, setJobs] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [matchResults, setMatchResults] = useState({});
  const [matchingCandidateId, setMatchingCandidateId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("score");
  const [filter, setFilter] = useState("all");
  const [expanded, setExpanded] = useState({});
  const [mobileNav, setMobileNav] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function getScope() {
    const { data: { user }, error } =
      await supabase.auth.getUser();

    if (error || !user) throw new Error("Please log in first.");

    const { data: memberships, error: memberError } =
      await supabase.from("company_members")
        .select("company_id")
        .eq("user_id", user.id)
        .limit(2);

    if (memberError || memberships?.length !== 1) {
      throw new Error("Could not verify your company.");
    }

    const companyId = memberships[0].company_id;
    const companyFilter =
      `company_id.eq.${companyId},` +
      `and(company_id.is.null,user_id.eq.${user.id})`;

    return { companyId, companyFilter };
  }

  async function loadData() {
    setLoading(true);
    setErrorMessage("");

    try {
      const { companyId, companyFilter } = await getScope();

      const [jobsResult, candidatesResult, matchesResult] =
        await Promise.all([
          supabase.from("jobs")
            .select("id, title, status")
            .or(companyFilter)
            .order("created_at", { ascending: false }),
          supabase.from("candidates")
            .select("id, full_name, current_title, status, job_id")
            .is("deleted_at", null)
            .or(companyFilter),
          supabase.from("ai_match_results")
            .select("*")
            .eq("company_id", companyId),
        ]);

      if (jobsResult.error) throw jobsResult.error;
      if (candidatesResult.error) throw candidatesResult.error;
      if (matchesResult.error) throw matchesResult.error;

      const results = {};
      for (const saved of matchesResult.data || []) {
        results[`${saved.job_id}:${saved.candidate_id}`] =
          normalizeResult(saved);
      }

      setJobs(jobsResult.data || []);
      setCandidates(candidatesResult.data || []);
      setMatchResults(results);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function runAIMatch(candidateId) {
    if (!selectedJobId || matchingCandidateId !== null) return;

    const key = `${selectedJobId}:${candidateId}`;
    setMatchingCandidateId(candidateId);
    setErrorMessage("");
    setNotice("");

    try {
      const { data: { session }, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        throw new Error("Please sign in again.");
      }

      const response = await fetch("/api/match-candidate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          jobId: selectedJobId,
          candidateId,
        }),
      });

      const responseText = await response.text();
      let result;

      try {
        result = JSON.parse(responseText);
      } catch {
        throw new Error(
          `AI Matching server error (HTTP ${response.status}). Check Vercel Runtime Logs.`
        );
      }

      if (!response.ok) {
        throw new Error(
          result.error ||
          `AI matching failed (HTTP ${response.status}).`
        );
      }

      setMatchResults((previous) => ({
        ...previous,
        [key]: {
          ...result,
          strengths: normalizeList(result.strengths),
          gaps: normalizeList(result.gaps),
          interviewQuestions: normalizeList(
            result.interviewQuestions ?? result.interview_questions
          ),
          error: null,
        },
      }));

      setExpanded((previous) => ({ ...previous, [key]: true }));
      setNotice("AI assessment completed.");
    } catch (error) {
      setMatchResults((previous) => ({
        ...previous,
        [key]: {
          ...(previous[key] || {}),
          error: error.message,
        },
      }));
    } finally {
      setMatchingCandidateId(null);
    }
  }

  const selectedJob = jobs.find(
    (job) => String(job.id) === selectedJobId
  );

  const jobMatches = useMemo(() => {
    if (!selectedJobId) return [];

    return candidates.map((candidate) => ({
      ...candidate,
      result: matchResults[`${selectedJobId}:${candidate.id}`],
    }));
  }, [candidates, matchResults, selectedJobId]);

  const stats = useMemo(() => {
    const assessed = jobMatches.filter(
      (candidate) => getScore(candidate.result) != null
    );
    const scores = assessed.map(
      (candidate) => getScore(candidate.result)
    );

    return {
      total: jobMatches.length,
      assessed: assessed.length,
      strong: scores.filter((score) => score >= 80).length,
      average: scores.length
        ? `${Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)}%`
        : "—",
    };
  }, [jobMatches]);

  const visibleCandidates = useMemo(() => {
    const q = search.trim().toLowerCase();

    let list = jobMatches.filter((candidate) => {
      const haystack = [
        candidate.full_name,
        candidate.current_title,
        candidate.status,
      ].filter(Boolean).join(" ").toLowerCase();

      if (q && !haystack.includes(q)) return false;

      const score = getScore(candidate.result);
      if (filter === "assessed") return score != null;
      if (filter === "unassessed") return score == null;
      if (filter === "strong") return score != null && score >= 80;
      return true;
    });

    return [...list].sort((a, b) => {
      if (sortBy === "name") {
        return (a.full_name || "").localeCompare(b.full_name || "");
      }

      const sa = getScore(a.result);
      const sb = getScore(b.result);

      if (sa == null && sb == null) return 0;
      if (sa == null) return 1;
      if (sb == null) return -1;
      return sortBy === "lowest" ? sa - sb : sb - sa;
    });
  }, [jobMatches, search, sortBy, filter]);

  async function logOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      setErrorMessage(error.message);
      return;
    }
    window.location.href = "/app/login";
  }

  const sidebar = (
    <div className="am-side-inner">
      <div className="am-brand">
        <div className="am-logo">I</div>
        <div>
          <strong>Inspire Match</strong>
          <small>TALENT INTELLIGENCE</small>
        </div>
      </div>

      <div className="am-side-label">WORKSPACE</div>
      <nav className="am-navigation">
        {NAV.map(([label, href, icon]) => (
          <Link key={href} href={href}
            onClick={() => setMobileNav(false)}
            className={`am-nav ${href === "/app/matching" ? "active" : ""}`}>
            <span>{icon}</span>{label}
          </Link>
        ))}
      </nav>

      <div className="am-side-footer">
        <Link href="/">↗ ATS Home</Link>
        <button onClick={logOut}>↪ Log out</button>
        <small>© Inspire Match ATS</small>
      </div>
    </div>
  );

  return (
    <main className="am-root">
      <style>{`
        .am-root{width:100%;max-width:none;min-height:100vh;margin:0;padding:0;background:#f6f8fb;color:#1e293b;font-family:Arial,sans-serif;font-size:14px}
        .am-root *{box-sizing:border-box}
        .am-root h1,.am-root h2,.am-root h3,.am-root h4{font-family:Arial,sans-serif;color:#1e293b}
        .am-shell{display:grid;grid-template-columns:254px minmax(0,1fr);min-height:100vh}
        .am-sidebar{position:sticky;top:0;height:100vh;overflow-y:auto;background:#fff;border-right:1px solid #e6eaf0;padding:24px 15px}
        .am-side-inner{height:100%;min-height:600px;display:flex;flex-direction:column}
        .am-brand{display:flex;align-items:center;gap:11px;padding:7px 12px 26px;border-bottom:1px solid #edf0f2;margin-bottom:25px}
        .am-logo{width:42px;height:42px;border-radius:12px;background:#284e42;color:white;display:grid;place-items:center;font-size:23px;font-weight:800}
        .am-brand strong{display:block;font-size:17px;letter-spacing:-.5px}
        .am-brand small{display:block;font-size:9px;color:#8795a4;font-weight:800;letter-spacing:1.4px;margin-top:4px}
        .am-side-label{color:#9ba6b2;font-size:10px;font-weight:800;letter-spacing:1.5px;padding:0 14px;margin-bottom:10px}
        .am-navigation{display:grid;gap:4px}
        .am-nav{display:flex;align-items:center;gap:12px;padding:13px 15px;border-radius:10px;text-decoration:none;color:#657285;font-size:13px;font-weight:600;border-left:3px solid transparent}
        .am-nav span{width:23px;text-align:center;font-size:19px}
        .am-nav:hover{background:#f4f7f6}
        .am-nav.active{background:#eaf3ee;color:#245340;border-left-color:#315f50;font-weight:800}
        .am-side-footer{margin-top:auto;display:grid;gap:9px;padding-top:30px}
        .am-side-footer a{color:#657285;padding:12px 15px;text-decoration:none;font-size:13px}
        .am-side-footer button{background:#f7f8fa;border:1px solid #e6eaf0;color:#526073;border-radius:10px;padding:12px 15px;text-align:left;cursor:pointer;font-weight:700}
        .am-side-footer small{color:#a1acb8;font-size:10px;margin-top:7px}
        .am-content{min-width:0;padding:29px clamp(17px,3vw,46px) 60px}
        .am-header{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:20px;margin-bottom:29px}
        .am-breadcrumb{color:#8390a0;font-size:12px;margin-bottom:9px}
        .am-breadcrumb strong{color:#315f50}
        .am-title{font-size:clamp(29px,3vw,38px);font-weight:800;letter-spacing:-1.1px;margin:0}
        .am-subtitle{color:#8390a0;font-size:13px;margin:10px 0 0;line-height:1.6}
        .am-primary,.am-secondary{display:inline-flex;align-items:center;justify-content:center;gap:8px;border-radius:10px;padding:12px 17px;font-size:12px;font-weight:800;cursor:pointer;text-decoration:none}
        .am-primary{background:#284e42;color:#fff;border:1px solid #284e42}
        .am-primary:disabled{opacity:.5;cursor:wait}
        .am-secondary{background:#fff;color:#526073;border:1px solid #e1e6ed}
        .am-panel,.am-metric,.am-candidate{background:#fff;border:1px solid #e6eaf0;border-radius:16px;box-shadow:0 4px 18px rgba(23,35,50,.035)}
        .am-panel{padding:24px;margin-bottom:24px}
        .am-panel h2{font-size:17px;font-weight:800;margin:0 0 7px}
        .am-panel p{font-size:12px;color:#8390a0;margin:0 0 19px}
        .am-label{display:block;font-size:12px;font-weight:800;color:#526073;margin-bottom:9px}
        .am-input{width:100%;min-height:44px;border:1px solid #e1e6ed;border-radius:10px;background:#fff;color:#263445;padding:11px 13px;font-family:Arial,sans-serif;font-size:13px;outline:none}
        .am-input:focus{border-color:#6e9a86;box-shadow:0 0 0 3px #eaf3ee}
        .am-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:15px;margin-bottom:24px}
        .am-metric{padding:21px}
        .am-metric-top{display:flex;align-items:center;justify-content:space-between;gap:8px;color:#647182;font-size:12px;font-weight:700}
        .am-metric-icon{width:38px;height:38px;display:grid;place-items:center;border-radius:10px;background:#edf4f0;color:#315f50}
        .am-metric strong{display:block;font-size:32px;font-weight:800;margin-top:11px;letter-spacing:-1px}
        .am-metric small{display:block;color:#96a0ad;font-size:11px;margin-top:5px}
        .am-section-head{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:15px;margin:27px 0 17px}
        .am-section-head h2{font-size:19px;font-weight:800;margin:0}
        .am-section-head p{font-size:12px;color:#8994a3;margin:7px 0 0}
        .am-filters{display:flex;align-items:center;flex-wrap:wrap;gap:11px;margin-bottom:20px}
        .am-search{flex:1;min-width:190px}
        .am-filter{min-width:140px}
        .am-list{display:grid;gap:15px}
        .am-candidate{padding:23px}
        .am-candidate-top{display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:16px}
        .am-person{display:flex;align-items:center;gap:13px;min-width:0}
        .am-avatar{width:46px;height:46px;border-radius:13px;background:#eaf3ee;color:#315f50;display:grid;place-items:center;font-size:19px;font-weight:800;flex-shrink:0}
        .am-name{display:block;color:#1e293b;text-decoration:none;font-size:16px;font-weight:800;margin-bottom:6px}
        .am-name:hover{color:#315f50}
        .am-role{color:#8994a3;font-size:12px}
        .am-candidate-actions{display:flex;align-items:center;flex-wrap:wrap;gap:10px}
        .am-score{border-radius:11px;padding:9px 13px;font-size:17px;font-weight:800}
        .am-score.high{background:#e8f6ee;color:#1e8058}
        .am-score.medium{background:#fff6e6;color:#a57523}
        .am-score.low{background:#fcecec;color:#b45050}
        .am-score.neutral{background:#f2f5f8;color:#8190a0;font-size:12px}
        .am-bar{height:7px;background:#edf0f3;border-radius:20px;overflow:hidden;margin:17px 0 11px}
        .am-bar-fill{height:100%;background:#315f50;border-radius:20px;transition:width .3s}
        .am-verdict{display:flex;gap:12px;flex-wrap:wrap;font-size:12px;color:#8390a0;margin-bottom:12px}
        .am-result{background:#f8faf9;border:1px solid #e5ece8;border-radius:12px;padding:20px;margin-top:18px}
        .am-result-summary{color:#526073;font-size:13px;line-height:1.8;margin:0 0 15px;white-space:pre-wrap}
        .am-result-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}
        .am-result-section h4{font-size:13px;margin:0 0 12px}
        .am-result-list{display:grid;gap:10px}
        .am-result-line{display:flex;align-items:flex-start;gap:9px;font-size:12px;line-height:1.7;color:#536173;overflow-wrap:anywhere}
        .am-list-mark{width:20px;height:20px;flex-shrink:0;display:grid;place-items:center;border-radius:6px;font-weight:800;font-size:11px}
        .am-list-mark.positive{background:#e6f5ec;color:#218055}
        .am-list-mark.warning{background:#fff1e5;color:#af762e}
        .am-list-mark.question{background:#e9eef9;color:#5876a9}
        .am-result-section.questions{grid-column:1/-1;border-top:1px solid #e3e9e6;padding-top:16px}
        .am-error{padding:13px 16px;border:1px solid #ebc7c7;background:#fff5f5;color:#a23b3b;border-radius:10px;font-size:12px;margin-bottom:17px}
        .am-notice{padding:13px 16px;border:1px solid #cde7d5;background:#edf8f1;color:#276446;border-radius:10px;font-size:12px;margin-bottom:17px}
        .am-empty{background:#fff;border:1px dashed #d5dce3;border-radius:15px;padding:48px 22px;text-align:center;color:#8994a3}
        .am-empty h3{font-size:17px;margin:12px 0 8px}
        .am-empty p{font-size:13px;margin:0;line-height:1.7}
        .am-mobile-top{display:none}
        @media(max-width:1100px){.am-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}}
        @media(max-width:800px){
          .am-shell{grid-template-columns:1fr}
          .am-sidebar{display:none}
          .am-mobile-top{display:flex;align-items:center;justify-content:space-between;background:#fff;padding:15px 19px;border-bottom:1px solid #e6eaf0}
          .am-mobile-menu{background:#fff;padding:14px 18px;border-bottom:1px solid #e6eaf0}
          .am-mobile-menu .am-side-inner{min-height:auto}
          .am-content{padding:24px 16px}
        }
        @media(max-width:540px){
          .am-metrics{gap:10px}
          .am-metric{padding:16px}
          .am-metric strong{font-size:27px}
          .am-panel,.am-candidate{padding:18px}
          .am-result-grid{grid-template-columns:1fr}
          .am-result-section.questions{grid-column:auto}
          .am-title{font-size:29px}
        }
      `}</style>

      <div className="am-shell">
        <aside className="am-sidebar">{sidebar}</aside>

        <div style={{ minWidth: 0 }}>
          <div className="am-mobile-top">
            <strong style={{ color: "#284e42" }}>
              ◈ Inspire Match
            </strong>
            <button className="am-secondary"
              onClick={() => setMobileNav((value) => !value)}>
              {mobileNav ? "Close ✕" : "☰ Menu"}
            </button>
          </div>

          {mobileNav && (
            <div className="am-mobile-menu">{sidebar}</div>
          )}

          <div className="am-content">
            <header className="am-header">
              <div>
                <div className="am-breadcrumb">
                  Workspace / <strong>AI Matching</strong>
                </div>
                <h1 className="am-title">AI Talent Matching</h1>
                <p className="am-subtitle">
                  Intelligent candidate assessments, job-fit
                  insights and interview recommendations.
                </p>
              </div>

              <button className="am-secondary"
                onClick={loadData} disabled={loading}>
                <Icon name="refresh" size={16} /> Refresh
              </button>
            </header>

            {errorMessage && (
              <div className="am-error" role="alert">
                {errorMessage}
              </div>
            )}

            {notice && (
              <div className="am-notice" role="status">
                {notice}
              </div>
            )}

            <section className="am-panel">
              <h2>Select Job Requisition</h2>
              <p>
                Compare candidates against a specific job.
                Assessments are maintained separately per job.
              </p>
              <label className="am-label" htmlFor="am-job">
                Job Opening
              </label>
              <select id="am-job" className="am-input"
                value={selectedJobId}
                onChange={(event) => {
                  setSelectedJobId(event.target.value);
                  setSearch("");
                  setFilter("all");
                  setNotice("");
                }}>
                <option value="">Choose a job to begin</option>
                {jobs.map((job) => (
                  <option key={job.id} value={String(job.id)}>
                    {job.title} ({job.status || "Active"})
                  </option>
                ))}
              </select>
            </section>

            {loading ? (
              <div className="am-empty">
                Loading AI Matching workspace...
              </div>
            ) : !selectedJobId ? (
              <div className="am-empty">
                <Icon name="spark" size={30} />
                <h3>Your AI Matching Workspace</h3>
                <p>
                  Select a job above to review saved AI assessments
                  or evaluate candidates.
                </p>
              </div>
            ) : (
              <>
                <div className="am-metrics">
                  <Metric icon="users" label="Candidates"
                    value={stats.total}
                    note="Available for evaluation" />
                  <Metric icon="check" label="Assessed"
                    value={stats.assessed}
                    note="With numerical AI scores" />
                  <Metric icon="spark" label="Strong Matches"
                    value={stats.strong}
                    note="AI score of 80% or higher" />
                  <Metric icon="chart" label="Average Match"
                    value={stats.average}
                    note="Across scored candidates" />
                </div>

                <div className="am-section-head">
                  <div>
                    <h2>{selectedJob?.title || "Job"} — Talent Ranking</h2>
                    <p>
                      AI scores support human review;
                      they are not hiring decisions.
                    </p>
                  </div>
                  <span style={{ fontSize: 12, color: "#8994a3" }}>
                    {visibleCandidates.length} candidates
                  </span>
                </div>

                <div className="am-filters">
                  <input className="am-input am-search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search candidates..."
                    aria-label="Search candidates" />

                  <select className="am-input am-filter"
                    value={filter}
                    onChange={(event) => setFilter(event.target.value)}
                    aria-label="Filter assessments">
                    <option value="all">All Candidates</option>
                    <option value="assessed">Assessed</option>
                    <option value="unassessed">Not Scored</option>
                    <option value="strong">Strong Matches</option>
                  </select>

                  <select className="am-input am-filter"
                    value={sortBy}
                    onChange={(event) => setSortBy(event.target.value)}
                    aria-label="Sort candidates">
                    <option value="score">Highest Score</option>
                    <option value="lowest">Lowest Score</option>
                    <option value="name">Name A–Z</option>
                  </select>
                </div>

                {visibleCandidates.length === 0 ? (
                  <div className="am-empty">
                    <h3>No candidates found</h3>
                    <p>Adjust the filters or add candidates first.</p>
                  </div>
                ) : (
                  <div className="am-list">
                    {visibleCandidates.map((candidate) => {
                      const key = `${selectedJobId}:${candidate.id}`;
                      const result = candidate.result;
                      const score = getScore(result);
                      const isMatching =
                        matchingCandidateId === candidate.id;
                      const isExpanded = expanded[key] ?? true;
                      const hasAssessment =
                        result && !result.error &&
                        (score != null || result.summary ||
                          result.verdict);

                      return (
                        <article className="am-candidate"
                          key={candidate.id}>
                          <div className="am-candidate-top">
                            <div className="am-person">
                              <div className="am-avatar">
                                {(candidate.full_name || "C")
                                  .charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <Link className="am-name"
                                  href={`/app/candidates/${candidate.id}`}>
                                  {candidate.full_name ||
                                    "Unnamed Candidate"}
                                </Link>
                                <div className="am-role">
                                  {candidate.current_title ||
                                    "Title not provided"}
                                  {" · "}
                                  {STAGES.includes(candidate.status)
                                    ? candidate.status
                                    : "No stage"}
                                </div>
                              </div>
                            </div>

                            <div className="am-candidate-actions">
                              <span className={
                                `am-score ${scoreTone(score)}`
                              }>
                                {score == null
                                  ? "Not Scored"
                                  : `${score}% Match`}
                              </span>

                              <button type="button"
                                className="am-primary"
                                disabled={matchingCandidateId !== null}
                                onClick={() =>
                                  runAIMatch(candidate.id)
                                }>
                                <Icon name="spark" size={15} />
                                {isMatching
                                  ? "Analyzing..."
                                  : hasAssessment
                                    ? "Re-run AI"
                                    : "Run AI Match"}
                              </button>
                            </div>
                          </div>

                          {score != null && (
                            <div className="am-bar">
                              <div className="am-bar-fill"
                                style={{
                                  width: `${Math.min(100, Math.max(0, score))}%`,
                                }} />
                            </div>
                          )}

                          {result?.error && (
                            <div className="am-error"
                              style={{ marginTop: 17, marginBottom: 0 }}>
                              {result.error}
                            </div>
                          )}

                          {hasAssessment && (
                            <>
                              <div className="am-verdict"
                                style={{ marginTop: 13 }}>
                                {result.verdict && (
                                  <strong style={{ color: "#315f50" }}>
                                    {result.verdict}
                                  </strong>
                                )}
                                {result.confidence && (
                                  <span>
                                    Confidence: {result.confidence}
                                  </span>
                                )}
                                {result.evaluatedAt && (
                                  <span>
                                    Evaluated:{" "}
                                    {new Date(
                                      result.evaluatedAt
                                    ).toLocaleString()}
                                  </span>
                                )}
                              </div>

                              <button type="button"
                                className="am-secondary"
                                onClick={() =>
                                  setExpanded((previous) => ({
                                    ...previous,
                                    [key]: !isExpanded,
                                  }))
                                }>
                                {isExpanded
                                  ? "Hide AI Insights"
                                  : "View AI Insights"}
                              </button>

                              {isExpanded && (
                                <div className="am-result">
                                  {result.summary && (
                                    <p className="am-result-summary">
                                      {result.summary}
                                    </p>
                                  )}

                                  <div className="am-result-grid">
                                    <ResultList
                                      title="Key Strengths"
                                      items={result.strengths}
                                      type="positive" />
                                    <ResultList
                                      title="Missing / Unverified Requirements"
                                      items={result.gaps}
                                      type="warning" />
                                    <div className="am-result-section questions">
                                      <ResultList
                                        title="Suggested Interview Questions"
                                        items={result.interviewQuestions}
                                        type="question" />
                                    </div>
                                  </div>

                                  <p style={{
                                    color: "#96a0ad",
                                    fontSize: 11,
                                    margin: "18px 0 0",
                                  }}>
                                    AI assessment for the selected job only.
                                    Verify conclusions against candidate
                                    evidence before making decisions.
                                  </p>
                                </div>
                              )}
                            </>
                          )}
                        </article>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
