"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

const stages = [
  "Applied",
  "Screening",
  "Interview",
  "Shortlisted",
  "Hired",
  "Rejected",
];

export default function PipelinePage() {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCandidates();
  }, []);

  async function loadCandidates() {
    const { data, error } = await supabase
      .from("candidates")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Could not load candidates:", error);
    } else {
      setCandidates(data || []);
    }

    setLoading(false);
  }

  async function changeStage(id, stage) {
    const { error } = await supabase
      .from("candidates")
      .update({ status: stage })
      .eq("id", id);

    if (error) {
      alert(`Could not update candidate: ${error.message}`);
      return;
    }

    setCandidates((current) =>
      current.map((candidate) =>
        candidate.id === id
          ? { ...candidate, status: stage }
          : candidate
      )
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "40px 24px",
        background: "#faf9f6",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 30,
          }}
        >
          <div>
            <h1 style={{ margin: 0 }}>Candidate Pipeline</h1>
            <p style={{ color: "#666" }}>
              Move candidates through your recruitment process.
            </p>
          </div>

          <a
            href="/"
            style={{
              textDecoration: "none",
              padding: "10px 18px",
              borderRadius: 8,
              border: "1px solid #ddd",
              color: "#222",
              background: "#fff",
            }}
          >
            ← Back to ATS
          </a>
        </div>

        {loading ? (
          <p>Loading candidates...</p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(6, minmax(180px, 1fr))",
              gap: 16,
              overflowX: "auto",
            }}
          >
            {stages.map((stage) => {
              const stageCandidates = candidates.filter(
                (candidate) => candidate.status === stage
              );

              return (
                <section
                  key={stage}
                  style={{
                    minHeight: 500,
                    background: "#f1f1ee",
                    borderRadius: 14,
                    padding: 14,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 14,
                    }}
                  >
                    <h3 style={{ margin: 0 }}>{stage}</h3>

                    <span
                      style={{
                        background: "#fff",
                        borderRadius: 20,
                        padding: "4px 9px",
                        fontSize: 13,
                      }}
                    >
                      {stageCandidates.length}
                    </span>
                  </div>

                  {stageCandidates.length === 0 ? (
                    <p
                      style={{
                        color: "#999",
                        fontSize: 13,
                        textAlign: "center",
                        marginTop: 30,
                      }}
                    >
                      No candidates
                    </p>
                  ) : (
                    stageCandidates.map((candidate) => (
                      <div
                        key={candidate.id}
                        style={{
                          background: "#fff",
                          borderRadius: 12,
                          padding: 16,
                          marginBottom: 12,
                          boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                        }}
                      >
                          <Link
  href={`/candidates/${candidate.id}`}
  style={{
    textDecoration: "none",
    color: "#222",
  }}
>
  <h4 style={{ margin: "0 0 8px" }}>
    {candidate.full_name || "Unnamed Candidate"}
  </h4>
</Link>
                        <p
                          style={{
                            margin: "0 0 6px",
                            fontSize: 13,
                            color: "#555",
                          }}
                        >
                          {candidate.current_title || "—"}
                        </p>

                        <p
                          style={{
                            margin: "0 0 12px",
                            fontSize: 13,
                            color: "#777",
                          }}
                        >
                          {candidate.location || "—"}
                        </p>

                        <select
                          value={candidate.status || "Screening"}
                          onChange={(e) =>
                            changeStage(candidate.id, e.target.value)
                          }
                          style={{
                            width: "100%",
                            padding: 8,
                            borderRadius: 8,
                            border: "1px solid #ddd",
                            background: "#fff",
                          }}
                        >
                          {stages.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
