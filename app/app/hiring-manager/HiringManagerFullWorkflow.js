"use client";
import {useEffect,useMemo,useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import ATSNavigation from "@/components/ATSNavigation";
import {supabase} from "@/lib/supabase";
import "./workflow.css";

const demoJobs=[{job_id:"demo1",job_title:"Senior Product Designer",department:"Design",location:"Cairo",job_status:"Active",priority:"High"},{job_id:"demo2",job_title:"React Native Developer",department:"Technology",location:"Remote",job_status:"Active",priority:"High"}];
const demoCandidates=[{share_id:"s1",job_id:"demo1",candidate_name:"Sample Candidate A",candidate_title:"Product Designer",candidate_stage:"Shortlisted"},{share_id:"s2",job_id:"demo2",candidate_name:"Sample Candidate B",candidate_title:"Mobile Engineer",candidate_stage:"Interview",latest_recommendation:"hold",latest_comments:"Needs another technical interview",latest_rating:3}];
const demoOffers=[{offer_id:"o1",job_title:"Senior Product Designer",step_name:"Hiring Manager Approval",step_status:"pending"}];
const allowed=["hiring_manager","admin","hr_manager"];
export default function HiringManagerFullWorkflow() {
  const router=useRouter();
  const [preview,setPreview]=useState(false),[role,setRole]=useState(""),[busy,setBusy]=useState(true),[saving,setSaving]=useState(false);
  const [jobs,setJobs]=useState([]),[candidates,setCandidates]=useState([]),[offers,setOffers]=useState([]);
  const [errors,setErrors]=useState([]),[message,setMessage]=useState("");
  const [tab,setTab]=useState("all"),[search,setSearch]=useState(""),[jobFilter,setJobFilter]=useState("all"),[stage,setStage]=useState("all"),[reviewStatus,setReviewStatus]=useState("all");
  const [selectedCandidate,setSelectedCandidate]=useState(null),[review,setReview]=useState({recommendation:"proceed",rating:3,comments:""});
  const [selectedOffer,setSelectedOffer]=useState(null),[offerComment,setOfferComment]=useState("");
  async function fetchWorkflow(roleValue) {
    const [j,c,o]=await Promise.all([
      roleValue==="hiring_manager"?supabase.rpc("get_my_hiring_manager_jobs"):Promise.resolve({data:[],error:null}),
      roleValue==="hiring_manager"?supabase.rpc("get_my_hiring_candidate_reviews"):Promise.resolve({data:[],error:null}),
      supabase.rpc("get_my_hiring_decisions")
    ]);
    setJobs(j.error?[]:Array.isArray(j.data)?j.data:[]);
    setCandidates(c.error?[]:Array.isArray(c.data)?c.data:[]);
    setOffers(o.error?[]:Array.isArray(o.data)?o.data:[]);
    setErrors([j.error?"Assigned jobs database migration is not active.":null,c.error?"Candidate sharing and review migration is not active.":null,o.error?"Offer approval inbox could not be loaded.":null].filter(Boolean));
  }
  useEffect(()=>{
    let alive=true;
    (async()=>{
      try{
        const {data:auth,error}=await supabase.auth.getUser();
        if(error)throw error;
        if(!auth?.user){router.replace("/app/login");return;}
        if(new URLSearchParams(window.location.search).get("designPreview")==="1"){
          if(alive){setPreview(true);setJobs(demoJobs);setCandidates(demoCandidates);setOffers(demoOffers);}
          return;
        }
        const {data:memberships,error:memberError}=await supabase.from("company_members").select("company_id,role").eq("user_id",auth.user.id).limit(2);
        if(memberError)throw memberError;
        const r=memberships?.length===1&&memberships[0].company_id?String(memberships[0].role||"").toLowerCase():"";
        if(!allowed.includes(r))throw Error("Hiring Manager, HR Manager or Admin authorization is required.");
        if(alive){setRole(r);await fetchWorkflow(r);}
      }catch(e){if(alive)setErrors([e.message||"Could not load workspace"]);}
      finally{if(alive)setBusy(false);}
    })();
    return()=>{alive=false;};
  },[router]);
  const visibleOffers=offers.filter(x=>["pending","pending approval","awaiting approval"].includes(String(x.step_status||"").toLowerCase()));
  const norm=x=>String(x||"").toLowerCase();
  const match=x=>[x.job_title,x.candidate_name,x.candidate_title,x.department,x.location,x.step_name].some(y=>norm(y).includes(norm(search)));
  const filteredJobs=jobs.filter(x=>(jobFilter==="all"||x.job_id===jobFilter)&&match(x));
  const filteredCandidates=candidates.filter(x=>(jobFilter==="all"||x.job_id===jobFilter)&&(stage==="all"||norm(x.candidate_stage)===stage)&&(reviewStatus==="all"||(reviewStatus==="pending"?!x.latest_recommendation:!!x.latest_recommendation))&&match(x));
  const filteredOffers=visibleOffers.filter(match);
  const refresh=async()=>{if(preview||busy||saving)return;setBusy(true);setMessage("");try{await fetchWorkflow(role);}finally{setBusy(false);}};
  async function submitReview(){
    if(!selectedCandidate||saving)return;
    if(review.comments.trim().length<10){setMessage("Please write at least 10 characters of feedback.");return;}
    if(preview){setCandidates(prev=>prev.map(x=>x.share_id===selectedCandidate.share_id?{...x,latest_recommendation:review.recommendation,latest_rating:Number(review.rating),latest_comments:review.comments}:x));setSelectedCandidate(null);setMessage("Sample review updated locally — nothing saved in database.");return;}
    setSaving(true);setMessage("");
    try{
      const {error}=await supabase.rpc("submit_hiring_candidate_review",{p_share_id:selectedCandidate.share_id,p_recommendation:review.recommendation,p_rating:Number(review.rating),p_comments:review.comments.trim()});
      if(error)throw error;
      await fetchWorkflow(role);setSelectedCandidate(null);setMessage("Candidate evaluation saved to history.");
    }catch(e){setMessage(e.message||"Failed to save review.");}
    finally{setSaving(false);}
  }
  async function submitOffer(){
    if(!selectedOffer||saving)return;
    if(selectedOffer.action!=="approved"&&!offerComment.trim()){setMessage("Please provide a reason.");return;}
    if(preview){setOffers(prev=>prev.filter(x=>x.offer_id!==selectedOffer.offer_id));setSelectedOffer(null);setMessage("Sample offer decision updated locally.");return;}
    setSaving(true);setMessage("");
    try{
      const {error}=await supabase.rpc("decide_offer_approval",{p_offer_id:selectedOffer.offer_id,p_action:selectedOffer.action,p_comments:offerComment.trim()||null});
      if(error)throw error;
      await fetchWorkflow(role);setSelectedOffer(null);setMessage("Offer decision saved.");
    }catch(e){setMessage(e.message||"Offer decision could not be saved.");}
    finally{setSaving(false);}
  }
  return <main className="hw-page"><aside className="hw-sidebar"><div className="hw-brand">✦ Inspire Match <small>HIRING MANAGER</small></div><ATSNavigation className="hw-nav"/><div className="hw-side-note">Job-scoped review access · Compensation hidden</div></aside>
  <div className="hw-body">
    <header className="hw-header"><div><div className="hw-eyebrow">HIRING MANAGER WORKSPACE</div><h1>My Hiring Reviews</h1><p>Manage assigned requisitions, shared candidate reviews and job offer approvals.</p></div><button className="hw-primary" disabled={busy||preview} onClick={refresh}>↻ Refresh</button></header>
    {preview&&<div className="hw-banner">DESIGN PREVIEW — Sample information only. Actions update this preview, not real records.</div>}
    {!!errors.length&&<div className="hw-error">{errors.map((x,i)=><div key={i}>{x}</div>)}</div>}
    {message&&<div className="hw-banner" role="status">{message}</div>}
    {busy?<div className="hw-panel">Loading your assigned work…</div>:<>
      <div className="hw-stats"><div><span>Assigned Jobs</span><strong>{jobs.length}</strong></div><div><span>Awaiting Candidate Feedback</span><strong>{candidates.filter(x=>!x.latest_recommendation).length}</strong></div><div><span>Reviewed Candidates</span><strong>{candidates.filter(x=>x.latest_recommendation).length}</strong></div><div><span>Pending Offer Approvals</span><strong>{visibleOffers.length}</strong></div></div>
      <nav className="hw-tabs">{[["all","All Work"],["jobs","My Jobs"],["candidates","Candidate Reviews"],["offers","Offer Approvals"]].map(([key,label])=><button key={key} className={tab===key?"active":""} onClick={()=>setTab(key)}>{label}</button>)}</nav>
      <div className="hw-filters"><input aria-label="Search" placeholder="Search jobs, candidates, departments…" value={search} onChange={e=>setSearch(e.target.value)}/><select aria-label="Job filter" value={jobFilter} onChange={e=>setJobFilter(e.target.value)}><option value="all">All jobs</option>{jobs.map(j=><option key={j.job_id} value={j.job_id}>{j.job_title}</option>)}</select><select aria-label="Stage filter" value={stage} onChange={e=>setStage(e.target.value)}><option value="all">All stages</option>{["Applied","Screening","Interview","Shortlisted","Hired","Rejected"].map(x=><option key={x} value={x.toLowerCase()}>{x}</option>)}</select><select aria-label="Review filter" value={reviewStatus} onChange={e=>setReviewStatus(e.target.value)}><option value="all">All feedback</option><option value="pending">Awaiting feedback</option><option value="reviewed">Reviewed</option></select></div>
      {(tab==="all"||tab==="jobs")&&<section className="hw-panel"><div className="hw-panel-title"><h2>My Assigned Jobs</h2><span>{filteredJobs.length} Jobs</span></div>{filteredJobs.length===0?<div className="hw-empty">No assigned jobs match these filters.</div>:filteredJobs.map(j=><div className="hw-item" key={j.job_id}><div><strong>{j.job_title}</strong>{preview&&<em> SAMPLE</em>}<p>{[j.department,j.location,j.job_status,j.priority&&j.priority+" priority"].filter(Boolean).join(" · ")}</p></div><span className="hw-pill">Assigned</span></div>)}</section>}
      {(tab==="all"||tab==="candidates")&&<section className="hw-panel"><div className="hw-panel-title"><h2>Candidate Review Queue</h2><span>{filteredCandidates.length} shared profiles</span></div>{filteredCandidates.length===0?<div className="hw-empty">No candidates shared with this Hiring Manager for the selected filters.</div>:filteredCandidates.map(c=><div key={c.share_id}><div className="hw-item"><div><strong>{c.candidate_name}</strong>{preview&&<em> SAMPLE</em>}<p>{[c.candidate_title,c.job_title,c.candidate_stage].filter(Boolean).join(" · ")}</p><p>{c.latest_recommendation?"Last decision: "+c.latest_recommendation+" · Rating: "+(c.latest_rating||"—"):"Needs feedback"}</p>{c.latest_comments&&<p>Feedback: {c.latest_comments}</p>}</div><button className="hw-secondary" onClick={()=>{setSelectedCandidate(c);setReview({recommendation:c.latest_recommendation||"proceed",rating:c.latest_rating||3,comments:""});setMessage("");}}>Evaluate</button></div>{selectedCandidate?.share_id===c.share_id&&<div className="hw-form"><h3>Candidate Evaluation · {c.candidate_name}</h3><label>Recommendation<select value={review.recommendation} onChange={e=>setReview({...review,recommendation:e.target.value})}><option value="proceed">Proceed</option><option value="hold">Hold</option><option value="reject">Reject</option></select></label><label>Rating<select value={review.rating} onChange={e=>setReview({...review,rating:Number(e.target.value)})}>{[1,2,3,4,5].map(x=><option key={x} value={x}>{x}/5</option>)}</select></label><label>Evidence-based feedback<textarea placeholder="Strengths, gaps, observations and next steps (at least 10 characters)" value={review.comments} onChange={e=>setReview({...review,comments:e.target.value})}/></label><div className="hw-actions"><button className="hw-primary" disabled={saving} onClick={submitReview}>Submit Review</button><button className="hw-secondary" onClick={()=>setSelectedCandidate(null)}>Cancel</button></div></div>}</div>)}<p className="hw-footnote">Only recruiter-shared candidates may appear here. Their CV files are not exposed without a separate secure document access policy.</p></section>}
      {(tab==="all"||tab==="offers")&&<section className="hw-panel"><div className="hw-panel-title"><h2>Job Offers Pending Approval</h2><span>{filteredOffers.length} pending</span></div>{filteredOffers.length===0?<div className="hw-empty">No pending offers match the filters.</div>:filteredOffers.map(o=><div key={o.offer_id}><div className="hw-item"><div><strong>{o.job_title}</strong>{preview&&<em> SAMPLE</em>}<p>{o.step_name||"Approval step"} · Pending</p></div><div className="hw-actions">{[["approved","Approve"],["changes_requested","Request Changes"],["rejected","Reject"]].map(([action,label])=><button key={action} className="hw-secondary" onClick={()=>{setSelectedOffer({...o,action});setOfferComment("");setMessage("");}}>{label}</button>)}</div></div>{selectedOffer?.offer_id===o.offer_id&&<div className="hw-form"><h3>Confirm {selectedOffer.action.replace("_"," ")}</h3><label>Comments<textarea placeholder="Reason required for rejection or changes" value={offerComment} onChange={e=>setOfferComment(e.target.value)}/></label><div className="hw-actions"><button className="hw-primary" disabled={saving} onClick={submitOffer}>Confirm Decision</button><button className="hw-secondary" onClick={()=>setSelectedOffer(null)}>Cancel</button></div></div>}</div>)}<p className="hw-footnote">No salary, compensation or offer financial fields are requested. Decisions use the existing authorized approval RPC.</p></section>}
    </>}
  </div></main>;
}
