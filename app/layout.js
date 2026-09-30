import { Playfair_Display, Montserrat, Allura } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const montserrat = Montserrat({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const allura = Allura({ subsets: ["latin"], weight: "400", variable: "--font-script", display: "swap" });

export const metadata = {
  title: "Inspire Match | Hire & Inspire by Christine",
  description: "Match CVs to a job description and share a ranked shortlist.",
};

export const viewport = { themeColor: "#1E3B32" };

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${playfair.variable} ${montserrat.variable} ${allura.variable}`}>
      <body>{children}</body>
    </html>
  );
}
