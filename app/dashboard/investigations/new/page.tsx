"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Plus, Trash2, Save } from "lucide-react";

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
  gender?: string;
  position?: string;
  department?: string;
  employeeId?: string;
  status: string;
  injuryType?: string;
  injurySeverity?: string;
  causeOfDeath?: string;
  hospitalName?: string;
  treatmentDetails?: string;
  contactNumber?: string;
  nextOfKinName?: string;
  nextOfKinContact?: string;
  notes?: string;
}

interface EmployerInfo {
  companyName: string;
  companyRegistrationNumber: string;
  industry: string;
  companySize: string;
  primaryContact: {
    name: string;
    position: string;
    email: string;
    phone: string;
  };
  safetyOfficer: {
    name: string;
    position: string;
    email: string;
    phone: string;
    certifications: string[];
  };
  address: {
    street: string;
    city: string;
    region: string;
    country: string;
    postalCode: string;
  };
  previousIncidents: number;
  lastSafetyAuditDate: string;
  safetyRating: string;
  complianceStatus: string;
  insuranceProvider: string;
  insurancePolicyNumber: string;
  notes: string;
}

export default function NewInvestigationPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  
  // Form data
  const [formData, setFormData] = useState({
    originalReportId: searchParams.get('reportId') || '',
    title: '',
    investigationStartDate: new Date().toISOString().split('T')[0],
    investigationEndDate: '',
    incidentCause: '',
    rootCauses: [''],
    contributingFactors: [''],
    totalPeopleAffected: 0,
    investigationMethod: '',
    evidenceCollected: [''],
    witnessStatements: [''],
    expertConsultations: [''],
    environmentalDamage: '',
    cleanupRequired: false,
    cleanupStatus: '',
    estimatedCleanupCost: '',
    estimatedDirectCosts: '',
    estimatedIndirectCosts: '',
    insuranceClaim: false,
    claimAmount: '',
    regulatoryNotificationRequired: false,
    regulatoryBodiesNotified: [''],
    complianceIssues: [''],
    immediateActions: [''],
    shortTermActions: [''],
    longTermActions: [''],
    preventiveMeasures: [''],
  });

  // Employer information
  const [employerInfo, setEmployerInfo] = useState({
    companyName: '',
    companyRegistrationNumber: '',
    industry: '',
    companySize: 'MEDIUM',
    primaryContact: {
      name: '',
      position: '',
      email: '',
      phone: ''
    },
    safetyOfficer: {
      name: '',
      position: '',
      email: '',
      phone: '',
      certifications: ['']
    },
    address: {
      street: '',
      city: '',
      region: '',
      country: 'Guyana',
      postalCode: ''
    },
    previousIncidents: 0,
    lastSafetyAuditDate: '',
    safetyRating: '',
    complianceStatus: 'UNDER_REVIEW',
    insuranceProvider: '',
    insurancePolicyNumber: '',
    notes: ''
  });

  const [casualties, setCasualties] = useState<Casualty[]>([
    {
      name: '',
      status: 'INJURED',
    }
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

  const updateCasualty = (index: number, field: string, value: string | number) => {
    const updated = [...casualties];
    updated[index] = { ...updated[index], [field]: value };
    setCasualties(updated);
  };

  const addArrayItem = (field: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: [...(prev[field] as string[]), '']
    }));
  };

  const removeArrayItem = (field: string, index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: (prev[field] as string[]).filter((_, i) => i !== index)
    }));
  };

  const updateArrayItem = (field: string, index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: (prev[field] as string[]).map((item, i) => i === index ? value : item)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.originalReportId || !formData.title) return;

    setLoading(true);
    try {
      const payload = {
        ...formData,
        employerInfo: {
          ...employerInfo,
          safetyOfficer: {
            ...employerInfo.safetyOfficer,
            certifications: employerInfo.safetyOfficer.certifications.filter(c => c.trim())
          },
          previousIncidents: typeof employerInfo.previousIncidents === 'string' ? parseInt(employerInfo.previousIncidents) || 0 : employerInfo.previousIncidents,
          lastSafetyAuditDate: employerInfo.lastSafetyAuditDate || undefined
        },
        casualties: casualties.filter(c => c.name.trim()),
        totalPeopleAffected: casualties.filter(c => c.name.trim()).length,
        rootCauses: formData.rootCauses.filter(c => c.trim()),
        contributingFactors: formData.contributingFactors.filter(c => c.trim()),
        evidenceCollected: formData.evidenceCollected.filter(c => c.trim()),
        witnessStatements: formData.witnessStatements.filter(c => c.trim()),
        expertConsultations: formData.expertConsultations.filter(c => c.trim()),
        regulatoryBodiesNotified: formData.regulatoryBodiesNotified.filter(c => c.trim()),
        complianceIssues: formData.complianceIssues.filter(c => c.trim()),
        immediateActions: formData.immediateActions.filter(c => c.trim()),
        shortTermActions: formData.shortTermActions.filter(c => c.trim()),
        longTermActions: formData.longTermActions.filter(c => c.trim()),
        preventiveMeasures: formData.preventiveMeasures.filter(c => c.trim()),
        estimatedCleanupCost: formData.estimatedCleanupCost ? parseFloat(formData.estimatedCleanupCost) : undefined,
        estimatedDirectCosts: formData.estimatedDirectCosts ? parseFloat(formData.estimatedDirectCosts) : undefined,
        estimatedIndirectCosts: formData.estimatedIndirectCosts ? parseFloat(formData.estimatedIndirectCosts) : undefined,
        claimAmount: formData.claimAmount ? parseFloat(formData.claimAmount) : undefined,
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
            {/* Company Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="companyName">Company Name *</Label>
                <Input
                  id="companyName"
                  value={employerInfo.companyName}
                  onChange={(e) => setEmployerInfo(prev => ({ ...prev, companyName: e.target.value }))}
                  placeholder="Enter company name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="companyRegistrationNumber">Registration Number</Label>
                <Input
                  id="companyRegistrationNumber"
                  value={employerInfo.companyRegistrationNumber}
                  onChange={(e) => setEmployerInfo(prev => ({ ...prev, companyRegistrationNumber: e.target.value }))}
                  placeholder="Company registration number"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="industry">Industry *</Label>
                <Select
                  value={employerInfo.industry}
                  onValueChange={(value) => setEmployerInfo(prev => ({ ...prev, industry: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Mining">Mining</SelectItem>
                    <SelectItem value="Oil & Gas">Oil & Gas</SelectItem>
                    <SelectItem value="Construction">Construction</SelectItem>
                    <SelectItem value="Manufacturing">Manufacturing</SelectItem>
                    <SelectItem value="Agriculture">Agriculture</SelectItem>
                    <SelectItem value="Forestry">Forestry</SelectItem>
                    <SelectItem value="Transportation">Transportation</SelectItem>
                    <SelectItem value="Healthcare">Healthcare</SelectItem>
                    <SelectItem value="Education">Education</SelectItem>
                    <SelectItem value="Tourism">Tourism</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="companySize">Company Size *</Label>
                <Select
                  value={employerInfo.companySize}
                  onValueChange={(value) => setEmployerInfo(prev => ({ ...prev, companySize: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SMALL">Small (< 50 employees)</SelectItem>
                    <SelectItem value="MEDIUM">Medium (50-249 employees)</SelectItem>
                    <SelectItem value="LARGE">Large (250-999 employees)</SelectItem>
                    <SelectItem value="ENTERPRISE">Enterprise (1000+ employees)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Company Address */}
            <div>
              <h4 className="font-medium mb-3">Company Address</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="street">Street Address *</Label>
                  <Input
                    id="street"
                    value={employerInfo.address.street}
                    onChange={(e) => setEmployerInfo(prev => ({
                      ...prev,
                      address: { ...prev.address, street: e.target.value }
                    }))}
                    placeholder="Street address"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={employerInfo.address.city}
                    onChange={(e) => setEmployerInfo(prev => ({
                      ...prev,
                      address: { ...prev.address, city: e.target.value }
                    }))}
                    placeholder="City"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="region">Region *</Label>
                  <Select
                    value={employerInfo.address.region}
                    onValueChange={(value) => setEmployerInfo(prev => ({
                      ...prev,
                      address: { ...prev.address, region: value }
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select region" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Barima-Waini">Barima-Waini</SelectItem>
                      <SelectItem value="Cuyuni-Mazaruni">Cuyuni-Mazaruni</SelectItem>
                      <SelectItem value="Demerara-Mahaica">Demerara-Mahaica</SelectItem>
                      <SelectItem value="East Berbice-Corentyne">East Berbice-Corentyne</SelectItem>
                      <SelectItem value="Essequibo Islands-West Demerara">Essequibo Islands-West Demerara</SelectItem>
                      <SelectItem value="Mahaica-Berbice">Mahaica-Berbice</SelectItem>
                      <SelectItem value="Pomeroon-Supenaam">Pomeroon-Supenaam</SelectItem>
                      <SelectItem value="Potaro-Siparuni">Potaro-Siparuni</SelectItem>
                      <SelectItem value="Upper Demerara-Berbice">Upper Demerara-Berbice</SelectItem>
                      <SelectItem value="Upper Takutu-Upper Essequibo">Upper Takutu-Upper Essequibo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Primary Contact */}
            <div>
              <h4 className="font-medium mb-3">Primary Contact</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="primaryContactName">Name *</Label>
                  <Input
                    id="primaryContactName"
                    value={employerInfo.primaryContact.name}
                    onChange={(e) => setEmployerInfo(prev => ({
                      ...prev,
                      primaryContact: { ...prev.primaryContact, name: e.target.value }
                    }))}
                    placeholder="Contact person name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="primaryContactPosition">Position *</Label>
                  <Input
                    id="primaryContactPosition"
                    value={employerInfo.primaryContact.position}
                    onChange={(e) => setEmployerInfo(prev => ({
                      ...prev,
                      primaryContact: { ...prev.primaryContact, position: e.target.value }
                    }))}
                    placeholder="Job title"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="primaryContactEmail">Email *</Label>
                  <Input
                    id="primaryContactEmail"
                    type="email"
                    value={employerInfo.primaryContact.email}
                    onChange={(e) => setEmployerInfo(prev => ({
                      ...prev,
                      primaryContact: { ...prev.primaryContact, email: e.target.value }
                    }))}
                    placeholder="email@company.com"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="primaryContactPhone">Phone *</Label>
                  <Input
                    id="primaryContactPhone"
                    value={employerInfo.primaryContact.phone}
                    onChange={(e) => setEmployerInfo(prev => ({
                      ...prev,
                      primaryContact: { ...prev.primaryContact, phone: e.target.value }
                    }))}
                    placeholder="Phone number"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Safety Information */}
            <div>
              <h4 className="font-medium mb-3">Safety & Compliance</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="previousIncidents">Previous Incidents (Count)</Label>
                  <Input
                    id="previousIncidents"
                    type="number"
                    min="0"
                    value={employerInfo.previousIncidents}
                    onChange={(e) => setEmployerInfo(prev => ({ 
                      ...prev, 
                      previousIncidents: parseInt(e.target.value) || 0 
                    }))}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="safetyRating">Safety Rating</Label>
                  <Select
                    value={employerInfo.safetyRating}
                    onValueChange={(value) => setEmployerInfo(prev => ({ ...prev, safetyRating: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select rating" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EXCELLENT">Excellent</SelectItem>
                      <SelectItem value="GOOD">Good</SelectItem>
                      <SelectItem value="FAIR">Fair</SelectItem>
                      <SelectItem value="POOR">Poor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="complianceStatus">Compliance Status *</Label>
                  <Select
                    value={employerInfo.complianceStatus}
                    onValueChange={(value) => setEmployerInfo(prev => ({ ...prev, complianceStatus: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="COMPLIANT">Compliant</SelectItem>
                      <SelectItem value="NON_COMPLIANT">Non-Compliant</SelectItem>
                      <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
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
                      onChange={(e) => updateCasualty(index, 'age', parseInt(e.target.value) || '')}
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
    </div>
  );
}