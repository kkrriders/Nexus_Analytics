import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const WORKSPACE_PREFIXES = [
  "/dashboard",
  "/campaign-analytics",
  "/audience-analytics",
  "/keyword-analytics",
  "/creative-analytics",
  "/trend-forecasting",
  "/ai-recommendations",
  "/settings",
  "/plans",
];

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isWorkspacePath = WORKSPACE_PREFIXES.some((p) => pathname.startsWith(p));

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

    if (!user && isWorkspacePath) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }

    return supabaseResponse;
  } catch (error) {
    console.error("Supabase middleware error:", error);
    if (isWorkspacePath) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next({ request });
  }
}
