import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth-utils";
import { AuthForm } from "@/components/AuthForm";

export default async function SignInPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");

  return (
    <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
      <Suspense>
        <AuthForm />
      </Suspense>
    </div>
  );
}
