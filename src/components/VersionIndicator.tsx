"use client";

export function VersionIndicator() {
  return (
    <div className="fixed bottom-4 left-4 z-50">
      <div className="bg-slate-200/80 backdrop-blur-sm text-slate-700 text-xs px-3 py-1.5 rounded-lg shadow-sm border border-slate-300/50">
        <span className="font-mono">v0.5.3</span>
      </div>
    </div>
  );
}

