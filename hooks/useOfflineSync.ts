import { useEffect, useState } from 'react';
import { useOnlineStatus } from './useOnlineStatus';
import { submissionQueue } from '@/lib/submission-queue';
import { offlineStorage } from '@/lib/offline-storage';

interface SyncStatus {
  isProcessing: boolean;
  pendingCount: number;
  lastSyncAttempt: Date | null;
  syncError: string | null;
}

export function useOfflineSync() {
  const { isOnline } = useOnlineStatus();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isProcessing: false,
    pendingCount: 0,
    lastSyncAttempt: null,
    syncError: null,
  });

  // Update pending count
  const updatePendingCount = async () => {
    try {
      const pendingReports = await offlineStorage.getPendingReports();
      setSyncStatus(prev => ({
        ...prev,
        pendingCount: pendingReports.length,
      }));
    } catch (error) {
      console.error('Failed to update pending count:', error);
    }
  };

  // Process sync when coming online
  const processSync = async () => {
    if (!isOnline || syncStatus.isProcessing) return;

    setSyncStatus(prev => ({ 
      ...prev, 
      isProcessing: true, 
      syncError: null,
      lastSyncAttempt: new Date(),
    }));

    try {
      await submissionQueue.processQueue();
      await updatePendingCount();
      
      setSyncStatus(prev => ({ 
        ...prev, 
        isProcessing: false,
        syncError: null,
      }));
    } catch (error) {
      setSyncStatus(prev => ({ 
        ...prev, 
        isProcessing: false,
        syncError: error instanceof Error ? error.message : 'Sync failed',
      }));
    }
  };

  // Auto-sync when coming online
  useEffect(() => {
    if (isOnline) {
      processSync();
    }
  }, [isOnline]);

  // Periodic sync check while online
  useEffect(() => {
    if (!isOnline) return;

    const interval = setInterval(async () => {
      await updatePendingCount();
      
      // Auto-process if there are pending items
      if (syncStatus.pendingCount > 0 && !syncStatus.isProcessing) {
        processSync();
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [isOnline, syncStatus.pendingCount, syncStatus.isProcessing]);

  // Initial pending count
  useEffect(() => {
    updatePendingCount();
  }, []);

  return {
    ...syncStatus,
    processSync,
    updatePendingCount,
  };
}