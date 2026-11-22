"use client";
import {useEffect,useMemo,useState} from "react";
import Link from "next/link";
import ATSNavigation from "@/components/ATSNavigation";
import {supabase} from "@/lib/supabase";
import "../inspire-connect/inspire-connect.css";
const STAGES=["all","new","reviewed","rejected","imported"];
const fmt=x=>x?new Date(x).toLocaleString():"—";
export default function ApplicationsInbox(){
 const [items,setItems]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(""),[notice,setNotice]=useState(""),[search,setSearch]=useState(""),[filter,setFilter]=useState("all"),[busy,setBusy]=useState(null);
 async function call(path,options={}){
  const {data:{session}}=await supabase.auth.getSession();
  if(!session?.access_token)throw Error("Please sign in again.");
  const res=await fetch(path,{...options,headers:{Authorization:`Bearer ${session.access_token}`,...(options.body?{"Content-Type":"application/json"}:{})},cache:"no-store"});
  const json=await res.json().catch(()=>({}));
  if(!res.ok)throw Error(json.error||"Unable to complete the request.");
  return json;
 }
 async function refresh(){setLoading(true);setError("");try{const data=await call("/api/inspire-connect/applications");setItems(data.applications||[])}catch(e){setError(e.message)}finally{setLoading(false)}}
 useEffect(()=>{refresh()},[]);
 const filtered=useMemo(()=>items.filter(a=>(filter==="all"||a.status===filter)&&[a.full_name,a.email,a.job_title,a.phone].join(" ").toLowerCase().includes(search.toLowerCase())),[items,filter,search]);
 const count=s=>items.filter(a=>a.status===s).length;
 async function openCV(id){setBusy(id);setError("");try{const data=await call(`/api/inspire-connect/applications?cv=${id}`);window.open(data.url,"_blank","noopener,noreferrer")}catch(e){setError(e.message)}finally{setBusy(null)}}
 async function setStatus(id,status){setBusy(id);setError("");setNotice("");try{const data=await call("/api/inspire-connect/applications",{method:"PATCH",body:JSON.stringify({id,status})});setItems(old=>old.map(a=>a.id===id?{...a,status:data.application.status}:a));setNotice("Application status updated.")}catch(e){setError(e.message)}finally{setBusy(null)}}
 return <div className="ic-shell"><aside className="ic-sidebar"><div className="ic-brand"><div className="ic-mark">I</div><div><strong>INSPIRE MATCH</strong><span>RECRUITMENT PLATFORM</span></div></div><div className="ic-side-label">WORKSPACE</div><ATSNavigation className="ic-nav" linkClassName="ic-nav-link"/><div className="ic-side-footer">INSPIRE CONNECT · APPLICATIONS</div></aside>
 <main className="ic-main"><div className="ic-topbar"><div className="ic-breadcrumb">Workspace <span>/</span> Inspire Connect <span>/</span> Applications Inbox</div><Link className="ic-toplink" href="/app/inspire-connect">Back to Inspire Connect ↗</Link></div><div className="ic-content">
 <div className="ic-heading"><div><div className="ic-eyebrow">SECURE RECRUITMENT INTAKE</div><h1>Applications Inbox</h1><p>Review candidates who applied through your company career page.</p></div><button className="ic-secondary" onClick={refresh} disabled={loading}>↻ Refresh</button></div>
 {error&&<div className="ic-alert ic-error" role="alert">{error}</div>}{notice&&<div className="ic-alert ic-success" role="status">{notice}</div>}
 <div className="ic-metrics"><div className="ic-metric"><div className="ic-metric-head">Applications received <span>▣</span></div><strong>{items.length}</strong><small>Up to 200 most recent</small></div><div className="ic-metric"><div className="ic-metric-head">New applications <span>◎</span></div><strong>{count("new")}</strong><small>Awaiting review</small></div><div className="ic-metric"><div className="ic-metric-head">Reviewed <span>✓</span></div><strong>{count("reviewed")}</strong><small>Marked as reviewed</small></div></div>
 <section className="ic-panel"><div className="ic-panel-head"><div><h2>Incoming Applications</h2><p>Only company Admins and HR Managers can access applicant records and private CV files.</p></div></div>
 <div className="ic-filter"><input aria-label="Search applications" placeholder="Search name, email, position…" value={search} onChange={e=>setSearch(e.target.value)}/><select aria-label="Filter status" value={filter} onChange={e=>setFilter(e.target.value)} style={{padding:12,borderRadius:8,border:"1px solid #d8e4da",background:"white"}}>{STAGES.map(s=><option key={s} value={s}>{s==="all"?"All statuses":s[0].toUpperCase()+s.slice(1)}</option>)}</select><span>{filtered.length} results</span></div>
 {loading?<div className="ic-empty">Loading applications…</div>:filtered.length===0?<div className="ic-empty">{items.length?"No matching applications.":"No applications received yet."}</div>:<div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:12,textAlign:"left"}}><thead><tr>{["Candidate","Position","Received","Status","CV","Actions"].map(h=><th key={h} style={{padding:"14px 10px",borderBottom:"1px solid #e3ebe5",color:"#54725e"}}>{h}</th>)}</tr></thead><tbody>{filtered.map(a=><tr key={a.id}><td style={{padding:"14px 10px",borderBottom:"1px solid #edf1ed"}}><strong>{a.full_name}</strong><div style={{marginTop:6,color:"#788b7d"}}>{a.email}</div>{a.phone&&<div style={{marginTop:4,color:"#788b7d"}}>{a.phone}</div>}</td><td style={{padding:10,borderBottom:"1px solid #edf1ed"}}>{a.job_title}</td><td style={{padding:10,borderBottom:"1px solid #edf1ed",whiteSpace:"nowrap"}}>{fmt(a.created_at)}</td><td style={{padding:10,borderBottom:"1px solid #edf1ed"}}><span className={a.status==="new"?"ic-status live":"ic-status"}>{a.status}</span></td><td style={{padding:10,borderBottom:"1px solid #edf1ed"}}><button className="ic-secondary" disabled={busy!==null} onClick={()=>openCV(a.id)}>Open CV ↗</button></td><td style={{padding:10,borderBottom:"1px solid #edf1ed"}}>{a.status==="imported"?<span className="ic-muted">Imported</span>:<select aria-label={`Status for ${a.full_name}`} disabled={busy!==null} value={a.status} onChange={e=>setStatus(a.id,e.target.value)} style={{padding:9,borderRadius:8,border:"1px solid #d8e4da",background:"white"}}>{["new","reviewed","rejected"].map(s=><option key={s} value={s}>{s}</option>)}</select>}</td></tr>)}</tbody></table></div>}</section>
 <div className="ic-note">Applications are securely staged. Import to the Candidates pipeline and automated CV parsing will be added separately; changing the review status does not create a candidate record.</div>
 </div></main></div>;
}
