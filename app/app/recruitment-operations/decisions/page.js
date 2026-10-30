"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import {supabase} from "@/lib/supabase";
import ATSNavigation from "@/components/ATSNavigation";
const styles=`
.di-page{display:block!important;max-width:none!important;width:100%!important;margin:0!important;padding:0!important;min-height:100vh;background:#f5f8f6;color:#214632;font:13px/1.6 Arial,sans-serif}
.di-page *{box-sizing:border-box}.di-layout{display:grid;grid-template-columns:252px minmax(0,1fr);min-height:100vh}
.di-side{background:#fff;border-right:1px solid #e4ede6;padding:27px 14px}
.di-brand{display:flex;align-items:center;gap:11px;padding:4px 13px 30px;font-size:17px;font-weight:850}
.di-mark{display:grid;place-items:center;width:36px;height:36px;border-radius:11px;background:#14583e;color:white;font-size:22px}
.di-brand small{display:block;color:#8a9d8f;letter-spacing:1.5px;font-size:9px}
.di-nav{display:flex;flex-direction:column;gap:4px}.di-nav a{display:flex;align-items:center;gap:12px;min-height:40px;padding:10px 12px;border-radius:10px;color:#5d7267;text-decoration:none;font-size:12px;font-weight:700}
.di-nav a span{width:17px;text-align:center}.di-nav a:hover,.di-nav a.active{background:#e5f2e9;color:#145f42}
.di-main{min-width:0;padding:0 clamp(18px,3.4vw,54px) 65px}.di-wrap{max-width:1240px;margin:auto}
.di-top{height:77px;display:flex;justify-content:space-between;align-items:center;gap:12px;border-bottom:1px solid #e5ece7;margin-bottom:30px}
.di-link{color:#19734c;text-decoration:none;font-weight:800;font-size:12px}
.di-hero{background:linear-gradient(115deg,#103c2c,#176448 72%,#217755);border-radius:22px;padding:36px 38px;color:#fff;box-shadow:0 12px 32px #134a311a}
.di-hero small{color:#b7e5cb;letter-spacing:2px;font-size:10px;font-weight:850}.di-hero h1{font:850 clamp(27px,3vw,36px)/1.2 Arial,sans-serif;color:#fff;margin:13px 0}.di-hero p{color:#dceee4;font-size:13px;max-width:730px;margin:0}
.di-controls{display:flex;gap:13px;flex-wrap:wrap;align-items:end;margin:25px 0 18px}.di-controls label{font-size:11px;font-weight:800;color:#688372}
.di-input{display:block;margin-top:6px;min-width:150px;padding:11px;border:1px solid #d9e7dc;border-radius:9px;background:#fff;color:#22543b;font:12px Arial}
.di-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:13px;margin-bottom:17px}
.di-metric,.di-panel{background:#fff;border:1px solid #e1ebe4;border-radius:15px;padding:22px;min-width:0}
.di-metric span{font-size:11px;font-weight:800;color:#708b78}.di-metric strong{display:block;font-size:29px;color:#19764e;margin:8px 0}.di-metric small{color:#8a9f8e;font-size:11px}
.di-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:17px}
.di-panel h2{font:800 17px Arial,sans-serif;color:#1c4531;margin:0 0 9px}
.di-desc{color:#809687;font-size:12px;margin:0 0 16px}
.di-row{display:flex;justify-content:space-between;align-items:center;gap:14px;border-top:1px solid #edf2ee;padding:14px 0}
.di-row strong{font-size:12px}.di-row small{display:block;color:#819688;font-size:11px;margin-top:5px}
.di-tag{display:inline-block;padding:5px 10px;border-radius:30px;background:#e7f3eb;color:#20734b;font-size:10px;font-weight:800;white-space:nowrap}
.di-tag.warn{background:#fff0dd;color:#986b2a}.di-tag.bad{background:#ffebe6;color:#a54b37}
.di-tablewrap{overflow-x:auto}.di-table{width:100%;border-collapse:collapse;min-width:710px;font-size:12px}
.di-table th{background:#f7faf8;text-align:left;color:#708b79;font-size:10px;padding:13px}.di-table td{padding:13px;border-top:1px solid #edf2ee;color:#3d604a}
.di-error{padding:13px;background:#fff0e6;color:#a6503d;border-radius:9px;margin:14px 0}
.di-note{font-size:11px;color:#82988a;line-height:1.7;margin-top:16px}
@media(max-width:1040px){.di-grid{grid-template-columns:1fr}.di-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:760px){.di-layout{display:block}.di-side{padding:13px 16px;border-right:0;border-bottom:1px solid #e4ede6}.di-brand{padding:0 0 12px}.di-nav{flex-direction:row;overflow:auto}.di-nav a{flex:0 0 auto;white-space:nowrap}.di-main{padding:0 15px 40px}.di-top{height:60px;margin-bottom:18px}.di-hero{padding:26px 22px}.di-panel,.di-metric{padding:16px}}

.di-score{display:flex;align-items:center;gap:10px}
.di-scorebar{height:8px;min-width:65px;background:#e7f0e9;border-radius:99px;overflow:hidden;flex:1}
.di-scorebar span{display:block;height:100%;background:#237d54;border-radius:99px}
.di-evidence{display:flex;gap:7px;flex-wrap:wrap;margin-top:7px}
.di-chip{background:#edf5ef;border-radius:8px;padding:4px 8px;color:#417054;font-size:10px;font-weight:750}
.di-selectrow{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.di-info{padding:13px;border:1px solid #dbe9de;background:#f4faf5;border-radius:10px;color:#4c7359;font-size:11px}
.di-legend{display:flex;flex-wrap:wrap;gap:9px;margin-top:14px}
.di-empty{padding:30px;text-align:center;color:#87998a}
`;

