"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import ATSNavigation from "@/components/ATSNavigation";

const HR_ROLES = ["admin", "hr_manager", "senior_recruiter", "hr", "recruiter", "hr_specialist"];
const css = [
  ".cc-root{min-height:100vh;background:#f5f8f6;color:#214632;font:14px/1.6 Arial,sans-serif}",
  ".cc-root *{box-sizing:border-box}.cc-shell{display:grid;grid-template-columns:252px minmax(0,1fr);min-height:100vh}",
  ".cc-side{background:#fff;border-right:1px solid #e4ede6;padding:27px 14px}.cc-brand{padding:4px 13px 30px;font-size:18px;font-weight:850;color:#174b34}",
  ".cc-brand small{display:block;color:#819687;font-size:10px;letter-spacing:1.5px}.cc-main{min-width:0;padding:25px clamp(18px,3vw,52px) 60px}",
  ".cc-wrap{max-width:1450px;margin:auto}.cc-nav{display:flex;flex-direction:column;gap:4px}",
  ".cc-nav a{display:flex;align-items:center;gap:10px;min-height:39px;padding:10px 12px;text-decoration:none;color:#5d7267;font-size:12px;font-weight:700;border-radius:10px}",
  ".cc-nav a:hover,.cc-nav a.active{background:#e5f2e9;color:#145f42}",
  ".cc-top{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:20px}",
  ".cc-link{color:#176b49;text-decoration:none;font-size:12px;font-weight:800}",
  ".cc-hero{background:linear-gradient(115deg,#103c2c,#176448 72%,#217755);border-radius:22px;padding:32px 35px;color:#fff}",
  ".cc-hero small{font-size:10px;letter-spacing:2px;color:#c0e8d0;font-weight:800}.cc-hero h1{color:#fff;font-size:clamp(26px,3vw,36px);margin:9px 0}",
  ".cc-hero p{max-width:820px;font-size:13px;color:#dceee4;margin:0}",
  ".cc-controls{display:flex;align-items:end;flex-wrap:wrap;gap:12px;margin:24px 0 15px}",
  ".cc-controls label{flex:1;min-width:205px;color:#60816c;font-size:11px;font-weight:800}",
  ".cc-input{width:100%;min-height:42px;margin-top:6px;padding:10px 12px;border-radius:10px;border:1px solid #d8e6dc;background:#fff;color:#244e35;font:13px Arial,sans-serif}",
  ".cc-btn{border:1px solid #d3e5d8;background:#fff;color:#176344;padding:11px 16px;border-radius:10px;font-size:12px;font-weight:800;cursor:pointer;text-decoration:none;display:inline-block}",
  ".cc-btn.primary{background:#176448;border-color:#176448;color:#fff}.cc-btn:disabled{opacity:.5;cursor:not-allowed}",
  ".cc-panel{background:#fff;border:1px solid #e2ebe4;border-radius:16px;padding:22px;margin-top:18px}.cc-panel h2{font-size:18px;color:#173f2d;margin:0 0 5px}",
  ".cc-muted{font-size:12px;color:#819489;margin:0 0 14px}.cc-alert{margin:16px 0;padding:14px 16px;background:#fff1e7;color:#98542f;border-radius:11px}",
  ".cc-success{margin:16px 0;padding:14px 16px;background:#ecf7ee;color:#266c45;border-radius:11px}",
  ".cc-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(235px,1fr));gap:10px}",
  ".cc-choice{padding:14px;border:1px solid #e1e9e3;border-radius:12px;background:#fff;text-align:left;cursor:pointer;color:#284b35;min-height:125px}",
  ".cc-choice.checked{background:#edf8f0;border:2px solid #238251;padding:13px}.cc-choice:disabled{opacity:.5;cursor:not-allowed}",
  ".cc-choice strong{display:block;font-size:13px;margin-bottom:3px}.cc-choice small{display:block;color:#819388;font-size:11px}",
  ".cc-score{display:inline-block;border-radius:9px;padding:4px 9px;background:#e7f3eb;color:#176d47;font-size:14px;font-weight:850;margin-top:9px}",
  ".cc-grid{display:grid;grid-template-columns:repeat(var(--cols),minmax(0,1fr));gap:13px;margin-top:15px}",
  ".cc-card{border:1px solid #e0e9e2;background:#fff;border-radius:14px;padding:18px;min-width:0}",
  ".cc-card h3{font-size:17px;line-height:1.3;margin:0;color:#1b4830;overflow-wrap:anywhere}.cc-card h4{font-size:12px;margin:22px 0 8px;color:#246847}",
  ".cc-card p{font-size:12px;color:#60796a;white-space:pre-wrap;overflow-wrap:anywhere}.cc-card ul{padding-left:20px;margin:5px 0}",
  ".cc-card li{font-size:12px;color:#41604b;margin:7px 0;overflow-wrap:anywhere}.cc-tag{font-size:11px;color:#7e9383}",
  ".cc-card a{color:#137149;font-size:12px;font-weight:800;text-decoration:none}",
  ".cc-overflow{overflow-x:auto}.cc-small{font-size:11px;color:#819489;margin-top:15px}",
  "@media(max-width:1000px){.cc-grid{grid-template-columns:repeat(2,minmax(240px,1fr))}}",
  "@media(max-width:760px){.cc-shell{display:block}.cc-side{padding:12px;border-bottom:1px solid #e4ede6}.cc-brand{padding:6px 8px}.cc-nav{flex-direction:row;overflow-x:auto}.cc-nav a{flex-shrink:0}.cc-main{padding:16px}.cc-hero{padding:25px 22px}.cc-grid{grid-template-columns:1fr}}"
].join("\n");

