import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth/actions";
import { requireUser } from "@/lib/auth/user";

export function DashboardHeader() {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 pb-4">
      <nav className="flex items-center gap-4 text-sm">
        <Link href="/dashboard" className="text-base font-semibold">
          Common Thread
        </Link>
        <Link href="/dashboard/profile" className="text-neutral-600 hover:text-neutral-900">
          Profile
        </Link>
      </nav>
      <div className="flex items-center gap-3">
        <Suspense fallback={null}>
          <SignedInAs />
        </Suspense>
        <form action={signOut}>
          <Button type="submit" variant="outline" size="sm">
            Sign out
          </Button>
        </form>
      </div>
    </header>
  );
}

async function SignedInAs() {
  const user = await requireUser();
  return (
    <span className="max-w-40 truncate text-sm text-neutral-600">{user.name ?? user.email}</span>
  );
}
