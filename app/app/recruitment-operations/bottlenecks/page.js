"use client";
import Link from "next/link";
import {useEffect,useMemo,useState} from "react";
import {supabase} from "@/lib/supabase";
import ATSNavigation from "@/components/ATSNavigation";
const STAGES=["Applied","Screening","Interview","Shortlisted"];
const css=[
".bi-root{min-height:100vh;background:#f5f8f6;color:#1c4431;font:14px Arial,Helvetica,sans-serif}",
".bi-root *{box-sizing:border-box}",
".bi-layout{display:grid;grid-template-columns:252px minmax(0,1fr);min-height:100vh}",
".bi-side{background:#fff;border-right:1px solid #e2ebe5;padding:27px 14px}",
".bi-brand{font-size:18px;font-weight:850;padding:3px 13px 32px}",
".bi-brand small{display:block;color:#8aa092;letter-spacing:1.6px;font-size:9px;margin-top:4px}",
".bi-nav{display:flex;flex-direction:column;gap:4px}",
".bi-nav a{display:block;padding:11px 12px;border-radius:10px;color:#607868;text-decoration:none;font-size:12px;font-weight:700}",
".bi-nav a:hover,.bi-nav a.active{background:#e5f2e9;color:#176b49}",
".bi-main{padding:28px clamp(16px,3vw,50px) 60px;min-width:0}",
".bi-wrap{max-width:1240px;margin:auto}",
".bi-back{display:inline-block;color:#19734d;font-size:12px;font-weight:800;text-decoration:none;margin-bottom:23px}",
".bi-hero{background:linear-gradient(115deg,#123e2d,#258155);border-radius:20px;padding:35px 38px;color:white}",
".bi-hero small{letter-spacing:2px;font-size:10px;color:#c6ebd6;font-weight:800}",
".bi-hero h1{color:white;font-size:30px;margin:12px 0}",
".bi-hero p{max-width:760px;color:#e0f2e8;font-size:13px;line-height:1.7;margin:0}",
".bi-controls{display:flex;justify-content:space-between;gap:15px;align-items:end;flex-wrap:wrap;margin:27px 0 18px}",
".bi-controls h2{font-size:20px;margin:0 0 7px}",
".bi-controls p{font-size:12px;color:#7b9382;margin:0}",
".bi-select{border:1px solid #dce8df;border-radius:9px;background:white;color:#1e5237;padding:11px;font:inherit;font-size:12px;min-width:150px}",
".bi-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:13px;margin-bottom:17px}",
".bi-metric,.bi-panel{background:white;border:1px solid #e0ebe4;border-radius:15px;padding:22px;min-width:0}",
".bi-metric span{font-size:11px;color:#6f8b78;font-weight:800}",
".bi-metric strong{display:block;font-size:28px;color:#19734e;margin:8px 0}",
".bi-metric small{color:#8b9d90;font-size:11px}",
".bi-grid{display:grid;grid-template-columns:1.1fr 1fr;gap:16px;margin-bottom:17px}",
".bi-panel h3{font-size:17px;margin:0 0 9px}",
".bi-desc{color:#7c9183;font-size:12px;line-height:1.6;margin:0 0 18px}",
".bi-row{display:flex;align-items:center;justify-content:space-between;gap:14px;border-top:1px solid #edf2ee;padding:15px 0}",
".bi-row strong{font-size:12px;color:#214f37}",
".bi-row small{display:block;color:#82978a;font-size:11px;margin-top:5px}",
".bi-tag{display:inline-block;border-radius:99px;background:#e8f4ec;color:#24734e;font-size:10px;font-weight:800;padding:6px 10px;white-space:nowrap}",
".bi-tag.warn{background:#fff0df;color:#97692d}",
".bi-tag.danger{background:#ffece6;color:#a64f3b}",
".bi-track{height:9px;background:#e9f3ec;border-radius:99px;overflow:hidden;margin:10px 0}",
".bi-fill{height:100%;background:#238256;border-radius:99px}",
".bi-table-wrap{overflow-x:auto}",
".bi-table{width:100%;border-collapse:collapse;font-size:12px}",
".bi-table th{text-align:left;padding:13px;background:#f7faf8;color:#78917f;font-size:10px;white-space:nowrap}",
".bi-table td{padding:13px;border-top:1px solid #edf2ee;color:#3a6049;white-space:nowrap}",
".bi-table td:first-child{font-weight:800}",
".bi-link{color:#1c7850;font-size:12px;text-decoration:none;font-weight:800}",
".bi-empty{padding:24px 0;color:#829689;font-size:12px}",
".bi-error{padding:14px;border:1px solid #f2d7ca;background:#fff0e9;color:#a4503d;border-radius:11px;margin:15px 0;font-size:12px}",
".bi-note{font-size:11px;color:#83998b;line-height:1.7;margin-top:15px}",
"@media(max-width:1050px){.bi-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.bi-grid{grid-template-columns:1fr}}",
"@media(max-width:730px){.bi-layout{display:block}.bi-side{padding:14px;border-right:0;border-bottom:1px solid #e2ebe5}.bi-brand{padding:0 0 12px}.bi-nav{flex-direction:row;overflow-x:auto}.bi-nav a{white-space:nowrap}.bi-main{padding:20px 15px}.bi-hero{padding:27px 23px}.bi-hero h1{font-size:25px}.bi-metrics{gap:9px}.bi-metric{padding:16px}.bi-metric strong{font-size:24px}.bi-panel{padding:18px}}"
].join("\n");
function daysOld(s){const d=Date.parse(s||"");return Number.isFinite(d)?Math.max(0,Math.floor((Date.now()-d)/86400000)):null;}
function fmt(s){if(!s)return "—";const d=new Date(s);return Number.isNaN(d.getTime())?"—":d.toLocaleDateString("en-GB",{day:"numeric",month:"short"});}
export default function RecruitmentBottlenecks(){
 const [uid,setUid]=useState("");
 const [company,setCompany]=useState("");
 const [memberships,setMemberships]=useState([]);
 const [candidates,setCandidates]=useState([]);
 const [interviews,setInterviews]=useState([]);
 const [applications,setApplications]=useState([]);
 const [tasks,setTasks]=useState([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [threshold,setThreshold]=useState(7);
 const [refresh,setRefresh]=useState(0);
 useEffect(()=>{let alive=true;(async()=>{
  const {data,error:e}=await supabase.auth.getUser();
  if(!alive)return;
  if(e||!data?.user){setError("Please sign in.");setLoading(false);return;}
  setUid(data.user.id);
  const r=await supabase.from("company_members").select("company_id,role").eq("user_id",data.user.id);
  if(!alive)return;
  if(r.error){setError(r.error.message);setLoading(false);return;}
  setMemberships(r.data||[]);
  if(r.data?.[0]?.company_id)setCompany(r.data[0].company_id);
  else{setError("No company membership found.");setLoading(false);}
 })();return()=>{alive=false;};},[]);
 useEffect(()=>{if(!company)return;let alive=true;(async()=>{
  setLoading(true);setError("");
  const result=await Promise.all([
   supabase.from("candidates").select("id,full_name,status,created_at,job_id,company_id").eq("company_id",company).is("deleted_at",null).limit(5000),
   supabase.from("interviews").select("id,application_id,scheduled_at,status,company_id").eq("company_id",company).limit(5000),
   supabase.from("applications").select("id,candidate_id,job_id,stage,company_id").eq("company_id",company).limit(5000),
   supabase.from("recruitment_tasks").select("id,title,status,due_date,priority,assigned_to,company_id").eq("company_id",company).limit(5000)
  ]);
  if(!alive)return;
  const failure=result.find(r=>r.error);
  if(failure)setError("Some bottleneck data could not be loaded: "+failure.error.message);
  setCandidates(result[0].data||[]);
  setInterviews(result[1].data||[]);
  setApplications(result[2].data||[]);
  setTasks(result[3].data||[]);
  setLoading(false);
 })();return()=>{alive=false;};},[company,refresh]);
 const today=new Date().toLocaleDateString("en-CA");
 const active=candidates.filter(c=>STAGES.some(s=>s.toLowerCase()===String(c.status||"").toLowerCase()));
 const stalled=active.filter(c=>(daysOld(c.created_at)||0)>=threshold);
 const stages=STAGES.map(s=>{
  const items=active.filter(c=>String(c.status||"").toLowerCase()===s.toLowerCase());
  const aging=items.filter(c=>(daysOld(c.created_at)||0)>=threshold).length;
  const average=items.length?Math.round(items.reduce((a,c)=>a+(daysOld(c.created_at)||0),0)/items.length):0;
  return {name:s,total:items.length,aging,average};
 });
 const maxStage=Math.max(1,...stages.map(s=>s.total));
 const openTasks=tasks.filter(t=>t.status!=="completed");
 const overdue=openTasks.filter(t=>t.due_date&&t.due_date<today);
 const blocked=openTasks.filter(t=>t.status==="blocked");
 const now=Date.now();
 const lateInterviews=interviews.filter(i=>String(i.status).toLowerCase()==="scheduled"&&Number.isFinite(Date.parse(i.scheduled_at||""))&&Date.parse(i.scheduled_at)<now);
 const pendingDecisions=interviews.filter(i=>String(i.status).toLowerCase()==="completed");
 const interviewCandidates=new Set(applications.map(a=>a.id));
 const unlinked=lateInterviews.filter(i=>!interviewCandidates.has(i.application_id));
 const risks=[
  {name:"Candidate follow-up",count:stalled.length,detail:"Active candidates created at least "+threshold+" days ago"},
  {name:"Past-due interviews",count:lateInterviews.length,detail:"Scheduled interviews with a start time in the past"},
  {name:"Blocked tasks",count:blocked.length,detail:"Tasks explicitly marked blocked"},
  {name:"Overdue tasks",count:overdue.length,detail:"Open recruitment tasks past their due date"}
 ];
 const prioritized=[
  ...overdue.map(t=>({kind:"Overdue task",name:t.title||"Recruitment task",age:t.due_date,href:"/app/recruitment-operations/tasks",severity:"danger"})),
  ...lateInterviews.map(i=>({kind:"Past-due interview",name:"Interview #"+String(i.id).slice(0,8),age:i.scheduled_at,href:"/app/interviews",severity:"warn"})),
  ...stalled.map(c=>({kind:"Candidate follow-up",name:c.full_name||"Candidate",age:c.created_at,href:"/app/candidates/"+c.id,severity:"warn"}))
 ].slice(0,35);
 return <main className="bi-root"><style>{css}</style><div className="bi-layout">
  <aside className="bi-side"><div className="bi-brand">◈ Inspire Match<small>TALENT INTELLIGENCE</small></div><ATSNavigation className="bi-nav"/></aside>
  <div className="bi-main"><div className="bi-wrap">
   <Link href="/app/recruitment-operations" className="bi-back">← Recruitment Operations</Link>
   <header className="bi-hero"><small>RECRUITMENT OPERATIONS / WORKFLOW INTELLIGENCE</small><h1>Recruitment Bottleneck Intelligence</h1><p>Spot aging candidate records, past-due interviews and blocked recruitment tasks in one operational view.</p></header>
   <div className="bi-controls"><div><h2>Bottleneck overview</h2><p>Rule-based operational indicators from accessible company records.</p></div>
    <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"end"}}>
     <label style={{fontSize:11,fontWeight:800,color:"#6e8977"}}>Company<select className="bi-select" style={{display:"block",marginTop:6}} value={company} onChange={e=>setCompany(e.target.value)}>{memberships.filter((m,i,a)=>a.findIndex(x=>x.company_id===m.company_id)===i).map(m=><option key={m.company_id} value={m.company_id}>Company {String(m.company_id).slice(0,8)}</option>)}</select></label>
     <label style={{fontSize:11,fontWeight:800,color:"#6e8977"}}>Follow-up threshold<select className="bi-select" style={{display:"block",marginTop:6}} value={threshold} onChange={e=>setThreshold(Number(e.target.value))}>{[3,5,7,10,14,21].map(d=><option key={d} value={d}>{d} days</option>)}</select></label>
     <button className="bi-select" style={{cursor:"pointer",fontWeight:800}} disabled={loading} onClick={()=>setRefresh(n=>n+1)}>↻ Refresh</button>
    </div>
   </div>
   {error&&<div className="bi-error" role="alert">{error}</div>}
   <div className="bi-metrics">{[
    ["Active Candidates",active.length,"In active pipeline stages"],
    ["Follow-up Candidates",stalled.length,"Older than selected threshold"],
    ["Past-due Interviews",lateInterviews.length,"Still marked scheduled"],
    ["Overdue Tasks",overdue.length,"Open work past deadline"]
   ].map(([label,value,desc])=><div className="bi-metric" key={label}><span>{label}</span><strong>{loading?"—":value}</strong><small>{desc}</small></div>)}</div>
   <div className="bi-grid">
    <section className="bi-panel"><h3>Pipeline Follow-up Signals</h3><p className="bi-desc">Candidate counts and age since record creation. Stage-entry timestamps are not available in this view, so these are follow-up indicators rather than exact stage aging.</p>
     {stages.map(s=><div key={s.name} className="bi-row"><div style={{flex:1}}><div style={{display:"flex",justifyContent:"space-between",gap:12}}><strong>{s.name}</strong><span className="bi-tag">{s.total} candidates</span></div><div className="bi-track"><div className="bi-fill" style={{width:100*s.total/maxStage+"%"}}/></div><small>{s.aging} follow-up signals · avg. record age {s.average} days</small></div></div>)}
    </section>
    <section className="bi-panel"><h3>Operational Risk Breakdown</h3><p className="bi-desc">Issues that may slow down hiring and need manager attention.</p>
     {risks.map(r=><div key={r.name} className="bi-row"><div><strong>{r.name}</strong><small>{r.detail}</small></div><span className={"bi-tag "+(r.count?"warn":"")}>{r.count}</span></div>)}
     <Link className="bi-link" href="/app/recruitment-operations/tasks">Open Recruitment Tasks →</Link>
    </section>
   </div>
   <div className="bi-grid">
    <section className="bi-panel"><h3>Interview Follow-up</h3><p className="bi-desc">Scheduled interviews in the past should be reviewed for completion, rescheduling or cancellation.</p>
     <div className="bi-row"><strong>Scheduled in the past</strong><span className="bi-tag warn">{lateInterviews.length}</span></div>
     <div className="bi-row"><strong>Completed interviews</strong><span className="bi-tag">{pendingDecisions.length}</span></div>
     <div className="bi-row"><strong>Blocked recruitment tasks</strong><span className="bi-tag warn">{blocked.length}</span></div>
     <Link className="bi-link" href="/app/interviews">Review Interviews →</Link>
    </section>
    <section className="bi-panel"><h3>Recommended Manager Actions</h3><p className="bi-desc">Prioritize follow-up based on visible operational risks.</p>
     {[["Review overdue tasks",overdue.length,"/app/recruitment-operations/tasks"],["Resolve past-due interviews",lateInterviews.length,"/app/interviews"],["Review older active candidates",stalled.length,"/app/pipeline"],["Unblock pending tasks",blocked.length,"/app/recruitment-operations/tasks"]].map(([name,n,href])=><div className="bi-row" key={name}><strong>{name}</strong><Link className="bi-link" href={href}>{n} items →</Link></div>)}
    </section>
   </div>
   <section className="bi-panel"><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}><h3>Priority Follow-up Queue</h3><Link href="/app/pipeline" className="bi-link">Open Pipeline →</Link></div><p className="bi-desc">Recent high-priority operational signals from candidates, interviews and tasks.</p>
    {prioritized.length===0?<div className="bi-empty">No follow-up signals match the selected threshold.</div>:
     <div className="bi-table-wrap"><table className="bi-table"><thead><tr><th>Type</th><th>Record</th><th>Relevant Date</th><th>Action</th></tr></thead><tbody>{prioritized.map((r,i)=><tr key={i}><td><span className={"bi-tag "+r.severity}>{r.kind}</span></td><td>{r.name}</td><td>{fmt(r.age)}</td><td><Link className="bi-link" href={r.href}>Review →</Link></td></tr>)}</tbody></table></div>}
    <p className="bi-note">This module identifies potential bottlenecks using available record age, scheduled interview times and task deadlines. It does not measure exact time spent in each pipeline stage, hiring-manager response time or decision latency. Those require verified stage-transition and decision timestamps. Results are restricted by Supabase access policies; full accuracy will be checked during pre-launch QA.</p>
   </section>
  </div></div>
 </div></main>;
}
