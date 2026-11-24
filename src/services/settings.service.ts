import { demoMode, requireSupabase } from './supabaseClient';
import { portalRpc, writePortal } from './db/portalData';
import { db } from './db/database';
import type { AuditLog, InstitutionSettings, User } from '../types';

export const settingsService = {
  getSettings(): InstitutionSettings {
    return db.getSettings();
  },

  async updateSettings(
    updates: Partial<InstitutionSettings>,
    actorUser: User
  ): Promise<void> {
    if (!demoMode) return writePortal(() => portalRpc('portal_update_settings', { changes: updates }));
    db.updateSettings(updates, actorUser);
  },

  getAuditLogs(limit: number = 100): AuditLog[] {
    return db.getAuditLogs(limit);
  },

  async getOlderAuditLogs(last: AuditLog): Promise<AuditLog[]> {
    if (demoMode) {
      const logs = db.getAuditLogs(Infinity);
      const offset = logs.findIndex(row => row.id === last.id) + 1;
      return logs.slice(offset, offset + 100);
    }
    let query = requireSupabase().from('audit_logs').select()
      .order('timestamp', {ascending:false, nullsFirst:false}).order('id', {ascending:false}).limit(100);
    query = last.timestamp
      ? query.or(`timestamp.lt.${last.timestamp},and(timestamp.eq.${last.timestamp},id.lt.${last.id}),timestamp.is.null`)
      : query.is('timestamp',null).lt('id',last.id);
    const {data,error} = await query;
    if (error) throw new Error(error.message);
    return data;
  },
};
