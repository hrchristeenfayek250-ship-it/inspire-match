
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
    <main
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: "40px 24px",
      }}
    >
      <Link href="/app/candidates">
        ← Back to Candidates
      </Link>

      <h1 style={{ marginTop: 24 }}>Recycle Bin</h1>

      <p>
        Restore deleted candidates without losing their CVs,
        notes, or recruitment history.
      </p>

      {loading && <p>Loading deleted candidates...</p>}

      {error && (
        <p role="alert" style={{ color: "#b91c1c" }}>
          {error}
        </p>
      )}

      {!loading && !error && candidates.length === 0 && (
        <p>Recycle Bin is empty.</p>
      )}

      {!loading && !error && candidates.length > 0 && (
        <div style={{ display: "grid", gap: 12, marginTop: 24 }}>
          {candidates.map((candidate) => (
            <div
              key={candidate.id}
              style={{
                border: "1px solid #dce5df",
                borderRadius: 12,
                padding: 20,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 16,
              }}
            >
              <div>
                <strong>
                  {candidate.full_name || "Unnamed Candidate"}
                </strong>

                <p style={{ marginBottom: 0 }}>
                  Deleted:{" "}
                  {new Date(
                    candidate.deleted_at
                  ).toLocaleString()}
                </p>
              </div>

              <button
                type="button"
                disabled={restoringId !== null}
                onClick={() => restoreCandidate(candidate.id)}
                style={{
                  background: "#147d58",
                  color: "#fff",
                  border: 0,
                  borderRadius: 8,
                  padding: "10px 18px",
                  cursor: "pointer",
                }}
              >
                {restoringId === candidate.id
                  ? "Restoring..."
                  : "Restore"}
              </button>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
