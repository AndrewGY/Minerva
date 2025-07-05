"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { 
  BarChart3, 
  FileText, 
  Users, 
  Settings, 
  Search,
  Bell,
  Home,
  Clipboard
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: BarChart3 },
  { href: "/dashboard/investigations", label: "Investigations", icon: Clipboard },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/users", label: "Users", icon: Users },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "loading") return;
    
    if (!session || (session.user as any)?.role !== "ADMIN") {
      router.push("/login");
      return;
    }
  }, [session, status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session || (session.user as any)?.role !== "ADMIN") {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-8">
              <Link href="/" className="text-xl font-bold text-gray-900">
                Minerva Dashboard
              </Link>
              
              {/* Main Navigation */}
              <div className="hidden md:flex space-x-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || 
                    (item.href === "/dashboard/investigations" && pathname.startsWith("/dashboard/investigations"));
                  
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-blue-100 text-blue-700"
                          : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Icon className="w-4 h-4" />
                        {item.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Quick Actions */}
              <Link href="/submit">
                <Button variant="outline" size="sm">
                  <FileText className="w-4 h-4 mr-1" />
                  New Report
                </Button>
              </Link>
              
              <Link href="/status">
                <Button variant="outline" size="sm">
                  <Search className="w-4 h-4 mr-1" />
                  Check Status
                </Button>
              </Link>

              {/* User Menu */}
              <div className="flex items-center space-x-3 border-l pl-4">
                <div className="text-sm">
                  <p className="text-gray-900 font-medium">{session?.user?.email}</p>
                  <p className="text-gray-500 text-xs">{(session?.user as any)?.role}</p>
                </div>
                <Link href="/api/auth/signout">
                  <Button variant="outline" size="sm">Sign Out</Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <div className="md:hidden bg-white border-b">
        <div className="container mx-auto px-4 py-2">
          <div className="flex space-x-1 overflow-x-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || 
                (item.href === "/dashboard/investigations" && pathname.startsWith("/dashboard/investigations"));
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                    isActive
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main>{children}</main>
    </div>
  );
}