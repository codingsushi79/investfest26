"use client";

import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** The value meaning "act as myself" rather than as a firm. */
export const AS_SELF = "self";

export type ManagedFirm = {
  id: string;
  name: string;
  slug: string;
  balance: number;
  holdings: Array<{
    companyId: string;
    symbol: string;
    name: string;
    shares: number;
    latestPrice: number;
  }>;
};

/**
 * Firms the signed-in user can trade for. Empty for everyone who doesn't
 * manage one, which is what hides the picker for most people.
 */
export function useManagedFirms() {
  const [firms, setFirms] = useState<ManagedFirm[]>([]);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/firms/managed", { credentials: "include" })
      .then((response) => (response.ok ? response.json() : { firms: [] }))
      .then((data) => {
        if (!cancelled) setFirms(data.firms ?? []);
      })
      .catch(() => {
        if (!cancelled) setFirms([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return firms;
}

function formatCash(amount: number) {
  return `$${amount.toFixed(2)}`;
}

/**
 * Who a trade or offer is being made on behalf of. Renders nothing when the
 * user manages no firms, so ordinary traders never see an extra control.
 */
export function ActingAsSelect({
  id,
  label = "Acting as",
  firms,
  value,
  onChange,
  selfBalance,
  hint,
}: {
  id: string;
  label?: string;
  firms: ManagedFirm[];
  value: string;
  onChange: (value: string) => void;
  selfBalance?: number;
  hint?: string;
}) {
  if (firms.length === 0) return null;

  const activeFirm = firms.find((firm) => firm.id === value) ?? null;

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={(next) => next && onChange(next)}>
        <SelectTrigger id={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={AS_SELF}>
            Myself
            {selfBalance !== undefined ? ` (${formatCash(selfBalance)})` : ""}
          </SelectItem>
          {firms.map((firm) => (
            <SelectItem key={firm.id} value={firm.id}>
              {firm.name} ({formatCash(firm.balance)})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {activeFirm && (
        <p className="text-xs text-muted-foreground">
          {hint ?? "Uses the firm's cash, and what it buys belongs to its clients."}
        </p>
      )}
    </div>
  );
}
