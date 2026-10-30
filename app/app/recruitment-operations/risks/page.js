"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import {supabase} from "@/lib/supabase";
import ATSNavigation from "@/components/ATSNavigation";
const styles=`
.rw-page{display:block!important;max-width:none!important;width:100%!important;margin:0!important;padding:0!important;min-height:100vh;background:#f5f8f6;color:#214632;font:13px/1.6 Arial,sans-serif}
.rw-page *{box-sizing:border-box}.rw-layout{display:grid;grid-template-columns:252px minmax(0,1fr);min-height:100vh}
.rw-side{background:#fff;border-right:1px solid #e4ede6;padding:27px 14px}
.rw-brand{display:flex;align-items:center;gap:11px;padding:4px 13px 30px;font-size:17px;font-weight:850}
.rw-mark{display:grid;place-items:center;width:36px;height:36px;border-radius:11px;background:#14583e;color:white;font-size:22px}
.rw-brand small{display:block;color:#8a9d8f;letter-spacing:1.5px;font-size:9px}
.rw-nav{display:flex;flex-direction:column;gap:4px}.rw-nav a{display:flex;align-items:center;gap:12px;min-height:40px;padding:10px 12px;border-radius:10px;color:#5d7267;text-decoration:none;font-size:12px;font-weight:700}
.rw-nav a span{width:17px;text-align:center}.rw-nav a:hover,.rw-nav a.active{background:#e5f2e9;color:#145f42}
.rw-main{min-width:0;padding:0 clamp(18px,3.4vw,54px) 65px}.rw-wrap{max-width:1240px;margin:auto}
.rw-top{height:77px;display:flex;justify-content:space-between;align-items:center;gap:12px;border-bottom:1px solid #e5ece7;margin-bottom:30px}
.rw-link{color:#19734c;text-decoration:none;font-weight:800;font-size:12px}
.rw-hero{background:linear-gradient(115deg,#103c2c,#176448 72%,#217755);border-radius:22px;padding:36px 38px;color:#fff;box-shadow:0 12px 32px #134a311a}
.rw-hero small{color:#b7e5cb;letter-spacing:2px;font-size:10px;font-weight:850}.rw-hero h1{font:850 clamp(27px,3vw,36px)/1.2 Arial,sans-serif;color:#fff;margin:13px 0}.rw-hero p{color:#dceee4;font-size:13px;max-width:730px;margin:0}
.rw-controls{display:flex;gap:13px;flex-wrap:wrap;align-items:end;margin:25px 0 18px}.rw-controls label{font-size:11px;font-weight:800;color:#688372}
.rw-input{display:block;margin-top:6px;min-width:150px;padding:11px;border:1px solid #d9e7dc;border-radius:9px;background:#fff;color:#22543b;font:12px Arial}
.rw-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:13px;margin-bottom:17px}
.rw-metric,.rw-panel{background:#fff;border:1px solid #e1ebe4;border-radius:15px;padding:22px;min-width:0}
.rw-metric span{font-size:11px;font-weight:800;color:#708b78}.rw-metric strong{display:block;font-size:29px;color:#19764e;margin:8px 0}.rw-metric small{color:#8a9f8e;font-size:11px}
.rw-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:17px}
.rw-panel h2{font:800 17px Arial,sans-serif;color:#1c4531;margin:0 0 9px}
.rw-desc{color:#809687;font-size:12px;margin:0 0 16px}
.rw-row{display:flex;justify-content:space-between;align-items:center;gap:14px;border-top:1px solid #edf2ee;padding:14px 0}
.rw-row strong{font-size:12px}.rw-row small{display:block;color:#819688;font-size:11px;margin-top:5px}
.rw-tag{display:inline-block;padding:5px 10px;border-radius:30px;background:#e7f3eb;color:#20734b;font-size:10px;font-weight:800;white-space:nowrap}
.rw-tag.warn{background:#fff0dd;color:#986b2a}.rw-tag.bad{background:#ffebe6;color:#a54b37}
.rw-tablewrap{overflow-x:auto}.rw-table{width:100%;border-collapse:collapse;min-width:710px;font-size:12px}
.rw-table th{background:#f7faf8;text-align:left;color:#708b79;font-size:10px;padding:13px}.rw-table td{padding:13px;border-top:1px solid #edf2ee;color:#3d604a}
.rw-error{padding:13px;background:#fff0e6;color:#a6503d;border-radius:9px;margin:14px 0}
.rw-note{font-size:11px;color:#82988a;line-height:1.7;margin-top:16px}
@media(max-width:1040px){.rw-grid{grid-template-columns:1fr}.rw-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:760px){.rw-layout{display:block}.rw-side{padding:13px 16px;border-right:0;border-bottom:1px solid #e4ede6}.rw-brand{padding:0 0 12px}.rw-nav{flex-direction:row;overflow:auto}.rw-nav a{flex:0 0 auto;white-space:nowrap}.rw-main{padding:0 15px 40px}.rw-top{height:60px;margin-bottom:18px}.rw-hero{padding:26px 22px}.rw-panel,.rw-metric{padding:16px}}

.rw-progress{height:8px;background:#eaf1ec;border-radius:99px;overflow:hidden;min-width:80px}
.rw-progress span{display:block;height:100%;background:linear-gradient(90deg,#69ad82,#21714a);border-radius:99px}
.rw-progress .rw-danger{background:linear-gradient(90deg,#e0a16d,#c76149)}
.rw-actions{display:flex;gap:9px;flex-wrap:wrap;margin:16px 0}
.rw-pill{display:inline-block;border:1px solid #e0eae3;background:#f7faf8;border-radius:30px;padding:6px 11px;font-size:11px;font-weight:750;color:#46725a}
.rw-grid3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:13px;margin-bottom:17px}
.rw-riskbar{width:100%;height:9px;background:#e9f1eb;border-radius:99px;overflow:hidden}
.rw-riskbar span{display:block;height:100%;border-radius:99px;background:#218054}
.rw-riskbar span.rw-bad{background:#c75e49}
.rw-riskbar span.rw-warn{background:#d7a052}
.rw-checks{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:10px 0}
.rw-check{padding:10px 13px;border-radius:10px;background:#f5f9f6;color:#3d6750;font-size:11px}
.rw-check strong{display:block;margin-top:3px;font-size:12px;color:#204a34}
.rw-noaccess{padding:24px;background:#fff;border:1px solid #e1ebe4;border-radius:15px;color:#687e70;margin-top:18px}
.rw-muted{font-size:11px;color:#809587}
.rw-table td{vertical-align:middle}
.rw-controls button:disabled{opacity:.55;cursor:not-allowed}
@media(max-width:1040px){.rw-grid3{grid-template-columns:1fr 1fr}}
@media(max-width:760px){.rw-grid3,.rw-checks{grid-template-columns:1fr}}
`;

