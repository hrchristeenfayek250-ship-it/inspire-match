"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import ATSNavigation from "@/components/ATSNavigation";

const css = [
".cp-root{min-height:100vh;background:#f5f8f6;color:#193b2b;font:14px Arial,Helvetica,sans-serif}",
".cp-root *{box-sizing:border-box}",
".cp-shell{display:grid;grid-template-columns:252px minmax(0,1fr);min-height:100vh}",
".cp-side{background:#fff;border-right:1px solid #e5ece7;padding:27px 14px}",
".cp-brand{padding:3px 13px 32px;font-size:18px;font-weight:850;color:#173e30}",
".cp-brand small{display:block;font-size:9px;color:#83978a;letter-spacing:1.6px;margin-top:3px}",
".cp-nav{display:flex;flex-direction:column;gap:4px}",
".cp-nav a{display:flex;align-items:center;gap:12px;text-decoration:none;color:#5d7267;font-size:12px;font-weight:700;padding:11px 12px;border-radius:10px}",
".cp-nav a:hover,.cp-nav a.active{background:#e5f2e9;color:#145f42}",
".cp-main{padding:28px clamp(18px,3vw,52px) 64px;min-width:0}",
".cp-inner{max-width:1240px;margin:auto}",
".cp-back{display:inline-block;margin-bottom:22px;color:#1b7050;font-size:12px;font-weight:750;text-decoration:none}",
".cp-hero{background:linear-gradient(115deg,#113e2d,#257b53);border-radius:20px;padding:35px 37px;color:#fff;display:flex;justify-content:space-between;align-items:center;gap:25px}",
".cp-hero small{font-size:10px;letter-spacing:2px;font-weight:800;color:#bce7ce}",
".cp-hero h1{font-size:30px;color:#fff;margin:10px 0}",
".cp-hero p{max-width:720px;font-size:13px;line-height:1.75;color:#e0f0e7;margin:0}",
".cp-hero-box{border:1px solid #ffffff3b;border-radius:16px;padding:18px 22px;text-align:center;min-width:140px}",
".cp-hero-box strong{font-size:30px;display:block}",
".cp-hero-box span{font-size:11px;color:#d7f1e1}",
".cp-toolbar{display:flex;align-items:end;justify-content:space-between;gap:16px;margin:28px 0 18px;flex-wrap:wrap}",
".cp-toolbar h2{margin:0 0 6px;font-size:20px}",
".cp-toolbar p{margin:0;font-size:12px;color:#7a8e80}",
".cp-filters{display:flex;gap:12px;align-items:end;flex-wrap:wrap}",
".cp-field label{display:block;font-size:11px;color:#5e7b67;font-weight:800;margin-bottom:7px}",
".cp-field select,.cp-field input{background:#fff;border:1px solid #dce7df;border-radius:9px;padding:11px;color:#1c5237;font:inherit;min-width:145px}",
".cp-field input{min-width:90px;width:95px}",
".cp-btn{background:#e9f4ed;color:#1d6a48;border:1px solid #d7e9dc;border-radius:9px;padding:11px 16px;font-weight:800;cursor:pointer}",
".cp-btn:disabled{opacity:.5;cursor:not-allowed}",
".cp-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:13px;margin-bottom:18px}",
".cp-metric{background:#fff;border:1px solid #e1ebe4;border-radius:15px;padding:20px}",
".cp-metric span{font-size:11px;color:#6d8776;font-weight:750}",
".cp-metric strong{display:block;color:#176b49;font-size:29px;margin:7px 0}",
".cp-metric small{font-size:10px;color:#94a398;line-height:1.5}",
".cp-grid{display:grid;grid-template-columns:1.15fr 1fr;gap:16px;margin-bottom:17px}",
".cp-panel{background:#fff;border:1px solid #e1ebe4;border-radius:16px;padding:23px;min-width:0}",
".cp-panel h3{font-size:17px;margin:0 0 9px;color:#183d2e}",
".cp-desc{font-size:12px;color:#7b9183;line-height:1.6;margin:0 0 19px}",
".cp-track{height:9px;background:#e9f2ec;border-radius:99px;overflow:hidden;margin:10px 0}",
".cp-fill{height:100%;background:#248357;border-radius:99px}",
".cp-member{border-top:1px solid #edf2ee;padding:17px 0}",
".cp-row{display:flex;justify-content:space-between;align-items:center;gap:14px}",
".cp-row strong{color:#234d37;font-size:12px}",
".cp-row span{font-size:11px;color:#64826e}",
".cp-sub{font-size:11px;color:#84988a;margin-top:6px}",
".cp-tag{font-size:10px;font-weight:800;border-radius:99px;padding:5px 10px;display:inline-block;background:#eaf5ed;color:#1b734a}",
".cp-tag.high{background:#fff0e8;color:#a65b34}",
".cp-tag.full{background:#fff4db;color:#916822}",
".cp-list-item{padding:14px 0;border-top:1px solid #edf2ee}",
".cp-list-item strong{font-size:12px;color:#244e38;display:block}",
".cp-list-item small{font-size:11px;color:#84988a;display:block;margin-top:6px}",
".cp-empty{font-size:12px;color:#87998c;padding:25px 0}",
".cp-note{font-size:11px;color:#83978a;line-height:1.7;margin:14px 0}",
".cp-error{border:1px solid #f1d4ca;background:#fff0e9;color:#9e4639;border-radius:10px;padding:14px;margin:14px 0;font-size:12px}",
".cp-success{border:1px solid #d1e9d8;background:#eaf7ee;color:#176b49;border-radius:10px;padding:14px;margin:14px 0;font-size:12px}",
".cp-assign-controls{display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin-top:12px}",
".cp-assign-controls select{min-width:180px;flex:1;max-width:320px;background:#fff;border:1px solid #dce7df;border-radius:9px;padding:10px;color:#1c5237;font:inherit}",
".cp-table-wrap{overflow-x:auto}",
".cp-table{width:100%;border-collapse:collapse;font-size:12px}",
".cp-table th{background:#f7faf8;color:#7c9685;text-align:left;padding:13px 11px;font-size:10px;white-space:nowrap}",
".cp-table td{padding:14px 11px;border-top:1px solid #edf2ee;color:#3b624b;white-space:nowrap}",
".cp-table td:first-child{font-weight:800;color:#254d37}",
".cp-link{font-size:12px;color:#19744c;font-weight:800;text-decoration:none}",
"@media(max-width:1100px){.cp-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.cp-grid{grid-template-columns:1fr}}",
"@media(max-width:740px){.cp-shell{display:block}.cp-side{padding:14px;border-right:0;border-bottom:1px solid #e5ece7}.cp-brand{padding:0 0 13px}.cp-nav{flex-direction:row;overflow-x:auto}.cp-nav a{white-space:nowrap}.cp-main{padding:22px 15px 50px}.cp-hero{padding:27px 23px}.cp-hero h1{font-size:25px}.cp-hero-box{display:none}.cp-metrics{gap:9px}.cp-metric{padding:15px}.cp-metric strong{font-size:24px}.cp-filters{width:100%}.cp-panel{padding:18px}}"
].join("\n");

