"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import ATSNavigation from "@/components/ATSNavigation";

const STAGES = ["screening", "interview", "shortlisted", "hired", "rejected"];
const STATUS_LABELS = {todo:"To Do",in_progress:"In Progress",blocked:"Blocked",completed:"Completed"};
const PERIODS = [{value:"7",label:"Last 7 days"},{value:"30",label:"Last 30 days"},{value:"90",label:"Last 90 days"},{value:"all",label:"All time"}];

function localDate() {
 const d = new Date();
 return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");
}
function dayNumber(date) {
 if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
 const [year,month,day] = date.split("-").map(Number);
 return Math.floor(Date.UTC(year,month-1,day)/86400000);
}
function stageFromDescription(description) {
 const source = String(description || "");
 let match = source.match(/^Automatic task for candidate stage:\s*(Screening|Interview|Shortlisted|Hired|Rejected)\b/i);
 if (!match) match = source.match(/^Automatically generated when candidate entered\s+(Screening|Interview|Shortlisted|Hired|Rejected)\s+stage\b/i);
 return match ? match[1].toLowerCase() : null;
}
function formatDate(date) {
 if (!date) return "Not set";
 const d = new Date(date.length===10 ? date+"T12:00:00" : date);
 return Number.isNaN(d.getTime()) ? "Not set" : d.toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"});
}
function nameFor(id, uid) {
 return !id ? "Unassigned" : id===uid ? "You" : "Member · "+String(id).slice(0,8);
}
function RowProgress({value}) {
 return <div className="aa-track"><div className="aa-fill" style={{width:Math.min(100,Math.max(0,value))+"%"}} /></div>;
}

