"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import {supabase} from "@/lib/supabase";
import ATSNavigation from "@/components/ATSNavigation";
const styles=`
.ce-page{display:block!important;max-width:none!important;width:100%!important;margin:0!important;padding:0!important;min-height:100vh;background:#f5f8f6;color:#214632;font:13px/1.6 Arial,sans-serif}
.ce-page *{box-sizing:border-box}.ce-layout{display:grid;grid-template-columns:252px minmax(0,1fr);min-height:100vh}
.ce-side{background:#fff;border-right:1px solid #e4ede6;padding:27px 14px}
.ce-brand{display:flex;align-items:center;gap:11px;padding:4px 13px 30px;font-size:17px;font-weight:850}
.ce-mark{display:grid;place-items:center;width:36px;height:36px;border-radius:11px;background:#14583e;color:white;font-size:22px}
.ce-brand small{display:block;color:#8a9d8f;letter-spacing:1.5px;font-size:9px}
.ce-nav{display:flex;flex-direction:column;gap:4px}.ce-nav a{display:flex;align-items:center;gap:12px;min-height:40px;padding:10px 12px;border-radius:10px;color:#5d7267;text-decoration:none;font-size:12px;font-weight:700}
.ce-nav a span{width:17px;text-align:center}.ce-nav a:hover,.ce-nav a.active{background:#e5f2e9;color:#145f42}
.ce-main{min-width:0;padding:0 clamp(18px,3.4vw,54px) 65px}.ce-wrap{max-width:1240px;margin:auto}
.ce-top{height:77px;display:flex;justify-content:space-between;align-items:center;gap:12px;border-bottom:1px solid #e5ece7;margin-bottom:30px}
.ce-link{color:#19734c;text-decoration:none;font-weight:800;font-size:12px}
.ce-hero{background:linear-gradient(115deg,#103c2c,#176448 72%,#217755);border-radius:22px;padding:36px 38px;color:#fff;box-shadow:0 12px 32px #134a311a}
.ce-hero small{color:#b7e5cb;letter-spacing:2px;font-size:10px;font-weight:850}.ce-hero h1{font:850 clamp(27px,3vw,36px)/1.2 Arial,sans-serif;color:#fff;margin:13px 0}.ce-hero p{color:#dceee4;font-size:13px;max-width:730px;margin:0}
.ce-controls{display:flex;gap:13px;flex-wrap:wrap;align-items:end;margin:25px 0 18px}.ce-controls label{font-size:11px;font-weight:800;color:#688372}
.ce-input{display:block;margin-top:6px;min-width:150px;padding:11px;border:1px solid #d9e7dc;border-radius:9px;background:#fff;color:#22543b;font:12px Arial}
.ce-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:13px;margin-bottom:17px}
.ce-metric,.ce-panel{background:#fff;border:1px solid #e1ebe4;border-radius:15px;padding:22px;min-width:0}
.ce-metric span{font-size:11px;font-weight:800;color:#708b78}.ce-metric strong{display:block;font-size:29px;color:#19764e;margin:8px 0}.ce-metric small{color:#8a9f8e;font-size:11px}
.ce-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:17px}
.ce-panel h2{font:800 17px Arial,sans-serif;color:#1c4531;margin:0 0 9px}
.ce-desc{color:#809687;font-size:12px;margin:0 0 16px}
.ce-row{display:flex;justify-content:space-between;align-items:center;gap:14px;border-top:1px solid #edf2ee;padding:14px 0}
.ce-row strong{font-size:12px}.ce-row small{display:block;color:#819688;font-size:11px;margin-top:5px}
.ce-tag{display:inline-block;padding:5px 10px;border-radius:30px;background:#e7f3eb;color:#20734b;font-size:10px;font-weight:800;white-space:nowrap}
.ce-tag.warn{background:#fff0dd;color:#986b2a}.ce-tag.bad{background:#ffebe6;color:#a54b37}
.ce-tablewrap{overflow-x:auto}.ce-table{width:100%;border-collapse:collapse;min-width:710px;font-size:12px}
.ce-table th{background:#f7faf8;text-align:left;color:#708b79;font-size:10px;padding:13px}.ce-table td{padding:13px;border-top:1px solid #edf2ee;color:#3d604a}
.ce-error{padding:13px;background:#fff0e6;color:#a6503d;border-radius:9px;margin:14px 0}
.ce-note{font-size:11px;color:#82988a;line-height:1.7;margin-top:16px}
@media(max-width:1040px){.ce-grid{grid-template-columns:1fr}.ce-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:760px){.ce-layout{display:block}.ce-side{padding:13px 16px;border-right:0;border-bottom:1px solid #e4ede6}.ce-brand{padding:0 0 12px}.ce-nav{flex-direction:row;overflow:auto}.ce-nav a{flex:0 0 auto;white-space:nowrap}.ce-main{padding:0 15px 40px}.ce-top{height:60px;margin-bottom:18px}.ce-hero{padding:26px 22px}.ce-panel,.ce-metric{padding:16px}}

.ce-pill{padding:6px 10px;border-radius:99px;background:#edf6ef;color:#216844;font-size:10px;font-weight:800}
.ce-heat{height:9px;background:#eaf1ec;border-radius:99px;overflow:hidden;margin-top:7px}
.ce-heat span{display:block;height:100%;background:#278254;border-radius:99px}
.ce-heat span.ce-alert{background:#d99a50}
.ce-btn{cursor:pointer;font-weight:800}
.ce-btn:disabled{opacity:.5;cursor:not-allowed}
`;

