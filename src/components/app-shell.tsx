"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  Briefcase,
  Building2,
  Coins,
  Handshake,
  LayoutDashboard,
  LineChart,
  LogOut,
  Menu,
  Store,
  User,
  Users,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { appConfig, authConfig, featuresConfig } from "@/lib/config";
import { cn } from "@/lib/utils";

type ShellUser = {
  id: string;
  username: string;
  name: string | null;
  balance: number;
} | null;

type NavLink = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  feature?: keyof typeof featuresConfig;
  operatorOnly?: boolean;
};

const navLinks: NavLink[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/trade", label: "Trade", icon: Store, feature: "trading" },
  { href: "/offers", label: "Offers", icon: Handshake, feature: "offers" },
  { href: "/memecoins", label: "Memecoins", icon: Coins, feature: "memecoins" },
  { href: "/firms", label: "Firms", icon: Briefcase, feature: "firms" },
  { href: "/leaderboard", label: "Leaderboard", icon: BarChart3, feature: "leaderboard" },
  { href: "/portfolios", label: "Portfolios", icon: Users, feature: "portfolios" },
  { href: "/profile", label: "Profile", icon: User, feature: "userProfiles" },
  {
    href: "/company-values",
    label: "Company values",
    icon: Building2,
    feature: "companyValues",
    operatorOnly: true,
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavItems({
  pathname,
  user,
  isOperator,
  onNavigate,
}: {
  pathname: string;
  user: ShellUser;
  isOperator: boolean;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-1">
      {navLinks.map((link) => {
        if (link.feature && !featuresConfig[link.feature]) return null;
        if (link.operatorOnly && !isOperator) return null;
        if (!user && link.href !== "/") return null;

        const Icon = link.icon;
        const active = isActive(pathname, link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="size-4" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

function SignOutButton({ className }: { className?: string }) {
  return (
    <form action="/api/auth/signout" method="post" className={className}>
      <Button type="submit" variant="outline" size="sm" className="w-full">
        <LogOut data-icon="inline-start" />
        Sign out
      </Button>
    </form>
  );
}

export function AppShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: ShellUser;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const isOperator = user?.username === authConfig.operatorUsername;

  if (!user) {
    return (
      <div className="flex min-h-full flex-col">
        <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <LineChart className="size-4" />
              </span>
              {appConfig.title}
            </Link>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button size="sm" onClick={() => router.push("/signin")}>
                Sign in
              </Button>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-10 lg:px-8">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col lg:flex-row">
      <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] lg:hidden">
        <Link href="/" className="min-w-0 truncate text-sm font-semibold tracking-tight">
          {appConfig.title}
        </Link>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              render={<Button variant="ghost" size="icon-sm" aria-label="Open menu" />}
            >
              <Menu className="size-5" />
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetHeader className="border-b border-border p-4">
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-6 p-4">
                <NavItems
                  pathname={pathname}
                  user={user}
                  isOperator={isOperator}
                  onNavigate={() => setOpen(false)}
                />
                <div className="mt-auto border-t border-border pt-4">
                  <div className="mb-3 flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>
                        {user.name?.charAt(0) ?? user.username.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{user.username}</p>
                      {isOperator && (
                        <Badge variant="secondary" className="mt-1">
                          Operator
                        </Badge>
                      )}
                    </div>
                  </div>
                  <SignOutButton />
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <aside className="hidden border-r border-border bg-card lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col gap-6 p-6">
          <div>
            <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <LineChart className="size-4" />
              </span>
              {appConfig.title}
            </Link>
            <p className="mt-1 text-sm text-muted-foreground">Virtual stock trading</p>
          </div>

          <NavItems pathname={pathname} user={user} isOperator={isOperator} />

          <div className="mt-auto flex flex-col gap-3 border-t border-border pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>
                    {user.name?.charAt(0) ?? user.username.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{user.username}</p>
                  <p className="text-xs text-muted-foreground">
                    ${user.balance.toFixed(2)} cash
                  </p>
                </div>
              </div>
              <ThemeToggle />
            </div>
            <SignOutButton />
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
