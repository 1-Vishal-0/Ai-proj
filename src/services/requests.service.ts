import { demoMode } from './supabaseClient';
import { portalRpc, writePortal } from './db/portalData';
import { db } from './db/database';
import type { CorrectionRequest, EnrichedCorrectionRequest, User } from '../types';

export const requestsService = {
  getCorrectionRequests(): CorrectionRequest[] {
    return db.getCorrectionRequests();
  },

  getPendingCount(): number {
    return db.getCorrectionRequests().filter((r) => r.status === 'pending').length;
  },

  getEnrichedCorrectionRequests(teacherId?: string): EnrichedCorrectionRequest[] {
    return db.getEnrichedCorrectionRequests(teacherId);
  },

  async createCorrectionRequest(
    data: Omit<CorrectionRequest, 'id' | 'created_at' | 'status'>
  ): Promise<void> {
    if (!demoMode) {
      await writePortal(() => portalRpc('portal_request_correction', {
        session_key: data.session_id, requested: data.requested_status, reason_text: data.reason,
      }));
      return;
    }
    db.createCorrectionRequest(data);
  },

  async reviewCorrectionRequest(
    requestId: string,
    action: 'approved' | 'rejected',
    teacherId: string,
    reviewNotes: string,
    actorUser: User
  ): Promise<void> {
    if (!demoMode) {
      await writePortal(() => portalRpc('portal_review_correction', { request_key: requestId, decision: action, notes: reviewNotes }));
      return;
    }
    db.reviewCorrectionRequest(
      requestId,
      action,
      teacherId,
      reviewNotes,
      actorUser
    );
  },
};
