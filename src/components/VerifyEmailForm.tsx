"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { TiltButton } from "@/components/TiltButton";

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
      setResendCooldown((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  useEffect(() => {
    if (code.length === 6 && !loading && code !== lastSubmittedCode.current) {
      lastSubmittedCode.current = code;
      formRef.current?.requestSubmit();
    }
  }, [code, loading]);

  const handleCodeChange = (value: string) => {
    setCode(value.replace(/\D/g, "").slice(0, 6));
    setError("");
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
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
      setTimeout(() => {
        router.push("/signin?verified=1");
      }, 1000);
    } catch {
      setError("Network error. Please try again.");
      lastSubmittedCode.current = "";
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || resendLoading) return;
    setResendLoading(true);
    setError("");
    setSuccess("");

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
  };

  if (!email) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 px-4">
        <div className="w-full max-w-md space-y-6 rounded-2xl border border-slate-200/60 bg-white/80 backdrop-blur-md p-8 shadow-xl text-center">
          <h1 className="text-2xl font-bold text-slate-900">Missing email</h1>
          <p className="text-slate-600">
            Start from sign up or sign in to verify your account.
          </p>
          <Link
            href="/signin"
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 px-4">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-slate-200/60 bg-white/80 backdrop-blur-md p-8 shadow-xl">
        <div className="space-y-3 text-center">
          <h1 className="text-2xl font-bold text-slate-900">Enter your code</h1>
          <p className="text-slate-600">Sent to {maskEmail(email)}</p>
        </div>

        <form ref={formRef} onSubmit={handleVerify} className="space-y-5">
          <input type="hidden" name="email" value={email} />
          <input
            id="verify-code"
            name="code"
            value={code}
            onChange={(e) => handleCodeChange(e.target.value)}
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            placeholder="000000"
            autoFocus
            disabled={loading}
            className="block w-full rounded-lg border border-slate-300 px-4 py-6 text-center font-mono text-3xl font-semibold tracking-[0.35em] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50"
            required
          />

          {loading && (
            <p className="text-center text-sm text-slate-500">Verifying...</p>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-4">
              <p className="text-sm text-red-800 font-medium">{error}</p>
            </div>
          )}

          {success && (
            <div className="rounded-lg bg-green-50 border border-green-200 p-4">
              <p className="text-sm text-green-800 font-medium">{success}</p>
            </div>
          )}

          <TiltButton
            type="submit"
            disabled={loading || code.length !== 6}
            className="flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Verifying..." : "Verify email"}
          </TiltButton>
        </form>

        <button
          type="button"
          onClick={handleResend}
          disabled={resendCooldown > 0 || resendLoading}
          className="w-full text-sm text-slate-600 hover:text-blue-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {resendLoading
            ? "Sending..."
            : resendCooldown > 0
              ? `Resend code in ${resendCooldown}s`
              : "Resend code"}
        </button>

        <div className="text-center pt-4 border-t border-slate-200">
          <Link
            href="/signin"
            className="text-sm text-slate-600 hover:text-blue-600 font-medium"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
