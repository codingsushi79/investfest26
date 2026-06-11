import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Privacy Policy</h1>
        <Link href="/" className={buttonVariants({ variant: "outline", size: "sm" })}>
          Back home
        </Link>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-normal text-muted-foreground">
            Last updated:{" "}
            {new Date().toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none text-foreground dark:prose-invert">
          <p>
            We collect account information you provide (username, email, password hash)
            to operate the trading simulation.
          </p>
          <p>
            Email addresses are used for verification and password recovery when enabled.
            We do not sell your personal information.
          </p>
          <p>
            Trading activity is stored to power portfolios and leaderboards during the
            event.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
