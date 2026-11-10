import { NextResponse, type NextRequest } from "next/server";
import { LOGIN_PATH, safeNextPath } from "@/lib/auth/routes";
import { createClient } from "@/lib/supabase/server";

/** Google sends the user back here; trade the code for a session. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(
        new URL(safeNextPath(searchParams.get("next")), origin),
      );
    }
  }

  return NextResponse.redirect(new URL(`${LOGIN_PATH}?error=signin`, origin));
}
