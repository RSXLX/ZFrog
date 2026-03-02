import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface DataManageDialogProps {
  visible: boolean;
  onClose: () => void;
}

const DataManageDialog: React.FC<DataManageDialogProps> = ({ visible, onClose }) => {
  const [status, setStatus] = useState<'idle' | 'exporting' | 'importing' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  // Get all zfrog data from localStorage
  const getAllData = useCallback(() => {
    const data: Record<string, any> = {};
    const keys = [
      'zfrog_pet_stats', 'zfrog_inventory', 'zfrog_friends', 
      'zfrog_achievements', 'zfrog_travel', 'zfrog_emails',
      'zfrog_statistics', 'zfrog_settings', 'zfrog_theme',
      'zfrog_avatar', 'zfrog_coins', 'zfrog_owned_items',
      'zfrog_tasks', 'zfrog_memories'
    ];
    
    keys.forEach(key => {
      const value = localStorage.getItem(key);
      if (value) {
        data[key] = JSON.parse(value);
      }
    });
    
    return {
      version: '1.0.0',
      exportDate: new Date().toISOString(),
      data
    };
  }, []);

  const handleExport = useCallback(() => {
    setStatus('exporting');
    try {
      const exportData = getAllData();
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `zfrog-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      setStatus('success');
      setMessage('✅ 数据导出成功！');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (e) {
      setStatus('error');
      setMessage('❌ 导出失败: ' + (e as Error).message);
    }
  }, [getAllData]);

  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      setStatus('importing');
      try {
        const text = await file.text();
        const importData = JSON.parse(text);
        
        if (!importData.data) {
          throw new Error('无效的备份文件');
        }
        
        // Import each data key
        Object.entries(importData.data).forEach(([key, value]) => {
          localStorage.setItem(key, JSON.stringify(value));
        });
        
        setStatus('success');
        setMessage('✅ 数据导入成功！请刷新页面');
        setTimeout(() => {
          setStatus('idle');
          onClose();
          window.location.reload();
        }, 2000);
      } catch (e) {
        setStatus('error');
        setMessage('❌ 导入失败: ' + (e as Error).message);
      }
    };
    input.click();
  }, [onClose]);

  const handleClear = useCallback(() => {
    if (confirm('确定要清除所有数据吗？此操作不可恢复！')) {
      const keys = [
        'zfrog_pet_stats', 'zfrog_inventory', 'zfrog_friends', 
        'zfrog_achievements', 'zfrog_travel', 'zfrog_emails',
        'zfrog_statistics', 'zfrog_settings', 'zfrog_theme',
        'zfrog_avatar', 'zfrog_coins', 'zfrog_owned_items',
        'zfrog_tasks', 'zfrog_memories'
      ];
      
      keys.forEach(key => localStorage.removeItem(key));
      
      setStatus('success');
      setMessage('✅ 数据已清除');
      setTimeout(() => {
        setStatus('idle');
        onClose();
        window.location.reload();
      }, 1500);
    }
  }, [onClose]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="dialog-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="dialog-content"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={e => e.stopPropagation()}
            style={{ minWidth: 320 }}
          >
            <button className="dialog-close" onClick={onClose}>×</button>
            
            <h2 className="dialog-title">💾 数据管理</h2>

            {message && (
              <div style={{ 
                padding: 12, 
                background: status === 'success' ? '#dcfce7' : status === 'error' ? '#fee2e2' : '#fef3c7',
                borderRadius: 8, 
                marginBottom: 16,
                textAlign: 'center',
              }}>
                {message}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button
                onClick={handleExport}
                disabled={status !== 'idle'}
                style={{
                  padding: 16,
                  background: 'linear-gradient(135deg, #4ADE80, #22C55E)',
                  border: 'none',
                  borderRadius: 12,
                  color: 'white',
                  fontSize: 16,
                  fontWeight: '600',
                  cursor: status !== 'idle' ? 'not-allowed' : 'pointer',
                  opacity: status !== 'idle' ? 0.6 : 1,
                }}
              >
                📤 导出备份
                <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 'normal', marginTop: 4 }}>
                  将所有数据导出为 JSON 文件
                </div>
              </button>
              
              <button
                onClick={handleImport}
                disabled={status !== 'idle'}
                style={{
                  padding: 16,
                  background: 'linear-gradient(135deg, #60A5FA, #3B82F6)',
                  border: 'none',
                  borderRadius: 12,
                  color: 'white',
                  fontSize: 16,
                  fontWeight: '600',
                  cursor: status !== 'idle' ? 'not-allowed' : 'pointer',
                  opacity: status !== 'idle' ? 0.6 : 1,
                }}
              >
                📥 导入备份
                <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 'normal', marginTop: 4 }}>
                  从 JSON 文件恢复数据
                </div>
              </button>
              
              <button
                onClick={handleClear}
                disabled={status !== 'idle'}
                style={{
                  padding: 16,
                  background: 'linear-gradient(135deg, #F87171, #EF4444)',
                  border: 'none',
                  borderRadius: 12,
                  color: 'white',
                  fontSize: 16,
                  fontWeight: '600',
                  cursor: status !== 'idle' ? 'not-allowed' : 'pointer',
                  opacity: status !== 'idle' ? 0.6 : 1,
                }}
              >
                🗑️ 清除数据
                <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 'normal', marginTop: 4 }}>
                  删除所有本地数据（不可恢复）
                </div>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DataManageDialog;
