"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import ATSNavigation from "@/components/ATSNavigation";

const fields = [
  ["department", "Department"],
  ["location", "Location"],
  ["work_type", "Work Type"],
  ["employment_type", "Employment Type"],
  ["years_of_experience", "Experience"],
  ["openings", "Openings"],
  ["priority", "Priority"],
  ["hiring_manager", "Hiring Manager"],
  ["salary_proposed", "Proposed Salary"],
  ["deadline", "Hiring Deadline"],
];
const sections = [
  ["description", "Job Description"],
  ["responsibilities", "Responsibilities"],
  ["requirements", "Requirements"],
  ["required_skills", "Required Skills"],
  ["nice_to_have_requirements", "Nice to Have"],
  ["benefits", "Benefits"],
];

export default function JobDetailsPage() {
  const params = useParams();
  const id = params?.id;
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      if (!id) return;
      setLoading(true);
      setMessage("");
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) throw new Error("Please log in to view this job.");

        const { data: memberships, error: membershipError } = await supabase
          .from("company_members")
          .select("company_id")
          .eq("user_id", user.id)
          .limit(2);
        if (membershipError) throw membershipError;
        if (!memberships || memberships.length !== 1) {
          throw new Error("Could not verify your company.");
        }

        const { data, error } = await supabase
          .from("jobs")
          .select("*")
          .eq("id", id)
          .eq("company_id", memberships[0].company_id)
          .maybeSingle();
        if (error) throw error;
        if (!data) throw new Error("Job not found or you do not have access.");
        if (active) setJob(data);
      } catch (error) {
        if (active) {
          setJob(null);
          setMessage(error.message || "Unable to load job.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [id]);

  return (
    <div style={{ minHeight: "100vh", background: "#f5f8f7", color: "#173a33" }}>
      <ATSNavigation />
      <main style={{ maxWidth: 1050, margin: "0 auto", padding: "36px 22px 72px" }}>
        <Link href="/app/jobs" style={{ color: "#087d62", fontWeight: 700, textDecoration: "none" }}>
          ← Back to Jobs
        </Link>
        {loading ? (
          <p style={{ marginTop: 32 }}>Loading job details...</p>
        ) : message ? (
          <div role="alert" style={{ marginTop: 28, background: "#fff", border: "1px solid #dce7e2", borderRadius: 16, padding: 24 }}>
            {message}
          </div>
        ) : job ? (
          <>
            <header style={{ background: "linear-gradient(120deg, #0b6c54, #114d44)", color: "white", padding: "32px", borderRadius: 20, marginTop: 24 }}>
              <div style={{ opacity: 0.8, fontSize: 13, fontWeight: 700, letterSpacing: 1 }}>JOB DETAILS</div>
              <h1 style={{ margin: "10px 0", fontSize: "clamp(25px, 4vw, 38px)" }}>{job.title}</h1>
              <div style={{ opacity: 0.9 }}>{job.status || "Active"} {job.location ? ` • ${job.location}` : ""}</div>
            </header>
            <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginTop: 22 }}>
              {fields.filter(([key]) => job[key] !== null && job[key] !== undefined && job[key] !== "").map(([key, label]) => (
                <div key={key} style={{ background: "white", border: "1px solid #e1eae6", borderRadius: 14, padding: 18 }}>
                  <div style={{ fontSize: 12, color: "#66847a", marginBottom: 7 }}>{label}</div>
                  <div style={{ fontWeight: 700, overflowWrap: "anywhere" }}>{String(job[key])}</div>
                </div>
              ))}
            </section>
            {sections.filter(([key]) => job[key]).map(([key, label]) => (
              <section key={key} style={{ background: "white", border: "1px solid #e1eae6", borderRadius: 16, padding: "24px 28px", marginTop: 18 }}>
                <h2 style={{ margin: "0 0 14px", fontSize: 20 }}>{label}</h2>
                <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.8, overflowWrap: "anywhere" }}>{String(job[key])}</div>
              </section>
            ))}
          </>
        ) : null}
      </main>
    </div>
  );
}
