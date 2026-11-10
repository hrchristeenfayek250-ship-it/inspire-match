"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import ATSNavigation from "@/components/ATSNavigation";

const competencies = [
  ["technical_skills","Technical Skills"],
  ["communication_skills","Communication"],
  ["problem_solving","Problem Solving"],
  ["culture_fit","Culture Fit"],
];
const dateLabel = value => {
  if(!value) return "Not scheduled";
  const date=new Date(value);
  return Number.isNaN(date.getTime()) ? "Not scheduled" : date.toLocaleString("en-GB",{dateStyle:"medium",timeStyle:"short"});
};
const scoreOf = (value) => value!==null && value!==undefined && value!=="" && Number(value)>=1 && Number(value)<=5 ? Number(value) : null;
const average = values => values.length ? values.reduce((sum,n)=>sum+n,0)/values.length : null;
const scoreLabel = n => n===null ? "—" : n.toFixed(1)+"/5";
const isCompleted = interview => String(interview.status||"").toLowerCase()==="completed";

const styles=`
.im-debrief{background:#f4f8f5;color:#173e2e;min-height:100vh;font:14px Arial,Helvetica,sans-serif}
.im-debrief *{box-sizing:border-box}.im-debrief-shell{display:grid;grid-template-columns:252px minmax(0,1fr);min-height:100vh}
.im-debrief-side{border-right:1px solid #deebe1;background:#fff;padding:27px 16px}
.im-debrief-brand{font-size:19px;font-weight:900;padding:0 12px 27px}.im-debrief-brand small{display:block;font-size:10px;letter-spacing:1.4px;color:#81968a;margin-top:5px}
.im-debrief-nav{display:flex;flex-direction:column;gap:3px}.im-debrief-nav a{display:flex;gap:11px;padding:11px 12px;text-decoration:none;font-size:12px;font-weight:750;color:#526c5e;border-radius:9px}
.im-debrief-nav a:hover,.im-debrief-nav a.active{background:#e5f4e9;color:#14573a}
.im-debrief-main{width:100%;max-width:1480px;margin:auto;padding:36px clamp(18px,3.6vw,52px)}
.im-debrief-top{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;flex-wrap:wrap}
.im-debrief-eyebrow{font-size:11px;letter-spacing:2px;color:#52866a;font-weight:900}.im-debrief h1{font:normal clamp(30px,3.4vw,44px) Georgia,serif;margin:11px 0 8px}
.im-debrief-muted{font-size:12px;color:#74877a;line-height:1.65}.im-debrief-actions{display:flex;gap:10px;flex-wrap:wrap}
.im-debrief-btn{padding:12px 15px;border:0;border-radius:10px;background:#186848;color:#fff;font-size:12px;font-weight:800;text-decoration:none;cursor:pointer}
.im-debrief-btn.secondary{background:#e5f3e9;color:#166243}
.im-debrief-filters{display:flex;gap:10px;flex-wrap:wrap;margin:26px 0 17px}
.im-debrief-filter{padding:11px 13px;border:1px solid #dce7df;border-radius:10px;background:#fff;color:#194b34;font:inherit;max-width:100%;min-width:155px}
.im-debrief-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:16px 0 22px}
.im-debrief-kpi,.im-debrief-card{background:#fff;border:1px solid #e1eae4;border-radius:17px;box-shadow:0 4px 21px #1b5c2a0b}
.im-debrief-kpi{padding:18px}.im-debrief-kpi span{font-size:12px;font-weight:800;color:#74897b}.im-debrief-kpi strong{display:block;font-size:31px;color:#17633f;margin:10px 0}
.im-debrief-card{padding:22px;margin:15px 0}.im-debrief-card h2{font-size:18px;margin:0 0 8px}.im-debrief-card h3{font-size:13px;margin:15px 0 10px}
.im-debrief-rows{display:grid;grid-template-columns:minmax(260px,340px) minmax(0,1fr);gap:16px;align-items:start}
.im-debrief-item{width:100%;display:block;text-align:left;padding:15px;border:1px solid #e1ebe3;border-radius:11px;background:#fff;cursor:pointer;color:inherit;margin-bottom:9px}
.im-debrief-item.selected{border-color:#208158;background:#eef9f0;box-shadow:0 0 0 2px #20815820}.im-debrief-item strong{font-size:13px;display:block}
.im-debrief-item small{color:#74887a;display:block;margin-top:6px;font-size:11px;line-height:1.5}
.im-debrief-tag{display:inline-flex;padding:5px 9px;margin-top:8px;border-radius:8px;background:#edf5ef;color:#246847;font-weight:800;font-size:10px}
.im-debrief-tag.attention{background:#fff1e7;color:#8a5521}
.im-debrief-detailheader{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;border-bottom:1px solid #e9eee9;padding-bottom:14px}
.im-debrief-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:18px 0}
.im-debrief-metric{padding:13px;background:#f6faf7;border:1px solid #e4eee6;border-radius:11px}
.im-debrief-metric strong{display:block;font-size:18px;margin-top:6px}
.im-debrief-table{width:100%;border-collapse:collapse;font-size:12px}.im-debrief-table th{text-align:left;color:#708576;font-size:11px;padding:10px;border-bottom:1px solid #dfebe2}.im-debrief-table td{padding:11px 10px;border-bottom:1px solid #edf2ed;vertical-align:top}
.im-debrief-scroll{width:100%;overflow:auto}.im-debrief-notes{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:12px}
.im-debrief-note{padding:13px;border-radius:11px;border:1px solid #e5ede6;background:#f9fcfa;white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px;line-height:1.7}
.im-debrief-warning{padding:14px;border-radius:10px;background:#fff2e9;color:#825023;font-size:12px;margin:15px 0}
.im-debrief-error{padding:14px;border-radius:10px;background:#fff0ef;color:#8d2f2f;font-size:12px;margin:12px 0}
@media(max-width:1100px){.im-debrief-shell{display:block}.im-debrief-side{border-bottom:1px solid #e0eae2}.im-debrief-nav{flex-direction:row;overflow-x:auto}.im-debrief-nav a{white-space:nowrap}.im-debrief-rows{grid-template-columns:1fr}}
@media(max-width:680px){.im-debrief-main{padding:20px 14px}.im-debrief-summary{grid-template-columns:repeat(2,minmax(0,1fr))}.im-debrief-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.im-debrief-notes{grid-template-columns:1fr}.im-debrief-filter{width:100%}}
@media print{.im-debrief-side,.im-debrief-actions,.im-debrief-filters,.im-debrief-list{display:none!important}.im-debrief-shell,.im-debrief-rows{display:block}.im-debrief-main{padding:0}.im-debrief-card{box-shadow:none;break-inside:avoid}}
`;

