import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { LOGIN_PATH } from "@/lib/auth/routes";

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-6 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Common Thread</h1>
      <p className="text-neutral-600">
        Know who to contact for recruiting. Common Thread finds the people most
        likely to reply because of a rare shared background, then helps you send
        short personal emails that you approve one by one.
      </p>
      <div>
        <Link href={LOGIN_PATH} className={buttonVariants({ size: "lg" })}>
          Get started
        </Link>
      </div>
    </main>
  );
}
