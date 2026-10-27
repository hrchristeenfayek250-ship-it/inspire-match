
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import ATSNavigation from "@/components/ATSNavigation";

const green = "#176b4a";

const statuses = [
  "draft",
  "pending_approval",
  "changes_requested",
  "approved",
  "rejected",
  "sent",
  "accepted",
  "declined",
  "withdrawn",
];

function formatStatus(status) {
  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function OffersPage() {
  const [offers, setOffers] = useState([]);
  const [candidates, setCandidates] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    async function loadOffers() {
      try {
        const { data: auth, error: authError } =
          await supabase.auth.getUser();

        if (authError) throw authError;
        if (!auth.user) {
          throw new Error("Please log in.");
        }

        const { data: memberships, error: memberError } =
          await supabase
            .from("company_members")
            .select("company_id")
            .eq("user_id", auth.user.id);

        if (memberError) throw memberError;

        if (!memberships || memberships.length !== 1) {
          throw new Error(
            "Your account must belong to exactly one company."
          );
        }

        const companyId = memberships[0].company_id;

        const [offerResult, candidateResult] =
          await Promise.all([
            supabase
              .from("recruitment_offers")
              .select("*")
              .eq("company_id", companyId)
              .order("created_at", { ascending: false }),

            supabase
              .from("candidates")
              .select("id, full_name")
              .eq("company_id", companyId),
          ]);

        if (offerResult.error) throw offerResult.error;
        if (candidateResult.error) throw candidateResult.error;

        setOffers(offerResult.data || []);

        setCandidates(
          Object.fromEntries(
            (candidateResult.data || []).map((candidate) => [
              candidate.id,
              candidate.full_name,
            ])
          )
        );
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadOffers();
  }, []);

  const filteredOffers =
    filter === "all"
      ? offers
      : offers.filter((offer) => offer.status === filter);

  const pending = offers.filter(
    (offer) => offer.status === "pending_approval"
  ).length;

  const approved = offers.filter(
    (offer) => offer.status === "approved"
  ).length;

  const accepted = offers.filter(
    (offer) => offer.status === "accepted"
  ).length;

  const card = {
    background: "#ffffff",
    border: "1px solid #dce9e1",
    borderRadius: 16,
    padding: 22,
  };

  return (
    <>
  <style jsx global>{`
  
    .im-links {
      display: grid;
      gap: 4px;
    }

    .im-nav-link {
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

    .im-nav-link span {
      width: 23px;
      text-align: center;
      font-size: 19px;
    }

    .im-nav-link.active {
      color: #245340;
      background: #eaf3ee;
      border-left-color: #315f50;
      font-weight: 800;
    }

    .im-nav-link:hover {
      background: #f4f7f6;
    }

    .im-offers-shell {
      display: grid;
      grid-template-columns: 254px minmax(0, 1fr);
      min-height: 100vh;
    }

    .im-offers-sidebar {
      background: #ffffff;
      border-right: 1px solid #e6eaf0;
      padding: 24px 15px;
      min-width: 0;
    }

    .im-offers-main {
      min-width: 0;
      padding: 28px clamp(17px, 3vw, 46px) 60px;
    }

    @media (max-width: 800px) {
      .im-offers-shell {
        grid-template-columns: 1fr;
      }

      .im-offers-sidebar {
        border-right: 0;
        border-bottom: 1px solid #e6eaf0;
      }
    }

  `}</style>
   
    <div
      style={{
        minHeight: "100vh",
        background: "#f5faf7",
        color: "#183e32",
        fontFamily: "inherit",
      }}
    >
      <div className="im-offers-shell">
        <aside className="im-offers-sidebar">
          <div className="im-brand" style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "10px 12px 24px",
            marginBottom: 24,
            borderBottom: "1px solid #edf0f2",
          }}>
            <div style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: "#284e42",
              color: "#fff",
              display: "grid",
              placeItems: "center",
              fontSize: 23,
              fontWeight: 800,
            }}>
              I
            </div>
            <div>
              <strong style={{ display: "block", fontSize: 17 }}>
                Inspire Match
              </strong>
              <small style={{ color: "#8795a4", fontSize: 9 }}>
                TALENT INTELLIGENCE
              </small>
            </div>
          </div>

          <div style={{
            padding: "0 14px",
            color: "#9ba6b2",
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: 1.5,
            marginBottom: 10,
          }}>
            WORKSPACE
          </div>

          <ATSNavigation
            className="im-links"
            linkClassName="im-nav-link"
          />

          <div style={{
            borderTop: "1px solid #edf0f2",
            marginTop: 28,
            padding: "20px 14px",
          }}>
            <Link
              href="/"
              style={{ color: "#657285", textDecoration: "none" }}
            >
              ↗ ATS Home
            </Link>
          </div>
        </aside>

        <main className="im-offers-main">

        <div style={{ margin: "32px 0" }}>
          <div
            style={{
              color: green,
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: 1,
            }}
          >
            RECRUITMENT OPERATIONS
          </div>

          <h1
            style={{
              fontSize: 34,
              margin: "10px 0",
            }}
          >
            Offer Management
          </h1>

          <p style={{ color: "#6b8275" }}>
            Manage employment offers, approvals,
            and hiring decisions in one place.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 16,
            marginBottom: 28,
          }}
        >
          {[
            ["Total Offers", offers.length],
            ["Pending Approval", pending],
            ["Approved", approved],
            ["Accepted", accepted],
          ].map(([label, value]) => (
            <div key={label} style={card}>
              <div
                style={{
                  color: "#708679",
                  fontSize: 13,
                }}
              >
                {label}
              </div>
              <div
                style={{
                  color: green,
                  fontSize: 32,
                  fontWeight: 800,
                  marginTop: 10,
                }}
              >
                {value}
              </div>
            </div>
          ))}
        </div>

        <section style={card}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 14,
              marginBottom: 22,
            }}
          >
            <h2 style={{ margin: 0 }}>
              Employment Offers
            </h2>

            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={{
                padding: 12,
                borderRadius: 10,
                border: "1px solid #dce9e1",
                background: "#ffffff",
                color: "#183e32",
              }}
            >
              <option value="all">All Statuses</option>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {formatStatus(status)}
                </option>
              ))}
            </select>
          </div>

          {loading && <p>Loading offers...</p>}

          {error && (
            <p role="alert" style={{ color: "#b42318" }}>
              {error}
            </p>
          )}

          {!loading && !error && filteredOffers.length === 0 && (
            <div
              style={{
                textAlign: "center",
                padding: "60px 20px",
                background: "#f8fbf9",
                borderRadius: 14,
              }}
            >
              <div style={{ fontSize: 38 }}>▤</div>
              <h3>No Offers Found</h3>
              <p style={{ color: "#708679" }}>
                Employment offers will appear here
                once they are created.
              </p>
            </div>
          )}

          {!loading && !error && filteredOffers.length > 0 && (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  textAlign: "left",
                }}
              >
                <thead>
                  <tr>
                    {[
                      "Candidate",
                      "Job",
                      "Salary",
                      "Status",
                      "Created",
                    ].map((heading) => (
                      <th
                        key={heading}
                        style={{
                          padding: 14,
                          borderBottom:
                            "1px solid #e0ebe4",
                        }}
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredOffers.map((offer) => (
                    <tr key={offer.id}>
                      <td style={{ padding: 14 }}>
                        {candidates[offer.candidate_id] ||
                          "Candidate"}
                      </td>
                      <td style={{ padding: 14 }}>
                      
        </section>
        </main>
      </div>
    </div>
    </>
  );
}

                              offer.base_salary
                            ).toLocaleString()}`}
                      </td>
                      <td style={{ padding: 14 }}>
                        <span
                          style={{
                            background: "#e6f5ec",
                            color: green,
                            padding: "7px 11px",
                            borderRadius: 20,
                            fontSize: 12,
                            fontWeight: 700,
                          }}
                        >
                          {formatStatus(offer.status)}
                        </span>
                      </td>
                      <td style={{ padding: 14 }}>
                        {new Date(
                          offer.created_at
                        ).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
                             </section>
        </div>
        </main>
      </div>
    </div>
    </>
  );
}
