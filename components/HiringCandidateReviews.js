"use client";
import {useEffect,useMemo,useState} from "react";
import {supabase} from "@/lib/supabase";

const examples=[
 {share_id:"sample-1",job_id:"demo-job-1",job_title:"Senior Product Designer",candidate_name:"Sample Candidate A",candidate_title:"Product Designer",candidate_stage:"Shortlisted"},
 {share_id:"sample-2",job_id:"demo-job-2",job_title:"React Native Developer",candidate_name:"Sample Candidate B",candidate_title:"Mobile Developer",candidate_stage:"Interview",latest_recommendation:"hold",latest_rating:3,latest_comments:"Sample feedback"}
];

export default function HiringCandidateReviews({designPreview=false,enabled=false,selectedJobId="all",onJobFilterChange}) {
 const [rows,setRows]=useState([]),[error,setError]=useState(""),[loading,setLoading]=useState(false);
 const [query,setQuery]=useState(""),[status,setStatus]=useState("all");
 const [localJob,setLocalJob]=useState("all");
 const job=onJobFilterChange?selectedJobId:localJob;
 const setJob=onJobFilterChange||setLocalJob;
 const [active,setActive]=useState(null),[decision,setDecision]=useState("proceed"),[rating,setRating]=useState(3),[comments,setComments]=useState("");
 const [saving,setSaving]=useState(false),[message,setMessage]=useState("");
 const [sampleReviews,setSampleReviews]=useState({});
 async function load(){
   if(designPreview||!enabled)return;
   setLoading(true);setError("");
   const {data,error:rpcError}=await supabase.rpc("get_my_hiring_candidate_reviews");
   if(rpcError){setRows([]);setError("Candidate reviews are unavailable until the secure database migration is applied.");}
   else setRows(Array.isArray(data)?data:[]);
   setLoading(false);
 }
 useEffect(()=>{if(enabled&&!designPreview)load();},[enabled,designPreview]);
 const visible=designPreview?examples.map(item=>({...item,...(sampleReviews[item.share_id]||{})})):rows;
 const jobs=useMemo(()=>Array.from(new Map(visible.map(r=>[r.job_id,r.job_title])).entries()),[visible]);
 const filtered=visible.filter(r=>(job==="all"||r.job_id===job)&&(status==="all"||(status==="pending"?!r.latest_recommendation:!!r.latest_recommendation))&&[r.candidate_name,r.candidate_title,r.candidate_stage,r.job_title].join(" ").toLowerCase().includes(query.toLowerCase()));
 function open(r){setActive(r);setDecision(r.latest_recommendation||"proceed");setRating(r.latest_rating||3);setComments(r.latest_comments||"");setMessage("");}
 async function save(){
   if(!active||saving||comments.trim().length<10)return;
   if(designPreview){setSampleReviews(prev=>({...prev,[active.share_id]:{latest_recommendation:decision,latest_rating:Number(rating),latest_comments:comments.trim()}}));setActive(null);setMessage("Sample feedback saved in this preview only. No live data changed.");return;}
   setSaving(true);setError("");setMessage("");
   const {error:rpcError}=await supabase.rpc("submit_hiring_candidate_review",{p_share_id:active.share_id,p_recommendation:decision,p_rating:Number(rating),p_comments:comments.trim()});
   if(rpcError)setError(rpcError.message||"Could not save feedback");
   else {setActive(null);setMessage("Feedback saved successfully.");await load();}
   setSaving(false);
 }
 return <section className="hm-panel">
  <div className="hm-panel-head"><h2>Candidate Reviews &amp; Feedback</h2>{designPreview&&<span className="hm-sample">SAMPLE</span>}</div>
  <p className="hm-muted">Review only candidates explicitly shared by a recruiter for your assigned jobs.</p>
  {designPreview&&<p className="hm-note">Interactive demo: review a sample candidate, add a rating and feedback, and test the filters. Changes stay in this page only.</p>}
  <div className="hm-filters">
   <input aria-label="Search candidates" placeholder="Search candidate, job or stage" value={query} onChange={e=>setQuery(e.target.value)}/>
   <select aria-label="Filter candidates by job" value={job} onChange={e=>setJob(e.target.value)}><option value="all">All jobs</option>{jobs.map(([id,title])=><option key={id} value={id}>{title}</option>)}</select>
   <select aria-label="Filter review status" value={status} onChange={e=>setStatus(e.target.value)}><option value="all">All reviews</option><option value="pending">Awaiting feedback</option><option value="reviewed">Reviewed</option></select>
  </div>
  {job!=="all"&&<button type="button" className="hm-button hm-button-secondary" onClick={()=>setJob("all")}>Clear selected job filter</button>}
  {error&&<p role="alert" className="hm-error">{error}</p>}
  {message&&<p role="status" className="hm-note">{message}</p>}
  {loading?<div className="hm-empty">Loading shared candidates…</div>:filtered.length===0?<div className="hm-empty">No candidates match your filters.</div>:filtered.map(r=><div key={r.share_id}>
   <div className="hm-row"><div><strong>{r.candidate_name||"Candidate"}</strong>{designPreview&&<span className="hm-sample">SAMPLE</span>}
   <div className="hm-detail">{[r.candidate_title,r.job_title,r.candidate_stage,r.latest_recommendation?"Reviewed: "+r.latest_recommendation:"Feedback needed"].filter(Boolean).map((v,i)=><span key={i}>{v}</span>)}</div></div>
   <button className="hm-button" disabled={!designPreview&&!enabled} onClick={()=>open(r)}>{r.latest_recommendation?"Update feedback":"Review"}</button></div>
   {active?.share_id===r.share_id&&<div style={{padding:18,background:"#f2f8f4",borderRadius:12,display:"grid",gap:12}}>
    <label>Decision <select value={decision} onChange={e=>setDecision(e.target.value)}><option value="proceed">Proceed</option><option value="hold">Hold</option><option value="reject">Reject</option></select></label>
    <label>Rating (1–5) <select value={rating} onChange={e=>setRating(Number(e.target.value))}>{[1,2,3,4,5].map(n=><option key={n} value={n}>{n}</option>)}</select></label>
    <label>Feedback (at least 10 characters)<textarea value={comments} onChange={e=>setComments(e.target.value)} maxLength={5000} rows={4} style={{display:"block",width:"100%",padding:12,border:"1px solid #d4e5d9",borderRadius:9}}/></label>
    <div style={{display:"flex",gap:10}}><button className="hm-button" disabled={saving||comments.trim().length<10} onClick={save}>{saving?"Saving…":"Submit review"}</button><button className="hm-button" disabled={saving} onClick={()=>setActive(null)}>Cancel</button></div>
   </div>}
  </div>)}
 </section>;
}