const day=86400000;
const age=(date,now)=>{const t=Date.parse(date||"");return Number.isFinite(t)?Math.max(0,Math.floor((now-t)/day)):null;};
const terminal=new Set(["hired","rejected","withdrawn"]);
const csv=x=>{const s=String(x??"");return '"'+(/^[=+\-@\t\r]/.test(s)?"'"+s:s).replaceAll('"','""')+'"';};
export default function CandidateExperience(){
 const [companies,setCompanies]=useState([]),[company,setCompany]=useState(""),[data,setData]=useState(null),[error,setError]=useState(""),[loading,setLoading]=useState(true),[windowDays,setWindowDays]=useState(7),[filter,setFilter]=useState("all"),[reload,setReload]=useState(0);
 useEffect(()=>{let alive=true;(async()=>{const auth=await supabase.auth.getUser();if(!alive)return;if(!auth.data?.user){setError("Please sign in.");setLoading(false);return;}const r=await supabase.from("company_members").select("company_id").eq("user_id",auth.data.user.id);if(!alive)return;if(r.error)setError(r.error.message);else{setCompanies(r.data||[]);setCompany(r.data?.[0]?.company_id||"");}setLoading(false);})();return()=>{alive=false;};},[]);
 useEffect(()=>{if(!company){setData(null);return;}let alive=true;setLoading(true);setData(null);setError("");(async()=>{
  const rs=await Promise.all([
   supabase.from("candidates").select("id,full_name,status,created_at,job_id,email").eq("company_id",company).is("deleted_at",null).limit(5000),
   supabase.from("jobs").select("id,title").eq("company_id",company).limit(1500),
   supabase.from("applications").select("id,candidate_id,job_id,stage").eq("company_id",company).limit(5000),
   supabase.from("interviews").select("id,application_id,status,scheduled_at").eq("company_id",company).limit(5000),
   supabase.from("recruitment_tasks").select("id,title,candidate_id,status,due_date,priority").eq("company_id",company).limit(5000)
  ]);if(!alive)return;const names=["candidates","jobs","applications","interviews","tasks"];const failed=rs.map((r,i)=>r.error?names[i]+": "+r.error.message:null).filter(Boolean);
  if(failed.length)setError("Unable to load candidate experience indicators: "+failed.join("; "));
  else setData({...Object.fromEntries(rs.map((r,i)=>[names[i],r.data||[]])),capped:rs.some((r,i)=>(r.data||[]).length>=[5000,1500,5000,5000,5000][i])});
  setLoading(false);
 })();return()=>{alive=false;};},[company,reload]);
 const now=new Date();
 const jobNames=new Map((data?.jobs||[]).map(j=>[String(j.id),j.title]));
 const appsByCandidate=new Map();(data?.applications||[]).forEach(a=>{const k=String(a.candidate_id);if(!appsByCandidate.has(k))appsByCandidate.set(k,[]);appsByCandidate.get(k).push(a);});
 const interviewsByApp=new Map();(data?.interviews||[]).forEach(i=>{const k=String(i.application_id);if(!interviewsByApp.has(k))interviewsByApp.set(k,[]);interviewsByApp.get(k).push(i);});
 const tasksByCandidate=new Map();(data?.tasks||[]).forEach(t=>{const k=String(t.candidate_id);if(!tasksByCandidate.has(k))tasksByCandidate.set(k,[]);tasksByCandidate.get(k).push(t);});
 const rows=(data?.candidates||[]).filter(c=>!terminal.has(String(c.status||"").toLowerCase())).map(c=>{
  const apps=appsByCandidate.get(String(c.id))||[];
  const interviews=apps.flatMap(a=>interviewsByApp.get(String(a.id))||[]);
  const tasks=(tasksByCandidate.get(String(c.id))||[]).filter(t=>String(t.status).toLowerCase()!=="completed");
  const old=age(c.created_at,now);
  const pastInterviews=interviews.filter(i=>String(i.status).toLowerCase()==="scheduled"&&Number.isFinite(Date.parse(i.scheduled_at||""))&&Date.parse(i.scheduled_at)<now.getTime());
  const lateTasks=tasks.filter(t=>t.due_date&&Date.parse(String(t.due_date).slice(0,10)+"T23:59:59")<now.getTime());
  const signals=[];
  if(old!==null&&old>=windowDays)signals.push({label:"Record follow-up review",detail:old+" days since candidate record creation",points:20,href:"/app/candidates/"+c.id});
  if(pastInterviews.length)signals.push({label:"Interview status unresolved",detail:pastInterviews.length+" scheduled interview(s) are in the past",points:30,href:"/app/interviews"});
  if(lateTasks.length)signals.push({label:"Candidate-linked tasks overdue",detail:lateTasks.length+" overdue open task(s)",points:25,href:"/app/recruitment-operations/tasks"});
  if(!c.email)signals.push({label:"Email not recorded",detail:"Candidate contact details need review",points:10,href:"/app/candidates/"+c.id});
  if(!apps.length)signals.push({label:"No application linked",detail:"Review candidate application assignment",points:10,href:"/app/candidates/"+c.id});
  const score=Math.min(100,signals.reduce((s,x)=>s+x.points,0));
  return {c,apps,interviews,tasks,old,signals,score,level:score>=50?"priority":score>=20?"watch":"clear"};
 }).sort((a,b)=>b.score-a.score||(b.old??-1)-(a.old??-1));
 const priority=rows.filter(r=>r.level==="priority"),watch=rows.filter(r=>r.level==="watch"),clear=rows.filter(r=>r.level==="clear");
 const filtered=rows.filter(r=>filter==="all"||r.level===filter);
 const totalSignals=rows.reduce((s,r)=>s+r.signals.length,0);
 const exportReport=()=>{if(!data)return;const records=[["Candidate","Job","Stage","Days Since Created","Experience Signals","Follow-up Priority"],...rows.map(r=>[r.c.full_name||"Unnamed",jobNames.get(String(r.c.job_id))||"Unassigned",r.c.status||"",r.old??"",r.signals.map(x=>x.label).join("; "),r.level])];const blob=new Blob(["\uFEFF"+records.map(row=>row.map(csv).join(",")).join("\r\n")],{type:"text/csv;charset=utf-8"});const url=URL.createObjectURL(blob);const link=document.createElement("a");link.href=url;link.download="inspire-match-candidate-experience.csv";link.click();URL.revokeObjectURL(url);};
 return <main className="ce-page"><style>{styles}</style><div className="ce-layout"><aside className="ce-side"><div className="ce-brand"><span className="ce-mark">I</span><div>Inspire Match<small>TALENT INTELLIGENCE</small></div></div><ATSNavigation className="ce-nav"/></aside><div className="ce-main"><div className="ce-wrap">
 <div className="ce-top"><span style={{color:"#778d7e",fontSize:12}}>Workspace / <strong style={{color:"#176144"}}>Recruitment Operations</strong> / Candidate Experience</span><Link className="ce-link" href="/app/recruitment-operations">← All Operations</Link></div>
 <header className="ce-hero"><small>RECRUITMENT OPERATIONS / CANDIDATE EXPERIENCE</small><h1>Candidate Experience &amp; Communication Intelligence</h1><p>Surface candidates who may need proactive follow-up by reviewing recruitment records, unresolved interview schedules and candidate-linked tasks.</p></header>
 <div className="ce-controls"><label>Company<select className="ce-input" value={company} onChange={e=>setCompany(e.target.value)}>{companies.map(c=><option key={c.company_id} value={c.company_id}>Company {String(c.company_id).slice(0,8)}</option>)}</select></label><label>Record review threshold<select className="ce-input" value={windowDays} onChange={e=>setWindowDays(Number(e.target.value))}>{[3,5,7,14,21].map(n=><option key={n} value={n}>{n} days</option>)}</select></label><label>Priority<select className="ce-input" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All active candidates</option><option value="priority">Priority</option><option value="watch">Watch</option><option value="clear">No current signals</option></select></label><button className="ce-input ce-btn" disabled={!company||loading} onClick={()=>setReload(x=>x+1)}>↻ Refresh</button><button className="ce-input ce-btn" disabled={!data} onClick={exportReport}>↓ Export CSV</button></div>
 {error&&<div className="ce-error" role="alert">{error}</div>}
 {data?.capped&&<div className="ce-error">Record query limit reached. Some indicators may be incomplete.</div>}
 <div className="ce-metrics">{[["Active Candidates",rows.length,"Visible candidate records"],["Priority Follow-ups",priority.length,"Multiple or high-impact signals"],["Watch List",watch.length,"Review recommended"],["Experience Signals",totalSignals,"Total record-based flags"]].map(([label,n,desc])=><div className="ce-metric" key={label}><span>{label}</span><strong>{loading||!data?"—":n}</strong><small>{desc}</small></div>)}</div>
 <div className="ce-grid">
 <section className="ce-panel"><h2>Candidate Follow-up Coverage</h2><p className="ce-desc">Current review priority across active candidates.</p>{[["Priority",priority.length,"bad"],["Watch",watch.length,"warn"],["No current signals",clear.length,""]].map(([label,n,kind])=><div className="ce-row" key={label}><div style={{flex:1}}><div style={{display:"flex",justifyContent:"space-between"}}><strong>{label}</strong><span className={"ce-tag "+kind}>{n}</span></div><div className="ce-heat"><span className={kind?"ce-alert":""} style={{width:(rows.length?n/rows.length*100:0)+"%"}}/></div></div></div>)}</section>
 <section className="ce-panel"><h2>Communication Review Checklist</h2><p className="ce-desc">Recommended human actions for candidate experience.</p>{[["Review unanswered candidate follow-ups","Check existing email and messaging records"],["Resolve interview scheduling","Confirm completed, cancelled or rescheduled status"],["Close outstanding commitments","Review candidate-linked task deadlines"],["Confirm candidate next steps","Document next action with the recruiter"]].map(([a,b])=><div className="ce-row" key={a}><div><strong>{a}</strong><small>{b}</small></div><span className="ce-pill">Review</span></div>)}</section>
 </div>
 <section className="ce-panel"><div style={{display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}><div><h2>Candidate Experience Follow-up Queue</h2><p className="ce-desc">Candidate-specific review signals and links to existing workflows.</p></div><span className="ce-tag">{filtered.length} candidates</span></div><div className="ce-tablewrap"><table className="ce-table"><thead><tr>{["Candidate","Job","Current Stage","Record Age","Priority","Experience Signals","Next Action"].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{filtered.slice(0,150).map(r=><tr key={r.c.id}><td><strong>{r.c.full_name||"Unnamed candidate"}</strong></td><td>{jobNames.get(String(r.c.job_id))||"—"}</td><td>{r.c.status||"—"}</td><td>{r.old===null?"Unknown":r.old+" days"}</td><td><span className={"ce-tag "+(r.level==="priority"?"bad":r.level==="watch"?"warn":"")}>{r.level==="clear"?"No signals":r.level}</span></td><td>{r.signals.length?r.signals.map(s=><div key={s.label} style={{marginBottom:6}}><strong>{s.label}</strong><div style={{fontSize:11,color:"#819688"}}>{s.detail}</div></div>):"No current signals"}</td><td><Link className="ce-link" href={r.signals[0]?.href||"/app/candidates/"+r.c.id}>Review →</Link></td></tr>)}</tbody></table></div>{!filtered.length&&<p className="ce-desc" style={{marginTop:20}}>No candidate records match the selected filter.</p>}
 <p className="ce-note">Important: This is a read-only follow-up indicator, not a communication log or measured response-time SLA. Candidate creation dates do not prove when someone was last contacted, and a flagged record does not establish that the candidate was neglected. No messages are sent or communication history inferred. Actual outreach tracking and candidate satisfaction measurement require a dedicated communication event and feedback data source.</p></section>
 </div></div></div></main>;
}
