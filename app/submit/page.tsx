"use client";

import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import ReCAPTCHA from "react-google-recaptcha";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Upload, X, CheckCircle, ChevronDown, ChevronUp, Copy, ExternalLink, Target, WifiOff, Wifi, Save, Clock } from "lucide-react";
import ImageAnnotation from "@/components/ImageAnnotation";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import { Checkbox } from "@/components/ui/checkbox";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { offlineStorage } from "@/lib/offline-storage";

const schema = z.object({
  incidentDate: z.union([z.string(), z.null(), z.undefined()]).transform(val => val || new Date().toISOString().split('T')[0]),
  incidentTime: z.union([z.string(), z.null(), z.undefined()]).transform(val => val || new Date().toTimeString().slice(0, 5)),
  location: z.object({
    address: z.union([z.string(), z.null(), z.undefined()]).transform(val => val || ""),
    lat: z.union([z.number(), z.null(), z.undefined()]).transform(val => val || 0),
    lng: z.union([z.number(), z.null(), z.undefined()]).transform(val => val || 0),
    details: z.union([z.string(), z.null(), z.undefined()]).transform(val => val || ""),
  }),
  skipAddressEntry: z.union([z.boolean(), z.null(), z.undefined()]).transform(val => val || false),
  industry: z.union([z.string(), z.null(), z.undefined()]).transform(val => val || ""),
  incidentType: z.union([z.string(), z.null(), z.undefined()]).transform(val => val || ""),
  regulationBreached: z.union([z.string(), z.null(), z.undefined()]).transform(val => val || ""),
  severityLevel: z.union([z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]), z.null(), z.undefined()]).transform(val => val || "MEDIUM"),
  description: z.union([z.string(), z.null(), z.undefined()]).transform(val => val || "Incident occurred"),
  reporterEmail: z.union([z.string(), z.null(), z.undefined()]).transform(val => val || ""),
  reporterPhone: z.union([z.string(), z.null(), z.undefined()]).transform(val => val || ""),
  isAnonymous: z.union([z.boolean(), z.null(), z.undefined()]).transform(val => val !== false),
});

type FormData = z.infer<typeof schema>;

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
// probably should have used a proper type library for this

