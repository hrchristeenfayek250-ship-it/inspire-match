"use client";

import Link from "next/link";
import {useEffect,useState} from "react";
import {supabase} from "@/lib/supabase";
import ATSNavigation from "@/components/ATSNavigation";

const css=`
.im-int{min-height:100vh;background:#f5f8f6;color:#1c4230;font:13px/1.7 Arial,Helvetica,sans-serif}
.im-int *{box-sizing:border-box}
.im-int-shell{display:grid;grid-template-columns:252px minmax(0,1fr);min-height:100vh}
.im-int-side{background:#fff;border-right:1px solid #e2ece4;padding:27px 14px}
.im-int-brand{display:flex;align-items:center;gap:11px;padding:4px 13px 30px;font:850 17px Arial}
.im-int-brand span{display:grid;place-items:center;width:36px;height:36px;border-radius:11px;background:#14583e;color:white;font-size:23px}
.im-int-brand small{display:block;font-size:9px;letter-spacing:1.5px;color:#849d90;margin-top:3px}
.im-int-nav{display:flex;flex-direction:column;gap:4px}
.im-int-nav a{display:flex;gap:12px;align-items:center;padding:10px 12px;border-radius:10px;text-decoration:none;color:#60776b;font-weight:750;font-size:12px}
.im-int-nav a.active,.im-int-nav a:hover{background:#e5f2e9;color:#145f42}
.im-int-main{min-width:0;padding:0 clamp(18px,3.4vw,52px) 60px}
.im-int-inner{max-width:1240px;margin:auto}
.im-int-top{min-height:77px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #e2ece4;margin-bottom:30px;gap:10px}
.im-int-top a{color:#176648;text-decoration:none;font-weight:800}
.im-int-hero{padding:36px 38px;border-radius:22px;background:linear-gradient(115deg,#103c2c,#176448 72%,#217755);color:white}
.im-int-hero small{color:#bbe7d0;font-size:10px;letter-spacing:1.7px;font-weight:850}
.im-int-hero h1{font:850 clamp(26px,3vw,36px)/1.16 Arial;color:white!important;margin:10px 0}
.im-int-hero p{color:#d8eade;margin:0;max-width:750px;line-height:1.8}
.im-int-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:15px;margin:22px 0}
.im-int-stat,.im-int-card{padding:22px;border-radius:16px;background:#fff;border:1px solid #e0ebe4;min-width:0}
.im-int-stat small{display:block;color:#879b8d;font-size:11px;font-weight:800}
.im-int-stat strong{display:block;color:#185b3e;font-size:27px;margin:9px 0}
.im-int-stat span{font-size:11px;color:#7b9282}
.im-int-heading{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin:27px 0 12px}
.im-int-heading h2{font:850 20px Arial;color:#204631;margin:0}
.im-int-chip{border-radius:20px;background:#e6f2e8;color:#176648;font-size:10px;font-weight:800;padding:6px 10px}
.im-int-muted{font-size:12px;color:#82998a}
.im-int-warning{border:1px solid #d7e7dc;background:white;border-radius:14px;padding:18px;margin:18px 0}
.im-int-error{background:#fff4ee;border-color:#ebcabd;color:#a64735}
.im-int-tablewrap{overflow:auto}
.im-int-table{border-collapse:collapse;width:100%;min-width:770px;text-align:left}
.im-int-table th{text-transform:uppercase;letter-spacing:.7px;font-size:10px;background:#f6faf7;padding:13px;color:#849c8b}
.im-int-table td{font-size:12px;padding:13px;border-bottom:1px solid #eaf0eb;color:#4a6853}
.im-int-table a{color:#176648;font-weight:800}
.im-int-controls{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-top:20px}
.im-int-button{border:0;border-radius:10px;background:#176448;color:#fff;padding:11px 16px;font:800 12px Arial;cursor:pointer;text-decoration:none;display:inline-block}
.im-int-button:disabled{opacity:.5;cursor:not-allowed}
.im-int-select{border:1px solid #dce9df;color:#23533a;background:#fff;border-radius:10px;padding:11px 13px;font:13px Arial}
@media(max-width:1000px){.im-int-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:760px){.im-int-shell{display:block}.im-int-side{padding:14px;border-right:0;border-bottom:1px solid #e2ece4}.im-int-brand{padding:4px 10px 12px}.im-int-nav{flex-direction:row;overflow:auto}.im-int-nav a{white-space:nowrap;flex:none}.im-int-main{padding:0 15px 45px}.im-int-hero{padding:26px 22px}.im-int-top{min-height:60px;margin-bottom:16px}.im-int-grid{grid-template-columns:1fr 1fr}}
`;
const date=x=>x?new Date(x).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}):"—";
const money=(minor,currency)=>minor===null||minor===undefined?"Not configured":new Intl.NumberFormat("en-US",{style:"currency",currency:currency||"EGP"}).format(Number(minor)/100);
const short=id=>id?String(id).slice(0,8).toUpperCase():"—";

