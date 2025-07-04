import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;
    
    // Admin routes
    if (pathname.startsWith("/admin") && (token as any).role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    
    // Officer/Supervisor routes
    if (pathname.startsWith("/dashboard") && (token as any).role === "REPORTER") {
      return NextResponse.redirect(new URL("/my-reports", req.url));
    }
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/my-reports/:path*",
  ],
};