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

// Per-tick sigma, described by the swing it produces over an hour at the
// default 60s tick (hourly sigma = per-tick sigma x sqrt(60)).
const VOLATILITY_PRESETS = [
  { value: "0.01", label: "Stable — drifts a few % an hour" },
  { value: "0.02", label: "Normal — swings ~15% an hour" },
  { value: "0.05", label: "Degenerate — swings ~40% an hour" },
];

// A coin that reliably climbs is free money for whoever holds it, so the
// trend is deliberately a short list of mild options rather than a number box.
const TREND_PRESETS = [
  { value: "0", label: "Flat — no built-in direction" },
  { value: "2", label: "Slight climb (+2% / hour)" },
  { value: "5", label: "Bull run (+5% / hour)" },
  { value: "-2", label: "Slow bleed (-2% / hour)" },
  { value: "-5", label: "Rug pull (-5% / hour)" },
];

/**
 * Launch a coin. The operator picks its character (start price, how wild it
 * swings) but never its price — that belongs to the coin's own walk.
 */
export function MemecoinCreateDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [symbol, setSymbol] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startPrice, setStartPrice] = useState("1");
  const [volatility, setVolatility] = useState("0.02");
  const [trend, setTrend] = useState("0");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);

    try {
      const response = await fetch("/api/memecoins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol,
          name,
          description: description || undefined,
          startPrice: parseFloat(startPrice),
          volatility: parseFloat(volatility),
          trendPercentPerHour: parseFloat(trend),
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not launch coin");

      toast.success(`$${data.symbol} is live`);
      onOpenChange(false);
      setSymbol("");
      setName("");
      setDescription("");
      setStartPrice("1");
      setVolatility("0.02");
      setTrend("0");
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not launch coin");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Launch a memecoin</DialogTitle>
          <DialogDescription>
            The coin starts at your price and then moves on its own — nobody can
            set it after launch.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="coin-symbol">Ticker</Label>
              <Input
                id="coin-symbol"
                value={symbol}
                onChange={(event) => setSymbol(event.target.value.toUpperCase())}
                placeholder="DOGE"
                maxLength={10}
                autoComplete={AC.off}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="coin-price">Start price ($)</Label>
              <Input
                id="coin-price"
                type="number"
                step="0.01"
                min="0.01"
                value={startPrice}
                onChange={(event) => setStartPrice(event.target.value)}
                autoComplete={AC.off}
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="coin-name">Name</Label>
            <Input
              id="coin-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Doge Classic"
              maxLength={60}
              autoComplete={AC.off}
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="coin-description">Pitch (optional)</Label>
            <Input
              id="coin-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Much wow. No fundamentals."
              maxLength={280}
              autoComplete={AC.off}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label>Volatility</Label>
              <Select value={volatility} onValueChange={(value) => value && setVolatility(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VOLATILITY_PRESETS.map((preset) => (
                    <SelectItem key={preset.value} value={preset.value}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Trend</Label>
              <Select value={trend} onValueChange={(value) => value && setTrend(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TREND_PRESETS.map((preset) => (
                    <SelectItem key={preset.value} value={preset.value}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Where the coin leans on average. Noise still dominates minute to
                minute.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !symbol || !name}>
              {saving ? "Launching…" : "Launch"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
