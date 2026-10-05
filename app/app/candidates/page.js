"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function CandidatesPage() {
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

  return (
    <main
      style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: "40px 24px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 30,
        }}
      >
        <div>
          <h1 style={{ margin: 0 }}>Candidate Database</h1>
          <p style={{ color: "#666" }}>
            Manage and review your saved candidates.
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
          }}
        >
          ← Back to ATS
        </a>
      </div>

      {loading ? (
        <p>Loading candidates...</p>
      ) : candidates.length === 0 ? (
        <div
          style={{
            padding: 40,
            textAlign: "center",
            border: "1px solid #eee",
            borderRadius: 12,
          }}
        >
          <h3>No candidates yet</h3>
          <p>Score a CV from the ATS and it will appear here.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {candidates.map((candidate) => (
            <div
              key={candidate.id}
              style={{
                border: "1px solid #e5e5e5",
                borderRadius: 12,
                padding: 20,
                background: "#fff",
              }}
            >
              <h2 style={{ marginTop: 0 }}>
                {candidate.full_name || "Unnamed Candidate"}
              </h2>

              <p>
                <strong>Current Title:</strong>{" "}
                {candidate.current_title || "—"}
              </p>

              <p>
                <strong>Experience:</strong>{" "}
                {candidate.years_experience ?? "—"} years
              </p>

              <p>
                <strong>Location:</strong>{" "}
                {candidate.location || "—"}
              </p>

              <p>
                <strong>Status:</strong>{" "}
                {candidate.status || "—"}
              </p>

              <p>
                <strong>CV:</strong>{" "}
                {candidate.cv_file_name || "—"}
              </p>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
