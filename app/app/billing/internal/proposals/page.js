"use client";
import Link from "next/link";
import {useEffect,useMemo,useState} from "react";
import {supabase} from "@/lib/supabase";
import ATSNavigation from "@/components/ATSNavigation";

const blank={lead_id:"",title:"",currency:"EGP",billing_interval:"month",setup_fee:"",recurring_fee:"",scope_notes:"",internal_notes:"",valid_until:""};
const css=`
.im-prop{min-height:100vh;background:#f5f8f6;color:#1c4230;font:13px/1.6 Arial,sans-serif}
.im-prop *{box-sizing:border-box}.im-prop-shell{display:grid;grid-template-columns:252px minmax(0,1fr);min-height:100vh}
.im-prop-aside{background:#fff;border-right:1px solid #e2ece4;padding:27px 14px}.im-prop-aside h2{font-size:18px;color:#14583e;margin:0 0 25px}
.im-prop-aside nav{display:flex;flex-direction:column;gap:6px}.im-prop-aside nav a{color:#276047;text-decoration:none;padding:10px;border-radius:9px}
.im-prop-main{padding:25px clamp(16px,4vw,52px) 65px;min-width:0}.im-prop-inner{max-width:1250px;margin:auto}
.im-prop-top{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:25px}.im-prop-top a{color:#176448}
.im-prop-hero{background:linear-gradient(115deg,#103c2c,#176448 72%,#217755);border-radius:22px;padding:34px;color:#fff}
.im-prop-hero small{letter-spacing:2px;color:#bde7cd;font-weight:800}.im-prop-hero h1{color:#fff!important;font-size:30px;margin:8px 0}.im-prop-hero p{color:#d8eade;margin:0}
.im-prop-tools{display:flex;justify-content:space-between;gap:12px;align-items:center;margin:24px 0;flex-wrap:wrap}
.im-prop-btn{border:0;border-radius:10px;background:#176448;color:#fff;padding:11px 17px;font-weight:800;cursor:pointer;text-decoration:none}
.im-prop-btn:disabled{opacity:.55}.im-prop-btn.alt{background:#e8f3eb;color:#176448}
.im-prop-card{background:#fff;border:1px solid #e0ebe4;border-radius:16px;padding:22px;margin:18px 0}
.im-prop-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.im-prop-field{display:flex;flex-direction:column;gap:6px;color:#47715a;font-weight:700}
.im-prop-field input,.im-prop-field select,.im-prop-field textarea{width:100%;border:1px solid #d4e5d9;border-radius:9px;padding:11px;background:#fff;color:#204e37}
.im-prop-wide{grid-column:1/-1}.im-prop-table{width:100%;border-collapse:collapse;min-width:800px;text-align:left}.im-prop-table th{background:#f6faf7;color:#839988;font-size:11px;text-transform:uppercase}.im-prop-table th,.im-prop-table td{padding:13px;border-bottom:1px solid #eaf0eb}.im-prop-wrap{overflow:auto}
.im-prop-note{padding:14px;background:#edf6ef;border-radius:10px;color:#285e41}.im-prop-error{padding:14px;background:#fff0eb;border-radius:10px;color:#a44733}
@media(max-width:800px){.im-prop-shell{display:block}.im-prop-aside{padding:16px}.im-prop-grid{grid-template-columns:1fr}.im-prop-main{padding:20px 15px}.im-prop-hero{padding:25px}}
`;
const minor=value=>value===""?null:Math.round(Number(value)*100);
const amount=(value,currency)=>value==null?"—":new Intl.NumberFormat("en-US",{style:"currency",currency:currency||"EGP"}).format(Number(value)/100);
export default function SalesProposals(){
 const [role,setRole]=useState("");const [leads,setLeads]=useState([]);const [proposals,setProposals]=useState([]);
 const [loading,setLoading]=useState(true);const [saving,setSaving]=useState(false);const [error,setError]=useState("");const [notice,setNotice]=useState("");
 const [reviewing,setReviewing]=useState("");const [form,setForm]=useState(blank);const [showForm,setShowForm]=useState(false);const [refresh,setRefresh]=useState(0);
 const canEdit=role==="sales"||role==="platform_admin";
 useEffect(()=>{let active=true;(async()=>{
  setLoading(true);setError("");
  const auth=await supabase.auth.getUser();if(auth.error||!auth.data?.user?.id)throw new Error("Sign in to an approved internal Inspire Match account.");
  const overview=await supabase.rpc("billing_internal_overview");if(overview.error)throw overview.error;
  const [leadResult,proposalResult]=await Promise.all([
   supabase.from("billing_sales_leads").select("id,company_name").order("company_name"),
   supabase.from("billing_sales_proposals").select("id,lead_id,reference,title,currency,setup_fee_minor,recurring_fee_minor,billing_interval,status,valid_until,created_at").order("created_at",{ascending:false}).limit(300)
  ]);
  if(leadResult.error)throw leadResult.error;if(proposalResult.error)throw proposalResult.error;
  if(active){setRole(overview.data?.staff_role||"");setLeads(leadResult.data||[]);setProposals(proposalResult.data||[]);}
 })().catch(e=>{if(active)setError(e.message||"Unable to load proposals.")}).finally(()=>{if(active)setLoading(false)});
 return()=>{active=false};},[refresh]);
 const names=useMemo(()=>Object.fromEntries(leads.map(l=>[l.id,l.company_name])),[leads]);
 const change=(key,value)=>setForm(f=>({...f,[key]:value}));
 async function proposalAction(proposal,action){
  if(reviewing)return;
  let comment="";
  if(action==="request_changes"){
   comment=window.prompt("Reason for requested changes (required):")||"";
   if(comment.trim().length<3)return;
  }
  setReviewing(proposal.id);setError("");setNotice("");
  const result=action==="submit"
   ?await supabase.rpc("billing_sales_submit_proposal",{p_proposal_id:proposal.id})
   :await supabase.rpc("billing_sales_review_proposal",{p_proposal_id:proposal.id,p_decision:action,p_comment:comment});
  if(result.error)setError(result.error.message);
  else{setNotice(action==="submit"?"Proposal submitted for internal review.":action==="approve"?"Proposal approved internally. No client delivery or payment.":"Proposal returned to draft.");setRefresh(n=>n+1);}
  setReviewing("");
 }
 async function save(e){e.preventDefault();if(!canEdit||saving)return;
  if(!form.lead_id||form.title.trim().length<2){setError("Select a lead and enter a proposal title.");return;}
  for(const v of [form.setup_fee,form.recurring_fee])if(v!==""&&(!Number.isFinite(Number(v))||Number(v)<0||Math.round(Number(v)*100)!==Number(v)*100)){setError("Enter valid non-negative amounts with up to two decimal places.");return;}
  setSaving(true);setError("");setNotice("");
  const auth=await supabase.auth.getUser();const id=auth.data?.user?.id;
  if(!id){setError("Your session expired. Sign in again.");setSaving(false);return;}
  const payload={lead_id:form.lead_id,title:form.title.trim(),currency:form.currency,billing_interval:form.billing_interval,
   setup_fee_minor:minor(form.setup_fee),recurring_fee_minor:minor(form.recurring_fee),scope_notes:form.scope_notes.trim(),
   internal_notes:form.internal_notes.trim(),valid_until:form.valid_until||null,status:"draft",created_by:id,updated_by:id};
  const result=await supabase.from("billing_sales_proposals").insert(payload).select("id");
  if(result.error)setError(result.error.message);else{setNotice("Private proposal draft created. It has NOT been approved, sent or charged.");setShowForm(false);setForm(blank);setRefresh(n=>n+1);}
  setSaving(false);
 }
 return <main className="im-prop"><style>{css}</style><div className="im-prop-shell">
  <aside className="im-prop-aside"><h2>Inspire Match</h2><ATSNavigation/></aside>
  <section className="im-prop-main"><div className="im-prop-inner">
   <div className="im-prop-top"><strong>Inspire Management / Sales Proposals</strong><Link href="/app/billing/internal/leads">Sales CRM</Link></div>
   <header className="im-prop-hero"><small>PRIVATE / COMMERCIAL OPERATIONS</small><h1>Commercial Proposals</h1>
    <p>Prepare confidential, lead-linked commercial drafts. Approval, client delivery, subscriptions and payments remain separate.</p></header>
   <div className="im-prop-tools"><div><strong>{proposals.length} proposals</strong> · Internal access only</div>
    <div style={{display:"flex",gap:10}}><button className="im-prop-btn alt" onClick={()=>setRefresh(n=>n+1)}>Refresh</button>
    {canEdit&&<button className="im-prop-btn" onClick={()=>setShowForm(v=>!v)}>+ New proposal</button>}</div></div>
   {loading&&<div className="im-prop-note">Loading proposals…</div>}
   {error&&<div role="alert" className="im-prop-error">{error}</div>}
   {notice&&<div className="im-prop-note">{notice}</div>}
   {!loading&&!error&&!role&&<div className="im-prop-error">Internal Sales or Finance access required.</div>}
   {canEdit&&showForm&&<form className="im-prop-card" onSubmit={save}>
    <h2>New private proposal draft</h2><div className="im-prop-grid">
     <label className="im-prop-field">Lead / Company<select required value={form.lead_id} onChange={e=>change("lead_id",e.target.value)}><option value="">Select lead</option>{leads.map(l=><option key={l.id} value={l.id}>{l.company_name}</option>)}</select></label>
     <label className="im-prop-field">Proposal title<input required minLength={2} maxLength={200} value={form.title} onChange={e=>change("title",e.target.value)}/></label>
     <label className="im-prop-field">Currency<select value={form.currency} onChange={e=>change("currency",e.target.value)}>{["EGP","SAR","AED","USD"].map(x=><option key={x}>{x}</option>)}</select></label>
     <label className="im-prop-field">Setup fee<input type="number" min="0" step="0.01" value={form.setup_fee} onChange={e=>change("setup_fee",e.target.value)}/></label>
     <label className="im-prop-field">Recurring fee<input type="number" min="0" step="0.01" value={form.recurring_fee} onChange={e=>change("recurring_fee",e.target.value)}/></label>
     <label className="im-prop-field">Billing interval<select value={form.billing_interval} onChange={e=>change("billing_interval",e.target.value)}><option value="month">Monthly</option><option value="year">Yearly</option></select></label>
     <label className="im-prop-field">Valid until<input type="date" value={form.valid_until} onChange={e=>change("valid_until",e.target.value)}/></label>
     <label className="im-prop-field im-prop-wide">Scope / modules<textarea rows={3} value={form.scope_notes} onChange={e=>change("scope_notes",e.target.value)}/></label>
     <label className="im-prop-field im-prop-wide">Internal notes<textarea rows={3} value={form.internal_notes} onChange={e=>change("internal_notes",e.target.value)}/></label>
    </div><div className="im-prop-tools"><span>Draft only · Not approved or client-visible</span><button disabled={saving} className="im-prop-btn" type="submit">{saving?"Saving…":"Save draft"}</button></div>
   </form>}
   <section className="im-prop-card"><h2>Private proposals</h2><div className="im-prop-wrap"><table className="im-prop-table">
    <thead><tr><th>Reference</th><th>Company</th><th>Title</th><th>Setup</th><th>Recurring</th><th>Status</th><th>Valid until</th><th>Review actions</th></tr></thead>
    <tbody>{proposals.map(p=><tr key={p.id}><td>{p.reference}</td><td>{names[p.lead_id]||"—"}</td><td>{p.title}</td><td>{amount(p.setup_fee_minor,p.currency)}</td><td>{amount(p.recurring_fee_minor,p.currency)} / {p.billing_interval}</td><td>{p.status}</td><td>{p.valid_until||"—"}</td><td>{p.status==="draft"&&canEdit?<button disabled={!!reviewing} className="im-prop-btn" onClick={()=>proposalAction(p,"submit")}>Submit for review</button>:p.status==="internal_review"?<div style={{display:"flex",gap:7}}><button disabled={!!reviewing} className="im-prop-btn" onClick={()=>proposalAction(p,"approve")}>Approve</button><button disabled={!!reviewing} className="im-prop-btn alt" onClick={()=>proposalAction(p,"request_changes")}>Request changes</button></div>:"—"}</td></tr>)}</tbody>
   </table></div>{!proposals.length&&!loading&&<p>No proposals yet. Create a lead in Sales CRM first, then prepare a draft.</p>}</section>
   <div className="im-prop-note">Internal-only. No client delivery, contract signature, tax invoice, payment collection or subscription activation is performed here.</div>
  </div></section></div></main>;
}