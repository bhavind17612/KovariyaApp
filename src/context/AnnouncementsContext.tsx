import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useChildren } from './ChildrenContext';
import { announcementsService } from '../services/announcementsService';

type AnnouncementsContextValue = {
  /** Drives the sidebar red dot. */
  hasUnread: boolean;
  unreadCount: number;
  /** Re-fetches the unread count (e.g. on drawer open). */
  refreshUnread: () => void;
  /** Optimistically clears the dot and tells the backend the child has seen everything. */
  markAllRead: () => void;
};

const AnnouncementsContext = createContext<AnnouncementsContextValue | undefined>(undefined);

/** Keeps the sidebar dot reasonably fresh without a push channel. */
const POLL_INTERVAL_MS = 60000;

export function AnnouncementsProvider({ children }: { children: React.ReactNode }) {
  const { selectedChildId } = useChildren();
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnread = useCallback(() => {
    if (!selectedChildId) {
      setUnreadCount(0);
      return;
    }
    announcementsService.getUnreadCount(selectedChildId).then(setUnreadCount);
  }, [selectedChildId]);

  useEffect(() => {
    refreshUnread();
    const interval = setInterval(refreshUnread, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refreshUnread]);

  const markAllRead = useCallback(() => {
    if (!selectedChildId) return;
    setUnreadCount(0);
    announcementsService.markAllRead(selectedChildId).catch(() => {
      // Backend didn't record it — resync so the dot doesn't stay wrongly cleared.
      refreshUnread();
    });
  }, [selectedChildId, refreshUnread]);

  const value = useMemo(
    () => ({ hasUnread: unreadCount > 0, unreadCount, refreshUnread, markAllRead }),
    [unreadCount, refreshUnread, markAllRead]
  );

  return <AnnouncementsContext.Provider value={value}>{children}</AnnouncementsContext.Provider>;
}

export function useAnnouncementsBadge(): AnnouncementsContextValue {
  const ctx = useContext(AnnouncementsContext);
  if (!ctx) {
    throw new Error('useAnnouncementsBadge must be used within AnnouncementsProvider');
  }
  return ctx;
}
