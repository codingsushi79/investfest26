"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AC } from "@/lib/autocomplete";

type Company = {
  symbol: string;
  name: string;
  actualShares: number;
  valuationShares: number;
  inBaseline: boolean;
  latestLabel: string;
  nextLabel: string;
};

type Row = { value: string; advance: boolean };

/** Divisor used when nobody holds shares yet, matching the server. */
const BASELINE_SHARES = 100;

/** Set the company value for several companies in one submit. */
export function BulkValueDialog({
  open,
  onOpenChange,
  companies,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companies: Company[];
  onSuccess: () => void;
}) {
  const [rows, setRows] = useState<Record<string, Row>>({});
  const [advanceAll, setAdvanceAll] = useState(false);
  const [saving, setSaving] = useState(false);

  // Start from a clean sheet every time the dialog opens.
  useEffect(() => {
    if (open) {
      setRows({});
      setAdvanceAll(false);
    }
  }, [open]);

  function setRow(symbol: string, patch: Partial<Row>) {
    setRows((current) => ({
      ...current,
      [symbol]: { ...{ value: "", advance: false }, ...current[symbol], ...patch },
    }));
  }

  function toggleAdvanceAll(next: boolean) {
    setAdvanceAll(next);
    setRows((current) => {
      const updated: Record<string, Row> = { ...current };
      for (const company of companies) {
        if (!company.inBaseline) continue;
        updated[company.symbol] = {
          value: current[company.symbol]?.value ?? "",
          advance: next,
        };
      }
      return updated;
    });
  }

  const filled = useMemo(
    () =>
      companies
        .map((company) => {
          const row = rows[company.symbol];
          const parsed = parseFloat(row?.value ?? "");
          if (!row?.value || isNaN(parsed) || parsed <= 0) return null;

          const advancing = !company.inBaseline || row.advance;
          const divisor = advancing
            ? company.actualShares || BASELINE_SHARES
            : company.valuationShares;

          return {
            company,
            companyValue: parsed,
            advancing,
            impliedPrice: divisor > 0 ? parsed / divisor : null,
          };
        })
        .filter(Boolean) as Array<{
        company: Company;
        companyValue: number;
        advancing: boolean;
        impliedPrice: number | null;
      }>,
    [companies, rows]
  );

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (filled.length === 0) {
      toast.error("Enter a value for at least one company");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/admin/update-prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          filled.map((row) => ({
            symbol: row.company.symbol,
            label: row.advancing ? row.company.nextLabel : row.company.latestLabel,
            companyValue: row.companyValue,
            advancePeriod: row.advancing,
          }))
        ),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Update failed");
      }

      toast.success(
        `Updated ${filled.length} ${filled.length === 1 ? "company" : "companies"}`
      );
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Set company values</DialogTitle>
          <DialogDescription>
            Fill in the companies you want to update and save them together. Blank
            rows are left untouched.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {companies.some((company) => company.inBaseline) && (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={advanceAll}
                onCheckedChange={(checked) => toggleAdvanceAll(checked === true)}
              />
              Advance every baseline company to its next period
            </label>
          )}

          <div className="flex flex-col divide-y divide-border rounded-xl border">
            {companies.map((company) => {
              const row = rows[company.symbol] ?? { value: "", advance: false };
              const advancing = !company.inBaseline || row.advance;
              const divisor = advancing
                ? company.actualShares || BASELINE_SHARES
                : company.valuationShares;
              const parsed = parseFloat(row.value);
              const impliedPrice =
                divisor > 0 && !isNaN(parsed) && parsed > 0 ? parsed / divisor : null;

              return (
                <div
                  key={company.symbol}
                  className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{company.symbol}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {company.name} · {advancing ? company.nextLabel : company.latestLabel}
                      {divisor > 0 && ` · ${divisor.toLocaleString()} shares`}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {company.inBaseline && (
                      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Checkbox
                          checked={row.advance}
                          onCheckedChange={(checked) =>
                            setRow(company.symbol, { advance: checked === true })
                          }
                        />
                        Advance
                      </label>
                    )}
                    <div className="w-32">
                      <Label htmlFor={`value-${company.symbol}`} className="sr-only">
                        {company.symbol} company value
                      </Label>
                      <Input
                        id={`value-${company.symbol}`}
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="Value ($)"
                        value={row.value}
                        autoComplete={AC.off}
                        onChange={(event) =>
                          setRow(company.symbol, { value: event.target.value })
                        }
                      />
                    </div>
                    <div className="w-24 text-right text-xs">
                      {impliedPrice !== null && (
                        <span className="text-muted-foreground">
                          ${impliedPrice.toFixed(2)}/sh
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || filled.length === 0}>
              {saving
                ? "Saving…"
                : `Save ${filled.length || ""} ${
                    filled.length === 1 ? "company" : "companies"
                  }`.trim()}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
