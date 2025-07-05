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
  Clipboard, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  Eye,
  Plus,
  User,
  Calendar,
  FileText
} from "lucide-react";

interface Investigation {
  _id: string;
  publicId: string;
  title: string;
  originalReportId: {
    _id: string;
    publicId: string;
    incidentType: string;
    severityLevel: string;
  };
  investigatorId: {
    _id: string;
    name: string;
    email: string;
  };
  status: "DRAFT" | "UNDER_REVIEW" | "APPROVED" | "PUBLISHED";
  totalPeopleAffected: number;
  investigationStartDate: string;
  investigationEndDate?: string;
  createdAt: string;
  updatedAt: string;
}

const statusIcons = {
  DRAFT: <Clock className="w-4 h-4" />,
  UNDER_REVIEW: <AlertCircle className="w-4 h-4" />,
  APPROVED: <CheckCircle className="w-4 h-4" />,
  PUBLISHED: <XCircle className="w-4 h-4" />,
};

const statusColors = {
  DRAFT: "bg-gray-100 text-gray-800",
  UNDER_REVIEW: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-green-100 text-green-800",
  PUBLISHED: "bg-blue-100 text-blue-800",
};

export default function InvestigationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    if (status === "loading") return;
    
    if (!session || !["ADMIN", "OFFICER"].includes((session.user as any)?.role)) {
      router.push("/login");
      return;
    }

    fetchInvestigations();
  }, [session, status, router]);

  const fetchInvestigations = async () => {
    try {
      const response = await fetch("/api/investigations");
      if (response.ok) {
        const data = await response.json();
        setInvestigations(data.investigations);
      }
    } catch (error) {
      console.error("Failed to fetch investigations:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredInvestigations = investigations.filter(investigation => {
    const matchesSearch = investigation.publicId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         investigation.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         investigation.originalReportId.publicId.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || investigation.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading investigations...</p>
        </div>
      </div>
    );
  }

  const stats = {
    total: investigations.length,
    draft: investigations.filter(i => i.status === "DRAFT").length,
    underReview: investigations.filter(i => i.status === "UNDER_REVIEW").length,
    published: investigations.filter(i => i.status === "PUBLISHED").length,
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Investigations</h1>
            <p className="text-gray-600">Comprehensive incident investigations and reports</p>
          </div>
          <Link href="/dashboard/investigations/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Investigation
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <Clipboard className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Draft</p>
                <p className="text-3xl font-bold text-gray-600">{stats.draft}</p>
              </div>
              <Clock className="w-8 h-8 text-gray-600" />
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
                <p className="text-sm font-medium text-gray-600">Published</p>
                <p className="text-3xl font-bold text-blue-600">{stats.published}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Investigations</CardTitle>
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search investigations..."
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
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="PUBLISHED">Published</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredInvestigations.length === 0 ? (
              <div className="text-center py-8">
                <Clipboard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No investigations found</p>
                <Link href="/dashboard/investigations/new">
                  <Button className="mt-4">
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Investigation
                  </Button>
                </Link>
              </div>
            ) : (
              filteredInvestigations.map((investigation) => (
                <div key={investigation._id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-medium text-gray-900">{investigation.publicId}</h3>
                        <Badge className={statusColors[investigation.status]}>
                          <span className="flex items-center gap-1">
                            {statusIcons[investigation.status]}
                            {investigation.status.replace('_', ' ')}
                          </span>
                        </Badge>
                      </div>
                      
                      <p className="text-gray-900 font-medium mb-2">{investigation.title}</p>
                      <p className="text-gray-600 text-sm mb-3">
                        Original Report: {investigation.originalReportId.publicId} - {investigation.originalReportId.incidentType}
                      </p>
                      
                      <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {investigation.investigatorId.name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Started: {new Date(investigation.investigationStartDate).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          {investigation.totalPeopleAffected} people affected
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      <Link href={`/dashboard/investigations/${investigation._id}`}>
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
  );
}