const css = [
 ".aa-root{min-height:100vh;background:#f5f8f6;color:#183a2c;font:14px Arial,Helvetica,sans-serif}",
 ".aa-root *{box-sizing:border-box}",
 ".aa-shell{display:grid;grid-template-columns:252px minmax(0,1fr);min-height:100vh}",
 ".aa-sidebar{background:#fff;border-right:1px solid #e5ece7;padding:27px 14px 22px}",
 ".aa-brand{padding:3px 13px 32px;font-size:18px;font-weight:850;color:#173e30}",
 ".aa-brand small{display:block;font-size:9px;color:#83978a;letter-spacing:1.6px;margin-top:3px}",
 ".aa-nav{display:flex;flex-direction:column;gap:4px}",
 ".aa-nav a{display:flex;align-items:center;gap:12px;text-decoration:none;color:#5d7267;font-size:12px;font-weight:700;padding:11px 12px;border-radius:10px}",
 ".aa-nav a:hover,.aa-nav a.active{background:#e5f2e9;color:#145f42}",
 ".aa-main{padding:28px clamp(18px,3vw,52px) 64px;min-width:0}",
 ".aa-inner{max-width:1240px;margin:auto}",
 ".aa-back{display:inline-block;margin-bottom:22px;color:#1b7050;font-size:12px;font-weight:750;text-decoration:none}",
 ".aa-hero{background:linear-gradient(115deg,#113e2d,#257b53);border-radius:20px;padding:34px 37px;color:#fff;display:flex;justify-content:space-between;align-items:center;gap:25px}",
 ".aa-hero small{font-size:10px;letter-spacing:2px;font-weight:800;color:#bce7ce}",
 ".aa-hero h1{font-size:30px;color:#fff;margin:11px 0}",
 ".aa-hero p{max-width:730px;color:#e0f0e7;font-size:13px;line-height:1.75;margin:0}",
 ".aa-hero-badge{padding:20px;border:1px solid #ffffff3b;border-radius:16px;text-align:center;min-width:145px}",
 ".aa-hero-badge strong{display:block;font-size:28px}",
 ".aa-hero-badge span{font-size:11px;color:#e1f4e9}",
 ".aa-toolbar{display:flex;justify-content:space-between;align-items:end;gap:15px;flex-wrap:wrap;margin:28px 0 19px}",
 ".aa-toolbar h2{font-size:20px;margin:0 0 6px;color:#193f2d}",
 ".aa-toolbar p{font-size:12px;color:#7a8e80;margin:0}",
 ".aa-filters{display:flex;gap:10px;align-items:end;flex-wrap:wrap}",
 ".aa-filter label{display:block;color:#62806b;font-weight:750;font-size:10px;margin-bottom:6px}",
 ".aa-filter select{border:1px solid #d9e6dc;border-radius:9px;background:#fff;color:#194c38;font:inherit;font-size:12px;padding:11px;min-width:155px}",
 ".aa-refresh{border:1px solid #d6e7db;background:#eaf4ee;border-radius:9px;color:#1c6847;font-weight:800;padding:11px 14px;cursor:pointer}",
 ".aa-refresh:disabled{opacity:.5;cursor:not-allowed}",
 ".aa-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:13px;margin-bottom:16px}",
 ".aa-metric{background:#fff;border:1px solid #e1ebe4;border-radius:15px;padding:20px;min-width:0}",
 ".aa-metric span{font-size:11px;color:#6d8776;font-weight:750}",
 ".aa-metric strong{display:block;color:#176b49;font-size:29px;margin:7px 0}",
 ".aa-metric small{font-size:10px;color:#94a398}",
 ".aa-sections{display:grid;grid-template-columns:1.08fr 1fr;gap:16px;margin-top:17px}",
 ".aa-panel{background:#fff;border:1px solid #e1ebe4;border-radius:16px;padding:23px;min-width:0}",
 ".aa-panel h3{font-size:17px;margin:0 0 9px;color:#183d2e}",
 ".aa-desc{color:#7b9183;font-size:12px;line-height:1.5;margin:0 0 20px}",
 ".aa-bars{height:190px;display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:12px;align-items:end;padding-top:12px}",
 ".aa-bar-col{display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;gap:7px}",
 ".aa-bar-col strong{font-size:11px;color:#246d4b}",
 ".aa-bar-space{height:140px;width:100%;background:#f0f6f1;border-radius:8px;display:flex;align-items:end;overflow:hidden}",
 ".aa-bar{width:100%;min-height:0;background:linear-gradient(#55b57c,#19724e);border-radius:8px 8px 0 0}",
 ".aa-bar-col small{font-size:10px;color:#789080;white-space:nowrap}",
 ".aa-list-row{padding:13px 0;border-top:1px solid #edf2ee}",
 ".aa-row-head{display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:12px}",
 ".aa-row-head strong{font-weight:800;color:#204d38}",
 ".aa-row-head span{color:#6d8776;font-size:11px}",
 ".aa-track{width:100%;height:8px;background:#eaf2ec;border-radius:999px;overflow:hidden;margin:10px 0 4px}",
 ".aa-fill{height:100%;background:#21845a;border-radius:999px}",
 ".aa-stage-line{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:12px 0;border-top:1px solid #edf1ee;font-size:12px}",
 ".aa-stage-line b{color:#176b49}",
 ".aa-stage-line small{display:block;margin-top:4px;color:#84998a}",
 ".aa-pill{display:inline-block;background:#eaf5ed;color:#196847;border-radius:99px;padding:5px 10px;font-size:10px;font-weight:800}",
 ".aa-table-scroll{width:100%;overflow-x:auto}",
 ".aa-table{width:100%;border-collapse:collapse;font-size:12px}",
 ".aa-table th{font-size:10px;color:#759281;letter-spacing:.3px;text-align:left;background:#f8faf8;padding:13px 11px;white-space:nowrap}",
 ".aa-table td{padding:13px 11px;border-top:1px solid #edf2ef;color:#476452;vertical-align:middle}",
 ".aa-table td:first-child{font-weight:800;color:#214d36}",
 ".aa-table td strong{color:#176b49}",
 ".aa-table tr:hover td{background:#fbfdfb}",
 ".aa-table a{color:#1a754d;text-decoration:none;font-weight:800}",
 ".aa-status{border-radius:99px;padding:5px 10px;font-size:10px;font-weight:800;display:inline-block;white-space:nowrap}",
 ".aa-status.completed{background:#e8f5ed;color:#21744c}",
 ".aa-status.overdue{background:#ffefeb;color:#a9493d}",
 ".aa-status.pending{background:#edf3ef;color:#517364}",
 ".aa-status.blocked{background:#fff0dd;color:#986c2a}",
 ".aa-error{padding:14px 16px;margin:15px 0;background:#fff0eb;border:1px solid #f2d8cf;color:#a24437;border-radius:11px;font-size:12px}",
 ".aa-empty{text-align:center;padding:38px 20px;color:#819487;font-size:12px}",
 ".aa-eyebrow{color:#27835a;font-size:10px;letter-spacing:1.5px;font-weight:850;margin-bottom:9px}",
 ".aa-headline{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 0 18px}",
 ".aa-headline h2{font-size:20px;margin:0;color:#173e2e}",
 ".aa-link{font-size:12px;color:#18714b;text-decoration:none;font-weight:800}",
 ".aa-note{font-size:11px;color:#83978a;line-height:1.65;margin-top:15px}",
 "@media(max-width:1100px){.aa-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.aa-sections{grid-template-columns:1fr}}",
 "@media(max-width:750px){.aa-shell{display:block}.aa-sidebar{padding:14px;border-right:0;border-bottom:1px solid #e5ece7}.aa-brand{padding:3px 0 14px}.aa-nav{flex-direction:row;overflow-x:auto}.aa-nav a{white-space:nowrap}.aa-main{padding:22px 15px 50px}.aa-hero{padding:27px 23px}.aa-hero h1{font-size:25px}.aa-hero-badge{display:none}.aa-toolbar{align-items:start;flex-direction:column}.aa-filters{width:100%}.aa-filter{flex:1}.aa-filter select{min-width:0;width:100%}.aa-metrics{gap:9px}.aa-metric{padding:16px}.aa-metric strong{font-size:24px}.aa-bars{gap:5px}.aa-bar-col small{font-size:9px}}"
].join("\n");

