export default function DDoSBlockedPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 px-4">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-2xl font-semibold">Too many requests</h1>
        <p className="text-sm text-slate-300">
          We&apos;re seeing an unusually high number of requests from your connection.
          Please slow down for a minute and then try again.
        </p>
        <p className="text-xs text-slate-500">
          If you believe this is a mistake, wait a bit and refresh the page.
        </p>
      </div>
    </main>
  );
}