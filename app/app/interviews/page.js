
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import ATSNavigation from "@/components/ATSNavigation";

const initialForm = {
  application_id: "",
  scheduled_at: "",
  type: "Technical Interview",
  interviewer: "",
};

const inputStyle = {
  width: "100%",
  padding: "12px",
  border: "1px solid #d8e5de",
  borderRadius: 9,
  background: "#fff",
  color: "#183e32",
  boxSizing: "border-box",
};

export default function InterviewsPage() {
  const [form, setForm] = useState(initialForm);
  const [applications, setApplications] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [candidates, setCandidates] = useState({});
  const [jobs, setJobs] = useState({});
  const [companyId, setCompanyId] = useState(null);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  function updateField(field, value) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError) throw authError;
      if (!authData.user) {
        throw new Error("Please log in again.");
      }

      const uid = authData.user.id;
      setUserId(uid);

      const { data: memberships, error: membershipError } =
        await supabase
          .from("company_members")
          .select("company_id")
          .eq("user_id", uid)
          .limit(2);

      if (membershipError) throw membershipError;

      if (!memberships || memberships.length !== 1) {
        throw new Error(
          "Your account must belong to exactly one company."
        );
      }

      const cid = memberships[0].company_id;
      setCompanyId(cid);

      const [
        applicationsResult,
        interviewsResult,
        candidatesResult,
        jobsResult,
      ] = await Promise.all([
        supabase
          .from("applications")
          .select("id, candidate_id, job_id, stage")
          .eq("company_id", cid),

        supabase
          .from("interviews")
          .select("*")
          .eq("company_id", cid)
          .order("scheduled_at", { ascending: true }),

        supabase
          .from("candidates")
          .select("id, name")
          .eq("company_id", cid),

        supabase
          .from("jobs")
          .select("id, title")
          .eq("company_id", cid),
      ]);

      for (const result of [
        applicationsResult,
        interviewsResult,
        candidatesResult,
        jobsResult,
      ]) {
        if (result.error) throw result.error;
      }

      setApplications(applicationsResult.data || []);
      setInterviews(interviewsResult.data || []);

      setCandidates(
        Object.fromEntries(
          (candidatesResult.data || []).map((item) => [
            item.id,
            item.name,
          ])
        )
      );

      setJobs(
        Object.fromEntries(
          (jobsResult.data || []).map((item) => [
            item.id,
            item.title,
          ])
        )
      );
    } catch (err) {
      setError(err.message || "Unable to load interviews.");
    } finally {
      setLoading(false);
    }
  }

  async function scheduleInterview(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!companyId || !userId) {
      setError("Please reload the page and log in again.");
      return;
    }

    if (
      !form.application_id ||
      !form.scheduled_at ||
      !form.interviewer.trim()
    ) {
      setError("Please complete all required fields.");
      return;
    }

    const selectedApplication = applications.find(
      (item) => String(item.id) === form.application_id
    );

    if (!selectedApplication) {
      setError("Please select a valid application.");
      return;
    }

    const date = new Date(form.scheduled_at);

    if (Number.isNaN(date.getTime())) {
      setError("Invalid interview date.");
      return;
    }

    if (date.getTime() <= Date.now()) {
      setError("Please choose a future interview date.");
      return;
    }

    setSaving(true);

    try {
      const { error: insertError } = await supabase
        .from("interviews")
        .insert({
          application_id: selectedApplication.id,
          company_id: companyId,
          user_id: userId,
          scheduled_at: date.toISOString(),
          type: form.type,
          interviewer: form.interviewer.trim(),
          status: "scheduled",
        });

      if (insertError) throw insertError;

      setForm(initialForm);
      setSuccess("Interview scheduled successfully.");
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to schedule interview.");
    } finally {
      setSaving(false);
    }
  }

  function applicationLabel(application) {
    const candidate =
      candidates[application.candidate_id] ||
      `Candidate #${application.candidate_id}`;

    const job =
      jobs[application.job_id] ||
      `Job #${application.job_id}`;

    return `${candidate} — ${job}`;
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f6f9f7",
        color: "#183e32",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          padding: "14px 22px",
          background: "#fff",
          borderBottom: "1px solid #e4ebe7",
        }}
      >
        <ATSNavigation />
      </div>

      <main
        style={{
          maxWidth: 1150,
          margin: "0 auto",
          padding: "32px 20px",
        }}
      >
        <Link
          href="/app/dashboard"
          style={{ color: "#315f50" }}
        >
          ← Dashboard
        </Link>

        <h1 style={{ marginBottom: 8 }}>
          Interview Management
        </h1>

        <p style={{ color: "#64748b", marginBottom: 26 }}>
          Schedule interviews and manage your recruitment
          process.
        </p>

        {error && (
          <div
            role="alert"
            style={{
              padding: 14,
              background: "#fff0f0",
              color: "#a52a2a",
              borderRadius: 10,
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            style={{
              padding: 14,
              background: "#e6f4eb",
              color: "#216b45",
              borderRadius: 10,
              marginBottom: 16,
            }}
          >
            {success}
          </div>
        )}

        <section
          style={{
            background: "#fff",
            padding: 26,
            borderRadius: 16,
            border: "1px solid #e0e9e3",
            marginBottom: 25,
          }}
        >
          <h2>Schedule New Interview</h2>

          <form onSubmit={scheduleInterview}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(240px, 1fr))",
                gap: 18,
              }}
            >
              <label>
                Candidate / Job Application
                <select
                  required
                  style={inputStyle}
                  value={form.application_id}
                  onChange={(e) =>
                    updateField(
                      "application_id",
                      e.target.value
                    )
                  }
                >
                  <option value="">
                    Select application
                  </option>
                  {applications.map((application) => (
                    <option
                      key={application.id}
                      value={application.id}
                    >
                      {applicationLabel(application)}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Interview Date & Time
                <input
                  required
                  type="datetime-local"
                  style={inputStyle}
                  value={form.scheduled_at}
                  onChange={(e) =>
                    updateField(
                      "scheduled_at",
                      e.target.value
                    )
                  }
                />
              </label>

              <label>
                Hiring Manager / Interviewer
                <input
                  required
                  style={inputStyle}
                  value={form.interviewer}
                  onChange={(e) =>
                    updateField(
                      "interviewer",
                      e.target.value
                    )
                  }
                  placeholder="Interviewer name"
                />
              </label>

              <label>
                Interview Type
                <select
                  style={inputStyle}
                  value={form.type}
                  onChange={(e) =>
                    updateField("type", e.target.value)
                  }
                >
                  <option>HR Interview</option>
                  <option>Technical Interview</option>
                  <option>Manager Interview</option>
                  <option>Final Interview</option>
                </select>
              </label>
            </div>

            <button
              type="submit"
              disabled={
                saving ||
                loading ||
                !applications.length
              }
              style={{
                marginTop: 24,
                padding: "13px 24px",
                background: "#315f50",
                color: "#fff",
                border: 0,
                borderRadius: 10,
                fontWeight: 700,
                cursor: "pointer",
                opacity:
                  saving ||
                  loading ||
                  !applications.length
                    ? 0.55
                    : 1,
              }}
            >
              {saving
                ? "Saving..."
                : "Schedule Interview"}
            </button>

            {!loading && !applications.length && (
              <p style={{ color: "#64748b" }}>
                No applications available for scheduling.
              </p>
            )}
          </form>
        </section>

        <section
          style={{
            background: "#fff",
            padding: 26,
            borderRadius: 16,
            border: "1px solid #e0e9e3",
          }}
        >
          <h2>Scheduled Interviews</h2>

          {loading ? (
            <p>Loading interviews...</p>
          ) : interviews.length === 0 ? (
            <p style={{ color: "#64748b" }}>
              No interviews scheduled yet.
            </p>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {interviews.map((interview) => {
                const application = applications.find(
                  (item) =>
                    item.id === interview.application_id
                );

                return (
                  <div
                    key={interview.id}
                    style={{
                      padding: 18,
                      border: "1px solid #e2e8e5",
                      borderRadius: 12,
                    }}
                  >
                    <strong>
                      {application
                        ? applicationLabel(application)
                        : `Application #${interview.application_id}`}
                    </strong>

                    <p style={{ color: "#64748b" }}>
                      {interview.type} —{" "}
                      {interview.interviewer}
                    </p>

                    <p>
                      {new Date(
                        interview.scheduled_at
                      ).toLocaleString()}
                    </p>

                    <span
                      style={{
                        display: "inline-block",
                        background: "#e7f3eb",
                        padding: "6px 12px",
                        borderRadius: 20,
                        fontSize: 12,
                      }}
                    >
                      {interview.status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
