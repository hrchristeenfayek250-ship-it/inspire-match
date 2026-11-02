"use client";

import Link from "next/link";
import {useEffect,useMemo,useState} from "react";
import {supabase} from "@/lib/supabase";
import ATSNavigation from "@/components/ATSNavigation";

const stages=[
 ["new","New lead"],["contacted","Contacted"],["demo_scheduled","Demo scheduled"],
 ["demo_completed","Demo completed"],["proposal","Proposal sent"],
 ["negotiation","Negotiation"],["won","Won"],["lost","Lost"]
];
const sources=["manual","website","linkedin","outreach","referral","other"];
const blank={
 company_name:"",contact_name:"",contact_email:"",contact_phone:"",country:"",
 source:"manual",stage:"new",notes:"",demo_at:"",next_follow_up:""
};
const stageLabel=value=>stages.find(x=>x[0]===value)?.[1]||value||"—";
const humanDate=value=>value?new Date(value).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}):"—";
const formatDemo=value=>value?new Date(value).toLocaleString("en-GB",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}):"—";
const localInputDate=value=>{
 if(!value)return "";
 const d=new Date(value);
 if(Number.isNaN(d.getTime()))return "";
 const pad=n=>String(n).padStart(2,"0");
 return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate())+"T"+pad(d.getHours())+":"+pad(d.getMinutes());
};

