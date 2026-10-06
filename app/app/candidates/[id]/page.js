"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function CandidateProfilePage() {
  const params = useParams();
  const candidateId = params?.id;

  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (candidateId) {
      loadCandidate();
    }
  }, [candidateId]);

  async function loadCandidate() {
    const { data, error } = await supabase
      .from("candidates")
      .select("*")
      .eq("id", candidateId)
      .single();

    if (error) {
      console.error("Could not load candidate:", error);
    } else {
      setCandidate(data);
    }

    setLoading(false);
  }

  async function changeStatus(status) {
    const { error } = await supabase
      .from("candidates")
      .update({ status })
      .eq("id", candidateId);

    if (error) {
      alert(`Could not update status: ${error.message}`);
      return;
    }

    setCandidate((current) => ({
      ...current,
      status,
    }));
  }

  if (loading) {
    return (
      <main style={styles.page}>
        <p>Loading candidate...</p>
      </main>
    );
  }

  if (!candidate) {
    return (
      <main style={styles.page}>
        <h1>Candidate not found</h1>
        <a href="/app/pipeline" style={styles.backButton}>
          ← Back to Pipeline
        </a>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>

        <div style={styles.topBar}>
          <div>
            <h1 style={styles.title}>
              {candidate.full_name || "Unnamed Candidate"}
            </h1>

            <p style={styles.subtitle}>
              {candidate.current_title || "Candidate Profile"}
            </p>
          </div>

          <a href="/app/pipeline" style={styles.backButton}>
            ← Back to Pipeline
          </a>
        </div>

        <div style={styles.grid}>

          <section style={styles.card}>
            <h2 style={styles.cardTitle}>Candidate Information</h2>

            <Info label="Full Name" value={candidate.full_name} />
            <Info label="Current Title" value={candidate.current_title} />
            <Info label="Location" value={candidate.location} />
            <Info
              label="Years of Experience"
              value={candidate.years_experience}
            />
            <Info label="Email" value={candidate.email} />
            <Info label="Phone" value={candidate.phone} />
            <Info label="LinkedIn" value={candidate.linkedin_url} />
          </section>

          <section style={styles.card}>
            <h2 style={styles.cardTitle}>Recruitment Status</h2>

            <p style={styles.label}>Current Stage</p>

            <select
              value={candidate.status || "Screening"}
              onChange={(e) => changeStatus(e.target.value)}
              style={styles.select}
            >
              <option value="Applied">Applied</option>
              <option value="Screening">Screening</option>
              <option value="Interview">Interview</option>
              <option value="Shortlisted">Shortlisted</option>
              <option value="Hired">Hired</option>
              <option value="Rejected">Rejected</option>
            </select>

            <div style={styles.statusBox}>
              {candidate.status || "Screening"}
            </div>
          </section>

          <section style={{ ...styles.card, gridColumn: "1 / -1" }}>
            <h2 style={styles.cardTitle}>Skills</h2>

            <p style={styles.text}>
              {candidate.skills || "No skills information available."}
            </p>
          </section>

          <section style={{ ...styles.card, gridColumn: "1 / -1" }}>
            <h2 style={styles.cardTitle}>CV Information</h2>

            <Info
              label="CV File"
              value={candidate.cv_file_name}
            />

            <Info
              label="Source"
              value={candidate.source}
            />

            <Info
              label="Blind Screening"
              value={candidate.blind_screening ? "Enabled" : "Disabled"}
            />

            <Info
              label="Consent Confirmed"
              value={candidate.consent_confirmed ? "Yes" : "No"}
            />
          </section>

          <section style={{ ...styles.card, gridColumn: "1 / -1" }}>
            <h2 style={styles.cardTitle}>Recruiter Notes</h2>

            <p style={styles.text}>
              {candidate.notes || "No recruiter notes added yet."}
            </p>
          </section>

        </div>
      </div>
    </main>
  );
}

function Info({ label, value }) {
  return (
    <div style={styles.infoRow}>
      <span style={styles.label}>{label}</span>
      <span style={styles.value}>{value || "—"}</span>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#faf9f6",
    padding: "40px 24px",
    fontFamily: "Arial, sans-serif",
  },

  container: {
    maxWidth: 1100,
    margin: "0 auto",
  },

  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 30,
    gap: 20,
  },

  title: {
    margin: 0,
    fontSize: 32,
    color: "#222",
  },

  subtitle: {
    marginTop: 8,
    color: "#666",
    fontSize: 16,
  },

  backButton: {
    textDecoration: "none",
    padding: "10px 18px",
    borderRadius: 8,
    border: "1px solid #ddd",
    background: "#fff",
    color: "#222",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 20,
  },

  card: {
    background: "#fff",
    borderRadius: 16,
    padding: 24,
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
  },

  cardTitle: {
    marginTop: 0,
    marginBottom: 20,
    fontSize: 20,
    color: "#222",
  },

  infoRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 20,
    padding: "12px 0",
    borderBottom: "1px solid #eee",
  },

  label: {
    color: "#777",
    fontSize: 13,
  },

  value: {
    color: "#222",
    fontSize: 14,
    textAlign: "right",
  },

  select: {
    width: "100%",
    padding: 12,
    borderRadius: 8,
    border: "1px solid #ddd",
    background: "#fff",
    fontSize: 14,
  },

  statusBox: {
    marginTop: 20,
    padding: 16,
    borderRadius: 10,
    background: "#f1f1ee",
    textAlign: "center",
    fontWeight: "bold",
  },

  text: {
    color: "#555",
    lineHeight: 1.7,
  },
};
