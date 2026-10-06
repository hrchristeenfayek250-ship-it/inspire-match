"use client";

import { useEffect, useMemo, useState } from "react";
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
    const { data, error } = await supabase
      .from("candidates")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Could not load candidates:", error);
    } else {
      setCandidates(data || []);
    }

    setLoading(false);
  }

  const statusOptions = useMemo(() => {
    return [...new Set(
      candidates
        .map((candidate) => candidate.status)
        .filter(Boolean)
        .map((status) => String(status).trim())
    )].sort();
  }, [candidates]);

  const filteredCandidates = useMemo(() => {
    const query = search.trim().toLowerCase();
    const locationQuery = locationFilter.trim().toLowerCase();
    const minimumExperience =
      minExperience === "" ? null : Number(minExperience);

    return candidates.filter((candidate) => {
      const searchableText = [
        candidate.full_name,
        candidate.current_title,
        candidate.location,
        candidate.status,
        candidate.cv_file_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !query || searchableText.includes(query);

      const matchesStatus =
        !statusFilter ||
        String(candidate.status || "").trim() === statusFilter;

      const matchesLocation =
        !locationQuery ||
        String(candidate.location || "")
          .toLowerCase()
          .includes(locationQuery);

      const experience = Number(candidate.years_experience);

      const matchesExperience =
        minimumExperience === null ||
        (Number.isFinite(experience) &&
          experience >= minimumExperience);

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

  return (
    <main
      style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: "40px 24px",
        fontFamily: "Arial, sans-serif",
      }}
    >
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
          <h1 style={{ margin: 0 }}>
            Candidate Database
          </h1>

          <p style={{ color: "#666" }}>
            Manage and review your saved candidates.
          </p>
        </div>

        <a
          href="/"
          style={{
            textDecoration: "none",
            padding: "10px 18px",
            borderRadius: 8,
            border: "1px solid #ddd",
            color: "#222",
            background: "#fff",
          }}
        >
          ← Back to ATS
        </a>
      </div>

      {!loading && candidates.length > 0 && (
        <div
          style={{
            border: "1px solid #e5e5e5",
            borderRadius: 14,
            padding: 18,
            marginBottom: 24,
            background: "#fafafa",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "minmax(240px, 2fr) repeat(3, minmax(150px, 1fr)) auto",
              gap: 12,
              alignItems: "end",
            }}
          >
            <label style={{ display: "grid", gap: 7 }}>
              <span style={{ fontWeight: 600, fontSize: 13 }}>
                Search
              </span>

              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name, title, CV, location..."
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "11px 12px",
                  border: "1px solid #d8d8d8",
                  borderRadius: 8,
                  background: "#fff",
                }}
              />
            </label>

            <label style={{ display: "grid", gap: 7 }}>
              <span style={{ fontWeight: 600, fontSize: 13 }}>
                Status
              </span>

              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value)
                }
                style={{
                  width: "100%",
                  padding: "11px 12px",
                  border: "1px solid #d8d8d8",
                  borderRadius: 8,
                  background: "#fff",
                }}
              >
                <option value="">All statuses</option>

                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: "grid", gap: 7 }}>
              <span style={{ fontWeight: 600, fontSize: 13 }}>
                Location
              </span>

              <input
                type="text"
                value={locationFilter}
                onChange={(e) =>
                  setLocationFilter(e.target.value)
                }
                placeholder="e.g. Cairo"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "11px 12px",
                  border: "1px solid #d8d8d8",
                  borderRadius: 8,
                  background: "#fff",
                }}
              />
            </label>

            <label style={{ display: "grid", gap: 7 }}>
              <span style={{ fontWeight: 600, fontSize: 13 }}>
                Min. Experience
              </span>

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
                  padding: "11px 12px",
                  border: "1px solid #d8d8d8",
                  borderRadius: 8,
                  background: "#fff",
                }}
              />
            </label>

            <button
              type="button"
              onClick={clearFilters}
              style={{
                padding: "11px 14px",
                borderRadius: 8,
                border: "1px solid #ddd",
                background: "#fff",
                cursor: "pointer",
              }}
            >
              Clear
            </button>
          </div>

          <div
            style={{
              marginTop: 14,
              color: "#666",
              fontSize: 13,
            }}
          >
            Showing{" "}
            <strong>{filteredCandidates.length}</strong>{" "}
            of <strong>{candidates.length}</strong>{" "}
            candidates
          </div>
        </div>
      )}

      {loading ? (
        <p>Loading candidates...</p>
      ) : candidates.length === 0 ? (
        <div
          style={{
            padding: 40,
            textAlign: "center",
            border: "1px solid #eee",
            borderRadius: 12,
          }}
        >
          <h3>No candidates yet</h3>
          <p>
            Score a CV from the ATS and it will appear here.
          </p>
        </div>
      ) : filteredCandidates.length === 0 ? (
        <div
          style={{
            padding: 40,
            textAlign: "center",
            border: "1px solid #eee",
            borderRadius: 12,
          }}
        >
          <h3>No matching candidates</h3>

          <p>
            Try changing your search or filters.
          </p>

          <button
            type="button"
            onClick={clearFilters}
            style={{
              padding: "10px 16px",
              borderRadius: 8,
              border: "1px solid #ddd",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {filteredCandidates.map((candidate) => (
            <div
              key={candidate.id}
              style={{
                border: "1px solid #e5e5e5",
                borderRadius: 12,
                padding: 20,
                background: "#fff",
              }}
            >
              <h2 style={{ marginTop: 0 }}>
                {candidate.full_name ||
                  "Unnamed Candidate"}
              </h2>

              <p>
                <strong>Current Title:</strong>{" "}
                {candidate.current_title || "—"}
              </p>

              <p>
                <strong>Experience:</strong>{" "}
                {candidate.years_experience ?? "—"} years
              </p>

              <p>
                <strong>Location:</strong>{" "}
                {candidate.location || "—"}
              </p>

              <p>
                <strong>Status:</strong>{" "}
                {candidate.status || "—"}
              </p>

              <p>
                <strong>CV:</strong>{" "}
                {candidate.cv_file_name || "—"}
              </p>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
