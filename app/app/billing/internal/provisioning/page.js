"use client";

import Link from "next/link";
import {useEffect,useMemo,useState} from "react";
import {supabase} from "@/lib/supabase";
import ATSNavigation from "@/components/ATSNavigation";

const blank={
 onboarding_id:"",workspace_name:"",country:"",timezone:"Africa/Cairo",proposed_admin_email:"",
 handover_notes:"",signed_contract_verified:false,admin_identity_verified:false,
 security_scope_confirmed:false,tenant_isolation_reviewed:false
};
const steps=[
 ["signed_contract_verified","Contract evidence checked","Verify the signed agreement and approved commercial terms"],
 ["admin_identity_verified","Initial company admin confirmed","Verify the client's nominated admin email and identity"],
 ["security_scope_confirmed","Security requirements reviewed","Check hosting, data-handling and permission requirements"],
 ["tenant_isolation_reviewed","Tenant setup requirements reviewed","Prepare RLS, isolation and access validation before go-live"]
];
const labels={draft:"Draft",submitted_for_review:"Pending approval",approved_for_manual_setup:"Approved for manual setup"};
const progress=r=>Math.round(steps.filter(([k])=>r[k]).length/steps.length*100);
const css=`
.im-pv{min-height:100vh;background:#f5f8f6;color:#193e2c;font:13px/1.65 Arial,Helvetica,sans-serif}
.im-pv *{box-sizing:border-box}
.im-pv-shell{display:grid;grid-template-columns:252px minmax(0,1fr);min-height:100vh}
.im-pv-aside{padding:27px 14px;background:#fff;border-right:1px solid #e2ece4}
.im-pv-brand{display:flex;align-items:center;gap:11px;padding:4px 13px 27px;font-size:17px;font-weight:850}
.im-pv-brand b{width:36px;height:36px;display:grid;place-items:center;border-radius:11px;background:#14583e;color:#fff;font-size:22px}
.im-pv-brand small{font-size:9px;color:#849d90;letter-spacing:1.5px;display:block;margin-top:3px}
.im-pv-nav{display:flex;flex-direction:column;gap:4px}
.im-pv-nav a{display:flex;align-items:center;gap:12px;padding:10px 12px;color:#60776b;border-radius:10px;text-decoration:none;font-size:12px;font-weight:750}
.im-pv-nav a:hover,.im-pv-nav a.active{background:#e5f2e9;color:#145f42}
.im-pv-main{padding:0 clamp(18px,3.4vw,52px) 60px;min-width:0}
.im-pv-inner{max-width:1250px;margin:auto}
.im-pv-top{height:77px;display:flex;align-items:center;justify-content:space-between;gap:12px;border-bottom:1px solid #e2ece4;margin-bottom:30px}
.im-pv-links{display:flex;align-items:center;gap:14px;flex-wrap:wrap}
.im-pv-top a,.im-pv a.im-pv-link{color:#176648;font-weight:800;text-decoration:none}
.im-pv-hero{padding:36px 38px;background:linear-gradient(115deg,#103c2c,#176448 72%,#217755);border-radius:22px;color:#fff}
.im-pv-hero small{letter-spacing:1.7px;color:#bbe7d0;font-weight:850;font-size:10px}
.im-pv-hero h1{color:white!important;font-size:clamp(26px,3vw,36px);margin:9px 0}
.im-pv-hero p{color:#d8eade;max-width:790px;margin:0}
.im-pv-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin:22px 0}
.im-pv-stat,.im-pv-card{padding:22px;background:white;border:1px solid #e0ebe4;border-radius:16px}
.im-pv-stat small{font-size:11px;color:#879b8d;font-weight:800;display:block}
.im-pv-stat strong{font-size:27px;color:#185b3e;display:block;margin:7px 0}
.im-pv-muted{font-size:11px;color:#7b9282}
.im-pv-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin:22px 0 14px}
.im-pv-toolbar h2{font-size:20px;margin:0;color:#204631}
.im-pv-actions{display:flex;gap:9px;align-items:center;flex-wrap:wrap}
.im-pv-btn{border:0;border-radius:10px;background:#176448;color:white;font-size:12px;font-weight:800;cursor:pointer;padding:11px 16px;white-space:nowrap}
.im-pv-btn.alt{background:#e8f3eb;color:#176448}
.im-pv-btn:disabled{opacity:.5;cursor:not-allowed}
.im-pv-fields{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
.im-pv-field{display:flex;flex-direction:column;gap:6px;font-weight:800;font-size:11px;color:#47715a}
.im-pv-field input,.im-pv-field select,.im-pv-field textarea,.im-pv-filter{padding:11px 12px;border:1px solid #d4e5d9;border-radius:10px;background:#fff;color:#204e37;font:13px Arial;min-width:0;width:100%}
.im-pv-full{grid-column:1/-1}
.im-pv-note{padding:15px;background:#eff6f1;border:1px solid #d7e8dc;border-radius:12px;color:#346049;margin:16px 0}
.im-pv-error{background:#fff4ee;border-color:#ebcabd;color:#a64735}
.im-pv-ok{background:#eaf7ed;border-color:#c6dfca;color:#1e6e42}
.im-pv-checklist{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px;margin:15px 0}
.im-pv-check{display:flex;gap:10px;align-items:flex-start;padding:13px;border:1px solid #e3eee6;background:#f8fbf9;border-radius:11px;cursor:pointer}
.im-pv-check input{accent-color:#176448;flex-shrink:0;margin-top:3px}
.im-pv-check strong{display:block;font-size:12px;color:#27543b}
.im-pv-check small{font-size:11px;color:#849b8a;font-weight:400}
.im-pv-pill{display:inline-block;background:#e6f2e8;color:#176648;padding:5px 10px;border-radius:25px;font-size:10px;font-weight:800}
.im-pv-locked{background:#fff3de;color:#78551e}
.im-pv-bar{height:7px;border-radius:9px;background:#dce9df;overflow:hidden;min-width:75px;margin-top:9px}
.im-pv-bar span{display:block;height:100%;background:#18794e;border-radius:9px}
.im-pv-wrap{overflow-x:auto}
.im-pv-table{border-collapse:collapse;width:100%;min-width:1000px;text-align:left}
.im-pv-table th{font-size:10px;letter-spacing:.6px;text-transform:uppercase;background:#f6faf7;color:#849c8b;padding:13px}
.im-pv-table td{font-size:12px;color:#4a6853;padding:14px 13px;border-bottom:1px solid #eaf0eb;vertical-align:middle}
.im-pv-table td strong{color:#1b5037}
@media(max-width:1010px){.im-pv-fields{grid-template-columns:repeat(2,minmax(0,1fr))}.im-pv-stats{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:760px){.im-pv-shell{display:block}.im-pv-aside{padding:14px;border-right:0;border-bottom:1px solid #e2ece4}.im-pv-brand{padding:4px 10px 12px}.im-pv-nav{flex-direction:row;overflow:auto}.im-pv-nav a{white-space:nowrap;flex:none}.im-pv-main{padding:0 15px 45px}.im-pv-top{height:auto;min-height:60px;margin-bottom:16px}.im-pv-hero{padding:26px 22px}.im-pv-fields,.im-pv-stats,.im-pv-checklist{grid-template-columns:1fr}}
`;

