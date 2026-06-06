import type { Metadata } from "next";
import { Inter, DM_Sans, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--loaded-inter", display: "swap" });
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
  title: "SelfGPT — Digital Twin of Prasanna Rajendran",
  description: "Ask anything about Prasanna Rajendran — his work, skills, projects, and more.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      data-theme="claude"
      className={`${inter.variable} ${dmSans.variable} ${ibmMono.variable} ${ibmSans.variable}`}
    >
      <body className="h-full">{children}</body>
    </html>
  );
}
