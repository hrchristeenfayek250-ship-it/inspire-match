"use client";
import Link from "next/link";
import {useEffect,useMemo,useState} from "react";
import {supabase} from "@/lib/supabase";
import ATSNavigation from "@/components/ATSNavigation";
const css=`
.ho-page{display:block!important;max-width:none!important;margin:0!important;padding:0!important;min-height:100vh;background:#f5f8f6;color:#214632;font:13px/1.6 Arial,sans-serif}
.ho-page *{box-sizing:border-box}.ho-layout{display:grid;grid-template-columns:252px minmax(0,1fr);min-height:100vh}
.ho-side{padding:27px 14px;background:#fff;border-right:1px solid #e4ede6}
.ho-brand{display:flex;align-items:center;gap:11px;padding:4px 13px 29px;font-weight:850;font-size:17px}
.ho-mark{display:grid;place-items:center;width:36px;height:36px;border-radius:11px;background:#14583e;color:#fff;font-size:22px}
.ho-brand small{display:block;color:#879b8e;font-size:9px;letter-spacing:1.5px}
.ho-nav{display:flex;flex-direction:column;gap:4px}
.ho-nav a{display:flex;align-items:center;gap:12px;padding:10px 12px;min-height:40px;border-radius:10px;color:#5d7267;text-decoration:none;font-size:12px;font-weight:700}
.ho-nav a span{width:17px;text-align:center}.ho-nav a:hover,.ho-nav a.active{background:#e5f2e9;color:#145f42}
.ho-content{padding:0 clamp(18px,3.4vw,54px) 65px;min-width:0}.ho-wrap{max-width:1240px;margin:auto}
.ho-top{height:77px;display:flex;align-items:center;justify-content:space-between;gap:12px;border-bottom:1px solid #e5ece7;margin-bottom:30px}
.ho-back{color:#19714b;text-decoration:none;font-weight:800;font-size:12px}
.ho-hero{background:linear-gradient(115deg,#103c2c,#176448 72%,#217755);border-radius:22px;padding:36px 38px;color:#fff;box-shadow:0 12px 32px #134a311a}
.ho-hero small{color:#b9e7ce;letter-spacing:2px;font-size:10px;font-weight:850}
.ho-hero h1{font:850 clamp(27px,3vw,36px)/1.2 Arial,sans-serif;color:#fff;margin:13px 0}
.ho-hero p{color:#deeee5;max-width:720px;margin:0;font-size:13px}
.ho-controls{display:flex;gap:12px;align-items:end;flex-wrap:wrap;margin:25px 0 19px}
.ho-controls label{font-size:11px;font-weight:800;color:#6d8877}
.ho-input{display:block;min-width:140px;margin-top:5px;padding:11px;border:1px solid #dce8df;border-radius:9px;background:#fff;color:#25553c;font:12px Arial}
.ho-cards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:13px;margin-bottom:17px}
.ho-card,.ho-panel{background:#fff;border:1px solid #e1ebe4;border-radius:15px;padding:22px;min-width:0}
.ho-card small{display:block;color:#748e7b;font-size:11px;font-weight:800}.ho-card strong{display:block;color:#19764e;font-size:29px;margin:8px 0}.ho-card span{color:#8a9e8e;font-size:11px}
.ho-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:17px}
.ho-panel h2{font:800 17px Arial,sans-serif;color:#1c4531;margin:0 0 9px}
.ho-desc{color:#819689;font-size:12px;margin:0 0 16px}
.ho-row{display:flex;justify-content:space-between;align-items:center;gap:14px;border-top:1px solid #edf2ee;padding:14px 0}
.ho-row strong{font-size:12px}.ho-row small{display:block;color:#829789;font-size:11px;margin-top:5px}
.ho-tag{border-radius:30px;padding:5px 10px;background:#e8f4ec;color:#21734c;font-size:10px;font-weight:800;white-space:nowrap}
.ho-tag.warn{background:#fff0dd;color:#9b6c2a}.ho-tag.bad{background:#ffebe6;color:#a94c39}
.ho-tablewrap{overflow:auto}.ho-table{width:100%;border-collapse:collapse;min-width:680px;font-size:12px}
.ho-table th{text-align:left;background:#f7faf8;color:#708a78;padding:12px;font-size:10px}
.ho-table td{border-top:1px solid #edf2ee;padding:12px;color:#3d604a}
.ho-link{color:#18774e;text-decoration:none;font-weight:800;font-size:12px}
.ho-note{font-size:11px;color:#849a8b;line-height:1.7;margin-top:15px}
.ho-error{background:#fff0e6;color:#a4513d;padding:14px;border-radius:10px;margin:14px 0}
@media(max-width:1050px){.ho-cards{grid-template-columns:repeat(2,1fr)}.ho-grid{grid-template-columns:1fr}}
@media(max-width:760px){.ho-layout{display:block}.ho-side{padding:13px 16px;border-right:0;border-bottom:1px solid #e4ede6}.ho-brand{padding:0 0 12px}.ho-nav{flex-direction:row;overflow:auto}.ho-nav a{white-space:nowrap;flex:0 0 auto}.ho-content{padding:0 15px 40px}.ho-top{height:60px;margin-bottom:18px}.ho-hero{padding:26px 22px}.ho-card,.ho-panel{padding:16px}}
`;
const day=s=>{if(!s)return null;const d=Date.parse(s);return Number.isFinite(d)?Math.floor(d/86400000):null;};
export default function RecruitmentHandover(){
 const [companies,setCompanies]=useState([]),[company,setCompany]=useState(""),[tasks,setTasks]=useState([]),[members,setMembers]=useState([]),[jobs,setJobs]=useState([]),[user,setUser]=useState(""),[selected,setSelected]=useState("all"),[loading,setLoading]=useState(true),[error,setError]=useState(""),[reload,setReload]=useState(0);
 useEffect(()=>{let active=true;(async()=>{const auth=await supabase.auth.getUser();if(!active)return;if(!auth.data?.user){setError("Please sign in.");setLoading(false);return;}setUser(auth.data.user.id);const r=await supabase.from("company_members").select("company_id,role").eq("user_id",auth.data.user.id);if(!active)return;if(r.error)setError(r.error.message);else{setCompanies(r.data||[]);setCompany(r.data?.[0]?.company_id||"");}setLoading(false);})();return()=>{active=false;};},[]);
 useEffect(()=>{if(!company)return;let active=true;(async()=>{setLoading(true);const r=await Promise.all([supabase.from("recruitment_tasks").select("id,title,status,priority,due_date,assigned_to,created_by,job_id").eq("company_id",company).limit(5000),supabase.from("company_members").select("user_id,role").eq("company_id",company),supabase.from("jobs").select("id,title").eq("company_id",company).limit(1000)]);if(!active)return;const bad=r.find(x=>x.error);setError(bad?"Some handover data could not load: "+bad.error.message:"");setTasks(r[0].data||[]);setMembers(r[1].data||[]);setJobs(r[2].data||[]);setLoading(false);})();return()=>{active=false;};},[company,reload]);
 const open=tasks.filter(t=>t.status!=="completed");
 const today=Math.floor(Date.now()/86400000);
 const overdue=open.filter(t=>day(t.due_date)!==null&&day(t.due_date)<today);
 const unassigned=open.filter(t=>!t.assigned_to);
 const blocked=open.filter(t=>t.status==="blocked");
 const memberIds=[...new Set([...members.map(m=>m.user_id),...open.map(t=>t.assigned_to).filter(Boolean)])];
 const visible=open.filter(t=>selected==="all"||selected==="unassigned"&&!t.assigned_to||t.assigned_to===selected);
 const score=t=>!t.assigned_to?4:0+(t.status==="blocked"?3:0)+(day(t.due_date)!==null&&day(t.due_date)<today?5:0)+(t.priority==="high"?1:0);
 const queue=[...visible].sort((a,b)=>score(b)-score(a)||String(a.due_date||"9999").localeCompare(String(b.due_date||"9999")));
 const label=t=>!t.assigned_to?"Assign owner":t.status==="blocked"?"Unblock task":day(t.due_date)!==null&&day(t.due_date)<today?"Overdue follow-up":!t.due_date?"Set deadline":"Continue ownership";
 const getJob=id=>jobs.find(j=>String(j.id)===String(id))?.title||"—";
 const textReport=["INSPIRE MATCH — RECRUITMENT HANDOVER","Company: "+company,"Generated: "+new Date().toLocaleString(),"Open tasks: "+open.length,"Overdue: "+overdue.length,"Blocked: "+blocked.length,"Unassigned: "+unassigned.length,"","PRIORITY HANDOVER QUEUE",...queue.map(t=>[t.title||"Recruitment task","Status: "+t.status,"Owner: "+(t.assigned_to||"Unassigned"),"Due: "+(t.due_date||"Not set"),"Action: "+label(t)].join(" | "))].join("\n");
 return <main className="ho-page"><style>{css}</style><div className="ho-layout">
  <aside className="ho-side"><div className="ho-brand"><span className="ho-mark">I</span><div>Inspire Match<small>TALENT INTELLIGENCE</small></div></div><ATSNavigation className="ho-nav"/></aside>
  <div className="ho-content"><div className="ho-wrap">
   <div className="ho-top"><span style={{color:"#758b7d",fontSize:12}}>Workspace / <strong style={{color:"#176144"}}>Recruitment Operations</strong> / Handover</span><Link className="ho-back" href="/app/recruitment-operations">← All Operations</Link></div>
   <header className="ho-hero"><small>RECRUITMENT OPERATIONS / CONTINUITY</small><h1>Recruitment Handover &amp; Continuity</h1><p>Keep hiring work moving during recruiter transitions, leave and workload changes. Review ownership gaps, prioritize pending actions and prepare a shareable handover brief.</p></header>
   <div className="ho-controls">
    <label>Company<select className="ho-input" value={company} onChange={e=>setCompany(e.target.value)}>{companies.map(c=><option key={c.company_id} value={c.company_id}>Company {String(c.company_id).slice(0,8)}</option>)}</select></label>
    <label>Handover owner<select className="ho-input" value={selected} onChange={e=>setSelected(e.target.value)}><option value="all">All owners</option><option value="unassigned">Unassigned</option>{memberIds.map(id=><option key={id} value={id}>{id===user?"You":"Member "+String(id).slice(0,8)}</option>)}</select></label>
    <button className="ho-input" style={{cursor:"pointer",fontWeight:800}} onClick={()=>setReload(n=>n+1)} disabled={loading}>↻ Refresh</button>
    <button className="ho-input" style={{cursor:"pointer",fontWeight:800,color:"#176b49"}} onClick={()=>{const blob=new Blob([textReport],{type:"text/plain;charset=utf-8"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="inspire-match-handover.txt";a.click();URL.revokeObjectURL(url);}} disabled={loading||!company}>↓ Export Handover</button>
   </div>
   {error&&<div className="ho-error" role="alert">{error}</div>}
   <div className="ho-cards">{[["Open Tasks",open.length,"Pending team work"],["Unassigned",unassigned.length,"Need ownership"],["Overdue",overdue.length,"Past due date"],["Blocked",blocked.length,"Need intervention"]].map(([a,b,c])=><div className="ho-card" key={a}><small>{a}</small><strong>{loading?"—":b}</strong><span>{c}</span></div>)}</div>
   <div className="ho-grid">
    <section className="ho-panel"><h2>Handover Readiness</h2><p className="ho-desc">Priority signals to resolve before transferring responsibility.</p>
     {[[ "Unassigned tasks",unassigned.length,"Assign a responsible recruiter"],["Blocked tasks",blocked.length,"Resolve blockers or document next steps"],["Overdue tasks",overdue.length,"Confirm recovery dates"],["Missing deadlines",open.filter(t=>!t.due_date).length,"Set a due date for continuity"]].map(([a,b,c])=><div className="ho-row" key={a}><div><strong>{a}</strong><small>{c}</small></div><span className={"ho-tag "+(b?"warn":"")}>{b}</span></div>)}
    </section>
    <section className="ho-panel"><h2>Team Ownership</h2><p className="ho-desc">Open work by assigned team member, including unassigned work.</p>
     {[...memberIds.map(id=>({id,name:id===user?"You":"Member "+String(id).slice(0,8)})),{id:null,name:"Unassigned"}].map(m=><div className="ho-row" key={m.id||"none"}><div><strong>{m.name}</strong><small>{m.id?(members.find(x=>x.user_id===m.id)?.role||"Team member"):"Needs a new owner"}</small></div><span className="ho-tag">{open.filter(t=>t.assigned_to===m.id||!t.assigned_to&&!m.id).length} tasks</span></div>)}
     <Link className="ho-link" href="/app/recruitment-operations/tasks">Manage assignments →</Link>
    </section>
   </div>
   <section className="ho-panel"><div style={{display:"flex",justifyContent:"space-between",gap:15,flexWrap:"wrap"}}><div><h2>Priority Handover Queue</h2><p className="ho-desc">Review pending work and next actions before reassigning a recruiter.</p></div><Link className="ho-link" href="/app/recruitment-operations/tasks">Open Task Management →</Link></div>
    <div className="ho-tablewrap"><table className="ho-table"><thead><tr>{["Task","Job","Owner","Status","Due","Next Action"].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{queue.slice(0,100).map(t=><tr key={t.id}><td><strong>{t.title||"Task"}</strong></td><td>{getJob(t.job_id)}</td><td>{t.assigned_to?(t.assigned_to===user?"You":"Member "+String(t.assigned_to).slice(0,8)):"Unassigned"}</td><td><span className={"ho-tag "+(t.status==="blocked"?"bad":"")}>{t.status}</span></td><td>{t.due_date||"—"}</td><td>{label(t)}</td></tr>)}</tbody></table></div>
    {!queue.length&&<p className="ho-desc">No pending tasks match this owner.</p>}
    <p className="ho-note">This is a read-only continuity view. Assignment changes are made through Recruitment Task Management and are subject to company access rules. Exported briefs contain task details, so share them only with authorized team members. Historical handover approvals and automatic reassignment are not implemented.</p>
   </section>
  </div></div>
 </div></main>;
}
