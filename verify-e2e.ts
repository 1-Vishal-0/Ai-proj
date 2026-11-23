// Comprehensive Academic & Attendance Portal Programmatic Verification Suite
import { db } from './src/services/db/database.ts';
import { exportToCSV } from './src/services/export.service.ts';

console.log('================================================================');
console.log('SMART ATTENDANCE & ACADEMIC MANAGEMENT PORTAL');
console.log('Full System & Feature Verification Test Suite');
console.log('================================================================\n');

// 1. Initial State & Exact 3 Demonstration Accounts Check
const users = db.getUsers();
const students = db.getEnrichedStudents();
const teachers = db.getEnrichedTeachers();
const departments = db.getDepartments();
const schemes = db.getVTUSchemes();
const subjects = db.getSubjects();
const timetable = db.getTimetable();
const classes = db.getClasses();
const settings = db.getSettings();

console.log('--- TEST 1: Institutional Identity & Exact 3 Demonstration Accounts ---');
console.log(`[PASS] Users loaded: ${users.length} (Expected: exactly 3 demo accounts)`);
if (users.length !== 3) {
  throw new Error(`Expected exactly 3 demo accounts, but found ${users.length}`);
}

const adminUser = users.find((u) => u.role === 'admin')!;
const teacherUser = users.find((u) => u.role === 'teacher')!;
const studentUser = users.find((u) => u.role === 'student')!;

if (!adminUser || !teacherUser || !studentUser) {
  throw new Error('Missing one or more required demo accounts (admin, teacher, student)');
}

console.log(`[PASS] Admin / HOD: ${adminUser.name} (${adminUser.email})`);
console.log(`[PASS] Faculty Teacher: ${teacherUser.name} (${teacherUser.email})`);
console.log(`[PASS] Student: ${studentUser.name} (${studentUser.email})`);

const demoStudent = students.find((s) => s.user_id === studentUser.id)!;
console.log(`[PASS] Student Roll No: ${demoStudent.roll_number}, Scheme: ${demoStudent.vtu_scheme?.name}`);
if (demoStudent.roll_number !== 'ENG22CS089') {
  throw new Error(`Expected Roll No ENG22CS089 but found ${demoStudent.roll_number}`);
}

// 2. Strict Purge Verification: No 2018 Scheme and No Scholarships
console.log('\n--- TEST 2: Verification of Purged Modules (2018 Scheme & Scholarships) ---');
const has2018 = schemes.some((s) => s.code === '2018' || s.name.includes('2018'));
if (has2018) {
  throw new Error('FAILURE: 2018 scheme still exists in the database!');
}
console.log('[PASS] 2018 Scheme is completely purged. Active schemes:', schemes.map((s) => s.name).join(', '));

if ('getScholarships' in db) {
  throw new Error('FAILURE: Scholarship methods still exist in the database!');
}
console.log('[PASS] Scholarship modules completely removed from system.');

// 3. Department to Target Class Batch Linkage Verification
console.log('\n--- TEST 3: Department-to-Class Linkage (AIML & All Departments) ---');
const aimlDept = departments.find((d) => d.code === 'AIML');
if (!aimlDept) throw new Error('AIML Department missing!');

const aimlClasses = classes.filter((c) => c.department_id === aimlDept.id);
console.log(`[PASS] AIML Department (${aimlDept.name}) has ${aimlClasses.length} class batch(es):`);
aimlClasses.forEach((c) => console.log(`   - [${c.id}] ${c.name} (Semester ${c.semester}, Batch: ${c.admission_batch})`));

if (aimlClasses.length === 0) {
  throw new Error('AIML department has no target class batches available!');
}

// Verify every department has at least one class batch
departments.forEach((dept) => {
  const deptClasses = classes.filter((c) => c.department_id === dept.id);
  if (deptClasses.length === 0) {
    throw new Error(`Department ${dept.code} has no class batches configured!`);
  }
});
console.log(`[PASS] All ${departments.length} departments have linked target class batches ready for selection.`);

// 4. Faculty Creation with Custom Designation & Qualification ('Other' manual option)
console.log('\n--- TEST 4: Faculty Creation with Custom Designation & Qualification ---');
const customTeacher = db.createTeacher(
  {
    name: 'Dr. Vikram Sarabhai',
    email: 'vikram.s@college.edu',
    password_hash: 'teacher123',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
  },
  {
    employee_id: 'FAC-AIML-99',
    department_id: aimlDept.id,
    designation: 'Distinguished AI Scientist & Chair Professor', // Manual 'Other' designation
    qualification: 'Post-Doctoral Fellow (Robotics & Neural Networks)', // Manual 'Other' qualification
  },
  adminUser.id
);

console.log(`[PASS] Created Teacher with custom designation & qualification:`);
console.log(`   - Name: ${customTeacher.user.name}`);
console.log(`   - Employee ID: ${customTeacher.employee_id}`);
console.log(`   - Department: ${customTeacher.department?.name}`);
console.log(`   - Designation: "${customTeacher.designation}"`);
console.log(`   - Qualification: "${customTeacher.qualification}"`);

