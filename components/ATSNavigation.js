"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";



const NAV_ICON_PATHS = {
  "/app/dashboard": <><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="5" rx="1.5"/><rect x="13" y="10" width="8" height="11" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/></>,
  "/app/jobs": <><rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18"/></>,
  "/app/candidates": <><circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M17 5a3 3 0 0 1 0 6M19 20v-2a6 6 0 0 0-3-5"/></>,
  "/app/pipeline": <><rect x="3" y="4" width="5" height="16" rx="1"/><rect x="10" y="4" width="5" height="10" rx="1"/><rect x="17" y="4" width="4" height="13" rx="1"/></>,
  "/app/interviews": <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18M8 15h3M14 15h3"/></>,
  "/app/offers": <><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 7h6M9 11h6M9 15h3M14 17l2 2 4-4"/></>,
  "/app/reports": <><path d="M4 20V10M10 20V4M16 20v-8M22 20v-6"/></>,
  "/app/matching": <><path d="m12 2 2.8 7.2L22 12l-7.2 2.8L12 22l-2.8-7.2L2 12l7.2-2.8z"/></>,
  "/app/ai-shortlisting": <><path d="M4 4h16M4 9h16M4 14h10M4 19h8M17 15l1.5 3.5L22 20l-3.5 1.5L17 25"/></>,
  "/app/today": <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  "/app/notifications": <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></>,
  "/app/approvals": <><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></>,
  "/app/team": <><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 15a4 4 0 0 1 5 4v1"/></>,
  "/app/hiring-manager": <><path d="M3 20V7l9-4 9 4v13H3zM9 20v-7h6v7M7 9h2M15 9h2"/></>,
  "/app/billing": <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h4"/></>,
};
function NavigationIcon({ href }) {
  const key = Object.keys(NAV_ICON_PATHS)
    .filter((path) => href === path || href.startsWith(path + "/"))
    .sort((a, b) => b.length - a.length)[0];
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">
      {NAV_ICON_PATHS[key] || <><circle cx="12" cy="12" r="9"/><path d="M8 12h8M12 8v8"/></>}
    </svg>
  );
}

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
  const [collapsed, setCollapsed] = useState(false);

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

  // Exact or nearest route takes precedence (e.g. Interview Kits over Interviews).
  const activePath = visibleNavigation
    .map(([, href]) => href)
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];
  const isActive = (href) => activePath === href;

  const renderLink = ([label, href]) => {
    const active = isActive(href);
    return (
      <Link
        key={href}
        href={href}
        title={label}
        aria-label={label}
        onClick={onNavigate}
        className={`inspire-nav-link ${linkClassName} ${active ? "active" : ""}`.trim()}
        aria-current={active ? "page" : undefined}
      >
        <span className="inspire-nav-symbol"><NavigationIcon href={href} /></span>
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
  const revealExtras = !collapsed && (moreToolsOpen || activeExtra);

  return (
    <nav className={`inspire-nav im3-nav ${collapsed ? "im3-nav-collapsed" : ""} ${className}`.trim()} aria-label="Main navigation">
      <div className="im3-nav-toolbar">
        <span className="im3-nav-heading">NAVIGATION</span>
        <button type="button" className="im3-collapse-toggle" title={collapsed ? "Expand sidebar" : "Collapse sidebar"} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} aria-pressed={collapsed} onClick={() => setCollapsed((current) => !current)}>
          {collapsed ? "»" : "«"}
        </button>
      </div>
      {accessState === "hr" && (
        <div className="inspire-nav-kicker">WORKSPACE</div>
      )}
      <div className="im3-primary-links">{compactNavigation.map(renderLink)}</div>
      {extraNavigation.length > 0 && (
        <div className="inspire-nav-secondary">
          <div className="inspire-nav-kicker">MORE</div>
          <button
            type="button"
            className="inspire-nav-more"
            aria-expanded={revealExtras}
            aria-controls="ats-more-tools"
            onClick={() => setMoreToolsOpen((open) => !open)}
          >
            <span className="inspire-nav-symbol"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" aria-hidden="true"><circle cx="5" cy="6" r="1.3"/><circle cx="12" cy="6" r="1.3"/><circle cx="19" cy="6" r="1.3"/><circle cx="5" cy="13" r="1.3"/><circle cx="12" cy="13" r="1.3"/><circle cx="19" cy="13" r="1.3"/><circle cx="5" cy="20" r="1.3"/><circle cx="12" cy="20" r="1.3"/><circle cx="19" cy="20" r="1.3"/></svg></span>
            <span className="inspire-nav-text">More tools</span>
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
