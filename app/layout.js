"use client";

import { Playfair_Display, Montserrat, Allura } from "next/font/google";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import "./globals.css";
import { supabase } from "@/lib/supabase";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});
const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});
const allura = Allura({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-script",
  display: "swap",
});

function isPublicRoute(pathname) {
  return (
    pathname === "/" ||
    pathname === "/app/login" ||
    pathname === "/login" ||
    pathname === "/app/accept-invite"
  );
}

// Authenticated users waiting for manual workspace approval can view this page.
// The actual tenant data restriction is enforced by the Supabase RLS policies.
function isWorkspaceAccessPage(pathname) {
  return pathname === "/app/company-setup";
}

export default function RootLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [verifiedPath, setVerifiedPath] = useState(null);
  const [guardError, setGuardError] = useState(false);

  const isPublic = isPublicRoute(pathname);
  const isLoginPage = pathname === "/app/login" || pathname === "/login";

  useEffect(() => {
    let active = true;
    setGuardError(false);

    async function checkAccess() {
      if (isPublicRoute(pathname)) {
        if (active) setVerifiedPath(pathname);
        return;
      }

      // A valid session is necessary but is NOT sufficient to enter the ATS.
      const { data, error } = await supabase.auth.getSession();
      if (!active) return;
      if (error || !data?.session) {
        setVerifiedPath(null);
        router.replace("/app/login");
        return;
      }

      if (isWorkspaceAccessPage(pathname)) {
        setVerifiedPath(pathname);
        return;
      }

      // A trusted SECURITY DEFINER RPC checks the current user's memberships,
      // legacy preserved companies, sales activation and internal staff status.
      // Fail closed if the RPC cannot verify entitlement.
      const gate = await supabase.rpc("billing_my_tenant_entry_gate");
      if (!active) return;
      if (gate.error) {
        console.error("Workspace access check failed:", gate.error.message);
        setGuardError(true);
        setVerifiedPath(null);
        return;
      }

      if (gate.data?.allowed !== true) {
        setVerifiedPath(null);
        router.replace("/app/company-setup");
        return;
      }

      setVerifiedPath(pathname);
    }

    checkAccess().catch((error) => {
      if (!active) return;
      console.error("Workspace access check failed:", error);
      setVerifiedPath(null);
      setGuardError(true);
    });

    // Do not make async database queries inside the auth state callback.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      if (!session && !isPublicRoute(pathname)) {
        setVerifiedPath(null);
        router.replace("/app/login");
      } else if (session && isLoginPage) {
        router.replace("/app/dashboard");
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [pathname, router, isLoginPage]);

  const isChecking = !isPublic && verifiedPath !== pathname;

  return (
    <html
      lang="en"
      className={`${playfair.variable} ${montserrat.variable} ${allura.variable}`}
    >
      <head>
        <title>Inspire Match | AI-Powered Recruitment by Hire &amp; Inspire</title>
        <meta
          name="description"
          content="Inspire Match is an AI-powered recruitment workspace. Explore the platform and request a private demo with our Sales team."
        />
        <meta name="theme-color" content="#174c39" />
      </head>
      <body>
        {guardError && isChecking ? (
          <main style={{
            minHeight: "100vh",
            maxWidth: "none",
            padding: "48px 20px",
            display: "grid",
            placeItems: "center",
            background: "#f6f9f6",
            fontFamily: "Montserrat, sans-serif",
            color: "#174c39"
          }}>
            <section style={{
              maxWidth: 530, padding: 30,
              background: "#fff", border: "1px solid #dfe9e1",
              borderRadius: 16, textAlign: "center"
            }}>
              <h1 style={{ fontSize: 24, marginBottom: 14 }}>
                Workspace verification unavailable
              </h1>
              <p style={{ color: "#6e8373", lineHeight: 1.7 }}>
                We couldn't verify your company access. Your recruitment data
                remains protected. Please try again or contact the Inspire Match team.
              </p>
              <a href="/app/company-setup" style={{ color: "#176343", fontWeight: 700 }}>
                View workspace access
              </a>
            </section>
          </main>
        ) : isChecking ? (
          <div style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "Montserrat, sans-serif",
            color: "#1E3B32",
          }}>
            Verifying workspace access...
          </div>
        ) : children}
      </body>
    </html>
  );
}
