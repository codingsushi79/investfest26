"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { TiltButton } from "@/components/TiltButton";

export function ForgotPasswordForm({ defaultEmail = "" }: { defaultEmail?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState(defaultEmail);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Could not send reset code");
        return;
      }

      setSuccess(data.success || "Reset code sent.");
      setTimeout(() => {
        router.push(`/reset-password?email=${encodeURIComponent(email)}`);
      }, 1500);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 px-4">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-slate-200/60 bg-white/80 backdrop-blur-md p-8 shadow-xl">
        <div className="space-y-3 text-center">
          <h1 className="text-2xl font-bold text-slate-900">Forgot your password?</h1>
          <p className="text-slate-600">
            Enter your email and we&apos;ll send a 6-digit code to reset your password.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="reset-email" className="block text-sm font-semibold text-slate-700 mb-2">
              Email
            </label>
            <input
              id="reset-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="block w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              required
            />
          </div>

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
            disabled={loading}
            className="flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Sending..." : "Send reset code"}
          </TiltButton>
        </form>

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
