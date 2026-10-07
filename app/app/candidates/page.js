"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const STATUSES = [
  "All statuses",
  "Applied",
  "Screening",
  "Interview",
  "Shortlisted",
  "Hired",
  "Rejected",
];

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [locationFilter, setLocationFilter] = useState("");
  const [minExperience, setMinExperience] = useState("");

  useEffect(() => {
    loadCandidates();
  }, []);
async function loadCandidates() {
  setLoading(true);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    setCandidates([]);
    setLoading(false);
    return;
  }

  const { data, error } = await supabase
    .from("candidates")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Could not load candidates:", error);
    setCandidates([]);
  } else {
    setCandidates(data || []);
  }

  setLoading(false);
}
    setLoading(false);
  }

  const filteredCandidates = useMemo(() => {
    const searchValue = search.trim().toLowerCase();
    const locationValue = locationFilter.trim().toLowerCase();
    const experienceValue = Number(minExperience);

    return candidates.filter((candidate) => {
      const searchableText = [
        candidate.full_name,
        candidate.current_title,
        candidate.location,
        candidate.skills,
        candidate.cv_file_name,
        candidate.cv_text,
        candidate.email,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !searchValue || searchableText.includes(searchValue);

      const matchesStatus =
        statusFilter === "All statuses" ||
        candidate.status === statusFilter;

      const matchesLocation =
        !locationValue ||
        (candidate.location || "").toLowerCase().includes(locationValue);

      const candidateExperience = Number(
        candidate.years_experience || 0
      );

      const matchesExperience =
        !minExperience || candidateExperience >= experienceValue;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesLocation &&
        matchesExperience
      );
    });
  }, [
    candidates,
    search,
    statusFilter,
    locationFilter,
    minExperience,
  ]);

  function clearFilters() {
    setSearch("");
    setStatusFilter("All statuses");
    setLocationFilter("");
    setMinExperience("");
  }

  function getStatusStyle(status) {
    const styles = {
      Applied: {
        background: "#eef2ff",
        color: "#3730a3",
      },
      Screening: {
        background: "#fff7ed",
        color: "#c2410c",
      },
      Interview: {
        background: "#eff6ff",
        color: "#1d4ed8",
      },
      Shortlisted: {
        background: "#f0fdf4",
        color: "#15803d",
      },
      Hired: {
        background: "#ecfdf5",
        color: "#047857",
      },
      Rejected: {
        background: "#fef2f2",
        color: "#b91c1c",
      },
    };

    return (
      styles[status] || {
        background: "#f3f4f6",
        color: "#374151",
      }
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#faf9f6",
        padding: "50px 24px",
        fontFamily: "Arial, sans-serif",
        color: "#222",
      }}
    >
      <div
        style={{
          maxWidth: 1400,
          margin: "0 auto",
        }}
      >
        {/* HEADER */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 20,
            marginBottom: 35,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 13,
                letterSpacing: 1,
                color: "#777",
                marginBottom: 8,
                textTransform: "uppercase",
              }}
            >
              Inspire Match
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: 38,
                fontWeight: 600,
              }}
            >
              Candidate Database
            </h1>

            <p
              style={{
                marginTop: 10,
                color: "#666",
                fontSize: 16,
              }}
            >
              Manage and review your saved candidates.
            </p>
          </div>

          <Link
            href="/"
            style={{
              textDecoration: "none",
              padding: "12px 20px",
              borderRadius: 9,
              border: "1px solid #ddd",
              background: "#fff",
              color: "#222",
              fontSize: 14,
            }}
          >
            ← Back to ATS
          </Link>
        </div>

        {/* FILTERS */}
        <section
          style={{
            background: "#fff",
            border: "1px solid #e8e6df",
            borderRadius: 16,
            padding: 22,
            marginBottom: 25,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "minmax(220px, 2fr) minmax(160px, 1fr) minmax(160px, 1fr) minmax(130px, 1fr) auto",
              gap: 14,
              alignItems: "end",
            }}
          >
            {/* SEARCH */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 600,
                  marginBottom: 7,
                }}
              >
                Search
              </label>

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name, title, CV, location..."
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "12px 13px",
                  border: "1px solid #ddd",
                  borderRadius: 9,
                  fontSize: 14,
                  outline: "none",
                }}
              />
            </div>

            {/* STATUS */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 600,
                  marginBottom: 7,
                }}
              >
                Status
              </label>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "12px 13px",
                  border: "1px solid #ddd",
                  borderRadius: 9,
                  background: "#fff",
                  fontSize: 14,
                }}
              >
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            {/* LOCATION */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 600,
                  marginBottom: 7,
                }}
              >
                Location
              </label>

              <input
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                placeholder="e.g. Cairo"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "12px 13px",
                  border: "1px solid #ddd",
                  borderRadius: 9,
                  fontSize: 14,
                }}
              />
            </div>

            {/* EXPERIENCE */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 600,
                  marginBottom: 7,
                }}
              >
                Min. Experience
              </label>

              <input
  type="number"
  min="0"
  value={minExperience}
  onChange={(e) => setMinExperience(e.target.value)}
  placeholder="Years"
  style={{
    width: "100%",
    boxSizing: "border-box",
    padding: "12px 13px",
    border: "1px solid #ddd",
    borderRadius: 9,
    fontSize: 14,
  }}
