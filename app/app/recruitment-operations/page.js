"use client";

import Link from "next/link";
import ATSNavigation from "@/components/ATSNavigation";

const modules = [
  { number: "01", title: "Job Requisitions", description: "Manage open roles, hiring requirements, priorities, and assigned owners.", href: "/app/jobs", action: "Manage jobs" },
  { number: "02", title: "Candidate Pipeline", description: "Track applicants across screening, interviews, shortlisting, and hiring.", href: "/app/pipeline", action: "Open pipeline" },
  { number: "03", title: "Interview Operations", description: "Coordinate interviews, rescheduling, evaluations, and hiring recommendations.", href: "/app/interviews", action: "Manage interviews" },
  { number: "04", title: "Offer Management", description: "Prepare offers and follow their approval and candidate response status.", href: "/app/offers", action: "View offers" },
  { number: "05", title: "Approval Center", description: "Review assigned hiring decisions through the existing approval process.", href: "/app/approvals", action: "Open approvals" },
  { number: "06", title: "Recruitment Reports", description: "Explore recruitment performance, pipeline health, and hiring analytics.", href: "/app/reports", action: "View reports" },
];

export default function RecruitmentOperationsPage() {
  return (
    <main className="ro-page">
      <style>{`
        .ro-page { min-height:100vh; background:#f5f8f6; color:#173d31; font-family:inherit; }
        .ro-shell { display:grid; grid-template-columns:250px minmax(0,1fr); min-height:100vh; }
        .ro-sidebar { background:#fff; border-right:1px solid #e3ece6; padding:26px 16px; }
        .ro-brand { font-size:20px; font-weight:850; letter-spacing:-.6px; padding:8px 12px 28px; }
        .ro-nav { display:flex; flex-direction:column; gap:5px; }
        .ro-nav a { display:flex; gap:10px; align-items:center; padding:11px 12px; border-radius:11px; color:#547267; text-decoration:none; font-size:13px; font-weight:650; }
        .ro-nav a:hover,.ro-nav a.active { color:#126342; background:#e9f4ed; }
        .ro-content { padding:36px clamp(18px,4vw,58px) 70px; min-width:0; max-width:1500px; width:100%; margin:auto; }
        .ro-eyebrow { font-size:11px; font-weight:850; letter-spacing:2px; text-transform:uppercase; color:#16805a; }
        .ro-hero { background:linear-gradient(115deg,#103d2e,#166445); border-radius:24px; padding:36px; color:white; margin:16px 0 28px; }
        .ro-hero h1 { font-size:clamp(27px,3vw,40px); margin:0 0 12px; letter-spacing:-1px; }
        .ro-hero p { max-width:680px; color:#d8eae0; line-height:1.7; margin:0; font-size:14px; }
        .ro-heading { display:flex; justify-content:space-between; gap:12px; align-items:end; margin:0 0 17px; }
        .ro-heading h2 { font-size:21px; margin:0; letter-spacing:-.4px; }
        .ro-heading span { color:#71877c; font-size:12px; }
        .ro-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:16px; }
        .ro-card { display:flex; flex-direction:column; min-height:235px; background:white; border:1px solid #e0eae3; border-radius:18px; padding:24px; text-decoration:none; color:inherit; transition:transform .15s,border-color .15s,box-shadow .15s; }
        .ro-card:hover { transform:translateY(-2px); border-color:#a4cdb5; box-shadow:0 12px 28px #123e2812; }
        .ro-number { display:inline-grid; place-items:center; width:37px; height:37px; border-radius:10px; background:#eaf5ee; color:#17734e; font-size:12px; font-weight:800; }
        .ro-card h3 { font-size:17px; margin:19px 0 8px; }
        .ro-card p { font-size:13px; color:#71877c; line-height:1.65; margin:0 0 20px; flex:1; }
        .ro-action { color:#14754c; font-size:13px; font-weight:800; }
        .ro-footer { margin-top:24px; color:#7a8e83; font-size:12px; }
        @media(max-width:1050px) { .ro-grid { grid-template-columns:repeat(2,minmax(0,1fr)); } }
        @media(max-width:760px) { .ro-shell { display:block; } .ro-sidebar { border-right:0; border-bottom:1px solid #e3ece6; padding:12px; } .ro-brand { padding:6px 8px 10px; } .ro-nav { flex-direction:row; overflow-x:auto; padding-bottom:5px; } .ro-nav a { white-space:nowrap; } .ro-content { padding:22px 16px 48px; } .ro-hero { padding:27px 22px; } }
        @media(max-width:540px) { .ro-grid { grid-template-columns:1fr; } .ro-card { min-height:195px; } }
      `}</style>
      <div className="ro-shell">
        <aside className="ro-sidebar">
          <div className="ro-brand">◈ Inspire Match</div>
          <ATSNavigation className="ro-nav" />
        </aside>
        <div className="ro-content">
          <div className="ro-eyebrow">Inspire Match / Operations</div>
          <section className="ro-hero">
            <h1>Recruitment Operations</h1>
            <p>One workspace for the day-to-day hiring journey. Move between requisitions, candidate pipelines, interviews, offers, approvals, and reporting without losing context.</p>
          </section>
          <div className="ro-heading">
            <h2>Operations workspace</h2>
            <span>6 connected modules</span>
          </div>
          <div className="ro-grid">
            {modules.map((module) => (
              <Link href={module.href} className="ro-card" key={module.href}>
                <span className="ro-number">{module.number}</span>
                <h3>{module.title}</h3>
                <p>{module.description}</p>
                <span className="ro-action">{module.action} →</span>
              </Link>
            ))}
          </div>
          <p className="ro-footer">This workspace links to existing modules. No workflow permissions or offer financial data are changed.</p>
        </div>
      </div>
    </main>
  );
}
