import NextAuth from "next-auth";
import { authConfig } from "./app/(auth)/auth.config";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken, extractTokenFromHeader } from "./lib/auth/token";

export async function proxy(request: NextRequest) {
  const userAgent = request.headers.get("user-agent") || "";
  const isMobile = !userAgent.includes("Mozilla/");

  if (!isMobile) {
    // For web requests, let NextAuth handle it
    return NextAuth(authConfig).auth(request as any);
  }

  // Mobile-specific middleware ok
  if (request.nextUrl.pathname.startsWith("/api/chat-open")) {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: ["/", "/:id", "/api/:path*", "/login", "/register"],
};
