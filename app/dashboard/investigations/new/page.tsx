"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Trash2, Save, Upload, X, Target } from "lucide-react";
import EmployerSelector from "@/components/EmployerSelector";
import ImageAnnotation from "@/components/ImageAnnotation";

interface Report {
  _id: string;
  publicId: string;
  incidentType: string;
  severityLevel: string;
  description: string;
  incidentDate: string;
  location: { address: string };
}

interface Casualty {
  name: string;
  age?: number;
  status: string;
  injuryType?: string;
  causeOfDeath?: string;
  hospitalName?: string;
  nextOfKinName?: string;
  nextOfKinContact?: string;
}

interface FileWithAnnotations {
  file: File;
  annotations: Array<{
    id: string;
    x: number;
    y: number;
    radius: number;
    normalizedX: number;
    normalizedY: number;
    normalizedRadius: number;
  }>;
  url?: string;
}

export default function NewInvestigationPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [selectedEmployerId, setSelectedEmployerId] = useState<string>("");
  const [files, setFiles] = useState<FileWithAnnotations[]>([]);
  const [annotatingFile, setAnnotatingFile] = useState<number | null>(null);
  
  const [formData, setFormData] = useState({
    originalReportId: searchParams.get('reportId') || '',
    title: '',
    investigationStartDate: new Date().toISOString().split('T')[0],
    investigationEndDate: '',
    incidentCause: '',
    investigationMethod: '',
    employerInfo: {
      employerId: '',
      companyName: '',
      companyRegistrationNumber: '',
      industry: '',
      companySize: 'SMALL' as 'SMALL' | 'MEDIUM' | 'LARGE' | 'ENTERPRISE',
      primaryContact: {
        name: '',
        position: '',
        email: '',
        phone: '',
      },
      safetyOfficer: {
        name: '',
        position: '',
        email: '',
        phone: '',
        certifications: [] as string[],
      },
      address: {
        street: '',
        city: '',
        region: '',
        country: 'Guyana',
      },
      previousIncidents: 0,
      lastSafetyAuditDate: '',
      complianceStatus: 'UNDER_REVIEW' as 'COMPLIANT' | 'NON_COMPLIANT' | 'UNDER_REVIEW',
      insuranceProvider: '',
      insurancePolicyNumber: '',
      notes: '',
    },
  });

  const [casualties, setCasualties] = useState<Casualty[]>([
    { name: '', status: 'INJURED' }
  ]);

  useEffect(() => {
    if (status === "loading") return;
    
    if (!session || !["ADMIN", "OFFICER"].includes((session.user as any)?.role)) {
      router.push("/login");
      return;
    }

    fetchReports();
  }, [session, status, router]);

  useEffect(() => {
    if (formData.originalReportId && reports.length > 0) {
      const report = reports.find(r => r._id === formData.originalReportId);
      if (report) {
        setSelectedReport(report);
        if (!formData.title) {
          setFormData(prev => ({
            ...prev,
            title: `Investigation into ${report.incidentType} incident - ${report.publicId}`
          }));
        }
      }
    }
  }, [formData.originalReportId, reports]);

  const fetchReports = async () => {
    try {
      const response = await fetch("/api/dashboard/reports");
      if (response.ok) {
        const data = await response.json();
        setReports(data.reports);
      }
    } catch (error) {
      console.error("Failed to fetch reports:", error);
    }
  };

  const addCasualty = () => {
    setCasualties([...casualties, { name: '', status: 'INJURED' }]);
  };

  const removeCasualty = (index: number) => {
    setCasualties(casualties.filter((_, i) => i !== index));
  };

  const updateCasualty = (index: number, field: keyof Casualty, value: string | number | undefined) => {
    setCasualties(casualties.map((casualty, i) => 
      i === index ? { ...casualty, [field]: value } : casualty
    ));
  };

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    
    const newFiles = Array.from(e.target.files);
    const valid = newFiles.filter(file => {
      const types = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/avi', 'application/pdf'];
      const size = 10 * 1024 * 1024;
      return types.includes(file.type) && file.size <= size;
    });
    
    const filesWithAnnotations = valid.map(file => ({
      file,
      annotations: [],
      url: URL.createObjectURL(file)
    }));
    
    setFiles(prev => [...prev, ...filesWithAnnotations]);
  };

  const removeFile = (index: number) => {
    const fileToRemove = files[index];
    if (fileToRemove.url) {
      URL.revokeObjectURL(fileToRemove.url);
    }
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const startAnnotation = (index: number) => {
    const file = files[index];
    if (file.file.type.startsWith('image/')) {
      setAnnotatingFile(index);
    }
  };

  const handleAnnotationComplete = (index: number, annotations: any[]) => {
    setFiles(prev => prev.map((file, i) => 
      i === index ? { ...file, annotations } : file
    ));
    setAnnotatingFile(null);
  };

  const handleAnnotationCancel = () => {
    setAnnotatingFile(null);
  };

  const handleEmployerSelect = (employer: any) => {
    setSelectedEmployerId(employer._id);
    setFormData(prev => ({
      ...prev,
      employerInfo: {
        employerId: employer._id,
        companyName: employer.name,
        companyRegistrationNumber: employer.registrationNumber || '',
        industry: employer.industry,
        companySize: employer.companySize.toUpperCase() as 'SMALL' | 'MEDIUM' | 'LARGE' | 'ENTERPRISE',
        primaryContact: {
          name: employer.primaryContact?.name || '',
          position: employer.primaryContact?.position || '',
          email: employer.primaryContact?.email || '',
          phone: employer.primaryContact?.phone || '',
        },
        safetyOfficer: {
          name: '',
          position: '',
          email: '',
          phone: '',
          certifications: [],
        },
        address: {
          street: employer.address?.street || '',
          city: employer.address?.city || '',
          region: employer.address?.region || '',
          country: employer.address?.country || 'Guyana',
          postalCode: employer.address?.postalCode || '',
        },
        previousIncidents: 0,
        lastSafetyAuditDate: '',
        complianceStatus: (employer.complianceStatus?.toUpperCase() as 'COMPLIANT' | 'NON_COMPLIANT' | 'UNDER_REVIEW') || 'UNDER_REVIEW',
        insuranceProvider: '',
        insurancePolicyNumber: '',
        notes: ''
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.originalReportId || !formData.title || !formData.employerInfo.companyName) return;

    setLoading(true);
    try {
      // Upload files first
      const uploadedFiles = [];
      for (const fileWithAnnotations of files) {
        const formData = new FormData();
        formData.append('file', fileWithAnnotations.file);
        
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        
        if (res.ok) {
          const result = await res.json();
          const attachmentData = {
            url: result.url,
            fileName: fileWithAnnotations.file.name,
            fileType: fileWithAnnotations.file.type,
            fileSize: fileWithAnnotations.file.size,
            annotations: fileWithAnnotations.annotations,
          };
          uploadedFiles.push(attachmentData);
        }
      }

      const payload = {
        ...formData,
        casualties: casualties.filter(c => c.name.trim()),
        totalPeopleAffected: casualties.filter(c => c.name.trim()).length,
        attachments: uploadedFiles,
      };

      const response = await fetch("/api/investigations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        router.push(`/dashboard/investigations/${data.investigation._id}`);
      }
    } catch (error) {
      console.error("Failed to create investigation:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <Link href="/dashboard/investigations">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Investigations
          </Button>
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">New Investigation Report</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="originalReportId">Original Incident Report *</Label>
              <Select 
                value={formData.originalReportId} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, originalReportId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select incident report" />
                </SelectTrigger>
                <SelectContent>
                  {reports.map((report) => (
                    <SelectItem key={report._id} value={report._id}>
                      {report.publicId} - {report.incidentType} ({report.severityLevel})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedReport && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Selected Report Details:</h4>
                <div className="text-sm space-y-1">
                  <p><strong>ID:</strong> {selectedReport.publicId}</p>
                  <p><strong>Type:</strong> {selectedReport.incidentType}</p>
                  <p><strong>Severity:</strong> {selectedReport.severityLevel}</p>
                  <p><strong>Date:</strong> {new Date(selectedReport.incidentDate).toLocaleDateString()}</p>
                  <p><strong>Location:</strong> {selectedReport.location.address}</p>
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="title">Investigation Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter investigation title"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="investigationStartDate">Investigation Start Date *</Label>
                <Input
                  id="investigationStartDate"
                  type="date"
                  value={formData.investigationStartDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, investigationStartDate: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="investigationEndDate">Investigation End Date</Label>
                <Input
                  id="investigationEndDate"
                  type="date"
                  value={formData.investigationEndDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, investigationEndDate: e.target.value }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Employer Information */}
        <Card>
          <CardHeader>
            <CardTitle>Employer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Employer Selector */}
            <div>
              <Label htmlFor="employer">Select Employer *</Label>
              <EmployerSelector
                value={selectedEmployerId}
                onSelect={handleEmployerSelect}
                required
              />
            </div>

            {/* Selected Employer Info Display */}
            {selectedEmployerId && formData.employerInfo.companyName && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-3">Selected Employer Details:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p><strong>Company Name:</strong> {formData.employerInfo.companyName}</p>
                    <p><strong>Industry:</strong> {formData.employerInfo.industry}</p>
                    <p><strong>Company Size:</strong> {formData.employerInfo.companySize}</p>
                  </div>
                  <div>
                    <p><strong>Compliance Status:</strong> {formData.employerInfo.complianceStatus.replace('_', ' ')}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Investigation-specific Employer Details */}
            {selectedEmployerId && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="registrationNumber">Company Registration Number</Label>
                    <Input
                      id="registrationNumber"
                      value={formData.employerInfo.companyRegistrationNumber}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        employerInfo: { ...prev.employerInfo, companyRegistrationNumber: e.target.value } 
                      }))}
                      placeholder="Enter registration number"
                    />
                  </div>
                  <div>
                    <Label htmlFor="previousIncidents">Previous Incidents Count</Label>
                    <Input
                      id="previousIncidents"
                      type="number"
                      min="0"
                      value={formData.employerInfo.previousIncidents}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        employerInfo: { ...prev.employerInfo, previousIncidents: parseInt(e.target.value) || 0 } 
                      }))}
                      placeholder="Number of previous incidents"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="lastSafetyAuditDate">Last Safety Audit Date</Label>
                  <Input
                    id="lastSafetyAuditDate"
                    type="date"
                    value={formData.employerInfo.lastSafetyAuditDate}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      employerInfo: { ...prev.employerInfo, lastSafetyAuditDate: e.target.value } 
                    }))}
                  />
                </div>

                {/* Primary Contact Details */}
                <div className="space-y-4">
                  <h4 className="font-medium text-lg">Primary Contact Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="primaryContactName">Contact Name *</Label>
                      <Input
                        id="primaryContactName"
                        value={formData.employerInfo.primaryContact.name}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          employerInfo: { 
                            ...prev.employerInfo, 
                            primaryContact: { ...prev.employerInfo.primaryContact, name: e.target.value } 
                          } 
                        }))}
                        placeholder="Contact person name"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="primaryContactPosition">Position *</Label>
                      <Input
                        id="primaryContactPosition"
                        value={formData.employerInfo.primaryContact.position}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          employerInfo: { 
                            ...prev.employerInfo, 
                            primaryContact: { ...prev.employerInfo.primaryContact, position: e.target.value } 
                          } 
                        }))}
                        placeholder="Job title/position"
                        required
                      />
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    <p><strong>Email:</strong> {formData.employerInfo.primaryContact.email || 'Not provided'}</p>
                    <p><strong>Phone:</strong> {formData.employerInfo.primaryContact.phone || 'Not provided'}</p>
                  </div>
                </div>

                {/* Safety Officer Details */}
                <div className="space-y-4">
                  <h4 className="font-medium text-lg">Safety Officer Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="safetyOfficerName">Safety Officer Name</Label>
                      <Input
                        id="safetyOfficerName"
                        value={formData.employerInfo.safetyOfficer.name}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          employerInfo: { 
                            ...prev.employerInfo, 
                            safetyOfficer: { ...prev.employerInfo.safetyOfficer, name: e.target.value } 
                          } 
                        }))}
                        placeholder="Safety officer name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="safetyOfficerPosition">Position</Label>
                      <Input
                        id="safetyOfficerPosition"
                        value={formData.employerInfo.safetyOfficer.position}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          employerInfo: { 
                            ...prev.employerInfo, 
                            safetyOfficer: { ...prev.employerInfo.safetyOfficer, position: e.target.value } 
                          } 
                        }))}
                        placeholder="Safety officer position"
                      />
                    </div>
                    <div>
                      <Label htmlFor="safetyOfficerEmail">Email</Label>
                      <Input
                        id="safetyOfficerEmail"
                        type="email"
                        value={formData.employerInfo.safetyOfficer.email}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          employerInfo: { 
                            ...prev.employerInfo, 
                            safetyOfficer: { ...prev.employerInfo.safetyOfficer, email: e.target.value } 
                          } 
                        }))}
                        placeholder="Safety officer email"
                      />
                    </div>
                    <div>
                      <Label htmlFor="safetyOfficerPhone">Phone</Label>
                      <Input
                        id="safetyOfficerPhone"
                        type="tel"
                        value={formData.employerInfo.safetyOfficer.phone}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          employerInfo: { 
                            ...prev.employerInfo, 
                            safetyOfficer: { ...prev.employerInfo.safetyOfficer, phone: e.target.value } 
                          } 
                        }))}
                        placeholder="Safety officer phone"
                      />
                    </div>
                  </div>
                </div>

                {/* Company Address Details */}
                <div className="space-y-4">
                  <h4 className="font-medium text-lg">Company Address</h4>
                  <div className="text-sm text-gray-600 mb-2">
                    <p><strong>Street Address:</strong> {formData.employerInfo.address.street || 'Not provided'}</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="addressCity">City *</Label>
                      <Input
                        id="addressCity"
                        value={formData.employerInfo.address.city}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          employerInfo: { 
                            ...prev.employerInfo, 
                            address: { ...prev.employerInfo.address, city: e.target.value } 
                          } 
                        }))}
                        placeholder="City"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="addressRegion">Region *</Label>
                      <Input
                        id="addressRegion"
                        value={formData.employerInfo.address.region}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          employerInfo: { 
                            ...prev.employerInfo, 
                            address: { ...prev.employerInfo.address, region: e.target.value } 
                          } 
                        }))}
                        placeholder="Region"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Insurance Information */}
                <div className="space-y-4">
                  <h4 className="font-medium text-lg">Insurance Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="insuranceProvider">Insurance Provider</Label>
                      <Input
                        id="insuranceProvider"
                        value={formData.employerInfo.insuranceProvider}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          employerInfo: { ...prev.employerInfo, insuranceProvider: e.target.value } 
                        }))}
                        placeholder="Insurance company name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="insurancePolicyNumber">Policy Number</Label>
                      <Input
                        id="insurancePolicyNumber"
                        value={formData.employerInfo.insurancePolicyNumber}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          employerInfo: { ...prev.employerInfo, insurancePolicyNumber: e.target.value } 
                        }))}
                        placeholder="Insurance policy number"
                      />
                    </div>
                  </div>
                </div>

                {/* Additional Notes */}
                <div>
                  <Label htmlFor="employerNotes">Additional Notes</Label>
                  <Textarea
                    id="employerNotes"
                    value={formData.employerInfo.notes}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      employerInfo: { ...prev.employerInfo, notes: e.target.value } 
                    }))}
                    placeholder="Any additional information about the employer relevant to this investigation"
                    rows={3}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* People Affected */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              People Affected
              <Button type="button" onClick={addCasualty} variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-1" />
                Add Person
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {casualties.map((casualty, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Person {index + 1}</h4>
                  {casualties.length > 1 && (
                    <Button
                      type="button"
                      onClick={() => removeCasualty(index)}
                      variant="outline"
                      size="sm"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Name *</Label>
                    <Input
                      value={casualty.name}
                      onChange={(e) => updateCasualty(index, 'name', e.target.value)}
                      placeholder="Full name"
                      required
                    />
                  </div>
                  <div>
                    <Label>Age</Label>
                    <Input
                      type="number"
                      value={casualty.age || ''}
                      onChange={(e) => updateCasualty(index, 'age', parseInt(e.target.value) || undefined)}
                      placeholder="Age"
                    />
                  </div>
                  <div>
                    <Label>Status *</Label>
                    <Select
                      value={casualty.status}
                      onValueChange={(value) => updateCasualty(index, 'status', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INJURED">Injured</SelectItem>
                        <SelectItem value="HOSPITALIZED">Hospitalized</SelectItem>
                        <SelectItem value="DECEASED">Deceased</SelectItem>
                        <SelectItem value="MISSING">Missing</SelectItem>
                        <SelectItem value="UNHARMED">Unharmed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {casualty.status === 'DECEASED' && (
                  <div>
                    <Label>Cause of Death</Label>
                    <Textarea
                      value={casualty.causeOfDeath || ''}
                      onChange={(e) => updateCasualty(index, 'causeOfDeath', e.target.value)}
                      placeholder="Describe cause of death"
                    />
                  </div>
                )}

                {(casualty.status === 'INJURED' || casualty.status === 'HOSPITALIZED') && (
                  <>
                    <div>
                      <Label>Injury Type</Label>
                      <Input
                        value={casualty.injuryType || ''}
                        onChange={(e) => updateCasualty(index, 'injuryType', e.target.value)}
                        placeholder="Type of injury"
                      />
                    </div>
                    {casualty.status === 'HOSPITALIZED' && (
                      <div>
                        <Label>Hospital Name</Label>
                        <Input
                          value={casualty.hospitalName || ''}
                          onChange={(e) => updateCasualty(index, 'hospitalName', e.target.value)}
                          placeholder="Hospital name"
                        />
                      </div>
                    )}
                  </>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Next of Kin Name</Label>
                    <Input
                      value={casualty.nextOfKinName || ''}
                      onChange={(e) => updateCasualty(index, 'nextOfKinName', e.target.value)}
                      placeholder="Emergency contact name"
                    />
                  </div>
                  <div>
                    <Label>Next of Kin Contact</Label>
                    <Input
                      value={casualty.nextOfKinContact || ''}
                      onChange={(e) => updateCasualty(index, 'nextOfKinContact', e.target.value)}
                      placeholder="Emergency contact phone"
                    />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Evidence and Documentation */}
        <Card>
          <CardHeader>
            <CardTitle>Evidence & Documentation</CardTitle>
            <CardDescription>Upload photos, videos, or documents related to the investigation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center hover:border-gray-300 transition-colors">
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600 mb-2">Upload evidence files</p>
              <input
                type="file"
                multiple
                accept="image/*,video/*,application/pdf"
                onChange={handleFiles}
                className="hidden"
                id="evidence-upload"
              />
              <Button 
                type="button" 
                variant="outline"
                onClick={() => document.getElementById('evidence-upload')?.click()}
              >
                Choose Files
              </Button>
              <p className="text-sm text-gray-500 mt-2">
                Images, Videos, PDFs • Max 10MB per file
              </p>
            </div>

            {files.length > 0 && (
              <div className="space-y-2">
                {files.map((fileWithAnnotations, index) => (
                  <div key={index} className="bg-gray-50 p-3 rounded-md">
                    <div className="flex items-center justify-between">
                      <div className="text-sm">
                        <p className="font-medium">{fileWithAnnotations.file.name}</p>
                        <p className="text-gray-500">
                          {(fileWithAnnotations.file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                        {fileWithAnnotations.annotations.length > 0 && (
                          <p className="text-green-600 text-xs mt-1">
                            {fileWithAnnotations.annotations.length} annotation(s) added
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {fileWithAnnotations.file.type.startsWith('image/') && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => startAnnotation(index)}
                            title="Mark specific areas in this image"
                          >
                            <Target className="w-4 h-4 mr-1" />
                            Annotate
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Investigation Details */}
        <Card>
          <CardHeader>
            <CardTitle>Investigation Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="incidentCause">Primary Incident Cause *</Label>
              <Textarea
                id="incidentCause"
                value={formData.incidentCause}
                onChange={(e) => setFormData(prev => ({ ...prev, incidentCause: e.target.value }))}
                placeholder="Describe the main cause of the incident"
                required
              />
            </div>

            <div>
              <Label htmlFor="investigationMethod">Investigation Method *</Label>
              <Textarea
                id="investigationMethod"
                value={formData.investigationMethod}
                onChange={(e) => setFormData(prev => ({ ...prev, investigationMethod: e.target.value }))}
                placeholder="Describe how the investigation was conducted"
                required
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Link href="/dashboard/investigations">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" disabled={loading}>
            {loading ? (
              "Creating..."
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Create Investigation
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Image Annotation Modal */}
      {annotatingFile !== null && files[annotatingFile] && (
        <ImageAnnotation
          imageUrl={files[annotatingFile].url!}
          fileName={files[annotatingFile].file.name}
          onAnnotationComplete={(annotations) => handleAnnotationComplete(annotatingFile, annotations)}
          onCancel={handleAnnotationCancel}
          initialAnnotations={files[annotatingFile].annotations}
        />
      )}
    </div>
  );
}