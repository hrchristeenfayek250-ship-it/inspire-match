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
  const [notesHistory, setNotesHistory] = useState([]);
  const [newNote, setNewNote] = useState("");

  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingNote, setSavingNote] = useState(false);

  const [message, setMessage] = useState("");

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
      console.error(error);
      setMessage(`Could not load candidate: ${error.message}`);
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
      return;
    }

    setNotesHistory(data || []);
  }

  async function changeStatus(status) {
    if (!candidate) return;

    setSavingStatus(true);
    setMessage("");

    const { error } = await supabase
      .from("candidates")
      .update({ status })
      .eq("id", candidate.id);

    if (error) {
      setMessage(`Could not update status: ${error.message}`);
    } else {
      setCandidate((current) => ({
        ...current,
        status,
      }));

      setMessage("Status updated successfully.");
    }

    setSavingStatus(false);
  }

  async function saveNote() {
    const trimmedNote = newNote.trim();

    if (!trimmedNote) {
      setMessage("Please write a note first.");
      return;
    }

    if (!candidate) return;

    setSavingNote(true);
    setMessage("");

    const { data, error } = await supabase
      .from("notes")
      .insert([
        {
          candidate_id: candidate.id,
          note: trimmedNote,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Could not save note:", error);
      setMessage(`Could not save note: ${error.message}`);
    } else {
      setNotesHistory((current) => [
        data,
        ...current,
      ]);

      setNewNote("");
      setMessage("Note saved successfully.");
    }

    setSavingNote(false);
  }

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          padding: "60px 24px",
          background: "#faf9f6",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <h1>Candidate Profile</h1>
          <p>Loading candidate...</p>
        </div>
      </main>
    );
  }

  if (!candidate) {
    return (
      <main
        style={{
          minHeight: "100vh",
          padding: "60px 24px",
          background: "#faf9f6",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <h1>Candidate Not Found</h1>

          <Link
            href="/app/candidates"
            style={{
              display: "inline-block",
              marginTop: 20,
              padding: "12px 18px",
              borderRadius: 10,
              background: "#222",
              color: "#fff",
              textDecoration: "none",
            }}
          >
            ← Candidate Database
          </Link>
        </div>
      </main>
    );
  }

  const candidateName =
    candidate.full_name || "Unnamed Candidate";

  const currentStatus =
    candidate.status || "Screening";

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "45px 24px",
        background: "#faf9f6",
        fontFamily: "Arial, sans-serif",
        color: "#222",
      }}
    >
      <div
        style={{
          maxWidth: 1150,
          margin: "0 auto",
        }}
      >
        {/* HEADER */}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
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

            <p style={{ color: "#777" }}>
              Candidate information and recruitment notes.
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
              style={{
                textDecoration: "none",
                padding: "11px 17px",
                borderRadius: 9,
                border: "1px solid #ddd",
                background: "#fff",
                color: "#222",
              }}
            >
              ← Pipeline
            </Link>

            <Link
              href="/app/candidates"
              style={{
                textDecoration: "none",
                padding: "11px 17px",
                borderRadius: 9,
                border: "1px solid #ddd",
                background: "#fff",
                color: "#222",
              }}
            >
              Candidate Database
            </Link>
          </div>
        </div>

        {/* CANDIDATE HEADER */}

        <section
          style={{
            background: "#fff",
            border: "1px solid #eee",
            borderRadius: 18,
            padding: 28,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 25,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  background: "#f1f1ee",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 28,
                  marginBottom: 16,
                }}
              >
                👤
              </div>

              <h2
                style={{
                  fontFamily: "Georgia, serif",
                  fontSize: 30,
                  margin: 0,
                }}
              >
                {candidateName}
              </h2>

              <p
                style={{
                  fontSize: 17,
                  color: "#555",
                }}
              >
                {candidate.current_title || "No current title"}
              </p>
            </div>

            <div style={{ minWidth: 220 }}>
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
                value={currentStatus}
                onChange={(e) =>
                  changeStatus(e.target.value)
                }
                disabled={savingStatus}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: "1px solid #ddd",
                  background: "#fff",
                }}
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

        {/* MESSAGE */}

        {message && (
          <div
            style={{
              padding: "12px 15px",
              marginBottom: 20,
              borderRadius: 10,
              background: "#f1f1ee",
              color: "#555",
            }}
          >
            {message}
          </div>
        )}

        {/* MAIN */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "minmax(0, 1.3fr) minmax(300px, 0.7fr)",
            gap: 20,
          }}
        >
          {/* INFORMATION */}

          <section
            style={{
              background: "#fff",
              border: "1px solid #eee",
              borderRadius: 18,
              padding: 26,
            }}
          >
            <h2
              style={{
                fontFamily: "Georgia, serif",
                marginTop: 0,
              }}
            >
              Candidate Information
            </h2>

            <InfoRow
              label="Full Name"
              value={candidate.full_name}
            />

            <InfoRow
              label="Current Title"
              value={candidate.current_title}
            />

            <InfoRow
              label="Location"
              value={candidate.location}
            />

            <InfoRow
              label="Years of Experience"
              value={
                candidate.years_experience != null
                  ? `${candidate.years_experience} years`
                  : null
              }
            />

            <InfoRow
              label="Email"
              value={candidate.email}
            />

            <InfoRow
              label="Phone"
              value={candidate.phone}
            />

            <InfoRow
              label="LinkedIn"
              value={candidate.linkedin_url}
              link={candidate.linkedin_url}
            />

            <InfoRow
              label="Skills"
              value={candidate.skills}
            />

            <InfoRow
              label="Source"
              value={candidate.source}
            />

            <InfoRow
              label="CV File"
              value={candidate.cv_file_name}
            />
          </section>

          {/* NOTES */}

          <section
            style={{
              background: "#fff",
              border: "1px solid #eee",
              borderRadius: 18,
              padding: 26,
              alignSelf: "start",
            }}
          >
            <h2
              style={{
                fontFamily: "Georgia, serif",
                marginTop: 0,
              }}
            >
              Recruitment Notes
            </h2>

            <p
              style={{
                color: "#777",
                fontSize: 14,
                lineHeight: 1.6,
              }}
            >
              Add a new recruitment note. Each note will
              be saved separately.
            </p>

            {/* NEW NOTE — ALWAYS EMPTY */}

            <textarea
              value={newNote}
              onChange={(e) => {
                setNewNote(e.target.value);
                setMessage("");
              }}
              placeholder="Write a new note..."
              rows={7}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: 14,
                borderRadius: 10,
                border: "1px solid #ddd",
                resize: "vertical",
                fontFamily: "Arial, sans-serif",
                fontSize: 14,
                lineHeight: 1.6,
              }}
            />

            <button
              onClick={saveNote}
              disabled={savingNote}
              style={{
                width: "100%",
                marginTop: 12,
                padding: "13px 18px",
                borderRadius: 10,
                border: "none",
                background: "#222",
                color: "#fff",
                fontSize: 15,
                fontWeight: 600,
                cursor: savingNote
                  ? "not-allowed"
                  : "pointer",
                opacity: savingNote ? 0.7 : 1,
              }}
            >
              {savingNote ? "Saving..." : "Save Note"}
            </button>

            {/* PREVIOUS NOTES */}

            <div style={{ marginTop: 28 }}>
              <h3
                style={{
                  fontFamily: "Georgia, serif",
                  marginBottom: 14,
                }}
              >
                Previous Notes
              </h3>

              {notesHistory.length === 0 ? (
                <p
                  style={{
                    color: "#999",
                    fontSize: 14,
                  }}
                >
                  No previous notes yet.
                </p>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gap: 12,
                  }}
                >
                  {notesHistory.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        background: "#f7f7f5",
                        borderRadius: 12,
                        padding: 14,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 13,
                          color: "#333",
                          lineHeight: 1.6,
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {item.note}
                      </div>

                      <div
                        style={{
                          marginTop: 9,
                          fontSize: 11,
                          color: "#999",
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
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function InfoRow({ label, value, link }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "180px 1fr",
        gap: 15,
        padding: "13px 0",
        borderBottom: "1px solid #f0f0ed",
      }}
    >
      <div
        style={{
          color: "#777",
          fontSize: 14,
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: 14,
          wordBreak: "break-word",
        }}
      >
        {!value ? (
          "—"
        ) : link ? (
          <a
            href={link}
            target="_blank"
            rel="noreferrer"
            style={{
              color: "#222",
              textDecoration: "underline",
            }}
          >
            {value}
          </a>
        ) : (
          value
        )}
      </div>
    </div>
  );
}
