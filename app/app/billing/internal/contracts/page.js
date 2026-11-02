"use client";

import Link from "next/link";
import {useEffect,useMemo,useState} from "react";
import {supabase} from "@/lib/supabase";
import ATSNavigation from "@/components/ATSNavigation";

const empty={proposal_id:"",legal_entity_name:"",effective_date:"",expiry_date:"",contract_notes:""};
const money=(value,currency)=>value==null?"Not set":new Intl.NumberFormat("en-US",{style:"currency",currency:currency||"EGP"}).format(Number(value)/100);
const formatDate=value=>value?new Date(value).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}):"—";
const statusLabels={draft:"Draft",legal_review:"Legal review",ready_for_signature:"Ready for signature",signed:"Signed",cancelled:"Cancelled"};
const css=`
.im-contracts{min-height:100vh;background:#f5f8f6;color:#1c4230;font:13px/1.65 Arial,Helvetica,sans-serif}
.im-contracts *{box-sizing:border-box}
.im-contracts-shell{display:grid;grid-template-columns:252px minmax(0,1fr);min-height:100vh}
.im-contracts-side{background:#fff;border-right:1px solid #e2ece4;padding:27px 14px}
.im-contracts-brand{display:flex;align-items:center;gap:11px;padding:4px 13px 30px;font-weight:850;font-size:17px}
.im-contracts-logo{display:grid;place-items:center;width:36px;height:36px;border-radius:11px;background:#14583e;color:#fff;font-size:22px}
.im-contracts-brand small{display:block;font-size:9px;letter-spacing:1.5px;color:#849d90;margin-top:3px}
.im-contracts-nav{display:flex;flex-direction:column;gap:4px}
.im-contracts-nav a{display:flex;gap:12px;align-items:center;padding:10px 12px;border-radius:10px;color:#60776b;font-weight:750;text-decoration:none;font-size:12px}
.im-contracts-nav a:hover,.im-contracts-nav a.active{background:#e5f2e9;color:#145f42}
.im-contracts-main{min-width:0;padding:0 clamp(18px,3.4vw,52px) 60px}
.im-contracts-inner{max-width:1240px;margin:0 auto}
.im-contracts-top{min-height:77px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #e2ece4;gap:12px;margin-bottom:30px}
.im-contracts-top a,.im-contracts a.im-contracts-link{color:#176648;font-weight:800;text-decoration:none}
.im-contracts-hero{background:linear-gradient(115deg,#103c2c,#176448 72%,#217755);border-radius:22px;padding:34px 38px;color:#fff}
.im-contracts-hero small{font-weight:850;color:#bbe7d0;font-size:10px;letter-spacing:1.7px}
.im-contracts-hero h1{font:850 clamp(26px,3vw,36px)/1.16 Arial;color:#fff!important;margin:10px 0}
.im-contracts-hero p{margin:0;color:#d8eade;line-height:1.8;max-width:830px}
.im-contracts-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin:22px 0}
.im-contracts-stat,.im-contracts-card{background:#fff;border:1px solid #e0ebe4;border-radius:16px;padding:22px;min-width:0}
.im-contracts-stat small{color:#879b8d;display:block;font-size:11px;font-weight:800}
.im-contracts-stat strong{display:block;font-size:27px;color:#185b3e;margin:7px 0}
.im-contracts-stat span,.im-contracts-muted{color:#7b9282;font-size:11px}
.im-contracts-controls{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin:23px 0 14px}
.im-contracts-controls h2{font:850 20px Arial;margin:0;color:#204631}
.im-contracts-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.im-contracts-btn{border:0;border-radius:10px;background:#176448;color:white;padding:11px 16px;font:800 12px Arial;cursor:pointer;text-decoration:none;display:inline-block}
.im-contracts-btn.secondary{background:#eef7f0;color:#17583e}
.im-contracts-btn:disabled{opacity:.55;cursor:not-allowed}
.im-contracts-input{min-width:0;width:100%;padding:11px 12px;border:1px solid #d4e5d9;border-radius:10px;background:#fff;color:#204e37;font:13px Arial}
.im-contracts-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:15px}
.im-contracts-field{display:flex;flex-direction:column;gap:6px;color:#47715a;font-size:11px;font-weight:800}
.im-contracts-wide{grid-column:1/-1}
.im-contracts-notice{border-radius:12px;padding:13px 16px;background:#ecf8ef;color:#1d7044;border:1px solid #c7dfcd;margin:18px 0}
.im-contracts-error{border-radius:12px;padding:13px 16px;background:#fff4ee;color:#a64735;border:1px solid #ebcabd;margin:18px 0}
.im-contracts-tablewrap{overflow:auto}
.im-contracts-table{width:100%;min-width:1000px;border-collapse:collapse;text-align:left}
.im-contracts-table th{font-size:10px;letter-spacing:.65px;text-transform:uppercase;background:#f6faf7;color:#849c8b;padding:13px}
.im-contracts-table td{font-size:12px;padding:14px 13px;border-bottom:1px solid #eaf0eb;color:#4a6853;vertical-align:middle}
.im-contracts-table td strong{color:#1b5037}
.im-contracts-pill{display:inline-block;border-radius:20px;background:#e6f2e8;color:#176648;font-size:10px;font-weight:800;padding:5px 10px}
.im-contracts-info{background:#eff6f0;border:1px solid #d7e8dc;border-radius:12px;padding:16px;margin:18px 0;color:#346049}
@media(max-width:1020px){.im-contracts-stats{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:760px){.im-contracts-shell{display:block}.im-contracts-side{padding:14px;border-right:0;border-bottom:1px solid #e2ece4}.im-contracts-nav{flex-direction:row;overflow:auto}.im-contracts-nav a{white-space:nowrap;flex:none}.im-contracts-brand{padding:4px 10px 12px}.im-contracts-main{padding:0 15px 45px}.im-contracts-top{min-height:60px;margin-bottom:16px}.im-contracts-hero{padding:26px 22px}.im-contracts-stats,.im-contracts-fields{grid-template-columns:1fr}}
`;

