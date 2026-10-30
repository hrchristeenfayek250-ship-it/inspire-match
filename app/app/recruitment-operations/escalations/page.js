"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import {supabase} from "@/lib/supabase";
import ATSNavigation from "@/components/ATSNavigation";
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
 return <main style={{minHeight:"100vh",background:"#f5f8f6",color:"#1c4531",fontFamily:"Arial,sans-serif",padding:"25px clamp(15px,3vw,45px)"}}>
  <div style={{maxWidth:1250,margin:"auto"}}><div style={{marginBottom:20}}><ATSNavigation/></div>
  <Link href="/app/recruitment-operations" style={{color:"#18724c",fontSize:12,fontWeight:800}}>← Recruitment Operations</Link>
  <header style={{background:"linear-gradient(110deg,#123c2b,#268456)",color:"#fff",borderRadius:20,padding:35,marginTop:20}}><small style={{letterSpacing:2}}>RECRUITMENT OPERATIONS / SLA GOVERNANCE</small><h1 style={{color:"#fff",fontSize:30}}>Recruitment SLA &amp; Escalation Intelligence</h1><p style={{color:"#e4f2e9",lineHeight:1.6}}>Prioritize deadline breaches, route follow-ups to the responsible owner, and identify cases needing manager review.</p></header>
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
 </div></main>;
}
