import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TermsOfServicePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Terms of Service</h1>
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
            InvestFest is a virtual stock trading simulation for educational purposes.
            No real money or securities are involved.
          </p>
          <p>
            By using this service you agree to participate fairly, not attempt to
            disrupt the platform, and follow operator instructions during live events.
          </p>
          <p>
            Accounts may be paused or banned by the operator for abuse or disruption at
            their discretion.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