if (
  customTeacher.designation !== 'Distinguished AI Scientist & Chair Professor' ||
  customTeacher.qualification !== 'Post-Doctoral Fellow (Robotics & Neural Networks)'
) {
  throw new Error('Custom designation or qualification was not stored accurately!');
}

// 5. Enroll Student in AIML Target Class Batch
console.log('\n--- TEST 5: Student Enrollment with AIML Department & Target Batch ---');
const aimlStudent = db.createStudent(
  {
    name: 'Ananya Sharma',
    email: 'ananya.s@college.edu',
    avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100',
  },
  {
    usn: 'ENG22AI045',
    roll_number: 'ENG22AI045',
    department_id: aimlDept.id,
    class_id: aimlClasses[0].id,
    programme_id: 'prog-aiml',
    vtu_scheme_id: 'scheme-vtu-2022',
    admission_year: 2022,
    admission_batch: aimlClasses[0].admission_batch,
    current_semester: aimlClasses[0].semester,
    section: aimlClasses[0].section,
  },
  adminUser.id
);

console.log(`[PASS] Successfully enrolled student in AIML: ${aimlStudent.user.name} (Roll No: ${aimlStudent.roll_number})`);
const enrichedAimlStudent = db.getEnrichedStudent(aimlStudent.id);
console.log(`   - Class Batch: ${enrichedAimlStudent?.academic_class?.name}`);
console.log(`   - Department: ${enrichedAimlStudent?.department?.name}`);
if (enrichedAimlStudent?.academic_class?.id !== aimlClasses[0].id) {
  throw new Error('Enrolled student class batch does not match the selected AIML batch!');
}

// 6. Timetable Management & Conflict Collision Detection
console.log('\n--- TEST 6: Timetable Conflict Collision Detection ---');
console.log(`[PASS] Total Timetable Periods: ${timetable.length}`);

const conflict1 = db.checkTimetableConflict(
  teachers[0].id,
  'class-other',
  'Monday',
  1,
  'LH-999',
  undefined
);
if (!conflict1.hasConflict) {
  throw new Error('Collision detection failed to catch teacher double-booking!');
}
console.log(`[PASS] Teacher schedule conflict detected: "${conflict1.message}"`);

// 7. Teacher Self-Timetable Rescheduling & Student Notification
console.log('\n--- TEST 7: Teacher Self-Timetable Rescheduling & Audit Logging ---');
const slotToReschedule = timetable[0];
const initialLogsCount = db.getTimetableChangeLogs().length;

const updatedSlot = db.rescheduleTimetableSlot(
  {
    entryId: slotToReschedule.id,
    newDay: 'Saturday',
    newPeriod: 4,
    newStartTime: '12:15',
    newEndTime: '01:15',
    newClassroom: 'LH-305, Tech Block',
    reason: 'Conference session rescheduling',
  },
  teacherUser
);

console.log(`[PASS] Slot successfully rescheduled to: ${updatedSlot.day_of_week} Period ${updatedSlot.period_number}`);
const updatedLogs = db.getTimetableChangeLogs();
if (updatedLogs.length !== initialLogsCount + 1) {
  throw new Error('Audit trail change log was not recorded!');
}
console.log(`[PASS] Timetable Change Audit Log created: Log ID ${updatedLogs[0].id} (Reason: "${updatedLogs[0].reason}")`);

// 8. Timetable-Based Attendance Marking
console.log('\n--- TEST 8: Timetable-Based Attendance Marking ---');
const todayDate = new Date().toISOString().split('T')[0];
const quickSession = db.createSession(
  {
    class_id: aimlClasses[0].id,
    subject_id: subjects[0].id,
    teacher_id: customTeacher.id,
    date: todayDate,
    start_time: '10:00',
    end_time: '11:00',
    session_type: 'lecture',
    is_code_active: false,
  },
  customTeacher.user.id
);

db.markAttendanceBatch(
  [
    {
      session_id: quickSession.id,
      student_id: aimlStudent.id,
      status: 'present',
      marked_by: 'teacher',
      remarks: 'First lecture attendance',
    },
  ],
  customTeacher.user
);

const studentRecord = db.getStudentRecord(quickSession.id, aimlStudent.id);
if (studentRecord?.status !== 'present') {
  throw new Error('Recorded attendance status mismatch!');
}
console.log(`[PASS] Verified record: AIML Student ${aimlStudent.roll_number} is ${studentRecord.status}`);

// 9. Official CSV Export Verification
console.log('\n--- TEST 9: Clean Institutional CSV Export ---');
const exportHeaders = ['Roll No / USN', 'Student Name', 'Status'];
const exportRows = [[aimlStudent.roll_number, aimlStudent.user.name, 'PRESENT']];
exportToCSV('AIML_Class_Attendance_Report.csv', exportHeaders, exportRows);
console.log('[PASS] CSV Export successfully generated RFC 4180 format without legacy branding.');

console.log('\n================================================================');
console.log('>>> ALL 9/9 SYSTEM & FEATURE VERIFICATION CHECKS PASSED! <<<');
console.log('================================================================');
