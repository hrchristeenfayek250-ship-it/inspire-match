
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const EMPTY = {
  name: "",
  email: "",
  phone: "",
  currentTitle: "",
  yearsExperience: "",
  location: "",
  linkedinUrl: "",
  skills: "",
  summary: "",
};

const fields = [
  ["name", "Full Name"],
  ["email", "Email"],
  ["phone", "Phone Number"],
  ["currentTitle", "Current Job Title"],
  ["yearsExperience", "Years of Experience"],
  ["location", "Location"],
  ["linkedinUrl", "LinkedIn URL"],
  ["skills", "Skills"],
];

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "12px 14px",
  border: "1px solid #dce6df",
  borderRadius: 10,
  fontSize: 14,
  marginTop: 7,
  background: "#fff",
};

const buttonStyle = {
  padding: "13px 20px",
  border: 0,
  borderRadius: 11,
  background: "#245c4a",
  color: "white",
  fontWeight: 700,
  cursor: "pointer",
};

export default function UploadCandidatePage() {
  const router = useRouter();
  const [file, setFile] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [parsed, setParsed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [consent, setConsent] = useState(false);
  
  const [parsedDetails, setParsedDetails] = useState({
    workExperience: [],
    education: [],
    certifications: [],
    projects: [],
    achievements: [],
  });


  
  /* AI CANDIDATE PROFILE COMPLETENESS */

  const profileCompleteness = (() => {
    const profileFields = [
      { key: "name", label: "Full Name", weight: 15 },
      { key: "email", label: "Email Address", weight: 15 },
      { key: "phone", label: "Phone Number", weight: 10 },
      { key: "currentTitle", label: "Current Job Title", weight: 10 },
      { key: "yearsExperience", label: "Years of Experience", weight: 10 },
      { key: "location", label: "Location", weight: 10 },
      { key: "linkedinUrl", label: "LinkedIn Profile", weight: 5 },
      { key: "skills", label: "Professional Skills", weight: 15 },
      { key: "summary", label: "Professional Summary", weight: 10 },
    ];

    const missingFields = profileFields.filter((field) => {
      const value = form[field.key];

      if (value === null || value === undefined) {
        return true;
      }

      return String(value).trim() === "";
    });

    const score = profileFields
      .filter(
        (field) =>
          !missingFields.some(
            (missing) => missing.key === field.key
          )
      )
      .reduce((total, field) => total + field.weight, 0);

    const status =
      score >= 90
        ? "Excellent"
        : score >= 70
        ? "Good"
        : score >= 50
        ? "Needs Improvement"
        : "Incomplete";

    return {
      score,
      status,
      missingFields,
      completedFields:
        profileFields.length - missingFields.length,
      totalFields: profileFields.length,
    };
  })();

  function updateField(key, value) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }


  async function parseCV() {
    if (!file || busy) return;

    setError("");

    if (!/\.(pdf|docx|txt)$/i.test(file.name)) {
      setError("Upload a PDF, DOCX or TXT file.");
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      setError("Maximum CV file size is 4 MB.");
      return;
    }

    setBusy(true);

    try {
      const { data, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError || !data.session) {
        throw new Error("Please log in again.");
      }

      const body = new FormData();
      body.append("cv", file);

      const response = await fetch("/api/parse-cv", {
        method: "POST",
        headers: {
          Authorization:
            `Bearer ${data.session.access_token}`,
        },
        body,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Could not analyze CV."
        );
      }

      const candidate = result.candidate || {};
      
      setParsedDetails({
        workExperience: Array.isArray(candidate.workExperience)
          ? candidate.workExperience
          : [],
        education: Array.isArray(candidate.education)
          ? candidate.education
          : [],
        certifications: Array.isArray(candidate.certifications)
          ? candidate.certifications
          : [],
        projects: Array.isArray(candidate.projects)
          ? candidate.projects
          : [],
        achievements: Array.isArray(candidate.achievements)
          ? candidate.achievements
          : [],
      });


      setForm({
        name: candidate.name || "",
        email: candidate.email || "",
        phone: candidate.phone || "",
        currentTitle: candidate.currentTitle || "",
        yearsExperience:
          candidate.yearsExperience ?? "",
        location: candidate.location || "",
        linkedinUrl: candidate.linkedinUrl || "",
        skills: Array.isArray(candidate.skills)
          ? candidate.skills.join(", ")
          : candidate.skills || "",
        summary: candidate.summary || "",
      });

      setParsed(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveCandidate() {
    if (busy || !parsed) return;

    setError("");

    if (!String(form.name).trim()) {
      setError("Candidate name is required.");
      return;
    }

    if (!consent) {
      setError(
        "Confirm authorization to process this CV."
      );
      return;
    }

    const experience = String(
      form.yearsExperience
    ).trim();

    if (
      experience !== "" &&
      (!Number.isFinite(Number(experience)) ||
        Number(experience) < 0)
    ) {
      setError("Enter valid years of experience.");
      return;
    }

    setBusy(true);

    try {
      const { data: auth, error: authError } =
        await supabase.auth.getUser();

      if (authError || !auth.user) {
        throw new Error("Please log in again.");
      }

      const { data: memberships, error: memberError } =
        await supabase
          .from("company_members")
          .select("company_id")
          .eq("user_id", auth.user.id)
          .limit(2);

      if (
        memberError ||
        memberships?.length !== 1
      ) {
        throw new Error(
          "A single company membership is required."
        );
      }
const companyId = memberships[0].company_id;

const safeFileName = file.name.replace(
  /[^a-zA-Z0-9._-]/g,
  "_"
);


const filePath =
  `${companyId}/${auth.user.id}/${crypto.randomUUID()}-${safeFileName}`;


const { error: uploadError } = await supabase.storage
  .from("candidate-cvs")
  .upload(filePath, file, {
    upsert: false,
    contentType: file.type || "application/octet-stream",
  });

if (uploadError) {
  throw new Error(`CV upload failed: ${uploadError.message}`);
}
      const { error: saveError } = await supabase
        .from("candidates")
        .insert({
          user_id: auth.user.id,
          company_id: memberships[0].company_id,
          full_name: form.name.trim(),
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          current_title:
            form.currentTitle.trim() || null,
          years_experience:
            experience === ""
              ? null
              : Number(experience),
          location: form.location.trim() || null,
          linkedin_url:
            form.linkedinUrl.trim() || null,
          skills: form.skills.trim() || null,
          
          professional_summary:
            form.summary.trim() || null,

          work_experience: parsedDetails.workExperience,
          education: parsedDetails.education,
          certifications: parsedDetails.certifications,
          projects: parsedDetails.projects,
          achievements: parsedDetails.achievements,

          cv_file_name: file.name,

          
cv_file_url: filePath,

          status: "Applied",
          source: "AI CV Upload",
          consent_confirmed: true,
        });

     
if (saveError) {
  const { error: cleanupError } = await supabase.storage
    .from("candidate-cvs")
    .remove([filePath]);

  if (cleanupError) {
    throw new Error(
      `Candidate save failed: ${saveError.message}. CV cleanup also failed: ${cleanupError.message}`
    );
  }

  throw saveError;
}


      router.push("/app/candidates");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#faf9f6",
        color: "#1e3b32",
        padding: "40px 20px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ maxWidth: 850, margin: "auto" }}>
        <Link
          href="/app/candidates"
          style={{
            color: "#245c4a",
            textDecoration: "none",
          }}
        >
          ← Candidate Database
        </Link>

        <p
          style={{
            marginTop: 30,
            letterSpacing: 2,
            fontSize: 12,
          }}
        >
          INSPIRE MATCH
        </p>

        <h1
          style={{
            fontFamily: "Georgia, serif",
            fontSize: 36,
          }}
        >
          AI CV Auto Parsing
        </h1>

        
        <p style={{ color: "#68766e", lineHeight: 1.7 }}>
          Upload a PDF, DOCX or TXT CV. AI will extract
          candidate details for your review before saving.
        </p>

        <section style={{
          background: "#fff",
          padding: 28,
          borderRadius: 18,
          border: "1px solid #dce6df",
          marginTop: 25,
        }}>
          <h2>1. Upload Candidate CV</h2>

          <input
            type="file"
            accept=".pdf,.docx,.txt"
            disabled={busy}
            style={inputStyle}
            onChange={(event) => {
              setFile(event.target.files?.[0] || null);
              setParsed(false);
              setForm(EMPTY);
              setConsent(false);
              setError("");
            }}
          />

          <p style={{ fontSize: 12, color: "#777" }}>
            Supported formats: PDF, DOCX, TXT. Maximum 4 MB.
          </p>

          <button
            type="button"
            onClick={parseCV}
            disabled={!file || busy}
            style={{
              ...buttonStyle,
              opacity: !file || busy ? 0.5 : 1,
              marginTop: 12,
            }}
          >
            {busy && !parsed
              ? "Analyzing CV..."
              : "✨ Analyze CV with AI"}
          </button>

          {error && (
            <p role="alert" style={{ color: "#b42318" }}>
              {error}
            </p>
          )}
        </section>

        {parsed && (
          <section style={{
            background: "#fff",
            padding: 28,
            borderRadius: 18,
            border: "1px solid #dce6df",
            marginTop: 22,
          }}>
            
            <h2>2. Review AI-Extracted Profile</h2>

            <p style={{ color: "#68766e" }}>
              Please verify and correct the extracted
              information before saving.
            </p>

            {/* CANDIDATE PROFILE COMPLETENESS DASHBOARD */}
            <div style={{
              padding: 22,
              marginTop: 22,
              marginBottom: 24,
              background: "#f3f9f5",
              border: "1px solid #d8e9df",
              borderRadius: 16,
            }}>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 12,
              }}>
                <div>
                  <div style={{
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: 1.5,
                    color: "#3b9470",
                  }}>
                    AI CANDIDATE INTELLIGENCE
                  </div>

                  <h3 style={{
                    margin: "8px 0 5px",
                    fontSize: 19,
                    color: "#173e32",
                  }}>
                    Profile Completeness
                  </h3>

                  <span style={{
                    fontSize: 12,
                    color: "#71877b",
                  }}>
                    {profileCompleteness.completedFields} of{" "}
                    {profileCompleteness.totalFields} fields completed
                  </span>
                </div>

                <div style={{ textAlign: "right" }}>
                  <strong style={{
                    fontSize: 36,
                    color:
                      profileCompleteness.score >= 90
                        ? "#267453"
                        : profileCompleteness.score >= 70
                        ? "#3b9470"
                        : "#b77928",
                  }}>
                    {profileCompleteness.score}%
                  </strong>

                  <div style={{
                    fontSize: 12,
                    fontWeight: 800,
                    color: "#627c6f",
                  }}>
                    {profileCompleteness.status}
                  </div>
                </div>
              </div>

              <div style={{
                height: 11,
                background: "#dceae1",
                borderRadius: 20,
                overflow: "hidden",
                marginTop: 20,
              }}>
                <div style={{
                  width: `${profileCompleteness.score}%`,
                  height: "100%",
                  borderRadius: 20,
                  background:
                    profileCompleteness.score >= 70
                      ? "#2c9368"
                      : "#d6a14d",
                  transition: "width 0.25s ease",
                }} />
              </div>

              {profileCompleteness.missingFields.length > 0 ? (
                <div style={{ marginTop: 20 }}>
                  <div style={{
                    fontSize: 12,
                    fontWeight: 800,
                    color: "#9a6728",
                    marginBottom: 10,
                  }}>
                    Missing Information
                  </div>

                  <div style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                  }}>
                    {profileCompleteness.missingFields.map(
                      (field) => (
                        <span key={field.key} style={{
                          padding: "7px 11px",
                          borderRadius: 20,
                          background: "#fff3df",
                          color: "#94611f",
                          fontSize: 11,
                          fontWeight: 700,
                        }}>
                          {field.label}
                        </span>
                      )
                    )}
                  </div>
                </div>
              ) : (
                <p style={{
                  marginTop: 16,
                  color: "#267453",
                  fontWeight: 700,
                  fontSize: 13,
                }}>
                  All profile fields are completed.
                </p>
              )}

              <p style={{
                margin: "18px 0 0",
                fontSize: 11,
                color: "#819388",
                lineHeight: 1.7,
              }}>
                Completeness measures filled profile fields,
                not candidate quality or job suitability.
                Verify AI-extracted information before saving.
              </p>
            </div>

            <div style={{

              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(230px, 1fr))",
              gap: 16,
              marginTop: 20,
            }}>
              {fields.map(([key, title]) => (
                <label
                  key={key}
                  style={{ fontSize: 13, fontWeight: 600 }}
                >
                  {title}
                  <input
                    style={inputStyle}
                    value={form[key]}
                    onChange={(event) =>
                      updateField(key, event.target.value)
                    }
                  />
                </label>
              ))}
            </div>

            <label style={{
              display: "block",
              marginTop: 20,
              fontSize: 13,
              fontWeight: 600,
            }}>
              AI Professional Summary
              <textarea
                style={{ ...inputStyle, minHeight: 110 }}
                value={form.summary}
                onChange={(event) =>
                  updateField("summary", event.target.value)
                }
              />
            </label>

            <label style={{
              display: "flex",
              gap: 10,
              marginTop: 22,
              alignItems: "flex-start",
              fontSize: 13,
            }}>
              <input
                type="checkbox"
                checked={consent}
                onChange={(event) =>
                  setConsent(event.target.checked)
                }
              />
              I confirm that I am authorized to process
              and store this candidate's information.
            </label>

            <button
              type="button"
              onClick={saveCandidate}
              disabled={busy || !consent}
              style={{
                ...buttonStyle,
                marginTop: 22,
                opacity: busy || !consent ? 0.5 : 1,
              }}
            >
              {busy
                ? "Saving Candidate..."
                : "Save Candidate to Database"}
            </button>

            {error && (
              <p role="alert" style={{ color: "#b42318" }}>
                {error}
              </p>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
