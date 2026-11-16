"use client";
import {useEffect,useState} from "react";
import {supabase} from "@/lib/supabase";

export default function RecruiterHiringManagerShare({candidateId}) {
 const [applications,setApplications]=useState([]);
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState("");
 const [refreshing,setRefreshing]=useState(false);
 const [error,setError]=useState("");
 const [message,setMessage]=useState("");
 const [authorized,setAuthorized]=useState(false);
 async function load(){
  if(!candidateId)return;
  setRefreshing(true);setError("");
  try{
   const {data:auth,error:authError}=await supabase.auth.getUser();
   if(authError||!auth?.user)throw new Error("Sign in to share candidates.");
   const {data:memberships,error:memberError}=await supabase.from("company_members").select("company_id,role").eq("user_id",auth.user.id).limit(2);
   if(memberError)throw memberError;
   if(memberships?.length!==1||!["admin","hr_manager","senior_recruiter","hr","recruiter","hr_specialist"].includes(String(memberships[0].role).toLowerCase())){setAuthorized(false);return;}
   setAuthorized(true);
   const companyId=memberships[0].company_id;
   const {data:apps,error:appsError}=await supabase.from("applications").select("id,job_id,stage").eq("candidate_id",candidateId).eq("company_id",companyId);
   if(appsError)throw appsError;
   if(!apps?.length){setApplications([]);return;}
   const jobIds=[...new Set(apps.map(a=>a.job_id).filter(Boolean))];
   const {data:jobs,error:jobsError}=await supabase.from("jobs").select("id,title,hiring_manager_user_id").eq("company_id",companyId).in("id",jobIds);
   if(jobsError)throw jobsError;
   const lookup=new Map((jobs||[]).map(j=>[j.id,j]));
   setApplications(apps.map(a=>({...a,job:lookup.get(a.job_id)})).filter(a=>a.job));
  }catch(e){setError(e?.message||"Could not load candidate applications.");}
  finally{setLoading(false);setRefreshing(false);}
 }
 useEffect(()=>{load();},[candidateId]);
 async function share(application){
  if(busy)return;
  if(!application.job?.hiring_manager_user_id){setError("Assign a Hiring Manager to the job before sharing.");return;}
  setBusy(application.id);setError("");setMessage("");
  try{
   const {error:rpcError}=await supabase.rpc("share_candidate_with_hiring_manager",{p_application_id:application.id});
   if(rpcError)throw rpcError;
   setMessage("Candidate shared with the assigned Hiring Manager. They can now review and submit feedback in their workspace.");
  }catch(e){setError(e?.message||"Could not share candidate.");}
  finally{setBusy("");}
 }
 if(loading)return <section style={{padding:20,background:"#fff",borderRadius:14,marginBottom:20}}>Loading Hiring Manager sharing…</section>;
 if(!authorized)return null;
 return <section style={{padding:24,background:"#fff",border:"1px solid #dce9df",borderRadius:16,marginBottom:22}}>
  <div style={{display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap",alignItems:"center"}}><h2 style={{marginTop:0,color:"#185b3e"}}>Share with Hiring Manager</h2><button type="button" onClick={load} disabled={refreshing||!!busy} style={{border:"1px solid #bcd9c5",color:"#176846",background:"#edf6ef",borderRadius:9,padding:"9px 14px",cursor:"pointer"}}>{refreshing?"Refreshing…":"Refresh assigned jobs"}</button></div>
  <p style={{color:"#6d8174",fontSize:13}}>Share this candidate for a specific job. Only the assigned Hiring Manager will receive access through the secure review workflow. No compensation is shared.</p>
  {error&&<p role="alert" style={{color:"#a52626"}}>{error}</p>}
  {message&&<p role="status" style={{color:"#176846"}}>{message}</p>}
  {!applications.length?<p style={{color:"#718477"}}>Assign this candidate to a job first, then share them with its Hiring Manager.</p>:applications.map(a=><div key={a.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:14,padding:"15px 0",borderTop:"1px solid #e7eee9",flexWrap:"wrap"}}>
   <div><strong>{a.job?.title||"Job"}</strong><p style={{margin:"5px 0",fontSize:12,color:"#718477"}}>Stage: {a.stage||"Applied"} · {a.job?.hiring_manager_user_id?"Hiring Manager assigned":"No Hiring Manager assigned"}</p></div>
   <button type="button" disabled={!!busy||!a.job?.hiring_manager_user_id} onClick={()=>share(a)} style={{background:"#176846",color:"#fff",border:0,borderRadius:9,padding:"11px 16px",cursor:"pointer",opacity:(busy||!a.job?.hiring_manager_user_id)?0.5:1}}>{busy===a.id?"Sharing…":"Share Candidate"}</button>
  </div>)}
 </section>;
}
