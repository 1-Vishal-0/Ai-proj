import { demoMode } from './supabaseClient';
import { portalRpc, writePortal } from './db/portalData';
import { db } from './db/database';
import type { Notification } from '../types';

export const notificationsService = {
  getNotifications(userId: string): Notification[] {
    return db.getNotifications(userId);
  },

  getUnreadCount(userId: string): number {
    return db.getNotifications(userId).filter((n) => !n.is_read).length;
  },

  async markAsRead(id: string): Promise<void> {
    if (!demoMode) return writePortal(() => portalRpc('portal_read_notifications', { notification_key: id }));
    db.markNotificationAsRead(id);
  },

  async markAllAsRead(userId: string): Promise<void> {
    if (!demoMode) return writePortal(() => portalRpc('portal_read_notifications'));
    db.markAllNotificationsAsRead(userId);
  },
};
