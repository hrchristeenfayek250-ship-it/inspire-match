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

// Public marketing, login and HR-invitation pages must be accessible
// without an active Supabase session. All other workspace routes
// retain their existing session redirect while server/RLS permissions
// provide the actual data-access boundary.
function publicRoute(pathname) {
  return (
    pathname === "/" ||
    pathname === "/app/login" ||
    pathname === "/login" ||
    pathname === "/app/accept-invite"
  );
}

export default function RootLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [verifiedPath, setVerifiedPath] = useState(null);
  const isPublic = publicRoute(pathname);
  const isLoginPage = pathname === "/app/login" || pathname === "/login";

  useEffect(() => {
    let active = true;

    async function checkAuth() {
      if (publicRoute(pathname)) {
        if (active) setVerifiedPath(pathname);
        return;
      }

      const { data, error } = await supabase.auth.getSession();
      if (!active) return;
      if (error || !data?.session) {
        router.replace("/app/login");
        return;
      }
      setVerifiedPath(pathname);
    }

    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      if (!session && !publicRoute(pathname)) {
        setVerifiedPath(null);
        router.replace("/app/login");
      }
      if (session && isLoginPage) {
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
        {isChecking ? (
          <div
            style={{
              minHeight: "100vh",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "Montserrat, sans-serif",
              color: "#1E3B32",
            }}
          >
            Checking your session...
          </div>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
