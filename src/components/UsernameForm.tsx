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
    <form onSubmit={onSubmit} className="flex flex-col gap-2">
      <label className="text-sm font-medium text-zinc-700">Username</label>
      <div className="flex items-center gap-2">
        <input
          className="w-48 rounded-md border border-zinc-200 px-3 py-2 text-sm"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="choose a handle"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {isPending ? "Saving..." : "Save"}
        </button>
      </div>
      {message && <p className="text-xs text-emerald-700">{message}</p>}
    </form>
  );
}

