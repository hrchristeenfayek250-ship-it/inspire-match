"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import {supabase} from "@/lib/supabase";
import ATSNavigation from "@/components/ATSNavigation";

const styles=`
.fin-page{background:#f5f8f6;min-height:100vh;color:#1e4232;font:13px/1.6 Arial,Helvetica,sans-serif}
.fin-page *{box-sizing:border-box}
.fin-shell{display:grid;grid-template-columns:252px minmax(0,1fr);min-height:100vh}
.fin-side{background:white;border-right:1px solid #e4ede6;padding:27px 14px}
.fin-brand{display:flex;align-items:center;gap:11px;padding:4px 13px 30px;font-size:17px;font-weight:850}
.fin-brand span{display:grid;place-items:center;width:36px;height:36px;border-radius:11px;background:#14583e;color:white;font-size:22px}
.fin-brand small{display:block;font-size:9px;color:#8b9c92;letter-spacing:1.5px}
.fin-nav{display:flex;flex-direction:column;gap:4px}
.fin-nav a{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:10px;color:#60766b;text-decoration:none;font-weight:700;font-size:12px}
.fin-nav a:hover,.fin-nav a.active{background:#e5f2e9;color:#145f42}
.fin-main{min-width:0;padding:0 clamp(18px,3.4vw,54px) 60px}
.fin-inner{max-width:1200px;margin:auto}
.fin-top{min-height:77px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #e5ece7;margin-bottom:30px;gap:12px}
.fin-top a{color:#176648;text-decoration:none;font-weight:800}
.fin-hero{background:linear-gradient(115deg,#103c2c,#176448 72%,#217755);color:white;border-radius:22px;padding:34px 38px;margin-bottom:24px}
.fin-hero small{color:#bcebd2;font-weight:800;font-size:10px;letter-spacing:1.8px}
.fin-hero h1{color:white!important;font:850 clamp(25px,3vw,34px)/1.18 Arial;margin:12px 0}
.fin-hero p{color:#d8eade;max-width:770px;line-height:1.8;margin:0}
.fin-status{border:1px solid #d9e9db;background:white;border-radius:14px;padding:18px;margin:15px 0}
.fin-error{border-color:#ecc9bd;background:#fff5ef;color:#9f4736}
.fin-row{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin:20px 0}
.fin-row h2{margin:0;font:850 19px Arial}
.fin-card{border:1px solid #e0ebe4;background:white;border-radius:16px;padding:24px;min-width:0;margin-bottom:17px}
.fin-card-head{display:flex;align-items:start;justify-content:space-between;gap:16px;flex-wrap:wrap}
.fin-card h3{font:850 21px Arial;color:#174b35;margin:0 0 6px}
.fin-muted{color:#779181;font-size:12px}
.fin-pill{display:inline-block;background:#e5f2e8;color:#176648;font-weight:800;border-radius:20px;padding:6px 11px;font-size:11px}
.fin-amount{font-size:22px;font-weight:850;color:#185b3f}
.fin-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:20px 0}
.fin-field{padding:14px;background:#f7faf8;border-radius:10px;min-width:0;overflow-wrap:anywhere}
.fin-field small{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.7px;color:#82988a;font-weight:800;margin-bottom:6px}
.fin-actions{display:flex;align-items:flex-end;gap:12px;flex-wrap:wrap;border-top:1px solid #e5eee7;padding-top:20px}
.fin-note{flex:1;min-width:260px}
.fin-note label{display:block;margin-bottom:7px;color:#557461;font-size:11px;font-weight:800}
.fin-note textarea{width:100%;min-height:76px;resize:vertical;border:1px solid #d7e6dc;background:white;color:#22533a;border-radius:10px;padding:11px;font:13px Arial}
.fin-button{background:#176448;color:white;border:0;padding:12px 16px;border-radius:10px;font:800 12px Arial;cursor:pointer}
.fin-button.secondary{background:#edf5ef;color:#1d6448}
.fin-button:disabled{opacity:.46;cursor:not-allowed}
@media(max-width:760px){.fin-shell{display:block}.fin-side{padding:14px;border-right:0;border-bottom:1px solid #e4ede6}.fin-brand{padding:4px 10px 12px}.fin-nav{flex-direction:row;overflow:auto}.fin-nav a{white-space:nowrap;flex:none}.fin-main{padding:0 15px 40px}.fin-top{min-height:60px;margin-bottom:18px}.fin-hero{padding:25px 22px}.fin-grid{grid-template-columns:1fr}}
`;
const fmt=(minor,currency)=>{try{return new Intl.NumberFormat("en-US",{style:"currency",currency:currency||"EGP"}).format(Number(minor)/100);}catch{return String(minor)+" "+currency;}};
const fmtDate=value=>value?new Date(value).toLocaleString("en-GB",{dateStyle:"medium",timeStyle:"short"}):"—";

