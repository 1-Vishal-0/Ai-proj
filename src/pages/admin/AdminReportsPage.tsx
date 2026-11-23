import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Filter,
  Printer,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Users,
  BookOpen
} from 'lucide-react';
import { db } from '../../services/db/database';
import { exportToCSV } from '../../services/export.service';
import { Badge } from '../../components/common/Badge';

export const AdminReportsPage: React.FC = () => {
  const [reportType, setReportType] = useState<
    'student' | 'class' | 'subject' | 'low-attendance' | 'daily'
  >('student');
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('all');
  const [thresholdInput, setThresholdInput] = useState<number>(75);

  const classes = db.getClasses();
  const departments = db.getDepartments();
  const subjects = db.getSubjects();
  const students = db.getEnrichedStudents();
  const settings = db.getSettings();

  // 1. Student-wise report generation
  const generateStudentRows = () => {
    return students
      .filter((s) => selectedClassId === 'all' || s.class_id === selectedClassId)
      .filter((s) => selectedDeptId === 'all' || s.department_id === selectedDeptId)
      .map((s) => {
        const stats = db.calculateStudentAttendance(s.id);
        return {
          rollNumber: s.roll_number,
          name: s.user.name,
          email: s.user.email,
          class: s.academic_class?.name || s.class_id,
          dept: s.department?.name || s.department_id,
          total: stats.totalSessions,
          present: stats.present,
          absent: stats.absent,
          leave: stats.leave,
          percentage: stats.percentage,
          status: stats.percentage < thresholdInput ? 'Below Threshold' : 'Satisfactory',
        };
      });
  };

  // 2. Class-wise report generation
  const generateClassRows = () => {
    return classes.map((c) => {
      const classStudents = students.filter((s) => s.class_id === c.id);
      let totalPct = 0;
      let totalAttended = 0;
      let totalSessions = 0;

      classStudents.forEach((s) => {
        const stats = db.calculateStudentAttendance(s.id);
        totalPct += stats.percentage;
        totalAttended += stats.present;
        totalSessions += stats.totalSessions;
      });

      const avgPct = classStudents.length > 0 ? Math.round((totalPct / classStudents.length) * 10) / 10 : 0;
      const dept = departments.find((d) => d.id === c.department_id);

      return {
        className: c.name,
        department: dept?.name || c.department_id,
        semester: c.semester,
        studentCount: classStudents.length,
        averageAttendance: avgPct,
        sessionsConducted: totalSessions > 0 && classStudents.length > 0 ? Math.round(totalSessions / classStudents.length) : 0,
      };
    });
  };

  // 3. Subject-wise report generation
  const generateSubjectRows = () => {
    return subjects.map((sub) => {
      const dept = departments.find((d) => d.id === sub.department_id);
      const sessions = db.getSessions({ subject_id: sub.id });
      let presentCount = 0;
      let totalRecords = 0;

      sessions.forEach((s) => {
        const recs = db.getRecords(s.id);
        recs.forEach((r) => {
          totalRecords++;
          if (r.status === 'present') presentCount++;
        });
      });

      const pct = totalRecords > 0 ? Math.round((presentCount / totalRecords) * 1000) / 10 : 0;

      return {
        code: sub.code,
        name: sub.name,
        department: dept?.code || 'DEPT',
        credits: sub.credits,
        sessionsCount: sessions.length,
        turnoutPercentage: pct,
      };
    });
  };

  // 4. Low attendance defaulters
  const generateLowAttendanceRows = () => {
    return db.getLowAttendanceStudents(thresholdInput).map((item) => ({
      rollNumber: item.student.roll_number,
      name: item.student.user.name,
      class: item.student.academic_class?.name || item.student.class_id,
      guardianPhone: item.student.guardian_phone || 'N/A',
      guardianEmail: item.student.guardian_email || 'N/A',
      totalClasses: item.totalClasses,
      attended: item.attended,
      missed: item.missed,
      percentage: item.overallPercentage,
      deficit: Math.max(0, Math.ceil((thresholdInput * item.totalClasses - 100 * item.attended) / (100 - thresholdInput))),
    }));
  };

  // CSV Export Handlers
  const handleExportCSV = () => {
    const today = new Date().toISOString().split('T')[0];

    if (reportType === 'student') {
      const data = generateStudentRows();
      const headers = ['Roll No', 'Student Name', 'Email', 'Class', 'Department', 'Total Lectures', 'Present', 'Absent', 'On Leave', 'Attendance %', 'Eligibility Status'];
      const rows = data.map((d) => [d.rollNumber, d.name, d.email, d.class, d.dept, d.total, d.present, d.absent, d.leave, `${d.percentage}%`, d.status]);
      exportToCSV(`Student_Attendance_Report_${today}.csv`, headers, rows);
    } else if (reportType === 'class') {
      const data = generateClassRows();
      const headers = ['Class Name', 'Department', 'Semester', 'Enrolled Students', 'Average Attendance %', 'Lectures Conducted'];
      const rows = data.map((d) => [d.className, d.department, d.semester, d.studentCount, `${d.averageAttendance}%`, d.sessionsConducted]);
      exportToCSV(`Class_Attendance_Report_${today}.csv`, headers, rows);
    } else if (reportType === 'subject') {
      const data = generateSubjectRows();
      const headers = ['Course Code', 'Subject Title', 'Department', 'Credits', 'Lectures Held', 'Attendance Turnout %'];
      const rows = data.map((d) => [d.code, d.name, d.department, d.credits, d.sessionsCount, `${d.turnoutPercentage}%`]);
      exportToCSV(`Subject_Attendance_Report_${today}.csv`, headers, rows);
    } else if (reportType === 'low-attendance') {
      const data = generateLowAttendanceRows();
      const headers = ['Roll No', 'Student Name', 'Class', 'Guardian Phone', 'Guardian Email', 'Total Classes', 'Attended', 'Missed', 'Current Attendance %', 'Classes Needed to Reach 75%'];
      const rows = data.map((d) => [d.rollNumber, d.name, d.class, d.guardianPhone, d.guardianEmail, d.totalClasses, d.attended, d.missed, `${d.percentage}%`, d.deficit]);
      exportToCSV(`Low_Attendance_Defaulters_Report_${today}.csv`, headers, rows);
    }
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Institutional Attendance Reports & CSV Export</h2>
          <p className="text-xs text-slate-500">
            Generate audit-ready reports, export official spreadsheets, and examine student shortages
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="no-print inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 transition"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Print View</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="no-print inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-700 shadow-sm transition"
          >
            <Download className="w-4 h-4" />
            <span>Export to CSV</span>
          </button>
        </div>
      </div>

      {/* Filter and Configuration Card */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3 no-print">
        <div className="flex flex-wrap gap-2 pb-3 border-b border-slate-100">
          <button
            onClick={() => setReportType('student')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              reportType === 'student' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Student-Wise Report
          </button>
          <button
            onClick={() => setReportType('low-attendance')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              reportType === 'low-attendance' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Low Attendance Defaulters ({generateLowAttendanceRows().length})
          </button>
          <button
            onClick={() => setReportType('class')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              reportType === 'class' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Class-Wise Summary
          </button>
          <button
            onClick={() => setReportType('subject')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              reportType === 'subject' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Subject-Wise Summary
          </button>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          {reportType === 'student' && (
            <>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Class Filter</label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="all">All Classes</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Department</label>
                <select
                  value={selectedDeptId}
                  onChange={(e) => setSelectedDeptId(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="all">All Departments</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.code} - {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {reportType === 'low-attendance' && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Threshold Percentage Cutoff (%)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={thresholdInput}
                  onChange={(e) => setThresholdInput(Number(e.target.value))}
                  className="w-24 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-rose-600 focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
                <span className="text-xs text-slate-500 font-medium">%</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Generated Report Table Preview */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Report Data Preview
          </h3>
          <span className="text-xs text-slate-400">
            Export format: CSV (RFC 4180 Compliant)
          </span>
        </div>

        <div className="overflow-x-auto">
          {reportType === 'student' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Roll No</th>
                  <th className="py-2.5 px-3">Student Name</th>
                  <th className="py-2.5 px-3">Class</th>
                  <th className="py-2.5 px-3 text-center">Total Sessions</th>
                  <th className="py-2.5 px-3 text-center">Present</th>
                  <th className="py-2.5 px-3 text-center">Absent</th>
                  <th className="py-2.5 px-3 text-center">Leave</th>
                  <th className="py-2.5 px-3 text-right">Attendance %</th>
                  <th className="py-2.5 px-3 text-right">Eligibility Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {generateStudentRows().map((row) => (
                  <tr key={row.rollNumber} className="hover:bg-slate-50/70 transition">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-700">{row.rollNumber}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{row.name}</td>
                    <td className="py-2.5 px-3 text-slate-600">{row.class}</td>
                    <td className="py-2.5 px-3 text-center font-mono">{row.total}</td>
                    <td className="py-2.5 px-3 text-center font-mono text-emerald-600 font-bold">{row.present}</td>
                    <td className="py-2.5 px-3 text-center font-mono text-rose-600 font-bold">{row.absent}</td>
                    <td className="py-2.5 px-3 text-center font-mono text-amber-600">{row.leave}</td>
                    <td className="py-2.5 px-3 text-right font-bold font-mono">
                      <span className={row.percentage < thresholdInput ? 'text-rose-600' : 'text-emerald-600'}>
                        {row.percentage}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {row.percentage < thresholdInput ? (
                        <Badge variant="danger" dot>Defaulter</Badge>
                      ) : (
                        <Badge variant="success" dot>Eligible</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {reportType === 'low-attendance' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Roll No</th>
                  <th className="py-2.5 px-3">Student Name</th>
                  <th className="py-2.5 px-3">Class</th>
                  <th className="py-2.5 px-3">Guardian Contact</th>
                  <th className="py-2.5 px-3 text-center">Lectures Held</th>
                  <th className="py-2.5 px-3 text-center">Attended</th>
                  <th className="py-2.5 px-3 text-center">Missed</th>
                  <th className="py-2.5 px-3 text-right">Current Attendance</th>
                  <th className="py-2.5 px-3 text-right">Required To Attend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {generateLowAttendanceRows().map((row) => (
                  <tr key={row.rollNumber} className="hover:bg-slate-50/70 transition bg-rose-50/20">
                    <td className="py-2.5 px-3 font-mono font-bold text-rose-700">{row.rollNumber}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{row.name}</td>
                    <td className="py-2.5 px-3 text-slate-600">{row.class}</td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">{row.guardianPhone}</td>
                    <td className="py-2.5 px-3 text-center font-mono">{row.totalClasses}</td>
                    <td className="py-2.5 px-3 text-center font-mono text-emerald-600 font-bold">{row.attended}</td>
                    <td className="py-2.5 px-3 text-center font-mono text-rose-600 font-bold">{row.missed}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-600 text-xs">
                      {row.percentage}%
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className="font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded text-[11px]">
                        +{row.deficit} Classes
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {reportType === 'class' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Class Name</th>
                  <th className="py-2.5 px-3">Department</th>
                  <th className="py-2.5 px-3">Semester</th>
                  <th className="py-2.5 px-3 text-center">Enrolled Students</th>
                  <th className="py-2.5 px-3 text-center">Avg Sessions Held</th>
                  <th className="py-2.5 px-3 text-right">Class Turnout %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {generateClassRows().map((row) => (
                  <tr key={row.className} className="hover:bg-slate-50/70 transition">
                    <td className="py-2.5 px-3 font-bold text-slate-900">{row.className}</td>
                    <td className="py-2.5 px-3 text-slate-600">{row.department}</td>
                    <td className="py-2.5 px-3 font-mono">Sem {row.semester}</td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-800">{row.studentCount}</td>
                    <td className="py-2.5 px-3 text-center font-mono">{row.sessionsConducted}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-blue-600 font-mono">
                      {row.averageAttendance}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {reportType === 'subject' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Subject Code</th>
                  <th className="py-2.5 px-3">Course Title</th>
                  <th className="py-2.5 px-3">Department</th>
                  <th className="py-2.5 px-3 text-center">Credits</th>
                  <th className="py-2.5 px-3 text-center">Sessions Held</th>
                  <th className="py-2.5 px-3 text-right">Average Attendance %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {generateSubjectRows().map((row) => (
                  <tr key={row.code} className="hover:bg-slate-50/70 transition">
                    <td className="py-2.5 px-3 font-mono font-bold text-blue-600">{row.code}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{row.name}</td>
                    <td className="py-2.5 px-3 text-slate-600">{row.department}</td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold">{row.credits}</td>
                    <td className="py-2.5 px-3 text-center font-mono">{row.sessionsCount}</td>
                    <td className="py-2.5 px-3 text-right font-bold font-mono text-emerald-600">
                      {row.turnoutPercentage}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
