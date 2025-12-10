import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth";
import Link from "next/link";

export default async function SignInPage() {
  const session = await getServerSession(authConfig);
  if (session) {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-md space-y-6 rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="space-y-2 text-center">
          <h1 className="text-xl font-semibold text-zinc-900">
            Sign in with Google
          </h1>
          <p className="text-sm text-zinc-600">
            You’ll start with $1000 virtual cash to trade the 8 companies.
          </p>
        </div>
        <form action="/api/auth/signin/google" method="post" className="space-y-3">
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-700"
          >
            Continue with Google
          </button>
        </form>
        <p className="text-center text-xs text-zinc-500">
          The operator can change prices in code; charts refresh every 15 minutes.
        </p>
        <Link href="/" className="block text-center text-sm text-indigo-700 hover:underline">
          Back to app
        </Link>
      </div>
    </div>
  );
}