export default function SubmitReport() {
  const [files, setFiles] = useState<FileWithAnnotations[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [publicId, setPublicId] = useState("");
  const [error, setError] = useState("");
  const [showAdditional, setShowAdditional] = useState(false);
  const [copied, setCopied] = useState(false);
  const [annotatingFile, setAnnotatingFile] = useState<number | null>(null);
  const [skipAddressEntry, setSkipAddressEntry] = useState(false);
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  // Offline functionality
  const { isOnline, isSlowConnection } = useOnlineStatus();
  const { pendingCount, isProcessing: isSyncing } = useOfflineSync();
  const [reportId] = useState(() => `draft-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [savedOffline, setSavedOffline] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: {
      incidentDate: new Date().toISOString().split('T')[0],
      incidentTime: new Date().toTimeString().slice(0, 5),
      isAnonymous: true,
      severityLevel: "MEDIUM",
      location: { address: "", lat: 0, lng: 0, details: "" },
      skipAddressEntry: false,
      description: "",
      reporterEmail: "",
      reporterPhone: "",
      industry: "",
      incidentType: "",
      regulationBreached: "",
    },
  });

  // Auto-save functionality
  const autoSave = async () => {
    try {
      setAutoSaving(true);
      const formData = form.getValues();
      await offlineStorage.saveReport(reportId, formData, files.map(f => f.file));
      setLastSaved(new Date());
      setSavedOffline(true);
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      setAutoSaving(false);
    }
  };

  // Load saved draft on component mount
  useEffect(() => {
    const loadSavedDraft = async () => {
      try {
        const savedReport = await offlineStorage.getReport(reportId);
        if (savedReport) {
          // Restore form data
          Object.entries(savedReport.formData).forEach(([key, value]) => {
            form.setValue(key as any, value);
          });

          // Restore files
          const restoredFiles = savedReport.files.map(savedFile => ({
            file: offlineStorage.base64ToFile(savedFile.data, savedFile.name, savedFile.type),
            annotations: savedFile.annotations || [],
            url: URL.createObjectURL(offlineStorage.base64ToFile(savedFile.data, savedFile.name, savedFile.type))
          }));
          setFiles(restoredFiles);
          
          setLastSaved(new Date(savedReport.lastModified));
          setSavedOffline(true);
        }
      } catch (error) {
        console.error('Failed to load draft:', error);
      }
    };

    loadSavedDraft();
  }, [reportId, form]);

  // Auto-save on form changes
  useEffect(() => {
    const subscription = form.watch(() => {
      const timeoutId = setTimeout(autoSave, 2000); // Debounce 2 seconds
      return () => clearTimeout(timeoutId);
    });
    return () => subscription.unsubscribe();
  }, [form, files]);

  // Auto-save when files change
  useEffect(() => {
    if (files.length > 0) {
      const timeoutId = setTimeout(autoSave, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [files]);

  const handleLocationSelect = (locationData: { address: string; lat: number; lng: number }) => {
    form.setValue("location.address", locationData.address);
    form.setValue("location.lat", locationData.lat);
    form.setValue("location.lng", locationData.lng);
  };

  const handleSkipAddressChange = (checked: boolean) => {
    setSkipAddressEntry(checked);
    if (checked) {
      // Clear address data when skipping
      form.setValue("location.address", "Manual location entry");
      form.setValue("location.lat", 0);
      form.setValue("location.lng", 0);
    } else {
      // Reset when re-enabling address entry
      form.setValue("location.address", "");
      form.setValue("location.lat", 0);
      form.setValue("location.lng", 0);
    }
  };

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    
    const newFiles = Array.from(e.target.files);
    const valid = newFiles.filter(file => {
      const types = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/avi', 'application/pdf'];
      const size = 10 * 1024 * 1024;
      return types.includes(file.type) && file.size <= size;
    });
    
    if (valid.length !== newFiles.length) {
      setError("Some files rejected. Use images, videos, or PDFs under 10MB.");
    }
    
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

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const onSubmit = async (data: FormData) => {
    setError("");
    setSubmitting(true);

    try {
      if (!isOnline) {
        // Save for offline submission
        await offlineStorage.markForSubmission(reportId);
        setPublicId(reportId);
        setSubmitted(true);
        setSavedOffline(true);
        return;
      }

      // Online submission
      const uploadedFiles = [];
      for (const fileWithAnnotations of files) {
        const formData = new FormData();
        formData.append('file', fileWithAnnotations.file);
        
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        
        if (!res.ok) {
          throw new Error('File upload failed. Saving offline...');
        }
        
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

      const incidentDateTime = new Date(`${data.incidentDate}T${data.incidentTime}`);
      const submitData = {
        ...data,
        incidentDate: incidentDateTime.toISOString(),
        attachments: uploadedFiles,
        recaptchaToken: "temp-disabled",
      };

      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Submission failed");
      }

      // Mark as successfully submitted
      await offlineStorage.markAsSubmitted(reportId);
      setPublicId(result.publicId);
      setSubmitted(true);
      form.reset();
      
      files.forEach(file => {
        if (file.url) {
          URL.revokeObjectURL(file.url);
        }
      });
      setFiles([]);
      
    } catch (err: any) {
      // Fallback to offline storage on any error
      try {
        await offlineStorage.markForSubmission(reportId);
        setPublicId(reportId);
        setSubmitted(true);
        setSavedOffline(true);
        setError("Saved offline - will sync when connection returns");
      } catch (offlineErr) {
        setError(err.message || "Submission failed and couldn't save offline");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    const statusUrl = `${window.location.origin}/status?id=${publicId}`;
    
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Card className="w-full max-w-lg text-center">
          <CardHeader>
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <CardTitle className={savedOffline ? "text-blue-700" : "text-green-700"}>
              {savedOffline ? "Report Saved Offline" : "Report Submitted Successfully"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-gray-600">
              {savedOffline 
                ? "Your report has been saved and will be automatically submitted when you're back online."
                : "Your report has been received and will be reviewed by our team."
              }
            </p>
            
            <div className="bg-gray-100 p-4 rounded-md">
              <p className="text-sm font-medium text-gray-700 mb-2">Reference ID:</p>
              <p className="text-lg font-mono text-blue-600 mb-3">{publicId}</p>
              
              <div className="border-t pt-3">
                <p className="text-sm font-medium text-gray-700 mb-2">Status Tracking Link:</p>
                <div className="flex items-center gap-2 bg-white p-2 rounded border">
                  <input
                    type="text"
                    value={statusUrl}
                    readOnly
                    className="flex-1 text-sm bg-transparent border-none outline-none text-gray-600"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(statusUrl)}
                    className="flex items-center gap-1"
                  >
                    {copied ? (
                      <>
                        <CheckCircle className="w-3 h-3" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <h3 className="font-medium text-blue-900 mb-2">What happens next?</h3>
              <p className="text-blue-800 text-sm">
                Our team will review your report and take the appropiate action. You can use the link above to track progress and receive updates.
              </p>
            </div>

            <div className="flex gap-3 justify-center">
              <Link href={`/status?id=${publicId}`}>
                <Button className="flex items-center gap-2">
                  <ExternalLink className="w-4 h-4" />
                  View Status
                </Button>
              </Link>
              <Link href="/submit">
                <Button variant="outline">Submit Another</Button>
              </Link>
            </div>

            <Link href="/" className="text-sm text-blue-600 hover:underline">
              Return to Home
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="text-xl font-bold text-gray-900">
              Minerva
            </Link>
            <Link href="/login">
              <Button variant="outline">Login</Button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Report Incident</h1>
          <p className="text-gray-600">
            Report safety incidents securely. All reports are treated confidentially.
          </p>

          {/* Offline Status & Auto-save Indicator */}
          <div className="mt-4 flex flex-wrap gap-3">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium ${
              isOnline 
                ? isSlowConnection 
                  ? 'bg-yellow-100 text-yellow-800' 
                  : 'bg-green-100 text-green-800'
                : 'bg-orange-100 text-orange-800'
            }`}>
              {isOnline ? (
                <>
                  <Wifi className="w-4 h-4" />
                  {isSlowConnection ? 'Slow Connection' : 'Online'}
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4" />
                  Offline Mode
                </>
              )}
            </div>

            {(savedOffline || lastSaved) && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                {autoSaving ? (
                  <>
                    <div className="w-4 h-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : 'Auto-saved'}
                  </>
                )}
              </div>
            )}

            {!isOnline && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                <Clock className="w-4 h-4" />
                Will sync when online
              </div>
            )}

            {isOnline && pendingCount > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium bg-amber-100 text-amber-800">
                {isSyncing ? (
                  <>
                    <div className="w-4 h-4 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
                    Syncing {pendingCount} report{pendingCount !== 1 ? 's' : ''}...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    {pendingCount} pending sync
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-red-800 font-medium">Error</h3>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Incident Details</CardTitle>
              <CardDescription>When and where did this happen?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    {...form.register("incidentDate")}
                    max={new Date().toISOString().split('T')[0]}
                  />
                  {form.formState.errors.incidentDate && (
                    <p className="text-red-600 text-sm mt-1">
                      {form.formState.errors.incidentDate.message}
                    </p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="time">Time</Label>
                  <Input
                    id="time"
                    type="time"
                    {...form.register("incidentTime")}
                  />
                  {form.formState.errors.incidentTime && (
                    <p className="text-red-600 text-sm mt-1">
                      {form.formState.errors.incidentTime.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2 flex-wrap">
                  <Checkbox 
                    id="skip-address"
                    checked={skipAddressEntry}
                    onCheckedChange={handleSkipAddressChange}
                  />
                  <Label htmlFor="skip-address" className="text-sm leading-relaxed">
                    Skip address lookup (manual location entry only)
                  </Label>
                </div>

                <AddressAutocomplete
                  onLocationSelect={handleLocationSelect}
                  value={form.watch("location.address")}
                  label="Location of Incident"
                  placeholder="Start typing a location in Guyana..."
                  required={!skipAddressEntry}
                  disabled={skipAddressEntry}
                />

                <div>
                  <Label htmlFor="location-details">
                    Location Details
                    {skipAddressEntry && <span className="text-red-500 ml-1">*</span>}
                  </Label>
                  <Textarea
                    id="location-details"
                    placeholder="Building, floor, room number, area, or specific location details..."
                    {...form.register("location.details")}
                    rows={3}
                    required={skipAddressEntry}
                  />
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    {skipAddressEntry 
                      ? "Provide detailed location information since address lookup is disabled"
                      : "Additional details about the specific location within the address"
                    }
                  </p>
                </div>

                {form.formState.errors.location?.address && (
                  <p className="text-red-600 text-sm mt-1">
                    {form.formState.errors.location.address.message}
                  </p>
                )}
                {form.formState.errors.location?.details && (
                  <p className="text-red-600 text-sm mt-1">
                    {form.formState.errors.location.details.message}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
              <CardDescription>What happened?</CardDescription>
            </CardHeader>
            <CardContent>
              <Label htmlFor="description">Details</Label>
              <Textarea
                id="description"
                placeholder="Describe what happened, who was involved, and any immediate actions taken"
                {...form.register("description")}
                rows={6}
                className="mt-2"
              />
              {form.formState.errors.description && (
                <p className="text-red-600 text-sm mt-1">
                  {form.formState.errors.description.message}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Evidence</CardTitle>
              <CardDescription>Photos, videos, or documents (optional)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600 mb-2">Upload files</p>
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*,application/pdf"
                  onChange={handleFiles}
                  className="hidden"
                  id="file-upload"
                />
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => document.getElementById('file-upload')?.click()}
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

          <Card>
            <CardHeader>
              <button
                type="button"
                onClick={() => setShowAdditional(!showAdditional)}
                className="flex items-center justify-between w-full text-left"
              >
                <div>
                  <CardTitle>Additional Fields</CardTitle>
                  <CardDescription>Classification and categorization (optional)</CardDescription>
                </div>
                {showAdditional ? (
                  <ChevronUp className="w-5 h-5 text-gray-500" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-500" />
                )}
              </button>
            </CardHeader>
            {showAdditional && (
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Incident Type</Label>
                    <Select onValueChange={(value) => form.setValue("incidentType", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="injury">Personal Injury</SelectItem>
                        <SelectItem value="near-miss">Near Miss</SelectItem>
                        <SelectItem value="property-damage">Property Damage</SelectItem>
                        <SelectItem value="environmental">Environmental</SelectItem>
                        <SelectItem value="security">Security</SelectItem>
                        <SelectItem value="fire">Fire/Explosion</SelectItem>
                        <SelectItem value="chemical">Chemical Exposure</SelectItem>
                        <SelectItem value="equipment">Equipment Failure</SelectItem>
                        <SelectItem value="compliance">Compliance</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    {form.formState.errors.incidentType && (
                      <p className="text-red-600 text-sm mt-1">
                        {form.formState.errors.incidentType.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label>Severity</Label>
                    <Select onValueChange={(value) => form.setValue("severityLevel", value as any)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select severity" />
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
                  <Label>Industry</Label>
                  <Select onValueChange={(value) => form.setValue("industry", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="construction">Construction</SelectItem>
                      <SelectItem value="manufacturing">Manufacturing</SelectItem>
                      <SelectItem value="oil-gas">Oil & Gas</SelectItem>
                      <SelectItem value="mining">Mining</SelectItem>
                      <SelectItem value="transportation">Transportation</SelectItem>
                      <SelectItem value="healthcare">Healthcare</SelectItem>
                      <SelectItem value="education">Education</SelectItem>
                      <SelectItem value="retail">Retail</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="regulation">Regulation/Policy</Label>
                  <Input
                    id="regulation"
                    placeholder="OSHA standard, company policy, etc."
                    {...form.register("regulationBreached")}
                  />
                </div>
              </CardContent>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact (Optional)</CardTitle>
              <CardDescription>Leave contact info for updates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="anonymous"
                  {...form.register("isAnonymous")}
                  className="h-4 w-4"
                />
                <Label htmlFor="anonymous">Submit anonymously</Label>
              </div>

              {!form.watch("isAnonymous") && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your.email@example.com"
                      {...form.register("reporterEmail")}
                    />
                    {form.formState.errors.reporterEmail && (
                      <p className="text-red-600 text-sm mt-1">
                        {form.formState.errors.reporterEmail.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+1 555 123 4567"
                      {...form.register("reporterPhone")}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>


{/* //  TODO: readd recaptcha later after putting on domain */}
          {/* <div className="flex justify-center">
            <ReCAPTCHA
              ref={recaptchaRef}
              size="invisible"
              sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!}
            />
          </div> */}

          <div className="flex justify-center pt-6">
            <Button
              type="submit"
              disabled={submitting}
              className="px-8 py-3 text-lg"
              size="lg"
            >
              {submitting ? "Submitting..." : "Submit Report"}
            </Button>
          </div>
          
          {/* Debug info */}
          {/* {Object.keys(form.formState.errors).length > 0 && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <h3 className="font-medium text-red-800 mb-2">Form Validation Errors:</h3>
              <pre className="text-sm text-red-700 whitespace-pre-wrap">
                {JSON.stringify(form.formState.errors, null, 2)}
              </pre>
            </div>
          )} */}
        </form>

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-md p-4">
          <h3 className="font-medium text-blue-900 mb-2">Privacy Notice</h3>
          <p className="text-blue-800 text-sm">
            All reports are confidential. Anonymous reports cannot be traced. Contact info is only used for updates.
          </p>
        </div>
      </div>

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