"use client";
import {useEffect,useMemo,useState} from "react";
import Link from "next/link";
import ATSNavigation from "@/components/ATSNavigation";
import {supabase} from "@/lib/supabase";
import "./inspire-connect.css";

const channels=[
 {name:"LinkedIn",tag:"Partner approval required",detail:"Apply Connect requires an approved LinkedIn ATS integration.",symbol:"in"},
 {name:"Recruitment Email",tag:"Planned",detail:"Convert incoming applications into candidate profiles.",symbol:"@"},
 {name:"Company Website",tag:"Planned",detail:"Embed your job board on an existing website.",symbol:"↗"},
 {name:"Employee Referrals",tag:"Planned",detail:"Capture and attribute employee referrals.",symbol:"◎"},
 {name:"WhatsApp Business",tag:"Planned",detail:"Candidate communications through an approved business integration.",symbol:"✉"},
 {name:"Social Campaigns",tag:"Planned",detail:"Track applications from custom campaign links.",symbol:"#"}
];
export default function InspireConnectPage(){
 const [site,setSite]=useState({slug:"",display_name:"",is_live:false});
 const [savedSite,setSavedSite]=useState(null);
 const [jobs,setJobs]=useState([]),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[busyJob,setBusyJob]=useState(null);
 const [error,setError]=useState(""),[notice,setNotice]=useState(""),[tab,setTab]=useState("overview"),[search,setSearch]=useState("");
 async function load({initial=false}={}){
  if(initial)setLoading(true);
  try{
   const {data:auth,error:authError}=await supabase.auth.getUser();
   if(authError||!auth.user)throw Error("Please sign in to manage your integrations.");
   const [a,b]=await Promise.all([supabase.rpc("get_my_inspire_career_settings"),supabase.rpc("get_my_inspire_career_jobs")]);
   if(a.error)throw a.error;if(b.error)throw b.error;
   const next=a.data?.[0]||null;
   setSavedSite(next);
   if(initial)setSite(next||{slug:"",display_name:"",is_live:false});
   setJobs(b.data||[]);
  }catch(e){setError(e.message||"Unable to load integrations.");}
  finally{if(initial)setLoading(false);}
 }
 useEffect(()=>{load({initial:true})},[]);
 async function saveSite(e){
  e.preventDefault();setSaving(true);setError("");setNotice("");
  try{
   const payload={p_slug:site.slug.trim().toLowerCase(),p_display_name:site.display_name.trim(),p_is_live:site.is_live};
   const {error:e}=await supabase.rpc("manage_inspire_career_site",payload);
   if(e)throw e;
   setSite({...site,slug:payload.p_slug,display_name:payload.p_display_name});
   setSavedSite({slug:payload.p_slug,display_name:payload.p_display_name,is_live:payload.p_is_live});
   setNotice("Career page settings saved successfully.");
  }catch(e){setError(e.message||"Unable to save settings.");}
  finally{setSaving(false);}
 }
 async function toggleJob(job){
  setBusyJob(job.job_id);setError("");setNotice("");
  try{
   const {error:e}=await supabase.rpc("set_inspire_career_job_publication",{p_job_id:job.job_id,p_published:!job.published});
   if(e)throw e;
   setJobs(current=>current.map(j=>j.job_id===job.job_id?{...j,published:!j.published}:j));
   setNotice(job.published?"Job unpublished successfully.":"Job published successfully.");
  }catch(e){setError(e.message||"Unable to change job publication.");}
  finally{setBusyJob(null);}
 }
 const published=jobs.filter(j=>j.published).length;
 const filtered=useMemo(()=>jobs.filter(j=>j.job_title?.toLowerCase().includes(search.toLowerCase())),[jobs,search]);
 const ready=Boolean(savedSite?.slug);
 const careerUrl=ready?`/careers/${encodeURIComponent(savedSite.slug)}`:"";
 return <div className="ic-shell">
 <aside className="ic-sidebar"><div className="ic-brand"><div className="ic-mark">I</div><div><strong>INSPIRE MATCH</strong><span>RECRUITMENT PLATFORM</span></div></div><div className="ic-side-label">WORKSPACE</div><ATSNavigation className="ic-nav" linkClassName="ic-nav-link"/><div className="ic-side-footer">INSPIRE CONNECT · BETA</div></aside>
 <main className="ic-main">
  <div className="ic-topbar"><div className="ic-breadcrumb">Workspace <span>/</span> Integrations <span>/</span> Inspire Connect</div><Link className="ic-toplink" href="/app/dashboard">Back to dashboard ↗</Link></div>
  <div className="ic-content">
   <div className="ic-heading"><div><div className="ic-eyebrow">RECRUITMENT ECOSYSTEM</div><h1>Inspire Connect<span className="ic-beta">BETA</span></h1><p>Manage the channels that bring talent into your recruitment workspace.</p></div><div className="ic-actions" style={{marginTop:0}}><Link href="/app/applications-inbox" className="ic-primary">Applications Inbox →</Link>{ready&&<Link href={careerUrl} target="_blank" rel="noopener noreferrer" className="ic-secondary">View Career Page ↗</Link>}</div></div>
   {error&&<div className="ic-alert ic-error" role="alert">{error}</div>}
   {notice&&<div className="ic-alert ic-success" role="status">{notice}</div>}
   {loading?<div className="ic-panel">Loading your recruitment integrations…</div>:<>
    <div className="ic-metrics">
     <div className="ic-metric"><div className="ic-metric-head">Career page <span>◈</span></div><strong>{savedSite?.is_live?"Live":"Not live"}</strong><small>{ready?"Your career portal is configured":"Set up your branded page"}</small></div>
     <div className="ic-metric"><div className="ic-metric-head">Published jobs <span>▣</span></div><strong>{published}</strong><small>Of {jobs.length} jobs in your company</small></div>
     <div className="ic-metric"><div className="ic-metric-head">Available intake channels <span>◎</span></div><strong>1</strong><small>Career page applications enabled</small></div>
    </div>
    <div className="ic-tabs" role="tablist" aria-label="Inspire Connect sections">
     {[["overview","Overview"],["career","Career Page"],["jobs","Job Publishing"],["channels","Integrations"]].map(([id,label])=><button key={id} role="tab" aria-selected={tab===id} className={tab===id?"ic-tab active":"ic-tab"} onClick={()=>setTab(id)}>{label}</button>)}
    </div>
    {tab==="overview"&&<div className="ic-two-col">
     <section className="ic-panel"><div className="ic-panel-head"><div><h2>Career Page</h2><p>Your public-facing destination for open roles.</p></div><span className={savedSite?.is_live?"ic-status live":"ic-status"}>{savedSite?.is_live?"● Live":"○ Draft"}</span></div>
      <div className="ic-preview"><span className="ic-preview-icon">◈</span><div><strong>{savedSite?.display_name||"Your Company Careers"}</strong><small>{ready?`/careers/${savedSite.slug}`:"Your custom career link will appear here"}</small></div></div>
      <div className="ic-actions"><button className="ic-primary" onClick={()=>setTab("career")}>{ready?"Manage career page":"Set up career page"}</button>{ready&&<Link className="ic-secondary" href={careerUrl} target="_blank" rel="noopener noreferrer">Open preview ↗</Link>}</div>
     </section>
     <section className="ic-panel"><div className="ic-panel-head"><div><h2>Publishing overview</h2><p>Only manually selected roles are visible.</p></div></div><div className="ic-large-count">{published}<span> published vacancies</span></div><div className="ic-progress"><div style={{width:jobs.length?`${published/jobs.length*100}%`:"0%"}}/></div><p className="ic-muted">{jobs.length-published} unpublished · {jobs.length} total jobs</p><button className="ic-secondary" onClick={()=>setTab("jobs")}>Manage job publishing →</button></section>
     <section className="ic-panel ic-full"><div className="ic-panel-head"><div><h2>Integration roadmap</h2><p>Additional sources will be activated after secure integration work.</p></div><button className="ic-text-button" onClick={()=>setTab("channels")}>View all →</button></div><div className="ic-channel-grid">{channels.slice(0,3).map(c=><div className="ic-channel" key={c.name}><span className="ic-channel-icon">{c.symbol}</span><div><strong>{c.name}</strong><small>{c.tag}</small></div></div>)}</div></section>
    </div>}
    {tab==="career"&&<section className="ic-panel ic-form-panel"><div className="ic-panel-head"><div><h2>Career Page Settings</h2><p>Create your company's public careers destination. Changes go live only after you enable the page.</p></div><span className={savedSite?.is_live?"ic-status live":"ic-status"}>{savedSite?.is_live?"● Live":"○ Draft"}</span></div>
     <form onSubmit={saveSite} className="ic-form"><label>Company display name<input required minLength={2} maxLength={120} value={site.display_name} onChange={e=>setSite({...site,display_name:e.target.value})} placeholder="e.g. Hire & Inspire by Christine"/></label><label>Career page URL slug<input required pattern="[a-z0-9][a-z0-9-]{2,62}" value={site.slug} onChange={e=>setSite({...site,slug:e.target.value.toLowerCase()})} placeholder="e.g. hire-and-inspire"/><small>3–63 characters; lowercase letters, digits and hyphens.</small></label>
     <div className="ic-switch-line"><div><strong>Make career page public</strong><small>Visitors will see only jobs that you publish individually.</small></div><label className="ic-toggle"><input type="checkbox" checked={site.is_live} onChange={e=>setSite({...site,is_live:e.target.checked})}/><span/></label></div>
     <div className="ic-actions"><button type="submit" className="ic-primary" disabled={saving}>{saving?"Saving…":"Save changes"}</button>{ready&&<Link className="ic-secondary" target="_blank" rel="noopener noreferrer" href={careerUrl}>View saved page ↗</Link>}</div></form>
    </section>}
    {tab==="jobs"&&<section className="ic-panel"><div className="ic-panel-head"><div><h2>Job Publishing</h2><p>Choose which vacancies appear on your public career page. Salary details are excluded.</p></div><span className="ic-status">{published} published</span></div><div className="ic-filter"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by job title…"/><span>{filtered.length} jobs</span></div>
     {!ready&&<div className="ic-alert">Configure and save your career page first. <button onClick={()=>setTab("career")} className="ic-text-button">Go to settings →</button></div>}
     {jobs.length===0?<div className="ic-empty">No jobs found for this company yet.</div>:filtered.length===0?<div className="ic-empty">No matching job titles.</div>:<div className="ic-job-list">{filtered.map(job=><div key={job.job_id} className="ic-job"><div><strong>{job.job_title}</strong><small>Job #{job.job_id}</small></div><div className="ic-job-actions"><span className={job.published?"ic-status live":"ic-status"}>{job.published?"Published":"Unpublished"}</span><button disabled={busyJob!==null||!ready} className={job.published?"ic-secondary":"ic-primary"} onClick={()=>toggleJob(job)}>{busyJob===job.job_id?"Updating…":job.published?"Unpublish":"Publish"}</button></div></div>)}</div>}
    </section>}
    {tab==="channels"&&<section className="ic-panel"><div className="ic-panel-head"><div><h2>Integration Channels</h2><p>Planned integrations are displayed for roadmap visibility, not as active connections.</p></div></div><div className="ic-channel-grid">{channels.map(c=><div className="ic-channel ic-channel-detailed" key={c.name}><span className="ic-channel-icon">{c.symbol}</span><div><strong>{c.name}</strong><small>{c.detail}</small><em>{c.tag}</em></div></div>)}</div></section>}
    <div className="ic-note">Security note: applicants submit CVs into a private staging inbox. Importing into the candidate pipeline and LinkedIn synchronization are not yet enabled.</div>
   </>}
  </div>
 </main></div>;
}