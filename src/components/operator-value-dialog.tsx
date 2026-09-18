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
  const [sharePrice, setSharePrice] = useState("");
  const [advancePeriod, setAdvancePeriod] = useState(false);
  const [updating, setUpdating] = useState(false);

  const selectedCompany = companies.find((c) => c.symbol === operatorCompany);
  const isAdvancing = selectedCompany
    ? !selectedCompany.inBaseline || advancePeriod
    : false;
  // Shares outstanding no longer set the price -- they only turn it into a
  // company value for display. Matches the server's fallback when empty.
  const BASELINE_SHARES = 100;
  const shares = selectedCompany
    ? isAdvancing
      ? selectedCompany.actualShares || BASELINE_SHARES
      : selectedCompany.valuationShares
    : 0;
  const parsedPrice = parseFloat(sharePrice);
  const impliedCompanyValue =
    shares > 0 && !isNaN(parsedPrice) && parsedPrice > 0
      ? parsedPrice * shares
      : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!operatorCompany || !sharePrice || !selectedCompany) return;

    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      toast.error("Enter a share price greater than 0");
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
            pricePerShare: parsedPrice,
            advancePeriod: isAdvancing,
          },
        ]),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Update failed");
      }

      toast.success("Share price updated");
      onOpenChange(false);
      setOperatorCompany("");
      setSharePrice("");
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
          <DialogTitle>Set share price</DialogTitle>
          <DialogDescription>
            Set the price per share directly. Company value follows from it.
            During Y0 Q4 portfolios stay at $100/share until you advance.
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
            <Label htmlFor="share-price">Share price ($)</Label>
            <Input
              id="share-price"
              type="number"
              step="0.01"
              min="0.01"
              value={sharePrice}
              onChange={(e) => setSharePrice(e.target.value)}
              placeholder="e.g. 120"
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
                Shares outstanding:{" "}
                <strong>
                  {isAdvancing
                    ? selectedCompany.actualShares > 0
                      ? selectedCompany.actualShares.toLocaleString()
                      : `${BASELINE_SHARES} (nobody invested yet)`
                    : `${selectedCompany.valuationShares} (baseline)`}
                </strong>
              </p>
              {impliedCompanyValue !== null && (
                <p>
                  Company value becomes:{" "}
                  <strong>${impliedCompanyValue.toFixed(2)}</strong>
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
              disabled={updating || !operatorCompany || !sharePrice}
            >
              {updating ? "Updating…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
