"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, Plus } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Skeleton } from "@/components/ui/skeleton";
import { AC } from "@/lib/autocomplete";

type Firm = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  manager: { id: string; username: string; name: string | null };
  isManager: boolean;
  isOpen: boolean;
  isClosed: boolean;
  depositFeePercent: number;
  withdrawFeePercent: number;
  memberCount: number;
  nav: number;
  navPerUnit: number;
  cash: number;
  membership: {
    units: number;
    invested: number;
    value: number;
    profit: number;
  } | null;
};

export default function FirmsPage() {
  const router = useRouter();
  const [firms, setFirms] = useState<Firm[]>([]);
  const [canCreate, setCanCreate] = useState(false);
  const [maxFee, setMaxFee] = useState(10);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [fee, setFee] = useState("0");
  const [withdrawFee, setWithdrawFee] = useState("0");
  const [saving, setSaving] = useState(false);

  const fetchFirms = useCallback(async () => {
    try {
      const response = await fetch("/api/firms");
      if (response.status === 404) {
        router.replace("/");
        return;
      }
      if (response.ok) {
        const data = await response.json();
        setFirms(data.firms);
        setCanCreate(data.canCreate);
        setMaxFee(data.maxFeePercentage);
      }
    } catch (error) {
      console.error("Failed to load firms:", error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchFirms();
    const interval = setInterval(
      fetchFirms,
      Number(process.env.NEXT_PUBLIC_LIVE_REFRESH_MS || 8000)
    );
    return () => clearInterval(interval);
  }, [fetchFirms]);

  async function createFirm(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);

    try {
      const response = await fetch("/api/firms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: description || undefined,
          depositFeePercent: parseFloat(fee) || 0,
          withdrawFeePercent: parseFloat(withdrawFee) || 0,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not register firm");

      toast.success(`${data.name} is registered`);
      setCreateOpen(false);
      setName("");
      setDescription("");
      setFee("0");
      setWithdrawFee("0");
      router.push(`/firms/${data.slug}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not register firm");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Investment firms"
        description="Register a firm and invest for clients, or hand your cash to a manager you trust and share in what they make."
      >
        {canCreate && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus data-icon="inline-start" />
            Register firm
          </Button>
        )}
      </PageHeader>

      {firms.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No firms yet"
          description="Be the first to register a firm. Clients buy units in your fund and you trade the pooled capital on their behalf."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {firms.map((firm) => (
            <Card key={firm.id} className="flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg">
                    <Link href={`/firms/${firm.slug}`} className="hover:underline">
                      {firm.name}
                    </Link>
                  </CardTitle>
                  <div className="flex shrink-0 gap-1">
                    {firm.isManager && <Badge>Your firm</Badge>}
                    {firm.membership && !firm.isManager && (
                      <Badge variant="secondary">Client</Badge>
                    )}
                    {!firm.isOpen && <Badge variant="outline">Closed to new money</Badge>}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Managed by {firm.manager.username}
                  {firm.depositFeePercent > 0 &&
                    ` · ${firm.depositFeePercent}% in`}
                  {firm.withdrawFeePercent > 0 &&
                    ` · ${firm.withdrawFeePercent}% out`}
                </p>
              </CardHeader>

              <CardContent className="flex flex-1 flex-col gap-4">
                {firm.description && (
                  <p className="text-sm text-muted-foreground">{firm.description}</p>
                )}

                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground">Assets</div>
                    <div className="font-semibold">${firm.nav.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Unit price</div>
                    <div className="font-semibold">${firm.navPerUnit.toFixed(4)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Clients</div>
                    <div className="font-semibold">{firm.memberCount}</div>
                  </div>
                </div>

                {firm.membership && (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
                    Your stake: <strong>${firm.membership.value.toFixed(2)}</strong>{" "}
                    <span
                      className={
                        firm.membership.profit >= 0 ? "text-emerald-500" : "text-red-500"
                      }
                    >
                      ({firm.membership.profit >= 0 ? "+" : ""}
                      ${firm.membership.profit.toFixed(2)})
                    </span>
                  </div>
                )}

                <Link
                  href={`/firms/${firm.slug}`}
                  className="mt-auto text-sm text-primary hover:underline"
                >
                  {firm.isManager ? "Manage firm →" : "View firm →"}
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Register a firm</DialogTitle>
            <DialogDescription>
              You become the manager. Clients invest cash, you trade it, and every
              client&apos;s stake moves with the firm&apos;s performance.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={createFirm} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="firm-name">Firm name</Label>
              <Input
                id="firm-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Northside Capital"
                maxLength={60}
                autoComplete={AC.off}
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="firm-description">Pitch (optional)</Label>
              <Input
                id="firm-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Value investing, mostly."
                maxLength={280}
                autoComplete={AC.off}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="firm-fee">Deposit fee (%)</Label>
                <Input
                  id="firm-fee"
                  type="number"
                  step="0.5"
                  min="0"
                  max={maxFee}
                  value={fee}
                  onChange={(event) => setFee(event.target.value)}
                  autoComplete={AC.off}
                />
                <p className="text-xs text-muted-foreground">
                  Taken when a client puts money in.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="firm-withdraw-fee">Withdrawal fee (%)</Label>
                <Input
                  id="firm-withdraw-fee"
                  type="number"
                  step="0.5"
                  min="0"
                  max={maxFee}
                  value={withdrawFee}
                  onChange={(event) => setWithdrawFee(event.target.value)}
                  autoComplete={AC.off}
                />
                <p className="text-xs text-muted-foreground">
                  Taken when a client takes money out.
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Both fees go to you, and each can be up to {maxFee}%. You never pay
              either one on your own money.
            </p>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || !name}>
                {saving ? "Registering…" : "Register"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
