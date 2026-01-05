"use client";

import { useState } from "react";
import versionInfo from "@/lib/version.json";

export function VersionIndicator() {
  const [isExpanded, setIsExpanded] = useState(false);
  const displayVersion = versionInfo.commitHash !== "unknown" 
    ? `v${versionInfo.version} (${versionInfo.commitHash})`
    : `v${versionInfo.version}`;

  return (
    <div className="fixed bottom-4 left-4 z-50 animate-in fade-in-0 slide-in-from-left-4 duration-1000" style={{ animationDelay: '2000ms' }}>
      <div
        className="bg-slate-200/80 backdrop-blur-sm text-slate-700 text-xs rounded-lg shadow-sm border border-slate-300/50 overflow-hidden transition-all duration-500 ease-in-out hover:shadow-lg hover:scale-105 hover:bg-slate-300/80"
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
      >
        <div className="px-3 py-1.5 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="font-mono whitespace-nowrap animate-pulse">📋 {displayVersion}</span>
            <div
              className={`flex items-center gap-2 overflow-hidden transition-all duration-500 ease-in-out ${
                isExpanded ? "max-w-[500px] opacity-100" : "max-w-0 opacity-0"
              }`}
            >
              <span className="text-slate-600 whitespace-nowrap animate-in fade-in-0 duration-300" style={{ animationDelay: '100ms' }}>© 2025 Sasha Baranov</span>
              <span className="text-slate-400 animate-in fade-in-0 duration-300" style={{ animationDelay: '200ms' }}>•</span>
              <a
                href="https://github.com/codingsushi79/investfest26"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 underline whitespace-nowrap transition-all duration-200 hover:scale-110 animate-in fade-in-0 duration-300"
                style={{ animationDelay: '300ms' }}
              >
                🔗 GitHub
              </a>
            </div>
          </div>
          {isExpanded && versionInfo.commitMessage && (
            <div className="text-slate-600 text-xs italic max-w-[400px] truncate animate-in fade-in-0 slide-in-from-bottom-2 duration-400 border-t border-slate-300/30 pt-1 mt-1" style={{ animationDelay: '400ms' }}>
              💬 {versionInfo.commitMessage}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

