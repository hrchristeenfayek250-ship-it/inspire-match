"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import ATSNavigation from "@/components/ATSNavigation";

const TEMPLATES = {
  "Structured Interview": [
    ["Experience", "Walk me through a project that best demonstrates your fit for this position.", "What was your exact responsibility and measurable result?"],
    ["Problem Solving", "Describe an unexpected obstacle at work and how you resolved it.", "Which alternatives did you consider?"],
    ["Collaboration", "Tell me about a disagreement with a colleague and how you handled it.", "What changed as a result?"],
    ["Communication", "Explain a complicated topic to someone unfamiliar with it.", "How did you check they understood?"],
    ["Learning Agility", "What is a skill you had to learn quickly to deliver a result?", "How did you apply it and measure progress?"]
  ],
  "Technical Interview": [
    ["Technical Skills", "Describe the most technically complex solution you personally delivered.", "What trade-offs did you make and why?"],
    ["Problem Solving", "Walk through how you would diagnose a critical production issue.", "How would you prioritize causes and confirm a fix?"],
    ["Quality", "How do you validate your work before it is released?", "Tell me about a defect you caught early."],
    ["Ownership", "Describe a time you inherited a system you did not build.", "How did you assess risks and plan improvements?"],
    ["Collaboration", "Explain a technical decision you had to defend to non-technical stakeholders.", "How did you adjust your explanation?"]
  ],
  "Creative Interview": [
    ["Portfolio", "Which portfolio project best reflects your individual contribution?", "What part of the final output did you create?"],
    ["Creative Thinking", "Describe a brief where you challenged the initial creative direction.", "How did you validate the alternative?"],
    ["Execution", "Walk me through your process from a brief to final delivery.", "How did you manage feedback and iterations?"],
    ["Time Management", "Tell me about a tight deadline that threatened quality.", "Which compromises were acceptable?"],
    ["Collaboration", "How do you respond to conflicting feedback from stakeholders?", "Give a real example and outcome."]
  ],
  "Sales Interview": [
    ["Discovery", "Walk me through how you qualify a new opportunity.", "Which questions identify a real need?"],
    ["Negotiation", "Describe a deal where price was the main objection.", "How did you defend value?"],
    ["Pipeline Discipline", "How do you prioritize opportunities in a crowded pipeline?", "Which indicators predict the next step?"],
    ["Resilience", "Tell me about a lost deal that changed your approach.", "What did you learn?"],
    ["Account Growth", "Describe how you expanded an existing client relationship.", "What evidence showed customer value?"]
  ],
  "Customer Support Interview": [
    ["Customer Empathy", "Describe a situation with an upset customer.", "What did you say and what happened next?"],
    ["Problem Solving", "How would you resolve an issue without a documented solution?", "When would you escalate?"],
    ["Communication", "Explain a complex product limitation to a frustrated customer.", "How would you confirm understanding?"],
    ["Ownership", "Tell me about a case you followed through beyond the first response.", "How did you document the outcome?"],
    ["Prioritization", "How would you handle several urgent requests at the same time?", "What would change their priority?"]
  ]
};
const templateNames = Object.keys(TEMPLATES);
function questionsFor(name) {
  return (TEMPLATES[name] || TEMPLATES["Structured Interview"]).map(([competency, question, followUp], i) => ({
    id: name + "-" + i, competency, question, followUp
  }));
}
const style = [
  ".ik{background:#f4f8f5;color:#173e2d;min-height:100vh;font:14px Arial,Helvetica,sans-serif}",
  ".ik *{box-sizing:border-box}.ik-shell{display:grid;grid-template-columns:250px minmax(0,1fr);min-height:100vh}",
  ".ik-side{padding:28px 16px;background:#fff;border-right:1px solid #dfeae2}.ik-brand{font-weight:900;font-size:20px;padding:0 12px 26px}",
  ".ik-brand small{display:block;font-size:10px;letter-spacing:1.6px;color:#779083;margin-top:5px}",
  ".ik-nav{display:flex;flex-direction:column;gap:3px}.ik-nav a{display:flex;align-items:center;gap:11px;padding:11px 12px;border-radius:9px;text-decoration:none;color:#56715e;font-size:12px;font-weight:700}",
  ".ik-nav a:hover,.ik-nav a.active{background:#e8f4ea;color:#16613f}.ik-main{width:100%;max-width:1410px;margin:0 auto;padding:36px clamp(20px,3.4vw,50px)}",
  ".ik-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap}.ik-eyebrow{color:#518265;font-size:11px;letter-spacing:2px;font-weight:850}",
  ".ik h1{font:normal clamp(29px,3vw,43px) Georgia,serif;margin:10px 0}.ik-muted{color:#74897a;font-size:12px;line-height:1.65}",
  ".ik-button{border:0;border-radius:10px;padding:12px 16px;background:#166847;color:#fff;text-decoration:none;font-size:12px;font-weight:800;cursor:pointer;display:inline-flex;align-items:center;justify-content:center}",
  ".ik-button.alt{background:#e5f3e9;color:#175e40}.ik-button.ghost{background:#fff;color:#236448;border:1px solid #ccded1}.ik-button:disabled{opacity:.5;cursor:not-allowed}",
  ".ik-actions{display:flex;gap:10px;flex-wrap:wrap}.ik-grid{display:grid;grid-template-columns:minmax(275px,360px) minmax(0,1fr);gap:19px;align-items:start;margin-top:22px}",
  ".ik-panel{background:#fff;padding:22px;border:1px solid #e1eae4;border-radius:17px;box-shadow:0 4px 20px #165b3110}.ik-panel h2{font-size:17px;margin:0 0 10px}",
  ".ik-form{display:grid;gap:16px}.ik-label{display:block;font-size:11px;color:#52705e;font-weight:850;margin-bottom:7px}",
  ".ik-input{width:100%;border:1px solid #d8e5dc;background:#fff;color:#244c34;border-radius:9px;padding:11px;font:inherit}.ik-input:focus{outline:2px solid #79b793;outline-offset:1px}",
  ".ik-row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.ik-kpi{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:17px 0}",
  ".ik-kpi div{padding:13px;background:#f4faf6;border:1px solid #e0ede4;border-radius:10px}.ik-kpi strong{display:block;font-size:20px;color:#176845;margin-top:6px}",
  ".ik-question{border:1px solid #e1ebe4;border-radius:12px;padding:17px;margin:12px 0;background:#fdfefd}.ik-question-top{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:13px}",
  ".ik-question-top strong{font-size:13px}.ik-questions{display:grid;gap:10px}.ik-scale{display:flex;gap:8px;align-items:center;flex-wrap:wrap;color:#6a8472;font-size:11px}",
  ".ik-scale span{display:inline-flex;width:28px;height:28px;align-items:center;justify-content:center;border:1px solid #c8dcca;border-radius:7px;color:#32704b}",
  ".ik-alert{padding:14px;background:#fff0ed;color:#863d2d;border-radius:10px;margin:15px 0;font-size:12px}",
  ".ik-note{padding:14px;background:#edf7ee;border-radius:11px;color:#356b48;font-size:12px;line-height:1.7;margin:16px 0}",
  ".ik-print-only{display:none}",
  "@media(max-width:1120px){.ik-shell{display:block}.ik-side{border-bottom:1px solid #e2ebe4}.ik-nav{flex-direction:row;overflow-x:auto}.ik-nav a{white-space:nowrap}.ik-grid{grid-template-columns:1fr}}",
  "@media(max-width:640px){.ik-main{padding:20px 14px}.ik-panel{padding:16px}.ik-kpi{grid-template-columns:repeat(2,minmax(0,1fr))}.ik-head{display:block}.ik-actions{margin-top:16px}}",
  "@media print{.ik{background:#fff!important;color:#111}.ik-shell,.ik-grid{display:block}.ik-side,.ik-actions,.ik-form-panel,.ik-edit-only,.ik-add,.ik-notice{display:none!important}.ik-main{padding:0;max-width:none}.ik-panel{padding:0;border:0;box-shadow:none}.ik-question{break-inside:avoid;background:#fff;border:1px solid #bbb}.ik-question .ik-input{border:0;padding:2px 0;font-size:12px;resize:none;overflow:visible}.ik-print-only{display:block}.ik-question .ik-print-edit{display:none}.ik-print-label{font-weight:bold}.ik-muted{color:#555}.ik-question{padding:12px}.ik-question-top{margin-bottom:6px}.ik-notes-space{height:38px;border-bottom:1px dotted #aaa}}"
].join("");

