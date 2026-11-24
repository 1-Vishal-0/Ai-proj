import React, { useState } from 'react';
import { FileCheck2, Send, AlertCircle } from 'lucide-react';
import type { AttendanceStatus } from '../../../types';
import { useAuth } from '../../../hooks/useAuth';
import { useDatabaseVersion } from '../../../hooks/useDatabase';
import { useToast } from '../../../hooks/useToast';
import { studentsService } from '../../../services/students.service';
import { academicsService } from '../../../services/academics.service';
import { attendanceService } from '../../../services/attendance.service';
import { requestsService } from '../../../services/requests.service';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DatePicker,
  EmptyState,
  PageHeader,
  Select,
  Textarea,
} from '../../../components/ui';
import { INSTITUTION_CONFIG } from '../../../app/config/institution';
import { getTodayIsoDate } from '../../../lib/date';

export const StudentCorrectionPage: React.FC = () => {
  useDatabaseVersion();
  const { toast } = useToast();
  const { currentStudent } = useAuth();
  const studentId =
    currentStudent?.id || INSTITUTION_CONFIG.academicDefaults.defaultStudentId;

  const student = studentsService.getEnrichedStudent(studentId);
  const subjects = academicsService.getSubjects();
  const requests = requestsService
    .getCorrectionRequests()
    .filter((r) => r.student_id === studentId);

  const [subjectId, setSubjectId] = useState<string>(
    subjects[0]?.id || INSTITUTION_CONFIG.academicDefaults.defaultSubjectId
  );
  const [date, setDate] = useState<string>(() => getTodayIsoDate());
  const [currentStatus, setCurrentStatus] = useState<AttendanceStatus>('absent');
  const [requestedStatus, setRequestedStatus] =
    useState<AttendanceStatus>('present');
  const [reason, setReason] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!reason.trim() || reason.trim().length < 10) {
      setFormError(
        'Please enter a clear justification of at least 10 characters.'
      );
      return;
    }

    try {
      const matchingSession = student
        ? attendanceService.getSessions({
            class_id: student.class_id,
            subject_id: subjectId,
            date,
          })[0]
        : undefined;

      const sessionId = matchingSession
        ? matchingSession.id
        : `session-dummy-${Date.now()}`;

      await requestsService.createCorrectionRequest({
        student_id: studentId,
        session_id: sessionId,
        subject_id: subjectId,
        date,
        current_status: currentStatus,
        requested_status: requestedStatus,
        reason: reason.trim(),
      });

      setReason('');
      toast({
        variant: 'success',
        title: 'Correction request submitted',
        description: 'Your course professor has been notified for verification.',
      });
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Failed to submit correction request.';
      setFormError(msg);
      toast({ variant: 'error', title: 'Submission failed', description: msg });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Correction & Dispute Requests"
        description="Submit attendance adjustment requests with verifiable justification for medical or sanctioned leave"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>New Correction Request</CardTitle>
              <CardDescription>
                Provide lecture details and supporting explanation
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            {formError && (
              <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Select
                label="Course Subject"
                required
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
              >
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.code} — {sub.name}
                  </option>
                ))}
              </Select>

              <DatePicker
                label="Lecture Date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />

              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Recorded Status"
                  value={currentStatus}
                  onChange={(e) =>
                    setCurrentStatus(e.target.value as AttendanceStatus)
                  }
                >
                  <option value="absent">Absent</option>
                  <option value="leave">On Leave</option>
                </Select>

                <Select
                  label="Requested Status"
                  required
                  value={requestedStatus}
                  onChange={(e) =>
                    setRequestedStatus(e.target.value as AttendanceStatus)
                  }
                >
                  <option value="present">Present</option>
                  <option value="leave">On Leave (Medical)</option>
                </Select>
              </div>

              <Textarea
                label="Detailed Reason & Justification"
                required
                rows={4}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain why your status should be updated (e.g. medical certificate submitted, sanctioned IEEE competition duty)..."
              />

              <Button
                type="submit"
                variant="primary"
                className="w-full"
                leftIcon={<Send className="w-3.5 h-3.5" />}
              >
                Submit Request to Faculty
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Submitted Requests History</CardTitle>
              <CardDescription>
                Track review decisions and remarks from your professors
              </CardDescription>
            </div>
            <Badge variant="neutral">{requests.length} total</Badge>
          </CardHeader>

          <CardContent className="p-0">
            {requests.length === 0 ? (
              <EmptyState
                icon={<FileCheck2 className="w-5 h-5" />}
                title="No correction requests submitted"
                description="Use the form on the left if you need to dispute a recorded absence."
              />
            ) : (
              <div className="divide-y divide-border max-h-[540px] overflow-y-auto">
                {requests.map((req) => {
                  const sub = subjects.find((s) => s.id === req.subject_id);

                  return (
                    <div key={req.id} className="px-5 py-4 space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="primary" className="font-mono">
                            {sub?.code}
                          </Badge>
                          <span className="font-semibold text-xs sm:text-sm text-primary">
                            {sub?.name}
                          </span>
                        </div>
                        <Badge
                          variant={
                            req.status === 'approved'
                              ? 'success'
                              : req.status === 'rejected'
                              ? 'danger'
                              : 'warning'
                          }
                          dot
                        >
                          {req.status.toUpperCase()}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-secondary">
                        <span>
                          Lecture Date:{' '}
                          <strong className="text-primary font-mono">
                            {req.date}
                          </strong>
                        </span>
                        <span className="text-muted">•</span>
                        <span className="inline-flex items-center gap-1.5">
                          <Badge variant="danger">
                            {req.current_status.toUpperCase()}
                          </Badge>
                          <span className="text-muted">→</span>
                          <Badge variant="success">
                            {req.requested_status.toUpperCase()}
                          </Badge>
                        </span>
                      </div>

                      <p className="text-xs text-secondary bg-subtle/60 p-3 rounded-lg border border-border italic leading-relaxed">
                        &ldquo;{req.reason}&rdquo;
                      </p>

                      {req.review_notes && (
                        <div className="text-xs bg-brand-50/60 text-primary p-3 rounded-lg border border-brand-200">
                          <span className="font-semibold">
                            Faculty Response:{' '}
                          </span>
                          <span className="text-secondary">
                            {req.review_notes}
                          </span>
                        </div>
                      )}

                      <p className="text-[11px] text-muted font-mono tabular-nums">
                        Submitted {new Date(req.created_at).toLocaleString()}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
