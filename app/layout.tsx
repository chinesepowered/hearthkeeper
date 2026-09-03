import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Hearthkeeper — a shared care plan for families and their agents",
  description:
    "One care plan for an aging parent, shared by the family and editable by AI agents through WebMCP. Mom talks to her agent; the family sees the plan update.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${fraunces.variable} antialiased`}>{children}</body>
    </html>
  );
}
