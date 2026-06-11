"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const RESEND_COOLDOWN_SEC = 30;

function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  return `${local.slice(0, 1)}***@${domain}`;
}

export function VerifyEmailForm({ email }: { email: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const lastSubmittedCode = useRef("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN_SEC);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setInterval(() => {
      setResendCooldown((s) => Math.max(0, s - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  useEffect(() => {
    if (code.length === 6 && !loading && code !== lastSubmittedCode.current) {
      lastSubmittedCode.current = code;
      formRef.current?.requestSubmit();
    }
  }, [code, loading]);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Verification failed");
        lastSubmittedCode.current = "";
        return;
      }
      setSuccess(data.success || "Email verified!");
      setTimeout(() => router.push("/signin?verified=1"), 1000);
    } catch {
      setError("Network error. Please try again.");
      lastSubmittedCode.current = "";
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (resendCooldown > 0 || resendLoading) return;
    setResendLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Could not resend code");
        return;
      }
      setSuccess(data.success || "Code sent!");
      setResendCooldown(RESEND_COOLDOWN_SEC);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setResendLoading(false);
    }
  }

  if (!email) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle>Missing email</CardTitle>
          <CardDescription>Start from sign up to verify your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/signin" className="text-sm text-primary hover:underline">
            Back to sign in
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Mail className="size-6" />
        </div>
        <CardTitle>Verify your email</CardTitle>
        <CardDescription>Code sent to {maskEmail(email)}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form ref={formRef} onSubmit={handleVerify}>
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            placeholder="000000"
            autoFocus
            disabled={loading}
            className={cn(
              "h-16 text-center font-mono text-3xl tracking-[0.35em]",
              "placeholder:tracking-[0.35em]"
            )}
            required
          />
        </form>

        {error && (
          <p className="text-sm text-destructive text-center">{error}</p>
        )}
        {success && (
          <p className="text-sm text-primary text-center">{success}</p>
        )}

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleResend}
          disabled={resendCooldown > 0 || resendLoading}
          className="text-muted-foreground"
        >
          {resendLoading
            ? "Sending…"
            : resendCooldown > 0
              ? `Resend in ${resendCooldown}s`
              : "Resend code"}
        </Button>

        <Link href="/signin" className="text-center text-sm text-muted-foreground hover:text-primary">
          Back to sign in
        </Link>
      </CardContent>
    </Card>
  );
}
