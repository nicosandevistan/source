import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { signInWithGoogle } from "@/lib/auth/actions";

export const metadata = { title: "Sign in · Common Thread" };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-6 py-16">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="text-sm text-neutral-600">
          Common Thread only asks Google for your name and email address. It
          cannot read your inbox.
        </p>
      </div>
      <Suspense fallback={null}>
        <SignInError searchParams={searchParams} />
      </Suspense>
      <form action={signInWithGoogle}>
        <Button type="submit" size="lg" className="w-full">
          Sign in with Google
        </Button>
      </form>
    </main>
  );
}

async function SignInError({
  searchParams,
}: Pick<PageProps<"/login">, "searchParams">) {
  const { error } = await searchParams;
  if (!error) return null;
  return (
    <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
      Sign-in did not finish. Please try again.
    </p>
  );
}
