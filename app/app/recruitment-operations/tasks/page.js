"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import ATSNavigation from "@/components/ATSNavigation";

const empty = {title:"",description:"",assignee_name:"",priority:"medium",status:"todo",due_date:"",job_id:"",candidate_id:"",company_id:"",assigned_to:""};
const statuses = ["todo","in_progress","blocked","completed"];
const label = (s) => ({todo:"To Do",in_progress:"In Progress",blocked:"Blocked",completed:"Completed"}[s] || s);
const card = {background:"#fff",border:"1px solid #e1eae4",borderRadius:16,padding:22};
const field = {width:"100%",padding:"11px 12px",border:"1px solid #d8e4dc",borderRadius:9,background:"#fff",color:"#1a4633",font:"inherit"};
const btn = {border:0,borderRadius:9,padding:"11px 17px",background:"#176b49",color:"#fff",fontWeight:750,cursor:"pointer"};
export default function RecruitmentTasksPage(){
 const [tasks,setTasks]=useState([]),[uid,setUid]=useState(null),[loading,setLoading]=useState(true);
 const [error,setError]=useState(""),[message,setMessage]=useState(""),[saving,setSaving]=useState(false);
 const [form,setForm]=useState(empty),[editing,setEditing]=useState(null),[show,setShow]=useState(false);
 const [filter,setFilter]=useState("all"),[search,setSearch]=useState("");
 const [jobs,setJobs]=useState([]),[candidates,setCandidates]=useState([]);
 const [members,setMembers]=useState([]),[companyIds,setCompanyIds]=useState([]),[roles,setRoles]=useState({});
 const manager=id=>["admin","hr_manager"].includes(roles[id]);
 async function load(){
  setLoading(true);setError("");
  const {data:auth,error:authError}=await supabase.auth.getUser();
  if(authError||!auth?.user){setError("Please sign in to manage tasks.");setLoading(false);return;}
  setUid(auth.user.id);
  const {data,error:e}=await supabase.from("recruitment_tasks").select("id,title,description,assignee_name,priority,status,due_date,created_at,job_id,candidate_id,company_id,assigned_to,created_by").order("created_at",{ascending:false});
  if(e)setError(e.message);else setTasks(data||[]);
  setLoading(false);
 }
 useEffect(()=>{load();},[]);
 useEffect(()=>{let active=true;(async()=>{const {data:auth}=await supabase.auth.getUser();if(!auth?.user)return;const member=await supabase.from("company_members").select("company_id,role").eq("user_id",auth.user.id);if(!active||member.error)return;const companyIds=[...new Set((member.data||[]).map(x=>x.company_id).filter(Boolean))];if(!companyIds.length)return;const [j,c,m]=await Promise.all([supabase.from("jobs").select("id,title,company_id").in("company_id",companyIds).limit(500),supabase.from("candidates").select("id,full_name,job_id,company_id").in("company_id",companyIds).is("deleted_at",null).limit(500),supabase.from("company_members").select("company_id,user_id,role").in("company_id",companyIds)]);if(active){if(!j.error)setJobs(j.data||[]);if(!c.error)setCandidates(c.data||[]);if(!m.error)setMembers(m.data||[]);setCompanyIds(companyIds);setRoles(Object.fromEntries((member.data||[]).map(x=>[x.company_id,x.role])));}})();return()=>{active=false;};},[]);
 function create(){setEditing(null);setForm({...empty,company_id:companyIds.length===1?companyIds[0]:""});setShow(true);setMessage("");}
 function edit(t){setEditing(t.id);setForm({title:t.title||"",description:t.description||"",assignee_name:t.assignee_name||"",priority:t.priority,status:t.status,due_date:t.due_date||"",job_id:t.job_id==null?"":String(t.job_id),candidate_id:t.candidate_id==null?"":String(t.candidate_id),company_id:t.company_id||"",assigned_to:t.assigned_to||""});setShow(true);window.scrollTo({top:0,behavior:"smooth"});}
 async function save(e){
  e.preventDefault();if(!uid||saving||!form.title.trim())return;
  setSaving(true);setError("");setMessage("");
  if(form.assigned_to&&!members.some(m=>m.company_id===form.company_id&&m.user_id===form.assigned_to)){setSaving(false);setError("Select a member from this company.");return;}
  const payload={title:form.title.trim(),description:form.description.trim()||null,assignee_name:form.assignee_name.trim()||null,priority:form.priority,status:form.status,due_date:form.due_date||null,job_id:form.job_id?Number(form.job_id):null,candidate_id:form.candidate_id?Number(form.candidate_id):null,company_id:form.company_id||null,assigned_to:form.assigned_to||null,updated_at:new Date().toISOString()};
  const query=editing?supabase.from("recruitment_tasks").update(payload).eq("id",editing):supabase.from("recruitment_tasks").insert({...payload,created_by:uid});
  const {error:e2}=await query;setSaving(false);
  if(e2){setError(e2.message);return;}
  setMessage(editing?"Task updated successfully.":"Task created successfully.");setShow(false);setEditing(null);setForm(empty);await load();
 }
 async function changeStatus(t,status){
  setError("");const {error:e}=t.assigned_to===uid&&t.created_by!==uid?await supabase.rpc("update_my_recruitment_task_status",{p_task_id:t.id,p_status:status}):await supabase.from("recruitment_tasks").update({status,updated_at:new Date().toISOString()}).eq("id",t.id);
  if(e){setError(e.message);return;}setTasks(p=>p.map(x=>x.id===t.id?{...x,status}:x));
 }
 async function remove(t){
  if(!window.confirm('Delete task: '+t.title+'?'))return;
  const {error:e}=await supabase.from("recruitment_tasks").delete().eq("id",t.id).eq("created_by",uid);
  if(e){setError(e.message);return;}setTasks(p=>p.filter(x=>x.id!==t.id));setMessage("Task deleted.");
 }
 const visible=tasks.filter(t=>(filter==="all"||t.status===filter)&&[t.title,t.description,t.assignee_name].some(x=>(x||"").toLowerCase().includes(search.toLowerCase())));
 const counts=[["All Tasks",tasks.length],...statuses.map(s=>[label(s),tasks.filter(t=>t.status===s).length])];
 return <main style={{maxWidth:"none",margin:0,padding:0,minHeight:"100vh",background:"#f5f8f6",color:"#183c2c",font:"14px Arial, sans-serif"}}>
  <style>{'.rt-shell{display:grid;grid-template-columns:252px minmax(0,1fr);min-height:100vh}.rt-nav{display:flex;flex-direction:column;gap:4px}.rt-nav a{display:flex;gap:12px;padding:11px 12px;color:#547466;text-decoration:none;border-radius:9px;font-size:12px;font-weight:700}.rt-nav a.active,.rt-nav a:hover{background:#e6f3ea;color:#176b49}.rt-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px}.rt-form{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.rt-tasks{display:flex;flex-direction:column;gap:12px}@media(max-width:950px){.rt-grid{grid-template-columns:repeat(3,1fr)}.rt-shell{grid-template-columns:200px minmax(0,1fr)}}@media(max-width:700px){.rt-shell{display:block}.rt-nav{flex-direction:row;overflow-x:auto}.rt-nav a{white-space:nowrap}.rt-grid{grid-template-columns:repeat(2,1fr)}.rt-form{grid-template-columns:1fr}}'}</style>
  <div className="rt-shell">
   <aside style={{background:"#fff",borderRight:"1px solid #e1eae4",padding:20}}>
    <div style={{fontSize:19,fontWeight:850,marginBottom:28}}>◈ Inspire Match <div style={{fontSize:10,letterSpacing:2,color:"#879d90",marginTop:4}}>TALENT INTELLIGENCE</div></div>
    <ATSNavigation className="rt-nav"/>
   </aside>
   <div style={{minWidth:0,padding:"28px clamp(16px,3vw,48px) 60px"}}>
    <div style={{maxWidth:1200,margin:"auto"}}>
     <div style={{fontSize:12,color:"#71877b",marginBottom:22}}><Link href="/app/recruitment-operations" style={{color:"#176b49"}}>Recruitment Operations</Link> / Task Management</div>
     <header style={{background:"linear-gradient(110deg,#103c2c,#1e7050)",color:"#fff",borderRadius:20,padding:"32px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:20,flexWrap:"wrap",marginBottom:22}}>
      <div><div style={{color:"#bce5cc",fontSize:10,fontWeight:800,letterSpacing:2}}>RECRUITMENT OPERATIONS</div><h1 style={{color:"#fff",font:"800 32px Arial,sans-serif",margin:"10px 0"}}>Task Management</h1><p style={{margin:0,color:"#e0ede4",fontSize:13}}>Plan, prioritize and track your recruitment tasks.</p></div>
      <div style={{display:"flex",gap:10,flexWrap:"wrap"}}><Link href="/app/recruitment-operations/playbooks" style={{...btn,background:"#d8f1e0",color:"#14583c",textDecoration:"none",display:"inline-flex",alignItems:"center"}}>✧ Workflow Playbooks</Link><button style={{...btn,background:"#fff",color:"#14583c"}} onClick={create}>+ New Task</button></div>
     </header>
     <div className="rt-grid" style={{marginBottom:22}}>{counts.map(([name,n])=><div key={name} style={card}><div style={{fontSize:26,fontWeight:850,color:"#176b49"}}>{n}</div><div style={{fontSize:11,color:"#758b7e",marginTop:6}}>{name}</div></div>)}</div>
     {error&&<p role="alert" style={{padding:12,background:"#ffefec",color:"#a13f38",borderRadius:9}}>{error}</p>}
     {message&&<p role="status" style={{padding:12,background:"#e8f5eb",color:"#176b49",borderRadius:9}}>{message}</p>}
     {show&&<form onSubmit={save} style={{...card,marginBottom:20}}>
      <h2 style={{font:"800 20px Arial",margin:"0 0 20px"}}>{editing?"Edit Task":"Create Task"}</h2>
      <div className="rt-form">
       <label style={{gridColumn:"1/-1"}}>Task Title *<input style={{...field,marginTop:7}} required maxLength={200} value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label>
       <label style={{gridColumn:"1/-1"}}>Description<textarea style={{...field,marginTop:7,minHeight:85}} value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label>
       <label>Company<select style={{...field,marginTop:7}} value={form.company_id} onChange={e=>setForm({...form,company_id:e.target.value,assigned_to:""})}><option value="">Personal</option>{companyIds.map(id=><option key={id} value={id}>Company {id.slice(0,8)}</option>)}</select></label>
       <label>Assign Team Member<select style={{...field,marginTop:7}} value={form.assigned_to} disabled={!manager(form.company_id)} onChange={e=>setForm({...form,assigned_to:e.target.value})}><option value="">Unassigned</option>{members.filter(m=>m.company_id===form.company_id).map(m=><option key={m.user_id} value={m.user_id}>{m.user_id===uid?"You":`Member ${m.user_id.slice(0,8)}`} ({m.role})</option>)}</select></label>
       <label>Responsible person (name)<input style={{...field,marginTop:7}} value={form.assignee_name} onChange={e=>setForm({...form,assignee_name:e.target.value})}/></label>
       <label>Priority<select style={{...field,marginTop:7}} value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})}>{["low","medium","high","urgent"].map(p=><option key={p} value={p}>{p}</option>)}</select></label>
       <label>Due Date<input type="date" style={{...field,marginTop:7}} value={form.due_date} onChange={e=>setForm({...form,due_date:e.target.value})}/></label>
       <label>Related Job<select style={{...field,marginTop:7}} value={form.job_id} onChange={e=>setForm({...form,job_id:e.target.value,candidate_id:""})}><option value="">No linked job</option>{jobs.filter(j=>!form.company_id||j.company_id===form.company_id).map(j=><option key={j.id} value={j.id}>{j.title}</option>)}</select></label>
       <label>Related Candidate<select style={{...field,marginTop:7}} value={form.candidate_id} onChange={e=>setForm({...form,candidate_id:e.target.value})}><option value="">No linked candidate</option>{candidates.filter(c=>(!form.company_id||c.company_id===form.company_id)&&(!form.job_id||String(c.job_id)===String(form.job_id))).map(c=><option key={c.id} value={c.id}>{c.full_name}</option>)}</select></label>
       <label>Status<select style={{...field,marginTop:7}} value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>{statuses.map(s=><option key={s} value={s}>{label(s)}</option>)}</select></label>
      </div>
      <div style={{display:"flex",gap:10,marginTop:20}}><button type="submit" disabled={saving} style={btn}>{saving?"Saving...":editing?"Save Changes":"Create Task"}</button><button type="button" onClick={()=>setShow(false)} style={{...btn,background:"#edf4ef",color:"#176b49"}}>Cancel</button></div>
     </form>}
     <section style={card}>
      <div style={{display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap",alignItems:"center",marginBottom:20}}>
       <div><h2 style={{font:"800 21px Arial",margin:"0 0 6px"}}>Recruitment Tasks</h2><p style={{fontSize:12,color:"#829588",margin:0}}>Team assignments and progress tracking.</p></div>
       <div style={{display:"flex",gap:9,flexWrap:"wrap"}}><input aria-label="Search tasks" placeholder="Search tasks..." value={search} onChange={e=>setSearch(e.target.value)} style={{...field,width:170}}/><select aria-label="Filter status" value={filter} onChange={e=>setFilter(e.target.value)} style={{...field,width:150}}><option value="all">All statuses</option>{statuses.map(s=><option key={s} value={s}>{label(s)}</option>)}</select></div>
      </div>
      {loading?<p style={{padding:30,color:"#74887c"}}>Loading tasks...</p>:visible.length===0?<p style={{padding:35,textAlign:"center",color:"#84978b"}}>{tasks.length?"No matching tasks.":"No tasks yet. Create your first task."}</p>:
       <div className="rt-tasks">{visible.map(t=><article key={t.id} style={{border:"1px solid #e5eee7",borderRadius:12,padding:18,display:"flex",justifyContent:"space-between",alignItems:"center",gap:15,flexWrap:"wrap"}}>
        <div style={{flex:1,minWidth:180}}><strong style={{fontSize:15}}>{t.title}</strong>{t.description&&<p style={{fontSize:12,color:"#73877b",whiteSpace:"pre-wrap",margin:"8px 0"}}>{t.description}</p>}<div style={{fontSize:11,color:"#678374",marginTop:9}}>Priority: <b>{t.priority.toUpperCase()}</b> &nbsp; · &nbsp; Due: {t.due_date||"Not set"} {t.assigned_to&&" · Assigned: "+(t.assigned_to===uid?"You":"Member "+t.assigned_to.slice(0,8))}{t.job_id&&" · Job: "+(jobs.find(j=>String(j.id)===String(t.job_id))?.title||"#"+t.job_id)}{t.candidate_id&&" · Candidate: "+(candidates.find(c=>String(c.id)===String(t.candidate_id))?.full_name||"#"+t.candidate_id)}</div></div>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}><select aria-label={"Status for "+t.title} value={t.status} onChange={e=>changeStatus(t,e.target.value)} style={{...field,width:135,fontSize:11}}>{statuses.map(s=><option key={s} value={s}>{label(s)}</option>)}</select>{(t.created_by===uid||manager(t.company_id))&&<><button style={{...btn,background:"#e9f4ed",color:"#176b49",padding:10}} onClick={()=>edit(t)}>Edit</button><button style={{...btn,background:"#fff0ef",color:"#a44e43",padding:10}} onClick={()=>remove(t)}>Delete</button></>}</div>
       </article>)}</div>}
     </section>
    </div>
   </div>
  </div>
 </main>;
}