const fields=["technical_skills","communication_skills","problem_solving","culture_fit"];
const nice={technical_skills:"Technical",communication_skills:"Communication",problem_solving:"Problem solving",culture_fit:"Culture fit"};
const cleanText=x=>String(x||"").trim();
const validScore=x=>x!==null&&x!==undefined&&x!==""&&Number.isFinite(Number(x))&&Number(x)>=1&&Number(x)<=5;
const safeCsv=x=>{const s=String(x??"");return '"'+(/^[=+\-@\t\r]/.test(s)?"'"+s:s).replaceAll('"','""')+'"';};
function DecisionIntelligence(){
 const [companies,setCompanies]=useState([]),[company,setCompany]=useState(""),[data,setData]=useState(null),[job,setJob]=useState(""),[loading,setLoading]=useState(true),[error,setError]=useState(""),[reload,setReload]=useState(0),[weights,setWeights]=useState([35,25,25,15]);
 useEffect(()=>{let active=true;(async()=>{const auth=await supabase.auth.getUser();if(!active)return;if(!auth.data?.user){setError("Please sign in.");setLoading(false);return;}const r=await supabase.from("company_members").select("company_id,role").eq("user_id",auth.data.user.id);if(!active)return;if(r.error)setError(r.error.message);else{setCompanies(r.data||[]);setCompany(r.data?.[0]?.company_id||"");}setLoading(false);})();return()=>{active=false;};},[]);
 useEffect(()=>{if(!company){setData(null);setJob("");return;}let active=true;setData(null);setJob("");setError("");setLoading(true);(async()=>{
  const results=await Promise.all([
   supabase.from("jobs").select("id,title,status").eq("company_id",company).limit(1500),
   supabase.from("applications").select("id,candidate_id,job_id,stage").eq("company_id",company).limit(5000),
   supabase.from("candidates").select("id,full_name,status").eq("company_id",company).is("deleted_at",null).limit(5000),
   supabase.from("interviews").select("id,application_id,status,scheduled_at").eq("company_id",company).limit(5000),
   supabase.from("interview_evaluations").select("id,interview_id,evaluator_id,technical_skills,communication_skills,problem_solving,culture_fit,strengths,areas_for_improvement,overall_feedback,recommendation").eq("company_id",company).limit(5000),
   supabase.from("interview_decisions").select("id,interview_id,decision,decision_reason").eq("company_id",company).limit(5000)
  ]);if(!active)return;const names=["jobs","applications","candidates","interviews","evaluations","decisions"];const failed=results.map((r,i)=>r.error?names[i]+": "+r.error.message:null).filter(Boolean);
  if(failed.length){setError("Unable to load complete decision evidence: "+failed.join("; "));setData(null);}
  else{const d=Object.fromEntries(results.map((r,i)=>[names[i],r.data||[]]));d.capped=results.some((r,i)=>(r.data||[]).length>=[1500,5000,5000,5000,5000,5000][i]);setData(d);setJob(d.jobs[0]?String(d.jobs[0].id):"");}
  setLoading(false);
 })();return()=>{active=false;};},[company,reload]);
 const applications=data?.applications.filter(a=>String(a.job_id)===job)||[];
 const interviewsByApp=new Map();(data?.interviews||[]).forEach(i=>{const k=String(i.application_id);if(!interviewsByApp.has(k))interviewsByApp.set(k,[]);interviewsByApp.get(k).push(i);});
 const evalByInterview=new Map();(data?.evaluations||[]).forEach(e=>{const k=String(e.interview_id);if(!evalByInterview.has(k))evalByInterview.set(k,[]);evalByInterview.get(k).push(e);});
 const decisionsByInterview=new Map();(data?.decisions||[]).forEach(d=>{const k=String(d.interview_id);if(!decisionsByInterview.has(k))decisionsByInterview.set(k,[]);decisionsByInterview.get(k).push(d);});
 const normalized=weights.reduce((s,w)=>s+w,0)||1;
 const rows=applications.map(app=>{
  const candidate=data?.candidates.find(c=>String(c.id)===String(app.candidate_id));
  const interviews=interviewsByApp.get(String(app.id))||[];
  const complete=interviews.filter(i=>String(i.status).toLowerCase()==="completed");
  const evaluations=complete.flatMap(i=>evalByInterview.get(String(i.id))||[]);
  const unique=[...new Map(evaluations.map(e=>[String(e.interview_id)+"-"+String(e.evaluator_id),e])).values()];
  const scores=fields.map(k=>{const valid=unique.filter(e=>validScore(e[k]));return valid.length?valid.reduce((s,e)=>s+Number(e[k]),0)/valid.length:null;});
  const covered=scores.filter(x=>x!==null).length;
  const weighted=covered?Math.round(scores.reduce((s,x,i)=>s+(x===null?0:x/5*weights[i]),0)/normalized*100):null;
  const allComplete=covered===4;
  const recommendations={Hire:0,Hold:0,Reject:0};
  unique.forEach(e=>{const k=cleanText(e.recommendation);if(k in recommendations)recommendations[k]++;});
  const decisions=complete.flatMap(i=>decisionsByInterview.get(String(i.id))||[]);
  const strengths=[...new Set(unique.map(e=>cleanText(e.strengths)).filter(Boolean))].slice(0,3);
  const gaps=[...new Set(unique.map(e=>cleanText(e.areas_for_improvement)).filter(Boolean))].slice(0,3);
  const flags=[];
  if(!complete.length)flags.push("No completed interview");
  if(!unique.length)flags.push("Evaluation missing");
  else if(!allComplete)flags.push("Incomplete scorecard");
  if(recommendations.Hire&&recommendations.Reject)flags.push("Conflicting recommendations");
  if(decisions.length===0&&complete.length)flags.push("Decision pending");
  return {app,candidate,interviews,complete,unique,scores,weighted,covered,allComplete,recommendations,decisions,strengths,gaps,flags};
 }).sort((a,b)=>Number(b.allComplete)-Number(a.allComplete)||(b.weighted??-1)-(a.weighted??-1));
 const evaluated=rows.filter(r=>r.unique.length);
 const ready=rows.filter(r=>r.allComplete);
 const conflicts=rows.filter(r=>r.flags.includes("Conflicting recommendations"));
 const pending=rows.filter(r=>r.flags.includes("Decision pending"));
 const exportCsv=()=>{if(!data)return;const cols=[["Candidate","Pipeline Stage","Evidence Coverage","Weighted Score","Evaluations","Hire Votes","Hold Votes","Reject Votes","Final Decisions","Flags"],...rows.map(r=>[r.candidate?.full_name||"Candidate "+r.app.candidate_id,r.app.stage||"",r.covered+"/4",r.weighted??"",r.unique.length,r.recommendations.Hire,r.recommendations.Hold,r.recommendations.Reject,r.decisions.map(d=>d.decision).join("; "),r.flags.join("; ")])];const csv="\uFEFF"+cols.map(r=>r.map(safeCsv).join(",")).join("\r\n");const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));const a=document.createElement("a");a.href=url;a.download="inspire-match-decision-comparison.csv";a.click();URL.revokeObjectURL(url);};
 return <main className="di-page"><style>{styles}</style><div className="di-layout"><aside className="di-side"><div className="di-brand"><span className="di-mark">I</span><div>Inspire Match<small>TALENT INTELLIGENCE</small></div></div><ATSNavigation className="di-nav"/></aside><div className="di-main"><div className="di-wrap">
 <div className="di-top"><span style={{color:"#778d7e",fontSize:12}}>Workspace / <strong style={{color:"#176144"}}>Recruitment Operations</strong> / Decision Intelligence</span><Link className="di-link" href="/app/recruitment-operations">← All Operations</Link></div>
 <header className="di-hero"><small>RECRUITMENT OPERATIONS / EVIDENCE-BASED DECISIONS</small><h1>Recruitment Decision Intelligence</h1><p>Compare candidates for the same role using existing interview scorecards, evaluator recommendations and documented decisions — without replacing human hiring judgment.</p></header>
 <div className="di-controls"><label>Company<select className="di-input" value={company} onChange={e=>setCompany(e.target.value)}>{companies.map(c=><option key={c.company_id} value={c.company_id}>Company {String(c.company_id).slice(0,8)}</option>)}</select></label><label>Job<select className="di-input" value={job} onChange={e=>setJob(e.target.value)}>{(data?.jobs||[]).map(j=><option key={j.id} value={String(j.id)}>{j.title||"Untitled Job"}</option>)}</select></label><button className="di-input" style={{cursor:"pointer",fontWeight:800}} disabled={!company||loading} onClick={()=>setReload(n=>n+1)}>↻ Refresh</button><button className="di-input" style={{cursor:"pointer",fontWeight:800,color:"#176b49"}} disabled={!data||!job} onClick={exportCsv}>↓ Export Comparison</button></div>
 {error&&<div className="di-error" role="alert">{error}</div>}
 {!loading&&!company&&!error&&<div className="di-info">No company membership found for this account.</div>}
 {data?.capped&&<div className="di-error">One or more record limits were reached. Comparison may be incomplete.</div>}
 <div className="di-metrics">{[["Applicants",rows.length,"Linked to selected job"],["Evaluated",evaluated.length,"At least one completed interview evaluation"],["Complete Scorecards",ready.length,"All four scoring dimensions"],["Decision Gaps",pending.length+conflicts.length,"Pending decisions or conflicting recommendations"]].map(([n,v,desc])=><div className="di-metric" key={n}><span>{n}</span><strong>{loading||!data?"—":v}</strong><small>{desc}</small></div>)}</div>
 <div className="di-grid"><section className="di-panel"><h2>Scoring Weights</h2><p className="di-desc">Adjust relative importance for this comparison only. Missing dimensions score zero and are flagged; a score is not a hiring recommendation.</p>
 {fields.map((field,i)=><div className="di-row" key={field}><strong>{nice[field]}</strong><div className="di-selectrow"><input type="range" min="0" max="60" step="5" value={weights[i]} onChange={e=>setWeights(w=>w.map((v,j)=>j===i?Number(e.target.value):v))} aria-label={nice[field]+" weight"}/><span className="di-tag">{weights[i]}</span></div></div>)}
 <div className="di-info" style={{marginTop:14}}>Weights are normalized automatically (total: {normalized}). Comparisons are most meaningful when all four dimensions are scored.</div>
 </section><section className="di-panel"><h2>Decision Readiness</h2><p className="di-desc">Identify missing evidence before comparing candidates.</p>
 {[["Complete four-dimension scorecards",ready.length],["Missing or incomplete evaluations",rows.length-ready.length],["Conflicting Hire / Reject recommendations",conflicts.length],["Completed interviews without a decision",pending.length]].map(([name,n])=><div className="di-row" key={name}><strong>{name}</strong><span className={"di-tag "+(n&&name!=="Complete four-dimension scorecards"?"warn":"")}>{n}</span></div>)}
 <Link className="di-link" href="/app/interviews">Review Interviews &amp; Evaluations →</Link>
 </section></div>
 <section className="di-panel" style={{marginBottom:17}}><div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:12}}><div><h2>Candidate Comparison Matrix</h2><p className="di-desc">Scores average the available evaluations for completed interviews; the weighting is applied consistently to each candidate.</p></div><span className="di-tag">{rows.length} candidates</span></div>
 <div className="di-tablewrap"><table className="di-table"><thead><tr>{["Candidate","Stage","Evidence","Weighted Score","Interview Ratings","Recommendations","Decision Status"].map(x=><th key={x}>{x}</th>)}</tr></thead><tbody>{rows.map(r=><tr key={r.app.id}><td><strong>{r.candidate?.full_name||"Candidate "+r.app.candidate_id}</strong><div className="di-evidence">{r.flags.slice(0,2).map(x=><span className="di-chip" key={x}>{x}</span>)}</div></td><td>{r.app.stage||"—"}</td><td><span className={"di-tag "+(r.allComplete?"":"warn")}>{r.covered}/4</span><div className="di-desc" style={{margin:0}}>{r.unique.length} evaluation(s)</div></td><td>{r.weighted===null?"Not scored":<div className="di-score"><strong>{r.weighted}/100</strong><div className="di-scorebar"><span style={{width:r.weighted+"%"}}/></div></div>}</td><td>{fields.map((k,i)=><div key={k} className="di-desc" style={{margin:"2px 0"}}>{nice[k]}: {r.scores[i]===null?"—":r.scores[i].toFixed(1)+"/5"}</div>)}</td><td>Hire {r.recommendations.Hire} · Hold {r.recommendations.Hold} · Reject {r.recommendations.Reject}</td><td>{r.decisions.length?<span className="di-tag">{[...new Set(r.decisions.map(d=>d.decision))].join(", ")}</span>:<span className="di-tag warn">Not recorded</span>}</td></tr>)}</tbody></table></div>{!rows.length&&<div className="di-empty">No applications for the selected job.</div>}</section>
 <section className="di-panel"><h2>Evidence &amp; Gaps</h2><p className="di-desc">A concise evidence review for candidates with recorded evaluations.</p>
 {evaluated.map(r=><div className="di-row" key={r.app.id} style={{alignItems:"flex-start"}}><div style={{flex:1,minWidth:0}}><strong>{r.candidate?.full_name||"Candidate "+r.app.candidate_id}</strong><small>{r.unique.length} evaluation(s) · {r.complete.length} completed interview(s)</small><div className="di-evidence">{r.strengths.map((s,i)=><span key={i} className="di-chip">Strength: {s}</span>)}{r.gaps.map((s,i)=><span key={i} className="di-chip">Gap: {s}</span>)}{r.flags.map((s,i)=><span key={"f"+i} className="di-chip">{s}</span>)}</div></div><Link className="di-link" href="/app/interviews">Review →</Link></div>)}
 {!evaluated.length&&<p className="di-desc">No completed-interview evaluations recorded for this job.</p>}
 <p className="di-note">This is a read-only decision-support view. Interview assessments are subjective, and different evaluators may score differently. No automatic hiring, ranking by AI, approval, or changes to candidate stages occur here. Final decisions remain with authorized HR and hiring managers through the existing workflow.</p>
 </section>
 </div></div></div></main>;
}
export default DecisionIntelligence;
