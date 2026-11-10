"use server";

import { redirect } from "next/navigation";
import { googleScopes } from "@/config/app";
import { serverEnv } from "@/lib/env/server";
import { createClient } from "@/lib/supabase/server";
import { AUTH_CALLBACK_PATH, LOGIN_PATH } from "./routes";

export async function signInWithGoogle() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: new URL(AUTH_CALLBACK_PATH, serverEnv().APP_BASE_URL).toString(),
      // Basic scopes only (hard rule 8). gmail.send comes later, on first send.
      scopes: googleScopes.SIGN_IN.join(" "),
    },
  });

  if (error || !data.url) {
    redirect(`${LOGIN_PATH}?error=signin`);
  }
  redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(LOGIN_PATH);
}
