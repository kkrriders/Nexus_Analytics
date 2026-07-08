import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const PUBLIC_PATHS = ["/login", "/forgot-password", "/reset-password"];

// Every route in this app is the admin console except the auth-adjacent pages above.
function isAdminConsolePath(pathname: string) {
  return !PUBLIC_PATHS.includes(pathname);
}

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAdminPath = isAdminConsolePath(pathname);

  let supabaseResponse = NextResponse.next({ request });

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            supabaseResponse = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options),
            );
          },
        },
      },
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user && isAdminPath) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (user && isAdminPath) {
      const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
      if (profile?.role !== "admin") {
        return NextResponse.redirect(new URL(`${APP_URL}/dashboard`, request.url));
      }
    }

    return supabaseResponse;
  } catch (error) {
    console.error("Supabase middleware error:", error);
    // Fail closed: this entire app is admin-only, so on any Supabase error
    // (misconfig, transient outage) send to /login rather than 500ing —
    // never grant access when we can't verify who the user is.
    if (PUBLIC_PATHS.includes(pathname)) {
      return NextResponse.next({ request });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }
}
