"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AC } from "@/lib/autocomplete";

export function ResetPasswordForm({ defaultEmail = "" }: { defaultEmail?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState(defaultEmail);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, password, confirmPassword }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Could not reset password");
        return;
      }
      router.push("/signin?reset=1");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend(e: React.FormEvent) {
    e.preventDefault();
    setResendLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) setError(data.error || "Could not resend code");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setResendLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="mb-2 flex size-12 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <KeyRound className="size-6" />
        </div>
        <CardTitle>Reset your password</CardTitle>
        <CardDescription>
          Enter the 6-digit code from your email and choose a new password.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <form onSubmit={handleReset} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="code">Reset code</Label>
            <Input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              autoComplete={AC.otp}
              pattern="\d{6}"
              maxLength={6}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">New password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={AC.newPassword}
              minLength={6}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="confirm">Confirm password</Label>
            <Input
              id="confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete={AC.newPassword}
              minLength={6}
              required
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Updating…" : "Update password"}
          </Button>
        </form>

        <form onSubmit={handleResend} className="border-t pt-4 flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">Need a new code?</p>
          <Button type="submit" variant="outline" disabled={resendLoading || !email}>
            {resendLoading ? "Sending…" : "Resend reset code"}
          </Button>
        </form>

        <Link href="/signin" className="text-center text-sm text-primary hover:underline">
          Back to sign in
        </Link>
      </CardContent>
    </Card>
  );
}
