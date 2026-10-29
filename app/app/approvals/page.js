
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import ATSNavigation from "@/components/ATSNavigation";

export default function ApprovalCenterPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadApprovals() {
      try {
        const { data: auth, error: authError } =
          await supabase.auth.getUser();

        if (authError) throw authError;
        if (!auth.user) {
          throw new Error("Please sign in to continue.");
        }

        const { data, error: rpcError } =
          await supabase.rpc("get_my_hiring_decisions");

        if (rpcError) throw rpcError;

        if (active) setItems(data || []);
      } catch (err) {
        if (active) {
          setError(err.message || "Could not load approvals.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadApprovals();

    return () => {
      active = false;
    };
  }, []);

  const card = {
    background: "#ffffff",
    border: "1px solid #e0eae4",
    borderRadius: 16,
    padding: 24,
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5faf7",
        color: "#183e32",
      }}
    >
      <style>{`
        .approval-layout {
          display: grid;
          grid-template-columns: 254px minmax(0, 1fr);
          min-height: 100vh;
        }
        .approval-sidebar {
          background: white;
          border-right: 1px solid #e6eaf0;
          padding: 24px 15px;
        }
        .approval-nav {
          display: grid;
          gap: 4px;
        }
        .approval-nav a {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 13px 15px;
          border-radius: 10px;
          text-decoration: none;
          color: #657285;
          font-size: 13px;
          font-weight: 600;
        }
        .approval-nav a span {
          width: 23px;
          text-align: center;
          font-size: 19px;
        }
        .approval-nav a.active {
          color: #176b4a;
          background: #eaf3ee;
          font-weight: 800;
        }
        .approval-main {
          padding: 34px clamp(18px, 3vw, 48px);
          min-width: 0;
        }
        @media (max-width: 800px) {
          .approval-layout {
            grid-template-columns: 1fr;
          }
          .approval-sidebar {
            border-right: 0;
            border-bottom: 1px solid #e6eaf0;
          }
        }
      `}</style>

      <div className="approval-layout">
        <aside className="approval-sidebar">
          <Link
            href="/app/dashboard"
            style={{
              display: "block",
              color: "#176b4a",
              fontSize: 20,
              fontWeight: 800,
              textDecoration: "none",
              padding: "10px 12px 26px",
            }}
          >
            Inspire Match
          </Link>

          <ATSNavigation
            className="approval-nav"
            linkClassName="approval-nav-link"
          />
        </aside>

        <main className="approval-main">
          <div style={{ marginBottom: 30 }}>
            <div
              style={{
                color: "#176b4a",
                fontWeight: 800,
                fontSize: 12,
                letterSpacing: 1.5,
              }}
            >
              RECRUITMENT OPERATIONS
            </div>

            <h1
              style={{
                fontSize: 34,
                margin: "12px 0",
              }}
            >
              Approval Center
            </h1>

            <p style={{ color: "#6b8275" }}>
              Review hiring decisions assigned to your role.
            </p>
          </div>

          <div style={card}>
            <h2 style={{ marginTop: 0 }}>
              My Hiring Decisions
            </h2>

            <p
              style={{
                color: "#71877a",
                fontSize: 13,
              }}
            >
              Hiring decision information only.
              Financial details are not displayed.
            </p>

            {loading && <p>Loading approvals...</p>}

            {error && (
              <p role="alert" style={{ color: "#b42318" }}>
                {error}
              </p>
            )}

            {!loading && !error && items.length === 0 && (
              <div
                style={{
                  padding: "45px 15px",
                  textAlign: "center",
                  background: "#f8fbf9",
                  borderRadius: 12,
                }}
              >
                <div style={{ fontSize: 34 }}>✓</div>
                <h3>No Hiring Decisions Assigned</h3>
                <p style={{ color: "#71877a" }}>
                  There are no pending hiring decisions
                  available to your account.
                </p>
              </div>
            )}

            {!loading && !error && items.length > 0 && (
              <div style={{ display: "grid", gap: 14 }}>
                {items.map((item) => (
                  <div
                    key={item.offer_id}
                    style={{
                      padding: 20,
                      border: "1px solid #e0eae4",
                      borderRadius: 12,
                      background: "#ffffff",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                        flexWrap: "wrap",
                      }}
                    >
                      <div>
                        <strong style={{ fontSize: 17 }}>
                          {item.job_title || "Hiring Decision"}
                        </strong>

                        <p
                          style={{
                            color: "#71877a",
                            marginBottom: 0,
                          }}
                        >
                          {item.step_name}
                        </p>
                      </div>

                      <span
                        style={{
                          color: "#176b4a",
                          background: "#e6f5ec",
                          borderRadius: 20,
                          padding: "8px 14px",
                          fontWeight: 700,
                          fontSize: 12,
                          alignSelf: "flex-start",
                        }}
                      >
                        {item.step_status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <p
            style={{
              marginTop: 22,
              fontSize: 12,
              color: "#71877a",
            }}
          >
            Approval actions will become available after
            authorization and security checks are complete.
          </p>
        </main>
      </div>
    </div>
  );
}
