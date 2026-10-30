"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import {supabase} from "@/lib/supabase";
import ATSNavigation from "@/components/ATSNavigation";
const styles=`
.qc-page{display:block!important;max-width:none!important;width:100%!important;margin:0!important;padding:0!important;min-height:100vh;background:#f5f8f6;color:#214632;font:13px/1.6 Arial,sans-serif}
.qc-page *{box-sizing:border-box}.qc-layout{display:grid;grid-template-columns:252px minmax(0,1fr);min-height:100vh}
.qc-side{background:#fff;border-right:1px solid #e4ede6;padding:27px 14px}
.qc-brand{display:flex;align-items:center;gap:11px;padding:4px 13px 30px;font-size:17px;font-weight:850}
.qc-mark{display:grid;place-items:center;width:36px;height:36px;border-radius:11px;background:#14583e;color:white;font-size:22px}
.qc-brand small{display:block;color:#8a9d8f;letter-spacing:1.5px;font-size:9px}
.qc-nav{display:flex;flex-direction:column;gap:4px}.qc-nav a{display:flex;align-items:center;gap:12px;min-height:40px;padding:10px 12px;border-radius:10px;color:#5d7267;text-decoration:none;font-size:12px;font-weight:700}
.qc-nav a span{width:17px;text-align:center}.qc-nav a:hover,.qc-nav a.active{background:#e5f2e9;color:#145f42}
.qc-main{min-width:0;padding:0 clamp(18px,3.4vw,54px) 65px}.qc-wrap{max-width:1240px;margin:auto}
.qc-top{height:77px;display:flex;justify-content:space-between;align-items:center;gap:12px;border-bottom:1px solid #e5ece7;margin-bottom:30px}
.qc-link{color:#19734c;text-decoration:none;font-weight:800;font-size:12px}
.qc-hero{background:linear-gradient(115deg,#103c2c,#176448 72%,#217755);border-radius:22px;padding:36px 38px;color:#fff;box-shadow:0 12px 32px #134a311a}
.qc-hero small{color:#b7e5cb;letter-spacing:2px;font-size:10px;font-weight:850}.qc-hero h1{font:850 clamp(27px,3vw,36px)/1.2 Arial,sans-serif;color:#fff;margin:13px 0}.qc-hero p{color:#dceee4;font-size:13px;max-width:730px;margin:0}
.qc-controls{display:flex;gap:13px;flex-wrap:wrap;align-items:end;margin:25px 0 18px}.qc-controls label{font-size:11px;font-weight:800;color:#688372}
.qc-input{display:block;margin-top:6px;min-width:150px;padding:11px;border:1px solid #d9e7dc;border-radius:9px;background:#fff;color:#22543b;font:12px Arial}
.qc-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:13px;margin-bottom:17px}
.qc-metric,.qc-panel{background:#fff;border:1px solid #e1ebe4;border-radius:15px;padding:22px;min-width:0}
.qc-metric span{font-size:11px;font-weight:800;color:#708b78}.qc-metric strong{display:block;font-size:29px;color:#19764e;margin:8px 0}.qc-metric small{color:#8a9f8e;font-size:11px}
.qc-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:17px}
.qc-panel h2{font:800 17px Arial,sans-serif;color:#1c4531;margin:0 0 9px}
.qc-desc{color:#809687;font-size:12px;margin:0 0 16px}
.qc-row{display:flex;justify-content:space-between;align-items:center;gap:14px;border-top:1px solid #edf2ee;padding:14px 0}
.qc-row strong{font-size:12px}.qc-row small{display:block;color:#819688;font-size:11px;margin-top:5px}
.qc-tag{display:inline-block;padding:5px 10px;border-radius:30px;background:#e7f3eb;color:#20734b;font-size:10px;font-weight:800;white-space:nowrap}
.qc-tag.warn{background:#fff0dd;color:#986b2a}.qc-tag.bad{background:#ffebe6;color:#a54b37}
.qc-tablewrap{overflow-x:auto}.qc-table{width:100%;border-collapse:collapse;min-width:710px;font-size:12px}
.qc-table th{background:#f7faf8;text-align:left;color:#708b79;font-size:10px;padding:13px}.qc-table td{padding:13px;border-top:1px solid #edf2ee;color:#3d604a}
.qc-error{padding:13px;background:#fff0e6;color:#a6503d;border-radius:9px;margin:14px 0}
.qc-note{font-size:11px;color:#82988a;line-height:1.7;margin-top:16px}
@media(max-width:1040px){.qc-grid{grid-template-columns:1fr}.qc-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:760px){.qc-layout{display:block}.qc-side{padding:13px 16px;border-right:0;border-bottom:1px solid #e4ede6}.qc-brand{padding:0 0 12px}.qc-nav{flex-direction:row;overflow:auto}.qc-nav a{flex:0 0 auto;white-space:nowrap}.qc-main{padding:0 15px 40px}.qc-top{height:60px;margin-bottom:18px}.qc-hero{padding:26px 22px}.qc-panel,.qc-metric{padding:16px}}
`;
const terminal=["hired","rejected","withdrawn"];
export default function RecruitmentQuality(){
 const [companies,setCompanies]=useState([]),[company,setCompany]=useState(""),[jobs,setJobs]=useState([]),[candidates,setCandidates]=useState([]),[tasks,setTasks]=useState([]),[members,setMembers]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(""),[reload,setReload]=useState(0),[filter,setFilter]=useState("all");
 useEffect(()=>{let alive=true;(async()=>{const r=await supabase.auth.getUser();if(!alive)return;if(!r.data?.user){setError("Please sign in.");setLoading(false);return;}const m=await supabase.from("company_members").select("company_id,role").eq("user_id",r.data.user.id);if(!alive)return;if(m.error)setError(m.error.message);else{setCompanies(m.data||[]);setCompany(m.data?.[0]?.company_id||"");}setLoading(false);})();return()=>{alive=false;};},[]);
 useEffect(()=>{if(!company)return;let alive=true;(async()=>{setLoading(true);const r=await Promise.all([supabase.from("jobs").select("id,title,status").eq("company_id",company).limit(3000),supabase.from("candidates").select("id,full_name,status,job_id,created_at").eq("company_id",company).is("deleted_at",null).limit(5000),supabase.from("recruitment_tasks").select("id,title,status,assigned_to,due_date,job_id,priority").eq("company_id",company).limit(5000),supabase.from("company_members").select("user_id,role").eq("company_id",company)]);if(!alive)return;const failed=r.find(x=>x.error);setError(failed?"Some quality data could not load: "+failed.error.message:"");setJobs(r[0].data||[]);setCandidates(r[1].data||[]);setTasks(r[2].data||[]);setMembers(r[3].data||[]);setLoading(false);})();return()=>{alive=false;};},[company,reload]);
 const active=candidates.filter(c=>!terminal.includes(String(c.status||"").toLowerCase()));
 const open=tasks.filter(t=>t.status!=="completed");
 const jobIds=new Set(jobs.map(j=>String(j.id)));
 const jobless=active.filter(c=>!c.job_id);
 const unnamed=active.filter(c=>!String(c.full_name||"").trim());
 const orphaned=active.filter(c=>c.job_id&&!jobIds.has(String(c.job_id)));
 const noOwner=open.filter(t=>!t.assigned_to);
 const noDue=open.filter(t=>!t.due_date);
 const noJob=open.filter(t=>!t.job_id);
 const blocked=open.filter(t=>t.status==="blocked");
 const issues=[
  {kind:"Candidate missing job",items:jobless,route:"/app/candidates",title:x=>x.full_name||"Unnamed candidate",detail:"No linked job",severity:"bad"},
  {kind:"Candidate missing name",items:unnamed,route:"/app/candidates",title:x=>String(x.id).slice(0,8),detail:"Name is empty",severity:"bad"},
  {kind:"Job link not visible",items:orphaned,route:"/app/candidates",title:x=>x.full_name||"Candidate",detail:"Linked job is not visible in current company",severity:"warn"},
  {kind:"Task without owner",items:noOwner,route:"/app/recruitment-operations/tasks",title:x=>x.title||"Recruitment task",detail:"Assign a responsible team member",severity:"warn"},
  {kind:"Task without deadline",items:noDue,route:"/app/recruitment-operations/tasks",title:x=>x.title||"Recruitment task",detail:"Set a due date",severity:"warn"},
  {kind:"Task without job",items:noJob,route:"/app/recruitment-operations/tasks",title:x=>x.title||"Recruitment task",detail:"No linked job; may be intentional",severity:"warn"},
  {kind:"Blocked task",items:blocked,route:"/app/recruitment-operations/tasks",title:x=>x.title||"Recruitment task",detail:"Review blocker and next action",severity:"warn"}
 ];
 const queue=issues.flatMap(g=>g.items.map(x=>({...x,kind:g.kind,title:g.title(x),detail:g.detail,severity:g.severity,route:g.route})));
 const displayed=queue.filter(x=>filter==="all"||x.kind===filter).slice(0,150);
 const records=active.length+open.length;
 const candidatesWithIssues=new Set([...jobless,...unnamed,...orphaned].map(c=>c.id));
 const tasksWithIssues=new Set([...noOwner,...noDue,...noJob,...blocked].map(t=>t.id));
 const flagged=candidatesWithIssues.size+tasksWithIssues.size;
 const clean=records?Math.round(100*(records-flagged)/records):null;
 const jobTitle=id=>jobs.find(j=>String(j.id)===String(id))?.title||"—";
 return <main className="qc-page"><style>{styles}</style><div className="qc-layout">
  <aside className="qc-side"><div className="qc-brand"><span className="qc-mark">I</span><div>Inspire Match<small>TALENT INTELLIGENCE</small></div></div><ATSNavigation className="qc-nav"/></aside>
  <div className="qc-main"><div className="qc-wrap">
   <div className="qc-top"><span style={{color:"#778d7e",fontSize:12}}>Workspace / <strong style={{color:"#176144"}}>Recruitment Operations</strong> / Quality &amp; Compliance</span><Link className="qc-link" href="/app/recruitment-operations">← All Operations</Link></div>
   <header className="qc-hero"><small>RECRUITMENT OPERATIONS / DATA QUALITY</small><h1>Recruitment Quality &amp; Compliance Hub</h1><p>Identify incomplete recruitment records, missing ownership and workflow exceptions before they create reporting or delivery risks.</p></header>
   <div className="qc-controls"><label>Company<select className="qc-input" value={company} onChange={e=>setCompany(e.target.value)}>{companies.map(c=><option key={c.company_id} value={c.company_id}>Company {String(c.company_id).slice(0,8)}</option>)}</select></label><label>Quality issue<select className="qc-input" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All issues</option>{issues.map(g=><option key={g.kind} value={g.kind}>{g.kind}</option>)}</select></label><button className="qc-input" style={{cursor:"pointer",fontWeight:800}} onClick={()=>setReload(n=>n+1)} disabled={loading}>↻ Refresh</button></div>
   {error&&<div className="qc-error" role="alert">{error}</div>}
   <div className="qc-metrics">{[["Data Readiness",clean===null?"N/A":clean+"%","Records without selected quality flags"],["Flagged Records",flagged,"Unique candidate and task records"],["Candidate Gaps",candidatesWithIssues.size,"Active candidate records with flags"],["Task Gaps",tasksWithIssues.size,"Open tasks with flags"]].map(([name,value,desc])=><div className="qc-metric" key={name}><span>{name}</span><strong>{loading?"—":value}</strong><small>{desc}</small></div>)}</div>
   <div className="qc-grid">
    <section className="qc-panel"><h2>Candidate Record Quality</h2><p className="qc-desc">Visible active candidate records only.</p>{[["No job assignment",jobless.length],["Missing candidate name",unnamed.length],["Job not visible",orphaned.length],["Total active candidates",active.length]].map(([name,value])=><div className="qc-row" key={name}><strong>{name}</strong><span className={"qc-tag "+(value&&name!=="Total active candidates"?"warn":"")}>{value}</span></div>)}<Link className="qc-link" href="/app/candidates">Review Candidates →</Link></section>
    <section className="qc-panel"><h2>Task Workflow Quality</h2><p className="qc-desc">Operational checks across open recruitment tasks.</p>{[["Missing owner",noOwner.length],["Missing deadline",noDue.length],["No linked job",noJob.length],["Blocked tasks",blocked.length],["Open tasks",open.length]].map(([name,value])=><div className="qc-row" key={name}><strong>{name}</strong><span className={"qc-tag "+(value&&name!=="Open tasks"?"warn":"")}>{value}</span></div>)}<Link className="qc-link" href="/app/recruitment-operations/tasks">Review Tasks →</Link></section>
   </div>
   <section className="qc-panel"><div style={{display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}><div><h2>Quality Exceptions Queue</h2><p className="qc-desc">Prioritized record-level exceptions and recommended corrections.</p></div><span className="qc-tag">{queue.length} issue signals</span></div>
    <div className="qc-tablewrap"><table className="qc-table"><thead><tr>{["Issue","Record","Related Job","Recommended Action","Review"].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{displayed.map((x,i)=><tr key={x.kind+String(x.id)+i}><td><span className={"qc-tag "+x.severity}>{x.kind}</span></td><td><strong>{x.title}</strong></td><td>{jobTitle(x.job_id)}</td><td>{x.detail}</td><td><Link className="qc-link" href={x.route}>Review →</Link></td></tr>)}</tbody></table></div>
    {!displayed.length&&<p className="qc-desc" style={{marginTop:20}}>No exceptions match the selected filter.</p>}
    <p className="qc-note">These are operational data-quality checks, not legal or regulatory compliance certifications. Some records (such as general tasks without a linked job) may be intentionally incomplete. The score covers only accessible active candidates and open tasks, and multiple flags on one record count once. The module does not modify records or create automatic enforcement policies.</p>
   </section>
  </div></div>
 </div></main>;
}
