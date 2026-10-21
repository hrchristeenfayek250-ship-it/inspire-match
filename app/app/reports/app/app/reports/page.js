
"use client";

import Link from "next/link";
import ATSNavigation from "@/components/ATSNavigation";

const reports = [
  {
    title: "Recruitment Funnel",
    description: "Current candidate distribution by stage",
    status: "Available",
  },
  {
    title: "Time to Hire",
    description: "Average application-to-hire duration",
    status: "Available",
  },
  {
    title: "Time to Fill",
    description: "Average job opening-to-closure duration",
    status: "Available",
  },
  {
    title: "Stage Aging",
    description: "Time spent in current pipeline stages",
    status: "Available",
  },
];

export default function ReportsPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f6f8fb",
        padding: "40px 24px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
        }}
      >
        <Link
          href="/app/dashboard"
          style={{
            color: "#315f50",
            textDecoration: "none",
            fontWeight: 700,
          }}
        >
          ← Back to Dashboard
        </Link>

        <div style={{ margin: "30px 0" }}>
          <h1
            style={{
              fontSize: 32,
              color: "#1e293b",
              marginBottom: 8,
            }}
          >
            Inspire Reports Center
          </h1>

          <p style={{ color: "#8994a3" }}>
            Recruitment analytics and intelligence reports
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 20,
          }}
        >
          {reports.map((report) => (
            <Link
              key={report.title}
              href="/app/dashboard"
              style={{
                background: "#fff",
                border: "1px solid #e6eaf0",
                borderRadius: 16,
                padding: 24,
                textDecoration: "none",
              }}
            >
              <div
                style={{
                  color: "#315f50",
                  fontSize: 12,
                  fontWeight: 800,
                  marginBottom: 15,
                }}
              >
                {report.status}
              </div>

              <h2
                style={{
                  color: "#1e293b",
                  fontSize: 18,
                }}
              >
                {report.title}
              </h2>

              <p style={{ color: "#8994a3", fontSize: 13 }}>
                {report.description}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
