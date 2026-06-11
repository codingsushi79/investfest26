import { ForgotPasswordForm } from "@/components/ForgotPasswordForm";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email = "" } = await searchParams;
  return (
    <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
      <ForgotPasswordForm defaultEmail={email} />
    </div>
  );
}
