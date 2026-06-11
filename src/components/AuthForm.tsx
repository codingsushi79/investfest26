"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LineChart } from "lucide-react";
import { appConfig } from "@/lib/config";
import { AC } from "@/lib/autocomplete";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function AuthForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const verified = searchParams.get("verified") === "1";
  const reset = searchParams.get("reset") === "1";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(isSignUp: boolean) {
    setError("");
    setLoading(true);

    if (isSignUp && !agreeToTerms) {
      setError("You must agree to the Terms of Service and Privacy Policy.");
      setLoading(false);
      return;
    }

    try {
      const endpoint = isSignUp ? "/api/auth/signup" : "/api/auth/signin";
      const body = isSignUp
        ? { username, password, name, email }
        : { username, password };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.requiresVerification && data.email) {
          router.push(`/verify-email?email=${encodeURIComponent(data.email)}`);
          return;
        }
        setError(data.error || "An error occurred");
        return;
      }

      if (data.requiresVerification && data.email) {
        router.push(`/verify-email?email=${encodeURIComponent(data.email)}`);
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <LineChart className="size-6" />
        </div>
        <CardTitle>{appConfig.title}</CardTitle>
        <CardDescription>
          Sign in or create an account to start trading with $1,000 virtual cash.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {verified && (
          <p className="rounded-lg border border-primary/20 bg-primary/10 px-3 py-2 text-sm text-primary">
            Email verified. You can sign in now.
          </p>
        )}
        {reset && (
          <p className="rounded-lg border border-primary/20 bg-primary/10 px-3 py-2 text-sm text-primary">
            Password updated. Sign in with your new password.
          </p>
        )}
        {error && (
          <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <Tabs defaultValue="sign-in">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="sign-in">Sign in</TabsTrigger>
            <TabsTrigger value="sign-up">Sign up</TabsTrigger>
          </TabsList>

          <TabsContent value="sign-in" className="mt-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmit(false);
              }}
              className="flex flex-col gap-4"
            >
              <div className="flex flex-col gap-2">
                <Label htmlFor="sign-in-username">Username</Label>
                <Input
                  id="sign-in-username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete={AC.off}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="sign-in-password">Password</Label>
                  <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="sign-in-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={AC.currentPassword}
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Signing in…" : "Sign in"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="sign-up" className="mt-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmit(true);
              }}
              className="flex flex-col gap-4"
            >
              <div className="flex flex-col gap-2">
                <Label htmlFor="sign-up-name">Full name (optional)</Label>
                <Input
                  id="sign-up-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete={AC.off}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="sign-up-email">Email</Label>
                <Input
                  id="sign-up-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete={AC.email}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="sign-up-username">Username</Label>
                <Input
                  id="sign-up-username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete={AC.off}
                  required
                  minLength={3}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="sign-up-password">Password</Label>
                <Input
                  id="sign-up-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={AC.newPassword}
                  required
                  minLength={6}
                />
              </div>
              <label className="flex items-start gap-3 text-sm">
                <Checkbox
                  checked={agreeToTerms}
                  onCheckedChange={(checked) => setAgreeToTerms(checked === true)}
                />
                <span className="text-muted-foreground leading-relaxed">
                  I agree to the{" "}
                  <Link href="/terms-of-service" className="text-primary hover:underline" target="_blank">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy-policy" className="text-primary hover:underline" target="_blank">
                    Privacy Policy
                  </Link>
                </span>
              </label>
              <Button type="submit" disabled={loading || !agreeToTerms} className="w-full">
                {loading ? "Creating account…" : "Create account"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
