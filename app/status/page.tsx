"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Clock, CheckCircle, AlertCircle, XCircle } from "lucide-react";

interface ReportStatus {
  publicId: string;
  status: string;
  incidentType: string;
  severityLevel: string;
  submittedAt: string;
  resolvedAt?: string;
}

const statusIcons = {
  RECEIVED: <Clock className="w-5 h-5 text-blue-600" />,
  UNDER_REVIEW: <AlertCircle className="w-5 h-5 text-yellow-600" />,
  VERIFIED: <AlertCircle className="w-5 h-5 text-orange-600" />,
  RESOLVED: <CheckCircle className="w-5 h-5 text-green-600" />,
  CLOSED: <XCircle className="w-5 h-5 text-gray-600" />,
};

const statusText = {
  RECEIVED: "Report received, awaiting review",
  UNDER_REVIEW: "Being investigated by HSSE team",
  VERIFIED: "Incident verified, planning actions",
  RESOLVED: "Incident resolved, actions taken",
  CLOSED: "Case closed, all follow-ups complete",
};

const severityColors = {
  LOW: "bg-green-100 text-green-800",
  MEDIUM: "bg-yellow-100 text-yellow-800", 
  HIGH: "bg-orange-100 text-orange-800",
  CRITICAL: "bg-red-100 text-red-800",
};

export default function StatusPage() {
  const searchParams = useSearchParams();
  const [publicId, setPublicId] = useState("");
  const [report, setReport] = useState<ReportStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const id = searchParams.get('id');
    if (id) {
      setPublicId(id);
      searchReport(id);
    }
  }, [searchParams]);

  const searchReport = async (id: string) => {
    setLoading(true);
    setError("");
    setReport(null);

    try {
      const response = await fetch(`/api/reports?publicId=${encodeURIComponent(id.trim())}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Report not found");
      }

      setReport(data);
    } catch (err: any) {
      setError(err.message || "Failed to fetch report");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicId.trim()) return;
    searchReport(publicId);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="text-xl font-bold text-gray-900">
              Minerva
            </Link>
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

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Check Report Status</h1>
          <p className="text-gray-600">
            Enter your reference ID to check progress.
          </p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              Report Lookup
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="space-y-4">
              <div>
                <Label htmlFor="publicId">Reference ID</Label>
                <Input
                  id="publicId"
                  placeholder="HSSE-1234567890-ABC123"
                  value={publicId}
                  onChange={(e) => setPublicId(e.target.value)}
                  className="font-mono"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              <Button type="submit" disabled={loading || !publicId.trim()}>
                {loading ? "Searching..." : "Check Status"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {report && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Report Status</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${severityColors[report.severityLevel as keyof typeof severityColors]}`}>
                  {report.severityLevel}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  {statusIcons[report.status as keyof typeof statusIcons]}
                  <span className="font-medium text-lg">{report.status.replace('_', ' ')}</span>
                </div>
                <p className="text-gray-600">
                  {statusText[report.status as keyof typeof statusText]}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm font-medium text-gray-700">Reference ID</p>
                  <p className="font-mono text-sm">{report.publicId}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-700">Type</p>
                  <p className="text-sm">{report.incidentType.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-700">Submitted</p>
                  <p className="text-sm">{new Date(report.submittedAt).toLocaleString()}</p>
                </div>

                {report.resolvedAt && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">Resolved</p>
                    <p className="text-sm">{new Date(report.resolvedAt).toLocaleString()}</p>
                  </div>
                )}
              </div>

              {report.status === 'RESOLVED' || report.status === 'CLOSED' ? (
                <div className="bg-green-50 border border-green-200 rounded-md p-4">
                  <h3 className="font-medium text-green-900 mb-1">Complete</h3>
                  <p className="text-green-800 text-sm">
                    The incident has been addressed and necessary actions implemented.
                  </p>
                </div>
              ) : (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <h3 className="font-medium text-blue-900 mb-1">In Progress</h3>
                  <p className="text-blue-800 text-sm">
                    Your report is being reviewed. Status will be updated as we progress.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="mt-8 text-center">
          <Link href="/submit">
            <Button variant="outline">Submit Another Report</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}