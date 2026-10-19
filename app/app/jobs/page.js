
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import ATSNavigation from "@/components/ATSNavigation";

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


const textFields = [
  {
    title: "Basic Information",
    fields: [
      ["title", "Job Name *", "text", "e.g. Senior Recruiter"],
      ["department", "Department", "text", "e.g. Human Resources"],
      ["location", "Location", "text", "e.g. Cairo, Egypt"],
      ["work_type", "Work Type", "select", ["On-site", "Hybrid", "Remote"]],
      ["employment_type", "Employment Type", "select", ["Full-time", "Part-time", "Contract", "Freelance", "Internship"]],
      ["openings", "Number of Openings", "number", "1"],
    ],
  },
  {
    title: "Compensation & Hiring",
    fields: [
      ["salary_proposed", "Salary Proposed", "text", "e.g. 30,000 - 40,000 EGP"],
      ["years_of_experience", "Years of Experience", "text", "e.g. 5+ years"],
      ["hiring_manager", "Hiring Manager", "text", "Hiring manager name"],
      ["priority", "Priority", "select", ["High", "Medium", "Low"]],
      ["deadline", "Hiring Deadline", "date", ""],
    ],
  },
];

const longFields = [
  ["required_skills", "Required Skills", "Skills, tools and technical competencies...", 3],
  ["nice_to_have_requirements", "Nice-to-Have Skills", "Additional qualifications...", 3],
  ["requirements", "Candidate Requirements", "Education, certifications and experience...", 4],
  ["responsibilities", "Key Responsibilities", "Main responsibilities of the position...", 4],
  ["benefits", "Benefits & Perks", "Insurance, bonuses, flexible work...", 3],
  ["description", "Full Job Description *", "Write the complete job description...", 7],
];

function Metric({ label, value, symbol, note }) {
  return (
    <div className="jm-metric">
      <div className="jm-metric-top">
        <span>{label}</span>
        <span className="jm-metric-icon">{symbol}</span>
      </div>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  );
}