export default function FinanceSetupReviewPage(){
 const [allowed,setAllowed]=useState(false);
 const [loading,setLoading]=useState(true);
 const [refresh,setRefresh]=useState(0);
 const [invoices,setInvoices]=useState([]);
 const [notes,setNotes]=useState({});
 const [working,setWorking]=useState("");
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");

 useEffect(()=>{
  let active=true;
  (async()=>{
   setLoading(true);setError("");
   const {data:{user},error:authError}=await supabase.auth.getUser();
   if(!active)return;
   if(authError||!user){setAllowed(false);setInvoices([]);setError("Sign in to access finance reviews.");return;}
   const access=await supabase.rpc("billing_finance_can_review");
   if(!active)return;
   if(access.error){setAllowed(false);setError("Finance review database setup is not available yet.");return;}
   if(access.data!==true){setAllowed(false);setInvoices([]);return;}
   setAllowed(true);
   const queue=await supabase.rpc("billing_finance_review_queue",{p_limit:50});
   if(!active)return;
   if(queue.error)throw queue.error;
   setInvoices(Array.isArray(queue.data)?queue.data:[]);
  })().catch(e=>{if(active)setError(e.message||"Unable to load the finance queue.");})
   .finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;};
 },[refresh]);

 async function decide(invoice,decision){
  if(!allowed||!invoice?.id||working)return;
  const note=(notes[invoice.id]||"").trim();
  if(decision==="changes_requested"&&note.length<5){setError("Please explain the requested changes (at least 5 characters).");return;}
  if(decision==="approved"&&!window.confirm("Approve this setup draft for internal finance review? This does not issue an invoice or collect a payment."))return;
  setWorking(invoice.id);setError("");setNotice("");
  try{
   const {error:decisionError}=await supabase.rpc("billing_finance_decide_setup_invoice",{
    p_invoice_id:invoice.id,p_decision:decision,p_note:note
   });
   if(decisionError)throw decisionError;
   setNotice(decision==="approved"?"Internal finance review approved. The invoice is still a draft.":"Changes requested. The company's admin can edit and resubmit the draft.");
   setRefresh(value=>value+1);
  }catch(e){setError(e.message||"Finance decision could not be saved.");}
  finally{setWorking("");}
 }

 return <main className="fin-page"><style>{styles}</style><div className="fin-shell">
  <aside className="fin-side"><div className="fin-brand"><span>I</span><div>Inspire Match<small>TALENT INTELLIGENCE</small></div></div><ATSNavigation className="fin-nav"/></aside>
  <section className="fin-main"><div className="fin-inner">
   <div className="fin-top"><strong>Finance / Setup Invoice Reviews</strong><Link href="/app/billing">Billing &amp; Subscriptions</Link></div>
   <header className="fin-hero"><small>INTERNAL FINANCE / REVIEW ONLY</small><h1>Setup Invoice Review Center</h1><p>Review submitted onboarding fee drafts, approve internal commercial details, or request changes. Decisions are recorded with an audit trail. No tax invoice or payment is issued here.</p></header>
   {error&&<div role="alert" className="fin-status fin-error">{error}</div>}
   {notice&&<div role="status" className="fin-status">{notice}</div>}
   {loading?<div className="fin-status">Loading finance permissions and pending reviews…</div>:
    !allowed?<div className="fin-status">Access restricted to approved Inspire Match finance reviewers. Company-admin access alone does not grant finance approval rights.</div>:
    <>
     <div className="fin-row"><h2>Pending finance reviews ({invoices.length})</h2><button className="fin-button secondary" type="button" disabled={!!working} onClick={()=>setRefresh(x=>x+1)}>Refresh</button></div>
     {invoices.length===0?<div className="fin-status">No setup invoices are waiting for finance review.</div>:
      invoices.map(invoice=><article key={invoice.id} className="fin-card">
       <div className="fin-card-head"><div><h3>{invoice.bill_to_name||"Company"}</h3><div className="fin-muted">SETUP-{invoice.id.slice(0,8).toUpperCase()} · {invoice.plan_id} · Submitted {fmtDate(invoice.submitted_at)}</div></div>
        <div style={{textAlign:"right"}}><div className="fin-amount">{fmt(invoice.amount_minor,invoice.currency)}</div><span className="fin-pill">Pending review</span></div>
       </div>
       <div className="fin-grid">
        <div className="fin-field"><small>Billing email</small>{invoice.bill_to_email||"—"}</div>
        <div className="fin-field"><small>Billing address</small>{invoice.bill_to_address||"—"}</div>
        <div className="fin-field"><small>Tax registration ID</small>{invoice.bill_to_tax_id||"Not provided"}</div>
        <div className="fin-field"><small>Billing period</small>{invoice.billing_interval||"—"}</div>
        <div className="fin-field"><small>Company reference</small>{invoice.company_id}</div>
        <div className="fin-field"><small>Tax treatment</small>{invoice.tax_treatment||"pending_review"}</div>
       </div>
       <div className="fin-actions">
        <div className="fin-note"><label htmlFor={"review-note-"+invoice.id}>Review note (required when requesting changes)</label>
         <textarea id={"review-note-"+invoice.id} maxLength={1000} value={notes[invoice.id]||""} onChange={e=>setNotes(v=>({...v,[invoice.id]:e.target.value}))} placeholder="Explain missing information or corrections…"/>
        </div>
        <button className="fin-button secondary" type="button" disabled={!!working} onClick={()=>decide(invoice,"changes_requested")}>Request changes</button>
        <button className="fin-button" type="button" disabled={!!working} onClick={()=>decide(invoice,"approved")}>{working===invoice.id?"Saving…":"Approve review"}</button>
       </div>
      </article>)
     }
    </>
   }
  </div></section>
 </div></main>;
}
