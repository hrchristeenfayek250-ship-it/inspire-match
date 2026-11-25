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
  ["Offers", "/app/offers", "▦"],
["Approval Center", "/app/approvals", "✓"],

  ["AI Matching", "/app/matching", "✧"],
  ["AI Shortlisting Studio", "/app/ai-shortlisting", "✦"],
  ["Analytics", "/app/reports", "▥"],
  ["Ask Inspire AI", "/app/ask-inspire", "✦"],
  ["Executive", "/app/executive", "◈"],
  ["Team", "/app/team", "♧"],
  ["Billing & Subscriptions", "/app/billing", "▤"],

];


// Daily recruiting actions stay visible. Specialized workflows remain
// available under More tools; this does not change route permissions.
const CORE_HR_PATHS = new Set([
  "/app/dashboard",
  "/app/jobs",
  "/app/candidates",
  "/app/pipeline",
  "/app/interviews",
  "/app/offers",
  "/app/reports",
]);

export default function ATSNavigation({
  className = "",
  linkClassName = "",
  onNavigate,
}) {
  const pathname = usePathname();
  const [canViewCompanyBilling, setCanViewCompanyBilling] = useState(false);
  const [isInternalStaff, setIsInternalStaff] = useState(false);
  const [accessState, setAccessState] = useState("loading");
  const [moreToolsOpen, setMoreToolsOpen] = useState(false);

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

  const isActive = (href) =>
    pathname === href || pathname.startsWith(`${href}/`);

  const renderLink = ([label, href, icon]) => {
    const active = isActive(href);
    return (
      <Link
        key={href}
        href={href}
        onClick={onNavigate}
        className={`inspire-nav-link ${linkClassName} ${active ? "active" : ""}`.trim()}
        aria-current={active ? "page" : undefined}
      >
        <span className="inspire-nav-symbol" aria-hidden="true">{icon}</span>
        <span className="inspire-nav-text">{label}</span>
        {active && <span className="inspire-nav-active-dot" aria-hidden="true" />}
      </Link>
    );
  };

  const compactNavigation = accessState !== "hr"
    ? visibleNavigation
    : visibleNavigation.filter(([, href]) => CORE_HR_PATHS.has(href));
  const extraNavigation = accessState !== "hr"
    ? []
    : visibleNavigation.filter(([, href]) => !CORE_HR_PATHS.has(href));
  const activeExtra = extraNavigation.some(([, href]) => isActive(href));
  const revealExtras = moreToolsOpen || activeExtra;

  return (
    <nav className={`inspire-nav ${className}`.trim()} aria-label="Main navigation">
      {accessState === "hr" && (
        <div className="inspire-nav-kicker">WORKSPACE</div>
      )}
      {compactNavigation.map(renderLink)}
      {extraNavigation.length > 0 && (
        <div className="inspire-nav-secondary">
          <div className="inspire-nav-kicker">EXPLORE</div>
          <button
            type="button"
            className="inspire-nav-more"
            aria-expanded={revealExtras}
            aria-controls="ats-more-tools"
            onClick={() => setMoreToolsOpen((open) => !open)}
          >
            <span className="inspire-nav-symbol" aria-hidden="true">◈</span>
            <span className="inspire-nav-text">Advanced tools</span>
            <span aria-hidden="true">{revealExtras ? "⌃" : "⌄"}</span>
          </button>
          {revealExtras && (
            <div id="ats-more-tools" className="inspire-nav-extra">
              {extraNavigation.map(renderLink)}
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
