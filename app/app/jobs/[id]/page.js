"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import ATSNavigation from "@/components/ATSNavigation";
import NotificationBell from "@/components/NotificationBell";

const fields = [
  ["department", "Department"],
  ["location", "Location"],
  ["work_type", "Work Type"],
  ["employment_type", "Employment Type"],
  ["years_of_experience", "Experience"],
  ["openings", "Openings"],
  ["priority", "Priority"],
  ["hiring_manager", "Hiring Manager"],
  ["salary_proposed", "Proposed Salary"],
  ["deadline", "Hiring Deadline"],
];
const sections = [
  ["description", "Job Description"],
  ["responsibilities", "Responsibilities"],
  ["requirements", "Requirements"],
  ["required_skills", "Required Skills"],
  ["nice_to_have_requirements", "Nice to Have"],
  ["benefits", "Benefits"],
];

export default function JobDetailsPage() {
  const params = useParams();
  const id = params?.id;
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      if (!id) return;
      setLoading(true);
      setMessage("");
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) throw new Error("Please log in to view this job.");

        const { data: memberships, error: membershipError } = await supabase
          .from("company_members")
          .select("company_id")
          .eq("user_id", user.id)
          .limit(2);
        if (membershipError) throw membershipError;
        if (!memberships || memberships.length !== 1) {
          throw new Error("Could not verify your company.");
        }

        const { data, error } = await supabase
          .from("jobs")
          .select("*")
          .eq("id", id)
          .eq("company_id", memberships[0].company_id)
          .maybeSingle();
        if (error) throw error;
        if (!data) throw new Error("Job not found or you do not have access.");
        if (active) setJob(data);
      } catch (error) {
        if (active) {
          setJob(null);
          setMessage(error.message || "Unable to load job.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [id]);

  const [mobileNav, setMobileNav] = useState(false);

  const navigation = (
    <div className="jd-side-inner">
      <div className="jd-brand">
        <div className="jd-logo">✦</div>
        <div><strong>Inspire Match</strong><small>TALENT INTELLIGENCE</small></div>
      </div>
      <div className="jd-side-label">WORKSPACE</div>
      <ATSNavigation
        className="jd-navigation"
        linkClassName="jd-nav-item"
        onNavigate={() => setMobileNav(false)}
      />
      <div className="jd-side-footer">
        <Link href="/">↗ ATS Home</Link>
        <Link href="/app/jobs">← Back to Jobs</Link>
        <small>© Inspire Match ATS</small>
      </div>
    </div>
  );

  return (
    <div className="jd-root">
      <style>{`
        .jd-root { --jd-green:#284e42; --jd-dark:#173a33; --jd-muted:#697c79; --jd-border:#e2eae6; min-height:100vh; background:#f6f8fb; color:#203a35; font-family:Arial, sans-serif; font-size:14px; }
        .jd-root * { box-sizing:border-box; }
        .jd-root h1,.jd-root h2,.jd-root h3 { font-family:Arial,sans-serif; color:inherit; line-height:1.3; }
        .jd-shell { display:grid; grid-template-columns:254px minmax(0,1fr); min-height:100vh; width:100%; max-width:100%; }
        .jd-sidebar { position:sticky; top:0; height:100vh; overflow-y:auto; background:#fff; border-right:1px solid var(--jd-border); padding:24px 15px; }
        .jd-side-inner { min-height:100%; display:flex; flex-direction:column; }
        .jd-brand { display:flex; align-items:center; gap:11px; padding:7px 12px 26px; border-bottom:1px solid #edf0f2; margin-bottom:25px; }
        .jd-logo { width:42px; height:42px; border-radius:12px; background:var(--jd-green); color:#fff; display:grid; place-items:center; font-size:23px; font-weight:800; flex-shrink:0; }
        .jd-brand strong { display:block; font-size:17px; color:#1e293b; }
        .jd-brand small { display:block; color:#8795a4; font-size:9px; font-weight:800; letter-spacing:1.4px; margin-top:4px; }
        .jd-side-label { color:#9ba6b2; font-size:10px; font-weight:800; letter-spacing:1.5px; padding:0 14px; margin-bottom:10px; }
        .jd-navigation { display:grid; gap:4px; }
        .jd-nav-item { display:flex; align-items:center; gap:12px; padding:13px 15px; border-radius:10px; text-decoration:none; color:#657285; font-size:13px; font-weight:600; border-left:3px solid transparent; white-space:nowrap; }
        .jd-nav-item span { width:23px; text-align:center; font-size:19px; }
        .jd-nav-item:hover { background:#f4f7f6; color:var(--jd-green); }
        .jd-nav-item.active { background:#eaf3ee; color:#245340; border-left-color:#315f50; font-weight:800; }
        .jd-side-footer { margin-top:auto; display:grid; gap:8px; padding-top:30px; }
        .jd-side-footer a { color:#657285; text-decoration:none; padding:10px 15px; font-weight:600; }
        .jd-side-footer small { color:#a1acb8; font-size:10px; padding:10px 15px; }
        .jd-workspace { min-width:0; width:100%; max-width:100%; overflow-x:clip; }
        .jd-mobile-bar { display:none; }
        .jd-main { width:100%; max-width:1250px; margin:0 auto; padding:25px clamp(16px,3vw,44px) 60px; min-width:0; }
        .jd-topbar { display:flex; justify-content:space-between; align-items:center; gap:16px; flex-wrap:wrap; margin-bottom:18px; }
        .jd-eyebrow { color:#7a8e8a; font-size:11px; font-weight:800; letter-spacing:1.3px; text-transform:uppercase; }
        .jd-page-title { font-size:clamp(24px,3vw,32px); font-weight:800; margin:5px 0 0; }
        .jd-back { display:inline-flex; align-items:center; gap:8px; color:var(--jd-green); background:#fff; border:1px solid var(--jd-border); padding:11px 16px; border-radius:11px; text-decoration:none; font-weight:700; }
        .jd-back:hover { background:#eaf3ee; }
        .jd-hero { background:linear-gradient(120deg,#1e5144,#0d6a52); color:#fff; border-radius:20px; padding:clamp(24px,4vw,38px); box-shadow:0 14px 35px rgba(26,76,61,.12); overflow-wrap:anywhere; }
        .jd-hero-label { font-size:11px; font-weight:800; letter-spacing:1.8px; opacity:.8; }
        .jd-hero h2 { font-size:clamp(26px,3.3vw,40px); font-weight:800; margin:12px 0 16px; color:#fff; }
        .jd-hero-meta { display:flex; gap:10px; flex-wrap:wrap; align-items:center; }
        .jd-pill { display:inline-flex; padding:8px 12px; border-radius:999px; background:rgba(255,255,255,.15); color:#fff; font-size:12px; font-weight:700; }
        .jd-section-title { margin:28px 0 14px; font-size:18px; font-weight:800; }
        .jd-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr)); gap:14px; }
        .jd-card { min-width:0; background:#fff; border:1px solid var(--jd-border); border-radius:15px; padding:20px; box-shadow:0 4px 15px rgba(22,54,43,.025); }
        .jd-card-label { color:#7b8d89; font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:.6px; margin-bottom:9px; }
        .jd-card-value { color:#213e35; font-size:15px; font-weight:700; overflow-wrap:anywhere; }
        .jd-description { background:#fff; border:1px solid var(--jd-border); border-radius:17px; padding:clamp(20px,3vw,30px); margin-top:16px; min-width:0; }
        .jd-description h3 { font-size:18px; font-weight:800; margin:0 0 16px; }
        .jd-description-text { white-space:pre-wrap; overflow-wrap:anywhere; line-height:1.85; color:#4a625b; }
        .jd-notice { background:#fff; border:1px solid var(--jd-border); padding:24px; border-radius:16px; margin-top:20px; overflow-wrap:anywhere; }

        /* Unified premium workspace styling based on the existing ATS dashboard and AI Shortlisting */
        .jd-workspace-topbar { display:flex; justify-content:space-between; align-items:center; gap:20px; flex-wrap:wrap; padding:19px clamp(16px,3vw,44px); background:#fff; border-bottom:1px solid #e3e9e3; }
        .jd-workspace-heading { display:flex; flex-direction:column; gap:4px; }
        .jd-workspace-heading span { font-size:10px; font-weight:800; letter-spacing:1.5px; color:#879a8e; }
        .jd-workspace-heading strong { font-size:19px; font-weight:800; color:#1e3b32; }
        .jd-workspace-actions { display:flex; align-items:center; gap:17px; flex-wrap:wrap; }
        .jd-overview-link { text-decoration:none; color:#315f50; font-weight:800; font-size:13px; }
        .jd-account { display:flex; align-items:center; gap:10px; border-left:1px solid #e3e9e3; padding-left:16px; color:#1e3b32; font-size:12px; font-weight:800; }
        .jd-account small { display:block; font-size:10px; color:#879a8e; font-weight:600; margin-top:3px; }
        .jd-avatar { width:36px; height:36px; border-radius:11px; background:#e6ece2; color:#1e3b32; display:grid; place-items:center; font-weight:900; }
        .jd-page-subtitle { color:#8390a0; font-size:13px; margin:8px 0 0; }
        .jd-hero { padding:23px 28px; background:linear-gradient(115deg,#1e3b32,#315f50); box-shadow:0 10px 25px rgba(30,59,50,.08); }
        .jd-hero h2 { font-size:clamp(24px,2.7vw,33px); margin:7px 0 12px; }
        .jd-pill { padding:6px 11px; }
        .jd-card { padding:18px 20px; }
        .jd-card-heading { display:flex; align-items:center; gap:10px; margin-bottom:12px; }
        .jd-card-icon { display:grid; place-items:center; width:32px; height:32px; border-radius:9px; background:#edf4ef; color:#315f50; font-size:16px; flex-shrink:0; }
        .jd-card-label { margin:0; }
        .jd-description { border-radius:14px; box-shadow:0 4px 16px rgba(22,54,43,.025); }
        .jd-section-title { margin-top:25px; }
        @media(max-width:600px) { .jd-workspace-topbar { padding:14px; } .jd-account { display:none; } .jd-workspace-actions { gap:12px; } .jd-hero { padding:22px 19px; } }
        @media(max-width:900px) { .jd-shell { grid-template-columns:minmax(0,1fr); } .jd-sidebar { display:none; } .jd-mobile-bar { display:flex; align-items:center; justify-content:space-between; padding:15px 20px; background:#fff; border-bottom:1px solid var(--jd-border); gap:12px; } .jd-menu-button { border:0; border-radius:9px; background:#eaf3ee; color:var(--jd-green); padding:10px 14px; font-weight:800; cursor:pointer; } .jd-mobile-menu { padding:15px; background:#fff; border-bottom:1px solid var(--jd-border); } .jd-mobile-menu .jd-side-inner { min-height:0; } .jd-mobile-menu .jd-side-footer { margin-top:15px; } }
        @media(max-width:520px) { .jd-main { padding:20px 14px 50px; } .jd-hero { border-radius:15px; } .jd-topbar { align-items:flex-start; } }
      `}</style>
      <div className="jd-shell">
        <aside className="jd-sidebar">{navigation}</aside>
        <div className="jd-workspace">
          <div className="jd-mobile-bar">
            <strong>◈ Inspire Match</strong>
            <button type="button" className="jd-menu-button" onClick={() => setMobileNav((value) => !value)} aria-expanded={mobileNav}>
              {mobileNav ? "✕ Close" : "☰ Menu"}
            </button>
          </div>
          {mobileNav && <div className="jd-mobile-menu">{navigation}</div>}
          <header className="jd-workspace-topbar">
              <div className="jd-workspace-heading">
                <span>RECRUITMENT WORKSPACE</span>
                <strong>Job Details</strong>
              </div>
              <div className="jd-workspace-actions">
                <NotificationBell />
                <Link href="/app/dashboard" className="jd-overview-link">Overview ↗</Link>
                <div className="jd-account"><span className="jd-avatar">IM</span><span>Inspire Match<small>Talent Intelligence</small></span></div>
              </div>
          </header>
          <main className="jd-main">
            <div className="jd-topbar">
              <div>
                <div className="jd-eyebrow">Workspace / Jobs / Details</div>
                <p className="jd-page-subtitle">Requisition details and hiring requirements</p>
              </div>
              <Link href="/app/jobs" className="jd-back">← Back to Jobs</Link>
            </div>
            {loading ? (
              <div className="jd-notice">Loading job details...</div>
            ) : message ? (
              <div className="jd-notice" role="alert">{message}</div>
            ) : job ? (
              <>
                <header className="jd-hero">
                  <div className="jd-hero-label">JOB REQUISITION · #{job.id}</div>
                  <h2>{job.title}</h2>
                  <div className="jd-hero-meta">
                    <span className="jd-pill">{job.status || "Active"}</span>
                    {job.location && <span className="jd-pill">◎ {job.location}</span>}
                    {job.department && <span className="jd-pill">▣ {job.department}</span>}
                  </div>
                </header>
                <h2 className="jd-section-title">Job Information</h2>
                <section className="jd-grid" aria-label="Job information">
                  {fields.filter(([key]) => job[key] !== null && job[key] !== undefined && job[key] !== "").map(([key, label]) => (
                    <div className="jd-card" key={key}>
                      <div className="jd-card-heading"><span className="jd-card-icon" aria-hidden="true">{({department:"▣",location:"⌖",work_type:"◷",employment_type:"▤",years_of_experience:"◈",openings:"♙",priority:"◇",hiring_manager:"♧",salary_proposed:"¤",deadline:"▦"})[key] || "▣"}</span><div className="jd-card-label">{label}</div></div>
                      <div className="jd-card-value">{String(job[key])}</div>
                    </div>
                  ))}
                </section>
                <h2 className="jd-section-title">Job Requirements &amp; Description</h2>
                {sections.filter(([key]) => job[key]).map(([key, label]) => (
                  <section className="jd-description" key={key}>
                    <h3>{label}</h3>
                    <div className="jd-description-text">{String(job[key])}</div>
                  </section>
                ))}
              </>
            ) : null}
          </main>
        </div>
      </div>
    </div>
  );
}
