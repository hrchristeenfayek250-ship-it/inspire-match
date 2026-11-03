"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import ATSNavigation from "@/components/ATSNavigation";

const SALES_EMAIL = "mailto:hello@hireandinspirebychristine.com?subject=Inspire%20Match%20ATS%20-%20Account%20Enquiry";

export default function ClientCommercialPage() {
  const [internal, setInternal] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.rpc("billing_is_internal_staff").then(({ data, error }) => {
      if (active) setInternal(!error && data === true);
    });
    return () => { active = false; };
  }, []);

  return (
    <div className="im-billing-info">
      <style>{`
        .im-billing-info{min-height:100vh;background:#f5f8f6;color:#173f2d;font:14px/1.7 Arial,Helvetica,sans-serif}
        .im-billing-info *{box-sizing:border-box}
        .im-billing-info .shell{display:grid;grid-template-columns:245px minmax(0,1fr);min-height:100vh}
        .im-billing-info .aside{background:white;border-right:1px solid #e1ece4;padding:27px 14px}
        .im-billing-info .aside a{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;color:#5b7766;text-decoration:none;font-size:12px;font-weight:750}
        .im-billing-info .aside a.active,.im-billing-info .aside a:hover{background:#e8f3ea;color:#176342}
        .im-billing-info .brand{font-size:17px;font-weight:850;margin:0 0 24px;padding:0 12px}
        .im-billing-info .main{padding:34px clamp(19px,5vw,64px)}
        .im-billing-info .inner{max-width:920px;margin:0 auto}
        .im-billing-info .eyebrow{font-size:11px;color:#c6efda;font-weight:850;letter-spacing:2px}
        .im-billing-info .hero{background:linear-gradient(110deg,#103c2c,#1a6848);border-radius:22px;padding:42px;color:#fff}
        .im-billing-info h1{font:600 clamp(26px,4vw,40px)/1.2 Georgia,serif;color:#fff;margin:14px 0}
        .im-billing-info .hero p{max-width:610px;color:#d6eadd;margin:0}
        .im-billing-info .panel{background:#fff;border:1px solid #deebe1;border-radius:17px;padding:30px;margin-top:22px}
        .im-billing-info h2{font:600 24px/1.3 Georgia,serif;color:#194734;margin:0 0 12px}
        .im-billing-info .panel p{color:#698073;margin:0 0 20px}
        .im-billing-info .actions{display:flex;gap:12px;flex-wrap:wrap}
        .im-billing-info .btn{display:inline-flex;align-items:center;justify-content:center;border-radius:11px;padding:12px 20px;text-decoration:none;background:#176747;color:#fff;font-weight:850;font-size:12px;border:1px solid #176747}
        .im-billing-info .btn.secondary{background:white;color:#176747;border-color:#d7e8dc}
        .im-billing-info .note{border-top:1px solid #e3eee6;padding-top:17px;color:#8a9e91;font-size:12px;margin-top:23px}
        @media(max-width:770px){.im-billing-info .shell{display:block}.im-billing-info .aside{padding:14px;border-bottom:1px solid #e1ece4}.im-billing-info .aside nav{display:flex;overflow-x:auto;gap:5px}.im-billing-info .aside a{white-space:nowrap}.im-billing-info .brand{margin-bottom:8px}.im-billing-info .main{padding:24px 16px}.im-billing-info .hero{padding:30px 24px}.im-billing-info .panel{padding:24px}}
      `}</style>
      <div className="shell">
        <aside className="aside">
          <div className="brand">✳ INSPIRE MATCH</div>
          <ATSNavigation className="" />
        </aside>
        <main className="main">
          <div className="inner">
            <section className="hero">
              <span className="eyebrow">ACCOUNT SERVICES</span>
              <h1>Commercial enquiries</h1>
              <p>Inspire Match is a privately quoted, sales-led recruitment platform.
                Commercial terms and account services are handled directly by our team.</p>
            </section>
            <section className="panel">
              <h2>Talk to your account representative</h2>
              <p>For new access, additional users, contract renewals or tailored services,
                our Sales team will discuss your requirements privately. No online pricing,
                checkout, payment collection or automated invoicing is available here.</p>
              <div className="actions">
                <a className="btn" href={SALES_EMAIL}>Contact Sales</a>
                <Link className="btn secondary" href="/app/dashboard">Back to Dashboard</Link>
                {internal && <Link className="btn secondary" href="/app/billing/internal">Internal Sales &amp; Finance</Link>}
              </div>
              <div className="note">HIRE BETTER. INSPIRE MORE. · Hire &amp; Inspire by Christine</div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
