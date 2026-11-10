"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";


export const ATS_NAVIGATION = [
  ["Overview", "/app/dashboard", "◫"],
  ["Today", "/app/today", "◷"],
  ["Jobs", "/app/jobs", "▣"],
  ["Candidates", "/app/candidates", "♙"],
  ["Recycle Bin", "/app/recycle-bin", "♻"],
  ["Pipeline", "/app/pipeline", "⇄"],
  
   ["Recruitment Operations", "/app/recruitment-operations", "◈"],
  ["Interviews", "/app/interviews", "▤"],
  ["Hiring Debrief", "/app/interviews/debrief", "◉"],
  ["Offer Management", "/app/offers", "▦"],
["Approval Center", "/app/approvals", "✓"],

  ["AI Matching", "/app/matching", "✧"],
  ["Candidate Comparison", "/app/candidate-comparison", "⇋"],
  ["AI Shortlisting Studio", "/app/ai-shortlisting", "✦"],
  ["Reports", "/app/reports", "▥"],
  ["Ask Inspire AI", "/app/ask-inspire", "✦"],
  ["Executive", "/app/executive", "◈"],
  ["Team", "/app/team", "♧"],
  ["Billing & Subscriptions", "/app/billing", "▤"],

];


export default function ATSNavigation({
  className = "",
  linkClassName = "",
  onNavigate,
}) {
  const pathname = usePathname();
  const [canViewCompanyBilling, setCanViewCompanyBilling] = useState(false);
  const [isInternalStaff, setIsInternalStaff] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user || !active) return;
      const [membership, internal] = await Promise.all([
        supabase.from("company_members").select("company_id")
          .eq("user_id", user.id).eq("role", "admin").limit(1),
        supabase.rpc("billing_is_internal_staff")
      ]);
      if (!active) return;
      setCanViewCompanyBilling(!membership.error && (membership.data || []).length > 0);
      setIsInternalStaff(!internal.error && internal.data === true);
    })().catch(() => {
      if (active) { setCanViewCompanyBilling(false); setIsInternalStaff(false); }
    });
    return () => { active = false; };
  }, []);

  const visibleNavigation = [
    ...ATS_NAVIGATION.filter(([label]) =>
      label !== "Billing & Subscriptions" || canViewCompanyBilling
    ),
    ...(isInternalStaff ? [["Internal Sales & Finance", "/app/billing/internal", "▧"]] : [])
  ];

  return (
    <nav className={className} aria-label="Main navigation">
      {visibleNavigation.map(([label, href, icon]) => {
        const active =
          pathname === href ||
          pathname.startsWith(`${href}/`);

        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={`${linkClassName} ${active ? "active" : ""}`.trim()}
            aria-current={active ? "page" : undefined}
          >
            <span aria-hidden="true">{icon}</span>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
