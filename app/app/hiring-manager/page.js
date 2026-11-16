"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import ATSNavigation from "@/components/ATSNavigation";

const isPending = (row) =>
  ["pending", "pending approval", "awaiting approval"].includes(
    String(row.step_status || "").trim().toLowerCase()
  );

export default function HiringManagerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [decisions, setDecisions] = useState([]);
  const [designPreview, setDesignPreview] = useState(false);

  async function loadDecisions() {
    const { data, error: rpcError } = await supabase.rpc("get_my_hiring_decisions");
    if (rpcError) throw rpcError;
    setDecisions(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data: auth, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!auth?.user) {
          router.replace("/app/login");
          return;
        }
        // Design-only preview shows no live hiring decisions or candidate data.
        // Authentication still applies, and this switch never authorizes data access.
        const requestedPreview = new URLSearchParams(window.location.search).get("designPreview") === "1";
        if (requestedPreview) {
          if (active) { setDesignPreview(true); setDecisions([]); }
          return;
        }
        const { data: memberships, error: membershipError } = await supabase
          .from("company_members")
          .select("company_id,role")
          .eq("user_id", auth.user.id)
          .limit(2);
        if (membershipError) throw membershipError;
        const memberRole = memberships?.length === 1 && memberships[0].company_id
          ? String(memberships[0].role || "").toLowerCase() : "";
        if (!["hiring_manager", "admin", "hr_manager"].includes(memberRole)) {
          throw new Error("This page requires a Hiring Manager role. To review the design without changing your role, open the Design Preview link.");
        }
        const { data, error: rpcError } = await supabase.rpc("get_my_hiring_decisions");
        if (rpcError) throw rpcError;
        if (active) setDecisions(Array.isArray(data) ? data : []);
      } catch (e) {
        if (active) setError(e?.message || "Could not load your workspace.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [router]);

  async function refresh() {
    if (refreshing || designPreview) return;
    setRefreshing(true);
    setError("");
    try {
      await loadDecisions();
    } catch (e) {
      setError(e?.message || "Could not refresh your decisions.");
    } finally {
      setRefreshing(false);
    }
  }

  const pending = decisions.filter(isPending);
  const completed = decisions.filter((item) => !isPending(item));

  return (
    <main className="hm-shell">
      <style>{`
        .hm-shell { min-height:100vh; background:#f5f8f6; color:#1e352c; font-family:Arial,sans-serif; }
        .hm-layout { display:grid; grid-template-columns:250px minmax(0,1fr); min-height:100vh; }
        .hm-aside { background:white; border-right:1px solid #e1e9e4; padding:28px 15px; }
        .hm-brand { padding:8px 12px 30px; border-bottom:1px solid #edf1ed; margin-bottom:22px; }
        .hm-mark { display:inline-grid; place-items:center; height:40px; width:40px; border-radius:12px; background:#1c6048; color:#fff; font-size:22px; font-weight:900; vertical-align:middle; margin-right:9px; }
        .hm-brand strong { color:#17412f; font-size:19px; }
        .hm-brand p { margin:10px 0 0; font-size:10px; color:#829188; letter-spacing:1.3px; font-weight:800; }
        .hm-nav { display:grid; gap:7px; }
        .hm-nav a { display:flex; gap:12px; align-items:center; padding:14px 15px; text-decoration:none; border-radius:11px; font-size:13px; font-weight:700; color:#52665c; }
        .hm-nav a.active,.hm-nav a:hover { color:#155e41; background:#e8f4ed; }
        .hm-nav a span { font-size:19px; width:22px; }
        .hm-aside-note { color:#8a9990; font-size:11px; line-height:1.7; padding:20px 12px; }
        .hm-content { width:100%; min-width:0; max-width:1450px; padding:42px clamp(20px,4vw,64px) 70px; margin:0 auto; }
        .hm-eyebrow { color:#178254; letter-spacing:1.7px; text-transform:uppercase; font-size:11px; font-weight:900; }
        .hm-header { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:20px; }
        .hm-header h1 { font-size:clamp(29px,3vw,40px); line-height:1.2; letter-spacing:-1.2px; margin:10px 0 12px; }
        .hm-muted { color:#7b8c83; font-size:14px; line-height:1.7; margin:0; }
        .hm-button { background:#196646; border:0; color:white; border-radius:11px; padding:14px 20px; font-weight:800; cursor:pointer; text-decoration:none; font-size:13px; }
        .hm-button:disabled { opacity:.6; cursor:not-allowed; }
        .hm-hero { background:linear-gradient(115deg,#104832,#207450); color:white; border-radius:20px; padding:30px; margin-top:30px; }
        .hm-hero h2 { color:white; font-size:24px; margin:0 0 10px; }
        .hm-hero p { color:#d8f0e2; margin:0; font-size:13px; line-height:1.7; }
        .hm-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:16px; margin-top:22px; }
        .hm-card { background:white; border:1px solid #e4ece6; border-radius:16px; padding:24px; }
        .hm-card-label { font-size:12px; font-weight:700; color:#7a8c81; }
        .hm-number { display:block; font-size:35px; font-weight:900; letter-spacing:-1px; margin-top:12px; }
        .hm-section { background:white; border:1px solid #e4ece6; border-radius:18px; padding:26px; margin-top:24px; }
        .hm-section-head { display:flex; justify-content:space-between; flex-wrap:wrap; gap:12px; align-items:center; margin-bottom:20px; }
        .hm-section h2 { margin:0; font-size:20px; }
        .hm-link { color:#176a49; font-weight:800; text-decoration:none; font-size:13px; }
        .hm-row { display:flex; justify-content:space-between; align-items:center; gap:18px; padding:18px 0; border-top:1px solid #edf1ee; }
        .hm-row strong { font-size:15px; }
        .hm-row small { display:block; color:#7a8c81; margin-top:8px; }
        .hm-pill { background:#fff5e4; color:#a2611d; border-radius:100px; font-size:11px; font-weight:800; padding:7px 12px; white-space:nowrap; }
        .hm-empty { border:1px dashed #d4e4d9; text-align:center; background:#fafdfa; border-radius:12px; padding:34px 20px; color:#6f8275; }
        .hm-error { background:#fff0ee; border:1px solid #f1b6b0; padding:16px; border-radius:10px; color:#9b2920; margin-top:18px; }
        @media(max-width:850px) { .hm-layout { grid-template-columns:1fr; } .hm-aside { border-right:0; border-bottom:1px solid #e1e9e4; padding:15px; } .hm-brand { padding:5px 0 12px; margin-bottom:12px; } .hm-nav { display:flex; flex-wrap:wrap; } .hm-content { padding:26px 16px 60px; } .hm-grid { grid-template-columns:1fr; } }
      `}</style>
      <div className="hm-layout">
        <aside className="hm-aside">
          <div className="hm-brand">
            <span className="hm-mark">I</span><strong>Inspire Match</strong>
            <p>HIRING MANAGER WORKSPACE</p>
          </div>
          <ATSNavigation className="hm-nav" />
          <div className="hm-aside-note">Access to candidate details and job assignments requires an approved, job-scoped permissions policy.</div>
        </aside>
        <div className="hm-content">
          <div className="hm-header">
            <div>
              <div className="hm-eyebrow">Your hiring workspace</div>
              <h1>Welcome back</h1>
              <p className="hm-muted">Review decisions assigned to you, without exposure to compensation data.</p>
            </div>
            <button className="hm-button" onClick={refresh} disabled={loading || refreshing || designPreview}>
              {refreshing ? "Refreshing…" : "↻ Refresh decisions"}
            </button>
          </div>
          {designPreview && <div role="status" style={{ background:"#e8f4ed", color:"#14553c", padding:"14px 18px", borderRadius:12, marginTop:22, fontSize:13, fontWeight:700 }}>Design preview only — no live recruitment records, approvals, or permissions are being displayed.</div>}
          {error && <div className="hm-error" role="alert">{error}</div>}
          {loading ? <p className="hm-muted" style={{ marginTop:28 }}>Loading your permissions and decisions…</p> :
            !error || decisions.length > 0 ? <>
              <div className="hm-hero">
                <h2>Every hiring decision matters.</h2>
                <p>See your assigned approval steps in one focused workspace.</p>
              </div>
              <div className="hm-grid">
                <div className="hm-card"><div className="hm-card-label">Pending decisions</div><span className="hm-number">{pending.length}</span></div>
                <div className="hm-card"><div className="hm-card-label">Other assigned steps</div><span className="hm-number">{completed.length}</span></div>
                <div className="hm-card"><div className="hm-card-label">Total assigned steps</div><span className="hm-number">{decisions.length}</span></div>
              </div>
              <section className="hm-section">
                <div className="hm-section-head">
                  <h2>Decisions awaiting your review</h2>
                  {!designPreview && <Link href="/app/approvals" className="hm-link">Go to Approval Center →</Link>}
                </div>
                {!pending.length ? <div className="hm-empty">You're all caught up. No pending decisions are assigned to you.</div> :
                  pending.map((item, index) =>
                    <div className="hm-row" key={String(item.offer_id || index) + ":" + String(item.step_name || "")}>
                      <div><strong>{item.job_title || "Assigned recruitment decision"}</strong>
                        <small>{item.step_name || "Approval step"}</small></div>
                      <span className="hm-pill">Pending review</span>
                    </div>
                  )}
              </section>
            </> : null}
        </div>
      </div>
    </main>
  );
}
