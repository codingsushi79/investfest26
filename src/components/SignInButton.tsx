"use client";

import { signIn } from "next-auth/react";

export function SignInButton() {
  return (
    <button
      onClick={() => signIn("google")}
      className="rounded-md bg-indigo-600 px-3 py-2 font-semibold text-white hover:bg-indigo-700"
    >
      Sign in with Google
    </button>
  );
}