export default function InternalContractsPage(){
 const [role,setRole]=useState("");
 const [proposals,setProposals]=useState([]);
 const [leads,setLeads]=useState([]);
 const [contracts,setContracts]=useState([]);
 const [events,setEvents]=useState([]);
 const [userId,setUserId]=useState("");
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const [refresh,setRefresh]=useState(0);
 const [form,setForm]=useState(empty);
 const [editingId,setEditingId]=useState("");
 const [showForm,setShowForm]=useState(false);
 const [saving,setSaving]=useState(false);
 const [workingId,setWorkingId]=useState("");
 const [reviewTarget,setReviewTarget]=useState(null);
 const [reviewReason,setReviewReason]=useState("");
 const [signatureTarget,setSignatureTarget]=useState(null);
 const [signature,setSignature]=useState({signed_date:"",document_reference:"",client_signatory:"",vendor_signatory:""});
 const [expandedId,setExpandedId]=useState("");
 const [search,setSearch]=useState("");
 const [statusFilter,setStatusFilter]=useState("all");
 const canManage=role==="sales"||role==="platform_admin";
 const canReview=role==="legal"||role==="platform_admin";

 useEffect(()=>{
  let active=true;
  (async()=>{
   setLoading(true);setError("");
   const auth=await supabase.auth.getUser();
   if(auth?.error||!auth?.data?.user?.id)throw new Error("Sign in with an approved Inspire Match internal account.");
   const overview=await supabase.rpc("billing_internal_overview");
   if(overview.error)throw overview.error;
   const [proposalsRes,leadsRes,contractsRes,eventsRes]=await Promise.all([
    supabase.from("billing_sales_proposals").select("id,lead_id,reference,title,status,currency,setup_fee_minor,recurring_fee_minor,billing_interval").order("created_at",{ascending:false}).limit(500),
    supabase.from("billing_sales_leads").select("id,company_name").order("company_name").limit(500),
    supabase.from("billing_sales_contracts").select("id,proposal_id,contract_reference,status,legal_entity_name,contract_notes,effective_date,expiry_date,signed_at,signed_document_reference,client_signatory_name,vendor_signatory_name,signature_date,legal_reviewed_at,signature_recorded_at,created_by,updated_by,created_at,updated_at").order("created_at",{ascending:false}).limit(500),
    supabase.from("billing_sales_contract_events").select("id,contract_id,action,actor_id,comment,created_at").order("created_at",{ascending:false}).limit(500)
   ]);
   if(proposalsRes.error)throw proposalsRes.error;
   if(leadsRes.error)throw leadsRes.error;
   if(contractsRes.error)throw contractsRes.error;
   if(eventsRes.error)throw eventsRes.error;
   if(active){setUserId(auth.data.user.id);setRole(overview.data?.staff_role||"");setProposals(proposalsRes.data||[]);setLeads(leadsRes.data||[]);setContracts(contractsRes.data||[]);setEvents(eventsRes.data||[]);}
  })().catch(err=>{if(active){setError(err.message||"Unable to load internal contracts.");setRole("");}})
   .finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;};
 },[refresh]);

 const proposalById=useMemo(()=>Object.fromEntries(proposals.map(x=>[x.id,x])),[proposals]);
 const leadById=useMemo(()=>Object.fromEntries(leads.map(x=>[x.id,x.company_name])),[leads]);
 const availableProposals=useMemo(()=>{
  const taken=new Set(contracts.map(c=>c.proposal_id));
  return proposals.filter(p=>p.status==="approved"&&!taken.has(p.id));
 },[proposals,contracts]);
 const filtered=useMemo(()=>{
  const term=search.trim().toLowerCase();
  return contracts.filter(c=>{
   const proposal=proposalById[c.proposal_id];
   const company=leadById[proposal?.lead_id]||"";
   return (statusFilter==="all"||statusFilter===c.status)&&
    (!term||[c.contract_reference,c.legal_entity_name,proposal?.reference,proposal?.title,company]
     .some(v=>String(v||"").toLowerCase().includes(term)));
  });
 },[contracts,proposalById,leadById,statusFilter,search]);

 const change=(field,value)=>setForm(current=>({...current,[field]:value}));
 const closeForm=()=>{setShowForm(false);setEditingId("");setForm(empty);};
 const create=()=>{setError("");setNotice("");setEditingId("");setForm(empty);setShowForm(true);};
 const edit=contract=>{
  setError("");setNotice("");setEditingId(contract.id);
  setForm({
   proposal_id:contract.proposal_id,
   legal_entity_name:contract.legal_entity_name||"",
   effective_date:contract.effective_date||"",
   expiry_date:contract.expiry_date||"",
   contract_notes:contract.contract_notes||""
  });
  setShowForm(true);
 };
 async function save(event){
  event.preventDefault();
  if(saving||!canManage)return;
  const legalName=form.legal_entity_name.trim();
  if(legalName.length<2){setError("Enter the client's legal entity name.");return;}
  if(form.effective_date&&form.expiry_date&&form.expiry_date<form.effective_date){setError("Expiry date cannot be earlier than the effective date.");return;}
  if(!editingId&&!availableProposals.some(p=>p.id===form.proposal_id)){setError("Select an approved proposal without an existing contract.");return;}
  setSaving(true);setError("");setNotice("");
  try{
   const auth=await supabase.auth.getUser();
   const id=auth?.data?.user?.id;
   if(!id)throw new Error("Your login session expired. Please sign in again.");
   const payload={
    legal_entity_name:legalName,
    effective_date:form.effective_date||null,
    expiry_date:form.expiry_date||null,
    contract_notes:form.contract_notes.trim(),
    updated_by:id
   };
   const response=editingId?
    await supabase.from("billing_sales_contracts").update(payload).eq("id",editingId).eq("status","draft").select("id"):
    await supabase.from("billing_sales_contracts").insert({...payload,proposal_id:form.proposal_id,created_by:id}).select("id");
   if(response.error)throw response.error;
   if(!response.data?.length)throw new Error("No draft was updated. Refresh and check its current status.");
   setNotice(editingId?"Contract draft updated. No signature or activation was performed.":"Contract draft created. No signature or activation was performed.");
   closeForm();setRefresh(x=>x+1);
  }catch(err){setError(err.message||"Unable to save contract draft.");}
  finally{setSaving(false);}
 }

 async function runContractAction(contract,action,comment=""){
  if(workingId||!contract)return;
  setWorkingId(contract.id);setError("");setNotice("");
  try{
   const result=action==="submit_for_legal"
    ?await supabase.rpc("billing_sales_submit_contract",{p_contract_id:contract.id})
    :await supabase.rpc("billing_sales_review_contract",{p_contract_id:contract.id,p_decision:action,p_comment:comment});
   if(result.error)throw result.error;
   setNotice(action==="submit_for_legal"?"Submitted for independent legal review.":action==="approve_legal"?"Legal review approved. Ready for external signatures.":"Returned to draft with legal feedback.");
   setReviewTarget(null);setReviewReason("");setExpandedId(contract.id);setRefresh(n=>n+1);
  }catch(err){setError(err.message||"Contract workflow could not be updated.");}
  finally{setWorkingId("");}
 }
 async function recordSignature(event){
  event.preventDefault();
  if(workingId||!signatureTarget)return;
  if(!signature.signed_date||!signature.document_reference.trim()||!signature.client_signatory.trim()||!signature.vendor_signatory.trim()){
   setError("Signed date, private document reference and both signatories are required.");return;
  }
  setWorkingId(signatureTarget.id);setError("");setNotice("");
  try{
   const result=await supabase.rpc("billing_sales_record_signature",{
    p_contract_id:signatureTarget.id,p_signed_date:signature.signed_date,
    p_document_reference:signature.document_reference.trim(),
    p_client_signatory:signature.client_signatory.trim(),
    p_vendor_signatory:signature.vendor_signatory.trim()
   });
   if(result.error)throw result.error;
   setNotice("External signature evidence recorded internally. No digital signature, activation or payment occurred.");
   setExpandedId(signatureTarget.id);setSignatureTarget(null);
   setSignature({signed_date:"",document_reference:"",client_signatory:"",vendor_signatory:""});
   setRefresh(n=>n+1);
  }catch(err){setError(err.message||"Could not record signature evidence.");}
  finally{setWorkingId("");}
 }
 const reviewLabel={submit_for_legal:"Submitted for legal review",approve_legal:"Approved by legal reviewer",request_changes:"Changes requested",record_signature:"External signature recorded"};
 return <main className="im-contracts"><style>{css}</style><div className="im-contracts-shell">
  <aside className="im-contracts-side">
   <div className="im-contracts-brand"><span className="im-contracts-logo">I</span><div>Inspire Match<small>TALENT INTELLIGENCE</small></div></div>
   <ATSNavigation className="im-contracts-nav"/>
  </aside>
  <section className="im-contracts-main"><div className="im-contracts-inner">
   <div className="im-contracts-top"><strong>Inspire Management / Contracts</strong><div className="im-contracts-actions">
    <Link href="/app/billing/internal">Command Center</Link><Link href="/app/billing/internal/proposals">Proposals</Link></div></div>
   <header className="im-contracts-hero"><small>PRIVATE / SALES &amp; LEGAL OPERATIONS</small>
    <h1>Contract Management</h1>
    <p>Prepare contracts, request independent legal approval and record verified external signatures. No built-in electronic signing, subscription activation or payments.</p>
   </header>
   <div className="im-contracts-stats">
    <div className="im-contracts-stat"><small>Total contracts</small><strong>{contracts.length}</strong><span>Internal records</span></div>
    <div className="im-contracts-stat"><small>Draft contracts</small><strong>{contracts.filter(c=>c.status==="draft").length}</strong><span>Ready for preparation</span></div>
    <div className="im-contracts-stat"><small>Awaiting legal / signature</small><strong>{contracts.filter(c=>["legal_review","ready_for_signature"].includes(c.status)).length}</strong><span>Controlled internal review</span></div>
    <div className="im-contracts-stat"><small>Approved proposals available</small><strong>{availableProposals.length}</strong><span>Eligible to create contract</span></div>
   </div>
   {loading&&<div className="im-contracts-info">Loading internal contracts and permissions…</div>}
   {error&&<div role="alert" className="im-contracts-error">{error}</div>}
   {notice&&<div role="status" className="im-contracts-notice">{notice}</div>}
   {!loading&&!error&&!role&&<div className="im-contracts-error">Access is limited to approved Inspire Match internal Sales and Finance staff.</div>}
   {!loading&&role&&<>
    <div className="im-contracts-controls">
     <h2>Contracts register</h2>
     <div className="im-contracts-actions"><button className="im-contracts-btn secondary" onClick={()=>setRefresh(x=>x+1)}>Refresh</button>
      {canManage&&<button className="im-contracts-btn" onClick={create} disabled={!availableProposals.length}>+ New contract</button>}</div>
    </div>
    {canManage&&!availableProposals.length&&<div className="im-contracts-info">To create a contract, first approve a commercial proposal in <Link className="im-contracts-link" href="/app/billing/internal/proposals">Commercial Proposals</Link>. Each approved proposal can have one contract.</div>}
    {showForm&&canManage&&<form className="im-contracts-card" onSubmit={save}>
     <div className="im-contracts-controls" style={{marginTop:0}}><h2>{editingId?"Edit contract draft":"New contract draft"}</h2><button type="button" className="im-contracts-btn secondary" onClick={closeForm}>Cancel</button></div>
     <div className="im-contracts-fields">
      <label className="im-contracts-field im-contracts-wide">Approved proposal
       <select className="im-contracts-input" value={form.proposal_id} disabled={!!editingId} required onChange={e=>change("proposal_id",e.target.value)}>
        <option value="">Select an approved proposal</option>
        {(editingId?proposals.filter(p=>p.id===form.proposal_id):availableProposals).map(p=><option key={p.id} value={p.id}>{leadById[p.lead_id]||"Company"} · {p.reference} · {p.title}</option>)}
       </select>
      </label>
      {form.proposal_id&&proposalById[form.proposal_id]&&<div className="im-contracts-info im-contracts-wide" style={{margin:0}}>
       Commercial terms (internal): Setup {money(proposalById[form.proposal_id].setup_fee_minor,proposalById[form.proposal_id].currency)} · Recurring {money(proposalById[form.proposal_id].recurring_fee_minor,proposalById[form.proposal_id].currency)} / {proposalById[form.proposal_id].billing_interval}
      </div>}
      <label className="im-contracts-field im-contracts-wide">Client legal entity name
       <input className="im-contracts-input" value={form.legal_entity_name} onChange={e=>change("legal_entity_name",e.target.value)} maxLength={250} required placeholder="Company's registered legal name"/>
      </label>
      <label className="im-contracts-field">Effective date (optional)
       <input type="date" className="im-contracts-input" value={form.effective_date} onChange={e=>change("effective_date",e.target.value)}/>
      </label>
      <label className="im-contracts-field">Expiry date (optional)
       <input type="date" className="im-contracts-input" value={form.expiry_date} onChange={e=>change("expiry_date",e.target.value)}/>
      </label>
      <label className="im-contracts-field im-contracts-wide">Legal / internal contract notes
       <textarea rows={4} className="im-contracts-input" value={form.contract_notes} onChange={e=>change("contract_notes",e.target.value)} placeholder="Contract scope, special terms, legal review notes…"/>
      </label>
     </div>
     <div className="im-contracts-controls" style={{marginBottom:0}}><small className="im-contracts-muted">Draft only · No signatures, client account creation or billing.</small><button type="submit" className="im-contracts-btn" disabled={saving}>{saving?"Saving…":"Save contract draft"}</button></div>
    </form>}
    <div className="im-contracts-card">
     <div className="im-contracts-controls" style={{marginTop:0}}><div className="im-contracts-muted">Latest 500 contracts · Private internal register</div>
      <div className="im-contracts-actions"><input className="im-contracts-input" style={{width:230}} aria-label="Search contracts" placeholder="Company, proposal, contract…" value={search} onChange={e=>setSearch(e.target.value)}/>
       <select className="im-contracts-input" style={{width:175}} aria-label="Filter by status" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
        <option value="all">All statuses</option>{Object.entries(statusLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}
       </select></div>
     </div>
     <div className="im-contracts-tablewrap"><table className="im-contracts-table">
      <thead><tr><th>Contract</th><th>Company / Legal entity</th><th>Approved proposal</th><th>Status</th><th>Effective</th><th>Expiry</th><th>Last updated</th><th>Action</th></tr></thead>
      <tbody>{filtered.map(c=>{
       const proposal=proposalById[c.proposal_id];const company=leadById[proposal?.lead_id]||"—";
       return <tr key={c.id}><td><strong>{c.contract_reference}</strong></td>
        <td><strong>{c.legal_entity_name||"—"}</strong><div className="im-contracts-muted">{company}</div></td>
        <td>{proposal?.reference||"—"}<div className="im-contracts-muted">{proposal?.title||""}</div></td>
        <td><span className="im-contracts-pill">{statusLabels[c.status]||c.status}</span></td>
        <td>{c.effective_date||"—"}</td><td>{c.expiry_date||"—"}</td><td>{formatDate(c.updated_at)}</td>
        <td>{canManage&&c.status==="draft"?<button type="button" className="im-contracts-btn secondary" onClick={()=>edit(c)}>Edit draft</button>:<span className="im-contracts-muted">Read only</span>}</td>
       </tr>;
      })}</tbody>
     </table></div>
     {!filtered.length&&<div className="im-contracts-info">{contracts.length?"No contracts match this filter.":"No contracts created yet. Start with an internally approved proposal."}</div>}
    </div>
    <div className="im-contracts-info"><strong>Security:</strong> Contracts remain internal. Preparing or editing a draft does not sign the agreement, create an ATS client account, activate a subscription, issue a tax invoice or initiate payment.</div>
   </>}
  </div></section>
 </div></main>;
}
