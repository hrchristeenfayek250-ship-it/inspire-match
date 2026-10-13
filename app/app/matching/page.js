
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function MatchingPage() {
  const [jobs, setJobs] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          throw new Error("Please log in first.");
        }

        const { data: memberships, error: memberError } =
          await supabase
            .from("company_members")
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

        const [jobsResult, candidatesResult] =
          await Promise.all([
            supabase
              .from("jobs")
              .select("id, title, status")
              .or(companyFilter)
              .order("created_at", { ascending: false }),

            supabase
              .from("candidates")
              .select("id, full_name, current_title, status, job_id")
              .or(companyFilter),
          ]);

        if (jobsResult.error) throw jobsResult.error;
        if (candidatesResult.error) {
          throw candidatesResult.error;
        }

        setJobs(jobsResult.data || []);
        setCandidates(candidatesResult.data || []);
      } catch (error) {
        setErrorMessage(error.message);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const linkedCandidates = candidates.filter(
    (candidate) =>
      selectedJobId &&
      String(candidate.job_id) === String(selectedJobId)
  );

  const card = {
    background: "#FFFFFF",
    border: "1px solid #E0E9E2",
    borderRadius: 16,
    padding: 24,
    marginBottom: 18,
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "42px 20px",
        background: "#F7F9F6",
        color: "#173F3A",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <Link href="/app/jobs" style={{ color: "#347A65" }}>
          ← Back to Jobs
        </Link>

        <p
          style={{
            letterSpacing: 2,
            fontSize: 12,
            fontWeight: 800,
            marginTop: 32,
          }}
        >
          INSPIRE MATCH • TALENT INTELLIGENCE
        </p>

        <h1
          style={{
            fontFamily: "Georgia, serif",
            fontSize: 36,
            marginBottom: 10,
          }}
        >
          AI Candidate Matching
        </h1>

        <p style={{ color: "#65796D", lineHeight: 1.7 }}>
          Select a job to review its assigned candidates.
          Job-specific AI ranking will be added next.
        </p>

        {loading && <p>Loading matching workspace...</p>}

        {errorMessage && (
          <div style={{ ...card, color: "#A23B3B" }}>
            {errorMessage}
          </div>
        )}

        {!loading && !errorMessage && (
          <>
            <section style={card}>
              <label
                htmlFor="matching-job"
                style={{
                  display: "block",
                  fontWeight: 700,
                  marginBottom: 12,
                }}
              >
                Select Job Opening
              </label>

              <select
                id="matching-job"
                value={selectedJobId}
                onChange={(event) =>
                  setSelectedJobId(event.target.value)
                }
                style={{
                  width: "100%",
                  padding: 14,
                  border: "1px solid #CBDDD0",
                  borderRadius: 10,
                  background: "#FFFFFF",
                  fontSize: 15,
                }}
              >
                <option value="">Choose a job</option>

                {jobs.map((job) => (
                  <option key={job.id} value={String(job.id)}>
                    {job.title}
                  </option>
                ))}
              </select>
            </section>

            {selectedJobId && (
              <section style={card}>
                <h2 style={{ fontFamily: "Georgia, serif" }}>
                  Assigned Candidates ({linkedCandidates.length})
                </h2>

                {linkedCandidates.length === 0 && (
                  <p style={{ color: "#65796D" }}>
                    No candidates assigned to this job yet.
                  </p>
                )}

                {linkedCandidates.map((candidate) => (
                  <div
                    key={candidate.id}
                    style={{
                      padding: "16px 0",
                      borderBottom: "1px solid #E7EEE9",
                    }}
                  >
                    <Link
                      href={`/app/candidates/${candidate.id}`}
                      style={{
                        fontWeight: 700,
                        color: "#245C4A",
                      }}
                    >
                      {candidate.full_name || "Unnamed Candidate"}
                    </Link>

                    <p
                      style={{
                        color: "#65796D",
                        fontSize: 13,
                        marginBottom: 0,
                      }}
                    >
                      {candidate.current_title || "Title not provided"}
                      {" • "}
                      {candidate.status || "No status"}
                    </p>
                  </div>
                ))}
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
