import { VerifyEmailForm } from "@/components/VerifyEmailForm";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email = "" } = await searchParams;
  return (
    <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
      <VerifyEmailForm email={email} />
    </div>
  );
}
