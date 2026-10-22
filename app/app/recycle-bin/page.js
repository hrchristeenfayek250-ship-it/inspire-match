
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

import ATSNavigation from "@/components/ATSNavigation";


export default function RecycleBinPage() {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [restoringId, setRestoringId] = useState(null);

  useEffect(() => {
    loadDeletedCandidates();
  }, []);

  async function loadDeletedCandidates() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("Please sign in again.");
      }

      const { data: memberships, error: membershipError } =
        await supabase
          .from("company_members")
          .select("company_id, role")
          .eq("user_id", user.id)
          .limit(2);

      if (membershipError || memberships?.length !== 1) {
        throw new Error("Company access denied.");
      }

      const { company_id: companyId, role } = memberships[0];

      const managerRoles = [
        "admin",
        "hr_manager",
        "senior_recruiter",
      ];

      const ownerRoles = [
        "hr",
        "recruiter",
        "hr_specialist",
      ];

      if (
        !managerRoles.includes(role) &&
        !ownerRoles.includes(role)
      ) {
        throw new Error("You do not have access to Recycle Bin.");
      }

      let query = supabase
        .from("candidates")
        .select("id, full_name, deleted_at, user_id")
        .eq("company_id", companyId)
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false });

      if (!managerRoles.includes(role)) {
        query = query.eq("user_id", user.id);
      }

      const { data, error: queryError } = await query;

      if (queryError) throw queryError;

      setCandidates(data || []);
    } catch (err) {
      setError(err.message || "Could not load Recycle Bin.");
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  }

  async function restoreCandidate(candidateId) {
    if (restoringId) return;

    const confirmed = window.confirm(
      "Restore this candidate to the Candidates Database?"
    );

    if (!confirmed) return;

    setRestoringId(candidateId);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        throw new Error("Please sign in again.");
      }

      const response = await fetch("/api/restore-candidate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ candidateId }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Restoration failed.");
      }

      setCandidates((previous) =>
        previous.filter((item) => item.id !== candidateId)
      );

      alert("Candidate restored successfully.");
    } catch (err) {
      alert(err.message || "Could not restore candidate.");
    } finally {
      setRestoringId(null);
    }
  }


  
  return (
    <main className="imc-root">
      <style>{`
        .imc-root{min-height:100vh;background:#f6f8fb;color:#1e293b;font:14px Arial,sans-serif}
        .imc-root *{box-sizing:border-box}
        .imc-shell{display:grid;grid-template-columns:254px minmax(0,1fr);min-height:100vh}
        .imc-sidebar{background:white;border-right:1px solid #e6eaf0;padding:24px 15px;position:sticky;top:0;height:100vh;overflow-y:auto}
        .imc-sidebar-inner{display:flex;flex-direction:column;min-height:100%}
        .imc-brand{display:flex;align-items:center;gap:11px;padding:7px 12px 26px;border-bottom:1px solid #edf0f2;margin-bottom:25px}
        .imc-logo{display:grid;place-items:center;width:42px;height:42px;border-radius:12px;background:#284e42;color:white;font-size:23px;font-weight:800}
        .imc-brand strong{display:block;font-size:17px;letter-spacing:-.5px}
        .imc-brand small{display:block;margin-top:4px;font-size:9px;letter-spacing:1.4px;color:#8795a4;font-weight:800}
        .imc-nav-label{padding:0 14px;margin-bottom:10px;color:#9ba6b2;font-size:10px;letter-spacing:1.5px;font-weight:800}
        .imc-navigation{display:grid;gap:4px}
        .imc-nav-item{display:flex;align-items:center;gap:12px;padding:13px 15px;border-radius:10px;text-decoration:none;color:#657285;font-size:13px;font-weight:600;border-left:3px solid transparent}
        .imc-nav-item:hover{background:#f4f7f6}
        .imc-nav-item.active{color:#245340;background:#eaf3ee;border-left-color:#315f50;font-weight:800}
        .imc-nav-item > span{width:23px;text-align:center;font-size:19px}
        .imc-sidebar-footer{margin-top:auto;padding:22px 14px 8px;border-top:1px solid #edf0f2;display:grid;gap:12px}
        .imc-sidebar-footer a{color:#657285;text-decoration:none;font-size:12px;font-weight:700}
        .imc-sidebar-footer small{color:#a1acb8;font-size:10px}
        .imc-content{min-width:0;padding:29px clamp(17px,3vw,46px) 60px}
        .imc-header{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:20px;margin-bottom:30px}
        .imc-breadcrumb{font-size:12px;color:#8390a0;margin-bottom:9px}
        .imc-breadcrumb strong{color:#315f50}
        .imc-page-title{margin:0;font-size:clamp(29px,3vw,38px);letter-spacing:-1.1px;font-weight:800}
        .imc-subtitle{color:#8390a0;font-size:13px;margin:10px 0 0}
        .imc-secondary{padding:12px 16px;background:white;border:1px solid #e3e8ed;border-radius:10px;color:#526073;font-size:12px;font-weight:800;text-decoration:none}
        .imc-panel{padding:24px;background:white;border:1px solid #e6eaf0;border-radius:16px;box-shadow:0 4px 18px rgba(23,35,50,.035)}
        .imc-panel-header{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:21px}
        .imc-panel-header h2{font-size:17px;margin:0}
        .imc-count{padding:9px 13px;border-radius:10px;background:#edf4f0;color:#315f50;font-size:12px;font-weight:800}
        .imc-empty{text-align:center;padding:60px 20px;background:#f8fafb;border:1px dashed #e3e8ed;border-radius:12px}
        .imc-empty h3{margin:10px 0 6px;font-size:18px}
        .imc-empty p{color:#8390a0}
        .imc-candidate{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px;border:1px solid #e6eaf0;border-radius:12px;padding:18px;margin-bottom:12px}
        .imc-candidate p{color:#8390a0;font-size:12px;margin:7px 0 0}
        .imc-primary{padding:12px 16px;border:0;border-radius:10px;background:#284e42;color:white;font-size:12px;font-weight:800;cursor:pointer}
        .imc-primary:disabled{opacity:.55;cursor:wait}
        @media(max-width:760px){.imc-shell{grid-template-columns:1fr}.imc-sidebar{position:static;height:auto}.imc-content{padding:22px 16px}}
      `}</style>
      <div className="imc-shell">
        <aside className="imc-sidebar">
          <div className="imc-sidebar-inner">
            <div className="imc-brand">
              <div className="imc-logo">I</div>
              <div><strong>Inspire Match</strong><small>TALENT INTELLIGENCE</small></div>
            </div>
            <div className="imc-nav-label">WORKSPACE</div>
            <ATSNavigation className="imc-navigation" linkClassName="imc-nav-item" />
            <div className="imc-sidebar-footer">
              <Link href="/">↗ ATS Home</Link>
              <small>© Inspire Match ATS</small>
            </div>
          </div>
        </aside>
        <div className="imc-content">
          <header className="imc-header">
            <div>
              <div className="imc-breadcrumb">Workspace / <strong>Candidates / Recycle Bin</strong></div>
              <h1 className="imc-page-title">Recycle Bin</h1>
              <p className="imc-subtitle">Restore deleted candidates with their CVs, notes and recruitment history.</p>
            </div>
            <Link href="/app/candidates" className="imc-secondary">← Back to Candidates</Link>
          </header>
          <section className="imc-panel">
            <div className="imc-panel-header">
              <h2>Deleted Candidates</h2>
              <span className="imc-count">{candidates.length} candidates</span>
            </div>
            {loading && <p>Loading deleted candidates...</p>}
            {error && <p role="alert" style={{color:"#b91c1c"}}>{error}</p>}
            {!loading && !error && candidates.length === 0 && (
              <div className="imc-empty">
                <div style={{fontSize:36,color:"#315f50"}}>♻</div>
                <h3>Your Recycle Bin is empty</h3>
                <p>Deleted candidates will appear here and can be restored when needed.</p>
              </div>
            )}
            {!loading && !error && candidates.map((candidate) => (
              <div key={candidate.id} className="imc-candidate">
                <div>
                  <strong>{candidate.full_name || "Unnamed Candidate"}</strong>
                  <p>Deleted: {new Date(candidate.deleted_at).toLocaleString()}</p>
                </div>
                <button type="button" className="imc-primary" disabled={restoringId !== null} onClick={() => restoreCandidate(candidate.id)}>
                  {restoringId === candidate.id ? "Restoring..." : "↺ Restore Candidate"}
                </button>
              </div>
            ))}
          </section>
        </div>
      </div>
    </main>
  );
}
