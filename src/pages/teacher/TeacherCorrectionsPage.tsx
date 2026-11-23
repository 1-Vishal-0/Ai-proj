import React, { useState } from 'react';
import {
  FileCheck2,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  MessageSquare,
  AlertCircle
} from 'lucide-react';
import { db } from '../../services/db/database';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';
import { EnrichedCorrectionRequest } from '../../types';

export const TeacherCorrectionsPage: React.FC = () => {
  const { currentUser, currentTeacher } = useAuth();
  const teacherId = currentTeacher?.id || 'teacher-amcec-1';

  const [activeTab, setActiveTab] = useState<'pending' | 'reviewed'>('pending');
  const [selectedRequest, setSelectedRequest] = useState<EnrichedCorrectionRequest | null>(null);
  const [reviewAction, setReviewAction] = useState<'approved' | 'rejected'>('approved');
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewError, setReviewError] = useState<string | null>(null);

  // Correction requests for this teacher's courses
  const allRequests = db.getEnrichedCorrectionRequests(teacherId);
  const pendingRequests = allRequests.filter((r) => r.status === 'pending');
  const reviewedRequests = allRequests.filter((r) => r.status !== 'pending');

  const displayedRequests = activeTab === 'pending' ? pendingRequests : reviewedRequests;

  const handleOpenReview = (request: EnrichedCorrectionRequest, action: 'approved' | 'rejected') => {
    setSelectedRequest(request);
    setReviewAction(action);
    setReviewNotes(action === 'approved' ? 'Request verified and approved.' : 'Documentation insufficient.');
    setReviewError(null);
  };

  const handleSaveReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest || !currentUser) return;

    if (!reviewNotes.trim()) {
      setReviewError('Please provide teacher review remarks.');
      return;
    }

    try {
      db.reviewCorrectionRequest(
        selectedRequest.id,
        reviewAction,
        teacherId,
        reviewNotes.trim(),
        currentUser
      );
      setSelectedRequest(null);
    } catch (err: any) {
      setReviewError(err.message || 'Failed to review request');
    }
  };

  return (
    <div className="space-y-5">
      {/* Page Title */}
      <div>
        <h2 className="text-lg font-bold text-slate-900">Student Attendance Correction Requests</h2>
        <p className="text-xs text-slate-500">
          Review, verify evidence, and approve or reject student attendance dispute requests
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('pending')}
          className={`flex items-center gap-2 py-2.5 px-4 text-xs font-semibold border-b-2 transition ${
            activeTab === 'pending'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          Pending Requests ({pendingRequests.length})
        </button>
        <button
          onClick={() => setActiveTab('reviewed')}
          className={`flex items-center gap-2 py-2.5 px-4 text-xs font-semibold border-b-2 transition ${
            activeTab === 'reviewed'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          Decision History ({reviewedRequests.length})
        </button>
      </div>

      {/* Requests List */}
      <div className="space-y-3">
        {displayedRequests.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-xl border border-slate-200 shadow-sm text-slate-400 text-xs">
            {activeTab === 'pending' ? (
              <>
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                No pending attendance correction requests to review.
              </>
            ) : (
              'No past reviewed requests recorded yet.'
            )}
          </div>
        ) : (
          displayedRequests.map((req) => (
            <div
              key={req.id}
              className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 hover:border-slate-300 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-3">
                  <img
                    src={req.student.user.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=60'}
                    alt={req.student.user.name}
                    className="w-9 h-9 rounded-full object-cover ring-1 ring-slate-200"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-900">{req.student.user.name}</h4>
                      <span className="font-mono text-[10px] text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded">
                        {req.student.roll_number}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Class: {req.student.academic_class?.name}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Subject:{' '}
                      <strong className="text-slate-800">{req.subject?.name}</strong> • Lecture
                      Date: <span className="font-mono font-medium">{req.date}</span>
                    </p>
                  </div>
                </div>

                {/* Status change pill */}
                <div className="flex items-center gap-2 text-xs pt-1">
                  <span className="text-slate-500 text-[11px]">Requested adjustment:</span>
                  <Badge variant="danger">{req.current_status.toUpperCase()}</Badge>
                  <span className="text-slate-400 font-bold">→</span>
                  <Badge variant="success">{req.requested_status.toUpperCase()}</Badge>
                </div>

                {/* Student's reason */}
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-[11px] text-slate-600 leading-relaxed">
                  <span className="font-semibold text-slate-700">Student Explanation: </span>
                  "{req.reason}"
                </div>

                {/* If already reviewed */}
                {req.status !== 'pending' && (
                  <div className="p-2.5 rounded-lg bg-blue-50/60 border border-blue-100 text-[11px] text-blue-900">
                    <span className="font-bold">Faculty Remarks ({req.status.toUpperCase()}): </span>
                    {req.review_notes || 'No notes provided'}
                    <span className="text-[10px] text-slate-400 ml-2">
                      • Reviewed on {req.reviewed_at ? new Date(req.reviewed_at).toLocaleDateString() : ''}
                    </span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex md:flex-col items-center md:items-end justify-between gap-2 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                {req.status === 'pending' ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenReview(req, 'rejected')}
                      className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-xs font-bold transition"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleOpenReview(req, 'approved')}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold shadow-sm transition"
                    >
                      Approve Correction
                    </button>
                  </div>
                ) : (
                  <Badge
                    variant={req.status === 'approved' ? 'success' : 'danger'}
                    dot
                  >
                    {req.status.toUpperCase()}
                  </Badge>
                )}
                <span className="text-[10px] text-slate-400">
                  Submitted {new Date(req.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Review Modal */}
      {selectedRequest && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedRequest(null)}
          title={`Attendance Correction: ${reviewAction === 'approved' ? 'Approval' : 'Rejection'}`}
          description={`Student: ${selectedRequest.student.user.name} (${selectedRequest.student.roll_number})`}
        >
          <form onSubmit={handleSaveReview} className="space-y-4">
            {reviewError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {reviewError}
              </div>
            )}

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1">
              <p>
                <strong>Course:</strong> {selectedRequest.subject?.name}
              </p>
              <p>
                <strong>Date:</strong> {selectedRequest.date}
              </p>
              <p>
                <strong>Action:</strong>{' '}
                <span className="font-bold uppercase text-blue-600">
                  Change status from {selectedRequest.current_status} to{' '}
                  {reviewAction === 'approved' ? selectedRequest.requested_status : 'REMAIN ABSENT'}
                </span>
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Faculty Review Remarks *
              </label>
              <textarea
                required
                rows={3}
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Enter remarks explaining the decision..."
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="px-3.5 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`px-4 py-2 rounded-lg text-xs font-semibold text-white shadow-sm transition ${
                  reviewAction === 'approved'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                Confirm {reviewAction === 'approved' ? 'Approval' : 'Rejection'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
