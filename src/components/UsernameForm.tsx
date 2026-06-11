"use client";

import { FormEvent, useState, useTransition } from "react";
import { toast } from "sonner";
import { updateUsername } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AC } from "@/lib/autocomplete";

export function UsernameForm({ initial }: { initial: string | null }) {
  const [username, setUsername] = useState(initial ?? "");
  const [isPending, startTransition] = useTransition();

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        await updateUsername(username);
        toast.success("Username saved");
      } catch (err) {
        toast.error((err as Error).message);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex flex-1 flex-col gap-2">
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete={AC.off}
          placeholder="Choose a handle"
        />
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
