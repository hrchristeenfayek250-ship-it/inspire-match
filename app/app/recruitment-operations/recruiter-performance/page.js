"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import ATSNavigation from "@/components/ATSNavigation";

const css = [
".rp-root{min-height:100vh;background:#f5f8f6;color:#193b2b;font:14px Arial,Helvetica,sans-serif}",
".rp-root *{box-sizing:border-box}",
".rp-shell{display:grid;grid-template-columns:252px minmax(0,1fr);min-height:100vh}",
".rp-side{background:#fff;border-right:1px solid #e4ece6;padding:27px 14px}",
".rp-brand{padding:3px 13px 32px;font-size:18px;font-weight:850;color:#173e30}",
".rp-brand small{display:block;color:#83978a;letter-spacing:1.6px;font-size:9px;margin-top:4px}",
".rp-nav{display:flex;flex-direction:column;gap:4px}",
".rp-nav a{display:flex;align-items:center;gap:12px;text-decoration:none;color:#5d7267;font-size:12px;font-weight:700;padding:11px 12px;border-radius:10px}",
".rp-nav a:hover,.rp-nav a.active{background:#e5f2e9;color:#145f42}",
".rp-main{padding:28px clamp(18px,3vw,52px) 64px;min-width:0}",
".rp-inner{width:100%;max-width:1240px;margin:auto}",
".rp-back{display:inline-block;margin-bottom:20px;color:#1b7050;font-size:12px;font-weight:800;text-decoration:none}",
".rp-hero{background:linear-gradient(115deg,#113e2d,#257b53);border-radius:20px;padding:34px 37px;color:white;display:flex;align-items:center;justify-content:space-between;gap:22px}",
".rp-hero small{font-size:10px;letter-spacing:1.6px;font-weight:800;color:#bce7ce}",
".rp-hero h1{font-size:30px;line-height:1.23;margin:11px 0;color:#fff}",
".rp-hero p{font-size:13px;line-height:1.7;color:#e1f1e8;margin:0;max-width:720px}",
".rp-hero-badge{flex:0 0 124px;border-radius:15px;border:1px solid #ffffff43;text-align:center;padding:18px 12px}",
".rp-hero-badge strong{font-size:30px;display:block;line-height:1.25}",
".rp-hero-badge span{font-size:11px;color:#e0f0e7}",
".rp-toolbar{display:flex;align-items:end;justify-content:space-between;flex-wrap:wrap;gap:18px;margin:27px 0 17px}",
".rp-toolbar h2{font-size:19px;margin:0 0 7px;color:#193f2e}",
".rp-toolbar p{font-size:12px;color:#799084;margin:0;line-height:1.6}",
".rp-filters{display:flex;gap:12px;flex-wrap:wrap;align-items:end}",
".rp-field{font-size:11px;font-weight:800;color:#607b69;display:flex;flex-direction:column;gap:7px}",
".rp-field select{min-width:170px;width:100%;max-width:250px;padding:11px 12px;border-radius:9px;border:1px solid #dce7df;background:white;color:#20533a;font:13px Arial,Helvetica,sans-serif}",
".rp-metrics{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px;margin-bottom:17px}",
".rp-metric{background:white;border:1px solid #e0ebe4;border-radius:15px;padding:20px;min-width:0}",
".rp-metric-label{display:block;font-size:11px;font-weight:800;color:#6c8978;line-height:1.4;min-height:29px}",
".rp-metric strong{display:block;font-size:29px;line-height:1.1;color:#176b49;margin:12px 0 8px;overflow-wrap:anywhere}",
".rp-metric small{display:block;font-size:11px;color:#82988a;line-height:1.5}",
".rp-panel{border:1px solid #e0ebe4;border-radius:16px;background:#fff;padding:24px;min-width:0;margin-bottom:17px}",
".rp-heading{display:flex;justify-content:space-between;align-items:start;gap:20px;flex-wrap:wrap;margin-bottom:18px}",
".rp-heading h3{font-size:19px;color:#194130;margin:0 0 8px}",
".rp-heading p{font-size:12px;color:#7d9184;line-height:1.7;margin:0;max-width:790px}",
".rp-status{display:inline-block;background:#eaf5ee;color:#176a49;font-size:11px;font-weight:800;border-radius:999px;padding:8px 12px;white-space:nowrap}",
".rp-team{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}",
".rp-person{border:1px solid #e0ebe4;border-radius:13px;padding:19px;background:#fcfefc;min-width:0}",
".rp-person-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px}",
".rp-person-name{font-size:14px;font-weight:800;color:#1e4934;overflow-wrap:anywhere}",
".rp-role{font-size:10px;font-weight:800;text-transform:uppercase;color:#26774e;background:#e8f4eb;border-radius:8px;padding:6px 9px;white-space:nowrap}",
".rp-person-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}",
".rp-person-stats>div{background:white;border:1px solid #eaf0eb;border-radius:10px;padding:11px 10px;min-width:0}",
".rp-person-stats strong{font-size:20px;color:#176b49;display:block;margin-bottom:5px}",
".rp-person-stats span{font-size:10px;color:#718977;line-height:1.4;display:block}",
".rp-person-foot{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;padding-top:14px;margin-top:14px;border-top:1px solid #e7eee9;color:#6b8676;font-size:11px}",
".rp-person-foot strong{color:#245e40}",
".rp-empty{padding:35px 18px;text-align:center;background:#f9fcfa;border-radius:12px;color:#7b9182;font-size:12px}",
".rp-error{border:1px solid #f0d4ca;background:#fff1ec;color:#9a4234;padding:14px;border-radius:10px;margin-bottom:16px}",
".rp-warning{border:1px solid #f1dfbd;background:#fff9ed;color:#8b621e;padding:14px;border-radius:10px;margin-bottom:16px}",
".rp-info{font-size:12px;line-height:1.8;color:#768b7d;margin:0}",
".rp-info strong{color:#395e46}",
".rp-links{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}",
".rp-link{color:#19744c;font-size:12px;font-weight:800;text-decoration:none}",
"@media(max-width:1200px){.rp-metrics{grid-template-columns:repeat(3,minmax(0,1fr))}}",
"@media(max-width:900px){.rp-shell{grid-template-columns:205px minmax(0,1fr)}.rp-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.rp-team{grid-template-columns:1fr}}",
"@media(max-width:700px){.rp-shell{display:block}.rp-side{padding:14px;border-right:0;border-bottom:1px solid #e4ece6}.rp-brand{padding:0 0 13px}.rp-nav{flex-direction:row;overflow:auto}.rp-nav a{white-space:nowrap}.rp-main{padding:20px 15px 45px}.rp-hero{padding:25px 22px}.rp-hero h1{font-size:25px}.rp-hero-badge{display:none}.rp-metrics{gap:9px}.rp-metric{padding:16px}.rp-panel{padding:18px}}",
"@media(max-width:410px){.rp-person-stats{grid-template-columns:repeat(2,minmax(0,1fr))}.rp-filters{width:100%}.rp-field{width:100%}.rp-field select{max-width:none}.rp-metric strong{font-size:26px}}"
].join("\n");

