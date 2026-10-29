"use client";

import Link from "next/link";
import ATSNavigation from "@/components/ATSNavigation";

const operations = [
  { number: "00", label: "TASK PLANNING", title: "Recruitment Task Management", description: "Create, prioritize, and track recruitment tasks and deadlines.", href: "/app/recruitment-operations/tasks", action: "Manage Tasks", icon: "☑" },
  {
    number: "01",
    label: "REQUISITIONS",
    title: "Job Management",
    description: "Create and manage open positions, job requirements, and hiring ownership.",
    href: "/app/jobs",
    action: "Manage Jobs",
    icon: "▣",
  },
  {
    number: "02",
    label: "TALENT FLOW",
    title: "Candidate Pipeline",
    description: "Keep every candidate moving through screening, interviews, and final decisions.",
    href: "/app/pipeline",
    action: "View Pipeline",
    icon: "⇄",
  },
  {
    number: "03",
    label: "SCHEDULING & FEEDBACK",
    title: "Interview Management",
    description: "Coordinate interviews, manage schedules, and review interviewer evaluations.",
    href: "/app/interviews",
    action: "Manage Interviews",
    icon: "▤",
  },
  {
    number: "04",
    label: "OFFER LIFECYCLE",
    title: "Offer Management",
    description: "Prepare offers and follow approval progress and candidate responses.",
    href: "/app/offers",
    action: "Manage Offers",
    icon: "▦",
  },
  {
    number: "05",
    label: "HIRING DECISIONS",
    title: "Approval Center",
    description: "Access assigned hiring decisions and the existing approval workflow.",
    href: "/app/approvals",
    action: "Open Approvals",
    icon: "✓",
  },
  {
    number: "06",
    label: "PERFORMANCE INSIGHTS",
    title: "Recruitment Analytics",
    description: "Explore hiring trends, funnel performance, and recruitment reports.",
    href: "/app/reports",
    action: "Explore Reports",
    icon: "◫",
  },
];

