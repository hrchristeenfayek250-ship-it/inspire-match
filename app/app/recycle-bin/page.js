
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
    <main className="imr-root">
      <style>{`
        .imr-root {
          min-height: 100vh;
          background: #f6f8fb;
          color: #1e293b;
          font-family: Arial, sans-serif;
          font-size: 14px;
        }
        .imr-root * { box-sizing: border-box; }
        .imr-shell {
          display: grid;
          grid-template-columns: 254px minmax(0, 1fr);
          min-height: 100vh;
        }
        .imr-sidebar {
          background: #fff;
          border-right: 1px solid #e6eaf0;
          padding: 24px 15px;
        }
        .imr-brand {
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 7px 12px 26px;
          border-bottom: 1px solid #edf0f2;
          margin-bottom: 25px;
        }
        .imr-logo {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          display: grid;
          place-items: center;
          background: #284e42;
          color: #fff;
          font-size: 23px;
          font-weight: 800;
        }
        .imr-brand strong {
          display: block;
          font-size: 17px;
          letter-spacing: -.5px;
        }
        .imr-brand small {
          display: block;
          margin-top: 4px;
          font-size: 9px;
          letter-spacing: 1.4px;
          color: #8795a4;
          font-weight: 800;
        }
        .imr-nav-label {
          padding: 0 14px;
          margin-bottom: 10px;
          color: #9ba6b2;
          font-size: 10px;
          letter-spacing: 1.5px;
          font-weight: 800;
        }
        .imr-navigation {
          display: grid;
          gap: 4px;
        }
        .imr-nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 13px 15px;
          border-radius: 10px;
          text-decoration: none;
          font-size: 13px;
          font-weight: 600;
          color: #657285;
          border-left: 3px solid transparent;
        }
        .imr-nav-item:hover { background: #f4f7f6; }
        .imr-nav-item.active {
          color: #245340;
          background: #eaf3ee;
          border-left-color: #315f50;
          font-weight: 800;
        }
        .imr-nav-item > span {
          width: 23px;
          text-align: center;
          font-size: 19px;
        }
        .imr-content { min-width: 0; }
        .imr-header {
          background: #fff;
          border-bottom: 1px solid #e6eaf0;
          padding: 24px 36px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
        }
        .imr-header small {
          color: #8795a4;
          font-weight: 700;
          letter-spacing: 1px;
        }
        .imr-header h1 {
          margin: 7px 0 0;
          font-size: 23px;
          color: #1e293b;
        }
        .imr-back {
          text-decoration: none;
          border: 1px solid #dce5df;
          background: #fff;
          color: #284e42;
          padding: 11px 16px;
          border-radius: 10px;
          font-weight: 700;
        }
        .imr-main {
          max-width: 1200px;
          margin: auto;
          padding: 32px 36px;
        }
        .imr-intro {
          background: #fff;
          border: 1px solid #e6eaf0;
          border-radius: 16px;
          padding: 28px;
          margin-bottom: 24px;
        }
        .imr-intro h2 {
          margin: 0 0 10px;
          font-size: 24px;
          color: #284e42;
        }
        .imr-intro p {
          margin: 0;
          color: #657285;
          line-height: 1.7;
        }
        .imr-card {
          background: #fff;
          border: 1px solid #e6eaf0;
          border-radius: 16px;
          padding: 26px;
          box-shadow: 0 5px 18px rgba(20,40,35,.03);
        }
        .imr-card-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 24px;
        }
        .imr-card-heading h2 {
          margin: 0;
          font-size: 19px;
        }
        .imr-count {
          background: #eaf3ee;
          color: #245340;
          border-radius: 20px;
          padding: 7px 13px;
          font-size: 12px;
          font-weight: 800;
        }
        .imr-empty {
          text-align: center;
          background: #f8fafb;
          border: 1px dashed #dce5df;
          border-radius: 14px;
          padding: 60px 20px;
        }
        .imr-empty h3 {
          margin: 14px 0 8px;
          font-size: 20px;
        }
        .imr-empty p { color: #657285; }
        .imr-candidate {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
          border: 1px solid #e6eaf0;
          border-radius: 12px;
          padding: 18px;
          margin-bottom: 12px;
        }
        .imr-candidate strong { font-size: 15px; }
        .imr-candidate p {
          margin: 7px 0 0;
          color: #8795a4;
          font-size: 12px;
        }
        .imr-restore {
          border: none;
          border-radius: 9px;
          background: #284e42;
          color: white;
          padding: 11px 18px;
          font-weight: 700;
          cursor: pointer;
        }
        .imr-restore:disabled {
          opacity: .55;
          cursor: wait;
        }
        @media (max-width: 800px) {
          .imr-shell { grid-template-columns: 1fr; }
          .imr-sidebar { border-right: none; }
          .imr-main { padding: 20px 16px; }
          .imr-header { padding: 20px 16px; }
        }
      `}</style>

      <div className="imr-shell">
        <aside className="imr-sidebar">
          <div className="imr-brand">
            <div className="imr-logo">I</div>
            <div>
              <strong>Inspire Match</strong>
              <small>TALENT INTELLIGENCE</small>
            </div>
          </div>

          <div className="imr-nav-label">WORKSPACE</div>

          <ATSNavigation
            className="imr-navigation"
            linkClassName="imr-nav-item"
          />
        </aside>

        <div className="imr-content">
          <header className="imr-header">
            <div>
              <small>WORKSPACE / CANDIDATES</small>
              <h1>Recycle Bin</h1>
            </div>

            <Link href="/app/candidates" className="imr-back">
              ← Back to Candidates
            </Link>
          </header>

          <div className="imr-main">
            <section className="imr-intro">
              <h2>Recycle Bin</h2>
              <p>
                Restore deleted candidates while preserving
                their CVs, notes, and recruitment history.
              </p>
            </section>

            <section className="imr-card">
              <div className="imr-card-heading">
                <h2>Deleted Candidates</h2>
                <span className="imr-count">
                  {candidates.length} candidates
                </span>
              </div>

              {loading && <p>Loading deleted candidates...</p>}

              {error && (
                <p role="alert" style={{ color: "#b91c1c" }}>
                  {error}
                </p>
              )}

              {!loading && !error && candidates.length === 0 && (
                <div className="imr-empty">
                  <div style={{ fontSize: 40 }}>♻</div>
                  <h3>Your Recycle Bin is empty</h3>
                  <p>
                    Deleted candidates will appear here
                    and can be restored when needed.
                  </p>
                </div>
              )}

              {!loading && !error && candidates.length > 0 && (
                <div>
                  {candidates.map((candidate) => (
                    <div
                      key={candidate.id}
                      className="imr-candidate"
                    >
                      <div>
                        <strong>
                          {candidate.full_name || "Unnamed Candidate"}
                        </strong>
                        <p>
                          Deleted:{" "}
                          {new Date(
                            candidate.deleted_at
                          ).toLocaleString()}
                        </p>
                      </div>

                      <button
                        type="button"
                        className="imr-restore"
                        disabled={restoringId !== null}
                        onClick={() =>
                          restoreCandidate(candidate.id)
                        }
                      >
                        {restoringId === candidate.id
                          ? "Restoring..."
                          : "↺ Restore Candidate"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

