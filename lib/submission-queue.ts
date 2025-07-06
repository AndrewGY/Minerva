import { offlineStorage, type OfflineReport } from './offline-storage';

interface SubmissionResult {
  success: boolean;
  publicId?: string;
  error?: string;
}

class SubmissionQueue {
  private static instance: SubmissionQueue;
  private isProcessing = false;
  private retryAttempts = new Map<string, number>();
  private maxRetries = 3;
  private retryDelay = 5000; // 5 seconds

  private constructor() {}

  static getInstance(): SubmissionQueue {
    if (!SubmissionQueue.instance) {
      SubmissionQueue.instance = new SubmissionQueue();
    }
    return SubmissionQueue.instance;
  }

  async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    
    try {
      const pendingReports = await offlineStorage.getPendingReports();
      
      for (const report of pendingReports) {
        const attempts = this.retryAttempts.get(report.id) || 0;
        
        if (attempts >= this.maxRetries) {
          await offlineStorage.markAsFailed(report.id);
          this.retryAttempts.delete(report.id);
          continue;
        }

        try {
          const result = await this.submitReport(report);
          
          if (result.success) {
            await offlineStorage.markAsSubmitted(report.id);
            this.retryAttempts.delete(report.id);
            
            // Notify user of successful sync
            this.notifySubmissionSuccess(report.id, result.publicId);
          } else {
            throw new Error(result.error || 'Submission failed');
          }
        } catch (error) {
          this.retryAttempts.set(report.id, attempts + 1);
          
          if (attempts + 1 >= this.maxRetries) {
            await offlineStorage.markAsFailed(report.id);
            this.notifySubmissionFailure(report.id, error instanceof Error ? error.message : 'Unknown error');
          }
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async submitReport(report: OfflineReport): Promise<SubmissionResult> {
    try {
      // Upload files first
      const uploadedFiles = [];
      
      for (const savedFile of report.files) {
        const file = offlineStorage.base64ToFile(savedFile.data, savedFile.name, savedFile.type);
        const formData = new FormData();
        formData.append('file', file);
        
        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        
        if (!uploadResponse.ok) {
          throw new Error('File upload failed');
        }
        
        const uploadResult = await uploadResponse.json();
        uploadedFiles.push({
          url: uploadResult.url,
          fileName: savedFile.name,
          fileType: savedFile.type,
          fileSize: savedFile.size,
          annotations: savedFile.annotations || [],
        });
      }

      // Submit the report
      const incidentDateTime = new Date(`${report.formData.incidentDate}T${report.formData.incidentTime}`);
      const submitData = {
        ...report.formData,
        incidentDate: incidentDateTime.toISOString(),
        attachments: uploadedFiles,
        recaptchaToken: "temp-disabled",
      };

      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Server error');
      }

      return {
        success: true,
        publicId: result.publicId,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private notifySubmissionSuccess(draftId: string, publicId?: string): void {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SUBMISSION_SUCCESS',
        payload: { draftId, publicId }
      });
    }

    // Create a notification if permission is granted
    if (Notification.permission === 'granted') {
      new Notification('Report Submitted', {
        body: `Your safety report has been successfully submitted. ID: ${publicId || draftId}`,
        icon: '/favicon.ico',
        tag: `report-${draftId}`,
      });
    }
  }

  private notifySubmissionFailure(draftId: string, error: string): void {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SUBMISSION_FAILURE',
        payload: { draftId, error }
      });
    }

    // Create a notification if permission is granted
    if (Notification.permission === 'granted') {
      new Notification('Report Submission Failed', {
        body: `Failed to submit report ${draftId}: ${error}`,
        icon: '/favicon.ico',
        tag: `report-error-${draftId}`,
      });
    }
  }

  async retryFailedSubmissions(): Promise<void> {
    const allReports = await offlineStorage.getAllReports();
    const failedReports = allReports.filter(report => report.status === 'failed');
    
    for (const report of failedReports) {
      this.retryAttempts.delete(report.id);
      await offlineStorage.markForSubmission(report.id);
    }
    
    if (failedReports.length > 0) {
      await this.processQueue();
    }
  }

  getRetryCount(reportId: string): number {
    return this.retryAttempts.get(reportId) || 0;
  }

  isQueueProcessing(): boolean {
    return this.isProcessing;
  }
}

export const submissionQueue = SubmissionQueue.getInstance();