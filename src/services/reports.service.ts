import { db } from './db/database';
import { exportToCSV } from './export.service';
import { calculateClassesNeededForThreshold } from '../lib/attendance';
import { getTodayIsoDate } from '../lib/date';

export interface CourseReportRow {
  roll: string;
  name: string;
  total: number;
  present: number;
  absent: number;
  leave: number;
  percentage: number;
  status: string;
}

export const reportsService = {
  getStudentReportRows(filters: {
    classId: string;
    deptId: string;
    threshold: number;
  }) {
    return db
      .getEnrichedStudents()
      .filter((s) => filters.classId === 'all' || s.class_id === filters.classId)
      .filter((s) => filters.deptId === 'all' || s.department_id === filters.deptId)
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
          status: stats.percentage < filters.threshold ? 'Below Threshold' : 'Satisfactory',
        };
      });
  },

  getClassReportRows() {
    const students = db.getEnrichedStudents();
    const departments = db.getDepartments();

    return db.getClasses().map((c) => {
      const classStudents = students.filter((s) => s.class_id === c.id);
      let totalPct = 0;
      let totalSessions = 0;

      classStudents.forEach((s) => {
        const stats = db.calculateStudentAttendance(s.id);
        totalPct += stats.percentage;
        totalSessions += stats.totalSessions;
      });

      const avgPct =
        classStudents.length > 0
          ? Math.round((totalPct / classStudents.length) * 10) / 10
          : 0;
      const dept = departments.find((d) => d.id === c.department_id);

      return {
        className: c.name,
        department: dept?.name || c.department_id,
        semester: c.semester,
        studentCount: classStudents.length,
        averageAttendance: avgPct,
        sessionsConducted:
          totalSessions > 0 && classStudents.length > 0
            ? Math.round(totalSessions / classStudents.length)
            : 0,
      };
    });
  },

  getSubjectReportRows() {
    const departments = db.getDepartments();

    return db.getSubjects().map((sub) => {
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

      const pct =
        totalRecords > 0 ? Math.round((presentCount / totalRecords) * 1000) / 10 : 0;

      return {
        code: sub.code,
        name: sub.name,
        department: dept?.code || 'DEPT',
        credits: sub.credits,
        sessionsCount: sessions.length,
        turnoutPercentage: pct,
      };
    });
  },

  getLowAttendanceReportRows(threshold: number) {
    return db.getLowAttendanceStudents(threshold).map((item) => ({
      rollNumber: item.student.roll_number,
      name: item.student.user.name,
      class: item.student.academic_class?.name || item.student.class_id,
      guardianPhone: item.student.guardian_phone || 'N/A',
      guardianEmail: item.student.guardian_email || 'N/A',
      totalClasses: item.totalClasses,
      attended: item.attended,
      missed: item.missed,
      percentage: item.overallPercentage,
      deficit: calculateClassesNeededForThreshold(
        item.attended,
        item.totalClasses,
        threshold
      ),
    }));
  },

  getCourseReportRows(classId: string, subjectId: string): CourseReportRow[] {
    const threshold = db.getSettings().threshold_percentage;
    const classStudents = db
      .getEnrichedStudents()
      .filter((s) => s.class_id === classId);

    return classStudents.map((s) => {
      const stats = db.calculateStudentAttendance(s.id, subjectId);
      return {
        roll: s.roll_number,
        name: s.user.name,
        total: stats.totalSessions,
        present: stats.present,
        absent: stats.absent,
        leave: stats.leave,
        percentage: stats.percentage,
        status: stats.percentage < threshold ? 'Low Attendance' : 'Satisfactory',
      };
    });
  },

  exportAdminReportCSV(
    reportType: 'student' | 'class' | 'subject' | 'low-attendance',
    filters: { classId: string; deptId: string; threshold: number }
  ): void {
    const today = getTodayIsoDate();

    if (reportType === 'student') {
      const data = this.getStudentReportRows(filters);
      const headers = [
        'Roll No',
        'Student Name',
        'Email',
        'Class',
        'Department',
        'Total Lectures',
        'Present',
        'Absent',
        'On Leave',
        'Attendance %',
        'Eligibility Status',
      ];
      const rows = data.map((d) => [
        d.rollNumber,
        d.name,
        d.email,
        d.class,
        d.dept,
        d.total,
        d.present,
        d.absent,
        d.leave,
        `${d.percentage}%`,
        d.status,
      ]);
      exportToCSV(`Student_Attendance_Report_${today}.csv`, headers, rows);
    } else if (reportType === 'class') {
      const data = this.getClassReportRows();
      const headers = [
        'Class Name',
        'Department',
        'Semester',
        'Enrolled Students',
        'Average Attendance %',
        'Lectures Conducted',
      ];
      const rows = data.map((d) => [
        d.className,
        d.department,
        d.semester,
        d.studentCount,
        `${d.averageAttendance}%`,
        d.sessionsConducted,
      ]);
      exportToCSV(`Class_Attendance_Report_${today}.csv`, headers, rows);
    } else if (reportType === 'subject') {
      const data = this.getSubjectReportRows();
      const headers = [
        'Course Code',
        'Subject Title',
        'Department',
        'Credits',
        'Lectures Held',
        'Attendance Turnout %',
      ];
      const rows = data.map((d) => [
        d.code,
        d.name,
        d.department,
        d.credits,
        d.sessionsCount,
        `${d.turnoutPercentage}%`,
      ]);
      exportToCSV(`Subject_Attendance_Report_${today}.csv`, headers, rows);
    } else {
      const data = this.getLowAttendanceReportRows(filters.threshold);
      const headers = [
        'Roll No',
        'Student Name',
        'Class',
        'Guardian Phone',
        'Guardian Email',
        'Total Classes',
        'Attended',
        'Missed',
        'Current Attendance %',
        'Classes Needed to Reach 75%',
      ];
      const rows = data.map((d) => [
        d.rollNumber,
        d.name,
        d.class,
        d.guardianPhone,
        d.guardianEmail,
        d.totalClasses,
        d.attended,
        d.missed,
        `${d.percentage}%`,
        Number.isFinite(d.deficit) ? d.deficit : 'N/A',
      ]);
      exportToCSV(`Low_Attendance_Defaulters_Report_${today}.csv`, headers, rows);
    }
  },

  exportCourseReportCSV(classId: string, subjectId: string): void {
    const cls = db.getClasses().find((c) => c.id === classId);
    const sub = db.getSubjects().find((s) => s.id === subjectId);
    const today = getTodayIsoDate();
    const reportData = this.getCourseReportRows(classId, subjectId);

    const headers = [
      'Roll Number',
      'Student Name',
      'Total Sessions',
      'Attended',
      'Absent',
      'On Leave',
      'Attendance %',
      'Status',
    ];
    const rows = reportData.map((d) => [
      d.roll,
      d.name,
      d.total,
      d.present,
      d.absent,
      d.leave,
      `${d.percentage}%`,
      d.status,
    ]);

    exportToCSV(
      `${sub?.code || 'Subject'}_${cls?.name || 'Class'}_Attendance_${today}.csv`,
      headers,
      rows
    );
  },

  exportCSV(filename: string, headers: string[], rows: (string | number)[][]): void {
    exportToCSV(filename, headers, rows);
  },
};
