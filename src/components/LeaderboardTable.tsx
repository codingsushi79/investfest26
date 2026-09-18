"use client";

import { useEffect, useState } from "react";
import { Medal } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type LeaderRow = {
  name: string | null;
  username?: string;
  balance: number;
  invested: number;
  portfolioValue: number;
  holdings: { symbol: string; shares: number; value: number }[];
  crypto?: { symbol: string; units: number; value: number }[];
  firmStakes?: {
    firmId: string;
    name: string;
    value: number;
    isManager: boolean;
  }[];
};

export function LeaderboardTable({ rows }: { rows: LeaderRow[] }) {
  const [tradingEnded, setTradingEnded] = useState(false);

  useEffect(() => {
    setTradingEnded(localStorage.getItem("tradingEnded") === "true");
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "tradingEnded") setTradingEnded(e.newValue === "true");
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return (
    <div className="rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">Rank</TableHead>
            <TableHead>Trader</TableHead>
            <TableHead className="text-right">Portfolio</TableHead>
            <TableHead className="text-right">Cash</TableHead>
            <TableHead>Holdings</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, idx) => (
            <TableRow
              key={`${row.username}-${idx}`}
              className={cn(
                tradingEnded && idx === 0 && "bg-primary/5",
                tradingEnded && idx === 1 && "bg-muted/50",
                tradingEnded && idx === 2 && "bg-primary/5"
              )}
            >
              <TableCell className="font-semibold">
                {tradingEnded && idx < 3 ? (
                  <Medal className={cn("size-4", idx === 0 && "text-amber-500", idx === 1 && "text-zinc-400", idx === 2 && "text-amber-700")} />
                ) : (
                  idx + 1
                )}
              </TableCell>
              <TableCell>
                <div className="font-medium">{row.name || row.username}</div>
                {row.name && row.username && (
                  <div className="text-xs text-muted-foreground">@{row.username}</div>
                )}
              </TableCell>
              <TableCell className="text-right">
                <div className="font-semibold text-primary">
                  ${row.portfolioValue.toFixed(2)}
                </div>
                <div className="text-xs text-muted-foreground">
                  ${row.invested.toFixed(2)} invested
                </div>
              </TableCell>
              <TableCell className="text-right">${row.balance.toFixed(2)}</TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {row.holdings.length === 0 &&
                  (row.crypto?.length ?? 0) === 0 &&
                  (row.firmStakes?.length ?? 0) === 0 ? (
                    <span className="text-xs text-muted-foreground">No positions</span>
                  ) : (
                    <>
                      {row.holdings.map((h) => (
                        <Badge key={h.symbol} variant="secondary" className="text-xs">
                          {h.symbol} ×{h.shares}
                        </Badge>
                      ))}
                      {row.crypto?.map((coin) => (
                        <Badge
                          key={coin.symbol}
                          variant="outline"
                          className="text-xs text-amber-600 dark:text-amber-500"
                        >
                          ${coin.symbol} ×{coin.units.toLocaleString()}
                        </Badge>
                      ))}
                      {row.firmStakes?.map((stake) => (
                        <Badge
                          key={stake.firmId}
                          variant="outline"
                          className="text-xs text-primary"
                          title={`${stake.isManager ? "Manages" : "Invested in"} ${stake.name}`}
                        >
                          {stake.isManager ? "⚑" : "▲"} {stake.name} $
                          {stake.value.toFixed(0)}
                        </Badge>
                      ))}
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
