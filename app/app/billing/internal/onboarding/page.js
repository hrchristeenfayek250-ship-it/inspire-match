"use client";

import Link from "next/link";
import {useEffect,useMemo,useState} from "react";
import {supabase} from "@/lib/supabase";
import ATSNavigation from "@/components/ATSNavigation";

const empty={contract_id:"",workspace_name:"",country:"",timezone:"Africa/Cairo",primary_contact_name:"",primary_contact_email:"",primary_contact_phone:"",admin_email:"",implementation_notes:"",contract_file_checked:false,company_details_checked:false,admin_contact_checked:false,security_requirements_checked:false,kickoff_checked:false};
const checks=[
 ["contract_file_checked","Signed contract evidence confirmed","Verify the signed document reference is held securely"],
 ["company_details_checked","Company registration details checked","Confirm legal name, country and workspace identity"],
 ["admin_contact_checked","Admin contact confirmed","Confirm who will administer the ATS workspace"],
 ["security_requirements_checked","Security & privacy requirements discussed","Record any access, hosting and data-handling needs"],
 ["kickoff_checked","Kickoff arrangements confirmed","Agree the initial onboarding handover"]
];
const statusNames={draft:"Draft",submitted_for_review:"Awaiting internal approval",approved_for_provisioning:"Approved for provisioning"};
const css=`
.im-on{min-height:100vh;background:#f5f8f6;color:#1c4230;font:13px/1.6 Arial,Helvetica,sans-serif}
.im-on *{box-sizing:border-box}.im-on-shell{display:grid;grid-template-columns:252px minmax(0,1fr);min-height:100vh}
.im-on-side{background:#fff;border-right:1px solid #e2ece4;padding:27px 14px}
.im-on-brand{display:flex;align-items:center;gap:11px;padding:4px 13px 30px;font-size:17px;font-weight:850}
.im-on-brand b{background:#14583e;color:#fff;display:grid;place-items:center;width:36px;height:36px;border-radius:11px;font-size:23px}
.im-on-brand small{display:block;color:#849d90;font-size:9px;letter-spacing:1.5px;margin-top:3px}
.im-on-nav{display:flex;flex-direction:column;gap:4px}
.im-on-nav a{display:flex;gap:12px;align-items:center;padding:10px 12px;border-radius:10px;color:#60776b;text-decoration:none;font-weight:750;font-size:12px}
.im-on-nav a:hover,.im-on-nav a.active{background:#e5f2e9;color:#145f42}
.im-on-main{min-width:0;padding:0 clamp(18px,3.4vw,52px) 60px}
.im-on-inner{max-width:1230px;margin:auto}
.im-on-top{min-height:77px;display:flex;align-items:center;justify-content:space-between;gap:14px;border-bottom:1px solid #e2ece4;margin-bottom:30px}
.im-on-top a,.im-on a.im-on-link{color:#176648;font-weight:800;text-decoration:none}
.im-on-links{display:flex;gap:16px;flex-wrap:wrap}
.im-on-hero{padding:37px 40px;border-radius:22px;color:#fff;background:linear-gradient(115deg,#103c2c,#176448 72%,#217755)}
.im-on-hero small{font-size:10px;font-weight:850;letter-spacing:1.7px;color:#bbe7d0}
.im-on-hero h1{color:#fff!important;font-size:clamp(26px,3vw,36px);line-height:1.2;margin:10px 0}
.im-on-hero p{color:#d8eade;margin:0;max-width:820px}
.im-on-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin:22px 0}
.im-on-stat,.im-on-card{background:#fff;border:1px solid #e0ebe4;border-radius:16px;padding:22px;min-width:0}
.im-on-stat small{display:block;color:#879b8d;font-size:11px;font-weight:800}
.im-on-stat strong{display:block;color:#185b3e;font-size:27px;margin:7px 0}
.im-on-stat span,.im-on-muted{font-size:11px;color:#7b9282}
.im-on-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin:23px 0 14px}
.im-on-toolbar h2{font-size:20px;color:#204631;margin:0}
.im-on-actions{display:flex;align-items:center;gap:9px;flex-wrap:wrap}
.im-on-btn{border:0;border-radius:10px;background:#176448;color:#fff;padding:11px 16px;font-weight:800;font-size:12px;cursor:pointer;text-decoration:none}
.im-on-btn.secondary{background:#e8f3eb;color:#176448}
.im-on-btn:disabled{opacity:.5;cursor:not-allowed}
.im-on-field{display:flex;flex-direction:column;gap:6px;color:#47715a;font-size:11px;font-weight:800}
.im-on-field input,.im-on-field select,.im-on-field textarea,.im-on-filter{background:#fff;border:1px solid #d4e5d9;color:#204e37;border-radius:10px;padding:11px 12px;font:13px Arial;min-width:0;width:100%}
.im-on-fields{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:15px}
.im-on-wide{grid-column:1/-1}
.im-on-msg{border-radius:12px;padding:14px 16px;margin:16px 0;background:#eaf7ed;color:#1e6e42;border:1px solid #c6dfca}
.im-on-error{background:#fff4ee;color:#a64735;border-color:#ebcabd}
.im-on-note{background:#f0f7f2;color:#476650;border:1px solid #daeadf;border-radius:12px;padding:15px;margin:16px 0}
.im-on-badge{display:inline-block;background:#e6f2e8;border-radius:50px;padding:5px 10px;font-size:10px;font-weight:800;color:#176648}
.im-on-checks{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:14px}
.im-on-check{display:flex;align-items:flex-start;gap:11px;background:#f8fbf9;border:1px solid #e3eee6;border-radius:12px;padding:14px;cursor:pointer}
.im-on-check input{margin:3px 0 0;accent-color:#176448;flex-shrink:0}
.im-on-check strong{display:block;color:#27543b;font-size:12px}
.im-on-check small{display:block;color:#849b8a;font-weight:400;line-height:1.6}
.im-on-progress{height:7px;border-radius:10px;background:#dce9df;overflow:hidden;margin-top:11px}
.im-on-progress span{display:block;height:100%;background:#1b7a53;border-radius:10px}
.im-on-tablewrap{overflow:auto}
.im-on-table{width:100%;min-width:970px;border-collapse:collapse;text-align:left}
.im-on-table th{font-size:10px;letter-spacing:.6px;text-transform:uppercase;color:#849c8b;background:#f6faf7;padding:13px}
.im-on-table td{font-size:12px;padding:14px 13px;border-bottom:1px solid #eaf0eb;vertical-align:middle;color:#4a6853}
.im-on-table td strong{font-size:12px;color:#1b5037}
.im-on-empty{padding:27px 12px;color:#779081}
@media(max-width:1000px){.im-on-fields{grid-template-columns:repeat(2,minmax(0,1fr))}.im-on-stats{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:760px){.im-on-shell{display:block}.im-on-side{padding:14px;border-right:0;border-bottom:1px solid #e2ece4}.im-on-brand{padding:4px 10px 12px}.im-on-nav{flex-direction:row;overflow:auto}.im-on-nav a{white-space:nowrap;flex:none}.im-on-main{padding:0 15px 45px}.im-on-top{min-height:60px;margin-bottom:16px}.im-on-hero{padding:26px 22px}.im-on-fields,.im-on-checks,.im-on-stats{grid-template-columns:1fr}}
`;
const percent=item=>Math.round(checks.filter(([field])=>item[field]).length/checks.length*100);
const validEmail=v=>/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.trim());

