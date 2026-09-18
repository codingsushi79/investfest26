import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { PieChart } from "lucide-react";

type HoldingRow = {
  symbol: string;
  name: string;
  shares: number;
  latestPrice: number;
  value: number;
};

type CryptoRow = {
  cryptoId: string;
  symbol: string;
  units: number;
  price: number;
  value: number;
};

type FirmStakeRow = {
  firmId: string;
  name: string;
  slug: string;
  units: number;
  value: number;
  isManager: boolean;
};

/** Coin amounts are fractional; trim the noise without hiding small bags. */
function formatUnits(units: number) {
  return units >= 1
    ? units.toLocaleString(undefined, { maximumFractionDigits: 2 })
    : units.toFixed(4);
}

function formatPrice(price: number) {
  return price >= 1 ? `$${price.toFixed(2)}` : `$${price.toFixed(4)}`;
}

/**
 * Everything the user owns: shares, coins and stakes in firms. They are all
 * holdings, so they belong in one table rather than only counting toward the
 * portfolio total.
 */
export function PortfolioTable({
  rows,
  crypto = [],
  firmStakes = [],
}: {
  rows: HoldingRow[];
  crypto?: CryptoRow[];
  firmStakes?: FirmStakeRow[];
}) {
  if (rows.length === 0 && crypto.length === 0 && firmStakes.length === 0) {
    return (
      <EmptyState
        icon={PieChart}
        title="No holdings yet"
        description="Buy shares from the trade page to build your portfolio."
        action={{ href: "/trade", label: "Start trading" }}
      />
    );
  }

  return (
    <div className="rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Holding</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="text-right">Value</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={`stock-${row.symbol}`}>
              <TableCell>
                <div className="font-medium">{row.symbol}</div>
                <div className="text-xs text-muted-foreground">{row.name}</div>
              </TableCell>
              <TableCell className="text-right">{row.shares}</TableCell>
              <TableCell className="text-right">
                ${row.latestPrice.toFixed(2)}
              </TableCell>
              <TableCell className="text-right font-medium">
                ${row.value.toFixed(2)}
              </TableCell>
            </TableRow>
          ))}

          {crypto.map((coin) => (
            <TableRow key={`crypto-${coin.cryptoId}`}>
              <TableCell>
                <div className="flex items-center gap-2 font-medium">
                  ${coin.symbol}
                  <Badge variant="outline" className="text-xs">
                    crypto
                  </Badge>
                </div>
              </TableCell>
              <TableCell className="text-right">{formatUnits(coin.units)}</TableCell>
              <TableCell className="text-right">{formatPrice(coin.price)}</TableCell>
              <TableCell className="text-right font-medium">
                ${coin.value.toFixed(2)}
              </TableCell>
            </TableRow>
          ))}

          {firmStakes.map((stake) => (
            <TableRow key={`firm-${stake.firmId}`}>
              <TableCell>
                <div className="flex items-center gap-2 font-medium">
                  <Link href={`/firms/${stake.slug}`} className="hover:underline">
                    {stake.name}
                  </Link>
                  <Badge variant="outline" className="text-xs">
                    {stake.isManager ? "your firm" : "firm"}
                  </Badge>
                </div>
              </TableCell>
              <TableCell className="text-right">
                {formatUnits(stake.units)} units
              </TableCell>
              <TableCell className="text-right text-muted-foreground">—</TableCell>
              <TableCell className="text-right font-medium">
                ${stake.value.toFixed(2)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