function list(value) {
  if (Array.isArray(value)) return value.filter((x) => typeof x === "string" && x.trim()).slice(0, 12);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return list(parsed);
    } catch {}
    return value.trim() ? [value.trim()] : [];
  }
  return [];
}

function score(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(100, number)) : null;
}

function csvCell(value) {
  const clean = String(value ?? "").replace(/[\r\n\t]+/g, " ");
  const escaped = /^[=+\-@]/.test(clean) ? "'" + clean : clean;
  return '"' + escaped.replace(/"/g, '""') + '"';
}

function Evidence({ title, values }) {
  const items = list(values);
  return <section><h4>{title}</h4>{items.length ?
    <ul>{items.map((item, i) => <li key={i}>{item}</li>)}</ul> :
    <p>Not documented in the saved assessment.</p>}</section>;
}

export default function CandidateComparisonPage() {
  const [companyId, setCompanyId] = useState("");
  const [jobs, setJobs] = useState([]);
  const [jobId, setJobId] = useState("");
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [error, setError] = useState("");
  const [truncated, setTruncated] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const auth = await supabase.auth.getUser();
        if (auth.error || !auth.data?.user) throw new Error("Please sign in to continue.");
        const membership = await supabase.from("company_members")
          .select("company_id,role").eq("user_id", auth.data.user.id).limit(2);
        if (membership.error || membership.data?.length !== 1) {
          throw new Error("Company access could not be verified.");
        }
        if (!HR_ROLES.includes(String(membership.data[0].role || "").toLowerCase())) {
          throw new Error("Candidate comparison is available to authorized HR team members.");
        }
        const company = membership.data[0].company_id;
        const jobsResult = await supabase.from("jobs").select("id,title,status")
          .eq("company_id", company).order("created_at", { ascending: false }).limit(1000);
        if (jobsResult.error) throw jobsResult.error;
        if (!active) return;
        const available = jobsResult.data || [];
        const requested = new URLSearchParams(window.location.search).get("job");
        const chosen = available.some((job) => String(job.id) === requested)
          ? requested : String(available[0]?.id || "");
        setJobs(available);
        setCompanyId(company);
        setJobId(chosen);
      } catch (err) {
        if (active) setError(err.message || "Could not load your workspace.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!companyId || !jobId) { setRows([]); return; }
    let active = true;
    (async () => {
      setLoadingCandidates(true);
      setError("");
      try {
        const [matches, candidates] = await Promise.all([
          supabase.from("ai_match_results")
            .select("candidate_id,score,confidence,verdict,summary,strengths,gaps,interview_questions,evaluated_at")
            .eq("company_id", companyId).eq("job_id", jobId).limit(5000),
          supabase.from("candidates")
            .select("id,full_name,current_title,status")
            .eq("company_id", companyId).is("deleted_at", null).limit(5000),
        ]);
        if (matches.error) throw matches.error;
        if (candidates.error) throw candidates.error;
        if (!active) return;
        const byId = new Map((candidates.data || []).map((candidate) => [String(candidate.id), candidate]));
        const available = (matches.data || []).flatMap((match) => {
          const candidate = byId.get(String(match.candidate_id));
          return candidate ? [{ ...candidate, assessment: match }] : [];
        });
        available.sort((a, b) => {
          const left = score(a.assessment.score);
          const right = score(b.assessment.score);
          if (left === null) return 1;
          if (right === null) return -1;
          return right - left;
        });
        setRows(available);
        setSelected((current) => current.filter((id) => available.some((c) => String(c.id) === id)));
        setTruncated((matches.data || []).length === 5000 || (candidates.data || []).length === 5000);
      } catch (err) {
        if (active) {
          setError(err.message || "Could not load saved AI assessments.");
          setRows([]);
        }
      } finally {
        if (active) setLoadingCandidates(false);
      }
    })();
    return () => { active = false; };
  }, [companyId, jobId]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((c) => [c.full_name, c.current_title, c.status]
      .some((field) => String(field || "").toLowerCase().includes(q)));
  }, [rows, search]);

  const compared = selected.map((id) => rows.find((c) => String(c.id) === id)).filter(Boolean);
  const job = jobs.find((j) => String(j.id) === jobId);

  function toggle(id) {
    setSelected((current) => current.includes(id)
      ? current.filter((value) => value !== id)
      : current.length < 4 ? [...current, id] : current);
  }

  function exportComparison() {
    if (compared.length < 2) return;
    const columns = ["Candidate", "Role", "Pipeline stage", "AI score", "Confidence",
      "AI assessment", "Summary", "Evidence of strengths", "Information gaps",
      "Interview questions", "Assessed at"];
    const data = compared.map((c) => [c.full_name, c.current_title, c.status,
      score(c.assessment.score), c.assessment.confidence, c.assessment.verdict,
      c.assessment.summary, list(c.assessment.strengths).join("; "),
      list(c.assessment.gaps).join("; "), list(c.assessment.interview_questions).join("; "),
      c.assessment.evaluated_at]);
    const body = [columns, ...data].map((record) => record.map(csvCell).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF" + body], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "inspire-match-candidate-comparison.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="cc-root">
      <style>{css}</style>
      <div className="cc-shell">
        <aside className="cc-side">
          <div className="cc-brand">Inspire Match<small>TALENT INTELLIGENCE</small></div>
          <ATSNavigation className="cc-nav" />
        </aside>
        <div className="cc-main"><div className="cc-wrap">
          <div className="cc-top">
            <span className="cc-tag">Recruitment Intelligence / Candidate Comparison</span>
            <Link className="cc-link" href="/app/matching">← AI Matching</Link>
          </div>
          <header className="cc-hero">
            <small>AI MATCHING / EVIDENCE-BASED REVIEW</small>
            <h1>Candidate Comparison</h1>
            <p>Compare two to four candidates assessed for the same job, side by side.
              See recorded strengths, information gaps and interview questions without replacing recruiter judgment.</p>
          </header>

          {error && <div className="cc-alert" role="alert">{error}</div>}
          {truncated && <div className="cc-alert">This workspace has more records than the comparison page can load.
            The results below may be incomplete.</div>}

          <div className="cc-controls">
            <label>Job to compare
              <select className="cc-input" value={jobId}
                onChange={(e) => { setJobId(e.target.value); setSelected([]); setSearch(""); }}
                disabled={loading || !jobs.length}>
                {!jobs.length && <option value="">No jobs available</option>}
                {jobs.map((item) => <option key={item.id} value={String(item.id)}>
                  {item.title || "Untitled job"}{item.status ? " · " + item.status : ""}
                </option>)}
              </select>
            </label>
            <label>Find assessed candidate
              <input className="cc-input" value={search}
                onChange={(e) => setSearch(e.target.value)} placeholder="Search name, role or stage" />
            </label>
            <button className="cc-btn" type="button"
              onClick={() => setSelected([])} disabled={!selected.length}>Clear selection</button>
            <button className="cc-btn primary" type="button"
              onClick={exportComparison} disabled={compared.length < 2}>Export comparison CSV</button>
          </div>

          <section className="cc-panel">
            <h2>Choose candidates <span className="cc-tag">({selected.length}/4 selected)</span></h2>
            <p className="cc-muted">Showing existing AI evaluations for {job?.title || "the selected job"}.
              To assess someone new, use AI Matching first.</p>
            {loading || loadingCandidates ? <p className="cc-muted">Loading assessments...</p> :
              shown.length ? <div className="cc-list">
                {shown.map((c) => {
                  const id = String(c.id);
                  const checked = selected.includes(id);
                  return <button type="button" key={id}
                    aria-pressed={checked}
                    className={"cc-choice" + (checked ? " checked" : "")}
                    disabled={!checked && selected.length >= 4}
                    onClick={() => toggle(id)}>
                    <strong>{checked ? "✓ " : "+ "}{c.full_name || "Unnamed candidate"}</strong>
                    <small>{c.current_title || "Role not recorded"}</small>
                    <small>Stage: {c.status || "Unknown"}</small>
                    <span className="cc-score">{score(c.assessment.score) == null
                      ? "Not enough evidence" : score(c.assessment.score) + "% AI match"}</span>
                  </button>;
                })}
              </div> :
              <p className="cc-muted">No saved AI assessments found for this job.
                <Link className="cc-link" href="/app/matching"> Run AI Matching →</Link></p>
            }
          </section>

          <section className="cc-panel">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap"}}>
              <div><h2>Side-by-side assessment</h2>
                <p className="cc-muted">Select at least two candidates for an evidence-based comparison.</p>
              </div>
              <span className="cc-tag">{compared.length} candidates</span>
            </div>
            {compared.length < 2 ? <p className="cc-muted">Your comparison will appear here once two candidates are selected.</p> :
              <div className="cc-overflow"><div className="cc-grid" style={{"--cols": compared.length}}>
                {compared.map((c) => {
                  const result = c.assessment;
                  const number = score(result.score);
                  return <article className="cc-card" key={c.id}>
                    <h3>{c.full_name || "Unnamed candidate"}</h3>
                    <p>{c.current_title || "Role not recorded"} · {c.status || "Stage not recorded"}</p>
                    <div className="cc-score">{number === null ? "Insufficient evidence" : number + "% AI match"}</div>
                    <p className="cc-tag">{result.confidence || "Unknown"} confidence · {result.verdict || "Review required"}</p>
                    <h4>Assessment summary</h4>
                    <p>{result.summary || "No saved summary."}</p>
                    <Evidence title="Documented strengths" values={result.strengths} />
                    <Evidence title="Gaps and missing evidence" values={result.gaps} />
                    <Evidence title="Interview verification questions" values={result.interview_questions} />
                    <p className="cc-small">Evaluated {result.evaluated_at
                      ? new Date(result.evaluated_at).toLocaleDateString("en-GB") : "date unavailable"}.
                      Results reflect the saved assessment and may be outdated.</p>
                    <Link href={"/app/candidates/" + encodeURIComponent(String(c.id))}>Open candidate profile →</Link>
                  </article>;
                })}
              </div></div>
            }
            <p className="cc-small">AI scores are decision-support signals, not hiring decisions.
              Compare candidates only for the same job. Missing CV evidence does not mean missing ability.
              Exported reports contain personal recruitment information and must be shared only with authorized users.</p>
          </section>
        </div></div>
      </div>
    </main>
  );
}
