"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Search, 
  Filter, 
  AlertCircle, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Eye,
  FileText,
  Calendar,
  MapPin,
  User
} from "lucide-react";

interface Report {
  _id: string;
  publicId: string;
  incidentDate: string;
  location: {
    address: string;
  };
  incidentType: string;
  severityLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  description: string;
  status: "RECEIVED" | "UNDER_REVIEW" | "VERIFIED" | "RESOLVED" | "CLOSED";
  isAnonymous: boolean;
  reporterEmail?: string;
  attachments: any[];
  createdAt: string;
  updatedAt: string;
}

const statusIcons = {
  RECEIVED: <Clock className="w-4 h-4" />,
  UNDER_REVIEW: <AlertCircle className="w-4 h-4" />,
  VERIFIED: <AlertCircle className="w-4 h-4" />,
  RESOLVED: <CheckCircle className="w-4 h-4" />,
  CLOSED: <XCircle className="w-4 h-4" />,
};

const statusColors = {
  RECEIVED: "bg-blue-100 text-blue-800",
  UNDER_REVIEW: "bg-yellow-100 text-yellow-800",
  VERIFIED: "bg-orange-100 text-orange-800", 
  RESOLVED: "bg-green-100 text-green-800",
  CLOSED: "bg-gray-100 text-gray-800",
};

const severityColors = {
  LOW: "bg-green-100 text-green-800",
  MEDIUM: "bg-yellow-100 text-yellow-800",
  HIGH: "bg-orange-100 text-orange-800",
  CRITICAL: "bg-red-100 text-red-800",
};

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");

  useEffect(() => {
    if (status === "loading") return;
    
    if (!session || (session.user as any)?.role !== "ADMIN") {
      router.push("/login");
      return;
    }

    fetchReports();
  }, [session, status, router]);

  const fetchReports = async () => {
    try {
      const response = await fetch("/api/admin/reports");
      if (response.ok) {
        const data = await response.json();
        setReports(data.reports);
      }
    } catch (error) {
      console.error("Failed to fetch reports:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredReports = reports.filter(report => {
    const matchesSearch = report.publicId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.location.address.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || report.status === statusFilter;
    const matchesSeverity = severityFilter === "all" || report.severityLevel === severityFilter;
    
    return matchesSearch && matchesStatus && matchesSeverity;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const stats = {
    total: reports.length,
    received: reports.filter(r => r.status === "RECEIVED").length,
    underReview: reports.filter(r => r.status === "UNDER_REVIEW").length,
    critical: reports.filter(r => r.severityLevel === "CRITICAL").length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="text-xl font-bold text-gray-900">
              Minerva Admin
            </Link>
            <div className="flex gap-3">
              <span className="text-sm text-gray-600">
                Welcome, {session?.user?.email}
              </span>
              <Link href="/api/auth/signout">
                <Button variant="outline" size="sm">Sign Out</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Incident Dashboard</h1>
          <p className="text-gray-600">Manage and review all reported incidents</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Reports</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <FileText className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">New Reports</p>
                  <p className="text-3xl font-bold text-blue-600">{stats.received}</p>
                </div>
                <Clock className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Under Review</p>
                  <p className="text-3xl font-bold text-yellow-600">{stats.underReview}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Critical</p>
                  <p className="text-3xl font-bold text-red-600">{stats.critical}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <CardTitle>All Reports</CardTitle>
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search reports..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full sm:w-64"
                  />
                </div>
                
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="RECEIVED">Received</SelectItem>
                    <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
                    <SelectItem value="VERIFIED">Verified</SelectItem>
                    <SelectItem value="RESOLVED">Resolved</SelectItem>
                    <SelectItem value="CLOSED">Closed</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={severityFilter} onValueChange={setSeverityFilter}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Severity</SelectItem>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredReports.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No reports found</p>
                </div>
              ) : (
                filteredReports.map((report) => (
                  <div key={report._id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-medium text-gray-900">{report.publicId}</h3>
                          <Badge className={statusColors[report.status]}>
                            <span className="flex items-center gap-1">
                              {statusIcons[report.status]}
                              {report.status.replace('_', ' ')}
                            </span>
                          </Badge>
                          <Badge className={severityColors[report.severityLevel]}>
                            {report.severityLevel}
                          </Badge>
                        </div>
                        
                        <p className="text-gray-600 text-sm mb-3 line-clamp-2">{report.description}</p>
                        
                        <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(report.incidentDate).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {report.location.address}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {report.isAnonymous ? "Anonymous" : "Identified"}
                          </span>
                          {report.attachments.length > 0 && (
                            <span className="text-blue-600">
                              {report.attachments.length} attachment(s)
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex gap-2 ml-4">
                        <Link href={`/admin/reports/${report._id}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}