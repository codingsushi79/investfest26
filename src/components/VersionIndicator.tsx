"use client";

import { useState } from "react";

export function VersionIndicator() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <div
        className="bg-slate-200/80 backdrop-blur-sm text-slate-700 text-xs rounded-lg shadow-sm border border-slate-300/50 transition-all duration-300 overflow-hidden"
        style={{ width: isExpanded ? "auto" : "auto", minWidth: "fit-content" }}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
      >
        <div className="px-3 py-1.5 flex items-center gap-2">
          <span className="font-mono whitespace-nowrap">v0.5.3</span>
          {isExpanded && (
            <>
              <span className="text-slate-600 whitespace-nowrap">© 2025 Sasha Baranov</span>
              <span className="text-slate-400">•</span>
              <a
                href="https://github.com/codingsushi79/investfest26"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 underline whitespace-nowrap transition-colors"
              >
                GitHub
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

