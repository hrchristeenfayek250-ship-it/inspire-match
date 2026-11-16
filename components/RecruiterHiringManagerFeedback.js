"use client";
import {useEffect,useState} from "react";
import {supabase} from "@/lib/supabase";

const dateText=value=>value?new Date(value).toLocaleString("en-GB"):"";
export default function RecruiterHiringManagerFeedback({candidateId}) {
 const [items,setItems]=useState([]),[loading,setLoading]=useState(true);
 const [error,setError]=useState(""),[refreshing,setRefreshing]=useState(false);
 async function refresh(initial=false){
  if(!candidateId)return;
  if(initial)setLoading(true);else setRefreshing(true);
  setError("");
  try {
   const {data:auth,error:authError}=await supabase.auth.getUser();
   if(authError||!auth?.user)throw new Error("Sign in to see Hiring Manager feedback.");
   const {data:memberships,error:memberError}=await supabase.from("company_members").select("company_id,role").eq("user_id",auth.user.id).limit(2);
   if(memberError)throw memberError;
   if(memberships?.length!==1 || !["admin","hr_manager","senior_recruiter","hr","recruiter","hr_specialist"].includes(String(memberships[0].role).toLowerCase())){setItems([]);return;}
   const {data,error:rpcError}=await supabase.rpc("get_candidate_hiring_manager_feedback",{p_candidate_id:candidateId});
   if(rpcError)throw rpcError;
   setItems(Array.isArray(data)?data:[]);
  }catch(e){setError(e?.message||"Could not load Hiring Manager feedback.");}
  finally{setLoading(false);setRefreshing(false);}
 }
 useEffect(()=>{refresh(true);},[candidateId]);
 return <section style={{padding:24,background:"#fff",border:"1px solid #dce9df",borderRadius:16,marginBottom:22}}>
  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}>
   <div><h2 style={{margin:"0 0 8px",color:"#185b3e"}}>Hiring Manager Decisions &amp; Feedback</h2><p style={{fontSize:13,color:"#718477",margin:"0 0 14px"}}>Feedback submitted by assigned Hiring Managers for this candidate.</p></div>
   <button type="button" disabled={loading||refreshing} onClick={()=>refresh()} style={{background:"#176846",border:0,borderRadius:9,padding:"10px 15px",color:"white",cursor:"pointer"}}>{refreshing?"Refreshing…":"Refresh feedback"}</button>
  </div>
  {error&&<p role="alert" style={{color:"#a52626"}}>{error}</p>}
  {loading?<p>Loading reviews…</p>:!items.length?<p style={{color:"#718477"}}>No Hiring Manager feedback has been submitted yet.</p>:items.map((item,i)=><article key={i} style={{padding:16,border:"1px solid #e3ebe5",borderRadius:12,marginTop:10}}>
   <div style={{display:"flex",gap:10,justifyContent:"space-between",flexWrap:"wrap"}}><strong>{item.job_title||"Assigned job"}</strong><span style={{fontWeight:700,color:"#176846"}}>{String(item.recommendation||"").toUpperCase()}</span></div>
   <p style={{fontSize:12,color:"#718477"}}>Rating: {item.rating??"—"}/5 · {dateText(item.reviewed_at)} · Stage: {item.candidate_stage||"—"}</p>
   <p style={{whiteSpace:"pre-wrap",lineHeight:1.6,marginBottom:0}}>{item.comments||"No comments."}</p>
  </article>)}
 </section>;
}
