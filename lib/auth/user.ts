import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LOGIN_PATH } from "./routes";

export type CurrentUser = {
  id: string;
  email: string | null;
  name: string | null;
};

/** Returns the signed-in user, or sends the visitor to the login page. */
export async function requireUser(): Promise<CurrentUser> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(LOGIN_PATH);
  }

  const metadata = user.user_metadata as { full_name?: string; name?: string };
  return {
    id: user.id,
    email: user.email ?? null,
    name: metadata.full_name ?? metadata.name ?? null,
  };
}
