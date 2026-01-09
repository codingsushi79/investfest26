"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

interface PageTransitionProps {
  children: React.ReactNode;
}

// Handles subtle page transitions between route changes and shows
// a simple top loading bar while the new page is preparing.
export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(false);
  const [displayChildren, setDisplayChildren] = useState(children);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Start transition when the URL changes
    setIsLoading(true);
    setProgress(0);

    // Simulate a smooth progress bar up to ~90%
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + 10;
      });
    }, 60);

    const timer = setTimeout(() => {
      // After a short delay, swap in the new page and finish the bar
      setDisplayChildren(children);
      setProgress(100);

      const doneTimer = setTimeout(() => {
        setIsLoading(false);
        setProgress(0);
      }, 180);

      return () => clearTimeout(doneTimer);
    }, 260); // Small delay for smoother perceived transition

    return () => {
      clearInterval(progressInterval);
      clearTimeout(timer);
    };
  }, [pathname, children]);

  return (
    <div className="relative min-h-screen">
      {/* Top loading bar */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-40 h-1.5 bg-slate-900/5 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-500 transition-[width] duration-120 ease-out"
          style={{ width: `${isLoading ? progress : 0}%` }}
        />
      </div>

      {/* Page content (no heavy overlay, just keep it responsive) */}
      <div key={pathname}>{displayChildren}</div>
    </div>
  );
}
