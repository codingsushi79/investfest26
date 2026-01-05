"use client";

import { FormEvent, useState, useTransition } from "react";
import { updateUsername } from "@/app/actions";

export function UsernameForm({ initial }: { initial: string | null }) {
  const [username, setUsername] = useState(initial ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      try {
        await updateUsername(username);
        setMessage("Saved");
      } catch (err) {
        setMessage((err as Error).message);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2 animate-in fade-in-0 slide-in-from-left-4 duration-500">
      <label className="text-sm font-medium text-zinc-700 animate-in fade-in-0 duration-300" style={{ animationDelay: '100ms' }}>Username</label>
      <div className="flex items-center gap-2 animate-in fade-in-0 duration-400" style={{ animationDelay: '200ms' }}>
        <input
          className="w-48 rounded-md border border-zinc-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 hover:border-zinc-300 animate-in fade-in-0 slide-in-from-left-2 duration-400"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="choose a handle"
          style={{ animationDelay: '300ms' }}
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 hover:scale-105 disabled:opacity-60 transition-all duration-200 animate-in fade-in-0 slide-in-from-right-2 duration-400"
          style={{ animationDelay: '400ms' }}
        >
          {isPending && (
            <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-white inline" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          )}
          <span className={isPending ? 'animate-pulse' : ''}>
            {isPending ? "Saving..." : "💾 Save"}
          </span>
        </button>
      </div>
      {message && (
        <p className={`text-xs font-medium animate-in fade-in-0 slide-in-from-top-1 duration-300 ${message === "Saved" ? "text-emerald-700" : "text-rose-700"}`}>
          {message === "Saved" ? "✅ " : "❌ "}{message}
        </p>
      )}
    </form>
  );
}

