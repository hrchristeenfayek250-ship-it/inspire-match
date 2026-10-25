
"use client";

import { useState } from "react";
import Link from "next/link";
import ATSNavigation from "@/components/ATSNavigation";

const initialForm = {
  candidate: "",
  job: "",
  interviewer: "",
  date: "",
  time: "",
  duration: "30",
  type: "Technical Interview",
};

export default function InterviewsPage() {
  const [form, setForm] = useState(initialForm);

  function updateField(field, value) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f6f9f7" }}>
      <ATSNavigation />

      <main
        style={{
          maxWidth: 1150,
          margin: "0 auto",
          padding: "35px 22px",
          fontFamily: "Arial, sans-serif",
          color: "#183e32",
        }}
      >
        <Link
          href="/app/dashboard"
          style={{ color: "#315f50", textDecoration: "none" }}
        >
          ← Dashboard
        </Link>

        <h1 style={{ fontSize: 30, marginBottom: 8 }}>
          Interview Management
        </h1>

        <p style={{ color: "#64748b", marginBottom: 28 }}>
          Schedule interviews, coordinate hiring teams, and
          manage candidate evaluations.
        </p>

        <section
          style={{
            background: "#ffffff",
            padding: 28,
            borderRadius: 18,
            border: "1px solid #e2e8e5",
            boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
          }}
        >
          <h2 style={{ fontSize: 21, marginTop: 0 }}>
            Schedule New Interview
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 18,
            }}
          >
            {[
              ["candidate", "Candidate Name", "text"],
              ["job", "Job Title", "text"],
              ["interviewer", "Hiring Manager / Interviewer", "text"],
              ["date", "Interview Date", "date"],
              ["time", "Interview Time", "time"],
              ["duration", "Duration (Minutes)", "number"],
            ].map(([field, label, type]) => (
              <label
                key={field}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {label}
                <input
                  type={type}
                  value={form[field]}
                  onChange={(event) =>
                    updateField(field, event.target.value)
                  }
                  style={{
                    padding: 12,
                    border: "1px solid #d9e3dd",
                    borderRadius: 9,
                    fontSize: 14,
                  }}
                />
              </label>
            ))}

            <label
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              Interview Type
              <select
                value={form.type}
                onChange={(event) =>
                  updateField("type", event.target.value)
                }
                style={{
                  padding: 12,
                  border: "1px solid #d9e3dd",
                  borderRadius: 9,
                }}
              >
                <option>HR Interview</option>
                <option>Technical Interview</option>
                <option>Final Interview</option>
                <option>Manager Interview</option>
              </select>
            </label>
          </div>

          <div
            style={{
              marginTop: 25,
              padding: 16,
              background: "#edf5f0",
              borderRadius: 10,
              color: "#315f50",
              fontSize: 14,
            }}
          >
            Google Calendar and Google Meet integration
            will be connected in the next development step.
          </div>

          <button
            type="button"
            disabled
            style={{
              marginTop: 22,
              padding: "13px 24px",
              background: "#94a89e",
              color: "#fff",
              border: 0,
              borderRadius: 10,
              fontWeight: 700,
              cursor: "not-allowed",
            }}
          >
            Schedule Interview — Coming Soon
          </button>
        </section>
      </main>
    </div>
  );
}