export default function AutomationAnalyticsPage() {
 const [uid,setUid]=useState("");
 const [memberships,setMemberships]=useState([]);
 const [companyId,setCompanyId]=useState("");
 const [period,setPeriod]=useState("30");
 const [stageFilter,setStageFilter]=useState("all");
 const [statusFilter,setStatusFilter]=useState("all");
 const [tasks,setTasks]=useState([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [truncated,setTruncated]=useState(false);
 const [reload,setReload]=useState(0);

 useEffect(()=>{
  let active=true;
  (async()=>{
   const {data:auth,error:authError}=await supabase.auth.getUser();
   if(!active)return;
   if(authError||!auth?.user){setError("Please sign in to view automation analytics.");setLoading(false);return;}
   setUid(auth.user.id);
   const {data:membershipRows,error:membershipError}=await supabase.from("company_members").select("company_id,role").eq("user_id",auth.user.id);
   if(!active)return;
   if(membershipError){setError(membershipError.message);setLoading(false);return;}
   const list=membershipRows||[];
   setMemberships(list);
   const first=list.find(m=>m.company_id)?.company_id;
   if(first)setCompanyId(first);
   else {setError("Join a company before viewing automation analytics.");setLoading(false);}
  })();
  return()=>{active=false;};
 },[]);

 useEffect(()=>{
  if(!companyId)return;
  let active=true;
  (async()=>{
   setLoading(true);setError("");setTruncated(false);setTasks([]);
   const collected=[];
   const pageSize=500;
   const maxPages=10;
   let hasMore=false;
   let queryError=null;
   const after=period==="all"?null:new Date(Date.now()-Number(period)*86400000).toISOString();
   for(let page=0;page<maxPages;page++){
    let query=supabase.from("recruitment_tasks")
     .select("id,title,description,status,priority,due_date,created_at,company_id,assigned_to,created_by,candidate_id,job_id")
     .eq("company_id",companyId)
     .or("description.ilike.Automatic task for candidate stage:%,description.ilike.Automatically generated when candidate entered%")
     .order("created_at",{ascending:false})
     .range(page*pageSize,(page+1)*pageSize-1);
    if(after)query=query.gte("created_at",after);
    const {data,error:fetchError}=await query;
    if(!active)return;
    if(fetchError){queryError=fetchError;break;}
    collected.push(...(data||[]));
    if((data||[]).length<pageSize){hasMore=false;break;}
    hasMore=page===maxPages-1;
   }
   if(!active)return;
   if(queryError){setError("Could not load automation activity: "+queryError.message);setTasks([]);}
   else {setTasks(collected.map(t=>({...t,automation_stage:stageFromDescription(t.description)})).filter(t=>t.automation_stage));setTruncated(hasMore);}
   setLoading(false);
  })();
  return()=>{active=false;};
 },[companyId,period,reload]);

 const today=localDate();
 const todayDay=dayNumber(today);
 const stagesOnly=useMemo(()=>tasks.filter(t=>stageFilter==="all"||t.automation_stage===stageFilter),[tasks,stageFilter]);
 const overdue=t=>t.status!=="completed"&&t.due_date&&t.due_date<today;
 const completed=stagesOnly.filter(t=>t.status==="completed");
 const overdueOpen=stagesOnly.filter(overdue);
 const open=stagesOnly.filter(t=>t.status!=="completed");
 const completionRate=stagesOnly.length?Math.round(completed.length/stagesOnly.length*100):0;
 const openAge=open.length?Math.round(open.reduce((sum,t)=>{
  const day=dayNumber(t.created_at?.slice(0,10));
  return sum+(day===null?0:Math.max(0,todayDay-day));
 },0)/open.length):0;
 const visibleTasks=stagesOnly.filter(t=>{
  if(statusFilter==="all")return true;
  if(statusFilter==="overdue")return overdue(t);
  return t.status===statusFilter;
 });
 const isManager=memberships.some(m=>m.company_id===companyId&&["admin","hr_manager"].includes(String(m.role||"").toLowerCase()));

 const stageRows=STAGES.map(stage=>{
  const items=tasks.filter(t=>t.automation_stage===stage);
  const done=items.filter(t=>t.status==="completed").length;
  const late=items.filter(overdue).length;
  return {stage,total:items.length,done,late,rate:items.length?Math.round(done/items.length*100):0};
 });
 const chartMaxDate=new Date();
 const trend=Array.from({length:6},(_,index)=>{
  const end=new Date(chartMaxDate.getFullYear(),chartMaxDate.getMonth(),chartMaxDate.getDate()-((5-index)*7));
  const start=new Date(end.getFullYear(),end.getMonth(),end.getDate()-6);
  const count=stagesOnly.filter(t=>{
   const d=t.created_at?new Date(t.created_at):null;
   return d&&!Number.isNaN(d.getTime())&&d>=start&&d<new Date(end.getFullYear(),end.getMonth(),end.getDate()+1);
  }).length;
  return {label:start.toLocaleDateString("en-GB",{day:"numeric",month:"short"}),count};
 });
 const maxTrend=Math.max(1,...trend.map(t=>t.count));

 return <main className="aa-root"><style>{css}</style><div className="aa-shell">
  <aside className="aa-sidebar"><div className="aa-brand">◈ Inspire Match<small>TALENT INTELLIGENCE</small></div><ATSNavigation className="aa-nav"/></aside>
  <div className="aa-main"><div className="aa-inner">
   <Link href="/app/recruitment-operations" className="aa-back">← Recruitment Operations</Link>
   <header className="aa-hero">
    <div><small>RECRUITMENT OPERATIONS / AUTOMATION INTELLIGENCE</small><h1>Automation Activity &amp; Performance</h1><p>Track stage-triggered recruitment tasks, team follow-through and deadline risks from the same connected hiring workflow.</p></div>
    <div className="aa-hero-badge"><strong>{loading?"—":stagesOnly.length}</strong><span>Automated tasks</span></div>
   </header>
   <section className="aa-toolbar" aria-label="Automation analytics filters">
    <div><h2>Workflow performance overview</h2><p>Based on the automatic follow-up tasks accessible to your account.</p></div>
    <div className="aa-filters">
     <div className="aa-filter"><label htmlFor="aa-company">Company</label>
      <select id="aa-company" value={companyId} disabled={!memberships.length} onChange={e=>{setCompanyId(e.target.value);setStageFilter("all");setStatusFilter("all");}}>
       {memberships.filter((m,i,list)=>list.findIndex(x=>x.company_id===m.company_id)===i).map(m=><option key={m.company_id} value={m.company_id}>Company {String(m.company_id).slice(0,8)}</option>)}
      </select>
     </div>
     <div className="aa-filter"><label htmlFor="aa-period">Time period</label>
      <select id="aa-period" value={period} onChange={e=>setPeriod(e.target.value)}>{PERIODS.map(p=><option key={p.value} value={p.value}>{p.label}</option>)}</select>
     </div>
     <div className="aa-filter"><label htmlFor="aa-stage">Candidate stage</label>
      <select id="aa-stage" value={stageFilter} onChange={e=>setStageFilter(e.target.value)}><option value="all">All stages</option>{STAGES.map(s=><option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}</select>
     </div>
     <button className="aa-refresh" type="button" disabled={loading||!companyId} onClick={()=>setReload(n=>n+1)}>↻ Refresh</button>
    </div>
   </section>
   {error&&<div role="alert" className="aa-error">{error}</div>}
   {truncated&&<div role="status" className="aa-error">Showing the latest 5,000 automated tasks for this period. Narrow the date range to view more recent results.</div>}

   <div className="aa-metrics" aria-label="Automation performance metrics">
    {[
      {name:"Automated Tasks",number:stagesOnly.length,caption:"Tasks created by workflow triggers"},
      {name:"Completed",number:completed.length,caption:"Completion rate: "+completionRate+"%"},
      {name:"Overdue Open",number:overdueOpen.length,caption:"Past due date, not completed"},
      {name:"Avg. Open Age",number:open.length?openAge+"d":"—",caption:"Average days since creation of open tasks"}
    ].map(metric=><div className="aa-metric" key={metric.name}><span>{metric.name}</span><strong>{loading?"—":metric.number}</strong><small>{metric.caption}</small></div>)}
   </div>
   <div className="aa-sections">
    <section className="aa-panel">
     <h3>Automation Generation Trend</h3><p className="aa-desc">New automated tasks created across the last six weeks. The current week is included.</p>
     {loading?<div className="aa-empty">Loading activity...</div>:<div className="aa-bars" role="img" aria-label={"Automated tasks by week: "+trend.map(t=>t.label+" "+t.count).join(", ")}>
      {trend.map((t,i)=><div className="aa-bar-col" key={i}><strong>{t.count}</strong><div className="aa-bar-space"><div className="aa-bar" style={{height:(t.count?Math.max(5,t.count/maxTrend*100):0)+"%"}}/></div><small>{t.label}</small></div>)}
     </div>}
    </section>
    <section className="aa-panel">
     <h3>Task Status Distribution</h3><p className="aa-desc">Progress and blockers across automatically generated tasks.</p>
     {["todo","in_progress","blocked","completed"].map(status=>{
      const count=stagesOnly.filter(t=>t.status===status).length;
      const percent=stagesOnly.length?Math.round(count/stagesOnly.length*100):0;
      return <div className="aa-list-row" key={status}><div className="aa-row-head"><strong>{STATUS_LABELS[status]}</strong><span>{loading?"—":count+" · "+percent+"%"}</span></div><RowProgress value={percent}/></div>;
     })}
    </section>
   </div>

   <section className="aa-panel" style={{marginTop:17}}>
    <div className="aa-headline"><div><div className="aa-eyebrow">STAGE EFFECTIVENESS</div><h2>Automation by Recruitment Stage</h2></div><Link href="/app/recruitment-operations/automation" className="aa-link">Manage Rules →</Link></div>
    <p className="aa-desc">Understand where automated tasks are getting completed and where active follow-up is delayed.</p>
    <div className="aa-table-scroll"><table className="aa-table"><thead><tr><th>Stage</th><th>Generated</th><th>Completed</th><th>Open</th><th>Overdue</th><th style={{minWidth:155}}>Completion rate</th></tr></thead>
    <tbody>{stageRows.map(r=><tr key={r.stage}><td>{r.stage.charAt(0).toUpperCase()+r.stage.slice(1)}</td><td>{loading?"—":r.total}</td><td>{loading?"—":r.done}</td><td>{loading?"—":r.total-r.done}</td><td>{loading?"—":r.late}</td><td><div style={{display:"flex",alignItems:"center",gap:10}}><div style={{flex:1,minWidth:65}}><RowProgress value={r.rate}/></div><strong>{loading?"—":r.rate+"%"}</strong></div></td></tr>)}</tbody></table></div>
   </section>

   <section className="aa-panel" style={{marginTop:17}}>
    <div className="aa-headline"><div><div className="aa-eyebrow">LATEST AUTOMATION EVENTS</div><h2>Automation Activity Feed</h2></div><Link href="/app/recruitment-operations/tasks" className="aa-link">View All Tasks →</Link></div>
    <div className="aa-filters" style={{marginBottom:18}}>
     <div className="aa-filter"><label htmlFor="aa-status">Filter by task status</label>
      <select id="aa-status" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
       <option value="all">All statuses</option><option value="todo">To Do</option><option value="in_progress">In Progress</option><option value="blocked">Blocked</option><option value="completed">Completed</option><option value="overdue">Overdue Open</option>
      </select>
     </div><span className="aa-pill">{loading?"Loading":visibleTasks.length+" activities"}</span>
    </div>
    {loading?<div className="aa-empty">Loading automation activity...</div>:!visibleTasks.length?<div className="aa-empty">No automated tasks match these filters yet. Tasks will appear here when candidate stages trigger follow-up work.</div>:
     <div className="aa-table-scroll"><table className="aa-table">
      <thead><tr><th>Task</th><th>Stage</th><th>Owner</th><th>Created</th><th>Due</th><th>Status</th><th>Candidate</th></tr></thead>
      <tbody>{visibleTasks.slice(0,40).map(t=><tr key={t.id}>
       <td style={{minWidth:220}}>{t.title}</td><td>{t.automation_stage.charAt(0).toUpperCase()+t.automation_stage.slice(1)}</td><td>{nameFor(t.assigned_to,uid)}</td>
       <td>{formatDate(t.created_at)}</td><td>{formatDate(t.due_date)}</td>
       <td><span className={"aa-status "+(overdue(t)?"overdue":t.status==="completed"?"completed":t.status==="blocked"?"blocked":"pending")}>{overdue(t)?"Overdue":STATUS_LABELS[t.status]||t.status}</span></td>
       <td>{t.candidate_id?<Link href={"/app/candidates/"+t.candidate_id}>View Profile →</Link>:"—"}</td>
      </tr>)}</tbody></table></div>}
    {visibleTasks.length>40&&<p className="aa-note">Showing the 40 most recent matching activities. Use the time and stage filters to narrow your view.</p>}
    <p className="aa-note">Metrics reflect tasks from the configured candidate-stage automation only and the records your company membership permits you to view. {isManager?"Your manager role may include the company's team tasks.":"Some team tasks may not be visible to your account."} Task completion rate is an operational measure, not proof of reduced time-to-hire; completion timestamps are not available for an accurate time-saved calculation.</p>
   </section>
  </div></div>
 </div></main>;
}
