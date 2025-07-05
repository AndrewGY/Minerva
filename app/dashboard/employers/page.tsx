"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  Building, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Filter,
  Users,
  Shield,
  Phone,
  Mail,
  MapPin
} from "lucide-react";

interface Employer {
  _id: string;
  name: string;
  industry: string;
  companySize: string;
  address?: string;
  contactEmail?: string;
  contactPhone?: string;
  complianceStatus?: string;
  riskScore?: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function EmployersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [employers, setEmployers] = useState<Employer[]>([]);
  const [filteredEmployers, setFilteredEmployers] = useState<Employer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [industryFilter, setIndustryFilter] = useState("all");
  const [complianceFilter, setComplianceFilter] = useState("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingEmployer, setEditingEmployer] = useState<Employer | null>(null);
  const [creating, setCreating] = useState(false);

  const [newEmployer, setNewEmployer] = useState({
    name: "",
    industry: "",
    companySize: "",
    address: "",
    contactEmail: "",
    contactPhone: "",
    complianceStatus: "pending",
  });

  useEffect(() => {
    if (status === "loading") return;
    
    if (!session || (session.user as any)?.role !== "ADMIN") {
      router.push("/login");
      return;
    }

    fetchEmployers();
  }, [session, status, router]);

  useEffect(() => {
    filterEmployers();
  }, [employers, searchTerm, industryFilter, complianceFilter]);

  const fetchEmployers = async () => {
    try {
      const response = await fetch("/api/employers");
      if (response.ok) {
        const data = await response.json();
        setEmployers(data);
      }
    } catch (error) {
      console.error("Failed to fetch employers:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterEmployers = () => {
    let filtered = employers.filter(employer => 
      employer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employer.industry.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (industryFilter !== "all") {
      filtered = filtered.filter(employer => employer.industry === industryFilter);
    }

    if (complianceFilter !== "all") {
      filtered = filtered.filter(employer => employer.complianceStatus === complianceFilter);
    }

    setFilteredEmployers(filtered);
  };

  const handleCreateEmployer = async () => {
    if (!newEmployer.name || !newEmployer.industry || !newEmployer.companySize) {
      return;
    }

    setCreating(true);
    try {
      const response = await fetch("/api/employers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEmployer),
      });

      if (response.ok) {
        const created = await response.json();
        setEmployers([created, ...employers]);
        setShowCreateDialog(false);
        resetForm();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to create employer");
      }
    } catch (error) {
      console.error("Failed to create employer:", error);
      alert("Failed to create employer");
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateEmployer = async () => {
    if (!editingEmployer || !newEmployer.name || !newEmployer.industry || !newEmployer.companySize) {
      return;
    }

    setCreating(true);
    try {
      const response = await fetch(`/api/employers/${editingEmployer._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEmployer),
      });

      if (response.ok) {
        const updated = await response.json();
        setEmployers(employers.map(emp => emp._id === updated._id ? updated : emp));
        setEditingEmployer(null);
        resetForm();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to update employer");
      }
    } catch (error) {
      console.error("Failed to update employer:", error);
      alert("Failed to update employer");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteEmployer = async (id: string) => {
    if (!confirm("Are you sure you want to deactivate this employer?")) {
      return;
    }

    try {
      const response = await fetch(`/api/employers/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setEmployers(employers.map(emp => 
          emp._id === id ? { ...emp, active: false } : emp
        ));
      } else {
        const error = await response.json();
        alert(error.error || "Failed to deactivate employer");
      }
    } catch (error) {
      console.error("Failed to deactivate employer:", error);
      alert("Failed to deactivate employer");
    }
  };

  const resetForm = () => {
    setNewEmployer({
      name: "",
      industry: "",
      companySize: "",
      address: "",
      contactEmail: "",
      contactPhone: "",
      complianceStatus: "pending",
      });
  };

  const openEditDialog = (employer: Employer) => {
    setEditingEmployer(employer);
    setNewEmployer({
      name: employer.name,
      industry: employer.industry,
      companySize: employer.companySize,
      address: employer.address || "",
      contactEmail: employer.contactEmail || "",
      contactPhone: employer.contactPhone || "",
      complianceStatus: employer.complianceStatus || "pending",
    });
    setShowCreateDialog(true);
  };

  const getComplianceColor = (status?: string) => {
    switch (status) {
      case "compliant": return "bg-green-100 text-green-800";
      case "non-compliant": return "bg-red-100 text-red-800";
      default: return "bg-yellow-100 text-yellow-800";
    }
  };


  const industries = Array.from(new Set(employers.map(e => e.industry)));

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-200 border-b-slate-800 mx-auto mb-6"></div>
          <p className="text-slate-600 text-lg font-medium">Loading employers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl flex items-center justify-center shadow-lg">
              <Building className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Employer Management</h1>
              <p className="text-lg text-slate-600 mt-1">Manage companies and organizations in the HSSE system</p>
            </div>
          </div>
          <div className="w-24 h-1 bg-gradient-to-r from-slate-800 to-slate-600 rounded-full"></div>
        </div>

        {/* Controls */}
        <div className="flex flex-col lg:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search employers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={industryFilter} onValueChange={setIndustryFilter}>
            <SelectTrigger className="w-48">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter by industry" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Industries</SelectItem>
              {industries.map(industry => (
                <SelectItem key={industry} value={industry}>
                  {industry.charAt(0).toUpperCase() + industry.slice(1).replace('-', ' & ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={complianceFilter} onValueChange={setComplianceFilter}>
            <SelectTrigger className="w-48">
              <Shield className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter by compliance" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Compliance Status</SelectItem>
              <SelectItem value="compliant">Compliant</SelectItem>
              <SelectItem value="non-compliant">Non-Compliant</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            onClick={() => setShowCreateDialog(true)}
            className="bg-slate-900 hover:bg-slate-800"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Employer
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white shadow-sm border border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Employers</p>
                  <p className="text-3xl font-bold text-slate-900">{employers.length}</p>
                </div>
                <Building className="w-8 h-8 text-slate-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white shadow-sm border border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Active</p>
                  <p className="text-3xl font-bold text-green-600">{employers.filter(e => e.active).length}</p>
                </div>
                <Users className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white shadow-sm border border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Compliant</p>
                  <p className="text-3xl font-bold text-green-600">{employers.filter(e => e.complianceStatus === 'compliant').length}</p>
                </div>
                <Shield className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white shadow-sm border border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Industries</p>
                  <p className="text-3xl font-bold text-slate-600">{industries.length}</p>
                </div>
                <Building className="w-8 h-8 text-slate-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Employers Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredEmployers.map((employer) => (
            <Card key={employer._id} className={`bg-white shadow-sm border transition-all duration-200 hover:shadow-md ${!employer.active ? 'opacity-60' : ''}`}>
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg font-semibold text-slate-900 mb-2">
                      {employer.name}
                      {!employer.active && <span className="text-red-500 text-sm ml-2">(Inactive)</span>}
                    </CardTitle>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="text-xs">
                        {employer.industry.replace('-', ' & ')}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {employer.companySize}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => openEditDialog(employer)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    {employer.active && (
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => handleDeleteEmployer(employer._id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {employer.address && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <MapPin className="w-4 h-4" />
                      <span className="truncate">{employer.address}</span>
                    </div>
                  )}
                  {employer.contactEmail && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Mail className="w-4 h-4" />
                      <span className="truncate">{employer.contactEmail}</span>
                    </div>
                  )}
                  {employer.contactPhone && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Phone className="w-4 h-4" />
                      <span>{employer.contactPhone}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <div className="flex gap-2">
                      {employer.complianceStatus && (
                        <Badge className={getComplianceColor(employer.complianceStatus)}>
                          {employer.complianceStatus}
                        </Badge>
                      )}
                    </div>
                    {employer.riskScore !== undefined && (
                      <div className="text-sm text-slate-600">
                        Risk: <span className="font-medium">{employer.riskScore}</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredEmployers.length === 0 && (
          <div className="text-center py-12">
            <Building className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No employers found</h3>
            <p className="text-slate-600">Try adjusting your search or filter criteria</p>
          </div>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={(open) => {
          setShowCreateDialog(open);
          if (!open) {
            setEditingEmployer(null);
            resetForm();
          }
        }}>
          <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingEmployer ? "Edit Employer" : "Add New Employer"}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              {/* Basic Information */}
              <div className="space-y-4">
                <h4 className="font-medium text-slate-900">Basic Information</h4>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Company Name *</Label>
                    <Input
                      id="name"
                      value={newEmployer.name}
                      onChange={(e) => setNewEmployer({ ...newEmployer, name: e.target.value })}
                      placeholder="Enter company name"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="industry">Industry *</Label>
                      <Select
                        value={newEmployer.industry}
                        onValueChange={(val) => setNewEmployer({ ...newEmployer, industry: val })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select industry" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mining">Mining</SelectItem>
                          <SelectItem value="construction">Construction</SelectItem>
                          <SelectItem value="manufacturing">Manufacturing</SelectItem>
                          <SelectItem value="oil-gas">Oil & Gas</SelectItem>
                          <SelectItem value="healthcare">Healthcare</SelectItem>
                          <SelectItem value="transportation">Transportation</SelectItem>
                          <SelectItem value="agriculture">Agriculture</SelectItem>
                          <SelectItem value="retail">Retail</SelectItem>
                          <SelectItem value="technology">Technology</SelectItem>
                          <SelectItem value="education">Education</SelectItem>
                          <SelectItem value="hospitality">Hospitality</SelectItem>
                          <SelectItem value="utilities">Utilities</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="companySize">Company Size *</Label>
                      <Select
                        value={newEmployer.companySize}
                        onValueChange={(val) => setNewEmployer({ ...newEmployer, companySize: val })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select size" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="small">Small (&lt;50)</SelectItem>
                          <SelectItem value="medium">Medium (50-249)</SelectItem>
                          <SelectItem value="large">Large (250-999)</SelectItem>
                          <SelectItem value="enterprise">Enterprise (1000+)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-4">
                <h4 className="font-medium text-slate-900">Contact Information</h4>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="address">Company Address</Label>
                    <Input
                      id="address"
                      value={newEmployer.address}
                      onChange={(e) => setNewEmployer({ ...newEmployer, address: e.target.value })}
                      placeholder="Enter full company address"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="contactEmail">Primary Contact Email</Label>
                      <Input
                        id="contactEmail"
                        type="email"
                        value={newEmployer.contactEmail}
                        onChange={(e) => setNewEmployer({ ...newEmployer, contactEmail: e.target.value })}
                        placeholder="safety@company.com"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="contactPhone">Primary Contact Phone</Label>
                      <Input
                        id="contactPhone"
                        type="tel"
                        value={newEmployer.contactPhone}
                        onChange={(e) => setNewEmployer({ ...newEmployer, contactPhone: e.target.value })}
                        placeholder="+592 XXX-XXXX"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Safety & Compliance */}
              <div className="space-y-4">
                <h4 className="font-medium text-slate-900">Safety & Compliance</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="complianceStatus">Compliance Status</Label>
                    <Select
                      value={newEmployer.complianceStatus}
                      onValueChange={(val) => setNewEmployer({ ...newEmployer, complianceStatus: val })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="compliant">Compliant</SelectItem>
                        <SelectItem value="non-compliant">Non-Compliant</SelectItem>
                        <SelectItem value="pending">Pending Review</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={editingEmployer ? handleUpdateEmployer : handleCreateEmployer}
                disabled={creating || !newEmployer.name || !newEmployer.industry || !newEmployer.companySize}
              >
                {creating ? "Saving..." : (editingEmployer ? "Update Employer" : "Create Employer")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}