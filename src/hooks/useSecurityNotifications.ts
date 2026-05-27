/**
 * Hook — Notifications de sécurité (nouvelles connexions, révocations, etc.)
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { rowToNotification, type SecurityNotification } from '@/types/device-session';

export interface UseSecurityNotificationsReturn {
  notifications:  SecurityNotification[];
  unreadCount:    number;
  isLoading:      boolean;
  markRead:       (ids?: string[]) => Promise<void>;
  refetch:        () => Promise<void>;
}

export function useSecurityNotifications(): UseSecurityNotificationsReturn {
  const [notifications, setNotifications] = useState<SecurityNotification[]>([]);
  const [isLoading,     setIsLoading]     = useState(true);

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('security_notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    setNotifications((data ?? []).map((r) => rowToNotification(r as Record<string, unknown>)));
    setIsLoading(false);
  }, []);

  useEffect(() => { void fetchNotifications(); }, [fetchNotifications]);

  // Realtime — nouvelles notifications en temps réel
  useEffect(() => {
    const channel = supabase
      .channel('security_notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'security_notifications' },
        (payload) => {
          const notif = rowToNotification(payload.new as Record<string, unknown>);
          setNotifications((prev) => [notif, ...prev]);
        },
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, []);

  const markRead = useCallback(async (ids?: string[]) => {
    await supabase.rpc('mark_notifications_read', { p_ids: ids ?? null });
    setNotifications((prev) =>
      prev.map((n) => (!ids || ids.includes(n.id) ? { ...n, isRead: true } : n)),
    );
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return {
    notifications,
    unreadCount,
    isLoading,
    markRead,
    refetch: fetchNotifications,
  };
}
