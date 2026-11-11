"use client";
import {useEffect,useState} from "react";
import {useParams} from "next/navigation";
import {supabase} from "@/lib/supabase";

export default function CandidateInterviewScheduling(){
 const params=useParams(),token=String(params?.token||"");
 const [data,setData]=useState(null),[selected,setSelected]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState("");
 useEffect(()=>{
  let active=true;
  if(!/^[a-f0-9-]{72}$/i.test(token)){setData({status:"unavailable"});return;}
  (async()=>{
   const {data:result,error:e}=await supabase.rpc("get_interview_schedule_options",{p_token:token});
   if(!active)return;
   setData(e?{status:"error"}:result);
  })();
  return ()=>{active=false;};
 },[token]);
 async function book(){
  if(!selected||busy)return;
  setBusy(true);setError("");
  const {data:result,error:e}=await supabase.rpc("book_interview_schedule_option",{p_token:token,p_slot:selected});
  if(e){setError("We could not confirm your appointment. Contact the recruiter.");setBusy(false);return;}
  if(result?.status==="booked")setData(result);
  else {setError("This time is no longer available. Please contact the recruiter.");setData({status:"unavailable"});}
  setBusy(false);
 }
 const dateLabel=value=>{const d=new Date(value);return Number.isNaN(d.getTime())?"Unavailable":d.toLocaleString(undefined,{dateStyle:"full",timeStyle:"short"});};
 return <main style={{minHeight:"100vh",background:"#f2f7f3",color:"#174832",fontFamily:"Arial,sans-serif",padding:"min(9vh,72px) 18px"}}>
 <section style={{maxWidth:650,margin:"auto",padding:"clamp(22px,5vw,42px)",borderRadius:20,background:"#fff",boxShadow:"0 12px 35px #003a1b0c"}}>
  <div style={{fontWeight:900,fontSize:24}}>✳ Inspire Match</div><p style={{fontSize:11,letterSpacing:2,color:"#6c947d"}}>HIRE BETTER. INSPIRE MORE.</p>
  <h1 style={{fontFamily:"Georgia,serif",fontWeight:500}}>Schedule your interview</h1>
  {data===null?<p>Loading available interview times…</p>:data.status==="booked"?<div role="status"><h2>Interview confirmed</h2><p>Your appointment is confirmed{data.scheduled_at?" for "+dateLabel(data.scheduled_at):""}. Please keep your invitation and watch for details from the recruitment team.</p></div>:data.status==="pending"?<>
   <p>Select one of the available times. Times below are shown in your device's local timezone.</p>
   <div style={{display:"grid",gap:12,margin:"24px 0"}}>{(data.slots||[]).map(s=><label key={s} style={{padding:15,border:"1px solid #d2e3d6",borderRadius:12,cursor:"pointer",background:selected===s?"#e9f7ec":"#fff"}}>
     <input type="radio" name="slot" checked={selected===s} onChange={()=>setSelected(s)}/> <strong>{dateLabel(s)}</strong>
   </label>)}</div>
   <p style={{fontSize:12,color:"#61796b"}}>Invitation expires {dateLabel(data.expires_at)}. Booking confirms one appointment and cannot be changed using this link.</p>
   {error&&<p role="alert" style={{color:"#a42828"}}>{error}</p>}
   <button onClick={book} disabled={!selected||busy} style={{width:"100%",padding:15,border:0,borderRadius:12,background:"#176a45",color:"#fff",fontWeight:800,cursor:"pointer",opacity:!selected||busy?.6:1}}>{busy?"Confirming…":"Confirm interview time"}</button>
  </>:<p role="alert">{data.status==="error"?"Scheduling is temporarily unavailable. Please contact the recruiter.":"This invitation is no longer available. Contact the recruiter for a new link."}</p>}
  <p style={{marginTop:30,fontSize:12,color:"#789082"}}>Private interview invitation · Do not share this link.</p>
 </section></main>;
}