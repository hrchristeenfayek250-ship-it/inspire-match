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

const pageStyle = {
  minHeight: "100vh",
  padding: "50px 24px",
  background: "#faf9f6",
  fontFamily: "Arial, sans-serif",
  color: "#222",
};

const containerStyle = {
  maxWidth: 1250,
  margin: "0 auto",
};

const cardStyle = {
  background: "#fff",
  border: "1px solid #eee",
  borderRadius: 18,
  padding: 26,
  marginBottom: 22,
};

const buttonStyle = {
  display: "inline-block",
  padding: "11px 18px",
  borderRadius: 9,
  border: "1px solid #ddd",
  background: "#fff",
  color: "#222",
  textDecoration: "none",
};

export default function CandidateProfilePage() {
  const params = useParams();
  const candidateId = params?.id;

  const [candidate, setCandidate] = useState(null);
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState("");

  const [loading, setLoading] = useState(true);
  const [savingNote, setSavingNote] = useState(false);
  const [updatingStatus, setUpdatingStatus] =
    useState(false);

  useEffect(() => {
    if (candidateId) {
      loadCandidate();
      loadNotes();
    }
    async function loadCandidate() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setCandidate(null);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("candidates")
      .select("*")
      .eq("id", candidateId)
      .eq("user_id", user.id)
      .single();

    if (error) {
      console.error(
        "Could not load candidate:",
        error
      );
      setCandidate(null);
    } else {
      setCandidate(data);
    }

    setLoading(false);
  }
    setLoading(false);
  }

  async function loadNotes() {
    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .eq("candidate_id", candidateId)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(
        "Could not load notes:",
        error
      );
    } else {
      setNotes(data || []);
    }
  }

  async function updateStatus(status) {
    setUpdatingStatus(true);

    const { error } = await supabase
      .from("candidates")
      .update({ status })
      .eq("id", candidateId);

    if (error) {
      alert(
        `Could not update status: ${error.message}`
      );
    } else {
      setCandidate((current) => ({
        ...current,
        status,
      }));
    }

    setUpdatingStatus(false);
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
      alert(
        `Could not save note: ${error.message}`
      );
    } else {
      setNotes((current) => [
        data,
        ...current,
      ]);

      setNewNote("");
    }

    setSavingNote(false);
  }

  if (loading) {
    return (
      <main style={pageStyle}>
        <div style={containerStyle}>
          <h1>Candidate Profile</h1>
          <p>Loading candidate...</p>
        </div>
      </main>
    );
  }

  if (!candidate) {
    return (
      <main style={pageStyle}>
        <div style={containerStyle}>
          <h1>Candidate Not Found</h1>

          <Link
            href="/app/candidates"
            style={buttonStyle}
          >
            ← Candidate Database
          </Link>
        </div>
      </main>
    );
  }

  const score =
    candidate.match_score !== null &&
    candidate.match_score !== undefined
      ? Number(candidate.match_score)
      : null;

  const strengths = Array.isArray(
    candidate.strengths
  )
    ? candidate.strengths
    : [];

  const gaps = Array.isArray(candidate.gaps)
    ? candidate.gaps
    : [];

  const redFlags = Array.isArray(
    candidate.red_flags
  )
    ? candidate.red_flags
    : [];

  const interviewQuestions =
    Array.isArray(
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
            alignItems: "flex-start",
            gap: 20,
            marginBottom: 30,
            flexWrap: "wrap",
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

            <p
              style={{
                color: "#666",
                marginTop: 10,
              }}
            >
              Candidate information, AI evaluation
              and recruitment activity.
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
              style={buttonStyle}
            >
              ← Pipeline
            </Link>

            <Link
              href="/app/candidates"
              style={buttonStyle}
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
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  background: "#f0eee8",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 28,
                }}
              >
                👤
              </div>

              <div>
                <h2
                  style={{
                    fontFamily: "Georgia, serif",
                    margin: 0,
                    fontSize: 28,
                  }}
                >
                  {candidate.full_name ||
                    "Unnamed Candidate"}
                </h2>

                <p
                  style={{
                    color: "#666",
                    margin: "7px 0",
                  }}
                >
                  {candidate.current_title ||
                    "Candidate"}
                </p>

                <div
                  style={{
                    color: "#777",
                    fontSize: 13,
                  }}
                >
                  {candidate.location &&
                    `📍 ${candidate.location}`}

                  {candidate.years_experience !==
                    null &&
                    candidate.years_experience !==
                      undefined &&
                    `  •  ${candidate.years_experience} years experience`}
                </div>
              </div>
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  color: "#777",
                  marginBottom: 7,
                }}
              >
                Recruitment Status
              </label>

              <select
                value={
                  candidate.status ||
                  "Screening"
                }
                onChange={(e) =>
                  updateStatus(
                    e.target.value
                  )
                }
                disabled={updatingStatus}
                style={{
                  padding: "11px 14px",
                  borderRadius: 9,
                  border: "1px solid #ddd",
                  background: "#fff",
                  minWidth: 170,
                }}
              >
                {stages.map((stage) => (
                  <option
                    key={stage}
                    value={stage}
                  >
                    {stage}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* AI MATCH PROFILE */}

        <section style={cardStyle}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 25,
              gap: 20,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 12,
                  letterSpacing: 1.5,
                  color: "#777",
                  marginBottom: 6,
                }}
              >
                AI RECRUITMENT INTELLIGENCE
              </div>

              <h2
                style={{
                  fontFamily: "Georgia, serif",
                  margin: 0,
                }}
              >
                AI Match Profile
              </h2>
            </div>

            {score !== null && (
              <div
                style={{
                  textAlign: "center",
                  minWidth: 120,
                }}
              >
                <div
                  style={{
                    fontSize: 42,
                    fontWeight: 700,
                  }}
                >
                  {score}%
                </div>

                <div
                  style={{
                    fontSize: 13,
                    color: "#777",
                  }}
                >
                  Match Score
                </div>
              </div>
            )}
          </div>

          {/* SCORE / VERDICT */}

          {score !== null ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 15,
                marginBottom: 25,
              }}
            >
              <div
                style={{
                  padding: 20,
                  background: "#f7f7f5",
                  borderRadius: 13,
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    color: "#777",
                    marginBottom: 8,
                  }}
                >
                  MATCH SCORE
                </div>

                <strong
                  style={{
                    fontSize: 28,
                  }}
                >
                  {score}%
                </strong>
              </div>

              <div
                style={{
                  padding: 20,
                  background: "#f7f7f5",
                  borderRadius: 13,
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    color: "#777",
                    marginBottom: 8,
                  }}
                >
                  AI VERDICT
                </div>

                <strong
                  style={{
                    fontSize: 20,
                  }}
                >
                  {candidate.match_verdict ||
                    "Not available"}
                </strong>
              </div>

              <div
                style={{
                  padding: 20,
                  background: "#f7f7f5",
                  borderRadius: 13,
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    color: "#777",
                    marginBottom: 8,
                  }}
                >
                  MATCHED JOB
                </div>

                <strong>
                  {candidate.matched_job_title ||
                    "Not available"}
                </strong>
              </div>
            </div>
          ) : (
            <div
              style={{
                padding: 20,
                background: "#f7f7f5",
                borderRadius: 13,
                color: "#666",
                marginBottom: 20,
              }}
            >
              This candidate has not yet been
              linked to an AI screening result.
            </div>
          )}

          {/* AI SUMMARY */}

          <div
            style={{
              marginBottom: 25,
            }}
          >
            <h3>AI Summary</h3>

            <p
              style={{
                color: "#555",
                lineHeight: 1.7,
                whiteSpace: "pre-wrap",
              }}
            >
              {candidate.ai_summary ||
                "No AI summary available yet."}
            </p>
          </div>

          {/* STRENGTHS / GAPS / RED FLAGS */}

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 18,
            }}
          >
            <div
              style={{
                padding: 20,
                border: "1px solid #eee",
                borderRadius: 13,
              }}
            >
              <h3 style={{ marginTop: 0 }}>
                💪 Strengths
              </h3>

              {strengths.length ? (
                <ul
                  style={{
                    lineHeight: 1.8,
                    paddingLeft: 20,
                  }}
                >
                  {strengths.map(
                    (item, index) => (
                      <li key={index}>
                        {item}
                      </li>
                    )
                  )}
                </ul>
              ) : (
                <p
                  style={{
                    color: "#777",
                  }}
                >
                  No strengths available yet.
                </p>
              )}
            </div>

            <div
              style={{
                padding: 20,
                border: "1px solid #eee",
                borderRadius: 13,
              }}
            >
              <h3 style={{ marginTop: 0 }}>
                ⚠️ Gaps
              </h3>

              {gaps.length ? (
                <ul
                  style={{
                    lineHeight: 1.8,
                    paddingLeft: 20,
                  }}
                >
                  {gaps.map(
                    (item, index) => (
                      <li key={index}>
                        {item}
                      </li>
                    )
                  )}
                </ul>
              ) : (
                <p
                  style={{
                    color: "#777",
                  }}
                >
                  No gaps available yet.
                </p>
              )}
            </div>

            <div
              style={{
                padding: 20,
                border: "1px solid #eee",
                borderRadius: 13,
              }}
            >
              <h3 style={{ marginTop: 0 }}>
                🚩 Red Flags
              </h3>

              {redFlags.length ? (
                <ul
                  style={{
                    lineHeight: 1.8,
                    paddingLeft: 20,
                  }}
                >
                  {redFlags.map(
                    (item, index) => (
                      <li key={index}>
                        {item}
                      </li>
                    )
                  )}
                </ul>
              ) : (
                <p
                  style={{
                    color: "#777",
                  }}
                >
                  No red flags identified.
                </p>
              )}
            </div>
          </div>

          {/* INTERVIEW QUESTIONS */}

          <div
            style={{
              marginTop: 25,
              padding: 20,
              background: "#f7f7f5",
              borderRadius: 13,
            }}
          >
            <h3 style={{ marginTop: 0 }}>
              🎤 AI Interview Questions
            </h3>

            {interviewQuestions.length ? (
              <ol
                style={{
                  lineHeight: 1.8,
                  paddingLeft: 22,
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
            ) : (
              <p
                style={{
                  color: "#777",
                }}
              >
                No AI interview questions
                available yet.
              </p>
            )}
          </div>
        </section>

        {/* CANDIDATE INFORMATION */}

        <section style={cardStyle}>
          <h2
            style={{
              fontFamily: "Georgia, serif",
              marginTop: 0,
            }}
          >
            Candidate Information
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 15,
            }}
          >
            <Info
              label="Full Name"
              value={
                candidate.full_name
              }
            />

            <Info
              label="Current Title"
              value={
                candidate.current_title
              }
            />

            <Info
              label="Location"
              value={
                candidate.location
              }
            />

            <Info
              label="Years of Experience"
              value={
                candidate.years_experience
              }
            />

            <Info
              label="Email"
              value={candidate.email}
            />

            <Info
              label="Phone"
              value={candidate.phone}
            />

            <Info
              label="LinkedIn"
              value={
                candidate.linkedin_url
              }
            />

            <Info
              label="CV File"
              value={
                candidate.cv_file_name
              }
            />

            <Info
              label="Source"
              value={candidate.source}
            />
          </div>
        </section>

        {/* RECRUITMENT NOTES */}

        <section style={cardStyle}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 15,
            }}
          >
            <div>
              <h2
                style={{
                  fontFamily: "Georgia, serif",
                  margin: 0,
                }}
              >
                Recruitment Notes
              </h2>

              <p
                style={{
                  color: "#777",
                  marginTop: 7,
                }}
              >
                Add a new recruitment note.
                Each note is saved separately.
              </p>
            </div>
          </div>

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
              border: "1px solid #ddd",
              borderRadius: 10,
              resize: "vertical",
              fontFamily: "Arial, sans-serif",
              fontSize: 14,
            }}
          />

          <button
            onClick={saveNote}
            disabled={
              savingNote ||
              !newNote.trim()
            }
            style={{
              marginTop: 12,
              padding: "12px 22px",
              border: "none",
              borderRadius: 9,
              background: "#222",
              color: "#fff",
              cursor:
                savingNote ||
                !newNote.trim()
                  ? "not-allowed"
                  : "pointer",
              opacity:
                savingNote ||
                !newNote.trim()
                  ? 0.6
                  : 1,
              fontWeight: 600,
            }}
          >
            {savingNote
              ? "Saving..."
              : "Save Note"}
          </button>

          {/* PREVIOUS NOTES */}

          {notes.length > 0 && (
            <div style={{ marginTop: 30 }}>
              <h3>Previous Notes</h3>

              <div
                style={{
                  display: "grid",
                  gap: 12,
                }}
              >
                {notes.map((note) => (
                  <div
                    key={note.id}
                    style={{
                      padding: 16,
                      border: "1px solid #eee",
                      borderRadius: 12,
                      background: "#faf9f6",
                    }}
                  >
                    <div
                      style={{
                        color: "#333",
                        lineHeight: 1.6,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {note.note}
                    </div>

                    <div
                      style={{
                        marginTop: 8,
                        fontSize: 12,
                        color: "#888",
                      }}
                    >
                      {note.created_at
                        ? new Date(
                            note.created_at
                          ).toLocaleString(
                            "en-GB"
                          )
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

function Info({ label, value }) {
  return (
    <div
      style={{
        padding: 16,
        background: "#f7f7f5",
        borderRadius: 11,
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: "#777",
          marginBottom: 6,
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontWeight: 600,
          wordBreak: "break-word",
        }}
      >
        {value || "—"}
      </div>
    </div>
  );
}
