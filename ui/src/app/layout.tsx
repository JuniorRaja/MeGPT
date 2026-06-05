import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "SelfGPT — Digital Twin of Prasanna Rajendran",
  description: "Ask anything about Prasanna Rajendran — his work, skills, projects, and more.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="claude">
      <body className={`${inter.variable} h-full`}>{children}</body>
    </html>
  );
}
