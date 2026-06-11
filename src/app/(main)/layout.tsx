import { AppShell } from "@/components/app-shell";
import { getCurrentUser } from "@/lib/auth-utils";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <AppShell
      user={
        user
          ? {
              id: user.id,
              username: user.username,
              name: user.name,
              balance: user.balance,
            }
          : null
      }
    >
      {children}
    </AppShell>
  );
}