const styles = `
  .ops-page {
    width: 100%;
    max-width: none;
    min-height: 100vh;
    margin: 0;
    padding: 0;
    background: #f5f8f6;
    color: #18392e;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 14px;
    line-height: 1.5;
  }
  .ops-page *, .ops-page *::before, .ops-page *::after { box-sizing: border-box; }
  .ops-page h1, .ops-page h2, .ops-page h3 {
    font-family: Arial, Helvetica, sans-serif;
    letter-spacing: -.55px;
    line-height: 1.2;
    margin: 0;
    font-weight: 800;
  }
  .ops-layout { display: grid; grid-template-columns: 252px minmax(0, 1fr); min-height: 100vh; }
  .ops-sidebar {
    background: #fff;
    border-right: 1px solid #e5ece7;
    padding: 27px 14px 22px;
  }
  .ops-brand { display: flex; align-items: center; gap: 11px; padding: 3px 13px 32px; }
  .ops-mark {
    width: 36px; height: 36px; display: grid; place-items: center;
    background: #14583e; border-radius: 11px; color: #fff;
    font-size: 22px; font-weight: 800;
  }
  .ops-brand-name { display: block; font-size: 17px; font-weight: 850; letter-spacing: -.5px; color: #173e30; }
  .ops-brand-sub { display: block; margin-top: 3px; font-size: 9px; font-weight: 800; letter-spacing: 1.7px; color: #83978a; }
  .ops-nav-label { font-size: 10px; font-weight: 800; letter-spacing: 1.5px; color: #93a49a; padding: 0 13px 12px; }
  .ops-nav { display: flex; flex-direction: column; gap: 4px; }
  .ops-nav a {
    display: flex; align-items: center; gap: 12px; min-height: 40px;
    padding: 10px 12px; border-radius: 10px; text-decoration: none;
    color: #5d7267; font-size: 12px; font-weight: 650; transition: background .15s;
  }
  .ops-nav a span { font-size: 15px; width: 17px; text-align: center; flex: 0 0 17px; }
  .ops-nav a:hover { background: #f0f6f2; color: #166144; }
  .ops-nav a.active { background: #e5f2e9; color: #145f42; font-weight: 800; }
  .ops-main { min-width: 0; padding: 0 clamp(22px, 3.4vw, 54px) 65px; }
  .ops-topbar {
    min-height: 77px; display: flex; align-items: center; justify-content: space-between;
    gap: 14px; border-bottom: 1px solid #e5ece7; margin-bottom: 30px;
  }
  .ops-breadcrumb { font-size: 12px; color: #718579; font-weight: 650; }
  .ops-breadcrumb strong { color: #176144; font-weight: 800; }
  .ops-toplink {
    display: inline-flex; align-items: center; gap: 8px; padding: 10px 15px;
    border: 1px solid #d8e7dc; border-radius: 10px; background: #fff;
    color: #226247; text-decoration: none; font-size: 12px; font-weight: 800;
  }
  .ops-inner { max-width: 1260px; margin: 0 auto; }
  .ops-hero {
    display: grid; grid-template-columns: minmax(0, 1fr) 270px; gap: 28px;
    background: linear-gradient(115deg, #103c2c 0%, #176448 72%, #217755 100%);
    border-radius: 22px; padding: 36px 38px; color: #fff;
    box-shadow: 0 12px 32px rgba(19, 74, 49, .10);
    overflow: hidden;
  }
  .ops-hero .ops-kicker { font-size: 10px; font-weight: 850; letter-spacing: 2px; color: #b3e3c9; margin-bottom: 14px; }
  .ops-page .ops-hero h1 {
    color: #fff !important; font-family: Arial, Helvetica, sans-serif !important;
    font-size: clamp(27px, 3vw, 38px); line-height: 1.16; margin-bottom: 14px;
    letter-spacing: -1px; font-weight: 850;
  }
  .ops-hero p { max-width: 590px; color: #d7eae0; font-size: 13px; line-height: 1.8; margin: 0; }
  .ops-hero-cta {
    display: inline-flex; align-items: center; gap: 9px; margin-top: 23px;
    padding: 11px 16px; border-radius: 10px; background: #fff; color: #14563d;
    font-size: 12px; font-weight: 850; text-decoration: none;
  }
  .ops-hero-side { border: 1px solid rgba(255,255,255,.18); background: rgba(255,255,255,.075); border-radius: 16px; padding: 22px; align-self: stretch; }
  .ops-hero-side-label { color: #bce2cd; font-size: 10px; font-weight: 800; letter-spacing: 1.5px; }
  .ops-hero-side strong { display: block; font-size: 39px; font-weight: 850; line-height: 1.1; color: #fff; margin: 13px 0 9px; }
  .ops-hero-side p { color: #e1eee6; font-size: 12px; line-height: 1.65; }
  .ops-hero-dots { display: flex; gap: 7px; margin-top: 24px; }
  .ops-hero-dots span { height: 5px; flex: 1; border-radius: 6px; background: #a5d7ba; opacity: .8; }
  .ops-section-head { display: flex; justify-content: space-between; align-items: end; gap: 18px; margin: 34px 0 18px; }
  .ops-section-eyebrow { color: #23865e; font-size: 10px; letter-spacing: 1.5px; font-weight: 850; margin-bottom: 7px; }
  .ops-page .ops-section-head h2 { color: #173d2f !important; font-size: 23px; font-weight: 850; }
  .ops-section-head p { margin: 6px 0 0; color: #7b8d81; font-size: 12px; }
  .ops-section-count { white-space: nowrap; font-size: 11px; color: #527562; background: #e7f1ea; border: 1px solid #d9e9de; padding: 7px 12px; border-radius: 999px; font-weight: 750; }
  .ops-grid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 16px; }
  .ops-card {
    display: flex; gap: 18px; align-items: flex-start; min-width: 0; min-height: 188px;
    padding: 25px; border-radius: 16px; background: #fff;
    border: 1px solid #e3ebe5; color: #173d2f; text-decoration: none;
    box-shadow: 0 3px 13px rgba(24, 63, 41, .025);
    transition: transform .15s, border-color .15s, box-shadow .15s;
  }
  .ops-card:hover { transform: translateY(-2px); border-color: #a7ceb5; box-shadow: 0 12px 25px rgba(21, 75, 46, .08); }
  .ops-card-icon {
    flex: 0 0 48px; width: 48px; height: 48px; display: grid; place-items: center;
    background: #e9f5ed; border-radius: 13px; color: #1b7451; font-size: 24px;
  }
  .ops-card-body { min-width: 0; flex: 1; display: flex; flex-direction: column; align-self: stretch; }
  .ops-card-label { font-size: 9px; color: #28875e; font-weight: 850; letter-spacing: 1.25px; margin: 2px 0 8px; }
  .ops-page .ops-card h3 { font-size: 17px; color: #173e2f !important; font-weight: 850; margin: 0 0 9px; }
  .ops-card-description { font-size: 12px; color: #74877a; line-height: 1.65; margin: 0 0 17px; max-width: 380px; }
  .ops-card-action { margin-top: auto; color: #16734b; font-size: 12px; font-weight: 850; }
  .ops-bottom { margin-top: 25px; padding: 16px 19px; border: 1px solid #e1ebe3; background: #f0f6f1; border-radius: 12px; display: flex; align-items: center; gap: 12px; color: #567566; font-size: 12px; }
  .ops-bottom strong { color: #225d42; }
  @media (max-width: 1120px) { .ops-hero { grid-template-columns: minmax(0,1fr); } .ops-hero-side { display: none; } }
  @media (max-width: 920px) { .ops-layout { grid-template-columns: 205px minmax(0,1fr); } .ops-card { padding: 19px; gap: 13px; } .ops-card-icon { flex-basis: 40px; width: 40px; height: 40px; } }
  @media (max-width: 760px) {
    .ops-layout { display: block; }
    .ops-sidebar { padding: 14px 16px 10px; border-right: 0; border-bottom: 1px solid #e5ece7; }
    .ops-brand { padding: 0 0 14px; }
    .ops-nav-label { display: none; }
    .ops-nav { flex-direction: row; overflow-x: auto; padding-bottom: 5px; }
    .ops-nav a { white-space: nowrap; }
    .ops-main { padding: 0 17px 42px; }
    .ops-topbar { min-height: 65px; margin-bottom: 20px; }
    .ops-hero { padding: 27px 23px; }
    .ops-grid { grid-template-columns: 1fr; }
    .ops-card { min-height: 160px; }
  }
  @media (prefers-reduced-motion: reduce) { .ops-page * { transition: none !important; } }
`;