/>
  
            <div
              style={{
                fontSize: 40,
                marginBottom: 15,
              }}
            >
              👤
            </div>

            <h3 style={{ margin: "0 0 8px" }}>
              No candidates found
            </h3>

            <p
              style={{
                color: "#777",
                margin: 0,
              }}
            >
              Try changing your filters or upload a new CV.
            </p>
          </section>
        ) : (
          <div
            style={{
              display: "grid",
              gap: 18,
            }}
          >
            {filteredCandidates.map((candidate) => {
              const statusStyle = getStatusStyle(
                candidate.status
              );

              return (
                <article
                  key={candidate.id}
                  style={{
                    background: "#fff",
                    border: "1px solid #e8e6df",
                    borderRadius: 16,
                    padding: 24,
                    boxShadow:
                      "0 2px 8px rgba(0,0,0,0.03)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 20,
                      flexWrap: "wrap",
                    }}
                  >
                    {/* CANDIDATE INFO */}
                    <div
                      style={{
                        flex: 1,
                        minWidth: 250,
                      }}
                    >
                      <Link
                        href={`/app/candidates/${candidate.id}`}
                        style={{
                          textDecoration: "none",
                          color: "#222",
                        }}
                      >
                        <h2
                          style={{
                            margin: "0 0 10px",
                            fontSize: 23,
                            fontWeight: 600,
                          }}
                        >
                          {candidate.full_name ||
                            "Unnamed Candidate"}
                        </h2>
                      </Link>

                      <div
                        style={{
                          display: "grid",
                          gap: 7,
                          color: "#555",
                          fontSize: 14,
                        }}
                      >
                        <div>
                          <strong>
                            Current Title:
                          </strong>{" "}
                          {candidate.current_title || "—"}
                        </div>

                        <div>
                          <strong>
                            Experience:
                          </strong>{" "}
                          {candidate.years_experience !==
                            null &&
                          candidate.years_experience !==
                            undefined
                            ? `${candidate.years_experience} years`
                            : "—"}
                        </div>

                        <div>
                          <strong>Location:</strong>{" "}
                          {candidate.location || "—"}
                        </div>

                        {candidate.email && (
                          <div>
                            <strong>Email:</strong>{" "}
                            {candidate.email}
                          </div>
                        )}

                        {candidate.phone && (
                          <div>
                            <strong>Phone:</strong>{" "}
                            {candidate.phone}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* STATUS */}
                    <div>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "7px 12px",
                          borderRadius: 20,
                          fontSize: 13,
                          fontWeight: 600,
                          ...statusStyle,
                        }}
                      >
                        {candidate.status ||
                          "Screening"}
                      </span>
                    </div>
                  </div>

                  {/* SKILLS */}
                  {candidate.skills && (
                    <div
                      style={{
                        marginTop: 18,
                        paddingTop: 16,
                        borderTop: "1px solid #eee",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          marginBottom: 7,
                        }}
                      >
                        Skills
                      </div>

                      <div
                        style={{
                          fontSize: 14,
                          color: "#666",
                          lineHeight: 1.6,
                        }}
                      >
                        {candidate.skills}
                      </div>
                    </div>
                  )}

                  {/* CV + ACTION */}
                  <div
                    style={{
                      marginTop: 18,
                      paddingTop: 16,
                      borderTop: "1px solid #eee",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 15,
                      flexWrap: "wrap",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 13,
                        color: "#777",
                      }}
                    >
                      <strong>CV:</strong>{" "}
                      {candidate.cv_file_name ||
                        "No CV file"}
                    </div>

                    <Link
                      href={`/app/candidates/${candidate.id}`}
                      style={{
                        textDecoration: "none",
                        padding: "10px 16px",
                        borderRadius: 8,
                        background: "#222",
                        color: "#fff",
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      View Candidate →
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
