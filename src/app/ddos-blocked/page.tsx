import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DDoSBlockedPage() {
  return (
    <div className="flex min-h-full items-center justify-center p-4">
      <Card className="max-w-md text-center">
        <CardHeader>
          <CardTitle>Too many requests</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            We&apos;re seeing an unusually high number of requests from your connection.
            Please wait a minute and try again.
          </p>
          <p className="text-xs">If this persists, refresh the page after a short break.</p>
        </CardContent>
      </Card>
    </div>
  );
}
