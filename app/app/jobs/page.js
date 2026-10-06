"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function JobsPage() {
  const [jobs, setJobs] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadJobs();
  }, []);

  async function loadJobs() {
    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Could not load jobs:", error);
    } else {
      setJobs(data || []);
    }

    setLoading(false);
  }

  async function createJob(e) {
    e.preventDefault();

    if (!title.trim() || !description.trim()) {
      alert("Please enter the job title and description.");
      return;
    }

    setSaving(true);

    const { data, error } = await supabase
      .from("jobs")
      .insert([
        {
          title: title.trim(),
          description: description.trim(),
          status: "Active",
        },
      ])
      .select()
      .single();

    if (error) {
      alert(`Could not create job: ${error.message}`);
      setSaving(false);
      return;
    }

    setJobs((current) => [data, ...current]);
    setTitle("");
    setDescription("");
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

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "40px 24px",
        background: "#faf9f6",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 30,
          }}
        >
          <div>
            <p
              style={{
                margin: "0 0 6px",
                color: "#777",
                fontSize: 13,
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              Inspire Match
            </p>

            <h1 style={{ margin: 0 }}>Job Management</h1>

            <p style={{ color: "#666" }}>
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

        <section
          style={{
            background: "#fff",
            borderRadius: 16,
            padding: 24,
            marginBottom: 30,
            border: "1px solid #eee",
          }}
        >
          <h2 style={{ marginTop: 0 }}>Create New Job</h2>

          <form onSubmit={createJob}>
            <label
              style={{
                display: "block",
                marginBottom: 8,
                fontWeight: 600,
              }}
            >
              Job Title
            </label>

            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Senior Recruitment Specialist"
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: 12,
                borderRadius: 8,
                border: "1px solid #ddd",
                marginBottom: 18,
              }}
            />

            <label
              style={{
                display: "block",
                marginBottom: 8,
                fontWeight: 600,
              }}
            >
              Job Description
            </label>

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Paste the full job description here..."
              rows={8}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: 12,
                borderRadius: 8,
                border: "1px solid #ddd",
                resize: "vertical",
                marginBottom: 18,
              }}
            />

            <button
              type="submit"
              disabled={saving}
              style={{
                padding: "11px 22px",
                borderRadius: 8,
                border: "none",
                background: "#1f2937",
                color: "#fff",
                cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? "Saving..." : "Create Job"}
            </button>
          </form>
        </section>

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
              <p style={{ margin: 0, color: "#777" }}>
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
                    justifyContent: "space-between",
                    gap: 20,
                    alignItems: "flex-start",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: "0 0 8px" }}>
                      {job.title}
                    </h3>

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
                    value={job.status || "Active"}
                    onChange={(e) =>
                      changeStatus(job.id, e.target.value)
                    }
                    style={{
                      padding: 9,
                      borderRadius: 8,
                      border: "1px solid #ddd",
                      background: "#fff",
                    }}
                  >
                    <option value="Active">Active</option>
                    <option value="Paused">Paused</option>
                    <option value="Closed">Closed</option>
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
