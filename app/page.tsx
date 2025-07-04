import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-semibold text-gray-900">HSSE Reporting</h1>
            <div className="flex gap-3">
              <Link href="/submit">
                <Button variant="outline">Submit Report</Button>
              </Link>
              <Link href="/login">
                <Button>Login</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-32 px-6">
        <div className="container mx-auto text-center max-w-2xl">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Health, Safety, Security & Environment
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Report incidents securely and help create a safer workplace.
          </p>
          <Link href="/submit">
            <Button size="lg" className="px-8">
              Report an Incident
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-6 px-6 mt-auto">
        <div className="container mx-auto text-center">
          <p className="text-sm text-gray-600">© 2025 HSSE Reporting System</p>
        </div>
      </footer>
    </div>
  );
}