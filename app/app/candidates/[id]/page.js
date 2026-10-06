"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

const stages = [
  "Applied",
  "Screening",
  "Interview",
  "Shortlisted",
  "Hired",
  "Rejected",
];

export default function CandidateProfilePage() {
  const params = useParams();
  const candidateId = params?.id;

  const [candidate, setCandidate] = useState(null);
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingNote, setSavingNote] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);

  useEffect(() => {
    if (candidateId) {
      loadCandidate();
      loadNotes();
    }
  }, [candidateId]);

  async function loadCandidate() {
    setLoading(true);

    const { data, error } = await supabase
      .from("candidates")
      .select("*")
      .eq("id", candidateId)
      .single();

    if (error) {
      console.error("Could not load candidate:", error);
    } else {
      setCandidate(data);
    }

    setLoading(false);
  }

  async function loadNotes() {
    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .eq("candidate_id", candidateId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Could not load notes:", error);
    } else {
      setNotes(data || []);
    }
  }

  async function updateStatus(status) {
    setStatusSaving(true);

    const { error } = await supabase
      .from("candidates")
      .update({ status })
      .eq("id", candidateId);

    if (error) {
      alert(`Could not update status: ${error.message}`);
    } else {
      setCandidate((current) => ({
        ...current,
        status,
      }));
    }

    setStatusSaving(false);
  }

  async function saveNote() {
    if (!newNote.trim()) return;

    setSavingNote(true);

    const { data, error } = await supabase
      .from("notes")
      .insert([
        {
          candidate_id: Number(candidateId),
          note: newNote.trim(),
        },
      ])
      .select()
      .single();

    if (error) {
      alert(`Could not save note: ${error.message}`);
      setSavingNote(false);
      return;
    }

    setNotes((current) => [data, ...current]);
    setNewNote("");
    setSavingNote(false);
  }

  if (loading) {
    return (
      <main style={pageStyle}>
        <div style={containerStyle}>
          <p>Loading candidate profile...</p>
        </div>
      </main>
    );
  }

  if (!candidate) {
    return (
      <main style={pageStyle}>
        <div style={containerStyle}>
          <h1>Candidate not found</h1>

          <Link href="/app/candidates">
            ← Candidate Database
          </Link>
        </div>
      </main>
    );
  }

  const matchScore =
    candidate.match_score !== null &&
    candidate.match_score !== undefined
      ? Number(candidate.match_score)
      : null;

  const verdict =
    candidate.match_verdict || null;

  const strengths = Array.isArray(candidate.strengths)
    ? candidate.strengths
    : [];

  const gaps = Array.isArray(candidate.gaps)
    ? candidate.gaps
    : [];

  const redFlags = Array.isArray(candidate.red_flags)
    ? candidate.red_flags
    : [];

  const interviewQuestions = Array.isArray(
    candidate.interview_questions
  )
    ? candidate.interview_questions
    : [];

  return (
    <main style={pageStyle}>
      <div style={containerStyle}>

        {/* HEADER */}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 20,
            marginBottom: 30,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 13,
                letterSpacing: 2,
                color: "#777",
                marginBottom: 8,
              }}
            >
              INSPIRE MATCH
            </div>

            <h1
              style={{
                fontFamily: "Georgia, serif",
                fontSize: 42,
                margin: 0,
              }}
            >
              Candidate Profile
            </h1>

            <p style={{ color: "#666" }}>
              Candidate information, AI assessment and
              recruitment activity.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <Link
              href="/app/pipeline"
              style={buttonSecondary}
            >
              ← Pipeline
            </Link>

            <Link
              href="/app/candidates"
              style={buttonSecondary}
            >
              Candidate Database
            </Link>
          </div>
        </div>

        {/* CANDIDATE HEADER */}

        <section style={cardStyle}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 25,
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 18,
              }}
            >
              <div
                style={{
                  width: 70,
                  height: 70,
                  borderRadius: "50%",
                  background: "#f0eee8",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 32,
                }}
              >
                👤
              </div>

              <div>
                <h2
                  style={{
                    margin: "0 0 8px",
                    fontFamily: "Georgia, serif",
                  }}
                >
                  {candidate.full_name ||
                    "Unnamed Candidate"}
                </h2>

                <div style={{ color: "#666" }}>
                  {candidate.current_title || "—"}
                </div>

                {candidate.location && (
                  <div
                    style={{
                      color: "#777",
                      marginTop: 5,
                      fontSize: 14,
                    }}
                  >
                    📍 {candidate.location}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  color: "#777",
                  marginBottom: 7,
                }}
              >
                Recruitment Status
              </label>

              <select
                value={candidate.status || "Screening"}
                onChange={(e) =>
                  updateStatus(e.target.value)
                }
                disabled={statusSaving}
                style={selectStyle}
              >
                {stages.map((stage) => (
                  <option key={stage} value={stage}>
                    {stage}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* AI MATCH */}

        <section style={cardStyle}>
          <div style={sectionHeader}>
            <div>
              <h2 style={sectionTitle}>
                🤖 AI Match Assessment
              </h2>

              <p style={hintStyle}>
                AI-powered evaluation for the candidate.
              </p>
            </div>

            {candidate.matched_job_title && (
              <div
                style={{
                  padding: "8px 12px",
                  background: "#f5f3ed",
                  borderRadius: 20,
                  fontSize: 13,
                }}
              >
                💼 {candidate.matched_job_title}
              </div>
            )}
          </div>

          {matchScore !== null ? (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "minmax(180px, 250px) 1fr",
                  gap: 25,
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    textAlign: "center",
                    padding: 25,
                    background: "#faf9f6",
                    borderRadius: 16,
                  }}
                >
                  <div
                    style={{
                      fontSize: 52,
                      fontWeight: 700,
                    }}
                  >
                    {matchScore}%
                  </div>

                  <div
                    style={{
                      color: "#777",
                      marginTop: 5,
                    }}
                  >
                    Match Score
                  </div>

                  {verdict && (
                    <div
                      style={{
                        display: "inline-block",
                        marginTop: 15,
                        padding: "8px 14px",
                        borderRadius: 20,
                        background:
                          verdict === "Strong fit"
                            ? "#e7f4ea"
                            : verdict === "Potential"
                            ? "#fff3d6"
                            : "#f4e4e4",
                        fontWeight: 600,
                      }}
                    >
                      {verdict}
                    </div>
                  )}
                </div>

                <div>
                  <h3>AI Summary</h3>

                  <p
                    style={{
                      color: "#555",
                      lineHeight: 1.7,
                    }}
                  >
                    {candidate.ai_summary ||
                      "No AI summary available yet."}
                  </p>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(250px, 1fr))",
                  gap: 18,
                  marginTop: 25,
                }}
              >
                <AIList
                  title="💪 Strengths"
                  items={strengths}
                  empty="No strengths recorded."
                />

                <AIList
                  title="⚠️ Gaps"
                  items={gaps}
                  empty="No gaps recorded."
                />

                <AIList
                  title="🚩 Red Flags"
                  items={redFlags}
                  empty="No red flags found."
                />
              </div>

              {interviewQuestions.length > 0 && (
                <div style={{ marginTop: 25 }}>
                  <h3>🎤 Interview Questions</h3>

                  <ol
                    style={{
                      lineHeight: 1.8,
                      color: "#555",
                    }}
                  >
                    {interviewQuestions.map(
                      (question, index) => (
                        <li key={index}>
                          {question}
                        </li>
                      )
                    )}
                  </ol>
                </div>
              )}
            </>
          ) : (
            <div
              style={{
                padding: 25,
                background: "#faf9f6",
                borderRadius: 12,
                color: "#777",
              }}
            >
              <strong>
                No AI Match Assessment saved yet.
              </strong>

              <p style={{ marginBottom: 0 }}>
                Once this candidate is screened against a
                saved job, the AI score and assessment will
                appear here.
              </p>
            </div>
          )}
        </section>

        {/* CANDIDATE INFORMATION */}

        <section style={cardStyle}>
          <h2 style={sectionTitle}>
            Candidate Information
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 15,
            }}
          >
            <InfoItem
              label="Full Name"
              value={candidate.full_name}
            />

            <InfoItem
              label="Current Title"
              value={candidate.current_title}
            />

            <InfoItem
              label="Location"
              value={candidate.location}
            />

            <InfoItem
              label="Years of Experience"
              value={
                candidate.years_experience
                  ? `${candidate.years_experience} years`
                  : "—"
              }
            />

            <InfoItem
              label="Email"
              value={candidate.email}
            />

            <InfoItem
              label="Phone"
              value={candidate.phone}
            />

            <InfoItem
              label="LinkedIn"
              value={candidate.linkedin_url}
            />

            <InfoItem
              label="CV"
              value={candidate.cv_file_name}
            />

            <InfoItem
              label="Source"
              value={candidate.source}
            />
          </div>
        </section>

        {/* RECRUITMENT NOTES */}

        <section style={cardStyle}>
          <h2 style={sectionTitle}>
            📝 Recruitment Notes
          </h2>

          <p style={hintStyle}>
            Add a new recruitment note. Each note is saved
            separately.
          </p>

          <textarea
            value={newNote}
            onChange={(e) =>
              setNewNote(e.target.value)
            }
            placeholder="Write a new note..."
            rows={5}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: 14,
              borderRadius: 10,
              border: "1px solid #ddd",
              resize: "vertical",
              fontSize: 14,
            }}
          />

          <button
            onClick={saveNote}
            disabled={
              savingNote || !newNote.trim()
            }
            style={{
              marginTop: 12,
              padding: "12px 20px",
              border: "none",
              borderRadius: 9,
              background: "#222",
              color: "#fff",
              fontWeight: 600,
              cursor:
                savingNote || !newNote.trim()
                  ? "not-allowed"
                  : "pointer",
              opacity:
                savingNote || !newNote.trim()
                  ? 0.6
                  : 1,
            }}
          >
            {savingNote
              ? "Saving..."
              : "Save Note"}
          </button>

          {notes.length > 0 && (
            <div style={{ marginTop: 30 }}>
              <h3>Previous Notes</h3>

              <div
                style={{
                  display: "grid",
                  gap: 12,
                }}
              >
                {notes.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      padding: 16,
                      background: "#faf9f6",
                      borderRadius: 10,
                      border: "1px solid #eee",
                    }}
                  >
                    <div
                      style={{
                        color: "#333",
                        lineHeight: 1.6,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {item.note}
                    </div>

                    <div
                      style={{
                        color: "#999",
                        fontSize: 12,
                        marginTop: 8,
                      }}
                    >
                      {item.created_at
                        ? new Date(
                            item.created_at
                          ).toLocaleString()
                        : ""}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

      </div>
    </main>
  );
}

function AIList({ title, items, empty }) {
  return (
    <div
      style={{
        background: "#faf9f6",
        borderRadius: 12,
        padding: 18,
      }}
    >
      <h3 style={{ marginTop: 0 }}>
        {title}
      </h3>

      {items.length > 0 ? (
        <ul
          style={{
            marginBottom: 0,
            paddingLeft: 20,
            lineHeight: 1.7,
            color: "#555",
          }}
        >
          {items.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      ) : (
        <p
          style={{
            color: "#999",
            marginBottom: 0,
          }}
        >
          {empty}
        </p>
      )}
    </div>
  );
}

function InfoItem({ label, value }) {
  return (
    <div
      style={{
        padding: 16,
        background: "#faf9f6",
        borderRadius: 10,
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: "#888",
          marginBottom: 6,
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: 14,
          color: "#333",
          wordBreak: "break-word",
        }}
      >
        {value || "—"}
      </div>
    </div>
  );
}

const pageStyle = {
  minHeight: "100vh",
  padding: "50px 24px",
  background: "#faf9f6",
  fontFamily: "Arial, sans-serif",
  color: "#222",
};

const containerStyle = {
  maxWidth: 1200,
  margin: "0 auto",
};

const cardStyle = {
  background: "#fff",
  border: "1px solid #eee",
  borderRadius: 16,
  padding: 25,
  marginBottom: 22,
};

const sectionTitle = {
  fontFamily: "Georgia, serif",
  marginTop: 0,
  marginBottom: 8,
};

const sectionHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 20,
  flexWrap: "wrap",
  marginBottom: 20,
};

const hintStyle = {
  color: "#777",
  marginTop: 5,
};

const buttonSecondary = {
  textDecoration: "none",
  padding: "11px 17px",
  border: "1px solid #ddd",
  borderRadius: 9,
  background: "#fff",
  color: "#222",
};

const selectStyle = {
  padding: "11px 14px",
  borderRadius: 9,
  border: "1px solid #ddd",
  background: "#fff",
  minWidth: 170,
};
