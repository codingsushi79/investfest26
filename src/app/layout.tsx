import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SettingsButton } from "@/components/SettingsButton";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "InvestFest 2026",
  description: "Virtual stock trading game",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-zinc-50 text-zinc-900 dark:bg-slate-900 dark:text-slate-100`}>
        {children}
        <SettingsButton />
      </body>
    </html>
  );
}
