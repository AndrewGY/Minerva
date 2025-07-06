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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import AddressAutocomplete from "@/components/AddressAutocomplete";
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
  User,
  Clipboard,
  ExternalLink,
  Shield,
  Edit3
} from "lucide-react";

interface Report {
  _id: string;
  publicId: string;
  incidentDate: string;
  location: {
    address: string;
    lat?: number;
    lng?: number;
  } | string;
  incidentType: string;
  severityLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  description: string;
  status: "RECEIVED" | "UNDER_REVIEW" | "VERIFIED" | "RESOLVED" | "CLOSED";
  isAnonymous: boolean;
  reporterEmail?: string;
  attachments: any[];
  createdAt: string;
  updatedAt: string;
  source?: string;
  metadata?: {
    source?: string;
    articleUrl?: string;
    postUrl?: string;
    validationConfidence?: number;
    validationReason?: string;
    imagePaths?: string[];
  };
  isVerified?: boolean;
}

interface VerificationData {
  incidentType: string;
  severityLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  incidentDate: string;
  location: {
    address: string;
    lat?: number;
    lng?: number;
  };
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

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [verifyingReport, setVerifyingReport] = useState<Report | null>(null);
  const [verificationData, setVerificationData] = useState<VerificationData>({
    incidentType: "",
    severityLevel: "LOW",
    incidentDate: "",
    location: { address: "", lat: 0, lng: 0 }
  });
  const [isVerifying, setIsVerifying] = useState(false);
  // TODO: add better error handling later

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
      const response = await fetch("/api/dashboard/reports");
      if (response.ok) {
        const data = await response.json();
        setReports(data.reports || []);
      }
    } catch (error) {
      // probably should show user friendly error message
      console.error("Failed to fetch reports:", error);
    } finally {
      setLoading(false);
    }
  };

  const needsVerification = (report: Report) => {
    return (report.source === "Whatsapp" || report.source === "facebook" || report.source === "news") && 
           !report.isVerified;
  };

  const handleVerifyClick = (report: Report) => {
    setVerifyingReport(report);
    // Handle location data - it might be a string or object
    const locationAddress = typeof report.location === 'string' 
      ? report.location 
      : report.location?.address || "";
    
    setVerificationData({
      incidentType: report.incidentType || "",
      severityLevel: report.severityLevel || "LOW",
      incidentDate: report.incidentDate || "",
      location: { 
        address: locationAddress,
        lat: typeof report.location === 'object' ? report.location.lat : undefined,
        lng: typeof report.location === 'object' ? report.location.lng : undefined
      }
    });
  };

  const handleVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyingReport) return;
    
    setIsVerifying(true);
    try {
      const response = await fetch(`/api/dashboard/reports/${verifyingReport._id}/verify`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(verificationData),
      });
      
      if (response.ok) {
        // Refresh the reports list
        await fetchReports();
        setVerifyingReport(null);
        setVerificationData({
          incidentType: "",
          severityLevel: "LOW",
          incidentDate: "",
          location: { address: "", lat: 0, lng: 0 }
        });
      }
    } catch (error) {
      console.error("Failed to verify report:", error);
    } finally {
      setIsVerifying(false);
    }
  };

  const filteredReports = (reports || []).filter(report => {
    const matchesSearch = report.publicId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (typeof report.location === 'string' 
                           ? report.location.toLowerCase().includes(searchTerm.toLowerCase())
                           : (report.location?.address?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false));
    
    const matchesStatus = statusFilter === "all" || report.status === statusFilter;
    const matchesSeverity = severityFilter === "all" || report.severityLevel === severityFilter;
    
    // Handle source filtering with default logic
    const reportSource = report.source || "Online Portal";
    const matchesSource = sourceFilter === "all" || 
                         (sourceFilter === "WhatsApp" && report.source === "Whatsapp") ||
                         (sourceFilter === "Facebook" && report.source === "facebook") ||
                         (sourceFilter === "News" && report.source === "news") ||
                         (sourceFilter === "Online Portal" && !report.source);
    
    return matchesSearch && matchesStatus && matchesSeverity && matchesSource;
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
    <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Incident Dashboard</h1>
          <p className="text-gray-600">Manage and review all reportd incidents</p>
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
              <div className="flex items-center justify-between w-full">
                <CardTitle>Recent Reports</CardTitle>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 mt-4">
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

                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                    <SelectItem value="Facebook">Facebook</SelectItem>
                    <SelectItem value="News">News</SelectItem>
                    <SelectItem value="Online Portal">Online Portal</SelectItem>
                  </SelectContent>
                </Select>
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
                          {needsVerification(report) && (
                            <Badge className="bg-orange-100 text-orange-800">
                              <span className="flex items-center gap-1">
                                <Shield className="w-3 h-3" />
                                Needs Verification
                              </span>
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-gray-600 text-sm mb-3 line-clamp-2">{report.description}</p>
                        
                        <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {report.source === "Whatsapp" 
                              ? new Date("2025-07-06T07:04:11.121+00:00").toLocaleDateString()
                              : new Date(report.incidentDate).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {typeof report.location === 'string' 
                              ? report.location 
                              : (report.location?.address || "No location provided")}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {report.isAnonymous ? "Anonymous" : "Identified"}
                          </span>
                          <span className="flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            Source: {report.source || "Online Portal"}
                          </span>
                          {report.source === "facebook" && report.metadata?.postUrl && (
                            <a 
                              href={report.metadata.postUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                            >
                              <ExternalLink className="w-3 h-3" />
                              View Post
                            </a>
                          )}
                          {report.attachments.length > 0 && (
                            <span className="text-blue-600">
                              {report.attachments.length} attachment(s)
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex gap-2 ml-4">
                        {needsVerification(report) ? (
                          <Button 
                            size="sm" 
                            className="bg-orange-600 hover:bg-orange-700"
                            onClick={() => handleVerifyClick(report)}
                          >
                            <Shield className="w-4 h-4 mr-1" />
                            Verify
                          </Button>
                        ) : (
                          <Link href={`/dashboard/investigations/new?reportId=${report._id}`}>
                            <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                              <Clipboard className="w-4 h-4 mr-1" />
                              Investigate
                            </Button>
                          </Link>
                        )}
                        <Link href={`/dashboard/reports/${report._id}`}>
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

        {/* Verification Dialog */}
        <Dialog open={verifyingReport !== null} onOpenChange={(open) => !open && setVerifyingReport(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-orange-600" />
                Verify External Report
              </DialogTitle>
            </DialogHeader>
            
            {verifyingReport && (
              <form onSubmit={handleVerificationSubmit} className="space-y-6">
                <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                  <h4 className="font-medium text-orange-900 mb-2">Report Details</h4>
                  <div className="text-sm text-orange-800 space-y-1">
                    <p><strong>ID:</strong> {verifyingReport.publicId}</p>
                    <p><strong>Source:</strong> {verifyingReport.source}</p>
                    <p><strong>Description:</strong> {verifyingReport.description}</p>
                    {verifyingReport.source === "facebook" && verifyingReport.metadata?.postUrl && (
                      <p><strong>Post URL:</strong> 
                        <a 
                          href={verifyingReport.metadata.postUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 underline ml-1"
                        >
                          View Original Post
                        </a>
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="incidentType">Incident Type *</Label>
                    <Select 
                      value={verificationData.incidentType} 
                      onValueChange={(value) => setVerificationData(prev => ({ ...prev, incidentType: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select incident type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Workplace Injury">Workplace Injury</SelectItem>
                        <SelectItem value="Equipment Failure">Equipment Failure</SelectItem>
                        <SelectItem value="Chemical Spill">Chemical Spill</SelectItem>
                        <SelectItem value="Fire Incident">Fire Incident</SelectItem>
                        <SelectItem value="Environmental Damage">Environmental Damage</SelectItem>
                        <SelectItem value="Safety Violation">Safety Violation</SelectItem>
                        <SelectItem value="Near Miss">Near Miss</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="severityLevel">Severity Level *</Label>
                    <Select 
                      value={verificationData.severityLevel} 
                      onValueChange={(value) => setVerificationData(prev => ({ ...prev, severityLevel: value as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LOW">Low</SelectItem>
                        <SelectItem value="MEDIUM">Medium</SelectItem>
                        <SelectItem value="HIGH">High</SelectItem>
                        <SelectItem value="CRITICAL">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="incidentDate">Incident Date *</Label>
                  <Input
                    id="incidentDate"
                    type="date"
                    value={verificationData.incidentDate}
                    onChange={(e) => setVerificationData(prev => ({ ...prev, incidentDate: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <AddressAutocomplete
                    label="Location *"
                    value={verificationData.location.address}
                    onLocationSelect={(location) => {
                      setVerificationData(prev => ({ 
                        ...prev, 
                        location: { address: location.address, lat: location.lat, lng: location.lng } 
                      }));
                    }}
                    placeholder="Enter incident location"
                    required
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button 
                    type="submit" 
                    className="bg-orange-600 hover:bg-orange-700"
                    disabled={isVerifying}
                  >
                    {isVerifying ? "Verifying..." : "Verify Report"}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => setVerifyingReport(null)}
                    disabled={isVerifying}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>
    </div>
  );
}