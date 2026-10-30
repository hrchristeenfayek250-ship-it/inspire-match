"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import {supabase} from "@/lib/supabase";
import ATSNavigation from "@/components/ATSNavigation";


const styles=`
.ch-page{display:block!important;max-width:none!important;width:100%!important;margin:0!important;padding:0!important;min-height:100vh;background:#f5f8f6;color:#214632;font:13px/1.6 Arial,sans-serif}
.ch-page *{box-sizing:border-box}.ch-layout{display:grid;grid-template-columns:252px minmax(0,1fr);min-height:100vh}
.ch-side{background:#fff;border-right:1px solid #e4ede6;padding:27px 14px}
.ch-brand{display:flex;align-items:center;gap:11px;padding:4px 13px 30px;font-size:17px;font-weight:850}
.ch-mark{display:grid;place-items:center;width:36px;height:36px;border-radius:11px;background:#14583e;color:white;font-size:22px}
.ch-brand small{display:block;color:#8a9d8f;letter-spacing:1.5px;font-size:9px}
.ch-nav{display:flex;flex-direction:column;gap:4px}.ch-nav a{display:flex;align-items:center;gap:12px;min-height:40px;padding:10px 12px;border-radius:10px;color:#5d7267;text-decoration:none;font-size:12px;font-weight:700}
.ch-nav a span{width:17px;text-align:center}.ch-nav a:hover,.ch-nav a.active{background:#e5f2e9;color:#145f42}
.ch-main{min-width:0;padding:0 clamp(18px,3.4vw,54px) 65px}.ch-wrap{max-width:1240px;margin:auto}
.ch-top{height:77px;display:flex;justify-content:space-between;align-items:center;gap:12px;border-bottom:1px solid #e5ece7;margin-bottom:30px}
.ch-link{color:#19734c;text-decoration:none;font-weight:800;font-size:12px}
.ch-hero{background:linear-gradient(115deg,#103c2c,#176448 72%,#217755);border-radius:22px;padding:36px 38px;color:#fff;box-shadow:0 12px 32px #134a311a}
.ch-hero small{color:#b7e5cb;letter-spacing:2px;font-size:10px;font-weight:850}.ch-hero h1{font:850 clamp(27px,3vw,36px)/1.2 Arial,sans-serif;color:#fff;margin:13px 0}.ch-hero p{color:#dceee4;font-size:13px;max-width:730px;margin:0}
.ch-controls{display:flex;gap:13px;flex-wrap:wrap;align-items:end;margin:25px 0 18px}.ch-controls label{font-size:11px;font-weight:800;color:#688372}
.ch-input{display:block;margin-top:6px;min-width:150px;padding:11px;border:1px solid #d9e7dc;border-radius:9px;background:#fff;color:#22543b;font:12px Arial}
.ch-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:13px;margin-bottom:17px}
.ch-metric,.ch-panel{background:#fff;border:1px solid #e1ebe4;border-radius:15px;padding:22px;min-width:0}
.ch-metric span{font-size:11px;font-weight:800;color:#708b78}.ch-metric strong{display:block;font-size:29px;color:#19764e;margin:8px 0}.ch-metric small{color:#8a9f8e;font-size:11px}
.ch-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:17px}
.ch-panel h2{font:800 17px Arial,sans-serif;color:#1c4531;margin:0 0 9px}
.ch-desc{color:#809687;font-size:12px;margin:0 0 16px}
.ch-row{display:flex;justify-content:space-between;align-items:center;gap:14px;border-top:1px solid #edf2ee;padding:14px 0}
.ch-row strong{font-size:12px}.ch-row small{display:block;color:#819688;font-size:11px;margin-top:5px}
.ch-tag{display:inline-block;padding:5px 10px;border-radius:30px;background:#e7f3eb;color:#20734b;font-size:10px;font-weight:800;white-space:nowrap}
.ch-tag.warn{background:#fff0dd;color:#986b2a}.ch-tag.bad{background:#ffebe6;color:#a54b37}
.ch-tablewrap{overflow-x:auto}.ch-table{width:100%;border-collapse:collapse;min-width:710px;font-size:12px}
.ch-table th{background:#f7faf8;text-align:left;color:#708b79;font-size:10px;padding:13px}.ch-table td{padding:13px;border-top:1px solid #edf2ee;color:#3d604a}
.ch-error{padding:13px;background:#fff0e6;color:#a6503d;border-radius:9px;margin:14px 0}
.ch-note{font-size:11px;color:#82988a;line-height:1.7;margin-top:16px}
@media(max-width:1040px){.ch-grid{grid-template-columns:1fr}.ch-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:760px){.ch-layout{display:block}.ch-side{padding:13px 16px;border-right:0;border-bottom:1px solid #e4ede6}.ch-brand{padding:0 0 12px}.ch-nav{flex-direction:row;overflow:auto}.ch-nav a{flex:0 0 auto;white-space:nowrap}.ch-main{padding:0 15px 40px}.ch-top{height:60px;margin-bottom:18px}.ch-hero{padding:26px 22px}.ch-panel,.ch-metric{padding:16px}}

.ch-pill{padding:6px 10px;border-radius:99px;background:#edf6ef;color:#216844;font-size:10px;font-weight:800}
.ch-heat{height:9px;background:#eaf1ec;border-radius:99px;overflow:hidden;margin-top:7px}
.ch-heat span{display:block;height:100%;background:#278254;border-radius:99px}
.ch-heat span.ch-alert{background:#d99a50}
.ch-btn{cursor:pointer;font-weight:800}
.ch-btn:disabled{opacity:.5;cursor:not-allowed}

.ch-form{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
.ch-form label{display:flex;flex-direction:column;gap:6px;font-size:11px;font-weight:750}
.ch-form .wide{grid-column:1/-1}
.ch-textarea{min-height:86px;resize:vertical}
.ch-button{background:#16613f!important;color:#fff!important;border-color:#16613f!important;cursor:pointer;font-weight:800}
.ch-button:disabled{opacity:.5;cursor:not-allowed}
.ch-event{padding:14px;border-bottom:1px solid #e5eee7}
.ch-event:last-child{border:0}
.ch-pill{display:inline-block;border-radius:8px;background:#edf5ef;padding:4px 8px;color:#286f4b;font-size:11px;font-weight:800}
@media(max-width:750px){.ch-form{grid-template-columns:1fr}}
`;
const channels=["Email","Phone","WhatsApp","SMS","Video","Other"];
const outcomes=["Contacted","Replied","No response","Interview coordination","Follow-up needed","Other"];
const fmt=x=>x?new Date(x).toLocaleString("en-GB",{dateStyle:"medium",timeStyle:"short"}):"—";
const toLocal=x=>{const d=new Date(x);return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);};
const escapeCsv=x=>{const s=String(x??"");return '"'+(/^[=+\-@\t\r]/.test(s)?"'"+s:s).replaceAll('"','""')+'"';};
export default function CommunicationHub(){
 const [companies,setCompanies]=useState([]),[company,setCompany]=useState(""),[candidates,setCandidates]=useState([]),[events,setEvents]=useState([]),[selected,setSelected]=useState(""),[filter,setFilter]=useState("all"),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState(""),[success,setSuccess]=useState(""),[reload,setReload]=useState(0),[form,setForm]=useState({channel:"Email",outcome:"Contacted",direction:"outbound",contacted_at:"",next_follow_up_at:"",notes:""});
 useEffect(()=>{setForm(f=>({...f,contacted_at:toLocal(new Date())}));},[]);
 useEffect(()=>{let alive=true;(async()=>{const a=await supabase.auth.getUser();if(!alive)return;if(!a.data?.user){setError("Please sign in.");setLoading(false);return;}const r=await supabase.from("company_members").select("company_id").eq("user_id",a.data.user.id);if(!alive)return;if(r.error)setError(r.error.message);else{setCompanies(r.data||[]);setCompany(r.data?.[0]?.company_id||"");}setLoading(false);})();return()=>{alive=false;};},[]);
 useEffect(()=>{if(!company){setCandidates([]);setEvents([]);return;}let alive=true;setLoading(true);setError("");(async()=>{const [c,e]=await Promise.all([supabase.from("candidates").select("id,full_name,email,status").eq("company_id",company).is("deleted_at",null).order("full_name").limit(5000),supabase.from("candidate_communications").select("id,candidate_id,channel,outcome,direction,contacted_at,next_follow_up_at,follow_up_status,follow_up_resolved_at,notes,created_at").eq("company_id",company).order("contacted_at",{ascending:false}).limit(5000)]);if(!alive)return;if(c.error||e.error){setError(e.error?.code==="42P01"?"Communication table is missing. Run the supplied Supabase SQL migration first.":[c.error?.message,e.error?.message].filter(Boolean).join("; "));setCandidates([]);setEvents([]);}else{setCandidates(c.data||[]);setEvents(e.data||[]);setSelected(s=>(c.data||[]).some(x=>String(x.id)===s)?s:String(c.data?.[0]?.id||""));}setLoading(false);})();return()=>{alive=false;};},[company,reload]);
 const names=new Map(candidates.map(c=>[String(c.id),c.full_name||"Unnamed candidate"]));
 const now=Date.now();
 const lastByCandidate=new Map();events.forEach(e=>{const id=String(e.candidate_id);if(!lastByCandidate.has(id))lastByCandidate.set(id,e);});
 const outstanding=events.filter(e=>e.follow_up_status!=="completed"&&e.next_follow_up_at&&Date.parse(e.next_follow_up_at)<now&&!events.some(l=>String(l.candidate_id)===String(e.candidate_id)&&Date.parse(l.contacted_at)>Date.parse(e.next_follow_up_at)));
 const dueSoon=events.filter(e=>e.follow_up_status!=="completed"&&e.next_follow_up_at&&Date.parse(e.next_follow_up_at)>=now&&Date.parse(e.next_follow_up_at)<now+7*86400000&&!events.some(l=>String(l.candidate_id)===String(e.candidate_id)&&Date.parse(l.contacted_at)>Date.parse(e.next_follow_up_at)));
 const latestOverdue=[...new Map(outstanding.map(e=>[String(e.candidate_id),e])).values()];
 const latestSoon=[...new Map(dueSoon.map(e=>[String(e.candidate_id),e])).values()];
 const [rescheduleId,setRescheduleId]=useState(null),[rescheduleDate,setRescheduleDate]=useState("");
 async function resolveFollowup(entry,action){
  if(saving)return;setSaving(true);setError("");setSuccess("");
  try{
   const auth=await supabase.auth.getUser();if(!auth.data?.user)throw Error("Please sign in.");
   const changes=action==="completed"?{follow_up_status:"completed",follow_up_resolved_at:new Date().toISOString()}:{follow_up_status:"pending",follow_up_resolved_at:null,next_follow_up_at:new Date(rescheduleDate).toISOString()};
   if(action==="reschedule"&&(!rescheduleDate||Date.parse(rescheduleDate)<=Date.now()))throw Error("Choose a future follow-up date.");
   const r=await supabase.from("candidate_communications").update(changes).eq("id",entry.id).eq("company_id",company).eq("created_by",auth.data.user.id).select("id");
   if(r.error)throw r.error;if(!r.data?.length)throw Error("Only the entry creator can update this follow-up.");
   setSuccess(action==="completed"?"Follow-up completed.":"Follow-up rescheduled.");setRescheduleId(null);setRescheduleDate("");setReload(n=>n+1);
  }catch(err){setError(err.message||"Unable to update follow-up.");}finally{setSaving(false);}
 }
 const visible=events.filter(e=>(!selected||String(e.candidate_id)===selected)&&(filter==="all"||e.channel===filter));
 async function save(e){e.preventDefault();if(!selected||!company||saving)return;setSaving(true);setError("");setSuccess("");try{const a=await supabase.auth.getUser();if(!a.data?.user)throw Error("Please sign in.");const contacted=new Date(form.contacted_at);if(!Number.isFinite(contacted.getTime()))throw Error("Enter a valid contact date.");const next=form.next_follow_up_at?new Date(form.next_follow_up_at):null;if(next&&!Number.isFinite(next.getTime()))throw Error("Invalid follow-up date.");if(next&&next.getTime()<=contacted.getTime())throw Error("Follow-up must be after the contact time.");const payload={company_id:company,candidate_id:selected,created_by:a.data.user.id,channel:form.channel,outcome:form.outcome,direction:form.direction,contacted_at:contacted.toISOString(),next_follow_up_at:next?next.toISOString():null,notes:form.notes.trim()||null};const r=await supabase.from("candidate_communications").insert(payload).select("id").single();if(r.error)throw r.error;setSuccess("Communication logged successfully.");setForm(f=>({...f,contacted_at:toLocal(new Date()),next_follow_up_at:"",notes:""}));setReload(n=>n+1);}catch(err){setError(err.message||"Could not save communication.");}finally{setSaving(false);}}
 function exportCsv(){const rows=[["Candidate","Channel","Direction","Outcome","Contacted At","Next Follow-up","Notes"],...events.map(e=>[names.get(String(e.candidate_id))||e.candidate_id,e.channel,e.direction,e.outcome,e.contacted_at,e.next_follow_up_at,e.notes])];const blob=new Blob(["\uFEFF"+rows.map(r=>r.map(escapeCsv).join(",")).join("\r\n")],{type:"text/csv;charset=utf-8"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="candidate-communication-history.csv";a.click();URL.revokeObjectURL(url);}
 return <main className="ch-page"><style>{styles}</style><div className="ch-layout"><aside className="ch-side"><div className="ch-brand"><span className="ch-mark">I</span><div>Inspire Match<small>TALENT INTELLIGENCE</small></div></div><ATSNavigation className="ch-nav"/></aside><div className="ch-main"><div className="ch-wrap">
 <div className="ch-top"><span style={{color:"#778d7e",fontSize:12}}>Workspace / <strong style={{color:"#176144"}}>Recruitment Operations</strong> / Communication Hub</span><Link className="ch-link" href="/app/recruitment-operations">← All Operations</Link></div>
 <header className="ch-hero"><small>RECRUITMENT OPERATIONS / CANDIDATE RELATIONSHIPS</small><h1>Candidate Communication Hub</h1><p>Log candidate conversations, capture follow-up commitments, and review the communication timeline in one workspace.</p></header>
 <div className="ch-controls"><label>Company<select className="ch-input" value={company} onChange={e=>setCompany(e.target.value)}>{companies.map(c=><option key={c.company_id} value={c.company_id}>Company {String(c.company_id).slice(0,8)}</option>)}</select></label><label>Candidate<select className="ch-input" value={selected} onChange={e=>setSelected(e.target.value)}>{candidates.map(c=><option key={c.id} value={String(c.id)}>{c.full_name||"Unnamed candidate"}</option>)}</select></label><button className="ch-input" onClick={()=>setReload(n=>n+1)} disabled={!company||loading}>↻ Refresh</button><button className="ch-input" onClick={exportCsv} disabled={!events.length}>↓ Export History</button></div>
 {error&&<div className="ch-error" role="alert">{error}</div>}{success&&<div className="ch-info" role="status">{success}</div>}
 <div className="ch-metrics">{[["Logged Touchpoints",events.length,"Manual communication entries"],["Candidates Contacted",new Set(events.map(e=>String(e.candidate_id))).size,"With recorded communication"],["Overdue Follow-ups",latestOverdue.length,"No later contact logged"],["Due Next 7 Days",latestSoon.length,"Upcoming follow-up commitments"]].map(([n,v,d])=><div className="ch-metric" key={n}><span>{n}</span><strong>{loading?"—":v}</strong><small>{d}</small></div>)}</div>
 <div className="ch-grid"><section className="ch-panel"><h2>Log Candidate Communication</h2><p className="ch-desc">Record a real interaction. This does not send an email or WhatsApp message.</p><form className="ch-form" onSubmit={save}><label>Channel<select className="ch-input" value={form.channel} onChange={e=>setForm(f=>({...f,channel:e.target.value}))}>{channels.map(x=><option key={x}>{x}</option>)}</select></label><label>Direction<select className="ch-input" value={form.direction} onChange={e=>setForm(f=>({...f,direction:e.target.value}))}><option value="outbound">Outbound</option><option value="inbound">Inbound</option></select></label><label>Outcome<select className="ch-input" value={form.outcome} onChange={e=>setForm(f=>({...f,outcome:e.target.value}))}>{outcomes.map(x=><option key={x}>{x}</option>)}</select></label><label>Contact date &amp; time<input className="ch-input" type="datetime-local" required value={form.contacted_at} onChange={e=>setForm(f=>({...f,contacted_at:e.target.value}))}/></label><label>Next follow-up (optional)<input className="ch-input" type="datetime-local" value={form.next_follow_up_at} onChange={e=>setForm(f=>({...f,next_follow_up_at:e.target.value}))}/></label><label className="wide">Notes<textarea className="ch-input ch-textarea" maxLength={3000} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="Short summary, next steps, commitments..."/></label><button className="ch-input ch-button wide" type="submit" disabled={saving||!selected||loading}>{saving?"Saving...":"Save Communication Entry"}</button></form></section>
 <section className="ch-panel"><h2>Follow-up Commitments</h2><p className="ch-desc">Outstanding follow-ups based on logged interactions. A later contact closes an earlier reminder for this candidate.</p><div className="ch-row"><strong>Overdue</strong><span className="ch-tag bad">{latestOverdue.length}</span></div>{latestOverdue.slice(0,8).map(e=><div className="ch-row" key={e.id}><div><strong>{names.get(String(e.candidate_id))||"Candidate"}</strong><small>Due {fmt(e.next_follow_up_at)}</small></div><div style={{display:"flex",flexWrap:"wrap",gap:6}}><button className="ch-input" onClick={()=>setSelected(String(e.candidate_id))}>Open</button><button className="ch-input" disabled={saving} onClick={()=>resolveFollowup(e,"completed")}>✓ Completed</button><button className="ch-input" disabled={saving} onClick={()=>{setRescheduleId(e.id);setRescheduleDate("");}}>↻ Reschedule</button></div>{rescheduleId===e.id&&<div style={{width:"100%",display:"flex",flexWrap:"wrap",gap:8,alignItems:"end"}}><label>New follow-up date<input className="ch-input" type="datetime-local" value={rescheduleDate} onChange={x=>setRescheduleDate(x.target.value)}/></label><button className="ch-input ch-button" disabled={saving||!rescheduleDate} onClick={()=>resolveFollowup(e,"reschedule")}>Save Date</button><button className="ch-input" onClick={()=>setRescheduleId(null)}>Cancel</button></div>}</div>)}<div className="ch-row"><strong>Upcoming (7 days)</strong><span className="ch-tag warn">{latestSoon.length}</span></div>{latestSoon.slice(0,8).map(e=><div className="ch-row" key={e.id}><div><strong>{names.get(String(e.candidate_id))||"Candidate"}</strong><small>Due {fmt(e.next_follow_up_at)}</small></div><div style={{display:"flex",flexWrap:"wrap",gap:6}}><button className="ch-input" onClick={()=>setSelected(String(e.candidate_id))}>Open</button><button className="ch-input" disabled={saving} onClick={()=>resolveFollowup(e,"completed")}>✓ Completed</button><button className="ch-input" disabled={saving} onClick={()=>{setRescheduleId(e.id);setRescheduleDate("");}}>↻ Reschedule</button></div>{rescheduleId===e.id&&<div style={{width:"100%",display:"flex",flexWrap:"wrap",gap:8,alignItems:"end"}}><label>New follow-up date<input className="ch-input" type="datetime-local" value={rescheduleDate} onChange={x=>setRescheduleDate(x.target.value)}/></label><button className="ch-input ch-button" disabled={saving||!rescheduleDate} onClick={()=>resolveFollowup(e,"reschedule")}>Save Date</button><button className="ch-input" onClick={()=>setRescheduleId(null)}>Cancel</button></div>}</div>)}{!latestOverdue.length&&!latestSoon.length&&<p className="ch-desc">No pending follow-ups in the recorded communication history.</p>}</section></div>
 <section className="ch-panel"><div style={{display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}><div><h2>Communication Timeline</h2><p className="ch-desc">Chronological log for {names.get(selected)||"the selected candidate"}.</p></div><label>Channel<select className="ch-input" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All channels</option>{channels.map(x=><option key={x}>{x}</option>)}</select></label></div>{visible.slice(0,150).map(e=><div className="ch-event" key={e.id}><div style={{display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}><strong>{e.channel} · {e.outcome}</strong><span className="ch-pill">{e.direction}</span></div><div className="ch-desc">{fmt(e.contacted_at)}{e.next_follow_up_at?" · Follow-up: "+fmt(e.next_follow_up_at):""}</div>{e.notes&&<p style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{e.notes}</p>}</div>)}{!visible.length&&<p className="ch-desc">No communications recorded for this candidate yet.</p>}<p className="ch-note">This is a manual communication log. Entries do not prove delivery or response, and no emails, calls or WhatsApp messages are sent. Response-time metrics require matched inbound/outbound conversation threads and are not inferred here. Follow-up completion and rescheduling are saved to Supabase. In-app alerts are calculated when this page loads; automatic email or push delivery is not enabled.</p></section>
 </div></div></div></main>;
}
