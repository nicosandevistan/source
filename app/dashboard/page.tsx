import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth/actions";
import { requireUser } from "@/lib/auth/user";

export const metadata = { title: "Dashboard · Common Thread" };

export default function DashboardPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-8">
      <header className="flex items-center justify-between gap-4 border-b border-neutral-200 pb-4">
        <span className="font-semibold">Common Thread</span>
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
      <main className="flex flex-1 flex-col items-center justify-center gap-2 py-16 text-center">
        <h1 className="text-xl font-semibold">Nothing here yet</h1>
        <p className="max-w-sm text-sm text-neutral-600">
          Your contacts, drafts and next actions will show up here once you
          build your profile.
        </p>
      </main>
    </div>
  );
}

async function SignedInAs() {
  const user = await requireUser();
  return (
    <span className="truncate text-sm text-neutral-600">
      {user.name ?? user.email}
    </span>
  );
}
