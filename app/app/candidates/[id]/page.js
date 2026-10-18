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
  const [openingCV, setOpeningCV] = useState(false);
  
const [isEditing, setIsEditing] = useState(false);
  
const [editForm, setEditForm] = useState({});
  
const [savingProfile, setSavingProfile] = useState(false);
  const [deletingCandidate, setDeletingCandidate] = useState(false);



 
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState("");

  const [availableJobs, setAvailableJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [savingJobAssignment, setSavingJobAssignment] = useState(false);


  const [loading, setLoading] = useState(true);
  const [savingNote, setSavingNote] = useState(false);
  const [updatingStatus, setUpdatingStatus] =
    useState(false);

    
  useEffect(() => {
    if (candidateId) {
      loadCandidate();
      loadNotes();
      loadAvailableJobs();
    }
  }, [candidateId]);

  async function loadAvailableJobs() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setAvailableJobs([]);
      return;
    }

    const { data: memberships, error: membershipError } =
      await supabase
        .from("company_members")
        .select("company_id")
        .eq("user_id", user.id)
        .limit(2);

    if (membershipError || memberships?.length !== 1) {
      setAvailableJobs([]);
      return;
    }

    const companyId = memberships[0].company_id;

    const { data, error } = await supabase
      .from("jobs")
      .select("id, title, status")
      .or(
        `company_id.eq.${companyId},and(company_id.is.null,user_id.eq.${user.id})`
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Could not load available jobs:", error);
      setAvailableJobs([]);
      return;
    }

    setAvailableJobs(data || []);
  }

 
  async function assignCandidateToJob() {
    if (savingJobAssignment || !selectedJobId || !candidate) return;

    const selectedJob = availableJobs.find(
      (job) => String(job.id) === String(selectedJobId)
    );

    if (!selectedJob) {
      alert("Please select a valid job.");
      return;
    }

    setSavingJobAssignment(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("You must be logged in.");
      }

      const { data: memberships, error: membershipError } =
        await supabase
          .from("company_members")
          .select("company_id")
          .eq("user_id", user.id)
          .limit(2);

      if (membershipError || memberships?.length !== 1) {
        throw new Error("Could not verify your company.");
      }

      const companyId = memberships[0].company_id;

      const { data: verifiedJob, error: jobError } =
        await supabase
          .from("jobs")
          .select("id")
          .eq("id", selectedJobId)
          .or(
            `company_id.eq.${companyId},and(company_id.is.null,user_id.eq.${user.id})`
          )
          .single();

      if (jobError || !verifiedJob) {
        throw new Error("This job is not available for your company.");
      }

      const { data, error } = await supabase
        .from("candidates")
        .update({ job_id: verifiedJob.id })
        .eq("id", candidateId)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;

      setCandidate(data);
      setEditForm(data);
      setSelectedJobId("");

      alert("Candidate assigned to job successfully!");
    } catch (error) {
      alert(`Could not assign candidate: ${error.message}`);
    } finally {
      setSavingJobAssignment(false);
    }
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
      let savedAIMatch = null;

      if (data.company_id && data.job_id) {
        const { data: matchData, error: matchError } =
          await supabase
            .from("ai_match_results")
            .select(
              "score, confidence, verdict, summary, strengths, gaps, interview_questions, evaluated_at, job_id"
            )
            .eq("company_id", data.company_id)
            .eq("candidate_id", data.id)
            .eq("job_id", data.job_id)
            .maybeSingle();

        if (matchError) {
          console.error("Could not load saved AI match:", matchError);
        } else {
          savedAIMatch = matchData;
        }
      }

      setCandidate({
        ...data,
        saved_ai_match: savedAIMatch,
      });
      setEditForm(data);
    }


    setLoading(false);
  }

    async function loadNotes() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setNotes([]);
      return;
    }

    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .eq("candidate_id", candidateId)
      .eq("user_id", user.id)
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

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setUpdatingStatus(false);
      return;
    }

    const { error } = await supabase
      .from("candidates")
      .update({ status })
      .eq("id", candidateId)
      .eq("user_id", user.id);

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
   
function startEditing() {
  setEditForm({ ...candidate });
  setIsEditing(true);
}

function cancelEditing() {
  setEditForm({ ...candidate });
  setIsEditing(false);
}
 
function updateEditField(field, value) {
  setEditForm((current) => ({
    ...current,
    [field]: value,
  }));
}
  