export default function RecruitmentOperationsPage() {
  return (
    <main className="ops-page">
      <style>{styles}</style>
      <div className="ops-layout">
        <aside className="ops-sidebar">
          <div className="ops-brand">
            <span className="ops-mark" aria-hidden="true">I</span>
            <span>
              <span className="ops-brand-name">Inspire Match</span>
              <span className="ops-brand-sub">TALENT INTELLIGENCE</span>
            </span>
          </div>
          <div className="ops-nav-label">WORKSPACE</div>
          <ATSNavigation className="ops-nav" />
        </aside>

        <div className="ops-main">
          <div className="ops-topbar">
            <span className="ops-breadcrumb">Workspace &nbsp;/&nbsp; <strong>Recruitment Operations</strong></span>
            <Link className="ops-toplink" href="/app/dashboard">← Dashboard</Link>
          </div>

          <div className="ops-inner">
            <section className="ops-hero">
              <div>
                <div className="ops-kicker">YOUR RECRUITMENT COMMAND CENTER</div>
                <h1>Recruitment Operations</h1>
                <p>Manage the entire hiring journey from one connected workspace. Organize requisitions, move talent forward, coordinate interviews, and keep every decision on track.</p>
                <Link className="ops-hero-cta" href="/app/jobs">Explore Open Jobs <span aria-hidden="true">→</span></Link>
              </div>
              <div className="ops-hero-side">
                <div className="ops-hero-side-label">CONNECTED WORKSPACE</div>
                <strong>07</strong>
                <p>Recruitment modules, one streamlined hiring journey.</p>
                <div className="ops-hero-dots" aria-hidden="true">
                  {operations.map((item) => <span key={item.number} />)}
                </div>
              </div>
            </section>

            <div className="ops-section-head">
              <div>
                <div className="ops-section-eyebrow">YOUR WORKSPACE</div>
                <h2>Manage your operations</h2>
                <p>Everything your recruitment team needs, organized in one place.</p>
              </div>
              <span className="ops-section-count">7 Modules</span>
            </div>

            <div className="ops-grid">
              {operations.map((item) => (
                <Link className="ops-card" href={item.href} key={item.href}>
                  <span className="ops-card-icon" aria-hidden="true">{item.icon}</span>
                  <span className="ops-card-body">
                    <span className="ops-card-label">{item.number} / {item.label}</span>
                    <h3>{item.title}</h3>
                    <span className="ops-card-description">{item.description}</span>
                    <span className="ops-card-action">{item.action} &nbsp; →</span>
                  </span>
                </Link>
              ))}
            </div>

            <div className="ops-bottom">
              <span aria-hidden="true">✦</span>
              <span><strong>Built for connected hiring.</strong> Your task workspace and six existing recruitment modules are connected here.</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
