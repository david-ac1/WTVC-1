import React from 'react';
import { notificationService } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export const useNotificationCount = () => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [loading, setLoading] = React.useState(false);

  const fetchUnreadCount = React.useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    try {
      setLoading(true);
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Error fetching unread count:', error);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch count when user changes
  React.useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  // Refresh count periodically
  React.useEffect(() => {
    if (!user) return;

    const interval = setInterval(fetchUnreadCount, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, [user, fetchUnreadCount]);

  const decrementCount = React.useCallback((amount: number = 1) => {
    setUnreadCount(prev => Math.max(0, prev - amount));
  }, []);

  const resetCount = React.useCallback(() => {
    setUnreadCount(0);
  }, []);

  return {
    unreadCount,
    loading,
    refreshCount: fetchUnreadCount,
    decrementCount,
    resetCount
  };
};