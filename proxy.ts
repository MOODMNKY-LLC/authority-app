import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export async function middleware(request: NextRequest) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Public routes that don't require authentication
  const publicRoutes = ["/auth/login", "/auth/signup", "/auth/callback", "/splash"]
  const isPublicRoute = publicRoutes.some((route) => request.nextUrl.pathname.startsWith(route))

  // If user is not authenticated and trying to access protected route
  if (!user && !isPublicRoute) {
    return NextResponse.redirect(new URL("/splash", request.url))
  }

  // If user is authenticated and trying to access auth pages
  if (user && (request.nextUrl.pathname.startsWith("/auth") || request.nextUrl.pathname === "/splash")) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
