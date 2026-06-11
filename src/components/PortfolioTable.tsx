import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";
import { PieChart } from "lucide-react";

type HoldingRow = {
  symbol: string;
  name: string;
  shares: number;
  latestPrice: number;
  value: number;
};

export function PortfolioTable({ rows }: { rows: HoldingRow[] }) {
  if (rows.length === 0) {
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
            <TableHead>Company</TableHead>
            <TableHead className="text-right">Shares</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="text-right">Value</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.symbol}>
              <TableCell>
                <div className="font-medium">{row.symbol}</div>
                <div className="text-xs text-muted-foreground">{row.name}</div>
              </TableCell>
              <TableCell className="text-right">{row.shares}</TableCell>
              <TableCell className="text-right">${row.latestPrice.toFixed(2)}</TableCell>
              <TableCell className="text-right font-medium">
                ${row.value.toFixed(2)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
