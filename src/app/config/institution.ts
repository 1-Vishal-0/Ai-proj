import { School } from 'lucide-react';

export const INSTITUTION_CONFIG = {
  portalName: 'SMART ATTENDANCE & ACADEMIC PORTAL',
  shortPortalName: 'Academic Portal',
  subtitle: 'Academic & Attendance Management System',
  sidebarSubtitle: 'Smart Attendance Management',
  campusTagline: 'Engineering & Technology Campus',
  collegeLabel: 'College of Engineering & Technology',
  shortCollegeLabel: 'College of Engineering',
  location: 'University Campus, Bengaluru',
  accreditationBadges: [
    'Autonomous Technical Institute',
    'AICTE Approved',
    'Faculty of Engineering',
  ],
  copyright: 'Smart Attendance & Academic Management System • All Rights Reserved',
  logoIcon: School,
  academicDefaults: {
    academicYear: '2026-2027',
    defaultThresholdPercentage: 75,
    defaultWarningThreshold: 80,
    defaultSchemeId: 'scheme-vtu-2022',
    defaultClassId: 'class-cse-5a',
    defaultSubjectId: 'sub-bcs501',
    defaultTeacherId: 'teacher-amcec-1',
    defaultStudentId: 'stu-amcec-1',
  },
} as const;

