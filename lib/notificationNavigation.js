// Centralized, same-origin notification navigation.
// Never trust action_url as an unrestricted browser URL.
export function safeNotificationHref(actionUrl) {
  if (typeof actionUrl !== "string") return null;
  const value = actionUrl.trim();
  if (!/^\/app(?:\/|$|\?)/.test(value)) return null;
  if (/[\\\u0000-\u001f\u007f]/.test(value)) return null;
  if (value.includes("//")) return null;
  try {
    const url = new URL(value, "https://inspire-match-ats.vercel.app");
    if (url.origin !== "https://inspire-match-ats.vercel.app") return null;
    if (!url.pathname.startsWith("/app/") && url.pathname !== "/app") return null;
    return url.pathname + url.search + url.hash;
  } catch {
    return null;
  }
}

export function notificationDestination(item) {
  const direct = safeNotificationHref(item?.action_url);
  if (direct) return { href: direct, exact: true };
  const type = String(item?.type || "").toLowerCase();
  const title = String(item?.title || "").toLowerCase();
  if (/approval|offer/.test(type + " " + title)) return { href: "/app/approvals", exact: false };
  if (/interview|evaluation/.test(type + " " + title)) return { href: "/app/interviews", exact: false };
  if (/task|sla|workflow|team|escalation|deadline/.test(type + " " + title)) return { href: "/app/recruitment-operations/tasks", exact: false };
  return { href: "/app/today", exact: false };
}

// Keep compensation and offer contents out of notification previews.
// Access to actual offer records must still be protected in the backend.
export function notificationPreview(item) {
  const type = String(item?.type || "").toLowerCase();
  const title = String(item?.title || "");
  const message = String(item?.message || "");
  if (/offer|approval|salary|compensation|remuneration|pay package/i.test([type,title,message].join(" "))) {
    return { title: "Hiring approval update", message: "An approval-related item needs your attention. Open the authorized workspace for details.", redacted: true };
  }
  return { title: title || "Recruitment notification", message, redacted: false };
}
