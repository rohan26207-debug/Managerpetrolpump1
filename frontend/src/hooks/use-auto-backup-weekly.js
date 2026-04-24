import { useEffect, useCallback } from 'react';
import localStorageService from '../services/localStorage';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
const AUTO_BACKUP_SETTINGS_KEY = 'mpump_auto_backup_weekly_settings';

// Core backup routine shared by the scheduled 7-day check and the manual
// "Backup Now" button. It exports all localStorage data to a JSON file and
// either emails it (if an owner email is set and we're on Android), saves it
// to Downloads (Android without email), or triggers a browser download (web).
const runBackup = (toast) => {
  try {
    const backupData = localStorageService.exportAllData();
    const dataStr = JSON.stringify(backupData, null, 2);
    const fileName = `mpump-backup-${new Date().toISOString().split('T')[0]}.json`;

    const isAndroid = typeof window.MPumpCalcAndroid !== 'undefined';
    const ownerEmail = (localStorage.getItem('mpump_backup_email') || '').trim();
    const emailSubject = `M.Pump Backup - ${new Date().toISOString().split('T')[0]}`;
    const emailBody = `Hi,\n\nAttached is a backup of Manager Petrol Pump data.\n\nFile: ${fileName}\nGenerated: ${new Date().toLocaleString()}\n\nKeep this file safe — you can restore data by importing it from Settings -> Backup -> Import Data.`;

    if (isAndroid && ownerEmail && typeof window.MPumpCalcAndroid.emailBackup === 'function') {
      const bytes = new TextEncoder().encode(dataStr);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
      const base64 = btoa(binary);
      window.MPumpCalcAndroid.emailBackup(base64, fileName, 'application/json', ownerEmail, emailSubject, emailBody);
    } else if (isAndroid && typeof window.MPumpCalcAndroid.saveFileToDownloads === 'function') {
      const bytes = new TextEncoder().encode(dataStr);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
      const base64 = btoa(binary);
      window.MPumpCalcAndroid.saveFileToDownloads(base64, fileName, 'application/json');
    } else {
      // Web browser - download via anchor
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);

      if (ownerEmail) {
        const mailto = `mailto:${encodeURIComponent(ownerEmail)}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody + '\n\n(Please attach the downloaded file manually.)')}`;
        window.open(mailto, '_blank');
      }
    }

    if (toast) {
      toast({
        title: ownerEmail && isAndroid ? "Backup Ready" : "Backup Successful",
        description: ownerEmail && isAndroid
          ? `Gmail opening with ${fileName} attached.`
          : `Backup file saved: ${fileName}`,
      });
    }

    return { success: true, fileName };
  } catch (error) {
    console.error('Backup error:', error);
    if (toast) {
      toast({
        title: "Backup Failed",
        description: "Could not create backup. Please try again.",
        variant: "destructive",
      });
    }
    return { success: false, error };
  }
};

export const useAutoBackupWeekly = (toast) => {
  // Check and perform auto backup if needed (called on app mount)
  const checkAndPerformAutoBackup = useCallback(async () => {
    try {
      const settingsStr = localStorage.getItem(AUTO_BACKUP_SETTINGS_KEY);
      let settings = settingsStr ? JSON.parse(settingsStr) : null;

      // Initialize settings on first app open
      if (!settings) {
        const now = new Date().toISOString();
        settings = {
          enabled: true,
          firstOpenTime: now,
          lastBackupTime: null,
          nextScheduledTime: new Date(Date.now() + SEVEN_DAYS_MS).toISOString(),
        };
        localStorage.setItem(AUTO_BACKUP_SETTINGS_KEY, JSON.stringify(settings));
        return;
      }

      if (!settings.enabled) return;

      const now = Date.now();
      const nextScheduledTime = new Date(settings.nextScheduledTime).getTime();

      if (now >= nextScheduledTime) {
        const result = runBackup(toast);
        if (result.success) {
          settings.lastBackupTime = new Date().toISOString();
          settings.nextScheduledTime = new Date(Date.now() + SEVEN_DAYS_MS).toISOString();
          localStorage.setItem(AUTO_BACKUP_SETTINGS_KEY, JSON.stringify(settings));
        }
      }
    } catch (error) {
      console.error('Auto backup check error:', error);
    }
  }, [toast]);

  // Manual "Backup Now" trigger — ignores the 7-day schedule, always runs.
  // Still updates lastBackupTime so the status display reflects the latest
  // successful backup (nextScheduledTime is left alone so the 7-day cadence
  // keeps its original rhythm).
  const backupNow = useCallback(() => {
    const result = runBackup(toast);
    if (result.success) {
      const settingsStr = localStorage.getItem(AUTO_BACKUP_SETTINGS_KEY);
      const settings = settingsStr ? JSON.parse(settingsStr) : null;
      if (settings) {
        settings.lastBackupTime = new Date().toISOString();
        localStorage.setItem(AUTO_BACKUP_SETTINGS_KEY, JSON.stringify(settings));
      }
    }
    return result;
  }, [toast]);

  useEffect(() => {
    checkAndPerformAutoBackup();
  }, [checkAndPerformAutoBackup]);

  const getSettings = useCallback(() => {
    const settingsStr = localStorage.getItem(AUTO_BACKUP_SETTINGS_KEY);
    return settingsStr ? JSON.parse(settingsStr) : null;
  }, []);

  const toggleAutoBackup = useCallback((enabled) => {
    const settings = getSettings();
    if (settings) {
      settings.enabled = enabled;
      localStorage.setItem(AUTO_BACKUP_SETTINGS_KEY, JSON.stringify(settings));
      return true;
    }
    return false;
  }, [getSettings]);

  const getBackupStatus = useCallback(() => {
    const settings = getSettings();
    if (!settings) {
      return { enabled: false, lastBackupTime: null, nextScheduledTime: null };
    }
    return {
      enabled: settings.enabled,
      lastBackupTime: settings.lastBackupTime,
      nextScheduledTime: settings.nextScheduledTime,
    };
  }, [getSettings]);

  return {
    checkAndPerformAutoBackup,
    toggleAutoBackup,
    getBackupStatus,
    backupNow,
  };
};
