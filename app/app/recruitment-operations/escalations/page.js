"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import {supabase} from "@/lib/supabase";
import ATSNavigation from "@/components/ATSNavigation";
const pageStyles = `
.sla-page { width:100%; min-height:100vh; background:#f5f8f6; color:#1c4531; font:14px/1.5 Arial,Helvetica,sans-serif; }
.sla-page *, .sla-page *::before, .sla-page *::after { box-sizing:border-box; }
.sla-page h1,.sla-page h2,.sla-page h3 { font-family:Arial,Helvetica,sans-serif; font-weight:800; letter-spacing:-.5px; line-height:1.25; }
.sla-page h3 { font-size:17px; margin:0 0 11px; color:#173d2c; }
.sla-page p { font-family:Arial,Helvetica,sans-serif; }
.sla-layout { display:grid; grid-template-columns:252px minmax(0,1fr); min-height:100vh; }
.sla-sidebar { background:#fff; border-right:1px solid #e5ece7; padding:27px 14px 22px; }
.sla-brand { display:flex; align-items:center; gap:11px; padding:3px 13px 32px; }
.sla-logo { width:36px; height:36px; flex:0 0 36px; display:grid; place-items:center; background:#14583e; border-radius:11px; color:#fff; font-size:22px; font-weight:850; }
.sla-brand-name { display:block; font-size:17px; font-weight:850; color:#173e30; letter-spacing:-.5px; }
.sla-brand-sub { display:block; margin-top:3px; font-size:9px; font-weight:800; letter-spacing:1.7px; color:#83978a; }
.sla-nav-label { font-size:10px; font-weight:800; letter-spacing:1.5px; color:#93a49a; padding:0 13px 12px; }
.sla-nav { display:flex; flex-direction:column; gap:4px; }
.sla-nav a { display:flex; align-items:center; gap:12px; min-height:40px; padding:10px 12px; border-radius:10px; text-decoration:none; color:#5d7267; font-size:12px; font-weight:700; transition:background .15s; }
.sla-nav a span { font-size:15px; width:17px; text-align:center; flex:0 0 17px; }
.sla-nav a:hover { background:#f0f6f2; color:#166144; }
.sla-nav a.active { background:#e5f2e9; color:#145f42; font-weight:800; }
.sla-content { min-width:0; padding:0 clamp(18px,3.4vw,54px) 65px; }
.sla-topbar { min-height:77px; display:flex; justify-content:space-between; align-items:center; gap:12px; border-bottom:1px solid #e5ece7; margin-bottom:30px; }
.sla-breadcrumb { font-size:12px; color:#718579; font-weight:650; text-decoration:none; }
.sla-breadcrumb strong { color:#176144; }
.sla-toplink { padding:10px 15px; border:1px solid #d8e7dc; background:#fff; color:#176144; border-radius:9px; font-size:12px; text-decoration:none; font-weight:800; }
.sla-container { max-width:1250px; margin:0 auto; }
.sla-hero { background:linear-gradient(115deg,#103c2c,#176448 72%,#217755); border-radius:22px; padding:36px 38px; color:#fff; box-shadow:0 12px 32px rgba(19,74,49,.10); }
.sla-hero h1 { color:#fff !important; font-size:clamp(26px,3vw,36px) !important; line-height:1.15; margin:12px 0 13px; }
.sla-hero p { color:#d7eae0; font-size:13px; line-height:1.75; max-width:720px; margin:0; }
.sla-page button { font:inherit; }
.sla-page select { cursor:pointer; max-width:100%; }
.sla-page label { display:block; font-size:11px; font-weight:800; color:#5f7b68; }
.sla-page section { min-width:0; }
.sla-page table { min-width:640px; }
.sla-page th { color:#708877; font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:.25px; }
.sla-page td { color:#3c6049; }
.sla-page td:first-child { font-weight:750; }
.sla-page a:not(.sla-nav a):hover { color:#218456; }
@media(max-width:1000px){.sla-layout{grid-template-columns:210px minmax(0,1fr)}.sla-content{padding:0 20px 42px}}
@media(max-width:760px){.sla-layout{display:block}.sla-sidebar{padding:14px 16px;border-right:0;border-bottom:1px solid #e5ece7}.sla-brand{padding:0 0 12px}.sla-nav{flex-direction:row;overflow-x:auto}.sla-nav a{flex:0 0 auto;white-space:nowrap}.sla-content{padding:0 15px 35px}.sla-topbar{min-height:60px;margin-bottom:18px}.sla-hero{padding:27px 23px}.sla-page table{min-width:640px}}
`;
const card={background:"#fff",border:"1px solid #dce9df",borderRadius:15,padding:22};
const input={border:"1px solid #d6e6da",borderRadius:9,padding:10,background:"#fff",color:"#21543a"};
const dateDay=s=>{if(!s)return null;const d=new Date(s+"T12:00:00");return Number.isNaN(d.getTime())?null:Math.floor(d.getTime()/86400000);};
export default function EscalationPage(){
 const [company,setCompany]=useState(""),[companies,setCompanies]=useState([]),[tasks,setTasks]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState("");
 const [warning,setWarning]=useState(3),[manager,setManager]=useState(3),[critical,setCritical]=useState(7),[filter,setFilter]=useState("all"),[reload,setReload]=useState(0);
 useEffect(()=>{let alive=true;(async()=>{const a=await supabase.auth.getUser();if(!alive)return;if(!a.data?.user){setError("Please sign in.");setLoading(false);return;}const r=await supabase.from("company_members").select("company_id").eq("user_id",a.data.user.id);if(!alive)return;if(r.error)setError(r.error.message);else{setCompanies(r.data||[]);setCompany(r.data?.[0]?.company_id||"");}setLoading(false);})();return()=>{alive=false;};},[]);
 useEffect(()=>{if(!company)return;let alive=true;(async()=>{setLoading(true);const r=await supabase.from("recruitment_tasks").select("id,title,status,due_date,priority,assigned_to").eq("company_id",company).limit(5000);if(!alive)return;if(r.error)setError(r.error.message);else{setError("");setTasks(r.data||[]);}setLoading(false);})();return()=>{alive=false;};},[company,reload]);
 const now=new Date();const today=Math.floor(new Date(now.getFullYear(),now.getMonth(),now.getDate(),12).getTime()/86400000);
 const open=tasks.filter(t=>t.status!=="completed");
 const monitored=open.filter(t=>dateDay(t.due_date)!==null);
 const alerts=monitored.map(t=>{const days=today-dateDay(t.due_date);const level=days>=critical?"critical":days>=manager?"manager":days>0?"owner":days>=-warning?"risk":"healthy";return {...t,days,level};});
 const breached=alerts.filter(t=>t.days>0),atRisk=alerts.filter(t=>t.level==="risk"),escalated=alerts.filter(t=>["manager","critical"].includes(t.level));
 const queue=alerts.filter(t=>t.level!=="healthy"&&(filter==="all"||t.level===filter)).sort((a,b)=>b.days-a.days);
 const metrics=[["SLA Compliance",monitored.length?Math.round(100*(monitored.length-breached.length)/monitored.length)+"%":"N/A"],["SLA Breaches",breached.length],["Manager Escalations",escalated.length],["At-risk Tasks",atRisk.length]];
 const row=(label,value)=><div style={{display:"flex",justifyContent:"space-between",gap:12,padding:"13px 0",borderBottom:"1px solid #edf2ee"}}><strong>{label}</strong><span>{value}</span></div>;
 return <main className="sla-page"><style>{pageStyles}</style><div className="sla-layout">
  <aside className="sla-sidebar">
   <div className="sla-brand"><span className="sla-logo" aria-hidden="true">◈</span><div><span className="sla-brand-name">Inspire Match</span><span className="sla-brand-sub">TALENT INTELLIGENCE</span></div></div>
   <div className="sla-nav-label">WORKSPACE</div><ATSNavigation className="sla-nav"/>
  </aside>
  <div className="sla-content"><div className="sla-container">
  <div className="sla-topbar"><Link className="sla-breadcrumb" href="/app/recruitment-operations">Workspace / <strong>Recruitment Operations</strong> / SLA Escalations</Link><Link href="/app/recruitment-operations" className="sla-toplink">← All Operations</Link></div>
  <header className="sla-hero"><small style={{letterSpacing:2}}>RECRUITMENT OPERATIONS / SLA GOVERNANCE</small><h1 style={{color:"#fff",fontSize:30}}>Recruitment SLA &amp; Escalation Intelligence</h1><p style={{color:"#e4f2e9",lineHeight:1.6}}>Prioritize deadline breaches, route follow-ups to the responsible owner, and identify cases needing manager review.</p></header>
  <div style={{display:"flex",gap:13,flexWrap:"wrap",alignItems:"end",margin:"25px 0"}}>
   <label>Company<select style={{...input,display:"block"}} value={company} onChange={e=>setCompany(e.target.value)}>{companies.map((c,i)=><option key={i} value={c.company_id}>Company {String(c.company_id).slice(0,8)}</option>)}</select></label>
   <label>Risk window<select style={{...input,display:"block"}} value={warning} onChange={e=>setWarning(Number(e.target.value))}>{[1,3,5,7].map(n=><option key={n} value={n}>{n} days</option>)}</select></label>
   <label>Manager review<select style={{...input,display:"block"}} value={manager} onChange={e=>{const n=Number(e.target.value);setManager(n);setCritical(Math.max(critical,n+1));}}>{[2,3,5,7].map(n=><option key={n} value={n}>{n} days late</option>)}</select></label>
   <label>Critical<select style={{...input,display:"block"}} value={critical} onChange={e=>setCritical(Number(e.target.value))}>{[5,7,10,14].filter(n=>n>manager).map(n=><option key={n} value={n}>{n} days late</option>)}</select></label>
   <button style={{...input,cursor:"pointer"}} onClick={()=>setReload(x=>x+1)} disabled={loading}>↻ Refresh</button>
  </div>
  {error&&<p style={{padding:13,background:"#fff0e6",color:"#a3543d"}}>{error}</p>}
  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:13,marginBottom:16}}>{metrics.map(([k,v])=><section style={card} key={k}><small style={{color:"#728e7b"}}>{k}</small><strong style={{display:"block",fontSize:29,color:"#19764d",marginTop:10}}>{loading?"—":v}</strong></section>)}</div>
  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:16,marginBottom:16}}>
   <section style={card}><h3>Escalation Levels</h3><p style={{fontSize:12,color:"#82988a"}}>Recommended follow-up actions, not notifications already sent.</p>
    {row("At risk",atRisk.length)}{row("Owner follow-up",alerts.filter(t=>t.level==="owner").length)}{row("Manager review",alerts.filter(t=>t.level==="manager").length)}{row("Critical escalation",alerts.filter(t=>t.level==="critical").length)}
   </section>
   <section style={card}><h3>SLA Ownership</h3>{row("Open tasks",open.length)}{row("Without deadlines",open.length-monitored.length)}{row("Unassigned tasks",open.filter(t=>!t.assigned_to).length)}{row("Past due",breached.length)}
    <Link href="/app/recruitment-operations/tasks" style={{display:"inline-block",marginTop:18,color:"#19754d"}}>Manage Tasks →</Link>
   </section>
  </div>
  <section style={card}><div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:12}}><div><h3>Escalation Action Queue</h3><p style={{color:"#82988a",fontSize:12}}>Sorted by days overdue; owners and recommended actions are visible.</p></div><select style={input} value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All alerts</option><option value="critical">Critical</option><option value="manager">Manager review</option><option value="owner">Owner follow-up</option><option value="risk">At risk</option></select></div>
   <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}><thead><tr>{["Task","Owner","Deadline","Severity","Recommended Action","Review"].map(h=><th key={h} style={{padding:12,textAlign:"left",background:"#f5f9f6"}}>{h}</th>)}</tr></thead><tbody>{queue.slice(0,100).map(t=><tr key={t.id}>{[t.title||"Task",t.assigned_to?"Member "+String(t.assigned_to).slice(0,8):"Unassigned",t.due_date,t.level,t.level==="critical"?"Urgent manager review":t.level==="manager"?"Manager review":t.level==="owner"?"Follow up with owner":"Send reminder"].map((v,i)=><td key={i} style={{padding:12,borderBottom:"1px solid #e8eee9"}}>{v}</td>)}<td><Link href="/app/recruitment-operations/tasks" style={{color:"#19754d"}}>Open →</Link></td></tr>)}</tbody></table>{!queue.length&&<p style={{color:"#82988a"}}>No active SLA alerts.</p>}</div>
   <p style={{fontSize:11,color:"#83988b",lineHeight:1.7}}>Escalations are in-app recommendations only; no emails or notifications are sent. Rules are adjustable locally and not saved as company policies. Only open tasks with due dates are measurable. Per-stage SLA policies and automated escalation delivery require separate backend implementation.</p>
  </section>
 </div></div></div></main>;
}
