"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

export function OperatorValueDialog({
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
  const [operatorCompany, setOperatorCompany] = useState("");
  const [operatorCompanyValue, setOperatorCompanyValue] = useState("");
  const [advancePeriod, setAdvancePeriod] = useState(false);
  const [updating, setUpdating] = useState(false);

  const selectedCompany = companies.find((c) => c.symbol === operatorCompany);
  const isAdvancing = selectedCompany
    ? !selectedCompany.inBaseline || advancePeriod
    : false;
  const divisor = selectedCompany
    ? isAdvancing
      ? selectedCompany.actualShares
      : selectedCompany.valuationShares
    : 0;
  const parsedValue = parseFloat(operatorCompanyValue);
  const impliedPrice =
    divisor > 0 && !isNaN(parsedValue) && parsedValue > 0
      ? parsedValue / divisor
      : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!operatorCompany || !operatorCompanyValue || !selectedCompany) return;

    if (isNaN(parsedValue) || parsedValue <= 0) {
      toast.error("Enter a valid company value greater than 0");
      return;
    }

    if (isAdvancing && selectedCompany.actualShares <= 0) {
      toast.error("Students must own shares before advancing past Y0 Q4");
      return;
    }

    setUpdating(true);
    try {
      const response = await fetch("/api/admin/update-prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([
          {
            symbol: operatorCompany,
            label: isAdvancing ? selectedCompany.nextLabel : selectedCompany.latestLabel,
            companyValue: parsedValue,
            advancePeriod: isAdvancing,
          },
        ]),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Update failed");
      }

      toast.success("Company value updated");
      onOpenChange(false);
      setOperatorCompany("");
      setOperatorCompanyValue("");
      setAdvancePeriod(false);
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
    } finally {
      setUpdating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Set company value</DialogTitle>
          <DialogDescription>
            Share price = company value ÷ shares invested. During Y0 Q4 portfolios stay at $100/share.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Company</Label>
            <Select
              value={operatorCompany}
              onValueChange={(value) => {
                if (value) {
                  setOperatorCompany(value);
                  setAdvancePeriod(false);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a company" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((company) => (
                  <SelectItem key={company.symbol} value={company.symbol}>
                    {company.symbol} — {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="company-value">Company value ($)</Label>
            <Input
              id="company-value"
              type="number"
              step="0.01"
              min="0.01"
              value={operatorCompanyValue}
              onChange={(e) => setOperatorCompanyValue(e.target.value)}
              placeholder="e.g. 20000"
              autoComplete={AC.off}
              required
            />
          </div>

          {selectedCompany && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm space-y-2">
              <p className="font-medium">
                {selectedCompany.inBaseline && !advancePeriod
                  ? `Updating ${selectedCompany.latestLabel} setup`
                  : `Advancing to ${selectedCompany.nextLabel}`}
              </p>
              <p className="text-muted-foreground">
                Shares for this update:{" "}
                <strong>
                  {isAdvancing
                    ? selectedCompany.actualShares.toLocaleString()
                    : `${selectedCompany.valuationShares} (baseline)`}
                </strong>
              </p>
              {impliedPrice !== null && (
                <p>
                  New share price: <strong>${impliedPrice.toFixed(2)}</strong>
                </p>
              )}
              {selectedCompany.inBaseline && (
                <label className="flex items-start gap-2 pt-1">
                  <input
                    type="checkbox"
                    checked={advancePeriod}
                    onChange={(e) => setAdvancePeriod(e.target.checked)}
                    className="mt-1"
                  />
                  <span>Advance to {selectedCompany.nextLabel} and move portfolio values</span>
                </label>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                updating ||
                !operatorCompany ||
                !operatorCompanyValue ||
                (isAdvancing && (selectedCompany?.actualShares ?? 0) <= 0)
              }
            >
              {updating ? "Updating…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