const css=`
.im-crm{min-height:100vh;max-width:none;padding:0;margin:0;background:#f5f8f6;color:#1c4230;font:13px/1.65 Arial,Helvetica,sans-serif}
.im-crm *{box-sizing:border-box}
.im-crm-shell{display:grid;grid-template-columns:252px minmax(0,1fr);min-height:100vh}
.im-crm-side{background:#fff;border-right:1px solid #e2ece4;padding:27px 14px}
.im-crm-brand{display:flex;align-items:center;gap:11px;padding:4px 13px 30px;font-size:17px;font-weight:850}
.im-crm-logo{display:grid;place-items:center;width:36px;height:36px;border-radius:11px;background:#14583e;color:white;font-size:23px}
.im-crm-brand small{display:block;font-size:9px;letter-spacing:1.5px;color:#849d90;margin-top:3px}
.im-crm-nav{display:flex;flex-direction:column;gap:4px}
.im-crm-nav a{display:flex;gap:12px;align-items:center;padding:10px 12px;border-radius:10px;text-decoration:none;color:#60776b;font-weight:750;font-size:12px}
.im-crm-nav a.active,.im-crm-nav a:hover{background:#e5f2e9;color:#145f42}
.im-crm-main{min-width:0;padding:0 clamp(18px,3.4vw,52px) 60px}
.im-crm-inner{max-width:1240px;margin:0 auto}
.im-crm-top{min-height:77px;display:flex;align-items:center;justify-content:space-between;gap:10px;border-bottom:1px solid #e2ece4;margin-bottom:30px}
.im-crm-top a{color:#176648;text-decoration:none;font-weight:800}
.im-crm-hero{padding:34px 38px;background:linear-gradient(115deg,#103c2c,#176448 72%,#217755);border-radius:22px;color:#fff}
.im-crm-hero small{color:#bbe7d0;font-size:10px;letter-spacing:1.7px;font-weight:850}
.im-crm-hero h1{font:850 clamp(26px,3vw,36px)/1.16 Arial;color:#fff!important;margin:10px 0}
.im-crm-hero p{color:#d8eade;max-width:780px;margin:0;line-height:1.8}
.im-crm-toolbar{display:flex;gap:10px;justify-content:space-between;align-items:center;flex-wrap:wrap;margin:21px 0}
.im-crm-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin:22px 0}
.im-crm-stat,.im-crm-card{background:#fff;border:1px solid #e0ebe4;border-radius:16px;padding:21px;min-width:0}
.im-crm-stat small{display:block;color:#879b8d;font-size:11px;font-weight:800}
.im-crm-stat strong{display:block;font-size:27px;color:#185b3e;margin:7px 0}
.im-crm-stat span,.im-crm-muted{font-size:11px;color:#7b9282}
.im-crm-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.im-crm-filter{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
.im-crm-btn{display:inline-flex;align-items:center;justify-content:center;text-decoration:none;border:0;border-radius:10px;background:#176448;color:white;padding:11px 16px;font:800 12px Arial;cursor:pointer;white-space:nowrap}
.im-crm-btn.secondary{border:1px solid #cddfd1;background:#fff;color:#176448}
.im-crm-btn:disabled{opacity:.5;cursor:not-allowed}
.im-crm-input,.im-crm-select,.im-crm-textarea{width:100%;min-width:0;border:1px solid #d4e5d9;border-radius:10px;padding:11px 12px;background:#fff;color:#204e37;font:13px Arial}
.im-crm-input:focus,.im-crm-select:focus,.im-crm-textarea:focus{outline:2px solid #90c8a8;outline-offset:1px}
.im-crm-textarea{resize:vertical;min-height:88px}
.im-crm-filter .im-crm-input{width:250px}
.im-crm-filter .im-crm-select{width:170px}
.im-crm-heading{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin:27px 0 12px}
.im-crm-heading h2{font:850 20px Arial;color:#204631;margin:0}
.im-crm-pill{display:inline-block;padding:5px 10px;border-radius:24px;background:#e6f2e8;color:#176648;font-size:10px;font-weight:800}
.im-crm-danger{border:1px solid #ebcabd;background:#fff4ee;color:#a64735;border-radius:12px;padding:13px 16px;margin:18px 0}
.im-crm-success{border:1px solid #c7dfcd;background:#ecf8ef;color:#1d7044;border-radius:12px;padding:13px 16px;margin:18px 0}
.im-crm-formgrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
.im-crm-field{display:flex;flex-direction:column;gap:7px;min-width:0;font-size:11px;font-weight:800;color:#47715a}
.im-crm-wide{grid-column:1/-1}
.im-crm-actions{display:flex;justify-content:flex-end;align-items:center;flex-wrap:wrap;gap:10px;margin-top:17px}
.im-crm-tablewrap{overflow-x:auto}
.im-crm-table{width:100%;min-width:920px;border-collapse:collapse;text-align:left}
.im-crm-table th{font-size:10px;letter-spacing:.65px;text-transform:uppercase;background:#f6faf7;color:#849c8b;padding:13px}
.im-crm-table td{font-size:12px;padding:14px 13px;border-bottom:1px solid #eaf0eb;color:#4a6853;vertical-align:middle}
.im-crm-table td strong{color:#1b5037;font-size:12px}
.im-crm-table td small{display:block;color:#839a8b;margin-top:3px}
.im-crm-table a{color:#176648;font-weight:800}
.im-crm-table .im-crm-select{min-width:150px;padding:8px}
.im-crm-empty{text-align:center;color:#809788;padding:32px}
@media(max-width:1020px){.im-crm-stats{grid-template-columns:repeat(2,minmax(0,1fr))}.im-crm-formgrid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:760px){.im-crm-shell{display:block}.im-crm-side{padding:14px;border-right:0;border-bottom:1px solid #e2ece4}.im-crm-brand{padding:4px 10px 12px}.im-crm-nav{flex-direction:row;overflow:auto}.im-crm-nav a{flex:none;white-space:nowrap}.im-crm-main{padding:0 15px 45px}.im-crm-top{min-height:60px;margin-bottom:16px}.im-crm-hero{padding:26px 22px}.im-crm-formgrid{grid-template-columns:1fr}.im-crm-filter,.im-crm-filter .im-crm-input,.im-crm-filter .im-crm-select{width:100%}}
`;

