"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";


export const ATS_NAVIGATION = [
  ["Overview", "/app/dashboard", "◫"],
  ["Today", "/app/today", "◷"],
  ["Notifications", "/app/notifications", "◉"],
  ["Jobs", "/app/jobs", "▣"],
  ["Inspire Connect", "/app/inspire-connect", "⌁"],
  ["Candidates", "/app/candidates", "♙"],
  ["Recycle Bin", "/app/recycle-bin", "♻"],
  ["Pipeline", "/app/pipeline", "⇄"],
  
   ["Recruitment Operations", "/app/recruitment-operations", "◈"],
  ["Interviews", "/app/interviews", "▤"],
  ["Interview Kits", "/app/interviews/kits", "▤"],
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
  const [accessState, setAccessState] = useState("loading");

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user || !active) {
        if (active) setAccessState("denied");
        return;
      }
      const [membership, internal] = await Promise.all([
        supabase.from("company_members").select("company_id,role")
          .eq("user_id", user.id).limit(2),
        supabase.rpc("billing_is_internal_staff")
      ]);
      if (!active) return;
      const memberships = membership.error ? [] : membership.data || [];
      const validMembership = memberships.length === 1 && Boolean(memberships[0].company_id);
      const role = validMembership ? String(memberships[0].role || "").toLowerCase() : "";
      const hrRoles = ["admin", "hr_manager", "senior_recruiter", "hr", "recruiter", "hr_specialist"];
      setCanViewCompanyBilling(validMembership && role === "admin");
      setIsInternalStaff(!internal.error && internal.data === true);
      setAccessState(!validMembership ? "denied" : role === "hiring_manager" ? "hiring_manager" : hrRoles.includes(role) ? "hr" : "denied");
    })().catch(() => {
      if (active) { setCanViewCompanyBilling(false); setIsInternalStaff(false); setAccessState("denied"); }
    });
    return () => { active = false; };
  }, []);

  // Fail closed: never render the HR menu while membership is unknown or invalid.
  const visibleNavigation = accessState === "hiring_manager"
    ? [["My Hiring Workspace", "/app/hiring-manager", "◫"], ["Approval Center", "/app/approvals", "✓"]]
    : accessState === "hr"
      ? [
          ...ATS_NAVIGATION.filter(([label]) => label !== "Billing & Subscriptions" || canViewCompanyBilling),
          ...(isInternalStaff ? [["Internal Sales & Finance", "/app/billing/internal", "▧"]] : []),
        ]
      : [];

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
