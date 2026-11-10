"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import ATSNavigation from "@/components/ATSNavigation";

const css = `
.today{min-height:100vh;background:#f4f8f5;color:#173e2c;font-family:Arial,Helvetica,sans-serif}
.today *{box-sizing:border-box}.today-layout{display:grid;grid-template-columns:248px minmax(0,1fr);min-height:100vh}
.today-side{background:#fff;border-right:1px solid #e0ebe3;padding:28px 16px}
.today-brand{font-weight:900;font-size:19px;margin:0 12px 27px}.today-brand small{display:block;color:#789180;font-size:10px;letter-spacing:2px;margin-top:5px}
.today-nav{display:flex;flex-direction:column;gap:4px}.today-nav a{padding:10px 12px;border-radius:9px;text-decoration:none;color:#526d5c;font-size:12px;font-weight:700;display:flex;gap:11px}
.today-nav a.active,.today-nav a:hover{background:#e7f4eb;color:#17613e}
.today-main{padding:34px clamp(18px,4vw,52px);max-width:1480px;width:100%;margin:0 auto}
.today-head{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;margin-bottom:26px}
.today-eyebrow{font-size:11px;letter-spacing:2px;color:#468262;font-weight:900}.today h1{font-family:Georgia,serif;font-size:clamp(29px,3vw,43px);margin:10px 0}.today-muted{color:#718678;font-size:13px;line-height:1.7}
.today-btn{display:inline-flex;align-items:center;justify-content:center;background:#176a48;color:white;padding:12px 17px;border:0;border-radius:10px;text-decoration:none;font-weight:800;cursor:pointer;font-size:12px}
.today-btn:disabled{opacity:.55}.today-filter{padding:11px;border:1px solid #d8e6dc;border-radius:10px;background:#fff;color:#214d35;max-width:280px}
.today-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin:20px 0 28px}
.today-quick{display:flex;gap:10px;flex-wrap:wrap;margin:19px 0 26px}.today-quick a{display:inline-flex;align-items:center;gap:8px;background:#fff;border:1px solid #dce8de;color:#175e42;text-decoration:none;padding:12px 14px;font-size:12px;font-weight:850;border-radius:11px;min-height:44px}.today-quick a:hover{background:#e7f4eb;border-color:#81b799}
.today-stat,.today-panel{background:#fff;border:1px solid #e1eae3;border-radius:17px;padding:20px;box-shadow:0 4px 20px #214f3010}
.today-stat strong{display:block;font-size:32px;margin:10px 0;color:#175c3b}.today-stat span{font-size:12px;color:#607c69;font-weight:800}
.today-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:17px}.today-panel h2{font-size:17px;margin:0 0 6px}
.today-item{padding:14px 0;border-top:1px solid #edf1ed;display:flex;justify-content:space-between;align-items:center;gap:12px}
.today-item strong{display:block;font-size:13px}.today-item small{display:block;color:#728477;font-size:11px;margin-top:6px;line-height:1.5}
.today-link{color:#176a48;text-decoration:none;font-weight:800;font-size:12px;white-space:nowrap}
.today-alert{background:#fff2ed;color:#8e3b28;padding:13px;border-radius:10px;margin-bottom:14px;font-size:12px}
@media(max-width:1000px){.today-layout{display:block}.today-side{border-bottom:1px solid #e0ebe3}.today-nav{flex-direction:row;overflow-x:auto}.today-nav a{white-space:nowrap}.today-stats{grid-template-columns:repeat(2,1fr)}}@media(max-width:640px){.today-grid{grid-template-columns:1fr}.today-main{padding:20px 14px}.today-stats{gap:9px}.today-stat{padding:14px}.today-stat strong{font-size:26px}}
`;
const dateKey = v => { if(!v)return ""; const d=new Date(v);return Number.isFinite(d.getTime()) ? [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-") : ""; };
const pretty = v => v ? new Date(v).toLocaleString("en-GB",{dateStyle:"medium",timeStyle:"short"}) : "Not scheduled";
const todayKey = () => dateKey(new Date());
export default function TodayPage(){
 const [user,setUser]=useState(null),[applications,setApplications]=useState([]),[companies,setCompanies]=useState([]),[company,setCompany]=useState(""),[interviews,setInterviews]=useState([]),[evaluations,setEvaluations]=useState([]),[tasks,setTasks]=useState([]),[approvals,setApprovals]=useState([]),[candidates,setCandidates]=useState([]),[jobs,setJobs]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const load=useCallback(async()=>{
  setLoading(true);setError("");setNotice("");
  try{
   const auth=await supabase.auth.getUser();
   if(auth.error||!auth.data?.user)throw Error("Please sign in to view your workday.");
   const uid=auth.data.user.id;setUser(uid);
   const members=await supabase.from("company_members").select("company_id,role").eq("user_id",uid);
   if(members.error)throw members.error;
   const ids=[...new Set((members.data||[]).map(x=>x.company_id).filter(Boolean))];
   setCompanies(ids);setCompany(current=>ids.includes(current)?current:ids[0]||"");
   if(!ids.length){setInterviews([]);setEvaluations([]);setTasks([]);setApprovals([]);setCandidates([]);setJobs([]);setApplications([]);return;}
   const results=await Promise.all([
    supabase.from("interviews").select("*").in("company_id",ids).order("scheduled_at",{ascending:true}).limit(1000),
    supabase.from("interview_evaluations").select("*").limit(2000),
    supabase.from("recruitment_tasks").select("id,title,status,priority,due_date,company_id,assigned_to,created_by").in("company_id",ids).limit(2000),
    supabase.rpc("get_my_hiring_decisions"),
    supabase.from("candidates").select("id,full_name,company_id").in("company_id",ids).limit(5000),
    supabase.from("jobs").select("id,title,company_id").in("company_id",ids).limit(1000),
    supabase.from("applications").select("id,candidate_id,job_id,company_id").in("company_id",ids).limit(5000)
   ]);
   const setters=[setInterviews,setEvaluations,setTasks,setApprovals,setCandidates,setJobs,setApplications];
   results.forEach((r,i)=>{setters[i](!r.error&&Array.isArray(r.data)?r.data:[]);});
   const failures=results.map((r,i)=>r.error?["interviews","evaluations","tasks","approvals","candidates","jobs","applications"][i]:null).filter(Boolean);
   if(failures.length)setNotice("Some sections are unavailable with your current access: "+failures.join(", ")+".");
  }catch(e){setError(e.message||"Unable to load today's activity.");}
  finally{setLoading(false);}
 },[]);
 useEffect(()=>{load();},[load]);
 const names=useMemo(()=>new Map(candidates.map(c=>[String(c.id),c.full_name])),[candidates]);
 const jobNames=useMemo(()=>new Map(jobs.map(j=>[String(j.id),j.title])),[jobs]);
 const applicationMap=useMemo(()=>new Map(applications.map(a=>[String(a.id),a])),[applications]);
 const interviewLabel=i=>{const a=applicationMap.get(String(i.application_id));return (names.get(String(a?.candidate_id))||"Candidate")+" · "+(jobNames.get(String(a?.job_id))||i.type||"Interview");};
 const date=todayKey();
 const scopedInterviews=interviews.filter(i=>i.company_id===company);
 const todays=scopedInterviews.filter(i=>dateKey(i.scheduled_at)===date&&!["cancelled","canceled","no_show","no-show"].includes(String(i.status||"").toLowerCase()));
 const evaluationsByInterview=new Set(evaluations.map(e=>String(e.interview_id)).filter(Boolean));
 const overdueEvaluations=scopedInterviews.filter(i=>i.scheduled_at&&new Date(i.scheduled_at).getTime()<Date.now()&&!["cancelled","canceled","no_show","no-show"].includes(String(i.status||"").toLowerCase())&&!evaluationsByInterview.has(String(i.id)));
 const scopedTasks=tasks.filter(t=>t.company_id===company&&t.status!=="completed"&&(!t.assigned_to||t.assigned_to===user||t.created_by===user));
 const dueTasks=scopedTasks.filter(t=>t.due_date&&t.due_date<=date).sort((a,b)=>String(a.due_date).localeCompare(String(b.due_date)));
 const scopedApprovals=approvals.filter(a=>!a.company_id||a.company_id===company).filter(a=>!["approved","rejected","completed"].includes(String(a.status||a.decision_status||"").toLowerCase()));
 const sections=[
  {title:"Today's Interviews",subtitle:"Scheduled interviews for this workday",items:todays,href:"/app/interviews",action:"Open Interviews",render:i=><><strong>{interviewLabel(i)}</strong><small>{pretty(i.scheduled_at)} · {i.status||"Scheduled"}</small></>},
  {title:"Evaluations to Review",subtitle:"Past interview slots with no visible evaluation; review status before following up",items:overdueEvaluations,href:"/app/interviews",action:"Review Evaluations",render:i=><><strong>{interviewLabel(i)}</strong><small>{pretty(i.scheduled_at)} · Evaluation not found in accessible records</small></>},
  {title:"Tasks Due or Overdue",subtitle:"Outstanding assigned or unassigned work",items:dueTasks,href:"/app/recruitment-operations/tasks",action:"Open Tasks",render:t=><><strong>{t.title}</strong><small>{t.due_date} · {t.priority||"Normal"} priority · {t.status||"To do"}</small></>},
  {title:"Pending Hiring Approvals",subtitle:"Decisions available to your account",items:scopedApprovals,href:"/app/approvals",action:"Open Approval Center",render:a=><><strong>{a.candidate_name||a.job_title||"Hiring decision"}</strong><small>{a.status||a.decision_status||"Review required"}</small></>}
 ];
 return <main className="today"><style>{css}</style><div className="today-layout"><aside className="today-side"><div className="today-brand">✳ Inspire Match<small>HIRE BETTER. INSPIRE MORE.</small></div><ATSNavigation className="today-nav"/></aside><div className="today-main"><header className="today-head"><div><div className="today-eyebrow">RECRUITER WORKSPACE / MOB-01</div><h1>Today at Inspire Match</h1><p className="today-muted">Your interviews, evaluation reminders, recruitment tasks and approvals in one action-focused view.</p></div><button className="today-btn" disabled={loading} onClick={load}>{loading?"Loading...":"↻ Refresh Today"}</button></header>
 {error&&<div className="today-alert" role="alert">{error}</div>}{notice&&<div className="today-alert">{notice}</div>}
 <label className="today-muted" htmlFor="today-company">Workspace </label><select id="today-company" className="today-filter" value={company} onChange={e=>setCompany(e.target.value)}>{companies.map(id=><option key={id} value={id}>Company {id.slice(0,8)}</option>)}</select>
 <section aria-label="Mobile quick actions"><div className="today-eyebrow">MOBILE QUICK ACTIONS</div><div className="today-quick"><Link href="/app/interviews">▤ Interviews & Evaluations</Link><Link href="/app/interviews/kits">▣ Interview Kits</Link><Link href="/app/recruitment-operations/tasks">☑ Recruitment Tasks</Link><Link href="/app/candidates">♙ Candidate Profiles</Link><Link href="/app/approvals">✓ Hiring Approvals</Link><Link href="/app/ai-shortlisting">✦ AI Shortlisting</Link></div></section>
 <div className="today-stats">{sections.map(s=><div className="today-stat" key={s.title}><span>{s.title}</span><strong>{loading?"—":s.items.length}</strong><Link className="today-link" href={s.href}>View details →</Link></div>)}</div>
 <div className="today-grid">{sections.map(s=><section className="today-panel" key={s.title}><h2>{s.title}</h2><p className="today-muted">{s.subtitle}</p>{s.items.slice(0,8).map((item,index)=><div className="today-item" key={item.id||index}><div>{s.render(item)}</div><Link href={s.href} className="today-link">Open →</Link></div>)}{!loading&&!s.items.length&&<p className="today-muted">No items in this section.</p>}{s.items.length>8&&<Link className="today-link" href={s.href}>View all {s.items.length} →</Link>}</section>)}</div>
 <p className="today-muted" style={{marginTop:22}}>This dashboard uses live records visible to your account. Missing evaluations are reminders for review, not confirmed interviewer non-compliance. No actions are taken automatically.</p>
 </div></div></main>;
}
