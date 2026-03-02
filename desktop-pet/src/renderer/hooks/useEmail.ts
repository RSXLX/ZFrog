import { useState, useEffect, useCallback } from 'react';

export interface Email {
  id: string;
  from: string;
  fromName: string;
  subject: string;
  content: string;
  timestamp: number;
  read: boolean;
  type: 'system' | 'friend' | 'gift' | 'reward';
  attachment?: {
    type: 'item' | 'badge' | 'coin';
    name: string;
    amount?: number;
  };
}

const defaultEmails: Email[] = [
  {
    id: '1',
    from: 'system',
    fromName: '系统',
    subject: '欢迎来到 ZetaFrog!',
    content: '恭喜你获得了你的第一只 ZetaFrog 宠物! 好好照顾它，它会成为你最好的朋友。',
    timestamp: Date.now() - 86400000,
    read: false,
    type: 'system',
  },
  {
    id: '2',
    from: 'friend',
    fromName: '小绿',
    subject: '来看看我的新宠物~',
    content: '我的宠物刚刚升到了 5 级! 你怎么样啦?',
    timestamp: Date.now() - 3600000,
    read: true,
    type: 'friend',
  },
  {
    id: '3',
    from: 'reward',
    fromName: '奖励中心',
    subject: '每日登录奖励',
    content: '你已连续登录 3 天! 获得以下奖励:',
    timestamp: Date.now() - 1800000,
    read: false,
    type: 'reward',
    attachment: { type: 'coin', name: '金币', amount: 100 },
  },
];

export function useEmail() {
  const [emails, setEmails] = useState<Email[]>(defaultEmails);

  // Load from storage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('zfrog_emails');
      if (saved) {
        setEmails(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Failed to load emails:', e);
    }
  }, []);

  // Save to storage
  useEffect(() => {
    try {
      localStorage.setItem('zfrog_emails', JSON.stringify(emails));
    } catch (e) {
      console.warn('Failed to save emails:', e);
    }
  }, [emails]);

  const markAsRead = useCallback((emailId: string) => {
    setEmails(prev => prev.map(e => 
      e.id === emailId ? { ...e, read: true } : e
    ));
  }, []);

  const deleteEmail = useCallback((emailId: string) => {
    setEmails(prev => prev.filter(e => e.id !== emailId));
  }, []);

  const sendEmail = useCallback((email: Omit<Email, 'id' | 'timestamp'>) => {
    const newEmail: Email = {
      ...email,
      id: `email_${Date.now()}`,
      timestamp: Date.now(),
    };
    setEmails(prev => [newEmail, ...prev]);
  }, []);

  const getUnreadCount = useCallback(() => {
    return emails.filter(e => !e.read).length;
  }, [emails]);

  const getEmailsByType = useCallback((type: Email['type']) => {
    return emails.filter(e => e.type === type);
  }, [emails]);

  return {
    emails,
    markAsRead,
    deleteEmail,
    sendEmail,
    getUnreadCount,
    getEmailsByType,
  };
}
