"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import {supabase} from "@/lib/supabase";
import ATSNavigation from "@/components/ATSNavigation";

const styles=`
.billing-page{background:#f5f8f6;min-height:100vh;color:#1e4232;font:13px/1.6 Arial,Helvetica,sans-serif}
.billing-page *{box-sizing:border-box}
.billing-shell{display:grid;grid-template-columns:252px minmax(0,1fr);min-height:100vh}
.billing-side{background:#fff;border-right:1px solid #e4ede6;padding:27px 14px}
.billing-brand{display:flex;align-items:center;gap:11px;padding:4px 13px 30px;font-size:17px;font-weight:850}
.billing-brand span{display:grid;place-items:center;width:36px;height:36px;border-radius:11px;background:#14583e;color:#fff;font-size:22px}
.billing-brand small{display:block;font-size:9px;color:#8b9c92;letter-spacing:1.5px}
.billing-nav{display:flex;flex-direction:column;gap:4px}
.billing-nav a{display:flex;align-items:center;gap:12px;padding:10px 12px;min-height:40px;border-radius:10px;color:#60766b;text-decoration:none;font-weight:700;font-size:12px}
.billing-nav a span{width:17px;text-align:center}.billing-nav a:hover,.billing-nav a.active{background:#e5f2e9;color:#145f42}
.billing-main{min-width:0;padding:0 clamp(18px,3.4vw,54px) 65px}
.billing-inner{max-width:1240px;margin:auto}
.billing-top{min-height:77px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #e5ece7;margin-bottom:30px;gap:10px}
.billing-top a{color:#176648;text-decoration:none;font-weight:800}
.billing-hero{background:linear-gradient(115deg,#103c2c,#176448 72%,#217755);color:white;border-radius:22px;padding:36px 38px}
.billing-hero small{color:#bcebd2;font-weight:800;font-size:10px;letter-spacing:1.8px}
.billing-hero h1{color:white!important;font:850 clamp(27px,3vw,36px)/1.18 Arial;margin:12px 0}
.billing-hero p{max-width:700px;color:#d8eade;line-height:1.8;margin:0}
.billing-controls{display:flex;flex-wrap:wrap;align-items:center;gap:12px;margin:22px 0}
.billing-select,.billing-input{border:1px solid #d7e6dc;background:white;border-radius:10px;padding:11px 13px;color:#22533a;font:13px Arial;max-width:100%;min-width:140px}
.billing-select:focus,.billing-input:focus{outline:2px solid #62b889}
.billing-button{background:#176448;color:white;border:0;padding:12px 16px;border-radius:10px;font:800 12px Arial;cursor:pointer}
.billing-button:disabled{opacity:.48;cursor:not-allowed}
.billing-secondary{background:#edf5ef;color:#1d6448}
.billing-error{border:1px solid #f1d4c8;background:#fff3ed;color:#a34736;border-radius:10px;padding:13px;margin-bottom:15px}
.billing-info{border:1px solid #d9e9db;background:#f1f8f2;color:#3b7151;border-radius:10px;padding:13px;margin-bottom:15px}
.billing-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-bottom:18px}
.billing-stat,.billing-panel,.billing-plan{border:1px solid #e0ebe4;background:white;border-radius:16px;padding:22px;min-width:0}
.billing-stat small{color:#82988a;display:block;font-weight:800}.billing-stat strong{display:block;color:#166745;font-size:25px;margin:9px 0}
.billing-section-head{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin:25px 0 13px}
.billing-section-head h2{font:850 20px Arial;color:#1c4831;margin:0}
.billing-plans{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
.billing-plan.featured{border:2px solid #217653;box-shadow:0 12px 28px #0a6b2c0c}
.billing-pill{display:inline-block;font-size:10px;font-weight:800;background:#e5f2e8;color:#176648;padding:6px 10px;border-radius:20px}
.billing-plan h3{font:850 21px Arial;color:#174b35;margin:15px 0 8px}
.billing-plan p{font-size:12px;color:#759080;min-height:36px}
.billing-price{font:850 25px Arial;color:#185b3f;margin:20px 0}
.billing-price small{font:500 11px Arial;color:#718d7d}
.billing-features{list-style:none;padding:0;margin:16px 0 22px;min-height:132px}
.billing-features li{padding:7px 0;color:#506b5b}.billing-features li:before{content:'✓';color:#198357;font-weight:800;margin-right:10px}
.billing-table-wrap{overflow-x:auto}
.billing-table{width:100%;border-collapse:collapse;min-width:650px;text-align:left}
.billing-table th{font-size:10px;text-transform:uppercase;letter-spacing:1px;background:#f6faf7;color:#81988a;padding:14px}
.billing-table td{padding:14px;border-bottom:1px solid #edf3ee;color:#496951}
.billing-muted{color:#869c8d;font-size:12px}
.billing-form{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:15px 0}
.billing-form label{font-size:11px;font-weight:800;color:#617f6b}
.billing-form input{display:block;width:100%;margin-top:5px}
@media(max-width:1100px){.billing-plans{grid-template-columns:1fr}.billing-summary{grid-template-columns:repeat(2,minmax(0,1fr))}.billing-features{min-height:0}}
@media(max-width:760px){.billing-shell{display:block}.billing-side{border-right:0;border-bottom:1px solid #e4ede6;padding:14px}.billing-brand{padding:4px 10px 12px}.billing-nav{flex-direction:row;overflow:auto}.billing-nav a{white-space:nowrap;flex:none}.billing-main{padding:0 15px 40px}.billing-top{min-height:60px;margin-bottom:18px}.billing-hero{padding:26px 22px}.billing-summary{grid-template-columns:1fr}.billing-form{grid-template-columns:1fr}}
`;

