"use client";
import Link from "next/link";
import {useEffect,useMemo,useState} from "react";
import {supabase} from "@/lib/supabase";
import ATSNavigation from "@/components/ATSNavigation";

const style=[
".er-root{background:#f5f8f6;color:#193b2b;min-height:100vh;font:14px Arial,sans-serif}",
".er-root *{box-sizing:border-box}",
".er-shell{display:grid;grid-template-columns:252px minmax(0,1fr);min-height:100vh}",
".er-side{background:#fff;border-right:1px solid #e5ece7;padding:27px 14px}",
".er-brand{font-size:18px;font-weight:850;padding:3px 13px 30px;color:#173e30}",
".er-brand small{display:block;font-size:9px;letter-spacing:1.6px;color:#83978a;margin-top:4px}",
".er-nav{display:flex;flex-direction:column;gap:4px}",
".er-nav a{display:flex;gap:12px;align-items:center;padding:11px 12px;border-radius:10px;text-decoration:none;color:#5d7267;font-size:12px;font-weight:700}",
".er-nav a:hover,.er-nav a.active{background:#e5f2e9;color:#145f42}",
".er-main{min-width:0;padding:28px clamp(18px,3vw,52px) 64px}",
".er-inner{max-width:1240px;margin:auto}",
".er-back,.er-link{color:#19744c;font-size:12px;font-weight:800;text-decoration:none}",
".er-back{display:inline-block;margin-bottom:20px}",
".er-hero{background:linear-gradient(115deg,#113e2d,#257b53);border-radius:20px;padding:35px 37px;color:#fff}",
".er-hero small{letter-spacing:2px;color:#bce7ce;font-size:10px;font-weight:800}",
".er-hero h1{color:#fff;font-size:30px;margin:11px 0}",
".er-hero p{color:#e0f0e7;line-height:1.7;font-size:13px;max-width:760px}",
".er-toolbar{display:flex;justify-content:space-between;align-items:end;gap:14px;flex-wrap:wrap;margin:25px 0 18px}",
".er-toolbar h2{font-size:19px;margin:0 0 6px}",
".er-toolbar p{color:#809487;font-size:12px;margin:0}",
".er-filters{display:flex;flex-wrap:wrap;gap:12px;align-items:end}",
".er-filters label{font-size:11px;color:#607b69;font-weight:800;display:grid;gap:7px}",
".er-filters select,.er-filters button{border:1px solid #dce7df;background:white;color:#20533a;border-radius:9px;padding:10px;font:13px Arial,sans-serif}",
".er-filters button{cursor:pointer;font-weight:800}",
".er-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:13px;margin-bottom:17px}",
".er-metric,.er-panel{background:white;border:1px solid #e1ebe4;border-radius:15px;padding:21px;min-width:0}",
".er-metric span{font-size:11px;color:#6d8776;font-weight:800;line-height:1.5}",
".er-metric strong{display:block;color:#176b49;font-size:29px;margin:10px 0}",
".er-metric small{font-size:11px;color:#87998b}",
".er-grid{display:grid;grid-template-columns:1fr 1fr;gap:17px;margin-bottom:17px}",
".er-panel{margin-bottom:17px}",
".er-panel h3{font-size:17px;margin:0 0 12px}",
".er-note{font-size:12px;color:#788f80;line-height:1.8}",
".er-row{display:flex;justify-content:space-between;gap:15px;border-top:1px solid #edf2ee;padding:13px 0;font-size:12px}",
".er-row strong{color:#215a3e}",
".er-error{padding:14px;background:#fff1ec;border:1px solid #f0d4ca;border-radius:10px;color:#9a4234;margin:15px 0}",
"@media(max-width:1050px){.er-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.er-grid{grid-template-columns:1fr}}",
"@media(max-width:740px){.er-shell{display:block}.er-side{padding:14px;border-right:0;border-bottom:1px solid #e5ece7}.er-brand{padding:0 0 13px}.er-nav{flex-direction:row;overflow:auto}.er-nav a{white-space:nowrap}.er-main{padding:20px 15px 45px}.er-hero{padding:25px 22px}.er-hero h1{font-size:25px}.er-metric{padding:15px}}",
"@media print{.er-side,.er-back,.er-filters,.er-links{display:none!important}.er-shell{display:block}.er-main{padding:0}.er-root{background:white}.er-hero{-webkit-print-color-adjust:exact;print-color-adjust:exact}}"
].join("\n");
const localDate=(d)=>{const x=new Date(d);return [x.getFullYear(),String(x.getMonth()+1).padStart(2,"0"),String(x.getDate()).padStart(2,"0")].join("-");};
const rate=(n,d)=>d?Math.round(n/d*100)+"%":"N/A";
export default function OperationsExecutiveReport(){
 const [companies,setCompanies]=useState([]),[company,setCompany]=useState(""),[tasks,setTasks]=useState([]),[history,setHistory]=useState([]),[members,setMembers]=useState([]),[windowDays,setWindowDays]=useState("90"),[loading,setLoading]=useState(true),[error,setError]=useState(""),[warning,setWarning]=useState("");
 useEffect(()=>{let live=true;(async()=>{
  const a=await supabase.auth.getUser();if(!live)return;
  if(a.error||!a.data?.user){setError("Sign in to view the executive report.");setLoading(false);return;}
  const m=await supabase.from("company_members").select("company_id,role").eq("user_id",a.data.user.id);if(!live)return;
  if(m.error){setError(m.error.message);setLoading(false);return;}
  const allowed=(m.data||[]).filter(x=>["admin","hr_manager"].includes(String(x.role).toLowerCase()));
  setCompanies(allowed);if(allowed.length)setCompany(allowed[0].company_id);else{setError("Company Admin or HR Manager access required.");setLoading(false);}
 })();return()=>{live=false};},[]);
 useEffect(()=>{if(!company)return;let live=true;setLoading(true);setError("");setWarning("");setTasks([]);setHistory([]);setMembers([]);
 (async()=>{const [t,h,m]=await Promise.all([
  supabase.from("recruitment_tasks").select("id,status,due_date,assigned_to,priority,created_at,blocker_reason").eq("company_id",company).order("created_at",{ascending:false}).limit(5000),
  supabase.from("recruitment_task_status_history").select("task_id,new_status,changed_at,due_date_at_change,blocker_reason_at_change").eq("company_id",company).order("changed_at",{ascending:false}).limit(5000),
  supabase.from("company_members").select("user_id").eq("company_id",company)
 ]);if(!live)return;
 if(t.error||h.error||m.error){setError("Report unavailable: "+(t.error||h.error||m.error).message);setLoading(false);return;}
 setTasks(t.data||[]);setHistory(h.data||[]);setMembers(m.data||[]);
 if((t.data||[]).length===5000||(h.data||[]).length===5000)setWarning("The 5,000-record limit was reached. Some metrics may be incomplete.");
 setLoading(false);
 })();return()=>{live=false};},[company]);
 const metrics=useMemo(()=>{
  const today=localDate(new Date()),ids=new Set(tasks.map(t=>t.id));
  const open=tasks.filter(t=>t.status!=="completed");
  const overdue=open.filter(t=>t.due_date&&t.due_date<today);
  const blocked=open.filter(t=>t.status==="blocked");
  const unassigned=open.filter(t=>!t.assigned_to);
  const cutoff=windowDays==="all"?0:Date.now()-Number(windowDays)*86400000;
  const completed=history.filter(h=>h.new_status==="completed"&&ids.has(h.task_id)&&new Date(h.changed_at).getTime()>=cutoff);
  const measurable=completed.filter(h=>h.due_date_at_change);
  const onTime=measurable.filter(h=>localDate(h.changed_at)<=h.due_date_at_change.slice(0,10));
  const blockerEvents=history.filter(h=>h.new_status==="blocked"&&h.blocker_reason_at_change&&ids.has(h.task_id)&&new Date(h.changed_at).getTime()>=cutoff);
  const reasons=new Map();for(const h of blockerEvents){const key=h.blocker_reason_at_change.trim();if(key)reasons.set(key,(reasons.get(key)||0)+1);}
  return {open,overdue,blocked,unassigned,completed,measurable,onTime,reasons:[...reasons].sort((a,b)=>b[1]-a[1]).slice(0,5),priorityOverdue:overdue.filter(t=>["high","urgent"].includes(String(t.priority).toLowerCase())).length};
 },[tasks,history,windowDays]);
 const exportCsv=()=>{
  if(loading||error||!company)return;
  const rows=[
   ["Section","Metric","Value","Reporting window"],
   ["Overview","Open tasks",metrics.open.length,"Current"],
   ["Overview","Overdue tasks",metrics.overdue.length,"Current"],
   ["Overview","Blocked tasks",metrics.blocked.length,"Current"],
   ["Overview","Unassigned open tasks",metrics.unassigned.length,"Current"],
   ["Overview","High-priority overdue",metrics.priorityOverdue,"Current"],
   ["Overview","Open blocked with recorded reason",metrics.blocked.filter(t=>t.blocker_reason?.trim()).length,"Current"],
   ["Overview","Team members",members.length,"Current"],
   ["Delivery","Recorded completion events",metrics.completed.length,windowDays==="all"?"All recorded":windowDays+" days"],
   ["Delivery","Measured deadline events",metrics.measurable.length,windowDays==="all"?"All recorded":windowDays+" days"],
   ["Delivery","On-time completions",metrics.onTime.length,windowDays==="all"?"All recorded":windowDays+" days"],
   ["Delivery","Late completions",metrics.measurable.length-metrics.onTime.length,windowDays==="all"?"All recorded":windowDays+" days"],
   ["Delivery","On-time rate",rate(metrics.onTime.length,metrics.measurable.length),windowDays==="all"?"All recorded":windowDays+" days"],
   ...metrics.reasons.map(([reason,count])=>["Reported blocker reason",reason,count,windowDays==="all"?"All recorded":windowDays+" days"]),
   ["Metadata","Company ID",company,""],
   ["Metadata","Export date",localDate(new Date()),""],
   ["Metadata","Coverage",warning||"Up to 5,000 latest tasks and events; no history backfill",""]
  ];
  // Prevent spreadsheet formula injection in user-entered text.
  const cell=v=>{let s=String(v??"");if(/^\s*[=+@-]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};
  const csv="\uFEFF"+rows.map(row=>row.map(cell).join(",")).join("\r\n");
  const blob=new Blob([csv],{type:"text/csv;charset=utf-8"});
  const url=URL.createObjectURL(blob);
  const link=document.createElement("a");
  link.href=url;link.download="inspire-operations-executive-"+localDate(new Date())+".csv";
  document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url);
 };
 return <main className="er-root"><style>{style}</style><div className="er-shell">
  <aside className="er-side"><div className="er-brand">◈ Inspire Match<small>TALENT INTELLIGENCE</small></div><ATSNavigation className="er-nav"/></aside>
  <div className="er-main"><div className="er-inner">
   <Link className="er-back" href="/app/recruitment-operations">← Recruitment Operations</Link>
   <header className="er-hero"><small>RECRUITMENT OPERATIONS / LEADERSHIP REPORT</small><h1>Operations Executive Report</h1><p>Decision-ready overview of current task health, recorded SLA completion and operational risks. Based on visible company data, not AI predictions.</p></header>
   <div className="er-toolbar"><div><h2>Leadership summary</h2><p>Open workload is a live snapshot. Completion figures use the selected history period.</p></div>
    {companies.length>0&&<div className="er-filters">
     <label>Company<select value={company} onChange={e=>setCompany(e.target.value)}>{companies.map(c=><option key={c.company_id} value={c.company_id}>Company {c.company_id.slice(0,8)}</option>)}</select></label>
     <label>Completion period<select value={windowDays} onChange={e=>setWindowDays(e.target.value)}><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="all">All recorded history</option></select></label>
     <button type="button" disabled={loading||!!error} onClick={exportCsv}>Export CSV</button>
     <button type="button" onClick={()=>window.print()}>Print / Save PDF</button>
    </div>}
   </div>
   {error&&<div className="er-error" role="alert">{error}</div>}
   {warning&&<div className="er-error" role="status">{warning}</div>}
   {loading?<section className="er-panel">Loading leadership report...</section>:!error&&<>
    <div className="er-metrics">{[
     ["Open Tasks",metrics.open.length,"Current outstanding work"],
     ["Overdue Tasks",metrics.overdue.length,"Open tasks past deadline"],
     ["Blocked Tasks",metrics.blocked.length,"Current blocked work"],
     ["On-Time Completion",rate(metrics.onTime.length,metrics.measurable.length),metrics.measurable.length+" measured completions"]
    ].map(([name,value,sub])=><div className="er-metric" key={name}><span>{name}</span><strong>{value}</strong><small>{sub}</small></div>)}</div>
    <div className="er-grid">
     <section className="er-panel"><h3>Operational Risk Signals</h3>
      {[["Unassigned open tasks",metrics.unassigned.length],["High-priority overdue",metrics.priorityOverdue],["Open blocked with recorded reason",metrics.blocked.filter(t=>t.blocker_reason?.trim()).length],["Team members",members.length]].map(([k,v])=><div className="er-row" key={k}><span>{k}</span><strong>{v}</strong></div>)}
      <p className="er-note">Signals highlight where management attention may be needed; they are not verified explanations of delay.</p>
     </section>
     <section className="er-panel"><h3>Recorded Delivery Evidence</h3>
      {[["Completion events",metrics.completed.length],["Measured deadline events",metrics.measurable.length],["Completed on time",metrics.onTime.length],["Completed late",metrics.measurable.length-metrics.onTime.length]].map(([k,v])=><div className="er-row" key={k}><span>{k}</span><strong>{v}</strong></div>)}
      <p className="er-note">Deadline compliance is calculated using the due-date snapshot recorded at each completion event.</p>
     </section>
    </div>
    <section className="er-panel"><h3>Reported Blocker Reasons</h3>
     {metrics.reasons.length?metrics.reasons.map(([reason,count])=><div className="er-row" key={reason}><span style={{overflowWrap:"anywhere"}}>{reason}</span><strong>{count} event(s)</strong></div>):<p className="er-note">No recorded blocker reasons for this period.</p>}
     <p className="er-note">Self-reported reasons are grouped by exact wording, not independently validated causes.</p>
    </section>
    <section className="er-panel er-links"><h3>Recommended Review Areas</h3><p className="er-note">Investigate overdue ownership, blocked tasks and high-priority deadlines before assigning corrective actions. Review source records for context.</p>
     <div style={{display:"flex",gap:20,flexWrap:"wrap"}}><Link className="er-link" href="/app/recruitment-operations/capacity">Capacity &amp; SLA Details →</Link><Link className="er-link" href="/app/recruitment-operations/recruiter-performance">Team Follow-Through →</Link><Link className="er-link" href="/app/recruitment-operations/tasks">Task Management →</Link></div>
    </section>
    <p className="er-note">Reporting limits: latest 5,000 tasks and status events; completion history has no retroactive backfill. Historical completion events are not the same as distinct tasks. This report is operational and should not be treated as a validated employee performance appraisal or contractual SLA audit.</p>
   </>}
  </div></div>
 </div></main>;
}
