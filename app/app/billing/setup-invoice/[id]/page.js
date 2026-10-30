"use client";

import Link from "next/link";
import {useEffect,useState} from "react";
import {useParams} from "next/navigation";
import {supabase} from "@/lib/supabase";

const styles = `
.setup-preview{min-height:100vh;background:#eff5f0;padding:28px 20px 70px;color:#1c3f2e;font-family:Arial,Helvetica,sans-serif}
.setup-preview *{box-sizing:border-box}
.setup-preview .toolbar{max-width:880px;margin:0 auto 20px;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}
.setup-preview .toolbar a{font-weight:700;text-decoration:none;color:#1b6043}
.setup-preview .buttons{display:flex;gap:10px}
.setup-preview button{border:0;border-radius:9px;background:#15573e;color:white;padding:12px 18px;font:700 13px Arial;cursor:pointer}
.setup-preview .sheet{max-width:880px;min-height:880px;margin:auto;background:white;padding:48px 52px;box-shadow:0 16px 50px #16452b18;border:1px solid #deebe1;border-radius:14px}
.setup-preview .brand{display:flex;justify-content:space-between;align-items:flex-start;gap:24px;border-bottom:2px solid #205b42;padding-bottom:26px}
.setup-preview .brand-mark{display:inline-grid;place-items:center;background:#165a3f;color:#fff;width:44px;height:44px;border-radius:12px;font-size:29px;font-weight:800;margin-right:13px}
.setup-preview .brand-name{display:flex;align-items:center;font-size:22px;font-weight:850;color:#154a35}
.setup-preview .brand-note{font-size:11px;color:#709080;margin:10px 0 0}
.setup-preview .draft-tag{border:1px solid #c0d7c5;background:#edf5ee;border-radius:20px;padding:9px 14px;font-size:12px;font-weight:800;color:#215d40;text-align:center}
.setup-preview h1{font-size:27px;color:#163d2a;margin:30px 0 7px}
.setup-preview .subheading{color:#6a8272;font-size:13px;line-height:1.7}
.setup-preview .meta{display:grid;grid-template-columns:1fr 1fr;gap:26px;margin:35px 0}
.setup-preview .panel{border:1px solid #e1eae2;border-radius:12px;padding:19px;background:#fcfefd;min-width:0}
.setup-preview .label{display:block;font-size:10px;letter-spacing:1.2px;color:#7a9681;font-weight:800;text-transform:uppercase;margin-bottom:9px}
.setup-preview .value{font-size:14px;line-height:1.7;overflow-wrap:anywhere;white-space:pre-wrap;color:#294b36}
.setup-preview .value strong{font-weight:800;color:#173e2d}
.setup-preview .details{display:grid;grid-template-columns:1fr 1fr;gap:8px 28px;margin-top:18px;font-size:12px}
.setup-preview .details div{border-bottom:1px solid #eaf1eb;padding:9px 0}
.setup-preview .details strong{display:block;font-size:13px}
.setup-preview table{width:100%;border-collapse:collapse;text-align:left;margin:29px 0 15px}
.setup-preview th{background:#edf5ef;color:#2e6046;font-size:11px;letter-spacing:.6px;text-transform:uppercase;padding:13px 12px}
.setup-preview td{border-bottom:1px solid #e4ede7;padding:17px 12px;font-size:13px;vertical-align:top}
.setup-preview th:last-child,.setup-preview td:last-child{text-align:right}
.setup-preview .totals{margin-left:auto;max-width:350px;padding:17px;background:#f6faf7;border-radius:12px;display:flex;align-items:center;justify-content:space-between;gap:15px;font-size:14px}
.setup-preview .totals strong{font-size:18px;color:#155b3d}
.setup-preview .notes{margin-top:25px;border-top:1px solid #e3eee6;padding-top:22px;font-size:12px;line-height:1.7;color:#536d5d}
.setup-preview .warning{margin-top:28px;border:1px solid #d5e2d7;padding:16px 18px;border-radius:10px;background:#f7faf7;color:#426149;font-size:12px;line-height:1.8}
.setup-preview .footer{margin-top:45px;font-size:11px;color:#799183;text-align:center}
.setup-preview .error{max-width:780px;margin:40px auto;padding:25px;background:white;border:1px solid #e9d3cd;border-radius:13px;color:#9d4234}
@media(max-width:650px){.setup-preview{padding:14px 12px}.setup-preview .sheet{padding:27px 20px}.setup-preview .meta{grid-template-columns:1fr}.setup-preview .brand{flex-direction:column}.setup-preview .details{grid-template-columns:1fr}.setup-preview h1{font-size:23px}}
@media print{
 @page{size:A4;margin:12mm}
 html,body{background:white!important}
 .setup-preview{background:white!important;padding:0;min-height:0;color:#111}
 .setup-preview .toolbar{display:none!important}
 .setup-preview .sheet{border:0!important;box-shadow:none!important;border-radius:0!important;max-width:none;min-height:0;padding:0}
 .setup-preview .brand,.setup-preview .panel,.setup-preview .notes,.setup-preview .warning,.setup-preview .totals{break-inside:avoid}
 .setup-preview table{break-inside:avoid}
 .setup-preview .warning{-webkit-print-color-adjust:exact;print-color-adjust:exact}
}
`;

const fmtDate = value => value
  ? new Date(value).toLocaleDateString("en-GB",{day:"2-digit",month:"long",year:"numeric"})
  : "—";
