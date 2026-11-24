import React, { useState } from 'react';
import { CheckCircle2, Clock } from 'lucide-react';
import type { EnrichedCorrectionRequest } from '../../../types';
import { useAuth } from '../../../hooks/useAuth';
import { useDatabaseVersion } from '../../../hooks/useDatabase';
import { useToast } from '../../../hooks/useToast';
import { requestsService } from '../../../services/requests.service';
import { db } from '../../../services/db/database';
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  Modal,
  PageHeader,
  Tabs,
  Textarea,
} from '../../../components/ui';

export const TeacherCorrectionsPage: React.FC = () => {
  useDatabaseVersion();
  const { toast } = useToast();
  const { currentUser, currentTeacher } = useAuth();
  const teacherId = currentTeacher?.id;

  const [activeTab, setActiveTab] = useState<'pending' | 'reviewed'>('pending');
  const [selectedRequest, setSelectedRequest] =
    useState<EnrichedCorrectionRequest | null>(null);
  const [reviewAction, setReviewAction] = useState<'approved' | 'rejected'>(
    'approved'
  );
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewError, setReviewError] = useState<string | null>(null);

  const allRequests = requestsService.getEnrichedCorrectionRequests(teacherId);
  const pendingRequests = allRequests.filter((r) => r.status === 'pending');
  const reviewedRequests = allRequests.filter((r) => r.status !== 'pending');
  const displayedRequests =
    activeTab === 'pending' ? pendingRequests : reviewedRequests;

  const handleOpenReview = (
    request: EnrichedCorrectionRequest,
    action: 'approved' | 'rejected'
  ) => {
    setSelectedRequest(request);
    setReviewAction(action);
    setReviewNotes(
      action === 'approved'
        ? 'Request verified and approved.'
        : 'Supporting documentation insufficient.'
    );
    setReviewError(null);
  };

  const handleSaveReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest || !currentUser) return;

    if (!reviewNotes.trim()) {
      setReviewError('Please provide faculty review remarks.');
      return;
    }

    try {
      await requestsService.reviewCorrectionRequest(
        selectedRequest.id,
        reviewAction,
        teacherId ?? '',
        reviewNotes.trim(),
        currentUser
      );
      toast({
        variant: reviewAction === 'approved' ? 'success' : 'info',
        title:
          reviewAction === 'approved'
            ? 'Correction request approved'
            : 'Correction request rejected',
        description: `Decision recorded for ${selectedRequest.student.user.name}.`,
      });
      setSelectedRequest(null);
    } catch (err: unknown) {
      setReviewError(
        err instanceof Error ? err.message : 'Failed to review request'
      );
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Correction Requests"
        description="Verify student explanations and approve or reject attendance status adjustments"
      />

      <Tabs
        variant="underline"
        options={[
          {
            value: 'pending',
            label: 'Pending Requests',
            count: pendingRequests.length,
            icon: <Clock className="w-3.5 h-3.5" />,
          },
          {
            value: 'reviewed',
            label: 'Decision History',
            count: reviewedRequests.length,
            icon: <CheckCircle2 className="w-3.5 h-3.5" />,
          },
        ]}
        value={activeTab}
        onChange={setActiveTab}
      />

      {displayedRequests.length === 0 ? (
        <Card>
          <EmptyState
            icon={<CheckCircle2 className="w-5 h-5 text-emerald-500" />}
            title={
              activeTab === 'pending'
                ? 'No pending correction requests'
                : 'No reviewed requests yet'
            }
            description={
              activeTab === 'pending'
                ? 'All student attendance disputes have been processed.'
                : 'Past approvals and rejections will appear in this log.'
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {displayedRequests.map((req) => (
            <Card
              key={req.id}
              className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-300 transition-colors"
            >
              <div className="space-y-2.5 flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <Avatar
                    src={req.student.user.avatar_url}
                    name={req.student.user.name}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-xs sm:text-sm font-semibold text-primary">
                        {req.student.user.name}
                      </h4>
                      <Badge variant="primary" className="font-mono">
                        {req.student.roll_number}
                      </Badge>
                      <span className="text-[11px] text-muted">
                        {req.student.academic_class?.name}
                      </span>
                    </div>
                    <p className="text-xs text-secondary mt-0.5">
                      Course:{' '}
                      <strong className="font-medium text-primary">
                        {req.subject?.name}
                      </strong>{' '}
                      • Lecture Date:{' '}
                      <span className="font-mono text-primary">{req.date}</span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-secondary">Requested change:</span>
                  <Badge variant="danger">
                    {req.current_status.toUpperCase()}
                  </Badge>
                  <span className="text-muted">→</span>
                  <Badge variant="success">
                    {req.requested_status.toUpperCase()}
                  </Badge>
                </div>

                <div className="p-3 rounded-lg bg-subtle/60 border border-border text-xs text-secondary leading-relaxed">
                  <span className="font-medium text-primary">
                    Student Explanation:{' '}
                  </span>
                  &ldquo;{req.reason}&rdquo;
                </div>

                {req.status !== 'pending' && (
                  <div className="p-3 rounded-lg bg-brand-50/60 border border-brand-200 text-xs text-primary">
                    <span className="font-semibold">
                      Review decision ({req.status.toUpperCase()}){' '}
                    </span>
                    <span className="text-secondary">
                      {req.review_notes || 'No notes provided'}
                    </span>
                    {req.reviewed_at && (
                      <span className="text-[11px] text-muted ml-2 font-mono">
                        {req.reviewed_by_profile_id ? db.getUserById(req.reviewed_by_profile_id)?.name : req.reviewer?.user.name} · {new Date(req.reviewed_at).toLocaleString()}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex md:flex-col items-center md:items-end justify-between gap-2.5 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-border">
                {req.status === 'pending' ? (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenReview(req, 'rejected')}
                    >
                      Reject
                    </Button>
                    <Button
                      variant="success"
                      size="sm"
                      onClick={() => handleOpenReview(req, 'approved')}
                    >
                      Approve
                    </Button>
                  </div>
                ) : (
                  <Badge
                    variant={req.status === 'approved' ? 'success' : 'danger'}
                    dot
                  >
                    {req.status.toUpperCase()}
                  </Badge>
                )}
                <span className="text-[11px] text-muted font-mono tabular-nums">
                  Submitted {new Date(req.created_at).toLocaleDateString()}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {selectedRequest && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedRequest(null)}
          title={`Confirm Correction ${
            reviewAction === 'approved' ? 'Approval' : 'Rejection'
          }`}
          description={`${selectedRequest.student.user.name} (${selectedRequest.student.roll_number})`}
        >
          <form onSubmit={handleSaveReview} className="space-y-4">
            {reviewError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {reviewError}
              </div>
            )}

            <div className="p-3.5 rounded-lg bg-subtle/70 border border-border text-xs space-y-1.5">
              <p className="text-secondary">
                <strong className="font-medium text-primary">Course:</strong>{' '}
                {selectedRequest.subject?.name}
              </p>
              <p className="text-secondary">
                <strong className="font-medium text-primary">Lecture Date:</strong>{' '}
                <span className="font-mono">{selectedRequest.date}</span>
              </p>
              <p className="text-secondary">
                <strong className="font-medium text-primary">Outcome:</strong>{' '}
                <span className="font-semibold text-brand-600">
                  {reviewAction === 'approved'
                    ? `${selectedRequest.current_status} → ${selectedRequest.requested_status}`
                    : `Remain ${selectedRequest.current_status}`}
                </span>
              </p>
            </div>

            <Textarea
              label="Faculty Review Remarks"
              required
              rows={3}
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="Enter remarks explaining the decision..."
            />

            <div className="pt-3 border-t border-border flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectedRequest(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant={reviewAction === 'approved' ? 'success' : 'danger'}
              >
                Confirm {reviewAction === 'approved' ? 'Approval' : 'Rejection'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
