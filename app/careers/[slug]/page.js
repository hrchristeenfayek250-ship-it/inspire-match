"use client";
import {useEffect,useState} from "react";
import {useParams} from "next/navigation";
import {supabase} from "@/lib/supabase";
export default function PublicCareers(){
 const {slug}=useParams();const [jobs,setJobs]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(""),[query,setQuery]=useState("");
 useEffect(()=>{let alive=true;(async()=>{setLoading(true);const {data,error}=await supabase.rpc("get_public_inspire_career_site",{p_slug:String(slug||"")});if(alive){setJobs(data||[]);setError(error?.message||"");setLoading(false);}})();return()=>{alive=false}},[slug]);
 const visible=jobs.filter(j=>[j.job_title,j.department,j.location].join(" ").toLowerCase().includes(query.toLowerCase()));
 return <main style={{minHeight:"100vh",background:"#f5f9f6",color:"#173d2b",fontFamily:"Arial,sans-serif",padding:"42px 18px"}}>
 <div style={{maxWidth:860,margin:"auto"}}><header style={{marginBottom:32}}><small style={{letterSpacing:2,color:"#62836d"}}>CAREERS</small><h1>{jobs[0]?.display_name||"Career Opportunities"}</h1><p>Explore available opportunities.</p></header>
 {loading?<p>Loading jobs…</p>:error?<p role="alert">Career page unavailable.</p>:jobs.length===0?<p>No public vacancies are available right now.</p>:<>
 <label>Search jobs<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Job title, location, department" style={{display:"block",padding:13,width:"100%",border:"1px solid #c8d9cc",borderRadius:10,margin:"10px 0 25px"}}/></label>
 {visible.map(job=><article key={job.job_id} style={{background:"#fff",padding:24,border:"1px solid #dae8dd",borderRadius:14,marginBottom:14}}>
 <h2 style={{marginTop:0}}>{job.job_title}</h2><p style={{color:"#597565"}}>{[job.department,job.location,job.work_type,job.employment_type].filter(Boolean).join(" · ")}</p>
 {job.description&&<details><summary style={{cursor:"pointer",color:"#176b48",fontWeight:700}}>View job description</summary><p style={{whiteSpace:"pre-wrap",lineHeight:1.7}}>{job.description}</p></details>}
 <p style={{fontSize:13,color:"#6a7e70"}}>Online applications will be available when the secure application intake is enabled.</p>
 </article>)}
 </>}
 <footer style={{marginTop:40,color:"#728c79",fontSize:12}}>Powered by Inspire Match ATS</footer></div></main>;
}
