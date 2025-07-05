"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
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
  User, 
  FileText, 
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock,
  Send,
  Edit,
  Eye
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
    description: string;
    incidentDate: string;
    location: { address: string };
  };
  investigatorId: {
    _id: string;
    name: string;
    email: string;
  };
  investigationStartDate: string;
  investigationEndDate?: string;
  incidentCause: string;
  rootCauses: string[];
  contributingFactors: string[];
  totalPeopleAffected: number;
  casualties: Array<{
    name: string;
    age?: number;
    status: string;
    injuryType?: string;
    causeOfDeath?: string;
    hospitalName?: string;
    nextOfKinName?: string;
    nextOfKinContact?: string;
  }>;
  investigationMethod: string;
  evidenceCollected: string[];
  witnessStatements: string[];
  environmentalDamage?: string;
  cleanupRequired?: boolean;
  estimatedDirectCosts?: number;
  estimatedIndirectCosts?: number;
  regulatoryNotificationRequired: boolean;
  regulatoryBodiesNotified: string[];
  immediateActions: string[];
  shortTermActions: string[];
  longTermActions: string[];
  preventiveMeasures: string[];
  status: "DRAFT" | "UNDER_REVIEW" | "APPROVED" | "PUBLISHED";
  reviewedBy?: { name: string };
  approvedBy?: { name: string };
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

const statusOptions = [
  { value: "DRAFT", label: "Draft", icon: Clock },
  { value: "UNDER_REVIEW", label: "Under Review", icon: AlertTriangle },
  { value: "APPROVED", label: "Approved", icon: CheckCircle },
  { value: "PUBLISHED", label: "Published", icon: CheckCircle },
];

const statusColors = {
  DRAFT: "bg-gray-100 text-gray-800",
  UNDER_REVIEW: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-green-100 text-green-800",
  PUBLISHED: "bg-blue-100 text-blue-800",
};

const casualtyStatusColors = {
  INJURED: "bg-yellow-100 text-yellow-800",
  HOSPITALIZED: "bg-orange-100 text-orange-800",
  DECEASED: "bg-red-100 text-red-800",
  MISSING: "bg-purple-100 text-purple-800",
  UNHARMED: "bg-green-100 text-green-800",
};

