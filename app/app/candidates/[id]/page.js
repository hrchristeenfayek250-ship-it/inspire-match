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
  const [loading, setLoading] = useState(true);

  const [savingStatus, setSavingStatus] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);

  const [notes, setNotes] = useState("");
  const [notesSaved, setNotesSaved] = useState(false);

  const [message, setMessage] = useState("");

  useEffect(() => {
    if (candidateId) {
      loadCandidate();
    }
  }, [candidateId]);

  async function loadCandidate() {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("candidates")
      .select("*")
      .eq("id", candidateId)
      .single();

    if (error) {
      console.error("Could not load candidate:", error);
      setMessage(`Could not load candidate: ${error.message}`);
    } else {
      setCandidate(data);

      const savedNotes = data?.notes || "";

      setNotes(savedNotes);
      setNotesSaved(Boolean(savedNotes.trim()));
    }

    setLoading(false);
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
      console.error("Could not update status:", error);
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

  function handleNotesChange(e) {
    setNotes(e.target.value);
    setNotesSaved(false);
    setMessage("");
  }

  async function saveNotes() {
    if (!candidate) return;

    setSavingNotes(true);
    setMessage("");

    const { error } = await supabase
      .from("candidates")
      .update({
        notes: notes,
      })
      .eq("id", candidate.id);

    if (error) {
      console.error("Could not save notes:", error);
      setMessage(`Could not save notes: ${error.message}`);
      setNotesSaved(false);
    } else {
      setCandidate((current) => ({
        ...current,
        notes,
      }));

      setNotesSaved(true);
      setMessage("Note saved successfully.");
    }

    setSavingNotes(false);
  }

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          padding: "60px 24px",
          background: "#faf9f6",
          fontFamily: "Arial, sans-serif",
          color: "#222",
        }}
      >
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <h1 style={{ fontFamily: "Georgia, serif" }}>
            Candidate Profile
          </h1>

          <p style={{ color: "#777" }}>
            Loading candidate...
          </p>
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
          color: "#222",
        }}
      >
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <h1 style={{ fontFamily: "Georgia, serif" }}>
            Candidate Not Found
          </h1>

          <p style={{ color: "#777" }}>
            We could not find this candidate.
          </p>

          <Link
            href="/app/candidates"
            style={{
              display: "inline-block",
              marginTop: 20,
              textDecoration: "none",
              padding: "12px 18px",
              borderRadius: 10,
              background: "#222",
              color: "#fff",
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

            <p
              style={{
                color: "#777",
                marginTop: 8,
              }}
            >
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
                  margin: "8px 0 0",
                }}
              >
                {candidate.current_title ||
                  "No current title available"}
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
                  fontSize: 15,
                }}
              >
                {stages.map((stage) => (
                  <option key={stage} value={stage}>
                    {stage}
                  </option>
                ))}
              </select>

              {savingStatus && (
                <div
                  style={{
                    fontSize: 12,
                    color: "#777",
                    marginTop: 6,
                  }}
                >
                  Saving status...
                </div>
              )}
            </div>
          </div>
        </section>

        {/* MESSAGE */}

        {message && (
          <div
            style={{
              background: notesSaved
                ? "#eef8ef"
                : "#f1f1ee",
              border: "1px solid #e5e5df",
              borderRadius: 10,
              padding: "12px 15px",
              marginBottom: 20,
              color: notesSaved ? "#397344" : "#555",
              fontSize: 14,
            }}
          >
            {notesSaved ? "✅ " : ""}
            {message}
          </div>
        )}

        {/* MAIN GRID */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "minmax(0, 1.3fr) minmax(300px, 0.7fr)",
            gap: 20,
          }}
        >
          {/* CANDIDATE INFORMATION */}

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
                marginBottom: 20,
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
                candidate.years_experience !== null &&
                candidate.years_experience !== undefined
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

            <InfoRow
              label="Blind Screening"
              value={
                candidate.blind_screening
                  ? "Enabled"
                  : "Disabled"
              }
            />

            <InfoRow
              label="Added"
              value={
                candidate.created_at
                  ? new Date(
                      candidate.created_at
                    ).toLocaleDateString()
                  : null
              }
            />
          </section>

          {/* RECRUITMENT NOTES */}

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
                marginBottom: 8,
              }}
            >
              Recruitment Notes
            </h2>

            <p
              style={{
                color: "#777",
                fontSize: 14,
                lineHeight: 1.6,
                marginTop: 0,
              }}
            >
              Add interview observations, follow-ups, or
              hiring feedback.
            </p>

            <textarea
              value={notes}
              onChange={handleNotesChange}
              placeholder="Write your recruitment notes here..."
              rows={12}
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
                outline: "none",
              }}
            />

            <button
              onClick={saveNotes}
              disabled={savingNotes || notesSaved}
              style={{
                width: "100%",
                marginTop: 12,
                padding: "13px 18px",
                borderRadius: 10,
                border: "none",
                background: notesSaved
                  ? "#eaf5ec"
                  : "#222",
                color: notesSaved
                  ? "#397344"
                  : "#fff",
                fontSize: 15,
                fontWeight: 600,
                cursor:
                  savingNotes || notesSaved
                    ? "default"
                    : "pointer",
                opacity: savingNotes ? 0.7 : 1,
              }}
            >
              {savingNotes
                ? "Saving..."
                : notesSaved
                ? "✓ Saved"
                : "Save Notes"}
            </button>
          </section>
        </div>

        {/* RECRUITMENT SUMMARY */}

        <section
          style={{
            background: "#fff",
            border: "1px solid #eee",
            borderRadius: 18,
            padding: 26,
            marginTop: 20,
          }}
        >
          <h2
            style={{
              fontFamily: "Georgia, serif",
              marginTop: 0,
              marginBottom: 8,
            }}
          >
            Recruitment Summary
          </h2>

          <p
            style={{
              color: "#777",
              marginTop: 0,
              lineHeight: 1.6,
            }}
          >
            Review the candidate, update their recruitment
            stage, and keep important hiring notes in one
            place.
          </p>

          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              marginTop: 18,
            }}
          >
            <div
              style={{
                padding: "12px 16px",
                borderRadius: 10,
                background: "#f7f7f5",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: "#777",
                  marginBottom: 4,
                }}
              >
                Current Stage
              </div>

              <strong>{currentStatus}</strong>
            </div>

            <div
              style={{
                padding: "12px 16px",
                borderRadius: 10,
                background: "#f7f7f5",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: "#777",
                  marginBottom: 4,
                }}
              >
                Candidate ID
              </div>

              <strong>#{candidate.id}</strong>
            </div>
          </div>
        </section>
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
          color: "#222",
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
``
