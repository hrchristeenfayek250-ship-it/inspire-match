
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

  
  const [matchResults, setMatchResults] = useState({});
  const [matchingCandidateId, setMatchingCandidateId] = useState(null);

  const linkedCandidates = candidates.filter(
    (candidate) =>
      selectedJobId &&
      String(candidate.job_id) === String(selectedJobId)
  );

  async function runAIMatch(candidateId) {
    if (!selectedJobId || matchingCandidateId !== null) return;

    const resultKey = `${selectedJobId}:${candidateId}`;

    setMatchingCandidateId(candidateId);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

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

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "AI matching failed.");
      }

      setMatchResults((previous) => ({
        ...previous,
        [resultKey]: {
          ...result,
          error: null,
        },
      }));
    } catch (error) {
      setMatchResults((previous) => ({
        ...previous,
        [resultKey]: {
          error: error.message,
        },
      }));
    } finally {
      setMatchingCandidateId(null);
    }
  }

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

               
                {linkedCandidates.map((candidate) => {
                  const match =
                    matchResults[
                      `${selectedJobId}:${candidate.id}`
                    ];

                  const isMatching =
                    matchingCandidateId === candidate.id;

                  return (
                    <div
                      key={candidate.id}
                      style={{
                        padding: "20px 0",
                        borderBottom: "1px solid #E7EEE9",
                      }}
                    >
                      <Link
                        href={`/app/candidates/${candidate.id}`}
                        style={{
                          fontWeight: 700,
                          color: "#245C4A",
                          fontSize: 17,
                        }}
                      >
                        {candidate.full_name || "Unnamed Candidate"}
                      </Link>

                      <p
                        style={{
                          color: "#65796D",
                          fontSize: 13,
                          marginTop: 8,
                        }}
                      >
                        {candidate.current_title || "Title not provided"}
                        {" • "}
                        {candidate.status || "No status"}
                      </p>

                      <button
                        type="button"
                        onClick={() => runAIMatch(candidate.id)}
                        disabled={matchingCandidateId !== null}
                        style={{
                          marginTop: 10,
                          padding: "12px 20px",
                          background:
                            matchingCandidateId !== null
                              ? "#AAB8AE"
                              : "#245C4A",
                          color: "#FFFFFF",
                          border: "none",
                          borderRadius: 10,
                          fontWeight: 700,
                          cursor:
                            matchingCandidateId !== null
                              ? "wait"
                              : "pointer",
                        }}
                      >
                        {isMatching
                          ? "Analyzing Candidate..."
                          : match && !match.error
                            ? "Re-run AI Match"
                            : "Run AI Match"}
                      </button>

                      {match?.error && (
                        <p
                          style={{
                            marginTop: 15,
                            color: "#A23B3B",
                            fontWeight: 600,
                          }}
                        >
                          {match.error}
                        </p>
                      )}

                      {match && !match.error && (
                        <div
                          style={{
                            marginTop: 20,
                            background: "#F5F9F5",
                            border: "1px solid #DCE9DF",
                            borderRadius: 14,
                            padding: 20,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              flexWrap: "wrap",
                              gap: 12,
                            }}
                          >
                            <strong
                              style={{
                                fontSize: 24,
                                color: "#245C4A",
                              }}
                            >
                              {match.score === null
                                ? "Score Unavailable"
                                : `${match.score}% Job Match`}
                            </strong>

                            <span style={{ fontSize: 13 }}>
                              {match.verdict}
                              {" • "}
                              Confidence: {match.confidence}
                            </span>
                          </div>

                          {match.summary && (
                            <p style={{ lineHeight: 1.7 }}>
                              {match.summary}
                            </p>
                          )}

                          {match.strengths?.length > 0 && (
                            <div>
                              <h4>✅ Key Strengths</h4>
                              <ul>
                                {match.strengths.map((item, index) => (
                                  <li key={index}>{item}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {match.gaps?.length > 0 && (
                            <div>
                              <h4>⚠️ Missing or Unverified Requirements</h4>
                              <ul>
                                {match.gaps.map((item, index) => (
                                  <li key={index}>{item}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {match.interviewQuestions?.length > 0 && (
                            <div>
                              <h4>💬 Suggested Interview Questions</h4>
                              <ul>
                                {match.interviewQuestions.map(
                                  (item, index) => (
                                    <li key={index}>{item}</li>
                                  )
                                )}
                              </ul>
                            </div>
                          )}

                          <p
                            style={{
                              marginTop: 16,
                              fontSize: 12,
                              color: "#65796D",
                            }}
                          >
                            AI assessment for this selected job only.
                            Results are not yet saved permanently.
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}

              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