function FormField({ field, form, updateField }) {
  const [key, label, type, extra] = field;

  return (
    <label className="jm-field">
      <span>{label}</span>

      {type === "select" ? (
        <select
          value={form[key]}
          onChange={(e) => updateField(key, e.target.value)}
          className="jm-control"
        >
          {extra.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          min={type === "number" ? "1" : undefined}
          required={key === "title"}
          value={form[key]}
          onChange={(e) => updateField(key, e.target.value)}
          placeholder={extra}
          className="jm-control"
        />
      )}
    </label>
  );
}

export default function JobsPage() {
  const [jobs, setJobs] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [form, setForm] = useState(initialForm);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingJobId, setUpdatingJobId] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    loadJobs();
  }, []);

  async function getCompanyScope() {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error("Please log in again.");
    }

    const { data: memberships, error: membershipError } =
      await supabase
        .from("company_members")
        .select("company_id")
        .eq("user_id", user.id)
        .limit(2);

    if (membershipError) throw membershipError;

    if (!memberships || memberships.length !== 1) {
      throw new Error("Could not verify your company.");
    }

    const companyId = memberships[0].company_id;

    const filter =
      `company_id.eq.${companyId},` +
      `and(company_id.is.null,user_id.eq.${user.id})`;

    return { user, companyId, filter };
  }

  async function loadJobs() {
    setLoading(true);
    setErrorMessage("");

    try {
      const { filter } = await getCompanyScope();

      const [jobResponse, candidateResponse] =
        await Promise.all([
          supabase
            .from("jobs")
            .select("*")
            .or(filter)
            .order("created_at", { ascending: false }),

          supabase
            .from("candidates")
            .select("id, job_id, full_name, status")
            .or(filter),
        ]);

      if (jobResponse.error) {
        throw jobResponse.error;
      }

      if (candidateResponse.error) {
        throw candidateResponse.error;
      }

      setJobs(jobResponse.data || []);
      setCandidates(candidateResponse.data || []);
    } catch (error) {
      console.error("Could not load jobs:", error);

      setJobs([]);
      setCandidates([]);
      setErrorMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  function updateField(key, value) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function createNewJob() {
    setForm({ ...initialForm });
    setShowForm(true);
    setErrorMessage("");
    setSuccessMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function editJob(job) {
    const nextForm = {};

    for (const key of Object.keys(initialForm)) {
      nextForm[key] =
        job[key] == null
          ? initialForm[key]
          : String(job[key]);
    }

    nextForm.deadline = nextForm.deadline
      ? nextForm.deadline.slice(0, 10)
      : "";

    setForm({
      ...nextForm,
      _editingId: job.id,
    });

    setShowForm(true);
    setErrorMessage("");
    setSuccessMessage("");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEditing() {
    setForm({ ...initialForm });
    setShowForm(false);
  }

  async function saveJob(e) {
    e.preventDefault();

    if (!form.title.trim()) {
      setErrorMessage("Please enter the Job Name.");
      return;
    }

    if (!form.description.trim()) {
      setErrorMessage("Please enter the Job Description.");
      return;
    }

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const { user, companyId, filter } =
        await getCompanyScope();

      const payload = {
        title: form.title.trim(),
        department: form.department.trim() || null,
        location: form.location.trim() || null,
        work_type: form.work_type || null,
        employment_type: form.employment_type || null,
        salary_proposed: form.salary_proposed.trim() || null,
        years_of_experience:
          form.years_of_experience.trim() || null,
        hiring_manager: form.hiring_manager.trim() || null,
        openings: Math.max(1, Number(form.openings) || 1),
        priority: form.priority || "Medium",
        deadline: form.deadline || null,
        required_skills: form.required_skills.trim() || null,
        nice_to_have_requirements:
          form.nice_to_have_requirements.trim() || null,
        responsibilities: form.responsibilities.trim() || null,
        requirements: form.requirements.trim() || null,
        benefits: form.benefits.trim() || null,
        description: form.description.trim(),
      };

      if (form._editingId) {
        const { data, error } = await supabase
          .from("jobs")
          .update(payload)
          .eq("id", form._editingId)
          .or(filter)
          .select()
          .single();

        if (error) throw error;

        setJobs((current) =>
          current.map((job) =>
            String(job.id) === String(data.id) ? data : job
          )
        );

        setSuccessMessage("Job updated successfully.");
      } else {
        const { data, error } = await supabase
          .from("jobs")
          .insert([
            {
              ...payload,
              user_id: user.id,
              company_id: companyId,
              status: "Active",
            },
          ])
          .select()
          .single();

        if (error) throw error;

        setJobs((current) => [data, ...current]);
        setSuccessMessage("New job created successfully.");
      }

      setForm({ ...initialForm });
      setShowForm(false);
    } catch (error) {
      setErrorMessage(`Could not save job: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(jobId, status) {
    setUpdatingJobId(jobId);
    setErrorMessage("");

    try {
      const { filter } = await getCompanyScope();

      const { data, error } = await supabase
        .from("jobs")
        .update({ status })
        .eq("id", jobId)
        .or(filter)
        .select("id, status")
        .single();

      if (error) throw error;

      setJobs((current) =>
        current.map((job) =>
          String(job.id) === String(data.id)
            ? { ...job, status: data.status }
            : job
        )
      );
    } catch (error) {
      setErrorMessage(
        `Could not update job status: ${error.message}`
      );
    } finally {
      setUpdatingJobId(null);
    }
  }

  const stats = useMemo(() => {
    return {
      total: jobs.length,
      active: jobs.filter(
        (job) => (job.status || "Active") === "Active"
      ).length,
      paused: jobs.filter(
        (job) => job.status === "Paused"
      ).length,
      closed: jobs.filter(
        (job) => job.status === "Closed"
      ).length,
    };
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    const query = search.trim().toLowerCase();

    return jobs.filter((job) => {
      const searchable = [
        job.title,
        job.department,
        job.location,
        job.hiring_manager,
        job.required_skills,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !query || searchable.includes(query);

      const matchesStatus =
        statusFilter === "All" ||
        (job.status || "Active") === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [jobs, search, statusFilter]);

  const candidatesByJob = useMemo(() => {
    const grouped = {};

    for (const candidate of candidates) {
      if (candidate.job_id == null) continue;

      const key = String(candidate.job_id);

      if (!grouped[key]) {
        grouped[key] = [];
      }

      grouped[key].push(candidate);
    }

    return grouped;
  }, [candidates]);

  async function logOut() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    window.location.href = "/app/login";
  }

  const sidebar = (
    <div className="jm-side-inner">
      <div className="jm-brand">
        <div className="jm-logo">I</div>

        <div>
          <strong>Inspire Match</strong>
          <small>TALENT INTELLIGENCE</small>
        </div>
      </div>

      <div className="jm-side-label">WORKSPACE</div>

    <ATSNavigation
  className="jm-navigation"
  linkClassName="jm-nav-item"
  onNavigate={() => setMobileNav(false)}
/>
      <div className="jm-side-footer">
        <Link href="/">↗ ATS Home</Link>

        <button onClick={logOut}>↪ Log out</button>

        <small>© Inspire Match ATS</small>
      </div>
    </div>
  );

  return (
    <main className="jm-root">
      <style>{`
        .jm-root {
          width: 100%;
          max-width: none;
          min-height: 100vh;
          margin: 0;
          padding: 0;
          background: #f6f8fb;
          color: #1e293b;
          font-family: Arial, sans-serif;
          font-size: 14px;
          line-height: 1.5;
        }

        .jm-root * {
          box-sizing: border-box;
        }

        .jm-root h1,
        .jm-root h2,
        .jm-root h3 {
          color: #1e293b;
          font-family: Arial, sans-serif;
        }

        .jm-shell {
          display: grid;
          grid-template-columns: 254px minmax(0, 1fr);
          min-height: 100vh;
        }

        .jm-sidebar {
          position: sticky;
          top: 0;
          height: 100vh;
          overflow-y: auto;
          background: white;
          border-right: 1px solid #e6eaf0;
          padding: 24px 15px;
        }

        .jm-side-inner {
          height: 100%;
          min-height: 600px;
          display: flex;
          flex-direction: column;
        }

        .jm-brand {
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 7px 12px 26px;
          border-bottom: 1px solid #edf0f2;
          margin-bottom: 25px;
        }

        .jm-logo {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          background: #284e42;
          color: white;
          display: grid;
          place-items: center;
          font-size: 23px;
          font-weight: 800;
        }

        .jm-brand strong {
          display: block;
          color: #1e293b;
          font-size: 17px;
          letter-spacing: -.5px;
        }

        .jm-brand small {
          display: block;
          color: #8795a4;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 1.4px;
          margin-top: 4px;
        }

        .jm-side-label {
          color: #9ba6b2;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1.5px;
          padding: 0 14px;
          margin-bottom: 10px;
        }

        .jm-navigation {
          display: grid;
          gap: 4px;
        }

        .jm-nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 13px 15px;
          border-radius: 10px;
          text-decoration: none;
          color: #657285;
          font-size: 13px;
          font-weight: 600;
          border-left: 3px solid transparent;
          white-space: nowrap;
        }

        .jm-nav-item span {
          width: 23px;
          text-align: center;
          font-size: 19px;
        }

        .jm-nav-item:hover {
          background: #f4f7f6;
        }

        .jm-nav-item.active {
          background: #eaf3ee;
          color: #245340;
          border-left-color: #315f50;
          font-weight: 800;
        }

        .jm-side-footer {
          margin-top: auto;
          display: grid;
          gap: 9px;
          padding-top: 30px;
        }

        .jm-side-footer a {
          color: #657285;
          padding: 12px 15px;
          text-decoration: none;
          font-size: 13px;
        }

        .jm-side-footer button {
          background: #f7f8fa;
          border: 1px solid #e6eaf0;
          color: #526073;
          border-radius: 10px;
          padding: 12px 15px;
          text-align: left;
          cursor: pointer;
          font-weight: 700;
        }

        .jm-side-footer small {
          color: #a1acb8;
          font-size: 10px;
          margin-top: 7px;
        }

        .jm-content {
          min-width: 0;
          padding: 29px clamp(17px, 3vw, 46px) 60px;
        }

        .jm-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 20px;
          margin-bottom: 29px;
        }

        .jm-breadcrumb {
          color: #8390a0;
          font-size: 12px;
          margin-bottom: 9px;
        }

        .jm-breadcrumb strong {
          color: #315f50;
        }

        .jm-title {
          font-size: clamp(29px, 3vw, 38px);
          font-weight: 800;
          letter-spacing: -1.1px;
          margin: 0;
        }

        .jm-subtitle {
          color: #8390a0;
          font-size: 13px;
          margin: 10px 0 0;
        }

        .jm-primary,
        .jm-secondary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border-radius: 10px;
          padding: 12px 17px;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
          text-decoration: none;
          white-space: nowrap;
        }

        .jm-primary {
          background: #284e42;
          color: white;
          border: 1px solid #284e42;
        }

        .jm-primary:hover {
          background: #1d3f34;
        }

        .jm-secondary {
          background: white;
          color: #526073;
          border: 1px solid #e1e6ed;
        }

        .jm-stats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 15px;
          margin-bottom: 25px;
        }

        .jm-metric,
        .jm-panel,
        .jm-job-card {
          background: white;
          border: 1px solid #e6eaf0;
          border-radius: 16px;
          box-shadow: 0 4px 18px rgba(23,35,50,.035);
        }

        .jm-metric {
          padding: 21px;
        }

        .jm-metric-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          color: #647182;
          font-size: 12px;
          font-weight: 700;
        }

        .jm-metric-icon {
          width: 38px;
          height: 38px;
          background: #edf4f0;
          color: #315f50;
          border-radius: 10px;
          display: grid;
          place-items: center;
          font-size: 20px;
        }

        .jm-metric strong {
          display: block;
          font-size: 32px;
          letter-spacing: -1px;
          color: #1e293b;
          margin-top: 11px;
        }

        .jm-metric small {
          display: block;
          color: #96a0ad;
          font-size: 11px;
          margin-top: 5px;
        }

        .jm-panel {
          padding: 25px;
          margin-bottom: 25px;
        }

        .jm-section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 15px;
          margin-bottom: 23px;
        }

        .jm-section-header h2 {
          font-size: 18px;
          font-weight: 800;
          margin: 0;
        }

        .jm-section-header p {
          color: #8994a3;
          font-size: 12px;
          margin: 7px 0 0;
        }

        .jm-form-section {
          padding-top: 22px;
          margin-top: 23px;
          border-top: 1px solid #edf0f3;
        }

        .jm-form-section:first-child {
          padding-top: 0;
          margin-top: 0;
          border-top: none;
        }

        .jm-form-section h3 {
          font-size: 15px;
          font-weight: 800;
          margin: 0 0 18px;
        }

        .jm-form-grid {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 16px;
        }

        .jm-field {
          display: block;
          min-width: 0;
        }

        .jm-field span {
          display: block;
          color: #526073;
          font-size: 12px;
          font-weight: 800;
          margin-bottom: 8px;
        }

        .jm-control {
          width: 100%;
          min-height: 44px;
          padding: 11px 12px;
          border: 1px solid #e1e6ed;
          background: white;
          color: #263445;
          border-radius: 9px;
          font-size: 13px;
          font-family: Arial, sans-serif;
          outline: none;
        }

        .jm-control:focus {
          border-color: #6e9a86;
          box-shadow: 0 0 0 3px #eaf3ee;
        }

        .jm-textarea {
          resize: vertical;
          line-height: 1.6;
        }

        .jm-long-fields {
          display: grid;
          gap: 18px;
        }

        .jm-form-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          align-items: center;
          margin-top: 25px;
          padding-top: 23px;
          border-top: 1px solid #edf0f3;
        }

        .jm-filters {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 19px;
        }

        .jm-search {
          flex: 1;
          min-width: 190px;
        }

        .jm-search,
        .jm-filter-select {
          padding: 12px 14px;
          background: white;
          border: 1px solid #e1e6ed;
          border-radius: 10px;
          color: #526073;
          font-size: 13px;
          outline: none;
        }

        .jm-job-list {
          display: grid;
          gap: 16px;
        }

        .jm-job-card {
          padding: 23px;
        }

        .jm-job-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 20px;
        }

        .jm-job-heading {
          flex: 1;
          min-width: 220px;
        }

        .jm-job-heading h3 {
          font-size: 19px;
          font-weight: 800;
          margin: 0 0 10px;
        }

        .jm-job-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 9px 16px;
          color: #8390a0;
          font-size: 12px;
          margin-top: 12px;
        }

        .jm-status {
          display: inline-flex;
          align-items: center;
          border-radius: 20px;
          padding: 6px 11px;
          font-size: 11px;
          font-weight: 800;
        }

        .jm-status-active {
          background: #e6f7ef;
          color: #16734d;
        }

        .jm-status-paused {
          background: #fff7e6;
          color: #a46a17;
        }

        .jm-status-closed {
          background: #f1f5f9;
          color: #64748b;
        }

        .jm-job-description {
          color: #647182;
          font-size: 13px;
          line-height: 1.8;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
          margin: 18px 0;
        }

        .jm-job-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 14px;
          margin-top: 18px;
          border-top: 1px solid #eef0f3;
          padding-top: 18px;
        }

        .jm-candidate-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 13px;
        }

        .jm-candidate-link {
          background: #f3f7f5;
          color: #315f50;
          border: 1px solid #e0ece5;
          border-radius: 8px;
          padding: 7px 11px;
          font-size: 11px;
          text-decoration: none;
        }

        .jm-job-actions {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 10px;
        }

        .jm-job-actions select {
          padding: 10px 12px;
          border-radius: 9px;
          background: #fff;
          border: 1px solid #e1e6ed;
          color: #526073;
          font-size: 12px;
        }

        .jm-alert {
          background: #fff7f3;
          border: 1px solid #e8c7b7;
          color: #a14e31;
          border-radius: 10px;
          padding: 14px 17px;
          margin-bottom: 20px;
          font-size: 13px;
        }

        .jm-success {
          background: #edf8f1;
          border: 1px solid #cde7d5;
          color: #276446;
          border-radius: 10px;
          padding: 14px 17px;
          margin-bottom: 20px;
          font-size: 13px;
        }

        .jm-empty {
          border: 1px dashed #ced8df;
          border-radius: 16px;
          background: white;
          text-align: center;
          padding: 50px 25px;
          color: #8994a3;
        }

        .jm-mobile-top {
          display: none;
        }

        @media (max-width: 1100px) {
          .jm-stats {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 800px) {
          .jm-shell {
            grid-template-columns: 1fr;
          }

          .jm-sidebar {
            display: none;
          }

          .jm-mobile-top {
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: white;
            padding: 15px 19px;
            border-bottom: 1px solid #e6eaf0;
          }

          .jm-mobile-menu {
            background: white;
            padding: 14px 18px;
            border-bottom: 1px solid #e6eaf0;
          }

          .jm-mobile-menu .jm-side-inner {
            min-height: auto;
          }

          .jm-content {
            padding: 24px 16px;
          }
        }

        @media (max-width: 540px) {
          .jm-stats {
            gap: 10px;
          }

          .jm-metric {
            padding: 16px;
          }

          .jm-metric strong {
            font-size: 27px;
          }

          .jm-form-grid {
            grid-template-columns: 1fr;
          }

          .jm-panel,
          .jm-job-card {
            padding: 18px;
          }

          .jm-title {
            font-size: 29px;
          }
        }
      `}</style>

      <div className="jm-shell">
        <aside className="jm-sidebar">
          {sidebar}
        </aside>

        <div style={{ minWidth: 0 }}>
          <div className="jm-mobile-top">
            <strong style={{ color: "#284e42" }}>
              ◈ Inspire Match
            </strong>

            <button
              onClick={() => setMobileNav((value) => !value)}
              style={{
                border: 0,
                borderRadius: 9,
                padding: "10px 14px",
                background: "#eaf3ee",
                color: "#284e42",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {mobileNav ? "Close ✕" : "☰ Menu"}
            </button>
          </div>

          {mobileNav && (
            <div className="jm-mobile-menu">
              {sidebar}
            </div>
          )}

          <div className="jm-content">
            {/* PAGE HEADER */}

            <header className="jm-header">
              <div>
                <div className="jm-breadcrumb">
                  Workspace
                  <span style={{ margin: "0 9px" }}>/</span>
                  <strong>Jobs</strong>
                </div>

                <h1 className="jm-title">
                  Job Management
                </h1>

                <p className="jm-subtitle">
                  Manage your recruitment opportunities,
                  hiring teams and active requisitions.
                </p>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  className="jm-secondary"
                  onClick={loadJobs}
                  disabled={loading}
                >
                  ↻ Refresh
                </button>

                <button
                  type="button"
                  className="jm-primary"
                  onClick={
                    showForm ? cancelEditing : createNewJob
                  }
                >
                  {showForm ? "✕ Close Form" : "＋ Create Job"}
                </button>
              </div>
            </header>

            {errorMessage && (
              <div role="alert" className="jm-alert">
                {errorMessage}
              </div>
            )}

            {successMessage && (
              <div role="status" className="jm-success">
                {successMessage}
              </div>
            )}

            {/* JOB ANALYTICS */}

            <div className="jm-stats">
              <Metric
                label="Total Jobs"
                value={loading ? "—" : stats.total}
                symbol="▣"
                note="All saved requisitions"
              />

              <Metric
                label="Active Jobs"
                value={loading ? "—" : stats.active}
                symbol="↗"
                note="Open hiring opportunities"
              />

              <Metric
                label="Paused Jobs"
                value={loading ? "—" : stats.paused}
                symbol="◷"
                note="Temporarily on hold"
              />

              <Metric
                label="Closed Jobs"
                value={loading ? "—" : stats.closed}
                symbol="✓"
                note="Closed requisitions"
              />
            </div>

            {/* CREATE / EDIT JOB FORM */}

            {showForm && (
              <section className="jm-panel">
                <div className="jm-section-header">
                  <div>
                    <h2>
                      {form._editingId
                        ? "Edit Job Requisition"
                        : "Create New Job"}
                    </h2>

                    <p>
                      Complete the position details and
                      hiring requirements.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="jm-secondary"
                    onClick={cancelEditing}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                </div>

                <form onSubmit={saveJob}>
                  {textFields.map((group) => (
                    <div
                      key={group.title}
                      className="jm-form-section"
                    >
                      <h3>{group.title}</h3>

                      <div className="jm-form-grid">
                        {group.fields.map((field) => (
                          <FormField
                            key={field[0]}
                            field={field}
                            form={form}
                            updateField={updateField}
                          />
                        ))}
                      </div>
                    </div>
                  ))}

                  <div className="jm-form-section">
                    <h3>Skills & Role Details</h3>

                    <div className="jm-long-fields">
                      {longFields.map(
                        ([key, label, placeholder, rows]) => (
                          <label
                            className="jm-field"
                            key={key}
                          >
                            <span>{label}</span>

                            <textarea
                              value={form[key]}
                              onChange={(e) =>
                                updateField(
                                  key,
                                  e.target.value
                                )
                              }
                              placeholder={placeholder}
                              rows={rows}
                              required={
                                key === "description"
                              }
                              className="jm-control jm-textarea"
                            />
                          </label>
                        )
                      )}
                    </div>
                  </div>

                  <div className="jm-form-actions">
                    <button
                      type="submit"
                      disabled={saving}
                      className="jm-primary"
                    >
                      {saving
                        ? "Saving..."
                        : form._editingId
                          ? "✓ Save Changes"
                          : "＋ Create Job"}
                    </button>

                    <button
                      type="button"
                      onClick={cancelEditing}
                      disabled={saving}
                      className="jm-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </section>
            )}

            {/* JOB DIRECTORY */}

            <section>
              <div className="jm-section-header">
                <div>
                  <h2>Job Directory</h2>

                  <p>
                    {loading
                      ? "Loading jobs..."
                      : `Showing ${filteredJobs.length} of ${jobs.length} jobs`}
                  </p>
                </div>
              </div>

              <div className="jm-filters">
                <input
                  className="jm-search"
                  placeholder="Search job title, skills, department..."
                  value={search}
                  onChange={(e) =>
                    setSearch(e.target.value)
                  }
                />

                <select
                  className="jm-filter-select"
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(e.target.value)
                  }
                >
                  <option value="All">
                    All Statuses
                  </option>
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

              {loading ? (
                <div className="jm-empty">
                  Loading your recruitment jobs...
                </div>
              ) : filteredJobs.length === 0 ? (
                <div className="jm-empty">
                  <h3
                    style={{
                      fontSize: 18,
                      margin: "0 0 8px",
                    }}
                  >
                    No Jobs Found
                  </h3>

                  <p style={{ margin: 0 }}>
                    {jobs.length === 0
                      ? "Create your first recruitment job to get started."
                      : "Try adjusting your search or status filter."}
                  </p>
                </div>
              ) : (
                <div className="jm-job-list">
                  {filteredJobs.map((job) => {
                    const status = job.status || "Active";

                    const linkedCandidates =
                      candidatesByJob[String(job.id)] || [];

                    const statusClass =
                      status === "Closed"
                        ? "jm-status-closed"
                        : status === "Paused"
                          ? "jm-status-paused"
                          : "jm-status-active";

                    return (
                      <article
                        key={job.id}
                        className="jm-job-card"
                      >
                        <div className="jm-job-top">
                          <div className="jm-job-heading">
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                flexWrap: "wrap",
                                gap: 12,
                              }}
                            >
                              <h3>{job.title}</h3>

                              <span
                                className={`jm-status ${statusClass}`}
                              >
                                {status}
                              </span>
                            </div>

                            <div className="jm-job-meta">
                              {job.department && (
                                <span>
                                  ▣ {job.department}
                                </span>
                              )}

                              {job.location && (
                                <span>
                                  ◎ {job.location}
                                </span>
                              )}

                              {job.work_type && (
                                <span>
                                  ◈ {job.work_type}
                                </span>
                              )}

                              {job.employment_type && (
                                <span>
                                  {job.employment_type}
                                </span>
                              )}

                              {job.years_of_experience && (
                                <span>
                                  {job.years_of_experience} experience
                                </span>
                              )}

                              {job.hiring_manager && (
                                <span>
                                  Hiring Manager: {job.hiring_manager}
                                </span>
                              )}

                              {job.priority && (
                                <span>
                                  Priority: {job.priority}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="jm-job-actions">
                            <button
                              type="button"
                              className="jm-secondary"
                              onClick={() => editJob(job)}
                            >
                              ✎ Edit Job
                            </button>

                            <select
                              aria-label={`Status for ${job.title}`}
                              value={status}
                              disabled={
                                updatingJobId === job.id
                              }
                              onChange={(e) =>
                                changeStatus(
                                  job.id,
                                  e.target.value
                                )
                              }
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
                        </div>

                        <p className="jm-job-description">
                          {job.description ||
                            "No job description added."}
                        </p>

                        <div
                          style={{
                            display: "flex",
                            gap: 14,
                            flexWrap: "wrap",
                            color: "#8390a0",
                            fontSize: 12,
                          }}
                        >
                          <span>
                            Openings: {job.openings || 1}
                          </span>

                          {job.salary_proposed && (
                            <span>
                              Salary: {job.salary_proposed}
                            </span>
                          )}

                          {job.deadline && (
                            <span>
                              Deadline: {String(job.deadline).slice(0, 10)}
                            </span>
                          )}
                        </div>

                        <div className="jm-job-footer">
                          <div>
                            <strong
                              style={{
                                fontSize: 13,
                                color: "#1e293b",
                              }}
                            >
                              Candidates ({linkedCandidates.length})
                            </strong>

                            {linkedCandidates.length > 0 ? (
                              <div className="jm-candidate-list">
                                {linkedCandidates.map(
                                  (candidate) => (
                                    <Link
                                      key={candidate.id}
                                      href={`/app/candidates/${candidate.id}`}
                                      className="jm-candidate-link"
                                    >
                                      {candidate.full_name ||
                                        "Unnamed Candidate"}
                                      {" · "}
                                      {candidate.status ||
                                        "Applied"}
                                    </Link>
                                  )
                                )}
                              </div>
                            ) : (
                              <p
                                style={{
                                  color: "#9aa5b1",
                                  fontSize: 12,
                                  margin: "8px 0 0",
                                }}
                              >
                                No candidates linked yet.
                              </p>
                            )}
                          </div>

                          <Link
                            href="/app/pipeline"
                            className="jm-secondary"
                          >
                            View Pipeline →
                          </Link>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
