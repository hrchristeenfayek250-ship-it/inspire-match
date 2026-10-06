"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [minExperience, setMinExperience] = useState("");

  useEffect(() => {
    loadCandidates();
  }, []);

  async function loadCandidates() {
    setLoading(true);

    const { data, error } = await supabase
      .from("candidates")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Could not load candidates:", error);
      setCandidates([]);
    } else {
      setCandidates(data || []);
    }

    setLoading(false);
  }

  const filteredCandidates = useMemo(() => {
    return candidates.filter((candidate) => {
      const searchText = search.toLowerCase().trim();

      const searchableText = [
        candidate.full_name,
        candidate.current_title,
        candidate.location,
        candidate.skills,
        candidate.cv_text,
        candidate.cv_file_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !searchText || searchableText.includes(searchText);

      const matchesStatus =
        !statusFilter || candidate.status === statusFilter;

      const matchesLocation =
        !locationFilter ||
        (candidate.location || "")
          .toLowerCase()
          .includes(locationFilter.toLowerCase().trim());

      const experience = Number(candidate.years_experience || 0);

      const matchesExperience =
        !minExperience ||
        experience >= Number(minExperience);

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
    setStatusFilter("");
    setLocationFilter("");
    setMinExperience("");
  }

  const statuses = [
    "Applied",
    "Screening",
    "Interview",
    "Shortlisted",
    "Hired",
    "Rejected",
  ];

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#faf9f6",
        padding: "40px 24px 80px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
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
            marginBottom: 30,
            flexWrap: "wrap",
          }}
        >
          <div>
            <p
              style={{
                margin: "0 0 8px",
                fontSize: 13,
                letterSpacing: 1,
                color: "#777",
                textTransform: "uppercase",
              }}
            >
              Inspire Match
            </p>

            <h1
              style={{
                margin: 0,
                fontSize: 38,
                color: "#222",
              }}
            >
              Candidate Database
            </h1>

            <p
              style={{
                marginTop: 10,
                color: "#777",
                fontSize: 15,
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
            border: "1px solid #e8e5df",
            borderRadius: 16,
            padding: 22,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "minmax(220px, 2fr) minmax(150px, 1fr) minmax(150px, 1fr) minmax(120px, 1fr) auto",
              gap: 12,
              alignItems: "end",
            }}
          >
            {/* SEARCH */}
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: 7,
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#555",
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
                  borderRadius: 8,
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
                  marginBottom: 7,
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#555",
                }}
              >
                Status
              </label>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 13px",
                  border: "1px solid #ddd",
                  borderRadius: 8,
                  background: "#fff",
                  fontSize: 14,
                }}
              >
                <option value="">All statuses</option>

                {statuses.map((status) => (
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
                  marginBottom: 7,
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#555",
                }}
              >
                Location
              </label>

              <input
                value={locationFilter}
                onChange={(e) =>
                  setLocationFilter(e.target.value)
                }
                placeholder="e.g. Cairo"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "12px 13px",
                  border: "1px solid #ddd",
                  borderRadius: 8,
                  fontSize: 14,
                }}
              />
            </div>

            {/* EXPERIENCE */}
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: 7,
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#555",
                }}
              >
                Min. Experience
              </label>

              <input
                type="number"
                min="0"
                value={minExperience}
                onChange={(e) =>
                  setMinExperience(e.target.value)
                }
                placeholder="Years"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "12px 13px",
                  border: "1px solid #ddd",
                  borderRadius: 8,
                  fontSize: 14,
                }}
              />
            </div>

            {/* CLEAR */}
            <button
              onClick={clearFilters}
              style={{
                padding: "12px 16px",
                borderRadius: 8,
                border: "1px solid #ddd",
                background: "#fff",
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              Clear
            </button>
          </div>

          <div
            style={{
              marginTop: 15,
              fontSize: 13,
              color: "#777",
            }}
          >
            Showing {filteredCandidates.length} of{" "}
            {candidates.length} candidates
          </div>
        </section>

        {/* CANDIDATES */}
        {loading ? (
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: 30,
              textAlign: "center",
              color: "#777",
            }}
          >
            Loading candidates...
          </div>
        ) : filteredCandidates.length === 0 ? (
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: 50,
              textAlign: "center",
              border: "1px solid #eee",
            }}
          >
            <h3 style={{ marginTop: 0 }}>
              No candidates found
            </h3>

            <p style={{ color: "#777" }}>
              Try changing your filters or search terms.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: 16,
            }}
          >
            {filteredCandidates.map((candidate) => (
              <Link
                key={candidate.id}
                href={`/app/candidates/${candidate.id}`}
                style={{
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <article
                  style={{
                    background: "#fff",
                    border: "1px solid #e8e5df",
                    borderRadius: 16,
                    padding: 24,
                    cursor: "pointer",
                    transition: "all 0.2s ease",
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
                    <div style={{ flex: 1 }}>
                      <h2
                        style={{
                          margin: "0 0 12px",
                          fontSize: 21,
                          color: "#222",
                        }}
                      >
                        {candidate.full_name ||
                          "Unnamed Candidate"}
                      </h2>

                      <p
                        style={{
                          margin: "0 0 8px",
                          color: "#555",
                          fontSize: 14,
                        }}
                      >
                        <strong>Current Title:</strong>{" "}
                        {candidate.current_title || "—"}
                      </p>

                      <p
                        style={{
                          margin: "0 0 8px",
                          color: "#555",
                          fontSize: 14,
                        }}
                      >
                        <strong>Experience:</strong>{" "}
                        {candidate.years_experience
                          ? `${candidate.years_experience} years`
                          : "—"}
                      </p>

                      <p
                        style={{
                          margin: "0 0 8px",
                          color: "#555",
                          fontSize: 14,
                        }}
                      >
                        <strong>Location:</strong>{" "}
                        {candidate.location || "—"}
                      </p>

                      <p
                        style={{
                          margin: "0 0 8px",
                          color: "#555",
                          fontSize: 14,
                        }}
                      >
                        <strong>CV:</strong>{" "}
                        {candidate.cv_file_name || "—"}
                      </p>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-end",
                        gap: 12,
                      }}
                    >
                      <span
                        style={{
                          display: "inline-block",
                          padding: "7px 12px",
                          borderRadius: 20,
                          background: "#f2f0eb",
                          color: "#333",
                          fontSize: 13,
                          fontWeight: 600,
                        }}
                      >
                        {candidate.status || "Screening"}
                      </span>

                      <span
                        style={{
                          fontSize: 13,
                          color: "#777",
                        }}
                      >
                        View Profile →
                      </span>
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
