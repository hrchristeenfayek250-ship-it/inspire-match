"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import ATSNavigation from "@/components/ATSNavigation";

const DEFAULTS = [
 {stage:"screening",label:"Screening",description:"Review candidate fit and document screening outcomes.",task_title:"Complete candidate screening and record findings",days_to_due:2,priority:"high",enabled:true},
 {stage:"interview",label:"Interview",description:"Coordinate interviews and gather interviewer evaluations.",task_title:"Coordinate interview schedule and interviewer feedback",days_to_due:2,priority:"high",enabled:true},
 {stage:"shortlisted",label:"Shortlisted",description:"Follow up with the hiring manager for the next decision.",task_title:"Follow up with hiring manager on shortlisted candidate",days_to_due:2,priority:"high",enabled:true},
 {stage:"hired",label:"Hired",description:"Complete the hiring documentation and onboarding handoff.",task_title:"Complete hiring handoff and documentation",days_to_due:3,priority:"medium",enabled:true},
 {stage:"rejected",label:"Rejected",description:"Ensure candidate closure and appropriate communication.",task_title:"Complete candidate closure and communication",days_to_due:2,priority:"medium",enabled:true}
];
const css = [
 ".wa-root{min-height:100vh;background:#f5f8f6;color:#183a2c;font:14px Arial,Helvetica,sans-serif}",
 ".wa-root *{box-sizing:border-box}",
 ".wa-shell{display:grid;grid-template-columns:252px minmax(0,1fr);min-height:100vh}",
 ".wa-sidebar{background:#fff;border-right:1px solid #e5ece7;padding:27px 14px 22px}",
 ".wa-brand{padding:3px 13px 32px;font-size:18px;font-weight:850;color:#173e30}",
 ".wa-brand small{display:block;font-size:9px;color:#83978a;letter-spacing:1.6px;margin-top:3px}",
 ".wa-nav{display:flex;flex-direction:column;gap:4px}",
 ".wa-nav a{display:flex;align-items:center;gap:12px;text-decoration:none;color:#5d7267;font-size:12px;font-weight:700;padding:11px 12px;border-radius:10px}",
 ".wa-nav a:hover,.wa-nav a.active{background:#e5f2e9;color:#145f42}",
 ".wa-main{padding:28px clamp(18px,3vw,52px) 64px;min-width:0}",
 ".wa-inner{max-width:1240px;margin:auto}",
 ".wa-back{display:inline-block;margin-bottom:22px;color:#1b7050;font-size:12px;font-weight:750;text-decoration:none}",
 ".wa-hero{background:linear-gradient(115deg,#113e2d,#257b53);border-radius:20px;padding:35px 37px;color:#fff;display:flex;justify-content:space-between;align-items:center;gap:25px}",
 ".wa-hero small{font-size:10px;letter-spacing:2px;font-weight:800;color:#bce7ce}",
 ".wa-hero h1{font-size:30px;color:white;margin:10px 0}",
 ".wa-hero p{max-width:670px;font-size:13px;line-height:1.75;color:#e0f0e7;margin:0}",
 ".wa-badge{padding:20px;border:1px solid #ffffff3b;border-radius:16px;text-align:center;min-width:135px}",
 ".wa-badge strong{font-size:30px;display:block}",
 ".wa-badge span{font-size:11px;color:#daf1e4}",
 ".wa-top{display:flex;align-items:center;justify-content:space-between;gap:16px;margin:26px 0}",
 ".wa-top h2{margin:0 0 6px;font-size:20px;color:#183d2e}",
 ".wa-top p{margin:0;color:#7a8e80;font-size:12px}",
 ".wa-label{display:block;color:#52705e;font-size:11px;font-weight:800;margin-bottom:6px}",
 ".wa-select,.wa-input{border:1px solid #d9e6dc;border-radius:9px;background:#fff;color:#174a33;font:inherit;padding:11px;width:100%}",
 ".wa-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:13px;margin-bottom:20px}",
 ".wa-stat{background:#fff;border:1px solid #e2ebe4;border-radius:14px;padding:18px}",
 ".wa-stat span{font-size:11px;color:#7a8b7e;font-weight:700}",
 ".wa-stat strong{display:block;margin-top:6px;font-size:25px;color:#176b49}",
 ".wa-list{display:flex;flex-direction:column;gap:14px}",
 ".wa-rule{background:#fff;border:1px solid #e0ebe4;border-radius:16px;padding:23px}",
 ".wa-rule-top{display:flex;justify-content:space-between;align-items:center;gap:20px}",
 ".wa-rule h3{font-size:17px;margin:0 0 7px;color:#18442e}",
 ".wa-rule p{font-size:12px;color:#708877;line-height:1.5;margin:0}",
 ".wa-pill{display:inline-block;font-size:10px;font-weight:800;padding:6px 9px;border-radius:20px;background:#e8f3eb;color:#206e4a;margin-bottom:8px}",
 ".wa-fields{margin-top:21px;display:grid;grid-template-columns:minmax(220px,2.5fr) minmax(125px,.8fr) minmax(125px,.8fr);gap:13px;align-items:end}",
 ".wa-toggle{display:inline-flex;align-items:center;gap:9px;color:#245f44;font-size:12px;font-weight:800;cursor:pointer;white-space:nowrap}",
 ".wa-toggle input{width:18px;height:18px;accent-color:#176b49}",
 ".wa-actions{display:flex;align-items:center;flex-wrap:wrap;gap:12px;justify-content:space-between;background:#fff;border:1px solid #e1ebe4;border-radius:14px;padding:19px;margin-top:20px}",
 ".wa-action{border:0;border-radius:10px;padding:13px 22px;background:#176b49;color:#fff;font-weight:800;cursor:pointer}",
 ".wa-action:disabled{opacity:.5;cursor:not-allowed}",
 ".wa-reset{background:#f0f5f1;border:1px solid #dce9de;border-radius:9px;color:#286747;padding:11px 15px;font-weight:750;cursor:pointer}",
 ".wa-feedback{padding:14px 16px;border-radius:10px;margin:14px 0;font-size:12px}",
 ".wa-error{background:#fff0eb;color:#9e463a;border:1px solid #f1d7ce}",
 ".wa-success{background:#e9f6ed;color:#176b49;border:1px solid #cae6d4}",
 ".wa-foot{font-size:11px;color:#799082;line-height:1.7;margin-top:15px}",
 "@media(max-width:940px){.wa-shell{grid-template-columns:205px minmax(0,1fr)}.wa-fields{grid-template-columns:1fr 1fr}.wa-fields>div:first-child{grid-column:1/-1}}",
 "@media(max-width:730px){.wa-shell{display:block}.wa-sidebar{padding:14px;border-right:0;border-bottom:1px solid #e5ece7}.wa-brand{padding:0 0 13px}.wa-nav{flex-direction:row;overflow-x:auto}.wa-nav a{white-space:nowrap}.wa-main{padding:23px 15px}.wa-hero{padding:27px 23px}.wa-hero h1{font-size:25px}.wa-badge{display:none}.wa-summary{grid-template-columns:repeat(3,1fr)}.wa-top{align-items:flex-start;flex-direction:column}.wa-rule{padding:18px}.wa-fields{grid-template-columns:1fr}.wa-fields>div:first-child{grid-column:auto}}"
].join("\n");