export default function ClientOnboardingPage(){
 const [role,setRole]=useState("");
 const [contracts,setContracts]=useState([]);
 const [proposals,setProposals]=useState([]);
 const [leads,setLeads]=useState([]);
 const [records,setRecords]=useState([]);
 const [events,setEvents]=useState([]);
 const [currentUser,setCurrentUser]=useState("");
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const [acting,setActing]=useState("");
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const [refresh,setRefresh]=useState(0);
 const [formOpen,setFormOpen]=useState(false);
 const [editingId,setEditingId]=useState("");
 const [form,setForm]=useState(empty);
 const [search,setSearch]=useState("");
 const [filter,setFilter]=useState("all");
 const [expanded,setExpanded]=useState("");
 const canEdit=role==="sales"||role==="platform_admin";
 const canApprove=role==="platform_admin";

 useEffect(()=>{
  let active=true;
  (async()=>{
   setLoading(true);setError("");
   const auth=await supabase.auth.getUser();
   if(auth.error||!auth.data?.user?.id)throw new Error("Sign in with an authorized internal account.");
   const overview=await supabase.rpc("billing_internal_overview");
   if(overview.error)throw overview.error;
   const [c,p,l,o,e]=await Promise.all([
    supabase.from("billing_sales_contracts").select("id,proposal_id,contract_reference,status,legal_entity_name,signed_at").order("created_at",{ascending:false}).limit(500),
    supabase.from("billing_sales_proposals").select("id,lead_id,reference,title,status").limit(500),
    supabase.from("billing_sales_leads").select("id,company_name").limit(500),
    supabase.from("billing_sales_onboardings").select("id,contract_id,status,workspace_name,country,timezone,primary_contact_name,primary_contact_email,primary_contact_phone,admin_email,implementation_notes,contract_file_checked,company_details_checked,admin_contact_checked,security_requirements_checked,kickoff_checked,created_by,updated_by,reviewed_by,reviewed_at,created_at,updated_at").order("created_at",{ascending:false}).limit(500),
    supabase.from("billing_sales_onboarding_events").select("id,onboarding_id,action,actor_id,comment,created_at").order("created_at",{ascending:false}).limit(500)
   ]);
   for(const r of [c,p,l,o,e])if(r.error)throw r.error;
   if(active){setCurrentUser(auth.data.user.id);setRole(overview.data?.staff_role||"");
    setContracts(c.data||[]);setProposals(p.data||[]);setLeads(l.data||[]);
    setRecords(o.data||[]);setEvents(e.data||[]);}
  })().catch(err=>{if(active){setError(err.message||"Unable to load onboarding.");setRole("");}})
   .finally(()=>{if(active)setLoading(false)});
  return()=>{active=false;};
 },[refresh]);
 const contractById=useMemo(()=>Object.fromEntries(contracts.map(c=>[c.id,c])),[contracts]);
 const proposalById=useMemo(()=>Object.fromEntries(proposals.map(p=>[p.id,p])),[proposals]);
 const leadById=useMemo(()=>Object.fromEntries(leads.map(l=>[l.id,l.company_name])),[leads]);
 const available=useMemo(()=>{
  const used=new Set(records.map(o=>o.contract_id));
  return contracts.filter(c=>c.status==="signed"&&proposalById[c.proposal_id]?.status==="approved"&&!used.has(c.id));
 },[contracts,records,proposalById]);
 const filtered=useMemo(()=>{
  const needle=search.trim().toLowerCase();
  return records.filter(o=>{
   const c=contractById[o.contract_id],p=proposalById[c?.proposal_id];
   const lead=leadById[p?.lead_id];
   return (filter==="all"||filter===o.status)&&(!needle||[o.workspace_name,c?.contract_reference,lead,o.admin_email,o.primary_contact_email]
    .some(v=>String(v||"").toLowerCase().includes(needle)));
  });
 },[records,contractById,proposalById,leadById,search,filter]);
 const change=(k,v)=>setForm(f=>({...f,[k]:v}));
 const closeForm=()=>{setFormOpen(false);setEditingId("");setForm(empty);};
 const create=()=>{setError("");setNotice("");setEditingId("");setForm(empty);setFormOpen(true);};
 const edit=o=>{setError("");setNotice("");setEditingId(o.id);
  setForm(Object.fromEntries(Object.keys(empty).map(k=>[k,o[k]??empty[k]])));setFormOpen(true);
 };
 const showName=c=>{
  const p=proposalById[c?.proposal_id];
  return leadById[p?.lead_id]||c?.legal_entity_name||"Client";
 };
 async function save(e){
  e.preventDefault();if(saving||!canEdit)return;
  if(!editingId&&!available.some(c=>c.id===form.contract_id)){setError("Select a signed contract with no existing onboarding.");return;}
  if(form.workspace_name.trim().length<2){setError("Enter a workspace name.");return;}
  if(form.admin_email.trim()&&!validEmail(form.admin_email)){setError("Check the admin email address.");return;}
  if(form.primary_contact_email.trim()&&!validEmail(form.primary_contact_email)){setError("Check the primary contact email address.");return;}
  setSaving(true);setError("");setNotice("");
  try{
   const auth=await supabase.auth.getUser(),id=auth.data?.user?.id;
   if(auth.error||!id)throw new Error("Session expired. Sign in again.");
   const payload=Object.fromEntries(Object.keys(empty).filter(k=>k!=="contract_id").map(k=>[k,typeof empty[k]==="boolean"?!!form[k]:String(form[k]||"").trim()]));
   payload.updated_by=id;
   const result=editingId
    ?await supabase.from("billing_sales_onboardings").update(payload).eq("id",editingId).eq("status","draft").select("id")
    :await supabase.from("billing_sales_onboardings").insert({...payload,contract_id:form.contract_id,created_by:id}).select("id");
   if(result.error)throw result.error;
   if(!result.data?.length)throw new Error("Nothing was saved. Refresh and check the record status.");
   closeForm();setNotice(editingId?"Onboarding draft updated.":"Onboarding draft created. No client account was activated.");
   setRefresh(v=>v+1);
  }catch(err){setError(err.message||"Could not save onboarding.");}
  finally{setSaving(false);}
 }
 async function action(o,decision){
  if(acting)return;
  let comment="";
  if(decision==="request_changes"){
   comment=window.prompt("Why is this onboarding being returned for changes?")||"";
   if(comment.trim().length<3)return;
  }
  if(decision==="approve"&&!window.confirm("Approve internal preparation only? No workspace, invitation, subscription or payment will be created."))return;
  setActing(o.id);setError("");setNotice("");
  try{
   const result=decision==="submit"
    ?await supabase.rpc("billing_sales_submit_onboarding",{p_onboarding_id:o.id})
    :await supabase.rpc("billing_sales_review_onboarding",{p_onboarding_id:o.id,p_decision:decision,p_comment:comment});
   if(result.error)throw result.error;
   setNotice(decision==="submit"?"Submitted for independent internal review.":decision==="approve"?"Approved for future provisioning. No account created.":"Returned to draft with review feedback.");
   setRefresh(v=>v+1);
  }catch(err){setError(err.message||"Workflow action failed.");}
  finally{setActing("");}
 }
 return <main className="im-on"><style>{css}</style><div className="im-on-shell">
  <aside className="im-on-side"><div className="im-on-brand"><b>I</b><div>Inspire Match<small>TALENT INTELLIGENCE</small></div></div><ATSNavigation className="im-on-nav"/></aside>
  <section className="im-on-main"><div className="im-on-inner">
   <div className="im-on-top"><strong>Inspire Management / Client Onboarding</strong><div className="im-on-links"><Link href="/app/billing/internal">Command Center</Link><Link href="/app/billing/internal/contracts">Contracts</Link><Link href="/app/billing/internal/provisioning">Provisioning</Link></div></div>
   <header className="im-on-hero"><small>PRIVATE / CUSTOMER IMPLEMENTATION</small><h1>Client Onboarding</h1>
    <p>Prepare client data and collect implementation readiness checks after contract signature. Approval here is internal only — accounts, subscriptions and payments remain untouched.</p></header>
   <div className="im-on-stats">
    <div className="im-on-stat"><small>Onboarding records</small><strong>{records.length}</strong><span>Private client preparation</span></div>
    <div className="im-on-stat"><small>In preparation</small><strong>{records.filter(o=>o.status==="draft").length}</strong><span>Editable drafts</span></div>
    <div className="im-on-stat"><small>Awaiting approval</small><strong>{records.filter(o=>o.status==="submitted_for_review").length}</strong><span>Independent review</span></div>
    <div className="im-on-stat"><small>Approved for provisioning</small><strong>{records.filter(o=>o.status==="approved_for_provisioning").length}</strong><span>No automatic activation</span></div>
   </div>
   {loading&&<div className="im-on-note">Loading internal onboarding records…</div>}
   {error&&<div className="im-on-msg im-on-error" role="alert">{error}</div>}
   {notice&&<div className="im-on-msg" role="status">{notice}</div>}
   {!loading&&!error&&!role&&<div className="im-on-msg im-on-error">Only authorized Inspire Match internal staff can access this module.</div>}
   {!loading&&role&&<>
    <div className="im-on-toolbar"><h2>Client preparation</h2><div className="im-on-actions">
     <button className="im-on-btn secondary" onClick={()=>setRefresh(v=>v+1)}>Refresh</button>
     {canEdit&&<button className="im-on-btn" disabled={!available.length} onClick={create}>+ New onboarding</button>}
    </div></div>
    {canEdit&&!available.length&&<div className="im-on-note">New onboarding becomes available after a contract is marked <strong>Signed</strong> and its proposal remains approved. <Link className="im-on-link" href="/app/billing/internal/contracts">Open Contracts</Link>.</div>}
    {canEdit&&formOpen&&<form className="im-on-card" onSubmit={save}>
     <div className="im-on-toolbar" style={{marginTop:0}}><h2>{editingId?"Edit onboarding draft":"Create onboarding draft"}</h2><button type="button" className="im-on-btn secondary" onClick={closeForm}>Close</button></div>
     <div className="im-on-fields">
      <label className="im-on-field im-on-wide">Signed contract
       <select required value={form.contract_id} disabled={!!editingId} onChange={e=>{
        const id=e.target.value,c=contractById[id];setForm(f=>({...f,contract_id:id,workspace_name:c?.legal_entity_name||f.workspace_name}));
       }}>
        <option value="">Choose signed contract</option>
        {(editingId?contracts.filter(c=>c.id===form.contract_id):available).map(c=><option key={c.id} value={c.id}>{c.contract_reference} · {showName(c)} · {c.legal_entity_name}</option>)}
       </select>
      </label>
      <label className="im-on-field">Requested workspace name<input required maxLength={200} value={form.workspace_name} onChange={e=>change("workspace_name",e.target.value)} placeholder="Client workspace display name"/></label>
      <label className="im-on-field">Country<input maxLength={100} value={form.country} onChange={e=>change("country",e.target.value)} placeholder="Egypt / Saudi Arabia / UAE…"/></label>
      <label className="im-on-field">Time zone<select value={form.timezone} onChange={e=>change("timezone",e.target.value)}><option value="Africa/Cairo">Cairo</option><option value="Asia/Riyadh">Riyadh</option><option value="Asia/Dubai">Dubai</option><option value="UTC">UTC / Other</option></select></label>
      <label className="im-on-field">Primary contact name<input maxLength={160} value={form.primary_contact_name} onChange={e=>change("primary_contact_name",e.target.value)} placeholder="Client coordinator"/></label>
      <label className="im-on-field">Primary contact email<input type="email" maxLength={254} value={form.primary_contact_email} onChange={e=>change("primary_contact_email",e.target.value)} placeholder="contact@company.com"/></label>
      <label className="im-on-field">Primary contact phone<input type="tel" maxLength={45} value={form.primary_contact_phone} onChange={e=>change("primary_contact_phone",e.target.value)} placeholder="+20 / +966 / +971"/></label>
      <label className="im-on-field im-on-wide">Proposed initial ATS admin email<input type="email" maxLength={254} value={form.admin_email} onChange={e=>change("admin_email",e.target.value)} placeholder="hr-admin@company.com"/></label>
      <label className="im-on-field im-on-wide">Implementation &amp; security notes<textarea rows={3} value={form.implementation_notes} onChange={e=>change("implementation_notes",e.target.value)} placeholder="Requested modules, onboarding considerations, data access, hosting needs…"/></label>
     </div>
     <div className="im-on-toolbar"><h2>Readiness checklist</h2><span className="im-on-badge">{percent(form)}% complete</span></div>
     <div className="im-on-progress"><span style={{width:percent(form)+"%"}}/></div>
     <div className="im-on-checks">{checks.map(([key,title,description])=><label className="im-on-check" key={key}>
      <input type="checkbox" checked={!!form[key]} onChange={e=>change(key,e.target.checked)}/>
      <span><strong>{title}</strong><small>{description}</small></span></label>)}</div>
     <div className="im-on-toolbar" style={{marginBottom:0}}><span className="im-on-muted">Draft only. Every checkbox must be confirmed before review submission.</span><button type="submit" disabled={saving} className="im-on-btn">{saving?"Saving…":"Save onboarding draft"}</button></div>
    </form>}
    <div className="im-on-card">
     <div className="im-on-toolbar" style={{marginTop:0}}><h2>Onboarding register</h2><div className="im-on-actions">
      <input className="im-on-filter" style={{width:220}} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search client or contract" aria-label="Search onboarding"/>
      <select className="im-on-filter" style={{width:200}} value={filter} onChange={e=>setFilter(e.target.value)} aria-label="Filter onboarding status"><option value="all">All statuses</option>{Object.entries(statusNames).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select>
     </div></div>
     <div className="im-on-tablewrap"><table className="im-on-table">
      <thead><tr><th>Client &amp; workspace</th><th>Signed contract</th><th>Admin email</th><th>Checks</th><th>Status</th><th>Actions</th></tr></thead>
      <tbody>{filtered.map(o=>{
       const contract=contractById[o.contract_id],progress=percent(o),own=o.created_by===currentUser||o.updated_by===currentUser;
       const history=events.filter(e=>e.onboarding_id===o.id);
       return <tr key={o.id}>
        <td><strong>{o.workspace_name||showName(contract)}</strong><div className="im-on-muted">{o.country||"Country not set"} · {showName(contract)}</div></td>
        <td>{contract?.contract_reference||"—"}<div className="im-on-muted">Signed contract required</div></td>
        <td>{o.admin_email||"—"}</td>
        <td><span className="im-on-badge">{progress}%</span><div className="im-on-progress"><span style={{width:progress+"%"}}/></div></td>
        <td><span className="im-on-badge">{statusNames[o.status]||o.status}</span></td>
        <td><div className="im-on-actions">
         {canEdit&&o.status==="draft"&&<><button className="im-on-btn secondary" onClick={()=>edit(o)}>Edit</button><button className="im-on-btn" disabled={!!acting} onClick={()=>action(o,"submit")}>Submit for review</button></>}
         {canApprove&&o.status==="submitted_for_review"&&!own&&<><button className="im-on-btn" disabled={!!acting} onClick={()=>action(o,"approve")}>Approve</button><button className="im-on-btn secondary" disabled={!!acting} onClick={()=>action(o,"request_changes")}>Request changes</button></>}
         <button className="im-on-btn secondary" onClick={()=>setExpanded(v=>v===o.id?"":o.id)}>{expanded===o.id?"Hide history":"History"}</button>
        </div>
        {expanded===o.id&&<div className="im-on-note" style={{minWidth:280}}>{history.length?history.map(e=><div key={e.id} style={{marginBottom:9}}><strong>{e.action.replaceAll("_"," ")}</strong> · {new Date(e.created_at).toLocaleString("en-GB")}<div>{e.comment||"No additional note"}</div></div>):"No workflow events yet."}</div>}
        </td>
       </tr>;
      })}</tbody>
     </table></div>
     {!filtered.length&&<div className="im-on-empty">{records.length?"No records match this filter.":"No client onboarding records yet."}</div>}
    </div>
    <div className="im-on-note"><strong>Activation stays off.</strong> “Approved for provisioning” means the internal onboarding data is reviewed. This screen does not create a company, invite users, enable modules, issue invoices or collect payments.</div>
   </>}
  </div></section>
 </div></main>;
}