const HOUR=60*60*1000;
const DAY=24*HOUR;
const isActiveJob=j=>!["closed","paused","archived","cancelled","canceled"].includes(String(j.status||"active").toLowerCase());
const isActiveCandidate=c=>!["hired","rejected","withdrawn","archived"].includes(String(c.status||"").toLowerCase());
const remainingDays=(date,now)=>{
 if(!date)return null;
 const p=String(date).slice(0,10);
 const parsed=new Date(p+"T00:00:00");
 if(!Number.isFinite(parsed.getTime()))return null;
 const midnight=new Date(now.getFullYear(),now.getMonth(),now.getDate());
 return Math.round((parsed-midnight)/DAY);
};
const elapsedDays=(date,now)=>{
 const n=Date.parse(date||"");
 return Number.isFinite(n)?Math.max(0,Math.floor((now.getTime()-n)/DAY)):null;
};
const csvCell=value=>{
 const s=String(value??"");
 const safe=/^[=+\-@\t\r]/.test(s)?"'"+s:s;
 return '"'+safe.replaceAll('"','""')+'"';
};
function evaluateJob(job,all,lookback,horizon,now){
 const matching=(list)=>list.filter(x=>String(x.job_id)===String(job.id));
 const candidates=matching(all.candidates);
 const applications=matching(all.applications);
 const tasks=matching(all.tasks).filter(t=>String(t.status).toLowerCase()!=="completed");
 const jobAge=elapsedDays(job.created_at,now);
 const pastWindow=jobAge!==null&&jobAge>=lookback;
 const latestCandidate=candidates.reduce((a,c)=>Math.max(a,Date.parse(c.created_at||"")||0),0);
 const hasRecent=candidates.some(c=>{const ms=Date.parse(c.created_at||"");return Number.isFinite(ms)&&ms<=now.getTime()&&ms>=now.getTime()-lookback*DAY;});
 const liveCandidates=candidates.filter(isActiveCandidate);
 const overdue=tasks.filter(t=>{const n=remainingDays(t.due_date,now);return n!==null&&n<0;});
 const upcoming=tasks.filter(t=>{const n=remainingDays(t.due_date,now);return n!==null&&n>=0&&n<=horizon;});
 const blocked=tasks.filter(t=>String(t.status).toLowerCase()==="blocked");
 const appIds=new Set(applications.map(a=>String(a.id)));
 const interviews=all.interviews.filter(i=>appIds.has(String(i.application_id)));
 const pastInterviews=interviews.filter(i=>String(i.status).toLowerCase()==="scheduled"&&Number.isFinite(Date.parse(i.scheduled_at||""))&&Date.parse(i.scheduled_at)<now.getTime());
 const futureInterviews=interviews.filter(i=>String(i.status).toLowerCase()==="scheduled"&&Number.isFinite(Date.parse(i.scheduled_at||""))&&Date.parse(i.scheduled_at)>=now.getTime());
 const requiresInterview=applications.some(a=>["interview","shortlisted"].includes(String(a.stage||"").toLowerCase()));
 const issues=[];
 const signal=(points,label,action,href)=>issues.push({points,label,action,href});
 if(pastWindow&&candidates.length===0)signal(30,"No candidates after "+lookback+" days","Review sourcing plan and outreach","/app/jobs");
 else if(pastWindow&&!hasRecent)signal(18,"No new candidate records in "+lookback+" days","Refresh sourcing channels","/app/candidates");
 if(pastWindow&&candidates.length>0&&liveCandidates.length===0)signal(16,"No active candidates","Rebuild shortlist or reopen pipeline","/app/pipeline");
 else if(pastWindow&&candidates.length>0&&liveCandidates.length<2)signal(10,"Limited active candidate coverage","Develop backup candidates","/app/pipeline");
 if(overdue.length)signal(25,"Overdue tasks: "+overdue.length,"Resolve missed commitments","/app/recruitment-operations/tasks");
 if(upcoming.length)signal(12,"Due within "+horizon+" days: "+upcoming.length,"Prepare deadline follow-up","/app/recruitment-operations/tasks");
 if(blocked.length)signal(18,"Blocked tasks: "+blocked.length,"Escalate blockers to task owners","/app/recruitment-operations/tasks");
 if(pastInterviews.length)signal(20,"Past-due scheduled interviews: "+pastInterviews.length,"Update interview status or reschedule","/app/interviews");
 if(pastWindow&&requiresInterview&&!futureInterviews.length)signal(10,"No upcoming interviews for advanced pipeline","Review scheduling coverage","/app/interviews");
 const score=Math.min(100,issues.reduce((sum,i)=>sum+i.points,0));
 const level=score>=70?"critical":score>=45?"high":score>=20?"watch":"healthy";
 return {job,score,level,issues,counts:{candidates:candidates.length,active:liveCandidates.length,overdue:overdue.length,upcoming:upcoming.length,blocked:blocked.length,interviews:interviews.length},jobAge,latestCandidate};
}
function RiskBoard(){
 const [companies,setCompanies]=useState([]),[company,setCompany]=useState("");
 const [dataset,setDataset]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState("");
 const [lookback,setLookback]=useState(14),[horizon,setHorizon]=useState(7),[filter,setFilter]=useState("all"),[reload,setReload]=useState(0);
 useEffect(()=>{
  let alive=true;
  (async()=>{
   const auth=await supabase.auth.getUser();
   if(!alive)return;
   if(!auth.data?.user){setError("Please sign in to access your recruitment risks.");setLoading(false);return;}
   const r=await supabase.from("company_members").select("company_id,role").eq("user_id",auth.data.user.id);
   if(!alive)return;
   if(r.error)setError("Could not verify company access: "+r.error.message);
   else {setCompanies(r.data||[]);setCompany(r.data?.[0]?.company_id||"");}
   setLoading(false);
  })();
  return ()=>{alive=false;};
 },[]);
 useEffect(()=>{
  if(!company){setDataset(null);return;}
  let alive=true;
  setLoading(true);setError("");setDataset(null);
  (async()=>{
   const queries=[
    supabase.from("jobs").select("id,title,status,created_at").eq("company_id",company).order("created_at",{ascending:false}).limit(2000),
    supabase.from("candidates").select("id,job_id,status,created_at").eq("company_id",company).is("deleted_at",null).limit(5000),
    supabase.from("applications").select("id,job_id,stage").eq("company_id",company).limit(5000),
    supabase.from("interviews").select("id,application_id,scheduled_at,status").eq("company_id",company).limit(5000),
    supabase.from("recruitment_tasks").select("id,job_id,status,due_date,assigned_to,priority").eq("company_id",company).limit(5000)
   ];
   const results=await Promise.all(queries);
   if(!alive)return;
   const names=["jobs","candidates","applications","interviews","tasks"];
   const failures=results.map((r,i)=>r.error?names[i]+": "+r.error.message:null).filter(Boolean);
   if(failures.length){setError("Risk dashboard cannot calculate reliably: "+failures.join("; "));setDataset(null);}
   else setDataset({jobs:results[0].data||[],candidates:results[1].data||[],applications:results[2].data||[],interviews:results[3].data||[],tasks:results[4].data||[],capped:results.some((r,i)=>(r.data||[]).length>=[2000,5000,5000,5000,5000][i])});
   setLoading(false);
  })();
  return()=>{alive=false;};
 },[company,reload]);
 const now=new Date();
 const assessments=dataset?dataset.jobs.filter(isActiveJob).map(j=>evaluateJob(j,dataset,lookback,horizon,now)).sort((a,b)=>b.score-a.score||(b.counts.overdue-a.counts.overdue)): [];
 const critical=assessments.filter(r=>r.level==="critical");
 const high=assessments.filter(r=>r.level==="high");
 const watch=assessments.filter(r=>r.level==="watch");
 const stable=assessments.filter(r=>r.level==="healthy");
 const actionable=assessments.filter(r=>r.issues.length>0);
 const visible=assessments.filter(r=>filter==="all"||r.level===filter);
 const top=assessments.slice(0,5);
 const exportCsv=()=>{
  if(!dataset)return;
  const rows=[
   ["Job","Risk Score","Risk Level","Active Candidates","Overdue Tasks","Due Soon","Blocked Tasks","Risk Signals","Recommended First Action"],
   ...assessments.map(r=>[r.job.title||"Untitled job",r.score,r.level,r.counts.active,r.counts.overdue,r.counts.upcoming,r.counts.blocked,r.issues.map(i=>i.label).join("; "),r.issues[0]?.action||"Continue monitoring"])
  ];
  const csv="\uFEFF"+rows.map(r=>r.map(csvCell).join(",")).join("\r\n");
  const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));
  const a=document.createElement("a");a.href=url;a.download="inspire-match-job-risk.csv";a.click();URL.revokeObjectURL(url);
 };
 return <main className="rw-page"><style>{styles}</style><div className="rw-layout">
   <aside className="rw-side"><div className="rw-brand"><span className="rw-mark">I</span><div>Inspire Match<small>TALENT INTELLIGENCE</small></div></div><ATSNavigation className="rw-nav"/></aside>
   <div className="rw-main"><div className="rw-wrap">
    <div className="rw-top"><span style={{color:"#778d7e",fontSize:12}}>Workspace / <strong style={{color:"#176144"}}>Recruitment Operations</strong> / Risk Center</span><Link className="rw-link" href="/app/recruitment-operations">← All Operations</Link></div>
    <header className="rw-hero"><small>RECRUITMENT OPERATIONS / EARLY WARNINGS</small><h1>Recruitment Risk &amp; Early Warning Center</h1><p>Spot jobs likely to need intervention by combining sourcing momentum, pipeline coverage, blocked work, upcoming deadlines and interview scheduling signals.</p></header>
    <div className="rw-controls">
     <label>Company<select className="rw-input" value={company} onChange={e=>setCompany(e.target.value)}>{companies.map(c=><option key={c.company_id} value={c.company_id}>Company {String(c.company_id).slice(0,8)}</option>)}</select></label>
     <label>New-candidate lookback<select className="rw-input" value={lookback} onChange={e=>setLookback(Number(e.target.value))}>{[7,14,21,30].map(n=><option key={n} value={n}>{n} days</option>)}</select></label>
     <label>Deadline lookahead<select className="rw-input" value={horizon} onChange={e=>setHorizon(Number(e.target.value))}>{[3,7,14].map(n=><option key={n} value={n}>{n} days</option>)}</select></label>
     <label>Risk level<select className="rw-input" value={filter} onChange={e=>setFilter(e.target.value)}>{[["all","All jobs"],["critical","Critical"],["high","High"],["watch","Watch"],["healthy","On track"]].map(([v,t])=><option key={v} value={v}>{t}</option>)}</select></label>
     <button className="rw-input" onClick={()=>setReload(n=>n+1)} disabled={!company||loading} style={{cursor:"pointer",fontWeight:800}}>↻ Refresh</button>
     <button className="rw-input" onClick={exportCsv} disabled={!dataset||loading} style={{cursor:"pointer",fontWeight:800,color:"#176b49"}}>↓ Export Risk Report</button>
    </div>
    {error&&<div className="rw-error" role="alert">{error}</div>}
    {!company&&!loading&&!error&&<div className="rw-noaccess">No company membership was found for this account.</div>}
    <div className="rw-metrics">
      {[["Active Jobs",assessments.length,"Jobs currently in progress"],["Critical / High",critical.length+high.length,"Prioritize immediate review"],["On Watch",watch.length,"Potential emerging risks"],["On Track",stable.length,"No major risk signals"]].map(([label,value,desc])=><div className="rw-metric" key={label}><span>{label}</span><strong>{loading||!dataset?"—":value}</strong><small>{desc}</small></div>)}
    </div>
    <div className="rw-grid">
     <section className="rw-panel">
      <h2>Risk Distribution</h2><p className="rw-desc">Percentage of active jobs in each risk band.</p>
      {[[ "Critical",critical.length,"bad"],["High",high.length,"bad"],["Watch",watch.length,"warn"],["On Track",stable.length,""]].map(([label,num,cls])=><div key={label} style={{padding:"11px 0",borderTop:"1px solid #edf2ee"}}>
       <div style={{display:"flex",justifyContent:"space-between",marginBottom:7}}><strong>{label}</strong><span className={"rw-tag "+cls}>{num}</span></div>
       <div className="rw-riskbar"><span className={cls==="bad"?"rw-bad":cls==="warn"?"rw-warn":""} style={{width:(assessments.length?num/assessments.length*100:0)+"%"}}/></div>
      </div>)}
      <p className="rw-note">Scores are transparent, rules-based indicators, not machine-learning predictions or probabilities of hiring failure.</p>
     </section>
     <section className="rw-panel"><h2>Priority Signals</h2><p className="rw-desc">Five highest-risk active jobs with their leading signal.</p>
       {top.map(r=><div key={String(r.job.id)} className="rw-row"><div style={{minWidth:0}}><strong>{r.job.title||"Untitled job"}</strong><small>{r.issues[0]?.label||"No major risk signals"}</small></div><span className={"rw-tag "+(r.score>=45?"bad":r.score>=20?"warn":"")}>{r.score}/100</span></div>)}
       {!top.length&&<p className="rw-desc">No active jobs to assess.</p>}
       <Link className="rw-link" href="/app/jobs">View Job Management →</Link>
     </section>
    </div>
    <section className="rw-panel" style={{marginBottom:17}}>
     <div style={{display:"flex",justifyContent:"space-between",gap:14,flexWrap:"wrap"}}>
      <div><h2>Job Risk Watchlist</h2><p className="rw-desc">Ranked across jobs, with the evidence, score and first recommended intervention.</p></div>
      <span className="rw-tag">{visible.length} jobs shown</span>
     </div>
     <div className="rw-tablewrap"><table className="rw-table"><thead><tr>{["Job","Risk Score","Level","Active Pipeline","Open Commitments","Primary Signal","Recommended Action"].map(x=><th key={x}>{x}</th>)}</tr></thead>
      <tbody>{visible.slice(0,100).map(r=><tr key={String(r.job.id)}>
        <td><strong>{r.job.title||"Untitled job"}</strong><div className="rw-muted">{r.jobAge===null?"Age unknown":r.jobAge+" days old"}</div></td>
        <td style={{minWidth:105}}><strong>{r.score}/100</strong><div className="rw-progress"><span className={r.score>=45?"rw-danger":""} style={{width:r.score+"%"}}/></div></td>
        <td><span className={"rw-tag "+(r.score>=45?"bad":r.score>=20?"warn":"")}>{r.level==="healthy"?"On track":r.level}</span></td>
        <td>{r.counts.active} / {r.counts.candidates} candidates</td>
        <td>{r.counts.overdue} late · {r.counts.upcoming} due soon</td>
        <td>{r.issues[0]?.label||"No current warning"}</td>
        <td><Link className="rw-link" href={r.issues[0]?.href||"/app/jobs"}>{r.issues[0]?.action||"Continue monitoring"} →</Link></td>
      </tr>)}</tbody>
     </table></div>
     {!visible.length&&<p className="rw-desc" style={{marginTop:20}}>No active jobs match this filter.</p>}
     {visible.length>100&&<p className="rw-note">Only the first 100 jobs are displayed. CSV export includes all assessed active jobs.</p>}
    </section>
    <section className="rw-panel"><h2>Risk Scoring Method</h2><p className="rw-desc">Each job starts at zero. Independent signals add points, with a maximum of 100. Adjust the windows above to run a different planning scenario.</p>
     <div className="rw-checks">{[
      ["Pipeline coverage","No candidates after lookback: +30; inactive/limited candidate coverage: +10–16"],
      ["Sourcing momentum","No new candidate records during lookback: +18"],
      ["Task commitment","Overdue: +25; due soon: +12; blocked: +18"],
      ["Interview continuity","Past-due scheduled interviews: +20; no upcoming interviews for advanced pipeline: +10"]
     ].map(([a,b])=><div className="rw-check" key={a}><strong>{a}</strong>{b}</div>)}</div>
     <div className="rw-actions"><span className="rw-pill">70–100 Critical</span><span className="rw-pill">45–69 High</span><span className="rw-pill">20–44 Watch</span><span className="rw-pill">0–19 On track</span></div>
     {dataset?.capped&&<div className="rw-error">One or more query limits were reached. Counts and risk scores may be incomplete for this company.</div>}
     <p className="rw-note">This page is a live, read-only operational assessment using records visible to your company account. Candidate creation dates measure incoming candidate records, not last stage movement. No automatic notifications, actual risk probabilities, or persisted interventions are implied.</p>
    </section>
   </div></div>
 </div></main>;
}
export default RiskBoard;
