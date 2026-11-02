"use client";

import Link from "next/link";
import {useEffect,useState} from "react";
import {supabase} from "@/lib/supabase";
import ATSNavigation from "@/components/ATSNavigation";

const style=`
.cb-page{min-height:100vh;background:#f5f8f6;color:#1c4430;font:13px/1.7 Arial,Helvetica,sans-serif}
.cb-page *{box-sizing:border-box}
.cb-shell{display:grid;grid-template-columns:252px minmax(0,1fr);min-height:100vh}
.cb-side{background:white;border-right:1px solid #e4ede6;padding:27px 14px}
.cb-brand{display:flex;gap:11px;align-items:center;padding:4px 13px 29px;font-weight:850;font-size:17px}
.cb-brand>span{display:grid;place-items:center;width:36px;height:36px;border-radius:11px;background:#14583e;color:white;font-size:23px}
.cb-brand small{display:block;font-size:9px;letter-spacing:1.4px;color:#90a597}
.cb-nav{display:flex;flex-direction:column;gap:4px}
.cb-nav a{display:flex;gap:12px;align-items:center;padding:10px 12px;border-radius:10px;text-decoration:none;color:#60776b;font-weight:750;font-size:12px}
.cb-nav a.active,.cb-nav a:hover{background:#e5f2e9;color:#145f42}
.cb-main{min-width:0;padding:0 clamp(18px,3.4vw,52px) 64px}
.cb-inner{max-width:1140px;margin:auto}
.cb-top{display:flex;justify-content:space-between;align-items:center;min-height:77px;border-bottom:1px solid #e3ece5;margin-bottom:28px;gap:10px}
.cb-top a{color:#176648;text-decoration:none;font-weight:800}
.cb-hero{padding:34px 38px;border-radius:22px;background:linear-gradient(115deg,#103c2c,#176448 72%,#217755);color:white}
.cb-hero small{letter-spacing:1.6px;color:#bcebd2;font-size:10px;font-weight:850}
.cb-hero h1{color:white!important;font:850 clamp(26px,3vw,36px)/1.2 Arial;margin:10px 0}
.cb-hero p{margin:0;max-width:710px;color:#d9ecdf;line-height:1.8}
.cb-controls{display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin:22px 0}
.cb-select{max-width:100%;border:1px solid #d3e5d7;background:white;border-radius:10px;padding:11px 13px;color:#26523b}
.cb-button{border:0;background:#176448;color:white;border-radius:10px;padding:11px 18px;font:800 12px Arial;cursor:pointer}
.cb-button:disabled{opacity:.45;cursor:not-allowed}
.cb-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:15px}
.cb-box{background:white;border:1px solid #e0ebe4;border-radius:16px;padding:23px;margin-bottom:16px;min-width:0}
.cb-box small{display:block;font-weight:800;font-size:11px;color:#83998b}
.cb-box strong{display:block;margin:10px 0;color:#195c3e;font-size:24px;overflow-wrap:anywhere}
.cb-heading{display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap;margin:25px 0 12px}
.cb-heading h2{margin:0;font:850 19px Arial;color:#194733}
.cb-pill{border-radius:20px;background:#e7f4eb;color:#1c6848;font-weight:800;font-size:11px;padding:6px 11px}
.cb-muted{color:#82998a;font-size:12px}
.cb-alert{background:#fff3ed;border:1px solid #efd1c4;color:#a64837;border-radius:11px;padding:14px;margin:15px 0}
.cb-info{background:#f0f7f2;border:1px solid #dbe9df;border-radius:11px;padding:14px;margin:15px 0}
.cb-chips{display:flex;flex-wrap:wrap;gap:9px;margin-top:16px}
.cb-chip{padding:8px 12px;background:#f0f7f2;color:#1c6547;border:1px solid #e0eee3;border-radius:10px;font-weight:800;font-size:12px}
.cb-tablewrap{overflow-x:auto}
.cb-table{border-collapse:collapse;width:100%;min-width:600px;text-align:left}
.cb-table th{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#81998a;background:#f5faf6;padding:14px}
.cb-table td{font-size:12px;color:#41634f;padding:14px;border-bottom:1px solid #eaf0eb}
@media(max-width:760px){.cb-shell{display:block}.cb-side{padding:13px;border-right:0;border-bottom:1px solid #e4ede6}.cb-brand{padding:3px 10px 12px}.cb-nav{flex-direction:row;overflow:auto}.cb-nav a{flex:none;white-space:nowrap}.cb-main{padding:0 15px 40px}.cb-top{min-height:60px;margin-bottom:17px}.cb-hero{padding:25px 22px}.cb-stats{grid-template-columns:1fr}}
`;
const date=value=>value?new Date(value).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}):"—";
const money=(value,currency)=>{try{return new Intl.NumberFormat("en-US",{style:"currency",currency:currency||"EGP"}).format(Number(value)/100);}catch{return String(value||0)+" "+(currency||"");}};
const featureNames={
 job_management:"Jobs & Candidate Management",interviews:"Interview Management",
 essential_reports:"Recruitment Reports",ai_matching:"AI Candidate Matching",
 ai_shortlisting:"AI Shortlisting",advanced_analytics:"Advanced Analytics",
 recruitment_operations:"Recruitment Operations",ask_inspire_ai:"Ask Inspire AI",
 custom_support:"Dedicated Support"
};