export default function InterviewKitBuilderPage(){
  const [companies,setCompanies] = useState([]);
  const [company,setCompany] = useState("");
  const [jobs,setJobs] = useState([]);
  const [candidates,setCandidates] = useState([]);
  const [applications,setApplications] = useState([]);
  const [jobId,setJobId] = useState("");
  const [applicationId,setApplicationId] = useState("");
  const [template,setTemplate] = useState("Structured Interview");
  const [questions,setQuestions] = useState(() => questionsFor("Structured Interview"));
  const [interviewer,setInterviewer] = useState("");
  const [date,setDate] = useState("");
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");
  const [notice,setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const {data:auth,error:authError} = await supabase.auth.getUser();
      if(authError || !auth?.user) throw new Error("Please sign in to build an interview kit.");
      const memberships=await supabase.from("company_members").select("company_id").eq("user_id",auth.user.id);
      if(memberships.error)throw memberships.error;
      const ids=[...new Set((memberships.data||[]).map(m=>m.company_id).filter(Boolean))];
      setCompanies(ids);setCompany(current=>ids.includes(current)?current:ids[0]||"");
      if(!ids.length){setJobs([]);setCandidates([]);setApplications([]);return;}
      const results=await Promise.all([
        supabase.from("jobs").select("id,title,company_id").in("company_id",ids).limit(2000),
        supabase.from("candidates").select("id,full_name,company_id").in("company_id",ids).limit(5000),
        supabase.from("applications").select("id,company_id,candidate_id,job_id,stage").in("company_id",ids).limit(5000)
      ]);
      for(const r of results)if(r.error)throw r.error;
      setJobs(results[0].data||[]);
      setCandidates(results[1].data||[]);
      setApplications(results[2].data||[]);
    } catch(e){setError(e.message||"Could not load interview kit details.");}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{load();},[load]);

  const companyJobs=useMemo(()=>jobs.filter(j=>j.company_id===company),[jobs,company]);
  const jobMap=useMemo(()=>new Map(companyJobs.map(j=>[String(j.id),j])),[companyJobs]);
  const candidateMap=useMemo(()=>new Map(candidates.filter(c=>c.company_id===company).map(c=>[String(c.id),c])),[candidates,company]);
  const companyApps=useMemo(()=>applications.filter(a=>a.company_id===company && (!jobId || String(a.job_id)===String(jobId)) && candidateMap.has(String(a.candidate_id)) && jobMap.has(String(a.job_id))),[applications,company,jobId,candidateMap,jobMap]);
  const application=companyApps.find(a=>String(a.id)===applicationId);
  const selectedJob=jobMap.get(String(jobId));
  const selectedCandidate=application ? candidateMap.get(String(application.candidate_id)) : null;
  const focusAreas=[...new Set(questions.map(q=>q.competency.trim()).filter(Boolean))];
  const kitTitle=(selectedJob?.title||"Role not selected")+" / "+(selectedCandidate?.full_name||"General interview");
  const changeTemplate = value => {
    setTemplate(value);
    setQuestions(questionsFor(value));
    setNotice("Template loaded. You can customize questions before printing or copying.");
  };
  const updateQuestion=(id,field,value)=>setQuestions(qs=>qs.map(q=>q.id===id?{...q,[field]:value}:q));
  const addQuestion=()=>setQuestions(qs=>[...qs,{id:"custom-"+Date.now()+"-"+qs.length,competency:"Additional Focus Area",question:"",followUp:""}]);
  const kitText = () => [
    "INSPIRE MATCH ATS — INTERVIEW KIT",
    "Role: "+(selectedJob?.title||"Not selected"),
    "Candidate: "+(selectedCandidate?.full_name||"Not selected"),
    "Interviewer: "+(interviewer||"Not specified"),
    "Session: "+(date||"Not specified"),
    "Template: "+template,
    "",
    ...questions.map((q,i)=>[(i+1)+". ["+q.competency+"] "+q.question,"Follow-up: "+(q.followUp||"—"),"Rating (1–5): _____","Evidence: ______________________________",""].join("\n")),
    "FINAL SUMMARY",
    "Key strengths: __________________________",
    "Concerns / development areas: ____________",
    "Recommendation: Proceed / Hold / Reject",
    "Decision rationale: _____________________"
  ].join("\n");

  async function copyKit(){
    try {
      await navigator.clipboard.writeText(kitText());
      setNotice("Interview kit copied. No candidate records were changed.");
    }catch{setNotice("Copy was blocked by your browser. Use Print / Save as PDF instead.");}
  }
  const canPrint=questions.length>0 && questions.every(q=>q.question.trim()&&q.competency.trim());

  return <div className="ik"><style>{style}</style><div className="ik-shell">
    <aside className="ik-side"><div className="ik-brand">✳ Inspire Match<small>HIRE BETTER. INSPIRE MORE.</small></div><ATSNavigation className="ik-nav"/></aside>
    <main className="ik-main">
      <header className="ik-head"><div><div className="ik-eyebrow">INTERVIEW INTELLIGENCE / INT-01 FOUNDATION</div><h1>Interview Kit Builder</h1><p className="ik-muted">Prepare structured, role-specific interview questions and printable competency scorecards.</p></div>
        <div className="ik-actions"><Link href="/app/interviews" className="ik-button alt">Interviews</Link><Link href="/app/interviews/debrief" className="ik-button alt">Hiring Debrief</Link><button className="ik-button ghost" type="button" onClick={copyKit} disabled={!canPrint}>Copy Kit</button><button className="ik-button" type="button" disabled={!canPrint} onClick={()=>window.print()}>Print / Save PDF</button></div>
      </header>
      {error&&<div className="ik-alert" role="alert">{error}</div>}
      {notice&&<div className="ik-note ik-notice" role="status">{notice}</div>}
      <div className="ik-grid">
        <section className="ik-panel ik-form-panel"><h2>Kit setup</h2><p className="ik-muted">Select an existing job and optionally link a candidate application. Interview kits do not change application or interview data.</p>
          <div className="ik-form">
            <div><label className="ik-label" htmlFor="ik-company">Workspace</label><select id="ik-company" className="ik-input" value={company} onChange={e=>{setCompany(e.target.value);setJobId("");setApplicationId("");}}>{companies.length===0&&<option value="">No company available</option>}{companies.map(id=><option key={id} value={id}>Workspace {id.slice(0,8)}</option>)}</select></div>
            <div><label className="ik-label" htmlFor="ik-job">Job</label><select id="ik-job" className="ik-input" value={jobId} onChange={e=>{setJobId(e.target.value);setApplicationId("");}}><option value="">General kit / choose job</option>{companyJobs.map(j=><option value={String(j.id)} key={String(j.id)}>{j.title}</option>)}</select></div>
            <div><label className="ik-label" htmlFor="ik-candidate">Candidate application</label><select id="ik-candidate" className="ik-input" value={applicationId} onChange={e=>setApplicationId(e.target.value)}><option value="">No candidate selected</option>{companyApps.map(a=><option key={String(a.id)} value={String(a.id)}>{candidateMap.get(String(a.candidate_id))?.full_name||"Candidate"} — {jobMap.get(String(a.job_id))?.title||"Job"}</option>)}</select></div>
            <div><label className="ik-label" htmlFor="ik-template">Interview template</label><select id="ik-template" className="ik-input" value={template} onChange={e=>changeTemplate(e.target.value)}>{templateNames.map(name=><option key={name} value={name}>{name}</option>)}</select><p className="ik-muted">Changing templates replaces your current draft questions.</p></div>
            <div><label className="ik-label" htmlFor="ik-interviewer">Interviewer</label><input id="ik-interviewer" className="ik-input" placeholder="Interviewer name" value={interviewer} onChange={e=>setInterviewer(e.target.value)}/></div>
            <div><label className="ik-label" htmlFor="ik-date">Session date and time</label><input id="ik-date" type="datetime-local" className="ik-input" value={date} onChange={e=>setDate(e.target.value)}/></div>
            <button type="button" className="ik-button ghost" onClick={load} disabled={loading}>{loading?"Loading...":"Refresh Jobs & Candidates"}</button>
          </div>
          <div className="ik-note">Current release: editable templates and printable kits. Draft questions are <strong>not saved to the company database</strong>; use Copy Kit or Print / Save PDF to keep a version. Persistent job-level interview plans and reviewer assignment remain future work.</div>
        </section>
        <section className="ik-panel"><div className="ik-eyebrow">PREVIEW / READY TO PRINT</div><h2 style={{marginTop:9}}>{kitTitle}</h2><p className="ik-muted">{template} · {interviewer||"Interviewer not set"} · {date?new Date(date).toLocaleString("en-GB",{dateStyle:"medium",timeStyle:"short"}):"Session not set"}</p>
          <div className="ik-kpi"><div><span className="ik-muted">Questions</span><strong>{questions.length}</strong></div><div><span className="ik-muted">Focus areas</span><strong>{focusAreas.length}</strong></div><div><span className="ik-muted">Total score</span><strong>{questions.length*5}</strong></div></div>
          <div className="ik-print-only"><p>Role: {selectedJob?.title||"General interview"}</p><p>Candidate: {selectedCandidate?.full_name||"Not selected"}</p><p>Interviewer: {interviewer||"Not specified"}</p><p>Session: {date||"Not specified"}</p></div>
          <h2>Interview Questions & Evidence</h2><p className="ik-muted">Ask consistent questions, collect observable evidence, and score each competency from 1 (limited evidence) to 5 (strong evidence). A human reviewer makes the hiring decision.</p>
          <div className="ik-questions">{questions.map((q,index)=><div className="ik-question" key={q.id}>
            <div className="ik-question-top"><strong>Question {index+1}</strong><button type="button" className="ik-button ghost ik-edit-only" style={{padding:"6px 10px"}} onClick={()=>setQuestions(prev=>prev.filter(item=>item.id!==q.id))} aria-label={"Remove question "+(index+1)}>Remove</button></div>
            <label className="ik-label ik-edit-only" htmlFor={"focus-"+q.id}>Competency / focus area</label><input id={"focus-"+q.id} className="ik-input ik-print-edit" value={q.competency} onChange={e=>updateQuestion(q.id,"competency",e.target.value)}/>
            <div className="ik-print-only ik-print-label">{q.competency}</div>
            <label className="ik-label ik-edit-only" htmlFor={"question-"+q.id} style={{marginTop:11}}>Core question</label><textarea id={"question-"+q.id} className="ik-input ik-print-edit" rows={2} value={q.question} onChange={e=>updateQuestion(q.id,"question",e.target.value)}/>
            <div className="ik-print-only">{q.question}</div>
            <label className="ik-label ik-edit-only" htmlFor={"follow-"+q.id} style={{marginTop:11}}>Evidence / probing follow-up</label><textarea id={"follow-"+q.id} className="ik-input ik-print-edit" rows={2} value={q.followUp} onChange={e=>updateQuestion(q.id,"followUp",e.target.value)}/>
            <div className="ik-print-only" style={{marginTop:6}}>Follow-up: {q.followUp||"—"}</div>
            <div className="ik-scale" style={{marginTop:12}}>Rating {["1","2","3","4","5"].map(n=><span key={n}>{n}</span>)} <small>Circle a score</small></div>
            <div className="ik-print-only" style={{marginTop:8}}>Evidence notes:</div><div className="ik-notes-space ik-print-only"/>
          </div>)}</div>
          <button type="button" className="ik-button alt ik-add" onClick={addQuestion}>+ Add Custom Question</button>
          {!canPrint&&<p className="ik-alert">Add a question and focus area to every row before printing.</p>}
          <div className="ik-question" style={{marginTop:22}}><h2>Hiring Recommendation</h2><p className="ik-muted">Capture strengths, risks, and rationale in the printed kit. Save the official evaluation and final decision in Interview Management.</p><p><strong>Strengths:</strong> _______________________________________</p><p><strong>Areas to verify:</strong> _________________________________</p><p><strong>Recommendation:</strong> Proceed / Hold / Reject</p><p><strong>Evidence-based rationale:</strong> _________________________</p></div>
          <Link href="/app/interviews" className="ik-button ik-edit-only">Open Interview Evaluation →</Link>
        </section>
      </div>
    </main>
  </div></div>;
}