function localDate() {
 const d=new Date();
 return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");
}
function shortName(id,uid) {return id===uid?"You":"Team Member · "+String(id).slice(0,8);}
function countWorkload(tasks,uid,limit,today){
 const open=tasks.filter(t=>t.status!=="completed");
 const overdue=open.filter(t=>t.due_date&&t.due_date<today).length;
 const urgent=open.filter(t=>["high","urgent"].includes(String(t.priority||"").toLowerCase())).length;
 const blocked=open.filter(t=>t.status==="blocked").length;
 const load=open.length;
 const pct=limit>0?Math.round(load/limit*100):0;
 return {uid,open:load,overdue,urgent,blocked,pct,remaining:Math.max(0,limit-load),level:pct>100?"Over capacity":pct>=80?"Near capacity":"Available"};
}
export default function RecruitmentCapacityPage(){
 const [uid,setUid]=useState("");
 const [memberships,setMemberships]=useState([]);
 const [companyId,setCompanyId]=useState("");
 const [members,setMembers]=useState([]);
 const [tasks,setTasks]=useState([]);
 const [taskHistory,setTaskHistory]=useState([]);
 const [historyError,setHistoryError]=useState("");
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [limit,setLimit]=useState(8);
 const [progressPeriod,setProgressPeriod]=useState("all");
 const [reload,setReload]=useState(0);
 const [assignmentChoices,setAssignmentChoices]=useState({});
 const [assigningId,setAssigningId]=useState(null);
 const [notice,setNotice]=useState("");
 useEffect(()=>{
  let active=true;
  (async()=>{
   const {data:auth,error:authError}=await supabase.auth.getUser();
   if(!active)return;
   if(authError||!auth?.user){setError("Please sign in to view team capacity.");setLoading(false);return;}
   setUid(auth.user.id);
   const {data,error:memberError}=await supabase.from("company_members").select("company_id,role").eq("user_id",auth.user.id);
   if(!active)return;
   if(memberError){setError(memberError.message);setLoading(false);return;}
   setMemberships(data||[]);
   const first=(data||[]).find(m=>m.company_id)?.company_id;
   if(first)setCompanyId(first);
   else {setError("Join a company to view recruitment capacity.");setLoading(false);}
  })();
  return()=>{active=false;};
 },[]);
 useEffect(()=>{
  if(!companyId)return;
  let active=true;
  (async()=>{
   setLoading(true);setError("");setHistoryError("");
   const [memberResult,taskResult,historyResult]=await Promise.all([
    supabase.from("company_members").select("user_id,role,company_id").eq("company_id",companyId),
    supabase.from("recruitment_tasks").select("id,title,status,priority,due_date,assigned_to,company_id,job_id,created_at").eq("company_id",companyId).order("created_at",{ascending:false}).limit(5000),
    supabase.from("recruitment_task_status_history").select("task_id,changed_by,old_status,new_status,changed_at").eq("company_id",companyId).order("changed_at",{ascending:false}).limit(5000)
   ]);
   if(!active)return;
   if(memberResult.error||taskResult.error)setError("Could not load capacity data: "+(memberResult.error?.message||taskResult.error?.message));
   setMembers(memberResult.data||[]);
   setTasks(taskResult.data||[]);
   setTaskHistory(historyResult.error?[]:historyResult.data||[]);
   if(historyResult.error)setHistoryError("Completion history unavailable: "+historyResult.error.message);
   setLoading(false);
  })();
  return()=>{active=false;};
 },[companyId,reload]);
 const today=localDate();
 const people=useMemo(()=>{
  const ids=[...new Set([...members.map(m=>m.user_id).filter(Boolean),...tasks.map(t=>t.assigned_to).filter(Boolean)])];
  return ids.map(id=>({...countWorkload(tasks.filter(t=>t.assigned_to===id),id,limit,today),role:members.find(m=>m.user_id===id)?.role||"Team Member"})).sort((a,b)=>b.pct-a.pct);
 },[members,tasks,limit,today]);
 const openTasks=tasks.filter(t=>t.status!=="completed");
 const completedTasks=tasks.filter(t=>t.status==="completed");
 const overdueTasks=openTasks.filter(t=>t.due_date&&t.due_date<today);
 const dueSoonTasks=openTasks.filter(t=>t.due_date&&t.due_date>=today&&t.due_date<=(()=>{const d=new Date();d.setDate(d.getDate()+3);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");})());
 const completionRate=tasks.length?Math.round(completedTasks.length/tasks.length*100):0;
 const deadlineCompliance=openTasks.filter(t=>t.due_date).length?Math.round(100*(1-overdueTasks.length/openTasks.filter(t=>t.due_date).length)):null;
 const unassigned=openTasks.filter(t=>!t.assigned_to);
 const overloaded=people.filter(p=>p.pct>100);
 const available=people.filter(p=>p.remaining>0);
 const totalSlots=people.length*limit;
 const occupied=people.reduce((sum,p)=>sum+p.open,0);
 const utilized=totalSlots?Math.round(occupied/totalSlots*100):0;
 const unassignedUrgent=unassigned.filter(t=>["high","urgent"].includes(String(t.priority||"").toLowerCase()));
 const suggestions=unassigned.slice().sort((a,b)=>{
  const weight=t=>({urgent:4,high:3,medium:2,low:1}[String(t.priority||"").toLowerCase()]||0);
  return weight(b)-weight(a)||String(a.due_date||"9999").localeCompare(String(b.due_date||"9999"));
 }).slice(0,6);
 const eligibleMembers=people.filter(p=>p.remaining>0&&members.some(m=>m.user_id===p.uid));
 const suggestedMember=eligibleMembers.slice().sort((a,b)=>a.pct-b.pct||a.open-b.open)[0];
 const canManageCompany=memberships.some(m=>m.company_id===companyId&&["admin","hr_manager"].includes(String(m.role||"").toLowerCase()));
 const progressSince=progressPeriod==="all"?null:Date.now()-Number(progressPeriod)*86400000;
 const progressTasks=tasks.filter(t=>t.assigned_to&&(!progressSince||(t.created_at&&new Date(t.created_at).getTime()>=progressSince)));
 const teamProgress=people.map(person=>{
  const mine=progressTasks.filter(t=>t.assigned_to===person.uid);
  const done=mine.filter(t=>t.status==="completed").length;
  const inProgress=mine.filter(t=>t.status==="in_progress").length;
  const blocked=mine.filter(t=>t.status==="blocked").length;
  const overdue=mine.filter(t=>t.status!=="completed"&&t.due_date&&t.due_date<today).length;
  return {...person,totalAssigned:mine.length,done,inProgress,blocked,overdueOpen:overdue,completionShare:mine.length?Math.round(done/mine.length*100):null};
 }).sort((a,b)=>b.totalAssigned-a.totalAssigned||b.overdueOpen-a.overdueOpen);
 const progressAssigned=teamProgress.reduce((sum,p)=>sum+p.totalAssigned,0);
 const progressDone=teamProgress.reduce((sum,p)=>sum+p.done,0);
 const historyByTask=new Map();
 for(const h of taskHistory){
  if(!historyByTask.has(h.task_id))historyByTask.set(h.task_id,[]);
  historyByTask.get(h.task_id).push(h);
 }
 const completionSamples=[];
 for(const t of tasks){
  const events=(historyByTask.get(t.id)||[]).slice().sort((a,b)=>new Date(a.changed_at)-new Date(b.changed_at));
  let startedAt=null;
  for(const h of events){
   if(h.new_status==="in_progress")startedAt=h.changed_at;
   else if(h.new_status==="todo"||h.new_status==="blocked")startedAt=null;
   else if(h.new_status==="completed"){
    if(startedAt){
     const hours=(new Date(h.changed_at)-new Date(startedAt))/3600000;
     if(Number.isFinite(hours)&&hours>=0)completionSamples.push({task:t,hours,completedAt:h.changed_at,actor:h.changed_by});
    }
    startedAt=null;
   }
  }
 }
 const filteredSamples=completionSamples.filter(s=>progressPeriod==="all"||new Date(s.completedAt).getTime()>=progressSince);
 const averageCompletionHours=filteredSamples.length?filteredSamples.reduce((sum,s)=>sum+s.hours,0)/filteredSamples.length:null;
 const measuredByMember=people.map(p=>{
  const samples=filteredSamples.filter(s=>s.actor===p.uid);
  const avg=samples.length?samples.reduce((sum,s)=>sum+s.hours,0)/samples.length:null;
  return {uid:p.uid,count:samples.length,avg};
 });
 const overloadedIds=new Set(overloaded.map(p=>p.uid));
 const rebalanceTasks=tasks.filter(t=>t.status!=="completed"&&overloadedIds.has(t.assigned_to))
  .sort((a,b)=>String(a.due_date||"9999").localeCompare(String(b.due_date||"9999"))).slice(0,6);
 const targetMembers=task=>eligibleMembers.filter(p=>p.uid!==task.assigned_to)
  .sort((a,b)=>a.pct-b.pct||a.open-b.open);
 const proposedAssignee=task=>assignmentChoices[task.id]||targetMembers(task)[0]?.uid||"";
 async function assignTask(task){
  if(!canManageCompany||!companyId||!uid||loading||assigningId)return;
  const assignee=proposedAssignee(task);
  if(!assignee||assignee===task.assigned_to||!members.some(m=>m.user_id===assignee&&m.company_id===companyId)){
   setError("Select a different current member of this company with available capacity.");return;
  }
  const action=task.assigned_to?"Reassign":"Assign";
  if(!window.confirm(`${action} "${task.title}" to ${shortName(assignee,uid)}?`))return;
  setAssigningId(task.id);setError("");setNotice("");
  try{
   let update=supabase.from("recruitment_tasks")
    .update({assigned_to:assignee,updated_at:new Date().toISOString()})
    .eq("id",task.id).eq("company_id",companyId).neq("status","completed");
   update=task.assigned_to?update.eq("assigned_to",task.assigned_to):update.is("assigned_to",null);
   const {data,error:assignError}=await update.select("id");
   if(assignError){setError(assignError.message);return;}
   if(!data?.length){setError("Task could not be assigned. It may have changed, or you may not have permission. Refresh and retry.");return;}
   setTasks(prev=>prev.map(t=>t.id===task.id?{...t,assigned_to:assignee}:t));
   setAssignmentChoices(prev=>{const next={...prev};delete next[task.id];return next;});
   setNotice(task.assigned_to?"Task reassigned successfully. Workload figures have been updated.":"Task assigned successfully. Workload and capacity figures have been updated.");
  }catch(e){setError(e?.message||"Could not assign the task.");}
  finally{setAssigningId(null);}
 }
 return <main className="cp-root"><style>{css}</style><div className="cp-shell">
  <aside className="cp-side"><div className="cp-brand">◈ Inspire Match<small>TALENT INTELLIGENCE</small></div><ATSNavigation className="cp-nav"/></aside>
  <div className="cp-main"><div className="cp-inner">
   <Link href="/app/recruitment-operations" className="cp-back">← Recruitment Operations</Link>
   <header className="cp-hero"><div><small>RECRUITMENT OPERATIONS / RESOURCE INTELLIGENCE</small><h1>Recruitment Capacity &amp; Resource Planning</h1><p>See workload pressure across recruiters, identify unassigned tasks and plan a fairer distribution of hiring operations.</p></div><div className="cp-hero-box"><strong>{loading?"—":people.length}</strong><span>Team members</span></div></header>
   <div className="cp-toolbar"><div><h2>Team capacity overview</h2><p>Live workload based on assigned, non-completed recruitment tasks.</p></div>
    <div className="cp-filters">
     <div className="cp-field"><label htmlFor="cp-company">Company</label><select id="cp-company" value={companyId} onChange={e=>{setLoading(true);setCompanyId(e.target.value);setAssignmentChoices({});setNotice("");}}>{memberships.filter((m,i,list)=>list.findIndex(x=>x.company_id===m.company_id)===i).map(m=><option key={m.company_id} value={m.company_id}>Company {String(m.company_id).slice(0,8)}</option>)}</select></div>
     <div className="cp-field"><label htmlFor="cp-limit">Planning target / member</label><input id="cp-limit" type="number" min="1" max="100" value={limit} onChange={e=>setLimit(Math.min(100,Math.max(1,Number(e.target.value)||1)))}/></div>
     <button className="cp-btn" disabled={loading||!companyId} onClick={()=>setReload(n=>n+1)}>↻ Refresh</button>
    </div>
   </div>
   {error&&<div className="cp-error" role="alert">{error}</div>}
   {notice&&<div className="cp-success" role="status">{notice}</div>}
   <div className="cp-metrics">{[
    ["Open Assigned Tasks",occupied,"Active work currently owned by team members"],
    ["Team Utilization",utilized+"%","Against the adjustable planning target"],
    ["Over Capacity",overloaded.length,"Members above the planning target"],
    ["Unassigned Tasks",unassigned.length,unassignedUrgent.length+" high / urgent without owner"]
   ].map(([title,value,desc])=><div className="cp-metric" key={title}><span>{title}</span><strong>{loading?"—":value}</strong><small>{desc}</small></div>)}</div>
   <section className="cp-panel" style={{marginBottom:17}}>
    <div className="cp-row"><h3>Task Completion &amp; Deadline Health</h3><Link className="cp-link" href="/app/recruitment-operations/tasks">View tasks →</Link></div>
    <p className="cp-desc">Current task status and deadline snapshot for the selected company. These are operational counts, not historical completion-time or SLA-resolution metrics.</p>
    <div className="cp-metrics" style={{marginBottom:12}}>{[
     ["Completed",completedTasks.length,completionRate+"% of visible tasks"],
     ["Overdue Open",overdueTasks.length,"Open tasks past their due date"],
     ["Due Within 3 Days",dueSoonTasks.length,"Includes tasks due today"],
     ["Open Deadline Compliance",deadlineCompliance===null?"N/A":deadlineCompliance+"%","Open dated tasks not yet overdue"]
    ].map(([title,value,desc])=><div className="cp-metric" key={title}><span>{title}</span><strong>{loading?"—":value}</strong><small>{desc}</small></div>)}</div>
    <p className="cp-note">Completion rate is the share of currently visible tasks marked completed. Without a reliable completion timestamp, this page cannot measure on-time completion or historical SLA compliance.</p>
   </section>
   {canManageCompany&&<section className="cp-panel" style={{marginBottom:17}}>
    <div className="cp-row" style={{flexWrap:"wrap"}}><h3>Measured Task Completion Time</h3><span className="cp-tag">Recorded transitions only</span></div>
    <p className="cp-desc">Elapsed time from a recorded move into In Progress to the next Completed transition. Calendar time, not active working hours.</p>
    {historyError&&<p className="cp-error" role="alert">{historyError}</p>}
    <div className="cp-metrics" style={{marginBottom:12}}>{[
     ["Measured Completions",filteredSamples.length,"Recorded In Progress to Completed cycles"],
     ["Average Elapsed Time",averageCompletionHours===null?"N/A":averageCompletionHours<24?averageCompletionHours.toFixed(1)+" hrs":(averageCompletionHours/24).toFixed(1)+" days","Calendar time per measured cycle"],
     ["Unmeasured Completed Tasks",completedTasks.filter(t=>!completionSamples.some(s=>s.task.id===t.id)).length,"Current completed tasks without a measurable cycle"],
     ["History Events",taskHistory.length,"Latest 5,000 visible transitions"]
    ].map(([name,value,detail])=><div className="cp-metric" key={name}><span>{name}</span><strong>{loading?"—":value}</strong><small>{detail}</small></div>)}</div>
    <div className="cp-table-wrap"><table className="cp-table"><thead><tr><th>Member who completed</th><th>Measured cycles</th><th>Average elapsed</th></tr></thead><tbody>{measuredByMember.map(p=><tr key={p.uid}><td>{shortName(p.uid,uid)}</td><td>{p.count}</td><td>{p.avg===null?"N/A":p.avg<24?p.avg.toFixed(1)+" hrs":(p.avg/24).toFixed(1)+" days"}</td></tr>)}</tbody></table></div>
    <p className="cp-note">Only transitions recorded after the history migration count. The period filter below applies by completion date. Reopened tasks may have multiple cycles. The person changing the status is credited, not necessarily the assignee. Incomplete history and records beyond the 5,000-event limit are excluded from elapsed-time averages. This is not a productivity score or SLA measure.</p>
   </section>}
   {canManageCompany&&<section className="cp-panel" style={{marginBottom:17}}>
    <div className="cp-row" style={{flexWrap:"wrap"}}>
     <h3>Team Task Progress Snapshot</h3>
     <div className="cp-field"><label htmlFor="cp-progress-period">Tasks created</label><select id="cp-progress-period" value={progressPeriod} onChange={e=>setProgressPeriod(e.target.value)}><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="all">All time</option></select></div>
    </div>
    <p className="cp-desc">Current status of tasks assigned to each team member. Use this to review workload follow-through and unresolved tasks, not to rank employee performance.</p>
    {loading?<div className="cp-empty">Loading team progress...</div>:<><div className="cp-row" style={{flexWrap:"wrap",marginBottom:14}}>
     <span>{progressAssigned} assigned tasks · {progressDone} currently completed · {progressAssigned?Math.round(progressDone/progressAssigned*100)+"%":"N/A"} completion share</span>
     <Link className="cp-link" href="/app/recruitment-operations/tasks">Review task records →</Link>
    </div>
    <div className="cp-table-wrap"><table className="cp-table"><thead><tr><th>Team Member</th><th>Assigned</th><th>Completed</th><th>In Progress</th><th>Blocked</th><th>Overdue Open</th><th>Completion Share</th></tr></thead><tbody>
     {teamProgress.map(p=><tr key={p.uid}><td>{shortName(p.uid,uid)}</td><td>{p.totalAssigned}</td><td>{p.done}</td><td>{p.inProgress}</td><td>{p.blocked}</td><td>{p.overdueOpen}</td><td>{p.completionShare===null?"—":p.completionShare+"%"}</td></tr>)}
    </tbody></table></div></>}
    <p className="cp-note">The period filters tasks by creation date, not completion date. Assignment reflects each task's current owner; reassigned tasks are not attributed to earlier owners. Historical throughput, on-time completion and individual productivity require reliable completion and ownership history. Results may be incomplete if the 5,000-task query limit is reached.</p>
   </section>}
   <div className="cp-grid">
    <section className="cp-panel"><h3>Recruiter Workload &amp; Capacity</h3><p className="cp-desc">Compare each teammate's assigned open tasks with the planning target. Adjust the target above to model a different workload threshold.</p>
     {loading?<div className="cp-empty">Loading team workload...</div>:!people.length?<div className="cp-empty">No team members or assigned tasks are available in this company.</div>:people.map(p=><div className="cp-member" key={p.uid}>
      <div className="cp-row"><strong>{shortName(p.uid,uid)}</strong><span className={"cp-tag "+(p.pct>100?"high":p.pct>=80?"full":"")}>{p.level}</span></div>
      <div className="cp-sub">{p.role.replaceAll("_"," ")} · {p.open} open / {limit} target · {p.pct}% utilization</div>
      <div className="cp-track"><div className="cp-fill" style={{width:Math.min(100,p.pct)+"%",background:p.pct>100?"#d57753":p.pct>=80?"#c69b44":"#248357"}}/></div>
      <div className="cp-row"><span>{p.urgent} high priority · {p.overdue} overdue · {p.blocked} blocked</span><span>{p.remaining} available slots</span></div>
     </div>)}
    </section>
    <section className="cp-panel"><h3>Workload Distribution Insights</h3><p className="cp-desc">Operational indicators to help managers balance responsibilities before deadlines are missed.</p>
     <div className="cp-list-item"><div className="cp-row"><strong>Team planning utilization</strong><span>{utilized}%</span></div><div className="cp-track"><div className="cp-fill" style={{width:Math.min(100,utilized)+"%"}}/></div><small>{occupied} assigned open tasks across {people.length} team members · {totalSlots} planned slots</small></div>
     <div className="cp-list-item"><strong>Capacity available</strong><small>{available.length} members below their target · {people.reduce((sum,p)=>sum+p.remaining,0)} available task slots</small></div>
     <div className="cp-list-item"><strong>Overloaded teammates</strong><small>{overloaded.length?overloaded.map(p=>shortName(p.uid,uid)).join(", "):"No members currently above the planning target"}</small></div>
     <div className="cp-list-item"><strong>Unassigned high-priority tasks</strong><small>{unassignedUrgent.length} urgent / high priority tasks require ownership</small></div>
     <p className="cp-note">Capacity is an adjustable planning estimate based on task counts, not hours worked or actual recruiter availability. It does not automatically reassign tasks.</p>
    </section>
   </div>
   <div className="cp-grid">
    <section className="cp-panel"><div className="cp-row"><h3>Unassigned Task Queue</h3><Link className="cp-link" href="/app/recruitment-operations/tasks">Manage all tasks →</Link></div><p className="cp-desc">Prioritized unassigned work. HR Managers and company admins can assign directly after reviewing each task and teammate capacity.</p>
     {loading?<div className="cp-empty">Loading unassigned tasks...</div>:!suggestions.length?<div className="cp-empty">No unassigned open tasks.</div>:suggestions.map(t=><div className="cp-list-item" key={t.id}><div className="cp-row"><strong>{t.title}</strong><span className="cp-tag">{t.priority||"medium"}</span></div><small>Due {t.due_date||"not set"} · {t.status==="blocked"?"Blocked":"Open"}</small>
      {canManageCompany&&<div className="cp-assign-controls"><select aria-label={"Assignee for "+t.title} value={proposedAssignee(t)} onChange={e=>setAssignmentChoices(prev=>({...prev,[t.id]:e.target.value}))}><option value="">Select team member</option>{[...new Map(members.map(m=>[m.user_id,m])).values()].filter(m=>m.user_id).map(m=>{const p=people.find(person=>person.uid===m.user_id);return <option key={m.user_id} value={m.user_id}>{shortName(m.user_id,uid)} · {p?.open??0} open tasks</option>;})}</select><button className="cp-btn" type="button" disabled={!!assigningId||loading||!proposedAssignee(t)} onClick={()=>assignTask(t)}>{assigningId===t.id?"Assigning...":"Assign task"}</button></div>}
     </div>)}
    </section>
    <section className="cp-panel"><h3>Suggested Assignment Direction</h3><p className="cp-desc">A simple workload-based suggestion for manager review, not an automatic assignment.</p>
     {suggestedMember?<><div className="cp-list-item"><strong>{shortName(suggestedMember.uid,uid)}</strong><small>Currently has {suggestedMember.open} open tasks and {suggestedMember.remaining} available planning slots.</small></div><div className="cp-list-item"><strong>Suggested next action</strong><small>Review this member's skills and active requisitions, then consider assigning one of the unowned tasks if appropriate.</small></div></>:<div className="cp-empty">No team member currently has available planning capacity.</div>}
     <Link className="cp-link" href="/app/recruitment-operations/tasks">Open Task Management →</Link>
    </section>
   </div>
   {canManageCompany&&<section className="cp-panel" style={{marginBottom:17}}>
    <div className="cp-row"><h3>Workload Rebalancing</h3><Link href="/app/recruitment-operations/tasks" className="cp-link">Manage all tasks →</Link></div>
    <p className="cp-desc">Move a task from a teammate over the planning target to someone with available capacity. Changes require manager permissions and are never made automatically.</p>
    {loading?<div className="cp-empty">Loading rebalancing options...</div>:!overloaded.length?<div className="cp-empty">No teammate currently exceeds the planning target.</div>:!rebalanceTasks.length?<div className="cp-empty">No open tasks available for redistribution.</div>:!eligibleMembers.length?<div className="cp-empty">All team members are at capacity. Adjust the planning target or review workloads before moving tasks.</div>:rebalanceTasks.map(t=>{
     const options=targetMembers(t);
     return <div className="cp-list-item" key={t.id}>
      <div className="cp-row"><strong>{t.title}</strong><span className="cp-tag">{t.priority||"medium"}</span></div>
      <small>Currently assigned to {shortName(t.assigned_to,uid)} · Due {t.due_date||"not set"}</small>
      <div className="cp-assign-controls">
       <select aria-label={"Reassign "+t.title} value={proposedAssignee(t)} onChange={e=>setAssignmentChoices(prev=>({...prev,[t.id]:e.target.value}))}>
        <option value="">Choose available member</option>
        {options.map(p=><option key={p.uid} value={p.uid}>{shortName(p.uid,uid)} · {p.open} open / {limit} target</option>)}
       </select>
       <button className="cp-btn" type="button" disabled={!!assigningId||loading||!options.length||!proposedAssignee(t)} onClick={()=>assignTask(t)}>{assigningId===t.id?"Reassigning...":"Reassign task"}</button>
      </div>
     </div>;
    })}
    <p className="cp-note">Suggestions are based on open task counts, not skills, working hours or recruiter availability. Confirm the receiving person's suitability before reassignment.</p>
   </section>}
   <section className="cp-panel"><h3>Team Capacity Breakdown</h3><p className="cp-desc">Task ownership and deadline pressure by team member.</p><div className="cp-table-wrap"><table className="cp-table"><thead><tr><th>Team Member</th><th>Open</th><th>High Priority</th><th>Overdue</th><th>Blocked</th><th>Available Slots</th><th>Utilization</th></tr></thead><tbody>{people.map(p=><tr key={p.uid}><td>{shortName(p.uid,uid)}</td><td>{p.open}</td><td>{p.urgent}</td><td>{p.overdue}</td><td>{p.blocked}</td><td>{p.remaining}</td><td>{p.pct}%</td></tr>)}</tbody></table></div>
    <p className="cp-note">Only records permitted by your Supabase access policies are included. Members without visible tasks are shown with zero assigned work. The planning target is local to this page and is not saved as a company policy.</p>
   </section>
  </div></div>
 </div></main>;
}
