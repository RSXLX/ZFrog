import { useState, useEffect, useCallback } from 'react';

export interface BackupData {
  version: string;
  timestamp: number;
  data: Record<string, any>;
}

export function useBackup() {
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(true);
  const [lastBackup, setLastBackup] = useState<number | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('zfrog_auto_backup');
    if (saved) setAutoBackupEnabled(JSON.parse(saved));
    
    const last = localStorage.getItem('zfrog_last_backup');
    if (last) setLastBackup(parseInt(last));
  }, []);

  const createBackup = useCallback((): BackupData => {
    const data: Record<string, any> = {};
    
    // Gather all zfrog data
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('zfrog_')) {
        try {
          data[key] = JSON.parse(localStorage.getItem(key) || 'null');
        } catch (e) {
          data[key] = localStorage.getItem(key);
        }
      }
    }

    const backup: BackupData = {
      version: '1.0.0',
      timestamp: Date.now(),
      data,
    };

    setLastBackup(Date.now());
    localStorage.setItem('zfrog_last_backup', Date.now().toString());

    return backup;
  }, []);

  const restoreBackup = useCallback((backup: BackupData) => {
    if (!backup.data) return false;
    
    try {
      Object.entries(backup.data).forEach(([key, value]) => {
        localStorage.setItem(key, JSON.stringify(value));
      });
      return true;
    } catch (e) {
      console.error('Failed to restore backup:', e);
      return false;
    }
  }, []);

  const downloadBackup = useCallback(() => {
    const backup = createBackup();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zfrog-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [createBackup]);

  const uploadBackup = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      try {
        const text = await file.text();
        const backup = JSON.parse(text) as BackupData;
        if (restoreBackup(backup)) {
          alert('✅ 备份恢复成功！');
          window.location.reload();
        }
      } catch (err) {
        alert('❌ 备份文件无效');
      }
    };
    input.click();
  }, [restoreBackup]);

  return {
    autoBackupEnabled,
    setAutoBackupEnabled,
    lastBackup,
    createBackup,
    restoreBackup,
    downloadBackup,
    uploadBackup,
  };
}
