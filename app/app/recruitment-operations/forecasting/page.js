"use client";
import Link from "next/link";
import {useEffect,useMemo,useState} from "react";
import {supabase} from "@/lib/supabase";
import ATSNavigation from "@/components/ATSNavigation";
const ui={
 root:{display:"grid",gridTemplateColumns:"252px minmax(0,1fr)",minHeight:"100vh",background:"#f5f8f6",color:"#1c4631",fontFamily:"Arial,sans-serif"},
 side:{background:"#fff",padding:22,borderRight:"1px solid #e2ece5"},
 main:{padding:"28px clamp(16px,3vw,48px) 55px",minWidth:0},
 hero:{background:"linear-gradient(115deg,#123d2c,#268453)",borderRadius:19,padding:32,color:"#fff"},
 panel:{background:"#fff",border:"1px solid #e0ebe3",borderRadius:15,padding:22,minWidth:0},
 grid:{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(290px,1fr))",gap:15,marginBottom:16},
 metrics:{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(165px,1fr))",gap:12,margin:"18px 0"},
 label:{display:"block",fontSize:11,fontWeight:800,color:"#678473",marginBottom:7},
 input:{padding:10,border:"1px solid #dce7df",borderRadius:8,color:"#23533a",background:"#fff"},
 row:{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",padding:"13px 0",borderTop:"1px solid #edf2ee"},
 note:{color:"#84998a",fontSize:11,lineHeight:1.6},
 link:{color:"#19734e",fontWeight:800,fontSize:12,textDecoration:"none"}
};
function iso(d){return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");}
function plus(d,n){const x=new Date(d);x.setDate(x.getDate()+n);return x;}
function weekStart(d){const x=new Date(d);x.setHours(12,0,0,0);x.setDate(x.getDate()-((x.getDay()+6)%7));return x;}
export default function RecruitmentForecasting(){
 const [userId,setUserId]=useState("");
 const [companies,setCompanies]=useState([]);
 const [company,setCompany]=useState("");
 const [members,setMembers]=useState([]);
 const [tasks,setTasks]=useState([]);
 const [jobs,setJobs]=useState([]);
 const [target,setTarget]=useState(8);
 const [ratio,setRatio]=useState(2);
 const [horizon,setHorizon]=useState(4);
 const [refresh,setRefresh]=useState(0);
 const [error,setError]=useState("");
 const [loading,setLoading]=useState(true);
 useEffect(()=>{let alive=true;(async()=>{
  const auth=await supabase.auth.getUser();
  if(!alive)return;
  if(!auth.data?.user){setError("Please sign in.");setLoading(false);return;}
  setUserId(auth.data.user.id);
  const r=await supabase.from("company_members").select("company_id,role").eq("user_id",auth.data.user.id);
  if(!alive)return;
  if(r.error){setError(r.error.message);setLoading(false);return;}
  setCompanies(r.data||[]);
  if(r.data?.[0]?.company_id)setCompany(r.data[0].company_id);
  else{setError("No company membership found.");setLoading(false);}
 })();return()=>{alive=false;};},[]);
 useEffect(()=>{if(!company)return;let alive=true;(async()=>{
  setLoading(true);setError("");
  const results=await Promise.all([
   supabase.from("company_members").select("user_id,role").eq("company_id",company),
   supabase.from("recruitment_tasks").select("id,status,priority,due_date,assigned_to").eq("company_id",company).limit(5000),
   supabase.from("jobs").select("id,title,status").eq("company_id",company).limit(2000)
  ]);
  if(!alive)return;
  const failed=results.find(r=>r.error);
  if(failed)setError("Some forecast data could not be loaded: "+failed.error.message);
  setMembers(results[0].data||[]);setTasks(results[1].data||[]);setJobs(results[2].data||[]);setLoading(false);
 })();return()=>{alive=false;};},[company,refresh]);
 const now=new Date(),today=iso(now),start=weekStart(now);
 const activeJobs=jobs.filter(j=>!["closed","filled","cancelled","archived","inactive","hired"].includes(String(j.status||"").toLowerCase()));
 const open=tasks.filter(t=>t.status!=="completed");
 const unassigned=open.filter(t=>!t.assigned_to);
 const overdue=open.filter(t=>t.due_date&&t.due_date<today);
 const people=[...new Set(members.map(m=>m.user_id).filter(Boolean))];
 const slots=people.length*target;
 const estimated=activeJobs.length*ratio;
 const demand=open.length+estimated;
 const gap=Math.max(0,demand-slots);
 const extra=Math.ceil(gap/target);
 const load=slots?Math.round(demand/slots*100):0;
 const weekly=useMemo(()=>Array.from({length:horizon},(_,i)=>{
  const d=plus(start,i*7),next=plus(d,7),a=iso(d),b=iso(next);
  const due=open.filter(t=>t.due_date&&t.due_date>=a&&t.due_date<b).length;
  const forecast=Math.floor(estimated/horizon)+(i<estimated%horizon?1:0);
  return {label:d.toLocaleDateString("en-GB",{day:"numeric",month:"short"}),due,forecast,total:due+forecast};
 }),[tasks,jobs,horizon,ratio,start.getTime()]);
 const max=Math.max(1,...weekly.map(w=>w.total));
 const title=(s)=><h3 style={{margin:"0 0 9px",fontSize:17}}>{s}</h3>;
 const note=(s)=><p style={ui.note}>{s}</p>;
 return <div style={ui.root}>
  <aside style={ui.side}><div style={{fontSize:18,fontWeight:850,marginBottom:28}}>◈ Inspire Match<div style={{fontSize:9,letterSpacing:2,color:"#84988a"}}>TALENT INTELLIGENCE</div></div><ATSNavigation/></aside>
  <main style={ui.main}><div style={{maxWidth:1240,margin:"auto"}}>
   <Link href="/app/recruitment-operations" style={ui.link}>← Recruitment Operations</Link>
   <header style={{...ui.hero,marginTop:23}}><small style={{letterSpacing:2,fontWeight:800,color:"#c9ecd6"}}>RECRUITMENT OPERATIONS / RESOURCE INTELLIGENCE</small><h1 style={{fontSize:30,color:"#fff",margin:"12px 0"}}>Recruitment Resource Forecasting</h1><p style={{fontSize:13,lineHeight:1.7,maxWidth:750,color:"#e2f1e8"}}>Estimate upcoming hiring workload, identify capacity gaps, and plan recruiter resources with transparent scenario assumptions.</p></header>
   <div style={{display:"flex",justifyContent:"space-between",gap:18,flexWrap:"wrap",alignItems:"end",margin:"27px 0 16px"}}>
    <div><h2 style={{margin:"0 0 6px"}}>Forecast assumptions</h2>{note("Adjust the scenario without changing company records.")}</div>
    <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"end"}}>
     <label style={ui.label}>Company<select style={{...ui.input,display:"block"}} value={company} onChange={e=>setCompany(e.target.value)}>{companies.filter((c,i,a)=>a.findIndex(x=>x.company_id===c.company_id)===i).map(c=><option key={c.company_id} value={c.company_id}>Company {String(c.company_id).slice(0,8)}</option>)}</select></label>
     <label style={ui.label}>Horizon<select style={{...ui.input,display:"block"}} value={horizon} onChange={e=>setHorizon(Number(e.target.value))}><option value={4}>4 weeks</option><option value={8}>8 weeks</option><option value={12}>12 weeks</option></select></label>
     <label style={ui.label}>Tasks / member<input style={{...ui.input,display:"block",width:90}} type="number" min="1" max="100" value={target} onChange={e=>setTarget(Math.max(1,Math.min(100,Number(e.target.value)||1)))}/></label>
     <label style={ui.label}>New tasks / job<input style={{...ui.input,display:"block",width:90}} type="number" min="0" max="50" value={ratio} onChange={e=>setRatio(Math.max(0,Math.min(50,Number(e.target.value)||0)))}/></label>
     <button style={{...ui.input,cursor:"pointer",fontWeight:800}} disabled={loading} onClick={()=>setRefresh(n=>n+1)}>↻ Refresh</button>
    </div>
   </div>
   {error&&<div style={{background:"#fff0e7",padding:14,borderRadius:10,color:"#a35335",marginBottom:15}}>{error}</div>}
   <div style={ui.metrics}>{[
    ["Open Requisitions",activeJobs.length,"Accessible active jobs"],
    ["Projected Task Demand",demand,open.length+" open + "+estimated+" scenario tasks"],
    ["Planned Team Capacity",slots,people.length+" members × "+target+" slots"],
    ["Estimated Resource Gap",gap,extra+" additional members estimated"]
   ].map(([name,value,desc])=><section key={name} style={ui.panel}><div style={ui.label}>{name}</div><strong style={{fontSize:29,color:"#1c7951"}}>{loading?"—":value}</strong><div style={{...ui.note,marginTop:9}}>{desc}</div></section>)}</div>
   <div style={ui.grid}>
    <section style={ui.panel}>{title("Upcoming Workload by Week")}{note("Known due tasks plus evenly allocated scenario tasks from open jobs.")}
     <div style={{display:"grid",gridTemplateColumns:"repeat("+horizon+",minmax(0,1fr))",gap:9,height:240,alignItems:"end",overflowX:"auto"}}>
      {weekly.map((w,i)=><div key={i} style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"end",height:"100%",gap:7,minWidth:30}}><strong style={{fontSize:11}}>{w.total}</strong><div title={w.due+" due + "+w.forecast+" estimated"} style={{height:Math.max(5,w.total/max*155),width:"80%",maxWidth:62,background:"linear-gradient(#298d5d,#d0e9d7)",borderRadius:"7px 7px 0 0"}}/><small style={{fontSize:10,color:"#64826d"}}>{w.label}</small></div>)}
     </div>{note("Tasks without deadlines count toward total demand but not the weekly bars.")}
    </section>
    <section style={ui.panel}>{title("Capacity Pressure")}{note("Projected workload versus the adjustable task capacity target.")}
     <div style={ui.row}><strong>Forecast utilization</strong><strong style={{color:load>100?"#b45d3e":"#19754b"}}>{load}%</strong></div>
     <div style={{height:9,background:"#eaf3ed",borderRadius:20,overflow:"hidden"}}><div style={{height:"100%",width:Math.min(100,load)+"%",background:load>100?"#cf805b":"#258557"}}/></div>
     {[["Open tasks",open.length],["Unassigned tasks",unassigned.length],["Overdue tasks",overdue.length],["Estimated new tasks",estimated],["Suggested additional staff",extra]].map(([k,v])=><div style={ui.row} key={k}><strong>{k}</strong><span>{v}</span></div>)}
     {gap>0&&<p style={{padding:12,background:"#fff2e8",color:"#9d613c",borderRadius:9,fontSize:12}}>Scenario demand exceeds planned capacity by {gap} tasks.</p>}
    </section>
   </div>
   <div style={ui.grid}>
    <section style={ui.panel}>{title("Recruiter Availability Outlook")}{note("Open work and upcoming deadlines by team member.")}
     {people.length===0?note("No visible company members."):people.map(id=>{
      const mine=open.filter(t=>t.assigned_to===id);
      const soon=mine.filter(t=>t.due_date&&t.due_date>=today&&t.due_date<=iso(plus(now,7))).length;
      return <div style={ui.row} key={id}><div><strong>{id===userId?"You":"Team Member · "+String(id).slice(0,8)}</strong><div style={ui.note}>{mine.length} open · {soon} due in 7 days</div></div><strong style={{color:mine.length>target?"#b65e42":"#218053"}}>{Math.max(0,target-mine.length)} slots left</strong></div>;
     })}
    </section>
    <section style={ui.panel}>{title("Resource Planning Recommendations")}{note("Rule-based planning guidance, not machine-learning predictions.")}
     {[["Assign unowned tasks",unassigned.length],["Resolve overdue work",overdue.length],["Review active requisitions",activeJobs.length],["Estimated additional members",extra]].map(([k,v])=><div style={ui.row} key={k}><strong>{k}</strong><span>{v}</span></div>)}
     <Link style={ui.link} href="/app/recruitment-operations/capacity">Open Capacity Planning →</Link>
    </section>
   </div>
   <section style={ui.panel}>{title("Forecast Breakdown")}{note("Weekly due dates and estimated new tasks across the selected horizon.")}
    <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}><thead><tr>{["Week starting","Known due tasks","Estimated new tasks","Total weekly workload"].map(h=><th key={h} style={{padding:13,textAlign:"left",background:"#f5f9f6"}}>{h}</th>)}</tr></thead><tbody>{weekly.map((w,i)=><tr key={i}>{[w.label,w.due,w.forecast,w.total].map((v,j)=><td key={j} style={{padding:13,borderTop:"1px solid #e8eee9"}}>{v}</td>)}</tr>)}</tbody></table></div>
    {note("Planning estimates only. Each open requisition contributes the adjustable number of new tasks across the horizon. Team capacity uses task counts, not working hours. No tasks are created or reassigned. Access is limited by Supabase policies.")}
   </section>
  </div></main>
 </div>;
}
