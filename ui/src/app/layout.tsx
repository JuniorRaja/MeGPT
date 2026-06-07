import type { Metadata } from "next";
import { Poppins, Roboto_Serif, DM_Sans, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--loaded-poppins",
  display: "swap",
});
const robotoSerif = Roboto_Serif({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--loaded-roboto-serif",
  display: "swap",
});
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--loaded-dm-sans", display: "swap" });
const ibmMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--loaded-ibm-mono",
  display: "swap",
});
const ibmSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--loaded-ibm-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MeGPT — Digital Twin of Prasanna R",
  description: "Ask anything about Prasanna Rajendran — his work, stack, projects, opinions, and more. An AI twin built with RAG.",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'><g stroke='%23c47f3a' stroke-width='1.5' stroke-linecap='round'><line x1='20' y1='4' x2='20' y2='14'/><line x1='20' y1='26' x2='20' y2='36'/><line x1='4' y1='20' x2='14' y2='20'/><line x1='26' y1='20' x2='36' y2='20'/><line x1='8.7' y1='8.7' x2='14.5' y2='14.5'/><line x1='25.5' y1='25.5' x2='31.3' y2='31.3'/><line x1='8.7' y1='31.3' x2='14.5' y2='25.5'/><line x1='25.5' y1='14.5' x2='31.3' y2='8.7'/></g></svg>",
  },
  openGraph: {
    title: "MeGPT — Digital Twin of Prasanna R",
    description: "Ask anything about Prasanna Rajendran — his work, stack, projects, and opinions.",
    url: "https://ai.prasannar.com",
    siteName: "MeGPT",
    images: [{ url: "/chatbot.png", width: 1200, height: 630, alt: "MeGPT" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MeGPT — Digital Twin of Prasanna R",
    description: "Ask anything about Prasanna Rajendran.",
    images: ["/chatbot.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      data-theme="claude"
      data-mode="light"
      className={`${poppins.variable} ${robotoSerif.variable} ${dmSans.variable} ${ibmMono.variable} ${ibmSans.variable}`}
    >
      <body className="h-full">{children}</body>
      <Script
        src="https://analytics.prasannar.com/script.js"
        data-website-id="2324b857-205e-4bca-aeab-87114a5bfab8"
        data-domains="ai.prasannar.com"
        strategy="afterInteractive"
      />
    </html>
  );
}
