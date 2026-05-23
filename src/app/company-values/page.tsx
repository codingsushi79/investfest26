"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCompanyValues();
  }, []);

  const fetchCompanyValues = async () => {
    try {
      const response = await fetch("/api/company-values");
      if (response.ok) {
        const data = await response.json();
        setCompanyValues(data);
      } else {
        setError("Failed to load company values");
      }
    } catch (error) {
      console.error("Failed to fetch company values:", error);
      setError("Failed to load company values");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
        <div className="text-center py-12">
          <div className="text-red-600 text-lg font-semibold mb-2">Error</div>
          <div className="text-zinc-600">{error}</div>
        </div>
      </div>
    );
  }

  const totalCompanyValue = companyValues.reduce(
    (sum, company) => sum + company.companyValue,
    0
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">Company Values</h1>
          <p className="text-zinc-600 mt-1">
            Each period the operator sets a company value. Share price = company value ÷
            shares invested. Popular companies can be worth $20k+ while others may be $100–200.
          </p>
        </div>
        <Link
          href="/"
          className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 transition-colors"
        >
          ← Back to Dashboard
        </Link>
      </div>

      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
        <div className="text-center">
          <div className="text-2xl font-bold mb-2">Total Company Value</div>
          <div className="text-4xl font-extrabold">${totalCompanyValue.toFixed(2)}</div>
          <div className="text-blue-100 mt-2">Across all companies (shares invested × share price)</div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-zinc-200 overflow-hidden">
        <table className="min-w-full divide-y divide-zinc-200">
          <thead className="bg-zinc-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Company
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Period
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Shares Invested
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Share Price
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Company Value
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-zinc-200">
            {companyValues.map((company) => (
              <tr key={company.symbol} className="hover:bg-zinc-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-zinc-900">{company.name}</div>
                  <div className="text-xs font-semibold text-indigo-600">{company.symbol}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-zinc-900">{company.latestPeriod ?? "Y0 Q4"}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-zinc-900">
                    {company.sharesInvested.toLocaleString()}
                    {company.inBaseline ? (
                      <span className="ml-2 text-xs text-blue-600">100 baseline in Y0 Q4</span>
                    ) : null}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-zinc-900">${company.sharePrice.toFixed(2)}</div>
                  {!company.inBaseline && (company.sharesAtLastUpdate ?? 0) > 0 ? (
                    <div className="text-xs text-zinc-500">
                      ${company.operatorCompanyValue.toFixed(0)} ÷ {company.sharesAtLastUpdate} at {company.latestPeriod}
                    </div>
                  ) : null}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-semibold text-green-600">
                    ${company.companyValue.toFixed(2)}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg p-4 border border-zinc-200">
          <div className="text-2xl font-bold text-zinc-900">{companyValues.length}</div>
          <div className="text-sm text-zinc-600">Companies</div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-zinc-200">
          <div className="text-2xl font-bold text-zinc-900">
            {companyValues.reduce((sum, c) => sum + c.sharesInvested, 0).toLocaleString()}
          </div>
          <div className="text-sm text-zinc-600">Total Shares Invested</div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-zinc-200">
          <div className="text-2xl font-bold text-zinc-900">
            ${(totalCompanyValue / companyValues.reduce((sum, c) => sum + c.sharesInvested, 0) || 0).toFixed(2)}
          </div>
          <div className="text-sm text-zinc-600">Weighted Avg Share Price</div>
        </div>
      </div>
    </div>
  );
}