async function saveProfile() {
  if (savingProfile) return;

  const fullName = String(editForm.full_name || "").trim();

  if (!fullName) {
    alert("Candidate name is required.");
    return;
  }

  setSavingProfile(true);

  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("You must be logged in.");
    }

    const updates = {
      full_name: fullName,
      current_title: editForm.current_title || null,
      location: editForm.location || null,
      email: editForm.email || null,
      phone: editForm.phone || null,
      linkedin_url: editForm.linkedin_url || null,
      years_experience:
        editForm.years_experience === "" ||
        editForm.years_experience == null
          ? null
          : Number(editForm.years_experience),
    };

    if (
      updates.years_experience !== null &&
      (!Number.isFinite(updates.years_experience) ||
        updates.years_experience < 0)
    ) {
      throw new Error("Enter valid years of experience.");
    }

    const { data, error } = await supabase
      .from("candidates")
      .update(updates)
      .eq("id", candidateId)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) throw error;

    setCandidate(data);
    setEditForm(data);
    setIsEditing(false);
  } catch (error) {
    alert(`Could not save profile: ${error.message}`);
  } finally {
    setSavingProfile(false);
  }
}

async function deleteCandidate() {
  if (deletingCandidate || !candidate) return;

  const confirmed = window.confirm(
    `Are you sure you want to permanently delete ${candidate.full_name}? This action cannot be undone.`
  );

  if (!confirmed) return;

  setDeletingCandidate(true);

  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("You must be logged in.");

    const { data, error } = await supabase
      .from("candidates")
      .delete()
      .eq("id", candidateId)
      .eq("user_id", user.id)
      .select("id");

    if (error) throw error;
    if (!data?.length) {
      throw new Error("Candidate not deleted. Check permissions.");
    }

    alert("Candidate deleted successfully.");
    window.location.href = "/app/candidates";
  } catch (error) {
    alert(`Delete failed: ${error.message}`);
  } finally {
    setDeletingCandidate(false);
  }
}

  async function saveNote() {
      


    if (!newNote.trim()) return;

    setSavingNote(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("You must be logged in to save a note.");
      setSavingNote(false);
      return;
    }

    if (!candidate?.company_id) {
      alert("This candidate is not linked to a company.");
      setSavingNote(false);
      return;
    }

    const { data, error } = await supabase
      .from("notes")
      .insert([
        {
          user_id: user.id,
          candidate_id: Number(candidateId),
          
company_id: candidate.company_id,

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

        
        {/* SMART JOB ASSIGNMENT */}
        <section
          style={{
            ...cardStyle,
            border: "1px solid #D5E8DE",
            background: "#F7FBF8",
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: 2,
              color: "#347A65",
              marginBottom: 10,
            }}
          >
            TALENT MANAGEMENT
          </div>

          <h2
            style={{
              fontFamily: "Georgia, serif",
              fontSize: 25,
              color: "#173F3A",
              margin: "0 0 10px",
            }}
          >
            Smart Job Assignment
          </h2>

          <p
            style={{
              fontSize: 13,
              color: "#65796D",
              lineHeight: 1.7,
              marginBottom: 22,
            }}
          >
            Link this candidate to a job opening within
            your company.
          </p>

          <div
            style={{
              background: "#FFFFFF",
              border: "1px solid #DCE9DF",
              borderRadius: 12,
              padding: 17,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#71847A",
                marginBottom: 8,
              }}
            >
              CURRENT JOB ASSIGNMENT
            </div>

            <div
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: "#245C4A",
              }}
            >
              {candidate.job_id
                ? availableJobs.find(
                    (job) =>
                      String(job.id) ===
                      String(candidate.job_id)
                  )?.title || "Assigned job"
                : "Not Assigned Yet"}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "end",
              gap: 14,
            }}
          >
            <div style={{ flex: "1 1 260px" }}>
              <label
                htmlFor="candidate-job-assignment"
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 800,
                  color: "#245C4A",
                  marginBottom: 9,
                }}
              >
                Select Job Opening
              </label>

              <select
                id="candidate-job-assignment"
                value={selectedJobId}
                onChange={(event) =>
                  setSelectedJobId(event.target.value)
                }
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "13px 14px",
                  borderRadius: 10,
                  border: "1px solid #D5E8DE",
                  background: "#FFFFFF",
                  color: "#173F3A",
                  fontSize: 13,
                }}
              >
                <option value="">
                  Choose a job opening
                </option>

                {availableJobs.map((job) => (
                  <option
                    key={job.id}
                    value={String(job.id)}
                  >
                    {job.title} — {job.status || "Active"}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={assignCandidateToJob}
              disabled={
                savingJobAssignment ||
                !selectedJobId ||
                String(selectedJobId) ===
                  String(candidate.job_id)
              }
              style={{
                padding: "13px 22px",
                borderRadius: 10,
                border: "none",
                background:
                  savingJobAssignment || !selectedJobId
                    ? "#AAB8AE"
                    : "#245C4A",
                color: "#FFFFFF",
                fontWeight: 800,
                fontSize: 13,
                cursor:
                  savingJobAssignment || !selectedJobId
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              
              {savingJobAssignment
                ? "Assigning..."
                : "Assign Candidate"}
            </button>
          </div>

          <p
            style={{
              color: "#819388",
              fontSize: 11,
              lineHeight: 1.7,
              marginTop: 16,
              marginBottom: 0,
            }}
          >
            Job assignment updates recruitment records.
            Any existing AI match score is not
            automatically recalculated.
          </p>
        </section>

        {/* SAVED JOB-SPECIFIC AI MATCH */}

        <section
          style={{
            ...cardStyle,
            border: "1px solid #CFE4D6",
            background: "#F8FCF9",
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 800,
              color: "#348368",
              letterSpacing: 1.5,
              marginBottom: 8,
            }}
          >
            INSPIRE MATCH • AI TALENT INTELLIGENCE
          </div>

          <h2
            style={{
              fontFamily: "Georgia, serif",
              color: "#173F3A",
              marginTop: 0,
            }}
          >
            Saved AI Job Matching
          </h2>

          <p style={{ color: "#65796D", lineHeight: 1.7 }}>
            AI assessment for the candidate's assigned job.
          </p>

          {candidate.saved_ai_match ? (
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 24,
                  flexWrap: "wrap",
                  margin: "22px 0",
                }}
              >
                <strong
                  style={{
                    fontSize: 44,
                    color: "#245C4A",
                  }}
                >
                  {candidate.saved_ai_match.score == null
                    ? "N/A"
                    : `${candidate.saved_ai_match.score}%`}
                </strong>

                <div>
                  <strong style={{ fontSize: 20 }}>
                    {candidate.saved_ai_match.verdict ||
                      "Review Required"}
                  </strong>
                  <p
                    style={{
                      color: "#65796D",
                      margin: "6px 0",
                    }}
                  >
                    Confidence:{" "}
                    {candidate.saved_ai_match.confidence ||
                      "Not available"}
                  </p>
                </div>
              </div>

              <p
                style={{
                  lineHeight: 1.8,
                  color: "#365B4B",
                }}
              >
                {candidate.saved_ai_match.summary ||
                  "No AI summary available."}
              </p>

              <h3>✅ Key Strengths</h3>
              {candidate.saved_ai_match.strengths?.length ? (
                <ul style={{ lineHeight: 1.9 }}>
                  {candidate.saved_ai_match.strengths.map(
                    (item, index) => (
                      <li key={index}>{item}</li>
                    )
                  )}
                </ul>
              ) : (
                <p>No strengths recorded.</p>
              )}

              <h3>⚠️ Missing or Unverified Requirements</h3>
              {candidate.saved_ai_match.gaps?.length ? (
                <ul style={{ lineHeight: 1.9 }}>
                  {candidate.saved_ai_match.gaps.map(
                    (item, index) => (
                      <li key={index}>{item}</li>
                    )
                  )}
                </ul>
              ) : (
                <p>No gaps recorded.</p>
              )}

              <h3>💬 Suggested Interview Questions</h3>
              {candidate.saved_ai_match.interview_questions?.length ? (
                <ol style={{ lineHeight: 1.9 }}>
                  {candidate.saved_ai_match.interview_questions.map(
                    (question, index) => (
                      <li key={index}>{question}</li>
                    )
                  )}
                </ol>
              ) : (
                <p>No interview questions recorded.</p>
              )}

              <p
                style={{
                  fontSize: 12,
                  color: "#73877A",
                  marginTop: 25,
                }}
              >
                Last evaluated:{" "}
                {candidate.saved_ai_match.evaluated_at
                  ? new Date(
                      candidate.saved_ai_match.evaluated_at
                    ).toLocaleString()
                  : "Unknown"}
              </p>
            </div>
          ) : (
            <div>
              <p style={{ color: "#65796D" }}>
                No saved AI assessment for the currently
                assigned job yet.
              </p>

              <Link
                href="/app/matching"
                style={{
                  ...buttonStyle,
                  background: "#245C4A",
                  color: "#FFFFFF",
                  border: "none",
                }}
              >
                🤖 Open AI Matching
              </Link>
            </div>
          )}
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


{!isEditing && (
  <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
    <button type="button" onClick={startEditing} style={buttonStyle}>
      Edit Profile
    </button>

    <button
      type="button"
      disabled
      style={{
        ...buttonStyle,
        background: "#fee2e2",
        color: "#b91c1c",
        cursor: "not-allowed",
      }}
    >
      Delete Candidate
    </button>
  </div>
)}

{isEditing && (
  <>
  <div style={{ marginBottom: 16 }}>
    <label>Full Name</label>
    <input
      type="text"
      value={editForm.full_name || ""}
      onChange={(e) => updateEditField("full_name", e.target.value)}
      style={{ display: "block", padding: 12, width: "100%", maxWidth: 400, marginTop: 8, border: "1px solid #ddd", borderRadius: 8 }}
    />
  </div>

<div style={{ marginBottom: 16 }}>
  <label>Current Title</label>
  <input
    type="text"
    value={editForm.current_title || ""}
    onChange={(e) => updateEditField("current_title", e.target.value)}
    style={{ display: "block", padding: 12, width: "100%", maxWidth: 400, marginTop: 8, border: "1px solid #ddd", borderRadius: 8 }}
  />
</div>

<div style={{ marginBottom: 16 }}>
  <label>Location</label>
  <input
    type="text"
    value={editForm.location || ""}
    onChange={(e) => updateEditField("location", e.target.value)}
    style={{ display: "block", padding: 12, width: "100%", maxWidth: 400, marginTop: 8, border: "1px solid #ddd", borderRadius: 8 }}
  />
</div>

<div style={{ marginBottom: 16 }}>
  <label>Years of Experience</label>
  <input
    type="number"
    min="0"
    value={editForm.years_experience ?? ""}
    onChange={(e) => updateEditField("years_experience", e.target.value)}
    style={{ display: "block", padding: 12, width: "100%", maxWidth: 400, marginTop: 8, border: "1px solid #ddd", borderRadius: 8 }}
  />
</div>

  
<div style={{ marginBottom: 16 }}>
  <label>Phone Number</label>
  <input
    type="tel"
    value={editForm.phone || ""}
    onChange={(e) => updateEditField("phone", e.target.value)}
    style={{ display: "block", padding: 12, width: "100%", maxWidth: 400, marginTop: 8, border: "1px solid #ddd", borderRadius: 8 }}
  />
</div>
<div style={{ marginBottom: 16 }}>
    <label>Email Address</label>
  <input
    type="email"
    value={editForm.email || ""}
    onChange={(e) => updateEditField("email", e.target.value)}
    style={{ display: "block", padding: 12, width: "100%", maxWidth: 400, marginTop: 8, border: "1px solid #ddd", borderRadius: 8 }}
  />
</div>

<div style={{ marginBottom: 16 }}>
  <label>LinkedIn Profile</label>
  <input
    type="url"
    value={editForm.linkedin_url || ""}
    onChange={(e) => updateEditField("linkedin_url", e.target.value)}
    style={{ display: "block", padding: 12, width: "100%", maxWidth: 400, marginTop: 8, border: "1px solid #ddd", borderRadius: 8 }}
  />
</div>


<div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
  <button
    type="button"
    onClick={saveProfile}
    disabled={savingProfile}
    style={{ background: "#245c4a", color: "white", padding: 12, borderRadius: 8, cursor: "pointer" }}
  >
    {savingProfile ? "Saving..." : "Save Changes"}
  </button>

  <button
    type="button"
    onClick={cancelEditing}
    disabled={savingProfile}
    style={{ background: "#eee", color: "#333", padding: 12, borderRadius: 8, cursor: "pointer" }}
  >
    Cancel
  </button>
</div>

    </>


)}

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
    CV File
  </div>

  <div
    style={{
      fontWeight: 600,
      wordBreak: "break-word",
    }}
  >
    {candidate.cv_file_name || "—"}
  </div>

  {candidate.cv_file_url && (
    <button
      type="button"
      onClick={async () => {
        const tab = window.open("", "_blank");

        if (!tab) {
          alert("Please allow pop-ups and try again.");
          return;
        }

        tab.opener = null;

        try {
          const { data, error } = await supabase.storage
            .from("candidate-cvs")
            .createSignedUrl(candidate.cv_file_url, 120);

          if (error) throw error;

          if (!data?.signedUrl) {
            throw new Error("CV link unavailable.");
          }

          tab.location.replace(data.signedUrl);
        } catch (error) {
          tab.close();
          alert(`Could not open CV: ${error.message}`);
        }
      }}
      style={{
        marginTop: 12,
        padding: "10px 15px",
        background: "#245c4a",
        color: "#fff",
        border: "none",
        borderRadius: 8,
        cursor: "pointer",
        fontWeight: 600,
      }}
    >
      View / Download CV
    </button>
  )}
</div>


            <Info
              label="Source"
              value={candidate.source}
            />
          </div>
        </section>

<section style={cardStyle}>
  <h2 style={{
    fontFamily: "Georgia, serif",
    marginTop: 0,
    color: "#245c4a"
  }}>
    AI Candidate Profile
  </h2>

  <h3>Professional Summary</h3>
  <p style={{
    lineHeight: 1.8,
    color: "#444"
  }}>
    {candidate.professional_summary ||
      "No AI summary available yet."}
  </p>

  <h3>Skills & Expertise</h3>
  <div style={{
    padding: 16,
    background: "#f7f7f5",
    borderRadius: 10,
    lineHeight: 1.8
  }}>
    {candidate.skills ||
      "No skills available yet."}
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
