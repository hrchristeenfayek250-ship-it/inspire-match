"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import ATSNavigation from "@/components/ATSNavigation";

const PLAYBOOKS = [
  {
    id: "vacancy-launch", symbol: "▣", label: "REQUISITION SETUP", name: "Vacancy Launch",
    description: "Turn an approved hiring request into a structured recruitment plan.",
    steps: [
      { id: "intake", title: "Confirm job description and hiring requirements", offset: 0, priority: "high", details: "Validate role scope, must-have skills, seniority and success criteria." },
      { id: "alignment", title: "Run hiring manager intake and alignment meeting", offset: 1, priority: "high", details: "Agree evaluation criteria, interview stages, ownership and target timeline." },
      { id: "posting", title: "Prepare sourcing channels and publish vacancy", offset: 1, priority: "medium", details: "Activate approved job boards, outreach and referral channels." },
      { id: "shortlist", title: "Build and review the first candidate shortlist", offset: 4, priority: "high", details: "Screen applicants and share relevant profiles with the hiring manager." },
      { id: "update", title: "Share initial recruitment progress update", offset: 7, priority: "medium", details: "Summarize pipeline volume, bottlenecks, next steps and risks." }
    ]
  },
  {
    id: "sourcing", symbol: "✧", label: "TALENT PIPELINE", name: "Sourcing & Shortlisting",
    description: "Coordinate search strategy, screening and candidate recommendations.",
    steps: [
      { id: "channels", title: "Define candidate search strategy and target talent pools", offset: 0, priority: "high", details: "Confirm skills, locations, sourcing channels and target companies." },
      { id: "outreach", title: "Launch candidate outreach and referral campaign", offset: 1, priority: "high", details: "Contact relevant candidates and document responses." },
      { id: "screen", title: "Complete initial CV and eligibility screening", offset: 3, priority: "high", details: "Evaluate fit against agreed must-have requirements." },
      { id: "calls", title: "Complete recruiter screening calls", offset: 5, priority: "medium", details: "Record motivations, expectations, availability and open questions." },
      { id: "submit", title: "Present shortlisted candidates for manager review", offset: 7, priority: "high", details: "Submit structured candidate summaries and recommended next steps." }
    ]
  },
  {
    id: "interviews", symbol: "▤", label: "INTERVIEW DELIVERY", name: "Interview Coordination",
    description: "Keep interviews, feedback and decisions on schedule.",
    steps: [
      { id: "availability", title: "Confirm interviewer and candidate availability", offset: 0, priority: "high", details: "Resolve scheduling constraints and confirm the interview format." },
      { id: "invite", title: "Send interview invitations and meeting details", offset: 1, priority: "high", details: "Share the correct location or virtual meeting link." },
      { id: "brief", title: "Prepare evaluation criteria and interviewer briefing", offset: 1, priority: "medium", details: "Align the interview panel on scorecards and role competencies." },
      { id: "feedback", title: "Collect and consolidate interview evaluations", offset: 3, priority: "high", details: "Request scores, feedback and recommendations from interviewers." },
      { id: "decision", title: "Communicate next steps and update candidate status", offset: 4, priority: "high", details: "Coordinate a decision and keep candidates informed." }
    ]
  },
  {
    id: "offer", symbol: "✓", label: "CLOSING & HANDOFF", name: "Offer & Hiring Handoff",
    description: "Move an approved finalist from decision to offer and handoff.",
    steps: [
      { id: "approval", title: "Confirm compensation package and required approvals", offset: 0, priority: "high", details: "Validate offer terms and obtain required internal authorization." },
      { id: "draft", title: "Prepare and review the candidate offer", offset: 1, priority: "urgent", details: "Check the authorized terms and candidate-specific information." },
      { id: "send", title: "Coordinate offer delivery and candidate follow-up", offset: 2, priority: "high", details: "Communicate the offer and clarify outstanding questions." },
      { id: "response", title: "Record offer acceptance or decline", offset: 4, priority: "high", details: "Update the offer outcome in the existing recruitment workflow." },
      { id: "handoff", title: "Complete hiring documentation handoff", offset: 6, priority: "medium", details: "Share approved hiring details with the responsible onboarding team." }
    ]
  }
];