export default function ClientBillingPage(){
 const [companies,setCompanies]=useState([]);
 const [companyId,setCompanyId]=useState("");
 const [loadingAccount,setLoadingAccount]=useState(true);
 const [loadingData,setLoadingData]=useState(false);
 const [subscription,setSubscription]=useState(null);
 const [invoices,setInvoices]=useState([]);
 const [payments,setPayments]=useState([]);
 const [access,setAccess]=useState(null);
 const [internal,setInternal]=useState(false);
 const [error,setError]=useState("");
 const [refresh,setRefresh]=useState(0);

 useEffect(()=>{
  let active=true;
  (async()=>{
   setLoadingAccount(true);setError("");
   const {data:{user},error:userError}=await supabase.auth.getUser();
   if(userError||!user)throw new Error("Please sign in to access billing.");
   const member=await supabase.from("company_members")
    .select("company_id,role").eq("user_id",user.id).eq("role","admin");
   if(member.error)throw member.error;
   const isStaff=await supabase.rpc("billing_is_internal_staff");
   if(!active)return;
   const admins=member.data||[];
   setCompanies(admins);
   setCompanyId(old=>admins.some(a=>a.company_id===old)?old:(admins[0]?.company_id||""));
   setInternal(isStaff.data===true&&!isStaff.error);
  })().catch(e=>{if(active)setError(e.message||"Unable to load your billing permissions.");})
    .finally(()=>{if(active)setLoadingAccount(false);});
  return()=>{active=false;};
 },[]);

 useEffect(()=>{
  let active=true;
  if(!companyId){setSubscription(null);setInvoices([]);setPayments([]);setAccess(null);return;}
  (async()=>{
   setLoadingData(true);setError("");
   const [sub,inv,pay,snapshot]=await Promise.all([
    supabase.from("company_subscriptions")
     .select("plan_id,status,provider,current_period_end,cancel_at_period_end,started_at")
     .eq("company_id",companyId).maybeSingle(),
    supabase.from("billing_invoices")
     .select("id,amount_minor,currency,status,billing_interval,issued_at,paid_at")
     .eq("company_id",companyId).order("issued_at",{ascending:false}).limit(30),
    supabase.from("billing_payments")
     .select("id,amount_minor,currency,status,created_at")
     .eq("company_id",companyId).order("created_at",{ascending:false}).limit(30),
    supabase.rpc("billing_my_hybrid_access_snapshot",{p_company_id:companyId})
   ]);
   if(!active)return;
   const failure=[sub,inv,pay].find(r=>r.error);
   if(failure)throw failure.error;
   setSubscription(sub.data||null);
   setInvoices(inv.data||[]);
   setPayments(pay.data||[]);
   setAccess(snapshot.error?null:snapshot.data);
  })().catch(e=>{if(active)setError(e.message||"Unable to load the company's billing records.");})
   .finally(()=>{if(active)setLoadingData(false);});
  return()=>{active=false;};
 },[companyId,refresh]);

 const expired=subscription?.current_period_end&&new Date(subscription.current_period_end)<=new Date();
 const status=expired&&["active","trialing"].includes(subscription?.status)? "expired":subscription?.status||"Not subscribed";
 const activeFeatures=Object.entries(access?.features||{})
  .filter(([,enabled])=>enabled===true).map(([key])=>featureNames[key]||key.replaceAll("_"," "));
 const canRead=!!companyId&&!loadingAccount;

 return <main className="cb-page"><style>{style}</style><div className="cb-shell">
  <aside className="cb-side"><div className="cb-brand"><span>I</span><div>Inspire Match<small>TALENT INTELLIGENCE</small></div></div><ATSNavigation className="cb-nav"/></aside>
  <section className="cb-main"><div className="cb-inner">
   <div className="cb-top"><strong>Workspace / Billing</strong><Link href="/app/dashboard">Dashboard</Link></div>
   <header className="cb-hero"><small>PRIVATE CLIENT WORKSPACE</small><h1>Billing &amp; Subscription</h1><p>Your company's subscription, contracted services and billing history — managed directly by Inspire Match Sales. There is no self-service purchase or checkout.</p></header>
   <div className="cb-controls">
    <label>Company{" "}<select className="cb-select" value={companyId} disabled={!companies.length} onChange={e=>setCompanyId(e.target.value)}>{companies.map(c=><option key={c.company_id} value={c.company_id}>Company {c.company_id.slice(0,8)}</option>)}{!companies.length&&<option value="">No company assigned</option>}</select></label>
    <div style={{display:"flex",gap:10}}>{internal&&<Link href="/app/billing/internal" className="cb-button" style={{textDecoration:"none"}}>Internal Sales &amp; Finance</Link>}
     <button type="button" className="cb-button" disabled={!canRead||loadingData} onClick={()=>setRefresh(n=>n+1)}>Refresh</button>
    </div>
   </div>
   {error&&<div role="alert" className="cb-alert">{error}</div>}
   {loadingAccount?<div className="cb-info">Checking billing access…</div>:
    !canRead?<div className="cb-info">Subscription billing is visible only to designated company administrators. Recruiters and other HR users cannot access company financial records.</div>:
    <>
     {loadingData&&<div className="cb-info">Loading subscription records…</div>}
     <div className="cb-stats">
      <div className="cb-box"><small>Subscription</small><strong style={{textTransform:"capitalize"}}>{status.replaceAll("_"," ")}</strong><span className="cb-muted">Managed by Inspire Match</span></div>
      <div className="cb-box"><small>Current period ends</small><strong>{date(subscription?.current_period_end)}</strong><span className="cb-muted">Renewals handled by Sales</span></div>
      <div className="cb-box"><small>Company activation</small><strong style={{textTransform:"capitalize"}}>{access?.activation_status&&access.activation_status!=="not_configured"?access.activation_status:"Under setup"}</strong><span className="cb-muted">Contract-based workspace access</span></div>
     </div>
     <div className="cb-heading"><h2>Contracted services</h2><span className="cb-pill">Private agreement</span></div>
     <section className="cb-box">
      <p>Inspire Match combines core recruitment tools with optional capabilities chosen for your organization. Available features are determined by your company's agreement and user permissions.</p>
      {activeFeatures.length?<div className="cb-chips">{activeFeatures.map(f=><span key={f} className="cb-chip">{f}</span>)}</div>:
       <p className="cb-muted">Your contracted feature list will appear after subscription configuration. Existing ATS access is not restricted by this informational view yet.</p>}
      <p className="cb-muted" style={{marginTop:17}}>To request more users, add-ons, renewal changes or a commercial update, please contact your Inspire Match account representative.</p>
     </section>
     <div className="cb-heading"><h2>Invoice records</h2><span className="cb-muted">{invoices.length} records</span></div>
     <section className="cb-box"><div className="cb-tablewrap"><table className="cb-table"><thead><tr><th>Reference</th><th>Recorded</th><th>Amount</th><th>Status</th></tr></thead>
      <tbody>{invoices.map(i=><tr key={i.id}><td>INV-{i.id.slice(0,8).toUpperCase()}</td><td>{date(i.issued_at)}</td><td>{money(i.amount_minor,i.currency)}</td><td><span className="cb-pill">{i.status}</span></td></tr>)}</tbody></table></div>
      {!invoices.length&&<p className="cb-muted">No invoice records have been created for your company.</p>}
      <p className="cb-muted">These are system billing records, not necessarily issued or tax-compliant invoices.</p>
     </section>
     <div className="cb-heading"><h2>Payment history</h2><span className="cb-muted">{payments.length} records</span></div>
     <section className="cb-box"><div className="cb-tablewrap"><table className="cb-table"><thead><tr><th>Recorded</th><th>Amount</th><th>Status</th></tr></thead>
      <tbody>{payments.map(p=><tr key={p.id}><td>{date(p.created_at)}</td><td>{money(p.amount_minor,p.currency)}</td><td><span className="cb-pill">{p.status}</span></td></tr>)}</tbody></table></div>
      {!payments.length&&<p className="cb-muted">No recorded payments.</p>}
     </section>
     <p className="cb-muted">No live payment collection, online checkout or automatic recurring billing is enabled for Inspire Match customers.</p>
    </>
   }
  </div></section>
 </div></main>;
}
