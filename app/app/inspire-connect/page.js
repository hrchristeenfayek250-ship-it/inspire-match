"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import ATSNavigation from "@/components/ATSNavigation";
import {supabase} from "@/lib/supabase";

const card={background:"#fff",border:"1px solid #dce9df",borderRadius:14,padding:22,marginBottom:18};
const button={background:"#176b48",color:"#fff",padding:"10px 16px",border:0,borderRadius:8,cursor:"pointer"};
export default function InspireConnectPage(){
 const [site,setSite]=useState({slug:"",display_name:"",is_live:false});
 const [jobs,setJobs]=useState([]),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 async function load(){
  setLoading(true);setError("");
  try{
   const {data:auth,error:authError}=await supabase.auth.getUser();
   if(authError||!auth.user)throw Error("Please sign in.");
   const [a,b]=await Promise.all([supabase.rpc("get_my_inspire_career_settings"),supabase.rpc("get_my_inspire_career_jobs")]);
   if(a.error)throw a.error;if(b.error)throw b.error;
   if(a.data?.[0])setSite(a.data[0]);
   setJobs(b.data||[]);
  }catch(e){setError(e.message||"Unable to load integrations.");}
  finally{setLoading(false);}
 }
 useEffect(()=>{load()},[]);
 async function saveSite(e){
  e.preventDefault();setSaving(true);setError("");setNotice("");
  try{
   const {error:e}=await supabase.rpc("manage_inspire_career_site",{p_slug:site.slug.trim().toLowerCase(),p_display_name:site.display_name.trim(),p_is_live:site.is_live});
   if(e)throw e;setNotice("Career page settings saved.");await load();
  }catch(e){setError(e.message);}finally{setSaving(false);}
 }
 async function toggleJob(job){
  setSaving(true);setError("");setNotice("");
  try{
   const {error:e}=await supabase.rpc("set_inspire_career_job_publication",{p_job_id:job.job_id,p_published:!job.published});
   if(e)throw e;setNotice("Job publication updated.");await load();
  }catch(e){setError(e.message);}finally{setSaving(false);}
 }
 return <main style={{background:"#f6faf7",minHeight:"100vh",padding:"25px",color:"#173d2b",fontFamily:"Arial,sans-serif"}}>
 <div style={{maxWidth:1080,margin:"auto"}}><ATSNavigation/>
 <p style={{color:"#61806b",fontSize:12,marginTop:28}}>INSPIRE MATCH ATS / INTEGRATIONS</p>
 <h1>Inspire Connect — Recruitment Integrations</h1>
 <p>Connect your company career page and publish selected jobs. All channels are isolated by company.</p>
 {error&&<p role="alert" style={{color:"#ae2525"}}>{error}</p>}{notice&&<p role="status" style={{color:"#176b48"}}>{notice}</p>}
 {loading?<p>Loading…</p>:<>
 <section style={card}><h2>Company Career Page</h2><p>Nothing is published unless you turn on the site and publish individual jobs.</p>
 <form onSubmit={saveSite} style={{display:"grid",gap:12,maxWidth:520}}>
 <label>Career page address slug<input required pattern="[a-z0-9][a-z0-9-]{2,62}" value={site.slug} onChange={e=>setSite({...site,slug:e.target.value.toLowerCase()})} placeholder="my-company" style={{display:"block",padding:10,width:"100%"}}/></label>
 <label>Company display name<input required minLength={2} maxLength={120} value={site.display_name} onChange={e=>setSite({...site,display_name:e.target.value})} placeholder="Your company" style={{display:"block",padding:10,width:"100%"}}/></label>
 <label><input type="checkbox" checked={site.is_live} onChange={e=>setSite({...site,is_live:e.target.checked})}/> Make career page public</label>
 <button type="submit" disabled={saving} style={button}>{saving?"Saving…":"Save career page"}</button></form>
 {site.slug&&<p>Career page: <Link href={`/careers/${encodeURIComponent(site.slug)}`} target="_blank">/careers/{site.slug}</Link></p>}
 </section>
 <section style={card}><h2>Publish Jobs</h2><p>Choose which jobs are visible to external applicants. Salary fields are never included in the public job feed.</p>
 {jobs.length===0?<p>No jobs found for your company.</p>:jobs.map(j=><div key={j.job_id} style={{padding:"12px 0",borderBottom:"1px solid #e5ede7",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
 <span>{j.job_title} <small style={{color:"#62836d"}}>#{j.job_id}</small></span>
 <button type="button" disabled={saving} style={{...button,background:j.published?"#7d3d3d":"#176b48"}} onClick={()=>toggleJob(j)}>{j.published?"Unpublish":"Publish"}</button></div>)}
 </section>
 <section style={card}><h2>Coming next</h2><p>LinkedIn Apply Connect (subject to partner approval), recruitment email intake, branded application forms, source tracking, employee referrals and website widgets.</p><p>No LinkedIn account credentials are collected by this page.</p></section>
 </>}</div></main>;
}
