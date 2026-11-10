import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { DashboardHeader } from "./_components/header";

export const metadata = { title: "Dashboard · Common Thread" };

export default function DashboardPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-6 sm:px-6 sm:py-8">
      <DashboardHeader />
      <main className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
        <h1 className="text-xl font-semibold">Nothing here yet</h1>
        <p className="max-w-sm text-sm text-neutral-600">
          Your contacts, drafts and next actions will show up here. Start by
          building your profile.
        </p>
        <Link href="/dashboard/profile" className={buttonVariants()}>
          Build your profile
        </Link>
      </main>
    </div>
  );
}