export default function InternalSalesFinance(){
 const [data,setData]=useState(null);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [currency,setCurrency]=useState("all");
 const [refresh,setRefresh]=useState(0);
 const [companyConfigs,setCompanyConfigs]=useState([]);
 const [companyConfigError,setCompanyConfigError]=useState("");
 const [companySearch,setCompanySearch]=useState("");

 useEffect(()=>{
  let active=true;
  (async()=>{
   setLoading(true);setError("");setData(null);
   const {data:identity,error:authError}=await supabase.auth.getUser();
   if(authError||!identity?.user)throw new Error("Sign in with an approved internal Inspire Match account.");
   const [result,config]=await Promise.all([
    supabase.rpc("billing_internal_overview"),
    supabase.rpc("billing_internal_company_configurations")
   ]);
   if(result.error)throw result.error;
   if(active){
    setData(result.data);
    setCompanyConfigs(config.error?[]:(config.data?.companies||[]));
    setCompanyConfigError(config.error?"Company configuration data unavailable. Check the latest SQL migration.":"");
   }
  })().catch(e=>{if(active)setError(e.message||"Internal access unavailable. Check staff permissions and apply the private billing SQL.");})
   .finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;};
 },[refresh]);

 const plans=data?.plans||[];
 const offers=(data?.offers||[]).filter(o=>currency==="all"||o.currency===currency);
 const subs=data?.subscriptions||[];
 const setup=data?.setup_invoices||[];
 const pending=setup.filter(i=>i.review_status==="pending_review");
 const planName=id=>plans.find(p=>p.id===id)?.name||id||"—";
 const allowed=!!data&&!error;
 const filteredCompanies=companyConfigs.filter(c=>String(c.company_id).toLowerCase().includes(companySearch.trim().toLowerCase())||String(c.internal_plan_id||"").toLowerCase().includes(companySearch.trim().toLowerCase()));

 return <main className="im-int"><style>{css}</style><div className="im-int-shell">
  <aside className="im-int-side"><div className="im-int-brand"><span>I</span><div>Inspire Match<small>TALENT INTELLIGENCE</small></div></div><ATSNavigation className="im-int-nav"/></aside>
  <section className="im-int-main"><div className="im-int-inner">
   <div className="im-int-top"><strong>Inspire Management / Internal Billing</strong><Link href="/app/dashboard">Dashboard</Link></div>
   <header className="im-int-hero"><small>PRIVATE / INTERNAL OPERATIONS</small><h1>Sales &amp; Finance Command Center</h1>
    <p>Manage your internal commercial visibility, approved offers, company subscription records and review queue. Private pricing is never published to clients or public visitors.</p>
   </header>
   <div className="im-int-controls">
    <div><span className="im-int-chip">{allowed?String(data.staff_role||"internal").replaceAll("_"," ").toUpperCase():"RESTRICTED ACCESS"}</span><span className="im-int-muted" style={{marginLeft:10}}>Internal Inspire Match staff only</span></div>
    <button type="button" className="im-int-button" disabled={loading} onClick={()=>setRefresh(v=>v+1)}>Refresh</button>
   </div>
   {loading&&<div className="im-int-warning">Checking internal staff permissions and loading commercial records…</div>}
   {error&&<div role="alert" className="im-int-warning im-int-error">{error}</div>}
   {!loading&&!allowed&&<div className="im-int-warning">This page is only accessible to authorized Inspire Match Sales, Finance and platform administrators. Company-admin membership does not grant this permission.</div>}
   {allowed&&<>
    <div className="im-int-grid">
     <div className="im-int-stat"><small>Commercial offers</small><strong>{(data.offers||[]).length}</strong><span>Private pricing records</span></div>
     <div className="im-int-stat"><small>Recorded subscriptions</small><strong>{subs.length}</strong><span>Current management records</span></div>
     <div className="im-int-stat"><small>Setup invoice drafts</small><strong>{setup.length}</strong><span>Internal finance review</span></div>
     <div className="im-int-stat"><small>Pending review</small><strong>{pending.length}</strong><span>Requires finance decision</span></div>
    </div>
    <div className="im-int-heading"><h2>Sales pipeline &amp; demos</h2><Link className="im-int-button" href="/app/billing/internal/leads">Manage leads &amp; demos</Link></div>
    <section className="im-int-card">
     <p style={{margin:0}}>Track prospects, demo appointments and follow-ups in the private Sales CRM. Only approved Sales staff and Platform Admins can edit leads; Finance has read-only access.</p>
    </section>
    <div className="im-int-heading"><h2>Commercial proposals &amp; contracts</h2><div className="im-int-controls" style={{marginTop:0}}><Link className="im-int-button" href="/app/billing/internal/proposals">Manage proposals</Link><Link className="im-int-button" href="/app/billing/internal/contracts">Manage contracts</Link></div></div>
     <section className="im-int-card"><p style={{margin:0}}>Create private proposals linked to Sales leads, submit them for internal review and prepare contract drafts from approved proposals. No automatic signatures, activation or payments.</p></section>
     <div className="im-int-heading"><h2>Private commercial offers</h2><span className="im-int-chip">Not visible to clients</span></div>
    <section className="im-int-card">
     <div className="im-int-controls" style={{marginTop:0,marginBottom:13}}>
      <p className="im-int-muted">Read-only overview. New prices and offers require separate internal approval and configuration.</p>
      <label>Currency{" "}<select value={currency} onChange={e=>setCurrency(e.target.value)} className="im-int-select">
       <option value="all">All currencies</option>{["EGP","SAR","AED","USD"].map(c=><option key={c} value={c}>{c}</option>)}
      </select></label>
     </div>
     <div className="im-int-tablewrap"><table className="im-int-table">
      <thead><tr><th>Internal plan</th><th>Currency</th><th>Interval</th><th>Setup fee</th><th>Recurring fee</th><th>Approval</th><th>Tax policy</th></tr></thead>
      <tbody>{offers.map(o=><tr key={o.id}><td>{planName(o.plan_id)}</td><td>{o.currency}</td><td>{o.billing_interval}</td><td>{money(o.setup_fee_minor,o.currency)}</td><td>{money(o.recurring_fee_minor,o.currency)}</td><td><span className="im-int-chip">{o.status}</span></td><td>{o.tax_policy}</td></tr>)}</tbody>
     </table></div>{!offers.length&&<p className="im-int-muted">No internal commercial offers configured for this filter.</p>}
    </section>
    <div className="im-int-heading"><h2>Company subscriptions</h2><span className="im-int-muted">Latest 100 records</span></div>
    <section className="im-int-card"><div className="im-int-tablewrap"><table className="im-int-table">
     <thead><tr><th>Company reference</th><th>Internal plan</th><th>Subscription</th><th>Activation</th><th>Period end</th><th>Provider</th></tr></thead>
     <tbody>{subs.map(s=><tr key={s.company_id}><td>{short(s.company_id)}</td><td>{planName(s.plan_id)}</td><td><span className="im-int-chip">{s.status}</span></td><td>{s.activation_status}</td><td>{date(s.current_period_end)}</td><td>{s.provider||"—"}</td></tr>)}</tbody>
    </table></div>{!subs.length&&<p className="im-int-muted">No company subscriptions have been recorded yet. No companies are activated automatically.</p>}</section>
    <div className="im-int-heading"><h2>Company activation &amp; module configuration</h2><span className="im-int-chip">Read-only • No automatic activation</span></div>
    <section className="im-int-card">
     <div className="im-int-controls" style={{marginTop:0,marginBottom:14}}>
      <p className="im-int-muted">Review company onboarding status and custom add-on settings before we introduce controlled editing and approvals.</p>
      <input className="im-int-select" aria-label="Search company configuration" placeholder="Search company ID or plan" value={companySearch} onChange={e=>setCompanySearch(e.target.value)}/>
     </div>
     {companyConfigError&&<div className="im-int-warning im-int-error">{companyConfigError}</div>}
     <div className="im-int-tablewrap"><table className="im-int-table">
      <thead><tr><th>Company</th><th>Activation</th><th>Subscription</th><th>Internal plan</th><th>Period end</th><th>Custom add-ons</th></tr></thead>
      <tbody>{filteredCompanies.map(c=><tr key={c.company_id}>
       <td title={c.company_id}>{short(c.company_id)}</td>
       <td><span className="im-int-chip">{c.activation_status}</span></td>
       <td>{c.subscription_status}</td>
       <td>{planName(c.internal_plan_id)}</td>
       <td>{date(c.current_period_end)}</td>
       <td>{Object.entries(c.feature_overrides||{}).length?Object.entries(c.feature_overrides).map(([feature,enabled])=><div key={feature} style={{fontSize:11}}>{feature.replaceAll("_"," ")}: {enabled?"Enabled":"Disabled"}</div>):<span className="im-int-muted">No overrides</span>}</td>
      </tr>)}</tbody>
     </table></div>
     {!filteredCompanies.length&&!companyConfigError&&<p className="im-int-muted">No company configurations match this search.</p>}
     <p className="im-int-muted" style={{marginTop:15}}>This section does not change any subscription, company access, or module permissions. The next stage will add approved internal configuration actions.</p>
    </section>
    <div className="im-int-heading"><h2>Setup draft review</h2>{data.can_review_finance&&<Link className="im-int-button" href="/app/billing/finance">Open Finance Review Center</Link>}</div>
    <section className="im-int-card"><div className="im-int-tablewrap"><table className="im-int-table">
     <thead><tr><th>Reference</th><th>Prepared for</th><th>Amount</th><th>Draft status</th><th>Review status</th><th>Submitted</th></tr></thead>
     <tbody>{setup.map(i=><tr key={i.id}><td><Link href={`/app/billing/setup-invoice/${i.id}`}>SETUP-{short(i.id)}</Link></td><td>{i.bill_to_name||i.bill_to_email||"—"}</td><td>{money(i.amount_minor,i.currency)}</td><td>{i.status}</td><td><span className="im-int-chip">{i.review_status}</span></td><td>{date(i.submitted_at)}</td></tr>)}</tbody>
    </table></div>{!setup.length&&<p className="im-int-muted">No setup invoice drafts yet.</p>}</section>
    <div className="im-int-warning"><strong>Safety status:</strong> Customer checkout is disabled. Billing activation, live payment collection, tax invoice issuance and feature enforcement are not enabled by this screen. This overview never changes subscription records.</div>
   </>}
  </div></section>
 </div></main>;
}
