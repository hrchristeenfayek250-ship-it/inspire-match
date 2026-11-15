"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import ATSNavigation from "@/components/ATSNavigation";

export default function HiringManagerWorkspace() {
  const [state, setState] = useState({ loading: true, error: "", items: [] });

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const { data: auth, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!auth?.user) {
          window.location.replace("/app/login");
          return;
        }
        const { data: memberships, error: membershipError } = await supabase
          .from("company_members")
          .select("company_id,role")
          .eq("user_id", auth.user.id);
        if (membershipError) throw membershipError;
        if (memberships?.length !== 1 ||
            String(memberships[0].role || "").toLowerCase() !== "hiring_manager") {
          throw new Error("This workspace is available only to assigned hiring managers.");
        }
        // This existing RPC returns only offer ID, job title and approval step metadata.
        // It does not return salary, benefits, or offer details.
        const { data, error } = await supabase.rpc("get_my_hiring_decisions");
        if (error) throw error;
        if (mounted) setState({ loading: false, error: "", items: Array.isArray(data) ? data : [] });
      } catch (err) {
        if (mounted) setState({ loading: false, error: err?.message || "Unable to load your workspace.", items: [] });
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  const pending = state.items.filter((item) => String(item.step_status || "").toLowerCase() === "pending");
  return (
    <div style={{ minHeight: "100vh", background: "#f4f8f5", color: "#163f31", fontFamily: "Arial, sans-serif" }}>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", maxWidth: 1140, margin: "auto", padding: "28px 20px" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div><div style={{ color: "#18724c", fontSize: 12, fontWeight: 800 }}>INSPIRE MATCH · HIRING MANAGER</div>
            <h1 style={{ marginBottom: 4 }}>My Hiring Workspace</h1>
            <p style={{ color: "#617c6e" }}>Your assigned hiring approvals. Candidate and job access will be added after database-level scoping is validated.</p>
          </div>
          <Link href="/app/approvals" style={{ color: "#126847", fontWeight: 700 }}>Open Approval Center →</Link>
        </header>
        <nav aria-label="Hiring manager navigation" style={{ margin: "18px 0 22px" }}>
          <ATSNavigation className="hm-nav" linkClassName="hm-nav-link" />
        </nav>
        <style>{`
          .hm-nav { display:flex; gap:12px; flex-wrap:wrap; }
          .hm-nav-link { color:#176b4a; background:white; border:1px solid #dce9e0; padding:11px 15px; border-radius:10px; text-decoration:none; font-weight:700; }
          .hm-nav-link.active { background:#176b4a; color:white; }
        `}</style>
        {state.loading ? <p role="status">Loading assigned approvals…</p> : state.error ?
          <p role="alert" style={{ color: "#b42318" }}>{state.error}</p> :
          <>
            <section style={{ padding: 26, background: "white", border: "1px solid #dce9e0", borderRadius: 18 }}>
              <div style={{ fontSize: 13, color: "#617c6e" }}>Pending approvals assigned to you</div>
              <div style={{ fontSize: 40, fontWeight: 800, marginTop: 8 }}>{pending.length}</div>
              <p style={{ color: "#617c6e" }}>Only active approval steps returned for your company role or individual assignment are listed.</p>
            </section>
            <section style={{ marginTop: 22, padding: 26, background: "white", border: "1px solid #dce9e0", borderRadius: 18 }}>
              <h2 style={{ marginTop: 0 }}>My Hiring Decisions</h2>
              {pending.length === 0 ? <p>No pending decisions assigned to you.</p> :
                <ul style={{ paddingLeft: 22 }}>
                  {pending.map((item) =>
                    <li key={String(item.offer_id)} style={{ marginBottom: 14 }}>
                      <strong>{item.job_title || "Assigned job"}</strong>
                      <div style={{ color: "#617c6e", fontSize: 13 }}>{item.step_name || "Approval review"}</div>
                    </li>
                  )}
                </ul>
              }
              <Link href="/app/approvals" style={{ color: "#126847", fontWeight: 700 }}>Review decisions →</Link>
            </section>
          </>
        }
      </div>
    </div>
  );
}
