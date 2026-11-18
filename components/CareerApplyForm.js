"use client";
import {useEffect,useRef,useState} from "react";
export default function CareerApplyForm({jobId,slug}){
 const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(""),[error,setError]=useState("");
 const [token,setToken]=useState(""),[ready,setReady]=useState(false);
 const box=useRef(null),widget=useRef(null);
 const siteKey=process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
 useEffect(()=>{
  if(!open||!siteKey||!box.current)return;
  let active=true;
  function render(){
   if(!active||!box.current||widget.current!==null||!window.turnstile)return;
   widget.current=window.turnstile.render(box.current,{sitekey:siteKey,callback:(v)=>{setToken(v);setReady(true)}, "expired-callback":()=>{setToken("");setReady(false)},"error-callback":()=>{setToken("");setReady(false)}});
  }
  if(window.turnstile){render();return()=>{active=false;}}
  const script=document.createElement("script");script.src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";script.async=true;script.onload=render;
  document.head.appendChild(script);
  return()=>{active=false;script.onload=null};
 },[open,siteKey]);
 async function submit(e){
  e.preventDefault();if(busy||!ready||!token)return;
  setBusy(true);setError("");setMessage("");
  try{
   const data=new FormData(e.currentTarget);
   data.set("slug",slug);data.set("job_id",String(jobId));data.set("captcha",token);
   const response=await fetch("/api/careers/apply",{method:"POST",body:data});
   const payload=await response.json();
   if(!response.ok)throw Error(payload.error||"Unable to submit the application.");
   setMessage("Application received successfully. Thank you!");
   setOpen(false);
  }catch(e){setError(e.message||"Application failed.");}
  finally{setBusy(false);setToken("");setReady(false);if(widget.current!==null&&window.turnstile){window.turnstile.reset(widget.current)}}
 }
 if(!siteKey)return <p style={{fontSize:12,color:"#718678"}}>Online applications are being prepared. Please check back later.</p>;
 return <div style={{marginTop:20}}>
 {message&&<p role="status" style={{color:"#167344"}}>{message}</p>}
 {!open?<button type="button" style={{border:0,borderRadius:9,background:"#176b48",padding:"12px 18px",color:"#fff",fontWeight:700,cursor:"pointer"}} onClick={()=>{setOpen(true);setError("");}}>Apply now</button>:
 <form onSubmit={submit} style={{display:"grid",gap:14,marginTop:15,padding:20,border:"1px solid #e0ece3",borderRadius:12}}>
  <strong>Apply for this position</strong>
  <label>Full name *<input name="full_name" required minLength={2} maxLength={160} style={inputStyle}/></label>
  <label>Email address *<input name="email" type="email" required maxLength={254} style={inputStyle}/></label>
  <label>Phone number<input name="phone" maxLength={40} style={inputStyle}/></label>
  <label>Upload your CV (PDF or DOCX, max 5 MB) *<input name="cv" type="file" required accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" style={inputStyle}/></label>
  <label style={{fontSize:12,lineHeight:1.7}}><input required name="consent" value="yes" type="checkbox"/> I agree to share my application and CV with the hiring company for recruitment purposes.</label>
  <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{position:"absolute",left:"-9999px"}}/>
  <div ref={box}/>
  {error&&<p role="alert" style={{color:"#a33232"}}>{error}</p>}
  <div style={{display:"flex",gap:12,alignItems:"center"}}>
   <button type="submit" disabled={!ready||busy} style={{background:"#176b48",border:0,borderRadius:8,color:"#fff",padding:"11px 18px",opacity:!ready||busy?.5:1,cursor:"pointer"}}>{busy?"Submitting…":"Submit application"}</button>
   <button type="button" onClick={()=>setOpen(false)} style={{border:0,background:"transparent",cursor:"pointer",color:"#647b6a"}}>Cancel</button>
  </div>
 </form>}
 </div>;
}
const inputStyle={display:"block",width:"100%",padding:10,border:"1px solid #cfddd3",borderRadius:8,marginTop:7};
