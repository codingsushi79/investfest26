import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth-utils";
import { AuthForm } from "@/components/AuthForm";

export default async function SignInPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/");
  }

  return (
    <Suspense>
      <AuthForm />
    </Suspense>
  );
}