export default function CompanyProvisioningPage(){
 const [role,setRole]=useState("");
 const [me,setMe]=useState("");
 const [onboardings,setOnboardings]=useState([]);
 const [contracts,setContracts]=useState([]);
 const [proposals,setProposals]=useState([]);
 const [records,setRecords]=useState([]);
 const [events,setEvents]=useState([]);
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const [acting,setActing]=useState("");
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const [refresh,setRefresh]=useState(0);
 const [formOpen,setFormOpen]=useState(false);
 const [editingId,setEditingId]=useState("");
 const [form,setForm]=useState(blank);
 const [search,setSearch]=useState("");
 const [statusFilter,setStatusFilter]=useState("all");
 const [expandedId,setExpandedId]=useState("");
 const canManage=["sales","platform_admin"].includes(role);
 const canApprove=role==="platform_admin";
 useEffect(()=>{
  let active=true;
  (async()=>{
   setLoading(true);setError("");
   const auth=await supabase.auth.getUser();
   if(auth.error||!auth.data?.user?.id)throw new Error("Sign in with an authorized internal account.");
   const overview=await supabase.rpc("billing_internal_overview");
   if(overview.error)throw overview.error;
   const result=await Promise.all([
    supabase.from("billing_sales_onboardings").select("id,contract_id,status,workspace_name,country,timezone,admin_email").order("created_at",{ascending:false}).limit(500),
    supabase.from("billing_sales_contracts").select("id,proposal_id,contract_reference,status,legal_entity_name").limit(500),
    supabase.from("billing_sales_proposals").select("id,reference,status").limit(500),
    supabase.from("billing_sales_provisioning_requests").select("id,onboarding_id,status,workspace_name,proposed_admin_email,country,timezone,implementation_owner_id,handover_notes,signed_contract_verified,admin_identity_verified,security_scope_confirmed,tenant_isolation_reviewed,activation_gate,linked_company_id,created_by,updated_by,reviewed_by,reviewed_at,created_at,updated_at").order("created_at",{ascending:false}).limit(500),
    supabase.from("billing_sales_provisioning_events").select("id,provisioning_id,action,actor_id,comment,created_at").order("created_at",{ascending:false}).limit(500)
   ]);
   for(const r of result)if(r.error)throw r.error;
   if(active){setRole(overview.data?.staff_role||"");setMe(auth.data.user.id);
    setOnboardings(result[0].data||[]);setContracts(result[1].data||[]);
    setProposals(result[2].data||[]);setRecords(result[3].data||[]);setEvents(result[4].data||[]);
   }
  })().catch(e=>{if(active){setError(e.message||"Could not load provisioning.");setRole("");}})
   .finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;};
 },[refresh]);
 const cById=useMemo(()=>Object.fromEntries(contracts.map(c=>[c.id,c])),[contracts]);
 const pById=useMemo(()=>Object.fromEntries(proposals.map(p=>[p.id,p])),[proposals]);
 const oById=useMemo(()=>Object.fromEntries(onboardings.map(o=>[o.id,o])),[onboardings]);
 const eligible=useMemo(()=>{
  const used=new Set(records.map(r=>r.onboarding_id));
  return onboardings.filter(o=>{
   const c=cById[o.contract_id],p=pById[c?.proposal_id];
   return o.status==="approved_for_provisioning"&&c?.status==="signed"
     &&p?.status==="approved"&&!used.has(o.id);
  });
 },[onboardings,contracts,proposals,records,cById,pById]);
 const filtered=useMemo(()=>{
  const term=search.trim().toLowerCase();
  return records.filter(r=>{
   const o=oById[r.onboarding_id],c=cById[o?.contract_id];
   return (statusFilter==="all"||r.status===statusFilter)&&
    (!term||[r.workspace_name,r.proposed_admin_email,c?.contract_reference]
      .some(v=>String(v||"").toLowerCase().includes(term)));
  });
 },[records,oById,cById,search,statusFilter]);
 const change=(k,v)=>setForm(f=>({...f,[k]:v}));
 const close=()=>{setEditingId("");setForm(blank);setFormOpen(false);};
 const create=()=>{setError("");setNotice("");setEditingId("");setForm(blank);setFormOpen(true);};
 const edit=r=>{setError("");setNotice("");setEditingId(r.id);
  setForm(Object.fromEntries(Object.keys(blank).map(k=>[k,r[k]??blank[k]])));setFormOpen(true);
 };
 const choose=id=>{const o=oById[id];setForm(f=>({...f,onboarding_id:id,
  workspace_name:o?.workspace_name||"",country:o?.country||"",
  timezone:o?.timezone||"Africa/Cairo",proposed_admin_email:o?.admin_email||""}));};
 async function save(e){
  e.preventDefault();if(saving||!canManage)return;
  if(!editingId&&!eligible.some(o=>o.id===form.onboarding_id)){setError("Choose an approved onboarding without a provisioning request.");return;}
  if(form.workspace_name.trim().length<2){setError("Enter the requested workspace name.");return;}
  if(form.proposed_admin_email.trim()&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.proposed_admin_email.trim())){setError("Enter a valid admin email.");return;}
  setSaving(true);setError("");setNotice("");
  try{
   const auth=await supabase.auth.getUser(),id=auth.data?.user?.id;
   if(auth.error||!id)throw new Error("Session expired. Sign in again.");
   const payload=Object.fromEntries(Object.keys(blank).filter(k=>k!=="onboarding_id").map(k=>[k,
    typeof blank[k]==="boolean"?!!form[k]:String(form[k]||"").trim()]));
   payload.updated_by=id;
   const result=editingId?
    await supabase.from("billing_sales_provisioning_requests").update(payload)
      .eq("id",editingId).eq("status","draft").select("id"):
    await supabase.from("billing_sales_provisioning_requests").insert({
      ...payload,onboarding_id:form.onboarding_id,implementation_owner_id:id,created_by:id
    }).select("id");
   if(result.error)throw result.error;
   if(!result.data?.length)throw new Error("Nothing was saved; refresh and check draft status.");
   close();setNotice(editingId?"Provisioning draft updated.":"Provisioning request created, but activation remains blocked.");
   setRefresh(v=>v+1);
  }catch(err){setError(err.message||"Could not save request.");}
  finally{setSaving(false);}
 }
 async function action(request,decision){
  if(acting)return;
  let comment="";
  if(decision==="request_changes"){
   comment=window.prompt("Please specify changes required:")||"";
   if(comment.trim().length<3)return;
  }
  if(decision==="approve"&&!window.confirm(
    "Approve this request for FUTURE manual workspace setup? No company is created, linked or activated."
  ))return;
  setActing(request.id);setError("");setNotice("");
  try{
   const result=decision==="submit"
    ?await supabase.rpc("billing_sales_submit_provisioning",{p_provisioning_id:request.id})
    :await supabase.rpc("billing_sales_review_provisioning",{
       p_provisioning_id:request.id,p_decision:decision,p_comment:comment
     });
   if(result.error)throw result.error;
   setNotice(decision==="submit"?"Provisioning request submitted for independent review.":
    decision==="approve"?"Approved for future manual setup. Activation gate is still BLOCKED.":
    "Returned to draft with reviewer feedback.");
   setRefresh(v=>v+1);
  }catch(err){setError(err.message||"Provisioning action failed.");}
  finally{setActing("");}
 }
 return <main className="im-pv"><style>{css}</style><div className="im-pv-shell">
  <aside className="im-pv-aside"><div className="im-pv-brand"><b>I</b><div>Inspire Match<small>TALENT INTELLIGENCE</small></div></div><ATSNavigation className="im-pv-nav"/></aside>
  <section className="im-pv-main"><div className="im-pv-inner">
   <div className="im-pv-top"><strong>Inspire Management / Provisioning</strong><div className="im-pv-links">
    <Link href="/app/billing/internal">Command Center</Link><Link href="/app/billing/internal/onboarding">Onboarding</Link></div></div>
   <header className="im-pv-hero"><small>INTERNAL / COMPANY PREPARATION</small><h1>Company Provisioning</h1>
    <p>Prepare a workspace handover from approved onboarding. Track internal approvals while keeping tenant creation, subscriptions, invitations and live activation separate.</p>
   </header>
   <div className="im-pv-stats">
    <div className="im-pv-stat"><small>Provisioning requests</small><strong>{records.length}</strong><span className="im-pv-muted">Internal queue</span></div>
    <div className="im-pv-stat"><small>Draft preparation</small><strong>{records.filter(r=>r.status==="draft").length}</strong><span className="im-pv-muted">Editable</span></div>
    <div className="im-pv-stat"><small>Awaiting review</small><strong>{records.filter(r=>r.status==="submitted_for_review").length}</strong><span className="im-pv-muted">Platform Admin approval</span></div>
    <div className="im-pv-stat"><small>Approved for manual setup</small><strong>{records.filter(r=>r.status==="approved_for_manual_setup").length}</strong><span className="im-pv-muted">Still blocked from activation</span></div>
   </div>
   {loading&&<div className="im-pv-note">Loading provisioning requests and permissions…</div>}
   {error&&<div role="alert" className="im-pv-note im-pv-error">{error}</div>}
   {notice&&<div role="status" className="im-pv-note im-pv-ok">{notice}</div>}
   {!loading&&!error&&!role&&<div className="im-pv-note im-pv-error">Only authorized internal Inspire Match staff can access this workspace.</div>}
   {!loading&&role&&<>
    <div className="im-pv-toolbar"><h2>Workspace preparation</h2><div className="im-pv-actions">
     <button type="button" className="im-pv-btn alt" onClick={()=>setRefresh(v=>v+1)}>Refresh</button>
     {canManage&&<button type="button" className="im-pv-btn" disabled={!eligible.length} onClick={create}>+ New request</button>}
    </div></div>
    {!eligible.length&&canManage&&<div className="im-pv-note">
     Requests become available when <Link className="im-pv-link" href="/app/billing/internal/onboarding">Client Onboarding</Link> has independent approval, and its signed contract and proposal remain valid. Each onboarding can have one provisioning request.
    </div>}
    {formOpen&&canManage&&<form className="im-pv-card" onSubmit={save}>
     <div className="im-pv-toolbar" style={{marginTop:0}}><h2>{editingId?"Edit preparation draft":"New provisioning request"}</h2>
      <button type="button" className="im-pv-btn alt" onClick={close}>Cancel</button></div>
     <div className="im-pv-fields">
      <label className="im-pv-field im-pv-full">Approved onboarding
       <select required disabled={!!editingId} value={form.onboarding_id} onChange={e=>choose(e.target.value)}>
        <option value="">Select approved onboarding</option>
        {(editingId?onboardings.filter(o=>o.id===form.onboarding_id):eligible).map(o=><option key={o.id} value={o.id}>
         {o.workspace_name} · {cById[o.contract_id]?.contract_reference||"Contract"}
        </option>)}
       </select>
      </label>
      <label className="im-pv-field">Requested workspace name<input required maxLength={200} value={form.workspace_name} onChange={e=>change("workspace_name",e.target.value)}/></label>
      <label className="im-pv-field">Company country<input value={form.country} maxLength={100} onChange={e=>change("country",e.target.value)} placeholder="Egypt, Saudi Arabia, UAE…"/></label>
      <label className="im-pv-field">Time zone<select value={form.timezone} onChange={e=>change("timezone",e.target.value)}><option value="Africa/Cairo">Cairo</option><option value="Asia/Riyadh">Riyadh</option><option value="Asia/Dubai">Dubai</option><option value="UTC">UTC</option></select></label>
      <label className="im-pv-field im-pv-full">Proposed ATS admin email<input required type="email" maxLength={254} value={form.proposed_admin_email} onChange={e=>change("proposed_admin_email",e.target.value)}/></label>
      <label className="im-pv-field im-pv-full">Provisioning / implementation handover notes<textarea rows={3} maxLength={8000} value={form.handover_notes} onChange={e=>change("handover_notes",e.target.value)} placeholder="Role mapping, separation of tenant data, module configuration requirements, next actions…"/></label>
     </div>
     <div className="im-pv-toolbar"><h2>Readiness verification</h2><span className="im-pv-pill">{progress(form)}% checked</span></div>
     <div className="im-pv-bar"><span style={{width:progress(form)+"%"}}/></div>
     <div className="im-pv-checklist">{steps.map(([k,title,desc])=><label className="im-pv-check" key={k}><input type="checkbox" checked={!!form[k]} onChange={e=>change(k,e.target.checked)}/><span><strong>{title}</strong><small>{desc}</small></span></label>)}</div>
     <div className="im-pv-toolbar" style={{marginBottom:0}}><span className="im-pv-muted">Implementation owner: your authenticated internal account · Activation gate: blocked.</span><button className="im-pv-btn" disabled={saving} type="submit">{saving?"Saving…":"Save request draft"}</button></div>
    </form>}
    <div className="im-pv-card">
     <div className="im-pv-toolbar" style={{marginTop:0}}><h2>Provisioning register</h2>
      <div className="im-pv-actions"><input className="im-pv-filter" style={{width:215}} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search workspace or admin" aria-label="Search provisioning"/>
       <select className="im-pv-filter" style={{width:205}} value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} aria-label="Provisioning status"><option value="all">All statuses</option>{Object.entries(labels).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></div></div>
     <div className="im-pv-wrap"><table className="im-pv-table">
      <thead><tr><th>Workspace</th><th>Onboarding</th><th>Admin</th><th>Readiness</th><th>State</th><th>Activation</th><th>Actions</th></tr></thead>
      <tbody>{filtered.map(r=>{
       const o=oById[r.onboarding_id],contract=cById[o?.contract_id];
       const history=events.filter(e=>e.provisioning_id===r.id);
       const own=r.created_by===me||r.updated_by===me;
       return <tr key={r.id}>
        <td><strong>{r.workspace_name}</strong><div className="im-pv-muted">{r.country||"Country unspecified"}</div></td>
        <td>{contract?.contract_reference||"—"}<div className="im-pv-muted">{o?.workspace_name||"Onboarding"}</div></td>
        <td>{r.proposed_admin_email}</td>
        <td><span className="im-pv-pill">{progress(r)}%</span><div className="im-pv-bar"><span style={{width:progress(r)+"%"}}/></div></td>
        <td><span className="im-pv-pill">{labels[r.status]||r.status}</span></td>
        <td><span className="im-pv-pill im-pv-locked">BLOCKED</span><div className="im-pv-muted">No workspace linked</div></td>
        <td><div className="im-pv-actions">
         {canManage&&r.status==="draft"&&<><button className="im-pv-btn alt" type="button" onClick={()=>edit(r)}>Edit</button><button className="im-pv-btn" type="button" disabled={!!acting} onClick={()=>action(r,"submit")}>Submit</button></>}
         {canApprove&&r.status==="submitted_for_review"&&!own&&<><button className="im-pv-btn" type="button" disabled={!!acting} onClick={()=>action(r,"approve")}>Approve setup</button><button className="im-pv-btn alt" type="button" disabled={!!acting} onClick={()=>action(r,"request_changes")}>Changes</button></>}
         <button type="button" className="im-pv-btn alt" onClick={()=>setExpandedId(v=>v===r.id?"":r.id)}>{expandedId===r.id?"Hide":"History"}</button>
        </div>{expandedId===r.id&&<div className="im-pv-note">{history.length?history.map(e=><div key={e.id}><strong>{e.action.replaceAll("_"," ")}</strong> · {new Date(e.created_at).toLocaleString("en-GB")}<div>{e.comment||"No additional notes"}</div></div>):"No decisions yet"}</div>}</td>
       </tr>;
      })}</tbody>
     </table></div>
     {!filtered.length&&<div className="im-pv-note">{records.length?"No matching records.":"No provisioning requests yet. Start with approved onboarding."}</div>}
    </div>
    <div className="im-pv-note"><strong>Activation stays off.</strong> This is a preparation and independent approval register only. It cannot create an ATS workspace, link tenants, send invitations, enable add-ons, issue invoices or collect payments. Production access controls and tenant-level enforcement require a separate audited rollout.</div>
   </>}
  </div></section>
 </div></main>;
}
