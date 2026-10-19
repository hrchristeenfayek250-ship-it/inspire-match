"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export const ATS_NAVIGATION = [
  ["Overview", "/app/dashboard", "◫"],
  ["Jobs", "/app/jobs", "▣"],
  ["Candidates", "/app/candidates", "♙"],
  ["Pipeline", "/app/pipeline", "⇄"],
  ["AI Matching", "/app/matching", "✧"],
  ["Reports", "/app/reports", "▥"],
  ["Executive", "/app/executive", "◈"],
  ["Team", "/app/team", "♧"],
];

export default function ATSNavigation({
  className = "",
  linkClassName = "",
  onNavigate,
}) {
  const pathname = usePathname();

  return (
    <nav className={className} aria-label="Main navigation">
      {ATS_NAVIGATION.map(([label, href, icon]) => {
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
