
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
          cv_file_name: file.name,
          status: "Applied",
          source: "AI CV Upload",
          consent_confirmed: true,
        });

      if (saveError) throw saveError;

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

        <p style={{ color: "#68766e" }}>
          Upload a CV, extract candidate details