const fmtMoney = (minor,currency) => new Intl.NumberFormat("en-US",{
  style:"currency",currency:currency||"EGP"
}).format(Number(minor)/100);

export default function SetupInvoiceDraftPreview(){
 const params=useParams();
 const id=params?.id;
 const [draft,setDraft]=useState(null);
 const [planName,setPlanName]=useState("");
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");

 useEffect(()=>{
  let active=true;
  (async()=>{
   setLoading(true);setError("");setDraft(null);
   if(typeof id!=="string"||!/^[0-9a-f-]{36}$/i.test(id)){
    throw Error("Invalid setup draft reference.");
   }
   const {data:{user},error:authError}=await supabase.auth.getUser();
   if(authError||!user)throw Error("Please sign in to view this draft.");
   const {data:invoice,error:invoiceError}=await supabase.from("billing_setup_invoices")
    .select("id,company_id,plan_id,currency,billing_interval,amount_minor,status,created_at,updated_at,bill_to_name,bill_to_email,bill_to_address,bill_to_tax_id,tax_treatment,billing_notes")
    .eq("id",id).maybeSingle();
   if(invoiceError)throw invoiceError;
   if(!invoice)throw Error("This invoice draft was not found or is not accessible.");
   if(invoice.status!=="draft")throw Error("This preview is available only for setup invoice drafts.");
   const {data:membership,error:memberError}=await supabase.from("company_members")
    .select("company_id").eq("company_id",invoice.company_id)
    .eq("user_id",user.id).eq("role","admin").maybeSingle();
   if(memberError||!membership)throw Error("Only an administrator of this company can view this draft.");
   const {data:plan}=await supabase.from("billing_plans")
    .select("name").eq("id",invoice.plan_id).maybeSingle();
   if(active){setDraft(invoice);setPlanName(plan?.name||invoice.plan_id);setLoading(false);}
  })().catch(e=>{if(active){setError(e.message||"Unable to open the draft.");setLoading(false);}});
  return ()=>{active=false;};
 },[id]);

 return <main className="setup-preview"><style>{styles}</style>
  <div className="toolbar">
   <Link href="/app/billing">← Billing &amp; Subscriptions</Link>
   {draft&&<div className="buttons"><button type="button" onClick={()=>window.print()}>Print / Save as PDF</button></div>}
  </div>
  {loading&&<div className="error" role="status">Loading setup fee draft…</div>}
  {error&&<div className="error" role="alert">{error}</div>}
  {draft&&<article className="sheet">
   <header className="brand">
    <div>
     <div className="brand-name"><span className="brand-mark">I</span>Inspire Match ATS</div>
     <p className="brand-note">A product by Hire &amp; Inspire by Christine</p>
    </div>
    <span className="draft-tag">DRAFT · NOT A TAX INVOICE</span>
   </header>
   <h1>One-time Setup Fee — Draft Summary</h1>
   <p className="subheading">
    Internal billing review document. It is neither an issued invoice nor a payment request.
   </p>
   <div className="details">
    <div><span className="label">Draft reference</span><strong>SETUP-{draft.id.slice(0,8).toUpperCase()}</strong></div>
    <div><span className="label">Created</span><strong>{fmtDate(draft.created_at)}</strong></div>
    <div><span className="label">Billing period selected</span><strong>{draft.billing_interval==="year"?"Annual":"Monthly"}</strong></div>
    <div><span className="label">Draft status</span><strong>DRAFT · Not issued</strong></div>
   </div>
   <div className="meta">
    <section className="panel">
     <span className="label">Proposed service</span>
     <div className="value"><strong>Inspire Match ATS</strong></div>
     <div className="value">Hire &amp; Inspire by Christine</div>
     <p className="subheading">Supplier's legal identity and tax-registration details must be verified before any official invoice is issued.</p>
    </section>
    <section className="panel">
     <span className="label">Prepared for</span>
     <div className="value"><strong>{draft.bill_to_name||"Billing name not entered"}</strong></div>
     <div className="value">{draft.bill_to_email||"Billing email not entered"}</div>
     <div className="value">{draft.bill_to_address||"Billing address not entered"}</div>
     <div className="value">Tax registration: {draft.bill_to_tax_id||"Not provided"}</div>
    </section>
   </div>
   <table>
    <thead><tr><th>Service</th><th>Qty</th><th>Base amount</th></tr></thead>
    <tbody><tr>
     <td><strong>Inspire Match ATS — {planName}</strong>
      <div className="subheading">One-time onboarding / setup. Subscription fees are handled separately.</div></td>
     <td>1</td><td>{fmtMoney(draft.amount_minor,draft.currency)}</td>
    </tr></tbody>
   </table>
   <div className="totals"><span>Setup fee base amount</span><strong>{fmtMoney(draft.amount_minor,draft.currency)}</strong></div>
   <div className="notes">
    <strong>Billing notes</strong>
    <p style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{draft.billing_notes||"No notes recorded."}</p>
   </div>
   <div className="warning">
    <strong>Tax and payment review pending.</strong> No tax rate, tax amount, final payable total, due date, or payment instructions have been approved or calculated. This document must not be used as an official tax invoice, payment request, or proof of payment.
    <div>Recorded tax treatment: {draft.tax_treatment||"pending_review"}.</div>
   </div>
   <footer className="footer">Inspire Match ATS · Internal setup-fee draft preview · Not issued</footer>
  </article>}
 </main>;
}
