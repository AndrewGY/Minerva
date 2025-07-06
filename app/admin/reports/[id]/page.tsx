"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  Calendar, 
  MapPin, 
  User, 
  FileText, 
  Mail,
  Phone,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  Target,
  Send
} from "lucide-react";
import AnnotationViewer from "@/components/AnnotationViewer";

interface Report {
  _id: string;
  publicId: string;
  incidentDate: string;
  location: {
    address: string;
    lat: number;
    lng: number;
  };
  incidentType: string;
  severityLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  description: string;
  status: "RECEIVED" | "UNDER_REVIEW" | "VERIFIED" | "RESOLVED" | "CLOSED";
  isAnonymous: boolean;
  reporterEmail?: string;
  reporterPhone?: string;
  attachments: Array<{
    url: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    annotations?: any[];
  }>;
  createdAt: string;
  updatedAt: string;
}

const statusOptions = [
  { value: "RECEIVED", label: "Received", icon: Clock },
  { value: "UNDER_REVIEW", label: "Under Review", icon: AlertCircle },
  { value: "VERIFIED", label: "Verified", icon: AlertCircle },
  { value: "RESOLVED", label: "Resolved", icon: CheckCircle },
  { value: "CLOSED", label: "Closed", icon: XCircle },
];

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

export default function ReportDetail() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [comments, setComments] = useState("");
  const [viewingAnnotation, setViewingAnnotation] = useState<{url: string, fileName: string, annotations: any[]} | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    
    if (!session || (session.user as any)?.role !== "ADMIN") {
      router.push("/login");
      return;
    }

    if (params.id) {
      fetchReport(params.id as string);
    }
  }, [session, status, router, params.id]);

  const fetchReport = async (id: string) => {
    try {
      const response = await fetch(`/api/dashboard/reports/${id}`);
      if (response.ok) {
        const data = await response.json();
        setReport(data.report);
        setNewStatus(data.report.status);
      } else {
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("Failed to fetch report:", error);
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async () => {
    if (!report || !newStatus) return;
    
    setUpdating(true);
    try {
      const response = await fetch(`/api/dashboard/reports/${report._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          comments: comments.trim() || undefined
        })
      });

      if (response.ok) {
        const data = await response.json();
        setReport(data.report);
        setComments("");
      }
    } catch (error) {
      console.error("Failed to update report:", error);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading report...</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Report not found</p>
          <Link href="/dashboard">
            <Button className="mt-4">Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Back to Dashboard
                </Button>
              </Link>
              <h1 className="text-xl font-bold text-gray-900">Report {report.publicId}</h1>
            </div>
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

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Incident Details</CardTitle>
                  <div className="flex gap-2">
                    <Badge className={statusColors[report.status]}>
                      {report.status.replace('_', ' ')}
                    </Badge>
                    <Badge className={severityColors[report.severityLevel]}>
                      {report.severityLevel}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span className="font-medium">Date:</span>
                    <span>{new Date(report.incidentDate).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="w-4 h-4 text-gray-500" />
                    <span className="font-medium">Type:</span>
                    <span className="capitalize">{report.incidentType.replace('-', ' ')}</span>
                  </div>
                </div>

                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-gray-500 mt-0.5" />
                  <span className="font-medium">Location:</span>
                  <span>{report.location.address}</span>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium mb-2">Description</h4>
                  <p className="text-gray-700 leading-relaxed">{report.description}</p>
                </div>
              </CardContent>
            </Card>

            {report.attachments.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Evidence & Attachments</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {report.attachments.map((attachment, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        {attachment.fileType.startsWith('image/') ? (
                          <div className="space-y-3">
                            <div className="relative h-48 bg-gray-100 rounded overflow-hidden">
                              <Image
                                src={attachment.url}
                                alt={attachment.fileName}
                                fill
                                className="object-cover"
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-sm">{attachment.fileName}</p>
                                <p className="text-xs text-gray-500">
                                  {(attachment.fileSize / 1024 / 1024).toFixed(2)} MB
                                </p>
                                {attachment.annotations && attachment.annotations.length > 0 && (
                                  <p className="text-xs text-blue-600">
                                    {attachment.annotations.length} annotation(s)
                                  </p>
                                )}
                              </div>
                              {attachment.annotations && attachment.annotations.length > 0 && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setViewingAnnotation({
                                    url: attachment.url,
                                    fileName: attachment.fileName,
                                    annotations: attachment.annotations || []
                                  })}
                                >
                                  <Target className="w-4 h-4 mr-1" />
                                  View Annotations
                                </Button>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                            <p className="font-medium text-sm">{attachment.fileName}</p>
                            <p className="text-xs text-gray-500">
                              {(attachment.fileSize / 1024 / 1024).toFixed(2)} MB
                            </p>
                            <Button variant="outline" size="sm" className="mt-2" asChild>
                              <a href={attachment.url} target="_blank" rel="noopener noreferrer">
                                Download
                              </a>
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Reporter Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-gray-500" />
                  <span className="font-medium">Type:</span>
                  <span>{report.isAnonymous ? "Anonymous" : "Identified"}</span>
                </div>
                
                {!report.isAnonymous && report.reporterEmail && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-gray-500" />
                    <span className="font-medium">Email:</span>
                    <span className="text-blue-600">{report.reporterEmail}</span>
                  </div>
                )}
                
                {!report.isAnonymous && report.reporterPhone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-gray-500" />
                    <span className="font-medium">Phone:</span>
                    <span>{report.reporterPhone}</span>
                  </div>
                )}

                <Separator />

                <div className="space-y-2 text-xs text-gray-500">
                  <p><span className="font-medium">Submitted:</span> {new Date(report.createdAt).toLocaleString()}</p>
                  <p><span className="font-medium">Last Updated:</span> {new Date(report.updatedAt).toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Update Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <span className="flex items-center gap-2">
                            <option.icon className="w-4 h-4" />
                            {option.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="comments">Comments (optional)</Label>
                  <Textarea
                    id="comments"
                    placeholder="Add any notes or updates for the reporter..."
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    rows={3}
                  />
                </div>

                <Button 
                  onClick={updateStatus} 
                  disabled={updating || newStatus === report.status}
                  className="w-full"
                >
                  {updating ? (
                    "Updating..."
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Update Status
                    </>
                  )}
                </Button>

                {!report.isAnonymous && report.reporterEmail && (
                  <p className="text-xs text-gray-500 text-center">
                    Email notification will be sent to reporter
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {viewingAnnotation && (
        <AnnotationViewer
          imageUrl={viewingAnnotation.url}
          fileName={viewingAnnotation.fileName}
          annotations={viewingAnnotation.annotations}
          onClose={() => setViewingAnnotation(null)}
          showStats={true}
        />
      )}
    </div>
  );
}