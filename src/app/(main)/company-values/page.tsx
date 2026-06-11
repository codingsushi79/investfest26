"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface CompanyValue {
  symbol: string;
  name: string;
  sharesInvested: number;
  sharePrice: number;
  operatorCompanyValue: number;
  companyValue: number;
  inBaseline?: boolean;
  latestPeriod?: string;
  sharesAtLastUpdate?: number;
}

export default function CompanyValuesPage() {
  const [companyValues, setCompanyValues] = useState<CompanyValue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/company-values")
      .then((r) => (r.ok ? r.json() : []))
      .then(setCompanyValues)
      .finally(() => setLoading(false));
  }, []);

  const total = companyValues.reduce((sum, c) => sum + c.companyValue, 0);

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Company values"
        description="Share price = company value ÷ shares invested. Popular companies can reach $20k+ while others stay near $100–200."
      />

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-muted-foreground text-sm font-medium">
            Total across all companies
          </CardTitle>
        </CardHeader>
        <CardContent className="text-3xl font-bold">${total.toFixed(2)}</CardContent>
      </Card>

      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Period</TableHead>
              <TableHead className="text-right">Shares invested</TableHead>
              <TableHead className="text-right">Share price</TableHead>
              <TableHead className="text-right">Company value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companyValues.map((company) => (
              <TableRow key={company.symbol}>
                <TableCell>
                  <div className="font-medium">{company.symbol}</div>
                  <div className="text-xs text-muted-foreground">{company.name}</div>
                </TableCell>
                <TableCell>
                  {company.latestPeriod ?? "Y0 Q4"}
                  {company.inBaseline && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      baseline
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {company.sharesInvested.toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  <div>${company.sharePrice.toFixed(2)}</div>
                  {!company.inBaseline && (company.sharesAtLastUpdate ?? 0) > 0 && (
                    <div className="text-xs text-muted-foreground">
                      ${company.operatorCompanyValue.toFixed(0)} ÷ {company.sharesAtLastUpdate}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-right font-semibold text-primary">
                  ${company.companyValue.toFixed(2)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
