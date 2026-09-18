"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { LiveProvider } from "@/lib/live";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <LiveProvider>
        {children}
        <Toaster richColors />
      </LiveProvider>
    </ThemeProvider>
  );
}