export default function InternalLeadsPage(){
 const [userId,setUserId]=useState("");
 const [role,setRole]=useState("");
 const [leads,setLeads]=useState([]);
 const [loading,setLoading]=useState(true);
 const [refresh,setRefresh]=useState(0);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const [filter,setFilter]=useState("all");
 const [search,setSearch]=useState("");
 const [formOpen,setFormOpen]=useState(false);
 const [editingId,setEditingId]=useState("");
 const [form,setForm]=useState(blank);
 const [saving,setSaving]=useState("");

 const canManage=role==="sales"||role==="platform_admin";

 useEffect(()=>{
  let active=true;
  (async()=>{
   setLoading(true);setError("");
   const {data:identity,error:identityError}=await supabase.auth.getUser();
   if(identityError||!identity?.user)throw new Error("Please sign in with an approved Inspire Match internal account.");
   const overview=await supabase.rpc("billing_internal_overview");
   if(overview.error)throw overview.error;
   const result=await supabase.from("billing_sales_leads")
    .select("id,company_name,contact_name,contact_email,contact_phone,country,source,stage,notes,demo_at,next_follow_up,created_at,updated_at")
    .order("updated_at",{ascending:false}).limit(500);
   if(result.error)throw result.error;
   if(active){
    setRole(overview.data?.staff_role||"");
    setUserId(identity.user.id);
    setLeads(result.data||[]);
   }
  })().catch(e=>{if(active){setLeads([]);setRole("");setError(e.message||"Could not load internal Sales CRM.");}})
   .finally(()=>{if(active)setLoading(false);});
  return ()=>{active=false;};
 },[refresh]);

 const visible=useMemo(()=>leads.filter(lead=>{
  const matchesStage=filter==="all"||lead.stage===filter;
  const term=search.trim().toLowerCase();
  return matchesStage&&(!term||[lead.company_name,lead.contact_name,lead.contact_email,lead.country]
   .some(v=>String(v||"").toLowerCase().includes(term)));
 }),[leads,filter,search]);

 const updateForm=(field,value)=>setForm(old=>({...old,[field]:value}));
 const closeForm=()=>{setFormOpen(false);setEditingId("");setForm(blank);};
 const openCreate=()=>{setNotice("");setError("");setEditingId("");setForm(blank);setFormOpen(true);};
 const openEdit=lead=>{
  setNotice("");setError("");setEditingId(lead.id);
  setForm({
   company_name:lead.company_name||"",contact_name:lead.contact_name||"",
   contact_email:lead.contact_email||"",contact_phone:lead.contact_phone||"",
   country:lead.country||"",source:lead.source||"manual",stage:lead.stage||"new",
   notes:lead.notes||"",demo_at:localInputDate(lead.demo_at),
   next_follow_up:lead.next_follow_up||""
  });
  setFormOpen(true);
 };

 async function saveLead(e){
  e.preventDefault();
  if(!canManage||!userId||saving)return;
  const company=form.company_name.trim();
  if(company.length<2){setError("Company name must be at least 2 characters.");return;}
  if(form.demo_at&&Number.isNaN(new Date(form.demo_at).getTime())){setError("Enter a valid demo date and time.");return;}
  setSaving("form");setNotice("");setError("");
  const payload={
   company_name:company,
   contact_name:form.contact_name.trim(),
   contact_email:form.contact_email.trim(),
   contact_phone:form.contact_phone.trim(),
   country:form.country.trim(),
   source:form.source,stage:form.stage,notes:form.notes.trim(),
   demo_at:form.demo_at?new Date(form.demo_at).toISOString():null,
   next_follow_up:form.next_follow_up||null,
   updated_by:userId
  };
  try{
   if(editingId){
    const result=await supabase.from("billing_sales_leads").update(payload)
     .eq("id",editingId).select("id");
    if(result.error)throw result.error;
    if(!result.data?.length)throw new Error("No record was updated. Check your Sales permissions.");
   }else{
    const result=await supabase.from("billing_sales_leads")
     .insert({...payload,created_by:userId});
    if(result.error)throw result.error;
   }
   setNotice(editingId?"Lead updated successfully.":"Lead saved successfully.");
   closeForm();setRefresh(v=>v+1);
  }catch(e){setError(e.message||"Could not save lead.");}
  finally{setSaving("");}
 }

 async function changeStage(lead,stage){
  if(!canManage||!userId||saving||stage===lead.stage)return;
  setSaving(lead.id);setNotice("");setError("");
  try{
   const result=await supabase.from("billing_sales_leads").update({stage,updated_by:userId})
    .eq("id",lead.id).select("id");
   if(result.error)throw result.error;
   if(!result.data?.length)throw new Error("No record was updated. Check your Sales permissions.");
   setNotice("Pipeline stage updated.");
   setRefresh(v=>v+1);
  }catch(e){setError(e.message||"Could not update stage.");}
  finally{setSaving("");}
 }

 const activeCount=leads.filter(x=>x.stage!=="won"&&x.stage!=="lost").length;
 const demos=leads.filter(x=>x.stage==="demo_scheduled").length;
 const proposals=leads.filter(x=>x.stage==="proposal"||x.stage==="negotiation").length;
 const pendingFollowups=leads.filter(x=>x.next_follow_up&&x.next_follow_up<=new Date().toISOString().slice(0,10)&&x.stage!=="won"&&x.stage!=="lost").length;

 return <main className="im-crm"><style>{css}</style><div className="im-crm-shell">
  <aside className="im-crm-side">
   <div className="im-crm-brand"><span className="im-crm-logo">I</span>
    <div>Inspire Match<small>TALENT INTELLIGENCE</small></div></div>
   <ATSNavigation className="im-crm-nav"/>
  </aside>
  <section className="im-crm-main"><div className="im-crm-inner">
   <div className="im-crm-top"><strong>Inspire Management / Sales CRM</strong>
    <Link href="/app/billing/internal">Back to Command Center</Link>
   </div>
   <header className="im-crm-hero">
    <small>PRIVATE / SALES OPERATIONS</small>
    <h1>Sales Pipeline &amp; Demo Management</h1>
    <p>Track prospects, plan demos, capture next steps and move opportunities through your private sales pipeline. No public pricing, checkout or client activation.</p>
   </header>
   <div className="im-crm-toolbar">
    <div className="im-crm-row"><span className="im-crm-pill">{role?role.replaceAll("_"," ").toUpperCase():"INTERNAL ACCESS"}</span>
     <span className="im-crm-muted">{canManage?"Sales editing enabled":"Read-only internal view"}</span>
    </div>
    <div className="im-crm-row">
     <button type="button" className="im-crm-btn secondary" disabled={loading} onClick={()=>setRefresh(x=>x+1)}>Refresh</button>
     {canManage&&<button type="button" className="im-crm-btn" onClick={openCreate}>+ Add lead</button>}
    </div>
   </div>
   {loading&&<div className="im-crm-card">Checking internal access and loading leads…</div>}
   {error&&<div className="im-crm-danger" role="alert">{error}</div>}
   {notice&&<div className="im-crm-success" role="status">{notice}</div>}
   {!loading&&!role&&<div className="im-crm-card">Access is limited to explicitly approved Inspire Match internal staff. If the CRM table is missing, apply <code>supabase/sql/saas_sales_leads_crm.sql</code> in Supabase SQL Editor.</div>}
   {!loading&&!!role&&<>
    <div className="im-crm-stats">
     <div className="im-crm-stat"><small>Total leads</small><strong>{leads.length}</strong><span>Private sales records</span></div>
     <div className="im-crm-stat"><small>Active opportunities</small><strong>{activeCount}</strong><span>Excludes won and lost</span></div>
     <div className="im-crm-stat"><small>Scheduled demos</small><strong>{demos}</strong><span>Awaiting presentation</span></div>
     <div className="im-crm-stat"><small>Follow-ups due</small><strong>{pendingFollowups}</strong><span>{proposals} in proposal / negotiation</span></div>
    </div>
    {canManage&&formOpen&&<section className="im-crm-card">
     <div className="im-crm-heading" style={{marginTop:0}}><h2>{editingId?"Edit lead":"Add a new lead"}</h2><span className="im-crm-pill">Internal record</span></div>
     <form onSubmit={saveLead}>
      <div className="im-crm-formgrid">
       <label className="im-crm-field">Company name *
        <input className="im-crm-input" required minLength={2} maxLength={160} value={form.company_name} onChange={e=>updateForm("company_name",e.target.value)}/></label>
       <label className="im-crm-field">Contact name
        <input className="im-crm-input" maxLength={160} value={form.contact_name} onChange={e=>updateForm("contact_name",e.target.value)}/></label>
       <label className="im-crm-field">Work email
        <input className="im-crm-input" type="email" maxLength={254} value={form.contact_email} onChange={e=>updateForm("contact_email",e.target.value)}/></label>
       <label className="im-crm-field">Phone
        <input className="im-crm-input" type="tel" maxLength={60} value={form.contact_phone} onChange={e=>updateForm("contact_phone",e.target.value)}/></label>
       <label className="im-crm-field">Country / Market
        <input className="im-crm-input" maxLength={80} placeholder="Egypt, KSA, UAE…" value={form.country} onChange={e=>updateForm("country",e.target.value)}/></label>
       <label className="im-crm-field">Lead source
        <select className="im-crm-select" value={form.source} onChange={e=>updateForm("source",e.target.value)}>
         {sources.map(s=><option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
        </select></label>
       <label className="im-crm-field">Pipeline stage
        <select className="im-crm-select" value={form.stage} onChange={e=>updateForm("stage",e.target.value)}>
         {stages.map(([value,label])=><option key={value} value={value}>{label}</option>)}
        </select></label>
       <label className="im-crm-field">Demo date &amp; time (local)
        <input className="im-crm-input" type="datetime-local" value={form.demo_at} onChange={e=>updateForm("demo_at",e.target.value)}/></label>
       <label className="im-crm-field">Next follow-up
        <input className="im-crm-input" type="date" value={form.next_follow_up} onChange={e=>updateForm("next_follow_up",e.target.value)}/></label>
       <label className="im-crm-field im-crm-wide">Sales notes &amp; next steps
        <textarea className="im-crm-textarea" maxLength={5000} value={form.notes} onChange={e=>updateForm("notes",e.target.value)} placeholder="Discussion summary, business needs, next action…"/></label>
      </div>
      <div className="im-crm-actions">
       <button type="button" className="im-crm-btn secondary" onClick={closeForm}>Cancel</button>
       <button type="submit" className="im-crm-btn" disabled={!!saving}>{saving==="form"?"Saving…":editingId?"Save changes":"Save lead"}</button>
      </div>
     </form>
    </section>}
    <div className="im-crm-heading"><h2>Prospects &amp; opportunities</h2><span className="im-crm-muted">Latest 500 records • Internal only</span></div>
    <section className="im-crm-card">
     <div className="im-crm-toolbar" style={{marginTop:0}}>
      <div className="im-crm-filter">
       <input className="im-crm-input" aria-label="Search leads" placeholder="Search company, contact, email…" value={search} onChange={e=>setSearch(e.target.value)}/>
       <select className="im-crm-select" aria-label="Filter stage" value={filter} onChange={e=>setFilter(e.target.value)}>
        <option value="all">All stages</option>{stages.map(([value,label])=><option key={value} value={value}>{label}</option>)}
       </select>
      </div>
      <span className="im-crm-muted">{visible.length} matching leads</span>
     </div>
     <div className="im-crm-tablewrap"><table className="im-crm-table">
      <thead><tr><th>Company / Market</th><th>Contact</th><th>Stage</th><th>Demo</th><th>Next follow-up</th><th>Last update</th><th>Action</th></tr></thead>
      <tbody>{visible.map(lead=><tr key={lead.id}>
       <td><strong>{lead.company_name}</strong><small>{lead.country||lead.source}</small></td>
       <td>{lead.contact_name||"—"}<small>{lead.contact_email?<a href={"mailto:"+lead.contact_email}>{lead.contact_email}</a>:lead.contact_phone||"No contact email"}</small></td>
       <td>{canManage?<select className="im-crm-select" aria-label={"Update stage for "+lead.company_name}
        disabled={!!saving} value={lead.stage} onChange={e=>changeStage(lead,e.target.value)}>
         {stages.map(([value,label])=><option key={value} value={value}>{label}</option>)}
        </select>:<span className="im-crm-pill">{stageLabel(lead.stage)}</span>}</td>
       <td>{formatDemo(lead.demo_at)}</td>
       <td>{lead.next_follow_up?humanDate(lead.next_follow_up):"—"}</td>
       <td>{humanDate(lead.updated_at)}</td>
       <td>{canManage?<button className="im-crm-btn secondary" type="button" onClick={()=>openEdit(lead)}>Edit</button>:<span className="im-crm-muted">View only</span>}</td>
      </tr>)}</tbody>
     </table></div>
     {!visible.length&&<div className="im-crm-empty">No matching prospects. {canManage?"Use Add lead to start your private sales pipeline.":"No leads have been added yet."}</div>}
    </section>
    <div className="im-crm-card" style={{marginTop:18,fontSize:12,color:"#597967"}}>
     <strong>Commercial controls:</strong> Leads and demo schedules are private. This module does not issue proposals, create a customer account, grant product access, collect payments or issue tax invoices. Public Request Demo intake will be connected separately with spam protection and consent.
    </div>
   </>}
  </div></section></div></main>;
}
