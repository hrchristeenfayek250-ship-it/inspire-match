"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import ATSNavigation from "@/components/ATSNavigation";
import HiringCandidateReviews from "@/components/HiringCandidateReviews";
import HiringOfferApprovals from "@/components/HiringOfferApprovals";

const pending = (item) => ["pending","pending approval","awaiting approval"].includes(String(item.step_status || "").toLowerCase());
const sampleJobs = [
  { job_id:"demo-job-1",job_title:"Senior Product Designer",department:"Design",location:"Cairo",job_status:"Active",priority:"High" },
  { job_id:"demo-job-2",job_title:"React Native Developer",department:"Technology",location:"Remote",job_status:"Active",priority:"Medium" },
];
const sampleOffers = [
  {offer_id:"demo-offer-1",job_title:"Senior Product Designer",step_name:"Hiring Manager Approval",step_status:"pending"}
];
const roles = ["hiring_manager","admin","hr_manager"];

export default function HiringManagerPage() {
  const router = useRouter();
  const [loading,setLoading] = useState(true);
  const [refreshing,setRefreshing] = useState(false);
  const [error,setError] = useState("");
  const [jobsError,setJobsError] = useState("");
  const [jobs,setJobs] = useState([]);
  const [offers,setOffers] = useState([]);
  const [designPreview,setDesignPreview] = useState(false);
  const [role,setRole] = useState("");
  const [search,setSearch] = useState("");
  const [statusFilter,setStatusFilter] = useState("all");
  const [jobFilter,setJobFilter] = useState("all");
  const [expandedJob,setExpandedJob] = useState(null);
  const [candidateJob,setCandidateJob] = useState("all");
  const [workspaceTab,setWorkspaceTab] = useState("all");
  const [reviewRefreshToken,setReviewRefreshToken] = useState(0);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const {data:auth,error:authError} = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!auth?.user) { router.replace("/app/login"); return; }

        // For visual inspection only: zero real data queries, no authorization bypass for backend RPCs.
        if (new URLSearchParams(window.location.search).get("designPreview") === "1") {
          if (active) setDesignPreview(true);
          return;
        }
        const {data:memberships,error:memberError} = await supabase.from("company_members")
          .select("company_id,role").eq("user_id",auth.user.id).limit(2);
        if (memberError) throw memberError;
        const resolvedRole = memberships?.length === 1 && memberships[0].company_id
          ? String(memberships[0].role || "").toLowerCase() : "";
        if (!roles.includes(resolvedRole)) throw new Error("This workspace requires an authorized Hiring Manager, HR Manager, or Admin account.");
        const [offerResult,jobResult] = await Promise.all([
          supabase.rpc("get_my_hiring_decisions"),
          resolvedRole === "hiring_manager"
            ? supabase.rpc("get_my_hiring_manager_jobs")
            : Promise.resolve({data:[],error:null}),
        ]);
        if (offerResult.error) throw offerResult.error;
        if (active) {
          setRole(resolvedRole);
          setOffers(Array.isArray(offerResult.data) ? offerResult.data : []);
          setJobs(jobResult.error ? [] : Array.isArray(jobResult.data) ? jobResult.data : []);
          setJobsError(jobResult.error ? "Assigned Jobs requires the new secure Supabase migration. No job records were loaded." : "");
        }
      } catch(e) { if (active) setError(e?.message || "Unable to load workspace."); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  },[router]);

  async function refresh() {
    if (refreshing || designPreview || !roles.includes(role)) return;
    setRefreshing(true);
    setError("");
    try {
      const [offerResult,jobResult] = await Promise.all([
        supabase.rpc("get_my_hiring_decisions"),
        role === "hiring_manager" ? supabase.rpc("get_my_hiring_manager_jobs") : Promise.resolve({data:[],error:null})
      ]);
      if (offerResult.error) throw offerResult.error;
      setOffers(Array.isArray(offerResult.data) ? offerResult.data : []);
      setJobs(jobResult.error ? [] : Array.isArray(jobResult.data) ? jobResult.data : []);
      setJobsError(jobResult.error ? "Assigned Jobs requires the secure Supabase migration." : "");
      setReviewRefreshToken(n=>n+1);
    } catch(e) { setError(e?.message || "Could not refresh workspace."); }
    finally { setRefreshing(false); }
  }

  const visibleJobs = designPreview ? sampleJobs : jobs;
  const filteredJobs = visibleJobs.filter(j => (jobFilter === "all" || j.job_id === jobFilter) && (statusFilter === "all" || String(j.job_status || "").toLowerCase() === statusFilter) && [j.job_title,j.department,j.location].join(" ").toLowerCase().includes(search.toLowerCase()));
  const visibleOffers = designPreview ? sampleOffers : offers.filter(pending);
  const activeJobs = visibleJobs.filter(j=>String(j.job_status||"").toLowerCase()==="active").length;
  return (
    <main className="hm-shell">
      <style>{`
        .hm-shell{min-height:100vh;background:#f5f8f6;color:#19392b;font-family:Arial,sans-serif}
        .hm-layout{display:grid;grid-template-columns:250px minmax(0,1fr);min-height:100vh}
        .hm-sidebar{background:white;border-right:1px solid #e2eae4;padding:26px 16px}
        .hm-brand{display:flex;align-items:center;gap:12px;margin-bottom:30px;padding-bottom:22px;border-bottom:1px solid #e5ebe7;font-size:19px;font-weight:800;color:#18553a}
        .hm-logo{background:#1d6247;color:white;border-radius:12px;padding:11px 16px}
        .hm-nav{display:grid;gap:7px}.hm-nav a{color:#466352;display:flex;align-items:center;gap:12px;text-decoration:none;padding:13px;border-radius:10px;font-weight:700;font-size:13px}
        .hm-nav a.active,.hm-nav a:hover{background:#e9f4ed;color:#145c3b}
        .hm-main{padding:42px clamp(18px,4vw,64px);min-width:0;max-width:1400px;width:100%;margin:auto}
        .hm-top{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px}
        .hm-eyebrow{color:#168253;font-weight:800;letter-spacing:1.5px;font-size:11px;text-transform:uppercase}
        .hm-main h1{font-size:clamp(28px,3vw,40px);margin:12px 0;letter-spacing:-1px}
        .hm-muted{color:#75887d;font-size:13px;line-height:1.7}
        .hm-button{background:#176846;color:#fff;border:0;padding:13px 20px;border-radius:10px;font-weight:800;cursor:pointer}
        .hm-button:disabled{opacity:.5}
        .hm-hero{background:linear-gradient(120deg,#104730,#228156);color:white;border-radius:18px;padding:27px;margin:28px 0}
        .hm-hero h2{margin:0 0 9px;font-size:24px;color:white}.hm-hero p{margin:0;color:#dcefe4;font-size:13px}
        .hm-stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:15px}
        .hm-stat,.hm-panel{background:white;border:1px solid #deebe2;border-radius:16px;padding:24px}
        .hm-stat span{color:#738579;font-size:12px;font-weight:700}.hm-stat strong{display:block;font-size:35px;margin-top:12px}
        .hm-panel{margin-top:23px}.hm-panel-head{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:18px}
        .hm-panel h2{margin:0;font-size:20px}.hm-row{display:flex;justify-content:space-between;align-items:center;gap:14px;border-top:1px solid #eaf0eb;padding:18px 0}
        .hm-row strong{font-size:15px}.hm-detail{display:flex;gap:7px;flex-wrap:wrap;margin-top:11px}
        .hm-detail span{font-size:11px;color:#577365;background:#eff5f0;padding:6px 9px;border-radius:7px}
.hm-job-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.hm-button-secondary{background:#ecf5ee;color:#176846;border:1px solid #cfe3d3}.hm-tabs{display:flex;gap:9px;flex-wrap:wrap;margin:22px 0}.hm-tabs button{border:1px solid #d7e6dc;border-radius:99px;background:#fff;color:#356b50;padding:10px 18px;font-weight:800;cursor:pointer}.hm-tabs button.active{background:#176846;color:white;border-color:#176846}.hm-job-expanded{padding:18px;background:#f6faf7;border:1px solid #dbeadf;border-radius:12px;margin-bottom:12px}.hm-job-expanded dl{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin:0}.hm-job-expanded dt{font-size:11px;color:#809285;font-weight:700}.hm-job-expanded dd{margin:6px 0 0;font-weight:700}.hm-pill{font-size:11px;font-weight:800;color:#865c22;background:#fff3dc;border-radius:30px;padding:9px 12px}
        .hm-link{color:#186e4c;text-decoration:none;font-size:13px;font-weight:800}
        .hm-empty{text-align:center;padding:34px 15px;background:#fafcfa;color:#75887d;border:1px dashed #d8e7da;border-radius:12px;font-size:13px}
        .hm-note{background:#eaf5ed;padding:15px;color:#145b3e;border-radius:11px;font-size:13px;margin:20px 0}
        .hm-error{background:#fff2f0;border:1px solid #efbab5;color:#972a22;border-radius:11px;padding:15px;margin:20px 0;font-size:13px}
.hm-filters{display:flex;gap:10px;flex-wrap:wrap;margin:15px 0}.hm-filters input,.hm-filters select{border:1px solid #d7e5da;border-radius:9px;padding:11px;color:#24533b;background:white;font:inherit}.hm-filters input{flex:1;min-width:160px}.hm-sample{display:inline-block;background:#fff0db;color:#966222;border-radius:6px;font-size:10px;font-weight:800;padding:4px 8px;margin-left:9px}
        @media(max-width:850px){.hm-layout{grid-template-columns:1fr}.hm-sidebar{border-right:0;border-bottom:1px solid #e2eae4;padding:15px}.hm-brand{margin-bottom:12px;padding-bottom:12px}.hm-nav{display:flex;flex-wrap:wrap}.hm-main{padding:25px 16px}.hm-stats{grid-template-columns:1fr}}
      `}</style>
      <div className="hm-layout">
        <aside className="hm-sidebar">
          <div className="hm-brand"><span className="hm-logo">I</span> Inspire Match</div>
          <ATSNavigation className="hm-nav" />
          <p className="hm-muted">Hiring Manager · Restricted Workspace</p>
        </aside>
        <div className="hm-main">
          <div className="hm-top">
            <div><div className="hm-eyebrow">Hiring manager workspace</div>
              <h1>My Hiring Reviews</h1>
              <p className="hm-muted">Assigned jobs and offer decisions in one place. No compensation details.</p></div>
            <button className="hm-button" disabled={loading || refreshing || designPreview} onClick={refresh}>
              {refreshing ? "Refreshing…" : "↻ Refresh"}
            </button>
          </div>
          {designPreview && <div role="status" className="hm-note"><strong>Design preview · Sample data only.</strong> No live job or offer records have been loaded or modified.</div>}
          {error && <div className="hm-error" role="alert">{error}</div>}
          {jobsError && !designPreview && <div className="hm-error" role="alert">{jobsError}</div>}
          {loading ? <p className="hm-muted" style={{marginTop:30}}>Checking your access and assigned decisions…</p> :
           !error ? <>
            <div className="hm-hero"><h2>Focused hiring. Better decisions.</h2><p>See work assigned to you and action pending offer approvals.</p></div>
            <div className="hm-stats">
              <div className="hm-stat"><span>Jobs assigned to me</span><strong>{jobsError ? "—" : visibleJobs.length}</strong></div>
              <div className="hm-stat"><span>Job offers awaiting approval</span><strong>{visibleOffers.length}</strong></div>
              <div className="hm-stat"><span>Active assigned jobs</span><strong>{activeJobs}</strong></div>
            </div>
            <nav className="hm-tabs" aria-label="Hiring workspace sections">{[["all","All"],["jobs","Assigned Jobs"],["candidates","Candidate Reviews"],["offers","Job Offers"]].map(([id,label])=><button key={id} type="button" className={workspaceTab===id?"active":""} onClick={()=>setWorkspaceTab(id)}>{label}</button>)}</nav>
            {(workspaceTab==="all" || workspaceTab==="jobs") && <section className="hm-panel">
              <div className="hm-panel-head"><h2>My Assigned Jobs</h2>{designPreview && <span className="hm-sample">SAMPLE</span>}</div>
              <div className="hm-filters"><input aria-label="Search jobs" placeholder="Search job title, department or location" value={search} onChange={e=>setSearch(e.target.value)}/><select aria-label="Filter by job" value={jobFilter} onChange={e=>setJobFilter(e.target.value)}><option value="all">All jobs</option>{visibleJobs.map(j=><option key={j.job_id} value={j.job_id}>{j.job_title}</option>)}</select><select aria-label="Filter by status" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="all">All statuses</option><option value="active">Active</option><option value="paused">Paused</option><option value="closed">Closed</option></select></div>
              {jobsError && !designPreview ? <div className="hm-empty">Secure Assigned Jobs access has not yet been activated in Supabase.</div> :
               filteredJobs.length === 0 ? <div className="hm-empty">{role === "admin" || role === "hr_manager" ? "This manager overview does not display other users' job assignments." : "No jobs are assigned to this Hiring Manager account yet."}</div> :
               filteredJobs.map(job => <div key={job.job_id}><div className="hm-row"><div><strong>{job.job_title || "Untitled job"}</strong>
                 {designPreview && <span className="hm-sample">SAMPLE</span>}
                 <div className="hm-detail">{[job.department,job.location,job.job_status,job.priority && job.priority+" priority"].filter(Boolean).map((v,i)=><span key={i}>{v}</span>)}</div>
                 </div><div className="hm-job-actions"><button type="button" className="hm-button hm-button-secondary" onClick={()=>setExpandedJob(current=>current===job.job_id?null:job.job_id)} aria-expanded={expandedJob===job.job_id}>{expandedJob===job.job_id?"Hide details":"View details"}</button><button type="button" className="hm-button" onClick={()=>{setCandidateJob(job.job_id);setWorkspaceTab("candidates");}}>Review candidates</button></div></div>{expandedJob===job.job_id && <div className="hm-job-expanded"><strong>Job Overview</strong><dl>{[["Job title",job.job_title],["Department",job.department],["Location",job.location],["Status",job.job_status],["Priority",job.priority],["Hiring deadline",job.hiring_deadline]].filter(([,v])=>v).map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><p className="hm-muted">Only approved non-financial job fields are available in this view.</p></div>}</div>)}
              <p className="hm-muted">Candidate reviews need secure recruiter-sharing permissions. Job details with salary are not linked here.</p>
            </section>}
            {(workspaceTab==="all" || workspaceTab==="candidates") && <HiringCandidateReviews designPreview={designPreview} enabled={role === "hiring_manager"} selectedJobId={candidateJob} onJobFilterChange={setCandidateJob} refreshToken={reviewRefreshToken} />}
            {(workspaceTab==="all" || workspaceTab==="offers") && <HiringOfferApprovals offers={visibleOffers} designPreview={designPreview} onDecided={refresh} />}
          </> : null}
        </div>
      </div>
    </main>
  );
}