export default function InvestigationDetail() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const [investigation, setInvestigation] = useState<Investigation | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState("");

  useEffect(() => {
    if (status === "loading") return;
    
    if (!session || !["ADMIN", "OFFICER"].includes((session.user as any)?.role)) {
      router.push("/login");
      return;
    }

    if (params.id) {
      fetchInvestigation(params.id as string);
    }
  }, [session, status, router, params.id]);

  const fetchInvestigation = async (id: string) => {
    try {
      const response = await fetch(`/api/investigations/${id}`);
      if (response.ok) {
        const data = await response.json();
        setInvestigation(data.investigation);
        setNewStatus(data.investigation.status);
      } else {
        router.push("/dashboard/investigations");
      }
    } catch (error) {
      console.error("Failed to fetch investigation:", error);
      router.push("/dashboard/investigations");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async () => {
    if (!investigation || !newStatus) return;
    
    setUpdating(true);
    try {
      const response = await fetch(`/api/investigations/${investigation._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        const data = await response.json();
        setInvestigation(data.investigation);
      }
    } catch (error) {
      console.error("Failed to update investigation:", error);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading investigation...</p>
        </div>
      </div>
    );
  }

  if (!investigation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Investigation not found</p>
          <Link href="/dashboard/investigations">
            <Button className="mt-4">Back to Investigations</Button>
          </Link>
        </div>
      </div>
    );
  }

  const totalCosts = (investigation.estimatedDirectCosts || 0) + (investigation.estimatedIndirectCosts || 0);

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-6">
        <Link href="/dashboard/investigations">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Investigations
          </Button>
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{investigation.publicId}</h1>
            <p className="text-gray-600 mt-1">{investigation.title}</p>
          </div>
          <Badge className={statusColors[investigation.status]}>
            {investigation.status.replace('_', ' ')}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Original Report Reference */}
          <Card>
            <CardHeader>
              <CardTitle>Original Incident Report</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{investigation.originalReportId.publicId}</p>
                    <p className="text-sm text-gray-600 capitalize">
                      {investigation.originalReportId.incidentType.replace('-', ' ')} - {investigation.originalReportId.severityLevel}
                    </p>
                  </div>
                  <Link href={`/dashboard/reports/${investigation.originalReportId._id}`}>
                    <Button variant="outline" size="sm">
                      <Eye className="w-4 h-4 mr-1" />
                      View Report
                    </Button>
                  </Link>
                </div>
                <div className="text-sm text-gray-600">
                  <p><strong>Date:</strong> {new Date(investigation.originalReportId.incidentDate).toLocaleString()}</p>
                  <p><strong>Location:</strong> {investigation.originalReportId.location.address}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Investigation Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Investigation Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className="font-medium">Started:</span>
                  <span>{new Date(investigation.investigationStartDate).toLocaleDateString()}</span>
                </div>
                {investigation.investigationEndDate && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span className="font-medium">Completed:</span>
                    <span>{new Date(investigation.investigationEndDate).toLocaleDateString()}</span>
                  </div>
                )}
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-2">Primary Cause</h4>
                <p className="text-gray-700 leading-relaxed">{investigation.incidentCause}</p>
              </div>

              <div>
                <h4 className="font-medium mb-2">Investigation Method</h4>
                <p className="text-gray-700 leading-relaxed">{investigation.investigationMethod}</p>
              </div>

              {investigation.rootCauses.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Root Causes</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {investigation.rootCauses.map((cause, index) => (
                      <li key={index} className="text-gray-700">{cause}</li>
                    ))}
                  </ul>
                </div>
              )}

              {investigation.contributingFactors.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Contributing Factors</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {investigation.contributingFactors.map((factor, index) => (
                      <li key={index} className="text-gray-700">{factor}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* People Affected */}
          <Card>
            <CardHeader>
              <CardTitle>People Affected ({investigation.totalPeopleAffected})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {investigation.casualties.map((casualty, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-medium">{casualty.name}</h4>
                        {casualty.age && <p className="text-sm text-gray-600">Age: {casualty.age}</p>}
                      </div>
                      <Badge className={casualtyStatusColors[casualty.status as keyof typeof casualtyStatusColors]}>
                        {casualty.status}
                      </Badge>
                    </div>
                    
                    {casualty.injuryType && (
                      <p className="text-sm text-gray-600 mb-2">
                        <strong>Injury:</strong> {casualty.injuryType}
                      </p>
                    )}
                    
                    {casualty.causeOfDeath && (
                      <p className="text-sm text-gray-600 mb-2">
                        <strong>Cause of Death:</strong> {casualty.causeOfDeath}
                      </p>
                    )}
                    
                    {casualty.hospitalName && (
                      <p className="text-sm text-gray-600 mb-2">
                        <strong>Hospital:</strong> {casualty.hospitalName}
                      </p>
                    )}
                    
                    {casualty.nextOfKinName && (
                      <p className="text-sm text-gray-600">
                        <strong>Next of Kin:</strong> {casualty.nextOfKinName}
                        {casualty.nextOfKinContact && ` (${casualty.nextOfKinContact})`}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Actions and Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle>Actions & Recommendations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {investigation.immediateActions.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2 text-red-700">Immediate Actions</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {investigation.immediateActions.map((action, index) => (
                      <li key={index} className="text-gray-700">{action}</li>
                    ))}
                  </ul>
                </div>
              )}

              {investigation.shortTermActions.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2 text-orange-700">Short-term Actions</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {investigation.shortTermActions.map((action, index) => (
                      <li key={index} className="text-gray-700">{action}</li>
                    ))}
                  </ul>
                </div>
              )}

              {investigation.longTermActions.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2 text-blue-700">Long-term Actions</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {investigation.longTermActions.map((action, index) => (
                      <li key={index} className="text-gray-700">{action}</li>
                    ))}
                  </ul>
                </div>
              )}

              {investigation.preventiveMeasures.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2 text-green-700">Preventive Measures</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {investigation.preventiveMeasures.map((measure, index) => (
                      <li key={index} className="text-gray-700">{measure}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Investigation Details */}
          <Card>
            <CardHeader>
              <CardTitle>Investigation Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-gray-500" />
                <span className="font-medium">Investigator:</span>
                <span>{investigation.investigatorId.name}</span>
              </div>
              
              {investigation.reviewedBy && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-gray-500" />
                  <span className="font-medium">Reviewed by:</span>
                  <span>{investigation.reviewedBy.name}</span>
                </div>
              )}
              
              {investigation.approvedBy && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-gray-500" />
                  <span className="font-medium">Approved by:</span>
                  <span>{investigation.approvedBy.name}</span>
                </div>
              )}

              <Separator />

              <div className="space-y-2 text-xs text-gray-500">
                <p><span className="font-medium">Created:</span> {new Date(investigation.createdAt).toLocaleString()}</p>
                <p><span className="font-medium">Last Updated:</span> {new Date(investigation.updatedAt).toLocaleString()}</p>
                {investigation.publishedAt && (
                  <p><span className="font-medium">Published:</span> {new Date(investigation.publishedAt).toLocaleString()}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Financial Impact */}
          {(investigation.estimatedDirectCosts || investigation.estimatedIndirectCosts) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Financial Impact
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {investigation.estimatedDirectCosts && (
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Direct Costs:</span>
                    <span className="text-sm">${investigation.estimatedDirectCosts.toLocaleString()}</span>
                  </div>
                )}
                {investigation.estimatedIndirectCosts && (
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Indirect Costs:</span>
                    <span className="text-sm">${investigation.estimatedIndirectCosts.toLocaleString()}</span>
                  </div>
                )}
                {totalCosts > 0 && (
                  <>
                    <Separator />
                    <div className="flex justify-between font-medium">
                      <span>Total Estimated:</span>
                      <span>${totalCosts.toLocaleString()}</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Status Update */}
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

              <Button 
                onClick={updateStatus} 
                disabled={updating || newStatus === investigation.status}
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
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}