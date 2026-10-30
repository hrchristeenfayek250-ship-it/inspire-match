"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import ATSNavigation from "@/components/ATSNavigation";

const operations = [
  { number: "00", label: "TASK PLANNING", title: "Recruitment Task Management", description: "Create, prioritize, and track recruitment tasks and deadlines.", href: "/app/recruitment-operations/tasks", action: "Manage Tasks", icon: "☑" },
  { number: "00A", label: "WORKFLOW LIBRARY", title: "Recruitment Workflow Playbooks", description: "Launch structured hiring checklists with pre-set deadlines and team ownership.", href: "/app/recruitment-operations/playbooks", action: "Explore Playbooks", icon: "✧" },
  { number: "00B", label: "SMART AUTOMATION", title: "Workflow Automation Settings", description: "Configure stage-triggered recruitment tasks, priorities and due dates for your team.", href: "/app/recruitment-operations/automation", action: "Configure Automations", icon: "⚙" },
  { number: "00C", label: "AUTOMATION INTELLIGENCE", title: "Automation Activity & Performance", description: "Track automatically generated tasks, completion trends, stage performance, and overdue follow-ups.", href: "/app/recruitment-operations/analytics", action: "View Automation Analytics", icon: "◩" },
  { number: "00D", label: "RESOURCE PLANNING", title: "Recruitment Capacity & Resource Planning", description: "Balance recruiter workloads, spot capacity risks, and prioritize unassigned recruitment tasks.", href: "/app/recruitment-operations/capacity", action: "Plan Team Capacity", icon: "▥" },
  { number: "00E", label: "RESOURCE FORECASTING", title: "Recruitment Resource Forecasting", description: "Forecast upcoming task demand, team capacity gaps, and staffing needs with adjustable planning scenarios.", href: "/app/recruitment-operations/forecasting", action: "Explore Forecast", icon: "▤" },
  { number: "00F", label: "BOTTLENECK INTELLIGENCE", title: "Recruitment Bottleneck Intelligence", description: "Identify aging candidates, past-due interviews, overdue tasks, and priority follow-up risks.", href: "/app/recruitment-operations/bottlenecks", action: "Explore Bottlenecks", icon: "◇" },
  { number: "00G", label: "SLA ESCALATIONS", title: "Recruitment SLA & Escalation Intelligence", description: "Prioritize overdue recruitment tasks, identify escalation severity, and guide manager follow-up.", href: "/app/recruitment-operations/escalations", action: "Review Escalations", icon: "⚑" },
  { number: "00H", label: "HANDOVER & CONTINUITY", title: "Recruitment Handover & Continuity", description: "Prepare recruiter handovers, review ownership gaps, and export priority action briefs for smooth transitions.", href: "/app/recruitment-operations/handover", action: "Prepare Handover", icon: "↗" },
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
  .ops-metrics { display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:13px;margin-top:22px; }
  .ops-metric {background:#fff;border:1px solid #e3ebe5;border-radius:15px;padding:20px;}
  .ops-metric strong {display:block;font-size:29px;color:#176b49;margin:6px 0;}
  .ops-metric span {font-size:12px;color:#698173;font-weight:700;}
  .ops-monitor {display:grid;grid-template-columns:1.1fr 1fr;gap:16px;margin-top:17px;}
  .ops-panel {background:#fff;border:1px solid #e3ebe5;border-radius:16px;padding:22px;min-width:0;}
  .ops-panel h3 {font-size:16px!important;margin-bottom:13px!important;}
  .ops-monitor-row {display:flex;justify-content:space-between;gap:12px;border-top:1px solid #edf2ee;padding:12px 0;font-size:12px;align-items:center;}
  .ops-monitor-row small {display:block;color:#829488;margin-top:4px;}
  .ops-monitor-row b {color:#176b49;white-space:nowrap;}
  .ops-progress-track {height:10px;background:#e9f1eb;border-radius:999px;overflow:hidden;margin:11px 0 18px;}
  .ops-progress-fill {height:100%;background:#207e55;border-radius:999px;transition:width .2s;}
  .ops-stage-line {display:flex;justify-content:space-between;gap:12px;font-size:12px;color:#5b7465;padding:9px 0;border-top:1px solid #edf2ee;}
  .ops-stage-line b {color:#174c36;}
  .ops-sla-grid {display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:16px 0;}
  .ops-sla-stat {border:1px solid #e3ebe5;background:#f8fbf8;border-radius:12px;padding:15px;}
  .ops-sla-stat strong {display:block;font-size:25px;color:#176b49;margin-top:6px;}
  .ops-sla-stat span {font-size:11px;color:#637c6d;font-weight:700;}
  .ops-sla-alert {padding:12px;border-radius:10px;background:#fff5ed;border:1px solid #f2dfcc;margin:8px 0;color:#885333;font-size:12px;}
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
    .ops-metrics {grid-template-columns:repeat(2,minmax(0,1fr));}
    .ops-monitor {grid-template-columns:1fr;}
    .ops-sla-grid {grid-template-columns:1fr;}
    .ops-card { min-height: 160px; }
  }
  @media (prefers-reduced-motion: reduce) { .ops-page * { transition: none !important; } }
`;

export default function RecruitmentOperationsPage() {
  const [tasks,setTasks]=useState([]);
  const [userId,setUserId]=useState("");
  const [taskError,setTaskError]=useState("");
  const [selectedRecruiter,setSelectedRecruiter]=useState("all");
  const [slaWindow,setSlaWindow]=useState(3);
  const [loadingTasks,setLoadingTasks]=useState(true);
  useEffect(()=>{
    let active=true;
    (async()=>{
      const {data:auth,error:authError}=await supabase.auth.getUser();
      if(!active)return;
      if(authError||!auth?.user){setTaskError("Sign in to view live task analytics.");setLoadingTasks(false);return;}
      setUserId(auth.user.id);
      const [taskResult]=await Promise.all([
        supabase.from("recruitment_tasks").select("id,title,status,due_date,priority,assigned_to,company_id,created_by").order("created_at",{ascending:false}).limit(1000)
      ]);
      if(!active)return;
      if(taskResult.error)setTaskError(taskResult.error.message);else setTasks(taskResult.data||[]);
      if(active)setLoadingTasks(false);
    })();
    return()=>{active=false};
  },[]);
  const today=new Date().toLocaleDateString("en-CA");
  const activeTasks=tasks.filter(t=>t.status!=="completed");
  const overdue=activeTasks.filter(t=>t.due_date&&t.due_date<today);
  const completed=tasks.filter(t=>t.status==="completed");
  const dueSoon=activeTasks.filter(t=>t.due_date&&t.due_date>=today).sort((a,b)=>a.due_date.localeCompare(b.due_date)).slice(0,5);
  const filteredTasks=selectedRecruiter==="all"?tasks:tasks.filter(t=>t.assigned_to===selectedRecruiter);
  const daysUntil=(date)=>{if(!date)return null;const [y,m,d]=date.split("-").map(Number);if(!y||!m||!d)return null;const now=new Date();return Math.round((Date.UTC(y,m-1,d)-Date.UTC(now.getFullYear(),now.getMonth(),now.getDate()))/86400000);};
  const slaTasks=filteredTasks.filter(t=>t.status!=="completed"&&t.due_date).map(t=>({...t,daysRemaining:daysUntil(t.due_date)})).filter(t=>t.daysRemaining!==null);
  const slaBreached=slaTasks.filter(t=>t.daysRemaining<0).sort((a,b)=>a.daysRemaining-b.daysRemaining);
  const slaAtRisk=slaTasks.filter(t=>t.daysRemaining>=0&&t.daysRemaining<=slaWindow).sort((a,b)=>a.daysRemaining-b.daysRemaining);
  const slaHealthy=slaTasks.filter(t=>t.daysRemaining>slaWindow);
  const unassignedTasks=filteredTasks.filter(t=>t.status!=="completed"&&!t.assigned_to).sort((a,b)=>(a.due_date||"9999").localeCompare(b.due_date||"9999"));
  const highPriorityTasks=filteredTasks.filter(t=>t.status!=="completed"&&["urgent","high"].includes(String(t.priority||"").toLowerCase())).sort((a,b)=>(a.due_date||"9999").localeCompare(b.due_date||"9999"));
  const stageCounts=[["To Do",filteredTasks.filter(t=>t.status==="todo").length],["In Progress",filteredTasks.filter(t=>t.status==="in_progress").length],["Blocked",filteredTasks.filter(t=>t.status==="blocked").length],["Completed",filteredTasks.filter(t=>t.status==="completed").length]];
  const completionRate=filteredTasks.length?Math.round(100*stageCounts[3][1]/filteredTasks.length):0;
  const workload=useMemo(()=>{
    const counts=new Map();
    for(const t of tasks){if(!t.assigned_to)continue;const key=`${t.company_id||""}:${t.assigned_to}`;const entry=counts.get(key)||{id:t.assigned_to,companyId:t.company_id,total:0,open:0,completed:0,overdue:0};entry.total++;if(t.status==="completed")entry.completed++;else{entry.open++;if(t.due_date&&t.due_date<today)entry.overdue++;}counts.set(key,entry);}
    return [...counts.values()].sort((a,b)=>b.open-a.open);
  },[tasks,today]);
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
                <strong>{String(operations.length).padStart(2, "0")}</strong>
                <p>Recruitment modules, one streamlined hiring journey.</p>
                <div className="ops-hero-dots" aria-hidden="true">
                  {operations.map((item) => <span key={item.number} />)}
                </div>
              </div>
            </section>

            <section aria-label="Live recruitment task overview">
              <div className="ops-section-head"><div><div className="ops-section-eyebrow">LIVE TASK INTELLIGENCE</div><h2>Team operations overview</h2><p>Real-time recruitment task progress from your accessible workspace.</p></div><Link className="ops-section-count" href="/app/recruitment-operations/tasks">Manage Tasks →</Link></div>
              {taskError&&<p role="alert" style={{color:"#a13f38"}}>{taskError}</p>}
              <div className="ops-metrics">{[["Total Tasks",tasks.length],["In Progress",tasks.filter(t=>t.status==="in_progress").length],["Overdue",overdue.length],["Completed",completed.length]].map(([name,value])=><div className="ops-metric" key={name}><span>{name}</span><strong>{loadingTasks?"—":value}</strong></div>)}</div>
              <div className="ops-monitor">
                <div className="ops-panel"><h3>Recruiter Workload</h3><label style={{display:"block",fontSize:11,color:"#698173",marginBottom:12}}>View recruiter details <select aria-label="Select recruiter for task analytics" value={selectedRecruiter} onChange={e=>setSelectedRecruiter(e.target.value)} style={{display:"block",width:"100%",padding:10,border:"1px solid #d8e7dc",borderRadius:9,background:"#fff",color:"#174c36",marginTop:6}}><option value="all">All Recruiters</option>{[...new Set(workload.map(w=>w.id))].map(id=><option key={id} value={id}>{id===userId?"You":`Team Member · ${id.slice(0,8)}`}</option>)}</select></label>{loadingTasks?<p>Loading team workload...</p>:workload.length?workload.map(w=><div className="ops-monitor-row" key={`${w.companyId}:${w.id}`}><div><strong>{w.id===userId?"You":`Team Member · ${w.id.slice(0,8)}`}</strong><small>{w.open} open · {w.completed} completed · {w.overdue} overdue</small></div><b>{w.total} tasks</b></div>):<p style={{color:"#819286",fontSize:12}}>No assigned tasks yet.</p>}</div>
                <div className="ops-panel"><h3>Upcoming & Overdue</h3>{loadingTasks?<p>Loading deadlines...</p>:[...overdue.sort((a,b)=>a.due_date.localeCompare(b.due_date)).slice(0,3),...dueSoon].slice(0,6).length?[...overdue.sort((a,b)=>a.due_date.localeCompare(b.due_date)).slice(0,3),...dueSoon].slice(0,6).map(t=><div className="ops-monitor-row" key={t.id}><div><strong>{t.title}</strong><small>{t.due_date} · {t.priority}</small></div><b style={{color:t.due_date<today?"#b34c41":"#176b49"}}>{t.due_date<today?"Overdue":"Upcoming"}</b></div>):<p style={{color:"#819286",fontSize:12}}>No upcoming or overdue tasks.</p>}</div>
              </div>
              <div className="ops-panel" style={{marginTop:17}}><div style={{display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap",alignItems:"center"}}><h3 style={{margin:0}}>Task Completion & Status Breakdown</h3><span style={{fontSize:12,color:"#557a63"}}>{selectedRecruiter==="all"?"All Recruiters":selectedRecruiter===userId?"Your Tasks":"Selected Recruiter"}</span></div><div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginTop:12}}><span style={{fontSize:12,color:"#698173"}}>Completion rate</span><strong style={{fontSize:25,color:"#176b49"}}>{loadingTasks?"—":`${completionRate}%`}</strong></div><div className="ops-progress-track"><div className="ops-progress-fill" style={{width:`${completionRate}%`}}/></div>{stageCounts.map(([name,n])=><div className="ops-stage-line" key={name}><span>{name}</span><b>{loadingTasks?"—":n}</b></div>)}<p style={{fontSize:11,color:"#829488",marginBottom:0}}>Based on {filteredTasks.length} accessible tasks. Select a recruiter above to see individual progress.</p></div>
              <div className="ops-panel" style={{marginTop:17}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}><div><div className="ops-section-eyebrow">DEADLINE RISK INTELLIGENCE</div><h3 style={{margin:0}}>Recruitment SLA Monitoring</h3><p style={{fontSize:12,color:"#73877b",margin:"8px 0 0"}}>Early warnings based on task due dates. Completed tasks are excluded.</p></div><label style={{fontSize:11,color:"#698173"}}>Risk window <select value={slaWindow} onChange={e=>setSlaWindow(Number(e.target.value))} aria-label="SLA risk window" style={{display:"block",marginTop:6,padding:9,border:"1px solid #d8e7dc",borderRadius:9,background:"#fff",color:"#174c36"}}><option value={1}>1 day</option><option value={3}>3 days</option><option value={7}>7 days</option></select></label></div><div className="ops-sla-grid">{[["SLA Breached",slaBreached.length],["At Risk",slaAtRisk.length],["On Track",slaHealthy.length]].map(([name,value])=><div className="ops-sla-stat" key={name}><span>{name}</span><strong>{loadingTasks?"—":value}</strong></div>)}</div>{!loadingTasks&&(slaBreached.length||slaAtRisk.length)?<div aria-label="SLA alerts">{[...slaBreached,...slaAtRisk].slice(0,8).map(t=><div className="ops-sla-alert" key={t.id}><div style={{display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}><strong>{t.title}</strong><b>{t.daysRemaining<0?`${Math.abs(t.daysRemaining)} day(s) overdue`:t.daysRemaining===0?"Due today":`Due in ${t.daysRemaining} day(s)`}</b></div><div style={{marginTop:5,fontSize:11}}>Due {t.due_date} · {t.priority} priority · {t.assigned_to?(t.assigned_to===userId?"Assigned to you":`Member ${t.assigned_to.slice(0,8)}`):"Unassigned"}</div></div>)}<Link href="/app/recruitment-operations/tasks" style={{display:"inline-block",marginTop:10,color:"#176b49",fontSize:12,fontWeight:800}}>Review tasks →</Link></div>:<p style={{fontSize:12,color:"#829488",marginBottom:0}}>{loadingTasks?"Checking SLA deadlines...":"No breached or at-risk tasks in the selected window."}</p>}<p style={{fontSize:11,color:"#829488",marginTop:14,marginBottom:0}}>Tasks without a due date are not included. These are dashboard alerts, not email notifications.</p></div>
            </section>

            <section className="ops-monitor" aria-label="Recruitment task triage" style={{marginTop:20}}>
              <div className="ops-panel"><div className="ops-section-eyebrow">OWNERSHIP GAPS</div><h3>Unassigned Tasks <span style={{color:"#ad7445"}}>({unassignedTasks.length})</span></h3><p style={{fontSize:12,color:"#74877a"}}>Open tasks without a responsible recruiter can delay the hiring process.</p>{unassignedTasks.length?unassignedTasks.slice(0,6).map(t=><div className="ops-monitor-row" key={t.id}><div><strong>{t.title}</strong><small>{t.due_date||"No due date"} · {t.priority||"Normal"} priority</small></div><span style={{color:"#a06437",fontWeight:700}}>Needs owner</span></div>):<p style={{color:"#819286",fontSize:12}}>All open tasks have an owner.</p>}<Link href="/app/recruitment-operations/tasks" style={{fontSize:12,color:"#176b49",fontWeight:800}}>Assign task owners →</Link></div>
              <div className="ops-panel"><div className="ops-section-eyebrow">PRIORITY QUEUE</div><h3>High-Priority Tasks <span style={{color:"#ad7445"}}>({highPriorityTasks.length})</span></h3><p style={{fontSize:12,color:"#74877a"}}>Urgent and high-priority open tasks, sorted by nearest deadline.</p>{highPriorityTasks.length?highPriorityTasks.slice(0,6).map(t=><div className="ops-monitor-row" key={t.id}><div><strong>{t.title}</strong><small>{t.due_date||"No due date"} · {t.assigned_to?(t.assigned_to===userId?"You":`Member ${t.assigned_to.slice(0,8)}`):"Unassigned"}</small></div><b>{t.priority}</b></div>):<p style={{color:"#819286",fontSize:12}}>No urgent or high-priority tasks.</p>}<Link href="/app/recruitment-operations/tasks" style={{fontSize:12,color:"#176b49",fontWeight:800}}>Open task queue →</Link></div>
            </section>

            <div className="ops-section-head">
              <div>
                <div className="ops-section-eyebrow">YOUR WORKSPACE</div>
                <h2>Manage your operations</h2>
                <p>Everything your recruitment team needs, organized in one place.</p>
              </div>
              <span className="ops-section-count">{operations.length} Modules</span>
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
              <span><strong>Built for connected hiring.</strong> Your task workspace, workflow playbooks and existing hiring modules are connected here.</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
