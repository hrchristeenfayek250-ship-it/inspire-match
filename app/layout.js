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

export default function RootLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();

  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();

      const isLoginPage =
        pathname === "/app/login" ||
        pathname === "/login";

      if (!data.session && !isLoginPage) {
        router.replace("/app/login");
        return;
      }

      setCheckingAuth(false);
    };

    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const isLoginPage =
          pathname === "/app/login" ||
          pathname === "/login";

        if (!session && !isLoginPage) {
          router.replace("/app/login");
        }

        if (session && isLoginPage) {
          router.replace("/app/dashboard");
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [pathname, router]);

  const isLoginPage =
    pathname === "/app/login" ||
    pathname === "/login";

  return (
    <html
      lang="en"
      className={`${playfair.variable} ${montserrat.variable} ${allura.variable}`}
    >
      <head>
        <title>Inspire Match | Hire & Inspire by Christine</title>
        <meta
          name="description"
          content="AI-powered recruitment and CV matching platform."
        />
        <meta name="theme-color" content="#1E3B32" />
      </head>

      <body>
        {checkingAuth && !isLoginPage ? (
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
