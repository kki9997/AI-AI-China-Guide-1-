import { useState, useEffect, useCallback, useRef } from 'react';
import { useLanguage } from './use-language';
import { useTextToSpeech } from './use-text-to-speech';

export interface ScheduledReminder {
  id: number;
  titleEn: string;
  titleZh: string;
  descEn: string;
  descZh: string;
  scheduledTime: Date;
  announced?: boolean;
}

export function useReminderNotifications() {
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [autoAnnounce, setAutoAnnounce] = useState(() => {
    const saved = localStorage.getItem('autoAnnounce');
    return saved !== null ? saved === 'true' : true;
  });
  const [scheduledReminders, setScheduledReminders] = useState<ScheduledReminder[]>([]);
  const { language } = useLanguage();
  const { speak, stop, isSpeaking, isLoading } = useTextToSpeech();
  const lastAnnouncedRef = useRef<number | null>(null);

  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('autoAnnounce', String(autoAnnounce));
  }, [autoAnnounce]);

  const requestPermission = useCallback(async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      return permission === 'granted';
    }
    return false;
  }, []);

  const showNotification = useCallback((title: string, body: string) => {
    if (notificationPermission === 'granted') {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: 'reminder',
      });
    }
  }, [notificationPermission]);

  const announceReminder = useCallback(async (reminder: ScheduledReminder) => {
    if (lastAnnouncedRef.current === reminder.id) return;
    lastAnnouncedRef.current = reminder.id;
    
    const title = language === 'zh' ? reminder.titleZh : reminder.titleEn;
    const desc = language === 'zh' ? reminder.descZh : reminder.descEn;
    
    showNotification(title, desc);
    
    if (autoAnnounce && !isSpeaking && !isLoading) {
      const text = `${title}。${desc}`;
      speak(text, language === 'zh' ? 'zh' : 'en');
    }
  }, [language, autoAnnounce, showNotification, speak, isSpeaking, isLoading]);

  const scheduleReminder = useCallback((reminder: ScheduledReminder) => {
    setScheduledReminders(prev => {
      const exists = prev.find(r => r.id === reminder.id);
      if (exists) return prev;
      return [...prev, reminder];
    });
  }, []);

  const scheduleReminders = useCallback((reminders: ScheduledReminder[]) => {
    setScheduledReminders(reminders);
  }, []);

  const toggleAutoAnnounce = useCallback(async () => {
    if (!autoAnnounce && notificationPermission !== 'granted') {
      const granted = await requestPermission();
      if (!granted) {
        return false;
      }
    }
    setAutoAnnounce(prev => !prev);
    return true;
  }, [autoAnnounce, notificationPermission, requestPermission]);

  useEffect(() => {
    if (!autoAnnounce) return;
    
    const checkReminders = () => {
      const now = new Date();
      setScheduledReminders(prev => {
        let hasUpdates = false;
        const updated = prev.map(reminder => {
          if (!reminder.announced && reminder.scheduledTime <= now) {
            hasUpdates = true;
            announceReminder(reminder);
            return { ...reminder, announced: true };
          }
          return reminder;
        });
        return hasUpdates ? updated : prev;
      });
    };

    const interval = setInterval(checkReminders, 1000);
    return () => clearInterval(interval);
  }, [autoAnnounce, announceReminder]);

  return {
    notificationPermission,
    requestPermission,
    autoAnnounce,
    toggleAutoAnnounce,
    scheduleReminder,
    scheduleReminders,
    scheduledReminders,
    announceReminder,
    isSpeaking,
    isLoading,
    stop,
  };
}
