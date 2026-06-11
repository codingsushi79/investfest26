import { ResetPasswordForm } from "@/components/ResetPasswordForm";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email = "" } = await searchParams;
  return (
    <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
      <ResetPasswordForm defaultEmail={email} />
    </div>
  );
}
