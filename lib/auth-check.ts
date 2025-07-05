import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function checkAuthSession(requiredRole?: string) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return { authorized: false, error: "Unauthorized", status: 401 };
    }

    const userRole = (session.user as any)?.role;
    
    if (requiredRole && userRole !== requiredRole) {
      return { authorized: false, error: "Insufficient permissions", status: 403 };
    }

    return { authorized: true, session, userRole };
  } catch (error) {
    console.error("Auth check error:", error);
    return { authorized: false, error: "Authentication error", status: 500 };
  }
}