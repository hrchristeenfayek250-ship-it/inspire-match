
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import ATSNavigation from "@/components/ATSNavigation";

export default function ApprovalCenterPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");

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

        if (active) {
          setItems(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (active) {
          setError(err.message || "Could not load approvals.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadApprovals();
    return () => { active = false; };
  }, []);

  const isPending = (item) =>
    ["pending", "pending approval", "awaiting approval"]
      .includes(String(item.step_status || "").toLowerCase());

  const pendingCount = items.filter(isPending).length;
  const completedCount = items.filter(
    (item) => ["approved", "rejected"].includes(
      String(item.step_status || "").toLowerCase()
    )
  ).length;

  const visibleItems = items.filter((item) =>
    filter === "all" ? true :
    filter === "pending" ? isPending(item) :
    ["approved", "rejected"].includes(
      String(item.step_status || "").toLowerCase()
    )
  );

  return (
    <div className="ac-shell">
      <style>{`
        .ac-shell {
          min-height: 100vh;
          background: #f5f8f6;
          color: #173b30;
          font-family: Arial, sans-serif;
        }
        .ac-layout {
          display: grid;
          grid-template-columns: 254px minmax(0, 1fr);
          min-height: 100vh;
        }
        .ac-sidebar {
          background: #fff;
          border-right: 1px solid #e3ebe6;
          padding: 25px 15px;
        }
        .ac-brand {
          display: block;
          padding: 10px 12px 30px;
          color: #126442;
          font-size: 21px;
          font-weight: 800;
          text-decoration: none;
        }
        .ac-nav { display: grid; gap: 4px; }
        .ac-nav a {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 13px 15px;
          border-radius: 10px;
          color: #66776e;
          font-size: 13px;
          font-weight: 600;
          text-decoration: none;
        }
        .ac-nav a.active {
          background: #e7f3eb;
          color: #126442;
          font-weight: 800;
        }
        .ac-main {
          padding: 36px clamp(20px, 4vw, 60px) 70px;
          max-width: 1500px;
          width: 100%;
          min-width: 0;
          margin: 0 auto;
        }
        .ac-eyebrow {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 2px;
          color: #168052;
        }
        .ac-title {
          font-size: clamp(28px, 3vw, 39px);
          font-weight: 800;
          letter-spacing: -1.2px;
          margin: 12px 0;
        }
        .ac-subtitle {
          font-size: 14px;
          color: #73867b;
          line-height: 1.7;
        }
        .ac-hero {
          margin-top: 28px;
          padding: 28px 32px;
          border-radius: 20px;
          background: linear-gradient(120deg, #103f30, #197550);
          color: #fff;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 24px;
          flex-wrap: wrap;
        }
        .ac-hero h2 {
          font-size: 23px;
          margin: 10px 0;
          color: #fff;
        }
        .ac-hero p {
          margin: 0;
          color: #d5ebe0;
          font-size: 13px;
          line-height: 1.7;
        }
        .ac-hero-tag {
          border: 1px solid #75ad92;
          border-radius: 30px;
          padding: 10px 15px;
          color: #e5fff0;
          font-size: 12px;
          font-weight: 700;
        }
        .ac-stats {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 17px;
          margin-top: 24px;
        }
        .ac-stat {
          background: white;
          border: 1px solid #e2ebe5;
          border-radius: 17px;
          padding: 23px;
          box-shadow: 0 4px 20px rgba(15, 65, 42, .025);
        }
        .ac-stat-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: #74877b;
          font-size: 12px;
          font-weight: 700;
        }
        .ac-stat-icon {
          background: #e9f5ed;
          color: #14734c;
          padding: 10px 12px;
          border-radius: 11px;
          font-size: 18px;
        }
        .ac-stat-value {
          margin-top: 16px;
          font-size: 34px;
          font-weight: 800;
          color: #153f30;
        }
        .ac-panel {
          margin-top: 27px;
          border: 1px solid #e2ebe5;
          border-radius: 19px;
          background: white;
          overflow: hidden;
        }
        .ac-panel-header {
          padding: 25px 28px;
          border-bottom: 1px solid #eaf0eb;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 18px;
          flex-wrap: wrap;
        }
        .ac-panel-header h2 {
          font-size: 19px;
          margin: 0 0 7px;
        }
        .ac-panel-header p {
          margin: 0;
          color: #7b8c80;
          font-size: 12px;
        }
        .ac-filters {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .ac-filter {
          background: #f5f8f6;
          border: 1px solid #e1e9e3;
          border-radius: 9px;
          padding: 9px 15px;
          color: #617568;
          cursor: pointer;
          font-size: 12px;
          font-weight: 700;
        }
        .ac-filter.selected {
          background: #176b4a;
          border-color: #176b4a;
          color: white;
        }
        .ac-empty {
          padding: 65px 20px;
          text-align: center;
        }
        .ac-empty-icon {
          display: grid;
          place-items: center;
          margin: 0 auto 18px;
          width: 70px;
          height: 70px;
          border-radius: 20px;
          background: #e8f5ec;
          color: #14734c;
          font-size: 32px;
          font-weight: 800;
        }
        .ac-empty h3 {
          font-size: 19px;
          margin: 0 0 10px;
        }
        .ac-empty p {
          font-size: 13px;
          line-height: 1.8;
          color: #819085;
          max-width: 400px;
          margin: auto;
        }
        .ac-decision {
          padding: 22px 28px;
          border-bottom: 1px solid #edf1ee;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
        }
        .ac-decision:last-child { border-bottom: 0; }
        .ac-decision h3 {
          margin: 0 0 8px;
          font-size: 16px;
        }
        .ac-decision p {
          margin: 0;
          font-size: 12px;
          color: #829186;
        }
        .ac-status {
          background: #eaf5ed;
          color: #177249;
          padding: 8px 13px;
          border-radius: 30px;
          font-size: 11px;
          font-weight: 800;
          text-transform: capitalize;
        }
        .ac-note {
          margin-top: 18px;
          font-size: 12px;
          color: #839388;
          line-height: 1.7;
        }
        .ac-error {
          padding: 22px 28px;
          color: #b42318;
          background: #fff7f6;
        }
        @media (max-width: 900px) {
          .ac-layout { grid-template-columns: 1fr; }
          .ac-sidebar {
            border-right: 0;
            border-bottom: 1px solid #e3ebe6;
          }
          .ac-stats { grid-template-columns: 1fr; }
          .ac-main { padding: 24px 18px 50px; }
          .ac-hero { padding: 24px; }
          .ac-panel-header { padding: 20px; }
        }
      `}</style>

      <div className="ac-layout">
        <aside className="ac-sidebar">
          <Link href="/app/dashboard" className="ac-brand">
            Inspire Match
          </Link>
          <ATSNavigation
            className="ac-nav"
            linkClassName="ac-nav-link"
          />
        </aside>

        <main className="ac-main">
          <div className="ac-eyebrow">
            RECRUITMENT OPERATIONS
          </div>
          <h1 className="ac-title">Approval Center</h1>
          <p className="ac-subtitle">
            A centralized workspace for reviewing and tracking
            hiring decisions across your recruitment process.
          </p>

          <section className="ac-hero">
            <div>
              <div className="ac-eyebrow" style={{ color: "#a9e9c6" }}>
                HIRING GOVERNANCE
              </div>
              <h2>Better decisions. Clearer approvals.</h2>
              <p>
                Keep hiring decisions organized, transparent,
                and aligned with your approval process.
              </p>
            </div>
            <div className="ac-hero-tag">
              Secure Hiring Review
            </div>
          </section>

          <section className="ac-stats">
            {[
              { label: "My Decisions", value: items.length, icon: "▤" },
              { label: "Pending Review", value: pendingCount, icon: "◷" },
              { label: "Completed Decisions", value: completedCount, icon: "✓" }
            ].map((stat) => (
              <div className="ac-stat" key={stat.label}>
                <div className="ac-stat-top">
                  <span>{stat.label}</span>
                  <span className="ac-stat-icon">{stat.icon}</span>
                </div>
                <div className="ac-stat-value">
                  {loading ? "—" : error ? "—" : stat.value}
                </div>
              </div>
            ))}
          </section>

          <section className="ac-panel">
            <div className="ac-panel-header">
              <div>
                <h2>My Hiring Decisions</h2>
                <p>
                  Assigned hiring decisions and their current status
                </p>
              </div>
              <div className="ac-filters">
                {[
                  ["all", "All"],
                  ["pending", "Pending"],
                  ["completed", "Completed"]
                ].map(([value, label]) => (
                  <button
                    type="button"
                    key={value}
                    className={
                      "ac-filter" +
                      (filter === value ? " selected" : "")
                    }
                    onClick={() => setFilter(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {loading && (
              <div className="ac-empty">
                <p>Loading your hiring decisions...</p>
              </div>
            )}

            {!loading && error && (
              <div className="ac-error" role="alert">
                {error}
              </div>
            )}

            {!loading && !error && visibleItems.length === 0 && (
              <div className="ac-empty">
                <div className="ac-empty-icon">✓</div>
                <h3>
                  {filter === "pending"
                    ? "No Pending Decisions"
                    : filter === "completed"
                    ? "No Completed Decisions"
                    : "You're All Caught Up"}
                </h3>
                <p>
                  {filter === "all"
                    ? "There are no hiring decisions assigned to your account at the moment. New decisions will appear here when available."
                    : "No hiring decisions match this filter right now."}
                </p>
              </div>
            )}

            {!loading && !error && visibleItems.map((item, index) => (
              <div
                className="ac-decision"
                key={`${item.offer_id}-${item.step_name}-${index}`}
              >
                <div>
                  <h3>{item.job_title || "Hiring Decision"}</h3>
                  <p>{item.step_name || "Hiring review"}</p>
                </div>
                <span className="ac-status">
                  {item.step_status || "Pending"}
                </span>
              </div>
            ))}
          </section>

          <p className="ac-note">
            Hiring decision information only. Financial details are
            not displayed. Approval actions will be enabled after
            authorization and security checks are completed.
          </p>
        </main>
      </div>
    </div>
  );
}