const date=x=>x?new Date(x).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}):"—";
const money=(minor,currency)=>new Intl.NumberFormat("en",{style:"currency",currency:currency||"EGP"}).format(Number(minor)/100);
const defaultPlans=[
 {id:"starter",name:"Starter",description:"For growing recruitment teams.",feature_list:["Jobs & candidate pipeline","Interview management","Essential reports"]},
 {id:"professional",name:"Professional",description:"Advanced recruitment intelligence.",feature_list:["Everything in Starter","Advanced recruitment operations","AI workflows & analytics"]},
 {id:"enterprise",name:"Enterprise",description:"Tailored to your organization.",feature_list:["Everything in Professional","Enterprise configuration","Tailored onboarding & support"]}
];
export default function BillingPage(){
 const [companyId,setCompanyId]=useState("");
 const [companies,setCompanies]=useState([]);
 const [role,setRole]=useState("");
 const [plans,setPlans]=useState(defaultPlans);
 const [prices,setPrices]=useState([]);
 const [subscription,setSubscription]=useState(null);
 const [invoices,setInvoices]=useState([]);
 const [payments,setPayments]=useState([]);
 const [period,setPeriod]=useState("month");
 const [currency,setCurrency]=useState("EGP");
 const [loading,setLoading]=useState(true);
 const [processing,setProcessing]=useState("");
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const [refresh,setRefresh]=useState(0);
 const [customer,setCustomer]=useState({firstName:"",lastName:"",phone:""});
 useEffect(()=>{if(typeof window!=="undefined"&&new URLSearchParams(window.location.search).get("payment")==="returned"){
  setNotice("You've returned from Paymob. Payment is only confirmed after Paymob's verified server notification. Refresh your billing status shortly.");
 }},[]);
 useEffect(()=>{let active=true;(async()=>{
  setLoading(true);setError("");
  const {data:{user},error:authErr}=await supabase.auth.getUser();
  if(!active)return;
  if(authErr||!user){setError("Please sign in to view billing.");setLoading(false);return;}
  const member=await supabase.from("company_members").select("company_id,role").eq("user_id",user.id);
  if(!active)return;
  if(member.error){setError(member.error.message);setLoading(false);return;}
  const adminRows=(member.data||[]).filter(m=>m.role==="admin");
  setCompanies(adminRows);
  setCompanyId(old=>adminRows.some(x=>x.company_id===old)?old:(adminRows[0]?.company_id||""));
  if(!adminRows.length)setError("Only company admins can access subscription and billing details.");
  setLoading(false);
 })().catch(e=>{if(active){setError(e.message);setLoading(false);}});return()=>{active=false;};},[]);
 useEffect(()=>{if(!companyId){setSubscription(null);setInvoices([]);setPayments([]);return;}
 let active=true;setLoading(true);setError("");
 (async()=>{
  const p=await Promise.all([
   supabase.from("billing_plans").select("id,name,description,feature_list,limits,sort_order").order("sort_order"),
   supabase.from("billing_plan_prices").select("id,plan_id,currency,billing_interval,amount_minor").eq("is_active",true),
   supabase.from("company_subscriptions").select("plan_id,status,provider,current_period_end,cancel_at_period_end,started_at").eq("company_id",companyId).maybeSingle(),
   supabase.from("billing_invoices").select("id,plan_id,amount_minor,currency,status,billing_interval,issued_at,paid_at").eq("company_id",companyId).order("issued_at",{ascending:false}).limit(50),
   supabase.from("billing_payments").select("id,amount_minor,currency,status,created_at").eq("company_id",companyId).order("created_at",{ascending:false}).limit(50)
  ]);
  if(!active)return;
  const failure=p.find(r=>r.error);
  if(failure){setError(failure.error.message+" — Run the Billing Foundation SQL in Supabase first.");setLoading(false);return;}
  setPlans(p[0].data?.length?p[0].data:defaultPlans);
  setPrices(p[1].data||[]);
  setSubscription(p[2].data||null);
  setInvoices(p[3].data||[]);
  setPayments(p[4].data||[]);
  setRole("admin");
  setLoading(false);
 })().catch(e=>{if(active){setError(e.message);setLoading(false);}});return()=>{active=false;};
 },[companyId,refresh]);
 async function checkout(priceId){
  if(!priceId||processing||!companyId)return;
  setProcessing(priceId);setError("");setNotice("");
  try{
   const {data,error}=await supabase.auth.getSession();
   if(error||!data?.session?.access_token)throw Error("Please sign in again.");
   const res=await fetch("/api/billing/checkout",{
    method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+data.session.access_token},
    body:JSON.stringify({companyId,priceId,customer})
   });
   const result=await res.json();
   if(!res.ok)throw Error(result.error||"Unable to create checkout.");
   if(!result.checkoutUrl||!/^https:\/\/(accept|ksa|uae|oman)\.paymob\.com\/unifiedcheckout\//.test(result.checkoutUrl))
    throw Error("Payment redirect was invalid.");
   window.location.assign(result.checkoutUrl);
  }catch(e){setError(e.message||"Unable to process payment.");setProcessing("");}
 }
 const planName=subscription?plans.find(p=>p.id===subscription.plan_id)?.name||subscription.plan_id:"None";
 const paid=payments.filter(p=>p.status==="paid");
 return <main className="billing-page"><style>{styles}</style><div className="billing-shell">
  <aside className="billing-side"><div className="billing-brand"><span>I</span><div>Inspire Match<small>TALENT INTELLIGENCE</small></div></div><ATSNavigation className="billing-nav"/></aside>
  <div className="billing-main"><div className="billing-inner">
   <div className="billing-top"><div>Settings / <strong>Billing &amp; Subscriptions</strong></div><Link href="/app/dashboard">← Dashboard</Link></div>
   <header className="billing-hero"><small>SAAS MANAGEMENT / PAYMENTS</small><h1>Billing &amp; Subscriptions</h1><p>Manage your company's subscription, compare commercial plans and track payment and invoice history. Checkout is powered by Paymob after merchant onboarding and price activation.</p></header>
   <div className="billing-controls">
    <label>Company <select className="billing-select" value={companyId} onChange={e=>setCompanyId(e.target.value)} disabled={!companies.length}>{companies.map(c=><option value={c.company_id} key={c.company_id}>Company {c.company_id.slice(0,8)}</option>)}{!companies.length&&<option value="">No admin membership</option>}</select></label>
    <label>Currency <select className="billing-select" value={currency} onChange={e=>setCurrency(e.target.value)}>{["EGP","SAR","AED","OMR"].map(x=><option key={x}>{x}</option>)}</select></label>
    <label>Billing period <select className="billing-select" value={period} onChange={e=>setPeriod(e.target.value)}><option value="month">Monthly</option><option value="year">Yearly</option></select></label>
    <button type="button" className="billing-button billing-secondary" onClick={()=>setRefresh(x=>x+1)} disabled={loading||!companyId}>↻ Refresh</button>
   </div>
   {error&&<div role="alert" className="billing-error">{error}</div>}
   {notice&&<div className="billing-info" role="status">{notice}</div>}
   {loading&&<div className="billing-info">Loading your billing records…</div>}
   <div className="billing-summary">
    <div className="billing-stat"><small>Current plan</small><strong>{planName}</strong><span className="billing-muted">Company subscription</span></div>
    <div className="billing-stat"><small>Subscription status</small><strong style={{textTransform:"capitalize"}}>{subscription?.status?.replaceAll("_"," ")||"Not subscribed"}</strong><span className="billing-muted">{subscription?.cancel_at_period_end?"Set to cancel at period end":"Confirmed from billing records"}</span></div>
    <div className="billing-stat"><small>Period ends</small><strong>{date(subscription?.current_period_end)}</strong><span className="billing-muted">Updated by verified payment processing</span></div>
   </div>
   <div className="billing-section-head"><h2>Choose your plan</h2><span className="billing-pill">Paymob integration prepared</span></div>
   <section className="billing-plans">{plans.map(plan=>{
    const price=prices.find(p=>p.plan_id===plan.id&&p.currency===currency&&p.billing_interval===period);
    const features=Array.isArray(plan.feature_list)?plan.feature_list:[];
    return <article className={"billing-plan "+(plan.id==="professional"?"featured":"")} key={plan.id}>
     <span className="billing-pill">{plan.id==="professional"?"MOST ADVANCED":plan.id==="enterprise"?"TAILORED":"ESSENTIALS"}</span>
     <h3>{plan.name}</h3><p>{plan.description}</p>
     <div className="billing-price">{price?money(price.amount_minor,currency):"Contact us"} <small>{price?"/ "+(period==="month"?"month":"year"):"Pricing not published yet"}</small></div>
     <ul className="billing-features">{features.map((feature,index)=><li key={index}>{feature}</li>)}</ul>
     <button type="button" className="billing-button" style={{width:"100%"}} disabled={!price||!companyId||loading||!!processing||subscription?.plan_id===plan.id&&subscription?.status==="active"} onClick={()=>checkout(price?.id)}>
      {processing===price?.id?"Starting payment…":subscription?.plan_id===plan.id&&subscription?.status==="active"?"Current plan":price?"Continue to Paymob":"Awaiting approved pricing"}
     </button>
    </article>;
   })}</section>
   <div className="billing-section-head"><h2>Billing contact</h2><span className="billing-muted">Only used when initiating checkout</span></div>
   <section className="billing-panel"><div className="billing-form">
    <label>First name <input className="billing-input" autoComplete="given-name" maxLength={80} value={customer.firstName} onChange={e=>setCustomer(c=>({...c,firstName:e.target.value}))} placeholder="First name"/></label>
    <label>Last name <input className="billing-input" autoComplete="family-name" maxLength={80} value={customer.lastName} onChange={e=>setCustomer(c=>({...c,lastName:e.target.value}))} placeholder="Last name"/></label>
    <label>Phone <input className="billing-input" autoComplete="tel" maxLength={22} value={customer.phone} onChange={e=>setCustomer(c=>({...c,phone:e.target.value}))} placeholder="+20…"/></label>
   </div><p className="billing-muted">The invoice amount is always retrieved from the database on the server. Enter your contact details before proceeding with an available plan.</p></section>
   <div className="billing-section-head"><h2>Invoice history</h2><span className="billing-muted">{invoices.length} records</span></div>
   <section className="billing-panel"><div className="billing-table-wrap"><table className="billing-table"><thead><tr><th>Invoice</th><th>Issued</th><th>Plan</th><th>Amount</th><th>Status</th></tr></thead><tbody>{invoices.map(i=><tr key={i.id}><td>INV-{i.id.slice(0,8).toUpperCase()}</td><td>{date(i.issued_at)}</td><td>{plans.find(p=>p.id===i.plan_id)?.name||i.plan_id}</td><td>{money(i.amount_minor,i.currency)}</td><td><span className="billing-pill">{i.status}</span></td></tr>)}</tbody></table></div>{!invoices.length&&<p className="billing-muted">No invoices yet. Paid invoices will appear here after verified payments.</p>}</section>
   <div className="billing-section-head"><h2>Payment history</h2><span className="billing-muted">{paid.length} successful payment records</span></div>
   <section className="billing-panel"><div className="billing-table-wrap"><table className="billing-table"><thead><tr><th>Date</th><th>Amount</th><th>Status</th></tr></thead><tbody>{payments.map(p=><tr key={p.id}><td>{date(p.created_at)}</td><td>{money(p.amount_minor,p.currency)}</td><td><span className="billing-pill">{p.status}</span></td></tr>)}</tbody></table></div>{!payments.length&&<p className="billing-muted">No payments recorded.</p>}</section>
   <p className="billing-muted" style={{marginTop:20}}>Payments are one-off checkout payments in this foundation. Automatic recurring charges, downloadable tax invoices, cancellation self-service and feature enforcement are not yet enabled.</p>
  </div></div>
 </div></main>;
}