const field = { width: "100%", background: "#fff", border: "1px solid #d7e6dc", borderRadius: 10, padding: "12px", color: "#194f39", font: "inherit" };
const toLocalDate = () => { const d = new Date(); const p = n => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`; };
function datePlus(start, days) {
  const pieces = String(start).split("-").map(Number);
  if (pieces.length !== 3 || pieces.some(n => !Number.isFinite(n))) return "";
  return new Date(Date.UTC(pieces[0], pieces[1]-1, pieces[2]+days)).toISOString().slice(0,10);
}
const css = `
  .pb-root{min-height:100vh;background:#f5f8f6;color:#173c2c;font:14px Arial,Helvetica,sans-serif}
  .pb-root *{box-sizing:border-box}
  .pb-shell{display:grid;grid-template-columns:252px minmax(0,1fr);min-height:100vh}
  .pb-sidebar{background:#fff;border-right:1px solid #e4eee6;padding:25px 15px}
  .pb-brand{color:#174e37;font-size:19px;font-weight:850;padding:4px 11px 27px}
  .pb-brand small{display:block;color:#899c90;font-size:9px;letter-spacing:1.8px;margin-top:5px}
  .pb-nav{display:flex;flex-direction:column;gap:4px}
  .pb-nav a{display:flex;gap:12px;padding:11px;color:#5b7665;text-decoration:none;border-radius:10px;font-size:12px;font-weight:700}
  .pb-nav a.active,.pb-nav a:hover{background:#e5f2e9;color:#145f42}
  .pb-main{padding:29px clamp(18px,3.3vw,52px) 60px;min-width:0}
  .pb-inner{max-width:1230px;margin:auto}
  .pb-back{font-size:12px;color:#24704b;text-decoration:none;font-weight:700}
  .pb-hero{margin-top:22px;padding:34px 38px;border-radius:20px;color:#fff;background:linear-gradient(115deg,#113e2d,#23744f)}
  .pb-hero small{font-size:10px;letter-spacing:2px;font-weight:800;color:#bce7ce}
  .pb-hero h1{font-size:32px;margin:10px 0;color:#fff}
  .pb-hero p{max-width:690px;line-height:1.7;color:#e3f0e9;margin:0}
  .pb-heading{margin:27px 0 14px;font-size:18px;color:#153b2b}
  .pb-templates{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
  .pb-template{background:#fff;border:1px solid #e0e9e2;border-radius:15px;padding:20px;text-align:left;cursor:pointer;color:#183b2b;min-height:188px}
  .pb-template.selected{border:2px solid #18754c;background:#f0f8f2;padding:19px;box-shadow:0 4px 16px #164d2612}
  .pb-template .symbol{display:inline-grid;width:36px;height:36px;place-items:center;background:#e7f2e9;color:#167149;border-radius:10px;font-size:18px}
  .pb-template .category{font-size:9px;color:#638975;font-weight:800;letter-spacing:1px;margin:12px 0 7px}
  .pb-template strong{display:block;font-size:15px}
  .pb-template p{color:#72867a;font-size:11px;line-height:1.6;margin:8px 0 0}
  .pb-card{background:#fff;border:1px solid #e2eae5;border-radius:16px;padding:24px;margin-top:17px}
  .pb-controls{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:15px}
  .pb-control{display:block;font-size:11px;font-weight:800;color:#557264}
  .pb-control input,.pb-control select{margin-top:7px}
  .pb-step{display:flex;align-items:flex-start;gap:14px;padding:15px 0;border-bottom:1px solid #ecf1ed}
  .pb-step:last-child{border-bottom:0}
  .pb-step input{accent-color:#18754c;width:18px;height:18px;margin-top:3px;cursor:pointer;flex-shrink:0}
  .pb-step-main{min-width:0;flex:1}
  .pb-step-main strong{font-size:13px}
  .pb-step-main p{margin:6px 0 0;color:#71877a;line-height:1.6;font-size:11px}
  .pb-step-meta{text-align:right;color:#397358;font-size:11px;white-space:nowrap}
  .pb-step-meta strong{display:block;color:#1c6949;margin-bottom:6px}
  .pb-action{border:0;border-radius:10px;padding:13px 20px;background:#176b49;color:#fff;font-weight:800;cursor:pointer}
  .pb-action:disabled{opacity:.55;cursor:not-allowed}
  .pb-alert{padding:14px 16px;margin-top:18px;border-radius:10px;font-size:12px}
  .pb-success{background:#e7f5eb;color:#17613f;border:1px solid #cde7d5}
  .pb-error{background:#fff1eb;color:#a23f34;border:1px solid #f4d7cf}
  @media(max-width:1100px){.pb-templates{grid-template-columns:repeat(2,minmax(0,1fr))}.pb-controls{grid-template-columns:repeat(2,minmax(0,1fr))}}
  @media(max-width:720px){.pb-shell{display:block}.pb-sidebar{padding:14px}.pb-nav{flex-direction:row;overflow-x:auto}.pb-nav a{white-space:nowrap}.pb-brand{padding:5px 0 14px}.pb-main{padding:20px 15px}.pb-hero{padding:27px 24px}.pb-hero h1{font-size:26px}.pb-templates,.pb-controls{grid-template-columns:1fr}.pb-step-meta{white-space:normal}}
`;

export default function RecruitmentPlaybooksPage() {
  const [userId,setUserId] = useState("");
  const [companyMemberships,setCompanyMemberships] = useState([]);
  const [members,setMembers] = useState([]);
  const [jobs,setJobs] = useState([]);
  const [companyId,setCompanyId] = useState("");
  const [assignee,setAssignee] = useState("");
  const [jobId,setJobId] = useState("");
  const [startDate,setStartDate] = useState("");
  const [activeId,setActiveId] = useState(PLAYBOOKS[0].id);
  const [selectedSteps,setSelectedSteps] = useState(PLAYBOOKS[0].steps.map(s=>s.id));
  const [loading,setLoading] = useState(true);
  const [saving,setSaving] = useState(false);
  const [error,setError] = useState("");
  const [success,setSuccess] = useState("");

  useEffect(()=>{
    let active=true;
    setStartDate(toLocalDate());
    (async()=>{
      const {data:auth,error:authError}=await supabase.auth.getUser();
      if(!active)return;
      if(authError||!auth?.user){setError("Please sign in to use Recruitment Playbooks.");setLoading(false);return;}
      const uid=auth.user.id;
      setUserId(uid);
      const membershipResult=await supabase.from("company_members").select("company_id,role").eq("user_id",uid);
      if(!active)return;
      if(membershipResult.error){setError(membershipResult.error.message);setLoading(false);return;}
      const memberships=membershipResult.data||[];
      setCompanyMemberships(memberships);
      const ids=[...new Set(memberships.map(m=>m.company_id).filter(Boolean))];
      if(!ids.length){setError("Join a company before launching team playbooks.");setLoading(false);return;}
      setCompanyId(ids[0]);
      const [memberResult,jobResult]=await Promise.all([
        supabase.from("company_members").select("company_id,user_id,role").in("company_id",ids),
        supabase.from("jobs").select("id,title,company_id").in("company_id",ids).limit(500)
      ]);
      if(!active)return;
      if(memberResult.error||jobResult.error)setError(memberResult.error?.message||jobResult.error?.message||"Could not load company data.");
      else {setMembers(memberResult.data||[]);setJobs(jobResult.data||[]);}
      setLoading(false);
    })();
    return()=>{active=false;};
  },[]);

  const active=PLAYBOOKS.find(p=>p.id===activeId)||PLAYBOOKS[0];
  const chosen=useMemo(()=>active.steps.filter(s=>selectedSteps.includes(s.id)),[active,selectedSteps]);
  const isManager=companyMemberships.some(m=>m.company_id===companyId&&["admin","hr_manager"].includes((m.role||"").toLowerCase()));
  const companyMembers=members.filter(m=>m.company_id===companyId);
  const companyJobs=jobs.filter(j=>j.company_id===companyId);
  function choosePlaybook(p){setActiveId(p.id);setSelectedSteps(p.steps.map(s=>s.id));setError("");setSuccess("");}
  function toggleStep(id){setSelectedSteps(current=>current.includes(id)?current.filter(x=>x!==id):[...current,id]);setSuccess("");}
  function changeCompany(id){setCompanyId(id);setAssignee("");setJobId("");setSuccess("");setError("");}

  async function launch(){
    if(saving||loading)return;
    setError("");setSuccess("");
    if(!userId||!companyId||!startDate||!chosen.length){setError("Choose a company, start date and at least one task.");return;}
    if(assignee&&!companyMembers.some(m=>m.user_id===assignee)){setError("Selected assignee is not in this company.");return;}
    if(assignee&&assignee!==userId&&!isManager){setError("Only the company HR Manager or Admin can assign tasks to teammates.");return;}
    if(jobId&&!companyJobs.some(j=>String(j.id)===String(jobId))){setError("Select a job from the chosen company.");return;}
    const now=new Date().toISOString();
    const payload=chosen.map(step=>({
      title:step.title,
      description:step.details+"\nPlaybook: "+active.name,
      priority:step.priority,
      status:"todo",
      due_date:datePlus(startDate,step.offset),
      job_id:jobId?Number(jobId):null,
      candidate_id:null,
      company_id:companyId,
      assigned_to:assignee||null,
      created_by:userId,
      updated_at:now
    }));
    setSaving(true);
    const {error:insertError}=await supabase.from("recruitment_tasks").insert(payload);
    setSaving(false);
    if(insertError){setError(insertError.message);return;}
    setSuccess(`${payload.length} recruitment tasks created successfully. They're now available in Task Management and SLA Monitoring.`);
    setSelectedSteps([]);
  }

  return <main className="pb-root">
    <style>{css}</style>
    <div className="pb-shell">
      <aside className="pb-sidebar">
        <div className="pb-brand">◈ Inspire Match<small>TALENT INTELLIGENCE</small></div>
        <ATSNavigation className="pb-nav"/>
      </aside>
      <div className="pb-main"><div className="pb-inner">
        <Link href="/app/recruitment-operations" className="pb-back">← Recruitment Operations</Link>
        <header className="pb-hero">
          <small>RECRUITMENT OPERATIONS / WORKFLOW LIBRARY</small>
          <h1>Recruitment Workflow Playbooks</h1>
          <p>Launch ready-to-use hiring checklists in one action. All tasks are created in your existing workspace, with deadlines, priorities, hiring context and team ownership.</p>
        </header>
        <h2 className="pb-heading">Choose a recruitment workflow</h2>
        <div className="pb-templates">
          {PLAYBOOKS.map(p=><button key={p.id} type="button" onClick={()=>choosePlaybook(p)} className={`pb-template ${activeId===p.id?"selected":""}`} aria-pressed={activeId===p.id}>
            <span className="symbol" aria-hidden="true">{p.symbol}</span>
            <div className="category">{p.label}</div><strong>{p.name}</strong>
            <p>{p.description}</p>
          </button>)}
        </div>
        <section className="pb-card">
          <div style={{display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap",alignItems:"center",marginBottom:20}}>
            <div><h2 style={{fontSize:20,margin:"0 0 7px"}}>Configure your playbook</h2><p style={{margin:0,color:"#748a7b",fontSize:12}}>Choose the company, link the job and set who owns the tasks.</p></div>
            <span style={{background:"#e9f5ed",color:"#176b49",padding:"9px 13px",borderRadius:30,fontSize:11,fontWeight:800}}>{chosen.length} / {active.steps.length} tasks selected</span>
          </div>
          <div className="pb-controls">
            <label className="pb-control">Company *
              <select style={field} value={companyId} disabled={loading} onChange={e=>changeCompany(e.target.value)}>
                <option value="">Select company</option>
                {companyMemberships.map(m=><option key={m.company_id} value={m.company_id}>Company {m.company_id.slice(0,8)} · {m.role}</option>)}
              </select>
            </label>
            <label className="pb-control">Related Job
              <select style={field} value={jobId} onChange={e=>{setJobId(e.target.value);setSuccess("");}}>
                <option value="">No linked job</option>{companyJobs.map(j=><option key={j.id} value={j.id}>{j.title}</option>)}
              </select>
            </label>
            <label className="pb-control">Assign Recruiter
              <select style={field} value={assignee} onChange={e=>{setAssignee(e.target.value);setSuccess("");}}>
                <option value="">Unassigned</option>
                {companyMembers.filter(m=>isManager||m.user_id===userId).map(m=><option key={m.user_id} value={m.user_id}>{m.user_id===userId?"You":`Member · ${m.user_id.slice(0,8)}`} ({m.role})</option>)}
              </select>
            </label>
            <label className="pb-control">Start Date *
              <input type="date" style={field} value={startDate} onChange={e=>{setStartDate(e.target.value);setSuccess("");}}/>
            </label>
          </div>
        </section>
        <section className="pb-card">
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
            <div><h2 style={{fontSize:20,margin:"0 0 7px"}}>Workflow checklist</h2><p style={{color:"#748a7b",margin:0,fontSize:12}}>Select which tasks to create. Due dates are calculated from the start date.</p></div>
            <div style={{display:"flex",gap:9}}>
              <button type="button" onClick={()=>{setSelectedSteps(active.steps.map(s=>s.id));setSuccess("");}} style={{border:0,color:"#176b49",background:"#eef7f0",padding:"9px 12px",borderRadius:8,cursor:"pointer"}}>Select all</button>
              <button type="button" onClick={()=>{setSelectedSteps([]);setSuccess("");}} style={{border:0,color:"#547262",background:"#f2f5f2",padding:"9px 12px",borderRadius:8,cursor:"pointer"}}>Clear</button>
            </div>
          </div>
          <div style={{marginTop:14}}>
            {active.steps.map(step=><label className="pb-step" key={step.id}>
              <input type="checkbox" checked={selectedSteps.includes(step.id)} onChange={()=>toggleStep(step.id)} aria-label={`Include ${step.title}`}/>
              <div className="pb-step-main"><strong>{step.title}</strong><p>{step.details}</p></div>
              <div className="pb-step-meta"><strong>{startDate?datePlus(startDate,step.offset):`Day +${step.offset}`}</strong><span>{step.priority.toUpperCase()}</span></div>
            </label>)}
          </div>
          {error&&<p role="alert" className="pb-alert pb-error">{error}</p>}
          {success&&<div role="status" className="pb-alert pb-success">{success} <Link href="/app/recruitment-operations/tasks" style={{color:"#14603f",fontWeight:800}}>View tasks →</Link></div>}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:14,flexWrap:"wrap",marginTop:22}}>
            <span style={{fontSize:12,color:"#778b7e"}}>Created tasks follow your company's existing access permissions.</span>
            <button type="button" className="pb-action" disabled={loading||saving||!chosen.length||!companyId||!startDate} onClick={launch}>{saving?"Creating tasks...":`Launch ${chosen.length} Task${chosen.length===1?"":"s"} →`}</button>
          </div>
        </section>
      </div></div>
    </div>
  </main>;
}