function dateLocal(iso){const d=new Date(iso);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");}
const pct=(n,d)=>d?Math.round(n/d*100)+"%":"N/A";
const display=(id,me)=>id===me?"You":"Team Member · "+String(id||"").slice(0,8);

export default function RecruiterPerformancePage(){
 const [userId,setUserId]=useState("");
 const [companies,setCompanies]=useState([]);
 const [companyId,setCompanyId]=useState("");
 const [members,setMembers]=useState([]);
 const [tasks,setTasks]=useState([]);
 const [events,setEvents]=useState([]);
 const [period,setPeriod]=useState("90");
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [warning,setWarning]=useState("");
 useEffect(()=>{let active=true;(async()=>{
  const {data,error:e}=await supabase.auth.getUser();
  if(!active)return;
  if(e||!data?.user){setError("Please sign in.");setLoading(false);return;}
  setUserId(data.user.id);
  const m=await supabase.from("company_members").select("company_id,role").eq("user_id",data.user.id);
  if(!active)return;
  if(m.error){setError(m.error.message);setLoading(false);return;}
  const allowed=(m.data||[]).filter(x=>["admin","hr_manager"].includes(String(x.role).toLowerCase()));
  setCompanies(allowed);
  if(allowed.length)setCompanyId(allowed[0].company_id);
  else {setError("Only company Admins and HR Managers can view team performance.");setLoading(false);}
 })();return()=>{active=false};},[]);
 useEffect(()=>{if(!companyId)return;let active=true;setLoading(true);setError("");setWarning("");setMembers([]);setTasks([]);setEvents([]);
 (async()=>{
  const [m,t,h]=await Promise.all([
   supabase.from("company_members").select("user_id,role").eq("company_id",companyId),
   supabase.from("recruitment_tasks").select("id,title,assigned_to,status,due_date,priority,created_at").eq("company_id",companyId).order("created_at",{ascending:false}).limit(5000),
   supabase.from("recruitment_task_status_history").select("task_id,changed_by,new_status,changed_at,due_date_at_change").eq("company_id",companyId).order("changed_at",{ascending:false}).limit(5000)
  ]);
  if(!active)return;
  if(m.error||t.error||h.error){setError("Could not load report: "+(m.error||t.error||h.error).message);setLoading(false);return;}
  setMembers(m.data||[]);setTasks(t.data||[]);setEvents(h.data||[]);
  if((t.data||[]).length===5000||(h.data||[]).length===5000)setWarning("Results may be incomplete: the 5,000-row retrieval limit was reached.");
  setLoading(false);
 })();return()=>{active=false};},[companyId]);
 const rows=useMemo(()=>{
  const since=period==="all"?0:Date.now()-Number(period)*86400000;
  const taskIds=new Set(tasks.map(t=>t.id));
  const recent=events.filter(e=>e.new_status==="completed"&&taskIds.has(e.task_id)&&new Date(e.changed_at).getTime()>=since);
  return members.map(m=>{
   const mine=tasks.filter(t=>t.assigned_to===m.user_id);
   const open=mine.filter(t=>t.status!=="completed");
   const today=dateLocal(new Date());
   const completions=recent.filter(e=>e.changed_by===m.user_id);
   const measurable=completions.filter(e=>e.due_date_at_change);
   const onTime=measurable.filter(e=>dateLocal(e.changed_at)<=e.due_date_at_change.slice(0,10)).length;
   return {id:m.user_id,role:m.role,open:open.length,overdue:open.filter(t=>t.due_date&&t.due_date<today).length,blocked:open.filter(t=>t.status==="blocked").length,completedEvents:completions.length,measurable:measurable.length,onTime};
  });
 },[members,tasks,events,period]);
 const total=rows.reduce((a,r)=>({open:a.open+r.open,overdue:a.overdue+r.overdue,blocked:a.blocked+r.blocked,completed:a.completed+r.completedEvents,measurable:a.measurable+r.measurable,onTime:a.onTime+r.onTime}),{open:0,overdue:0,blocked:0,completed:0,measurable:0,onTime:0});
 return <main className="rp-root">
  <style>{css}</style>
  <div className="rp-shell">
   <aside className="rp-side">
    <div className="rp-brand">◈ Inspire Match<small>TALENT INTELLIGENCE</small></div>
    <ATSNavigation className="rp-nav"/>
   </aside>
   <div className="rp-main"><div className="rp-inner">
    <Link className="rp-back" href="/app/recruitment-operations">← Recruitment Operations</Link>
    <header className="rp-hero">
     <div>
      <small>RECRUITMENT OPERATIONS / TEAM INSIGHTS</small>
      <h1>Recruiter Performance &amp; Follow-Through</h1>
      <p>Understand team workload, task completions and deadline reliability. A reporting view for managers — not an employee ranking.</p>
     </div>
     <div className="rp-hero-badge"><strong>{loading?"—":members.length}</strong><span>Team members</span></div>
    </header>
    <div className="rp-toolbar">
     <div><h2>Team performance overview</h2><p>Current workload and measurable completion history for the selected company.</p></div>
     {companies.length>0&&<div className="rp-filters">
      <label className="rp-field">Company
       <select value={companyId} onChange={e=>setCompanyId(e.target.value)} aria-label="Select company">
        {companies.map(x=><option key={x.company_id} value={x.company_id}>Company {x.company_id.slice(0,8)}</option>)}
       </select>
      </label>
      <label className="rp-field">Completion reporting window
       <select value={period} onChange={e=>setPeriod(e.target.value)} aria-label="Completion reporting window">
        <option value="30">Last 30 days</option>
        <option value="90">Last 90 days</option>
        <option value="all">All recorded history</option>
       </select>
      </label>
     </div>}
    </div>
    {error&&<div className="rp-error" role="alert">{error}</div>}
    {warning&&<div className="rp-warning" role="status">{warning}</div>}
    {loading?<div className="rp-panel"><p className="rp-info">Loading team performance...</p></div>:!error&&<>
     <div className="rp-metrics">
      {[
       ["Open Assigned Tasks",total.open,"Currently assigned and unfinished"],
       ["Overdue Open",total.overdue,"Open work past its due date"],
       ["Blocked Open",total.blocked,"Tasks needing intervention"],
       ["Recorded Completions",total.completed,"Completion events in selected window"],
       ["On-Time Completion",pct(total.onTime,total.measurable),total.measurable+" measured completion events"]
      ].map(([name,value,description])=><div className="rp-metric" key={name}>
       <span className="rp-metric-label">{name}</span>
       <strong>{value}</strong>
       <small>{description}</small>
      </div>)}
     </div>
     <section className="rp-panel">
      <div className="rp-heading">
       <div><h3>Team Follow-Through</h3>
        <p>Each team member's current open workload, plus completion events recorded during the reporting period. The person who changed a task to Completed is credited — not necessarily its assignee.</p>
       </div>
       <span className="rp-status">{rows.length} members</span>
      </div>
      {!rows.length?<div className="rp-empty">No team members found for this company.</div>:
       <div className="rp-team">{rows.map(r=><article className="rp-person" key={r.id}>
        <div className="rp-person-head">
         <strong className="rp-person-name">{display(r.id,userId)}</strong>
         <span className="rp-role">{String(r.role||"member").replaceAll("_"," ")}</span>
        </div>
        <div className="rp-person-stats">
         {[
          ["Open Tasks",r.open],
          ["Overdue",r.overdue],
          ["Blocked",r.blocked],
          ["Completions",r.completedEvents],
          ["Measured SLA",r.measurable],
          ["On-Time",pct(r.onTime,r.measurable)]
         ].map(([name,value])=><div key={name}><strong>{value}</strong><span>{name}</span></div>)}
        </div>
        <div className="rp-person-foot">
         <span>Current workload ≠ historical ownership</span>
         <strong>{r.measurable?String(r.onTime)+" on-time completions":"No measured SLA yet"}</strong>
        </div>
       </article>)}</div>}
     </section>
     <section className="rp-panel">
      <div className="rp-heading"><div><h3>How to read this report</h3>
       <p>Completion tracking started when task history was enabled; previously completed tasks aren't backfilled. Results are limited to 5,000 tasks and 5,000 events. Reopened tasks can generate multiple completion events.</p>
      </div></div>
      <div className="rp-links">
       <p className="rp-info"><strong>Important:</strong> SLA rates include only recorded completions with due-date snapshots. This dashboard does not measure quality of hire, active work hours or candidate experience; it shouldn't be used alone to evaluate employee performance.</p>
       <Link className="rp-link" href="/app/recruitment-operations/capacity">Open Capacity &amp; SLA Details →</Link>
      </div>
     </section>
    </>}
   </div></div>
  </div>
 </main>;
}
