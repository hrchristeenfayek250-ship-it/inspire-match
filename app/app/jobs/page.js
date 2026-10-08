"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const initialForm = {
  title: "",
  department: "",
  location: "",
  work_type: "On-site",
  employment_type: "Full-time",
  salary_proposed: "",
  years_of_experience: "",
  hiring_manager: "",
  openings: "1",
  priority: "Medium",
  deadline: "",
  required_skills: "",
  nice_to_have_requirements: "",
  responsibilities: "",
  requirements: "",
  benefits: "",
  description: "",
};

export default function JobsPage() {
  const [jobs, setJobs] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
  loadJobs();
}, []);

async function loadJobs() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    setJobs([]);
    setLoading(false);
    return;
  }

  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Could not load jobs:", error);
  } else {
    setJobs(data || []);
  }

  setLoading(false);
}
    

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function createJob(e) {
    e.preventDefault();

    if (!form.title.trim()) {
      alert("Please enter the Job Name.");
      return;
    }

    if (!form.description.trim()) {
      alert("Please enter the Full Job Description.");
      return;
    }

    setSaving(true);

    const { data, error } = await supabase
      .from("jobs")
      .insert([
        {
          user_id: (await supabase.auth.getUser()).data.user.id,
          title: form.title.trim(),
          department: form.department.trim() || null,
          location: form.location.trim() || null,
          work_type: form.work_type || null,
          employment_type: form.employment_type || null,
          salary_proposed: form.salary_proposed.trim() || null,
          years_of_experience:
            form.years_of_experience.trim() || null,
          hiring_manager: form.hiring_manager.trim() || null,
          openings: Number(form.openings) || 1,
          priority: form.priority || "Medium",
          deadline: form.deadline || null,
          required_skills: form.required_skills.trim() || null,
          nice_to_have_requirements:
            form.nice_to_have_requirements.trim() || null,
          responsibilities:
            form.responsibilities.trim() || null,
          requirements: form.requirements.trim() || null,
          benefits: form.benefits.trim() || null,
          description: form.description.trim(),
          status: "Active",
        },
      ])
      .select()
      .single();

    if (error) {
      console.error(error);
      alert(`Could not create job: ${error.message}`);
      setSaving(false);
      return;
    }

    setJobs((current) => [data, ...current]);
    setForm(initialForm);
    setSaving(false);
  }

  async function changeStatus(id, status) {
    const { error } = await supabase
      .from("jobs")
      .update({ status })
      .eq("id", id);

    if (error) {
      alert(`Could not update job: ${error.message}`);
      return;
    }

    setJobs((current) =>
      current.map((job) =>
        job.id === id ? { ...job, status } : job
      )
    );
  }

  const inputStyle = {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px 14px",
    borderRadius: 9,
    border: "1px solid #ddd",
    background: "#fff",
    fontSize: 14,
  };

  const labelStyle = {
    display: "block",
    marginBottom: 7,
    fontWeight: 600,
    fontSize: 14,
    color: "#333",
  };

  const fieldStyle = {
    marginBottom: 18,
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "40px 24px",
        background: "#faf9f6",
        fontFamily: "Arial, sans-serif",
        color: "#222",
      }}
    >
      <div style={{ maxWidth: 1150, margin: "0 auto" }}>
        {/* HEADER */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 30,
            gap: 20,
          }}
        >
          <div>
            <p
              style={{
                margin: "0 0 6px",
                color: "#777",
                fontSize: 13,
                textTransform: "uppercase",
                letterSpacing: 1.5,
              }}
            >
              Inspire Match
            </p>

            <h1 style={{ margin: 0 }}>
              Job Management
            </h1>

            <p
              style={{
                color: "#666",
                marginBottom: 0,
              }}
            >
              Create and manage your recruitment jobs.
            </p>
          </div>

          <Link
            href="/app/dashboard"
            style={{
              textDecoration: "none",
              padding: "10px 18px",
              borderRadius: 8,
              border: "1px solid #ddd",
              color: "#222",
              background: "#fff",
            }}
          >
            ← Dashboard
          </Link>
        </div>

        {/* CREATE JOB */}
        <section
          style={{
            background: "#fff",
            borderRadius: 18,
            padding: 28,
            marginBottom: 35,
            border: "1px solid #eee",
          }}
        >
          <h2
            style={{
              marginTop: 0,
              marginBottom: 8,
            }}
          >
            Create New Job
          </h2>

          <p
            style={{
              color: "#777",
              marginTop: 0,
              marginBottom: 25,
            }}
          >
            Add all important information for the position.
          </p>

          <form onSubmit={createJob}>

            {/* BASIC INFORMATION */}
            <h3 style={{ marginBottom: 18 }}>
              Basic Information
            </h3>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(260px, 1fr))",
                gap: "0 18px",
              }}
            >
              <div style={fieldStyle}>
                <label style={labelStyle}>
                  Job Name *
                </label>

                <input
                  value={form.title}
                  onChange={(e) =>
                    updateField("title", e.target.value)
                  }
                  placeholder="e.g. Senior Recruitment Specialist"
                  style={inputStyle}
                />
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>
                  Department
                </label>

                <input
                  value={form.department}
                  onChange={(e) =>
                    updateField(
                      "department",
                      e.target.value
                    )
                  }
                  placeholder="e.g. Human Resources"
                  style={inputStyle}
                />
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>
                  Location
                </label>

                <input
                  value={form.location}
                  onChange={(e) =>
                    updateField(
                      "location",
                      e.target.value
                    )
                  }
                  placeholder="e.g. Cairo, Egypt"
                  style={inputStyle}
                />
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>
                  Work Type
                </label>

                <select
                  value={form.work_type}
                  onChange={(e) =>
                    updateField(
                      "work_type",
                      e.target.value
                    )
                  }
                  style={inputStyle}
                >
                  <option>On-site</option>
                  <option>Hybrid</option>
                  <option>Remote</option>
                </select>
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>
                  Employment Type
                </label>

                <select
                  value={form.employment_type}
                  onChange={(e) =>
                    updateField(
                      "employment_type",
                      e.target.value
                    )
                  }
                  style={inputStyle}
                >
                  <option>Full-time</option>
                  <option>Part-time</option>
                  <option>Contract</option>
                  <option>Freelance</option>
                  <option>Internship</option>
                </select>
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>
                  Number of Openings
                </label>

                <input
                  type="number"
                  min="1"
                  value={form.openings}
                  onChange={(e) =>
                    updateField(
                      "openings",
                      e.target.value
                    )
                  }
                  style={inputStyle}
                />
              </div>
            </div>

            {/* COMPENSATION & HIRING */}
            <h3
              style={{
                marginTop: 15,
                marginBottom: 18,
              }}
            >
              Compensation & Hiring
            </h3>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(260px, 1fr))",
                gap: "0 18px",
              }}
            >
              <div style={fieldStyle}>
                <label style={labelStyle}>
                  Salary Proposed
                </label>

                <input
                  value={form.salary_proposed}
                  onChange={(e) =>
                    updateField(
                      "salary_proposed",
                      e.target.value
                    )
                  }
                  placeholder="e.g. 30,000 - 40,000 EGP"
                  style={inputStyle}
                />
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>
                  Years of Experience
                </label>

                <input
                  value={form.years_of_experience}
                  onChange={(e) =>
                    updateField(
                      "years_of_experience",
                      e.target.value
                    )
                  }
                  placeholder="e.g. 5+ years"
                  style={inputStyle}
                />
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>
                  Hiring Manager
                </label>

                <input
                  value={form.hiring_manager}
                  onChange={(e) =>
                    updateField(
                      "hiring_manager",
                      e.target.value
                    )
                  }
                  placeholder="e.g. Ahmed Mohamed"
                  style={inputStyle}
                />
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>
                  Priority
                </label>

                <select
                  value={form.priority}
                  onChange={(e) =>
                    updateField(
                      "priority",
                      e.target.value
                    )
                  }
                  style={inputStyle}
                >
                  <option>High</option>
                  <option>Medium</option>
                  <option>Low</option>
                </select>
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>
                  Hiring Deadline
                </label>

                <input
                  type="date"
                  value={form.deadline}
                  onChange={(e) =>
                    updateField(
                      "deadline",
                      e.target.value
                    )
                  }
                  style={inputStyle}
                />
              </div>
            </div>

            {/* SKILLS */}
            <h3
              style={{
                marginTop: 15,
                marginBottom: 18,
              }}
            >
              Skills & Qualifications
            </h3>

            <div style={fieldStyle}>
              <label style={labelStyle}>
                Required Skills
              </label>

              <textarea
                value={form.required_skills}
                onChange={(e) =>
                  updateField(
                    "required_skills",
                    e.target.value
                  )
                }
                placeholder="e.g. Recruitment, LinkedIn Recruiter, ATS, Talent Acquisition..."
                rows={4}
                style={{
                  ...inputStyle,
                  resize: "vertical",
                }}
              />
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>
                Nice-to-Have Skills
              </label>

              <textarea
                value={form.nice_to_have_requirements}
                onChange={(e) =>
                  updateField(
                    "nice_to_have_requirements",
                    e.target.value
                  )
                }
                placeholder="Additional skills or qualifications that would be a plus..."
                rows={4}
                style={{
                  ...inputStyle,
                  resize: "vertical",
                }}
              />
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>
                Candidate Requirements
              </label>

              <textarea
                value={form.requirements}
                onChange={(e) =>
                  updateField(
                    "requirements",
                    e.target.value
                  )
                }
                placeholder="Education, certifications, competencies, experience..."
                rows={5}
                style={{
                  ...inputStyle,
                  resize: "vertical",
                }}
              />
            </div>

            {/* RESPONSIBILITIES */}
            <h3
              style={{
                marginTop: 15,
                marginBottom: 18,
              }}
            >
              Role Details
            </h3>

            <div style={fieldStyle}>
              <label style={labelStyle}>
                Key Responsibilities
              </label>

              <textarea
                value={form.responsibilities}
                onChange={(e) =>
                  updateField(
                    "responsibilities",
                    e.target.value
                  )
                }
                placeholder="Add the main responsibilities of this position..."
                rows={6}
                style={{
                  ...inputStyle,
                  resize: "vertical",
                }}
              />
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>
                Benefits & Perks
              </label>

              <textarea
                value={form.benefits}
                onChange={(e) =>
                  updateField(
                    "benefits",
                    e.target.value
                  )
                }
                placeholder="Medical insurance, bonuses, flexible work, annual leave..."
                rows={4}
                style={{
                  ...inputStyle,
                  resize: "vertical",
                }}
              />
            </div>

            {/* DESCRIPTION */}
            <h3
              style={{
                marginTop: 15,
                marginBottom: 18,
              }}
            >
              Job Description
            </h3>

            <div style={fieldStyle}>
              <label style={labelStyle}>
                Full Job Description *
              </label>

              <textarea
                value={form.description}
                onChange={(e) =>
                  updateField(
                    "description",
                    e.target.value
                  )
                }
                placeholder="Write the complete job description here..."
                rows={9}
                style={{
                  ...inputStyle,
                  resize: "vertical",
                }}
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              style={{
                padding: "14px 28px",
                borderRadius: 9,
                border: "none",
                background: "#1f2937",
                color: "#fff",
                cursor: saving
                  ? "not-allowed"
                  : "pointer",
                opacity: saving ? 0.7 : 1,
                fontWeight: 600,
                fontSize: 15,
              }}
            >
              {saving
                ? "Creating Job..."
                : "Create Job"}
            </button>
          </form>
        </section>

        {/* SAVED JOBS */}
        <section>
          <h2>Active & Saved Jobs</h2>

          {loading ? (
            <p>Loading jobs...</p>
          ) : jobs.length === 0 ? (
            <div
              style={{
                background: "#fff",
                padding: 30,
                borderRadius: 14,
                border: "1px solid #eee",
              }}
            >
              <p
                style={{
                  margin: 0,
                  color: "#777",
                }}
              >
                No jobs created yet.
              </p>
            </div>
          ) : (
            jobs.map((job) => (
              <article
                key={job.id}
                style={{
                  background: "#fff",
                  borderRadius: 14,
                  padding: 22,
                  marginBottom: 14,
                  border: "1px solid #eee",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    gap: 20,
                    alignItems: "flex-start",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <h3
                      style={{
                        margin: "0 0 10px",
                      }}
                    >
                      {job.title}
                    </h3>

                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 10,
                        marginBottom: 12,
                        fontSize: 13,
                        color: "#666",
                      }}
                    >
                      {job.department && (
                        <span>
                          🏢 {job.department}
                        </span>
                      )}

                      {job.location && (
                        <span>
                          📍 {job.location}
                        </span>
                      )}

                      {job.work_type && (
                        <span>
                          • {job.work_type}
                        </span>
                      )}

                      {job.years_of_experience && (
                        <span>
                          • {job.years_of_experience}
                        </span>
                      )}

                      {job.hiring_manager && (
                        <span>
                          • HM: {job.hiring_manager}
                        </span>
                      )}
                    </div>

                    <p
                      style={{
                        color: "#666",
                        lineHeight: 1.6,
                        whiteSpace: "pre-wrap",
                        margin: 0,
                      }}
                    >
                      {job.description}
                    </p>
                  </div>

                  <select
                    value={
                      job.status || "Active"
                    }
                    onChange={(e) =>
                      changeStatus(
                        job.id,
                        e.target.value
                      )
                    }
                    style={{
                      padding: 9,
                      borderRadius: 8,
                      border: "1px solid #ddd",
                      background: "#fff",
                    }}
                  >
                    <option value="Active">
                      Active
                    </option>
                    <option value="Paused">
                      Paused
                    </option>
                    <option value="Closed">
                      Closed
                    </option>
                  </select>
                </div>
              </article>
            ))
          )}
        </section>
      </div>
    </main>
  );
}
