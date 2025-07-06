interface OfflineReport {
  id: string;
  formData: any;
  files: Array<{
    name: string;
    type: string;
    size: number;
    data: string; // base64
    annotations?: any[];
  }>;
  timestamp: number;
  status: 'draft' | 'pending_submission' | 'submitted' | 'failed';
  lastModified: number;
}

interface StorageQuota {
  usage: number;
  quota: number;
}

class OfflineStorageManager {
  private static instance: OfflineStorageManager;
  private dbName = 'hsse-reports-offline';
  private version = 1;
  private db: IDBDatabase | null = null;

  private constructor() {}

  static getInstance(): OfflineStorageManager {
    if (!OfflineStorageManager.instance) {
      OfflineStorageManager.instance = new OfflineStorageManager();
    }
    return OfflineStorageManager.instance;
  }

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains('reports')) {
          const reportsStore = db.createObjectStore('reports', { keyPath: 'id' });
          reportsStore.createIndex('status', 'status', { unique: false });
          reportsStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  async saveReport(id: string, formData: any, files: File[] = []): Promise<void> {
    if (!this.db) await this.init();

    const processedFiles = await Promise.all(
      files.map(async (file) => ({
        name: file.name,
        type: file.type,
        size: file.size,
        data: await this.fileToBase64(file),
        annotations: []
      }))
    );

    const report: OfflineReport = {
      id,
      formData,
      files: processedFiles,
      timestamp: Date.now(),
      status: 'draft',
      lastModified: Date.now()
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['reports'], 'readwrite');
      const store = transaction.objectStore('reports');
      const request = store.put(report);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getReport(id: string): Promise<OfflineReport | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['reports'], 'readonly');
      const store = transaction.objectStore('reports');
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllReports(): Promise<OfflineReport[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['reports'], 'readonly');
      const store = transaction.objectStore('reports');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async getPendingReports(): Promise<OfflineReport[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['reports'], 'readonly');
      const store = transaction.objectStore('reports');
      const index = store.index('status');
      const request = index.getAll('pending_submission');

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async markForSubmission(id: string): Promise<void> {
    const report = await this.getReport(id);
    if (report) {
      report.status = 'pending_submission';
      report.lastModified = Date.now();
      await this.saveReportDirect(report);
    }
  }

  async markAsSubmitted(id: string): Promise<void> {
    const report = await this.getReport(id);
    if (report) {
      report.status = 'submitted';
      report.lastModified = Date.now();
      await this.saveReportDirect(report);
    }
  }

  async markAsFailed(id: string): Promise<void> {
    const report = await this.getReport(id);
    if (report) {
      report.status = 'failed';
      report.lastModified = Date.now();
      await this.saveReportDirect(report);
    }
  }

  async deleteReport(id: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['reports'], 'readwrite');
      const store = transaction.objectStore('reports');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getStorageQuota(): Promise<StorageQuota> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        usage: estimate.usage || 0,
        quota: estimate.quota || 0
      };
    }
    return { usage: 0, quota: 0 };
  }

  async clearOldReports(daysOld: number = 30): Promise<void> {
    const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
    const allReports = await this.getAllReports();
    
    const oldReports = allReports.filter(
      report => report.status === 'submitted' && report.timestamp < cutoffTime
    );

    for (const report of oldReports) {
      await this.deleteReport(report.id);
    }
  }

  private async saveReportDirect(report: OfflineReport): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['reports'], 'readwrite');
      const store = transaction.objectStore('reports');
      const request = store.put(report);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]); // Remove data:type;base64, prefix
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  base64ToFile(base64: string, filename: string, type: string): File {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    return new File([byteArray], filename, { type });
  }
}

export const offlineStorage = OfflineStorageManager.getInstance();
export type { OfflineReport, StorageQuota };