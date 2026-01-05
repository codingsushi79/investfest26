"use client";

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

interface PageTransitionProps {
  children: React.ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(false);
  const [displayChildren, setDisplayChildren] = useState(children);

  useEffect(() => {
    setIsLoading(true);

    const timer = setTimeout(() => {
      setDisplayChildren(children);
      setIsLoading(false);
    }, 150); // Short delay for smooth transition

    return () => clearTimeout(timer);
  }, [pathname, children]);

  return (
    <div className="relative min-h-screen">
      {/* Loading overlay */}
      {isLoading && (
        <div className="fixed inset-0 z-50 bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
          <div className="text-center animate-in fade-in-0 zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mb-4 animate-pulse">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="animate-pulse">
              <div className="h-2 bg-blue-200 rounded w-32 mx-auto mb-2"></div>
              <div className="h-2 bg-blue-100 rounded w-24 mx-auto"></div>
            </div>
          </div>
        </div>
      )}

      {/* Page content */}
      <div
        className={`transition-all duration-500 ease-in-out ${
          isLoading
            ? 'opacity-0 transform translate-y-4 scale-95'
            : 'opacity-100 transform translate-y-0 scale-100'
        }`}
      >
        {displayChildren}
      </div>
    </div>
  );
}
