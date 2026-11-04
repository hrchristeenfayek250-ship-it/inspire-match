"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import ATSNavigation from "@/components/ATSNavigation";

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
 return <main style={{minHeight:"100vh",background:"#f5f8f6",color:"#173e30",fontFamily:"Arial,sans-serif"}}>
  <ATSNavigation/>
  <div style={{maxWidth:1200,margin:"0 auto",padding:"30px 24px 70px"}}>
   <Link href="/app/recruitment-operations" style={{color:"#19744c",fontSize:12}}>← Recruitment Operations</Link>
   <header style={{background:"linear-gradient(115deg,#113e2d,#257b53)",color:"white",padding:32,borderRadius:20,margin:"20px 0 25px"}}>
    <div style={{fontSize:11,letterSpacing:2}}>RECRUITMENT OPERATIONS / TEAM INSIGHTS</div>
    <h1 style={{fontSize:30,margin:"12px 0"}}>Recruiter Performance &amp; Follow-Through</h1>
    <p style={{fontSize:13,maxWidth:760,lineHeight:1.7}}>A balanced operational view of workload, recorded completions, and deadline reliability. Not an employee ranking or automated performance appraisal.</p>
   </header>
   <div style={{display:"flex",gap:16,flexWrap:"wrap",marginBottom:22}}>
    <label>Company <select value={companyId} onChange={e=>setCompanyId(e.target.value)} style={{display:"block",padding:10,border:"1px solid #dce7df",borderRadius:8}}>{companies.map(x=><option key={x.company_id} value={x.company_id}>{x.company_id.slice(0,8)}</option>)}</select></label>
    <label>Completion reporting window <select value={period} onChange={e=>setPeriod(e.target.value)} style={{display:"block",padding:10,border:"1px solid #dce7df",borderRadius:8}}><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="all">All recorded history</option></select></label>
   </div>
   {error&&<p role="alert" style={{color:"#a34334"}}>{error}</p>}
   {warning&&<p role="status" style={{color:"#98631f"}}>{warning}</p>}
   {loading?<p>Loading team performance...</p>:!error&&<>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(175px,1fr))",gap:14,marginBottom:22}}>
     {[
      ["Open assigned tasks",total.open,"Current workload"],
      ["Overdue open tasks",total.overdue,"Deadline pressure"],
      ["Blocked open tasks",total.blocked,"Needs intervention"],
      ["Recorded completions",total.completed,"Status changes in period"],
      ["On-time completion",pct(total.onTime,total.measurable),total.measurable+" measured completion events"]
     ].map(([title,value,sub])=><div key={title} style={{background:"white",border:"1px solid #e1ebe4",padding:20,borderRadius:14}}><div style={{fontSize:12,color:"#708875"}}>{title}</div><strong style={{display:"block",fontSize:29,color:"#19744c",margin:"9px 0"}}>{value}</strong><small style={{color:"#8b9d91"}}>{sub}</small></div>)}
    </div>
    <section style={{background:"white",border:"1px solid #e1ebe4",borderRadius:16,padding:22}}>
     <h2 style={{fontSize:19}}>Team Follow-Through Overview</h2>
     <p style={{fontSize:12,color:"#708875",lineHeight:1.7}}>Open workload is a current snapshot. Recorded completions and on-time rates use status-change events within the selected period; the person who changed the status is credited, not necessarily the task assignee.</p>
     <div style={{overflowX:"auto"}}><table style={{borderCollapse:"collapse",width:"100%",minWidth:820,fontSize:12}}>
      <thead><tr>{["Team member","Role","Open","Overdue","Blocked","Recorded completions","Measured SLA","On-time rate"].map(h=><th key={h} style={{textAlign:"left",background:"#f3f8f4",padding:13}}>{h}</th>)}</tr></thead>
      <tbody>{rows.map(r=><tr key={r.id}>{[display(r.id,userId),r.role,r.open,r.overdue,r.blocked,r.completedEvents,r.measurable,pct(r.onTime,r.measurable)].map((v,i)=><td key={i} style={{borderTop:"1px solid #edf2ee",padding:13}}>{v}</td>)}</tr>)}</tbody>
     </table></div>
     <p style={{fontSize:11,color:"#809387",lineHeight:1.8,marginTop:18}}>Completion history begins when tracking was enabled; older completed tasks are not reconstructed. Deadline rates include only events with captured due dates, and on-time includes the due date itself. Reopened tasks can produce multiple completion events. This report does not measure quality of hire, active working hours, interview quality, or candidate experience; use those separately before evaluating individual performance. Only the latest 5,000 company tasks/events are queried.</p>
    </section>
   </>}
  </div>
 </main>;
}
