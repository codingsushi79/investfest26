import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-utils";
import { AuthForm } from "@/components/AuthForm";

export default async function SignInPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/");
  }

  return <AuthForm />;
}

