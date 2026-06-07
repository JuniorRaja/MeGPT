import type { Metadata } from "next";
import { Poppins, Roboto_Serif, DM_Sans, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
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
  description: "Ask anything about Prasanna R — his work, skills, projects, and more.",
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
    </html>
  );
}
