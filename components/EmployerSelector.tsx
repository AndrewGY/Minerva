"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Building } from "lucide-react";

interface Employer {
  _id: string;
  name: string;
  registrationNumber?: string;
  industry: string;
  companySize: string;
  address?: {
    street?: string;
    city?: string;
    region?: string;
    country?: string;
    postalCode?: string;
  };
  primaryContact?: {
    name?: string;
    position?: string;
    email?: string;
    phone?: string;
  };
  complianceStatus?: string;
  riskScore?: number;
}

interface EmployerSelectorProps {
  value?: string;
  onSelect: (employer: Employer) => void;
  required?: boolean;
}

export default function EmployerSelector({ value, onSelect, required = false }: EmployerSelectorProps) {
  const [employers, setEmployers] = useState<Employer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newEmployer, setNewEmployer] = useState({
    name: "",
    registrationNumber: "",
    industry: "",
    companySize: "",
    address: {
      street: "",
      city: "",
      region: "",
      country: "Guyana",
      postalCode: "",
    },
    primaryContact: {
      name: "",
      position: "",
      email: "",
      phone: "",
    },
    complianceStatus: "pending",
  });

  useEffect(() => {
    fetchEmployers();
  }, []);

  const fetchEmployers = async () => {
    try {
      const response = await fetch("/api/employers?active=true");
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
        setEmployers([...employers, created]);
        onSelect(created);
        setShowNewDialog(false);
        setNewEmployer({
          name: "",
          registrationNumber: "",
          industry: "",
          companySize: "",
          address: {
            street: "",
            city: "",
            region: "",
            country: "Guyana",
            postalCode: "",
          },
          primaryContact: {
            name: "",
            position: "",
            email: "",
            phone: "",
          },
          complianceStatus: "pending",
              });
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

  const selectedEmployer = employers.find(e => e._id === value);

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="employer">
          Employer/Company {required && <span className="text-red-500">*</span>}
        </Label>
        <div className="flex gap-2">
          <Select
            value={value}
            onValueChange={(val) => {
              const employer = employers.find(e => e._id === val);
              if (employer) onSelect(employer);
            }}
            disabled={loading}
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder={loading ? "Loading employers..." : "Select an employer"}>
                {selectedEmployer && (
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4" />
                    {selectedEmployer.name}
                  </div>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {employers.map((employer) => (
                <SelectItem key={employer._id} value={employer._id}>
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4" />
                    <div>
                      <div className="font-medium">{employer.name}</div>
                      <div className="text-xs text-gray-500">
                        {employer.industry} • {employer.companySize}
                      </div>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={() => setShowNewDialog(true)}
            title="Add new employer"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Employer</DialogTitle>
            <p className="text-sm text-slate-600">Create a comprehensive employer record for future investigations.</p>
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
                <div className="grid gap-2">
                  <Label htmlFor="registrationNumber">Company Registration Number</Label>
                  <Input
                    id="registrationNumber"
                    value={newEmployer.registrationNumber}
                    onChange={(e) => setNewEmployer({ ...newEmployer, registrationNumber: e.target.value })}
                    placeholder="Enter registration number"
                  />
                </div>
              </div>
            </div>

            {/* Address Information */}
            <div className="space-y-4">
              <h4 className="font-medium text-slate-900">Company Address</h4>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="street">Street Address</Label>
                  <Input
                    id="street"
                    value={newEmployer.address.street}
                    onChange={(e) => setNewEmployer({ 
                      ...newEmployer, 
                      address: { ...newEmployer.address, street: e.target.value }
                    })}
                    placeholder="Street address"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={newEmployer.address.city}
                      onChange={(e) => setNewEmployer({ 
                        ...newEmployer, 
                        address: { ...newEmployer.address, city: e.target.value }
                      })}
                      placeholder="City"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="region">Region</Label>
                    <Input
                      id="region"
                      value={newEmployer.address.region}
                      onChange={(e) => setNewEmployer({ 
                        ...newEmployer, 
                        address: { ...newEmployer.address, region: e.target.value }
                      })}
                      placeholder="Region"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="postalCode">Postal Code</Label>
                    <Input
                      id="postalCode"
                      value={newEmployer.address.postalCode}
                      onChange={(e) => setNewEmployer({ 
                        ...newEmployer, 
                        address: { ...newEmployer.address, postalCode: e.target.value }
                      })}
                      placeholder="Postal code"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Primary Contact */}
            <div className="space-y-4">
              <h4 className="font-medium text-slate-900">Primary Contact</h4>
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="contactName">Contact Name</Label>
                    <Input
                      id="contactName"
                      value={newEmployer.primaryContact.name}
                      onChange={(e) => setNewEmployer({ 
                        ...newEmployer, 
                        primaryContact: { ...newEmployer.primaryContact, name: e.target.value }
                      })}
                      placeholder="Contact person name"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="contactPosition">Position</Label>
                    <Input
                      id="contactPosition"
                      value={newEmployer.primaryContact.position}
                      onChange={(e) => setNewEmployer({ 
                        ...newEmployer, 
                        primaryContact: { ...newEmployer.primaryContact, position: e.target.value }
                      })}
                      placeholder="Job title/position"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="contactEmail">Email</Label>
                    <Input
                      id="contactEmail"
                      type="email"
                      value={newEmployer.primaryContact.email}
                      onChange={(e) => setNewEmployer({ 
                        ...newEmployer, 
                        primaryContact: { ...newEmployer.primaryContact, email: e.target.value }
                      })}
                      placeholder="contact@company.com"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="contactPhone">Phone</Label>
                    <Input
                      id="contactPhone"
                      type="tel"
                      value={newEmployer.primaryContact.phone}
                      onChange={(e) => setNewEmployer({ 
                        ...newEmployer, 
                        primaryContact: { ...newEmployer.primaryContact, phone: e.target.value }
                      })}
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
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateEmployer} 
              disabled={creating || !newEmployer.name || !newEmployer.industry || !newEmployer.companySize}
            >
              {creating ? "Creating..." : "Create Employer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}