export default function WorkflowAutomationSettings() {
 const [uid,setUid]=useState("");
 const [memberships,setMemberships]=useState([]);
 const [companyId,setCompanyId]=useState("");
 const [savedRows,setSavedRows]=useState([]);
 const [rules,setRules]=useState(DEFAULTS);
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState("");
 const [message,setMessage]=useState("");

 useEffect(()=>{
  let active=true;
  (async()=>{
   const {data:auth,error:authError}=await supabase.auth.getUser();
   if(!active)return;
   if(authError||!auth?.user){setError("Please sign in to access workflow automation.");setLoading(false);return;}
   setUid(auth.user.id);
   const {data:members,error:memberError}=await supabase.from("company_members").select("company_id,role").eq("user_id",auth.user.id);
   if(!active)return;
   if(memberError){setError(memberError.message);setLoading(false);return;}
   const list=members||[];
   setMemberships(list);
   const ids=[...new Set(list.map(x=>x.company_id).filter(Boolean))];
   if(!ids.length){setError("Join a company to manage automation settings.");setLoading(false);return;}
   setCompanyId(ids[0]);
   const {data:stored,error:rulesError}=await supabase.from("recruitment_automation_rules").select("company_id,stage,enabled,days_to_due,priority,task_title").in("company_id",ids);
   if(!active)return;
   if(rulesError)setError("Apply the Workflow Automation Settings SQL migration first. "+rulesError.message);
   else setSavedRows(stored||[]);
   setLoading(false);
  })();
  return()=>{active=false;};
 },[]);

 useEffect(()=>{
  setRules(DEFAULTS.map(def=>({...def,...savedRows.find(r=>r.company_id===companyId&&r.stage===def.stage)})));
 },[companyId,savedRows]);

 const isManager=memberships.some(m=>m.company_id===companyId&&["admin","hr_manager"].includes(String(m.role||"").toLowerCase()));
 const enabledCount=useMemo(()=>rules.filter(r=>r.enabled).length,[rules]);
 const updateRule=(stage,updates)=>{setRules(current=>current.map(r=>r.stage===stage?{...r,...updates}:r));setMessage("");};
 const reset=()=>{setRules(DEFAULTS.map(r=>({...r})));setMessage("");};

 async function save(){
  if(!uid||!isManager||!companyId||saving||error)return;
  setError("");setMessage("");
  const bad=rules.find(r=>!r.task_title?.trim()||r.task_title.trim().length<4||r.task_title.length>180||!Number.isInteger(Number(r.days_to_due))||Number(r.days_to_due)<0||Number(r.days_to_due)>30);
  if(bad){setError("Use a title (4–180 characters) and deadline from 0 to 30 days for each stage.");return;}
  setSaving(true);
  const payload=rules.map(r=>({
    company_id:companyId,stage:r.stage,enabled:r.enabled,
    task_title:r.task_title.trim(),days_to_due:Number(r.days_to_due),
    priority:r.priority,updated_by:uid,updated_at:new Date().toISOString()
  }));
  const {error:saveError}=await supabase.from("recruitment_automation_rules").upsert(payload,{onConflict:"company_id,stage"});
  setSaving(false);
  if(saveError){setError(saveError.message);return;}
  setSavedRows(prev=>[...prev.filter(r=>r.company_id!==companyId),...payload]);
  setMessage("Automation settings saved for this company.");
 }

 return <main className="wa-root"><style>{css}</style><div className="wa-shell">
  <aside className="wa-sidebar"><div className="wa-brand">◈ Inspire Match<small>TALENT INTELLIGENCE</small></div><ATSNavigation className="wa-nav"/></aside>
  <div className="wa-main"><div className="wa-inner">
    <Link href="/app/recruitment-operations" className="wa-back">← Recruitment Operations</Link>
    <header className="wa-hero">
      <div><small>RECRUITMENT OPERATIONS / SMART WORKFLOWS</small><h1>Workflow Automation Settings</h1><p>Control which candidate stage changes automatically create tasks. Customize task titles, deadlines and priority for every hiring stage.</p></div>
      <div className="wa-badge"><strong>05</strong><span>Stage-based rules</span></div>
    </header>
    <div className="wa-top">
      <div><h2>Configure your workflow</h2><p>Rules apply to future stage changes within the selected company.</p></div>
      <label className="wa-label">Company<select className="wa-select" value={companyId} disabled={loading} onChange={e=>{setCompanyId(e.target.value);setMessage("");setError("");}}>{memberships.map(m=><option value={m.company_id} key={m.company_id}>{"Company "+m.company_id.slice(0,8)+" ("+m.role+")"}</option>)}</select></label>
    </div>
    {error&&<div className="wa-feedback wa-error" role="alert">{error}</div>}
    {message&&<div className="wa-feedback wa-success" role="status">{message}</div>}
    <div className="wa-summary">{[["Total Rules",rules.length],["Active Rules",enabledCount],["Paused Rules",rules.length-enabledCount]].map(([name,n])=><div className="wa-stat" key={name}><span>{name}</span><strong>{loading?"—":n}</strong></div>)}</div>
    <div className="wa-list">{rules.map((r,i)=><section className="wa-rule" key={r.stage}>
      <div className="wa-rule-top"><div><span className="wa-pill">{"STAGE "+String(i+1).padStart(2,"0")}</span><h3>{r.label}</h3><p>{r.description}</p></div><label className="wa-toggle"><input type="checkbox" disabled={!isManager||loading} checked={Boolean(r.enabled)} onChange={e=>updateRule(r.stage,{enabled:e.target.checked})}/>{r.enabled?"Enabled":"Paused"}</label></div>
      <div className="wa-fields">
        <div><label className="wa-label" htmlFor={"title-"+r.stage}>Automatic Task Title</label><input id={"title-"+r.stage} className="wa-input" maxLength={180} disabled={!isManager||loading} value={r.task_title||""} onChange={e=>updateRule(r.stage,{task_title:e.target.value})}/></div>
        <div><label className="wa-label" htmlFor={"days-"+r.stage}>Deadline (days)</label><input id={"days-"+r.stage} className="wa-input" type="number" min={0} max={30} step={1} disabled={!isManager||loading} value={r.days_to_due} onChange={e=>updateRule(r.stage,{days_to_due:e.target.value})}/></div>
        <div><label className="wa-label" htmlFor={"priority-"+r.stage}>Priority</label><select id={"priority-"+r.stage} className="wa-select" disabled={!isManager||loading} value={r.priority} onChange={e=>updateRule(r.stage,{priority:e.target.value})}>{["low","medium","high","urgent"].map(p=><option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}</select></div>
      </div>
    </section>)}</div>
    <div className="wa-actions"><button type="button" className="wa-reset" onClick={reset} disabled={!isManager||loading||saving}>Reset to suggested defaults</button><button type="button" className="wa-action" disabled={!isManager||loading||saving||Boolean(error)} onClick={save}>{saving?"Saving...":"Save Automation Rules"}</button></div>
    <p className="wa-foot">{isManager?"Only future stage changes use the saved rules.":"Read-only: company Admins and HR Managers can change rules."} Automatic tasks are assigned to the teammate changing the stage and appear in Task Management and SLA Monitoring. No system tests are run from this page.</p>
    <div style={{display:"flex",alignItems:"center",gap:22,flexWrap:"wrap",marginTop:16}}><Link href="/app/recruitment-operations/analytics" className="wa-back">View Automation Analytics →</Link><Link href="/app/recruitment-operations/tasks" className="wa-back">View Recruitment Tasks →</Link></div>
  </div></div>
 </div></main>;
}