export default function HiringDebriefPage(){
 const [companies,setCompanies]=useState([]),[company,setCompany]=useState(""),[jobs,setJobs]=useState([]),[candidates,setCandidates]=useState([]),[applications,setApplications]=useState([]),[interviews,setInterviews]=useState([]),[evaluations,setEvaluations]=useState([]),[decisions,setDecisions]=useState([]);
 const [loading,setLoading]=useState(true),[error,setError]=useState(""),[warning,setWarning]=useState("");
 const [jobFilter,setJobFilter]=useState("all"),[statusFilter,setStatusFilter]=useState("completed"),[search,setSearch]=useState(""),[selectedId,setSelectedId]=useState("");

 const load=useCallback(async()=>{
  setLoading(true);setError("");setWarning("");
  try{
   const auth=await supabase.auth.getUser();
   if(auth.error||!auth.data?.user)throw Error("Please sign in to access the hiring debrief.");
   const membership=await supabase.from("company_members").select("company_id").eq("user_id",auth.data.user.id);
   if(membership.error)throw membership.error;
   const ids=[...new Set((membership.data||[]).map(m=>m.company_id).filter(Boolean))];
   setCompanies(ids);setCompany(current=>ids.includes(current)?current:ids[0]||"");
   if(!ids.length){setError("You do not have an active company membership.");return;}
   const results=await Promise.all([
    supabase.from("jobs").select("id,title,company_id").in("company_id",ids).limit(2000),
    supabase.from("candidates").select("id,full_name,company_id").in("company_id",ids).limit(5000),
    supabase.from("applications").select("id,candidate_id,job_id,company_id").in("company_id",ids).limit(5000),
    supabase.from("interviews").select("id,company_id,application_id,scheduled_at,status,type,interviewer").in("company_id",ids).order("scheduled_at",{ascending:false}).limit(2500),
    supabase.from("interview_evaluations").select("interview_id,company_id,evaluator_id,technical_skills,communication_skills,problem_solving,culture_fit,strengths,areas_for_improvement,overall_feedback,recommendation,updated_at").in("company_id",ids).limit(5000),
    supabase.from("interview_decisions").select("interview_id,company_id,decision,decision_reason,decided_by,updated_at").in("company_id",ids).limit(2500)
   ]);
   for(const result of results){if(result.error)throw result.error;}
   [setJobs,setCandidates,setApplications,setInterviews,setEvaluations,setDecisions].forEach((setter,i)=>setter(results[i].data||[]));
  }catch(e){setError(e.message||"Could not load debrief records.");}
  finally{setLoading(false);}
 },[]);
 useEffect(()=>{load();},[load]);
 const jobMap=useMemo(()=>new Map(jobs.filter(j=>j.company_id===company).map(j=>[String(j.id),j.title])),[jobs,company]);
 const candidateMap=useMemo(()=>new Map(candidates.filter(c=>c.company_id===company).map(c=>[String(c.id),c.full_name])),[candidates,company]);
 const appMap=useMemo(()=>new Map(applications.filter(a=>a.company_id===company).map(a=>[String(a.id),a])),[applications,company]);
 const list=useMemo(()=>interviews.filter(i=>i.company_id===company).map(i=>{
   const app=appMap.get(String(i.application_id));
   const ownEvals=evaluations.filter(e=>e.company_id===company&&String(e.interview_id)===String(i.id));
   const unique=new Map(ownEvals.map(e=>[String(e.evaluator_id),e]));
   const evals=[...unique.values()];
   const decision=decisions.filter(d=>d.company_id===company&&String(d.interview_id)===String(i.id)).sort((a,b)=>Date.parse(b.updated_at||0)-Date.parse(a.updated_at||0))[0]||null;
   const averages=evals.map(e=>average(competencies.map(([field])=>scoreOf(e[field])).filter(n=>n!==null))).filter(n=>n!==null);
   const gap=averages.length>1?Math.max(...averages)-Math.min(...averages):null;
   const skills=competencies.map(([field,title])=>({field,title,score:average(evals.map(e=>scoreOf(e[field])).filter(n=>n!==null))}));
   return {...i,jobId:app?.job_id,candidateId:app?.candidate_id,candidateName:candidateMap.get(String(app?.candidate_id))||"Candidate",jobName:jobMap.get(String(app?.job_id))||"Job",evals,decision,gap,score:average(averages),skills};
 }),[interviews,company,appMap,evaluations,decisions,candidateMap,jobMap]);
 const filtered=list.filter(i=>(jobFilter==="all"||String(i.jobId)===jobFilter)&&(statusFilter==="all"||(statusFilter==="completed"?isCompleted(i):statusFilter==="needs-review"?isCompleted(i)&&(!i.evals.length||!i.decision):String(i.status||"").toLowerCase()===statusFilter))&&(!search||[i.candidateName,i.jobName,i.interviewer,i.type].some(v=>String(v||"").toLowerCase().includes(search.toLowerCase()))));
 const selected=filtered.find(i=>String(i.id)===selectedId)||filtered[0]||null;
 const completed=list.filter(isCompleted);
 const scored=completed.filter(i=>i.evals.length>0);
 const decided=completed.filter(i=>i.decision);
 const needsAttention=completed.filter(i=>!i.evals.length||!i.decision);
 const aligned=completed.filter(i=>i.gap!==null);
 const scorecardQuality = scored.length ? Math.round(scored.filter(i=>i.evals.some(e=>competencies.every(([field])=>scoreOf(e[field])!==null))).length/scored.length*100) : null;
 const evidenceCoverage = scored.length ? Math.round(scored.filter(i=>i.evals.some(e=>String(e.overall_feedback||"").trim()||String(e.strengths||"").trim()||String(e.areas_for_improvement||"").trim())).length/scored.length*100) : null;
 const recommendationDisagreements = completed.filter(i=>new Set(i.evals.map(e=>String(e.recommendation||"").trim()).filter(Boolean)).size>1);
 const lowAlignment = aligned.filter(i=>i.gap>1);
 const exportCsv=()=>{
  const rows=[["Candidate","Job","Interview Date","Interview Status","Evaluators","Average Score","Score Gap","Scorecards Visible","Final Decision","Decision Rationale"]];
  filtered.forEach(i=>rows.push([i.candidateName,i.jobName,dateLabel(i.scheduled_at),i.status||"",i.evals.length,i.score===null?"":i.score.toFixed(2),i.gap===null?"":i.gap.toFixed(2),i.evals.length?"Yes":"No",i.decision?.decision||"",i.decision?.decision_reason||""]));
  const csv=rows.map(row=>row.map(value=>{const v=String(value??"");const safe=/^[=+@\t\r-]/.test(v)?"'"+v:v;return '"'+safe.replace(/"/g,'""')+'"';}).join(",")).join("\r\n");
  const blob=new Blob([String.fromCharCode(0xFEFF)+csv],{type:"text/csv;charset=utf-8"});
  const url=URL.createObjectURL(blob);const link=document.createElement("a");link.href=url;link.download="inspire-match-hiring-debrief.csv";document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url);
 };
 const dataNotice="Metrics reflect evaluations visible to your account. A missing evaluation does not prove a team member failed to submit it. The system does not yet track assigned reviewers or scorecard due dates.";
 return <div className="im-debrief"><style>{styles}</style><div className="im-debrief-shell"><aside className="im-debrief-side"><div className="im-debrief-brand">✳ Inspire Match<small>HIRE BETTER. INSPIRE MORE.</small></div><ATSNavigation className="im-debrief-nav"/></aside><main className="im-debrief-main">
 <div className="im-debrief-top"><div><div className="im-debrief-eyebrow">INTERVIEW INTELLIGENCE / INT-03 + INT-05</div><h1>Hiring Debrief</h1><p className="im-debrief-muted">Bring interview scorecards, skill evidence, recommendations and hiring decisions into one review workspace.</p></div><div className="im-debrief-actions"><Link className="im-debrief-btn secondary" href="/app/interviews">Interview Management</Link><button className="im-debrief-btn secondary" onClick={load} disabled={loading}>{loading?"Loading...":"↻ Refresh"}</button><button className="im-debrief-btn secondary" onClick={exportCsv} disabled={loading||!filtered.length}>Export CSV</button><button className="im-debrief-btn" onClick={()=>window.print()}>Print Debrief</button></div></div>
 {error&&<p className="im-debrief-error" role="alert">{error}</p>}{warning&&<p className="im-debrief-warning">{warning}</p>}
 <div className="im-debrief-filters"><select className="im-debrief-filter" aria-label="Company" value={company} onChange={e=>{setCompany(e.target.value);setJobFilter("all");setSelectedId("");}}>{companies.map(id=><option value={id} key={id}>Workspace {id.slice(0,8)}</option>)}</select><select className="im-debrief-filter" aria-label="Job" value={jobFilter} onChange={e=>{setJobFilter(e.target.value);setSelectedId("");}}><option value="all">All jobs</option>{[...jobMap.entries()].map(([id,name])=><option value={id} key={id}>{name}</option>)}</select><select className="im-debrief-filter" aria-label="Status" value={statusFilter} onChange={e=>{setStatusFilter(e.target.value);setSelectedId("");}}><option value="completed">Completed interviews</option><option value="needs-review">Needs review</option><option value="all">All interviews</option></select><input className="im-debrief-filter" aria-label="Search" placeholder="Search candidate or interviewer" value={search} onChange={e=>setSearch(e.target.value)}/></div>
 <div className="im-debrief-summary"><div className="im-debrief-kpi"><span>Completed interviews</span><strong>{loading?"—":completed.length}</strong><div className="im-debrief-muted">In selected workspace</div></div><div className="im-debrief-kpi"><span>With visible scorecard</span><strong>{loading?"—":scored.length}</strong><div className="im-debrief-muted">{completed.length?Math.round(scored.length/completed.length*100)+"% coverage":"No completed interviews"}</div></div><div className="im-debrief-kpi"><span>With final decision</span><strong>{loading?"—":decided.length}</strong><div className="im-debrief-muted">{completed.length?Math.round(decided.length/completed.length*100)+"% coverage":"No completed interviews"}</div></div><div className="im-debrief-kpi"><span>Review queue</span><strong>{loading?"—":needsAttention.length}</strong><div className="im-debrief-muted">{aligned.length} multi-evaluator comparison{aligned.length===1?"":"s"}</div></div></div>
 <section className="im-debrief-card" aria-label="Interview quality insights"><div className="im-debrief-eyebrow">INT-05 / INTERVIEW QUALITY ANALYTICS</div><h2 style={{marginTop:10}}>Scorecard Quality & Interviewer Alignment</h2><p className="im-debrief-muted">Evidence-based operational indicators calculated from completed interviews and visible scorecards in the selected workspace. Percentages use only the relevant records described below.</p><div className="im-debrief-grid">
 <div className="im-debrief-metric"><span className="im-debrief-muted">Complete competency ratings</span><strong>{scorecardQuality===null?"—":scorecardQuality+"%"}</strong><small className="im-debrief-muted">Completed interviews with scorecards; all four competencies rated in at least one visible scorecard (n={scored.length})</small></div>
 <div className="im-debrief-metric"><span className="im-debrief-muted">Written evidence coverage</span><strong>{evidenceCoverage===null?"—":evidenceCoverage+"%"}</strong><small className="im-debrief-muted">Completed interviews with scorecards; at least one evaluator added written feedback (n={scored.length})</small></div>
 <div className="im-debrief-metric"><span className="im-debrief-muted">Recommendation disagreement</span><strong>{recommendationDisagreements.length}</strong><small className="im-debrief-muted">Completed interviews with conflicting visible recommendations</small></div>
 <div className="im-debrief-metric"><span className="im-debrief-muted">Low alignment</span><strong>{lowAlignment.length}</strong><small className="im-debrief-muted">Gap above 1.0 point between evaluator averages (n={aligned.length} comparable interviews)</small></div>
 <div className="im-debrief-metric"><span className="im-debrief-muted">Awaiting visible scorecard</span><strong>{completed.length-scored.length}</strong><small className="im-debrief-muted">Completed interviews with no accessible scorecard</small></div>
 <div className="im-debrief-metric"><span className="im-debrief-muted">Awaiting recorded decision</span><strong>{completed.length-decided.length}</strong><small className="im-debrief-muted">Completed interviews with no accessible final decision</small></div>
 </div><p className="im-debrief-muted">These are record-coverage indicators, not employee performance ratings. There is no reviewer-assignment or submission-deadline tracking in this report.</p></section>
 <div className="im-debrief-rows"><section className="im-debrief-card im-debrief-list"><h2>Interview review queue</h2><p className="im-debrief-muted">{filtered.length} interview{filtered.length===1?"":"s"} match the filters.</p>{!loading&&!filtered.length&&<p className="im-debrief-muted">No interviews found.</p>}{filtered.map(i=><button type="button" className={"im-debrief-item "+(selected?.id===i.id?"selected":"")} key={i.id} onClick={()=>setSelectedId(String(i.id))}><strong>{i.candidateName}</strong><small>{i.jobName} · {dateLabel(i.scheduled_at)}</small><small>{i.interviewer||"Interviewer not specified"} · {i.type||"Interview"}</small><span className={"im-debrief-tag "+(isCompleted(i)&&(!i.evals.length||!i.decision)?"attention":"")}>{!isCompleted(i)?i.status||"Scheduled":!i.evals.length?"No visible scorecard":!i.decision?"Decision pending":"Debrief ready"}</span></button>)}</section>
 <section className="im-debrief-card">{!selected?<div><h2>{loading?"Loading interview records...":"Select an interview"}</h2><p className="im-debrief-muted">Choose a record on the left to review its scorecards and decision.</p></div>:<>
 <div className="im-debrief-detailheader"><div><div className="im-debrief-eyebrow">INTERVIEW DEBRIEF</div><h2 style={{marginTop:8}}>{selected.candidateName}</h2><p className="im-debrief-muted">{selected.jobName} · {dateLabel(selected.scheduled_at)} · {selected.status||"Status unknown"}</p></div><span className="im-debrief-tag">{selected.evals.length} evaluator{selected.evals.length===1?"":"s"}</span></div>
 <div className="im-debrief-grid"><div className="im-debrief-metric"><span className="im-debrief-muted">Overall score</span><strong>{scoreLabel(selected.score)}</strong></div><div className="im-debrief-metric"><span className="im-debrief-muted">Evaluators</span><strong>{selected.evals.length}</strong></div><div className="im-debrief-metric"><span className="im-debrief-muted">Alignment</span><strong>{selected.gap===null?"Not comparable":selected.gap<=.5?"High":selected.gap<=1?"Moderate":"Low"}</strong>{selected.gap!==null&&<small className="im-debrief-muted"> Gap: {selected.gap.toFixed(2)} points</small>}</div></div>
 {isCompleted(selected)&&(!selected.evals.length||!selected.decision)&&<div className="im-debrief-warning">{!selected.evals.length?"No evaluation is visible for this completed interview. ":""}{!selected.decision?"No final decision is visible. ":""}Review these items in Interview Management.</div>}
 <h3>Competency overview</h3><div className="im-debrief-scroll"><table className="im-debrief-table"><thead><tr><th>Competency</th><th>Average rating</th><th>Available ratings</th></tr></thead><tbody>{selected.skills.map(s=><tr key={s.field}><td><strong>{s.title}</strong></td><td>{scoreLabel(s.score)}</td><td>{selected.evals.filter(e=>scoreOf(e[s.field])!==null).length}</td></tr>)}</tbody></table></div>
 <h3>Evaluator scorecards and recommendations</h3><div className="im-debrief-scroll"><table className="im-debrief-table"><thead><tr><th>Evaluator</th>{competencies.map(([field,name])=><th key={field}>{name}</th>)}<th>Recommendation</th></tr></thead><tbody>{selected.evals.map((e,index)=><tr key={String(e.evaluator_id||index)}><td>Evaluator {index+1}<div className="im-debrief-muted">{dateLabel(e.updated_at)}</div></td>{competencies.map(([field])=><td key={field}>{scoreOf(e[field])??"—"}</td>)}<td>{e.recommendation||"Not recorded"}</td></tr>)}</tbody></table>{!selected.evals.length&&<p className="im-debrief-muted">No accessible scorecards yet.</p>}</div>
 <h3>Evaluation notes and supporting evidence</h3>{selected.evals.map((e,index)=><div key={String(e.evaluator_id||index)} className="im-debrief-note" style={{marginBottom:10}}><strong>Evaluator {index+1} · {e.recommendation||"Recommendation not recorded"}</strong><div className="im-debrief-notes"><div><strong>Strengths</strong><p>{e.strengths||"Not recorded"}</p></div><div><strong>Areas for improvement</strong><p>{e.areas_for_improvement||"Not recorded"}</p></div></div><strong>Overall feedback</strong><p>{e.overall_feedback||"Not recorded"}</p></div>)}{!selected.evals.length&&<p className="im-debrief-muted">Evidence notes appear when interviewers submit them through Interview Management.</p>}
 <h3>Final hiring decision</h3><div className="im-debrief-note"><strong>{selected.decision?.decision||"Decision not recorded"}</strong><p>{selected.decision?.decision_reason||"No decision rationale is available."}</p>{selected.decision&&<small className="im-debrief-muted">Last updated: {dateLabel(selected.decision.updated_at)}</small>}</div>
 <p className="im-debrief-muted">To submit or edit scorecards and decisions, open Interview Management. This page is read-only and does not change candidate stages or hiring outcomes.</p><Link href="/app/interviews" className="im-debrief-btn" style={{display:"inline-block",marginTop:8}}>Open Interview Management</Link>
 </>}</section></div><p className="im-debrief-muted">{dataNotice}</p>
 </main></div></div>;
}
