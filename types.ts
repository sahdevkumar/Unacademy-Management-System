
import React from 'react';

declare global {
  const __APP_VERSION__: string;
}

export enum View {
  DASHBOARD = 'DASHBOARD',
  TABLE_EDITOR = 'TABLE_EDITOR',
  LIVE_SCHEDULE = 'LIVE_SCHEDULE',
  CLASS_SCHEDULE = 'CLASS_SCHEDULE',
  TEACHERS = 'TEACHERS',
  TEACHER_TASKS = 'TEACHER_TASKS',
  TODAY_TASK = 'TODAY_TASK',
  MY_TASK = 'MY_TASK',
  AUTH = 'AUTH',
  SETTINGS = 'SETTINGS',
  ACCESS_CONTROL = 'ACCESS_CONTROL',
  EMPLOYEES = 'EMPLOYEES',
  WORK_PROGRESS = 'WORK_PROGRESS',
  PAYROLL = 'PAYROLL',
  PAYROLL_DEDUCTIONS = 'PAYROLL_DEDUCTIONS',
  PAYROLL_SETUP = 'PAYROLL_SETUP',
  PAYROLL_BASE_SALARY = 'PAYROLL_BASE_SALARY',
  ABSENT_CALL = 'ABSENT_CALL',
  ABSENT_CALL_LOG = 'ABSENT_CALL_LOG',
  ATTENDANCE_DASHBOARD = 'ATTENDANCE_DASHBOARD',
  ENQUIRE_CALL = 'ENQUIRE_CALL',
  ENQUIRE_CALL_LOG = 'ENQUIRE_CALL_LOG',
  TASK_MANAGEMENT = 'TASK_MANAGEMENT',
  STUDENTS = 'STUDENTS',
  REGISTRATION = 'REGISTRATION',
  ADMISSION = 'ADMISSION',
  STUDENT_FEEDBACK = 'STUDENT_FEEDBACK',
  PROFILE = 'PROFILE',
  FEE_COLLECTION = 'FEE_COLLECTION',
  FEE_STRUCTURE = 'FEE_STRUCTURE',
  BILLING = 'BILLING',
  PARENTS = 'PARENTS',
  NEW_COUNSELLING = 'NEW_COUNSELLING',
  COUNSELLING_LOG = 'COUNSELLING_LOG',
  ACADEMIC_CONTROL = 'ACADEMIC_CONTROL'
}

export type EducationLevel = 'junior' | 'senior' | 'all';

export interface NavItem {
  id: View;
  label: string;
  icon: React.ReactNode;
}

export interface MetricData {
  time: string;
  requests: number;
  errors: number;
}

export interface TableRow {
  id: string;
  schedule_id: string;
  class: string;
  status: string; // 'true' | 'false' | 'recent'
  updated_at: string;
}

export interface SqlHistory {
  id: string;
  query: string;
  timestamp: Date;
}

export interface ClassSession {
  id: string;
  title: string;
  instructor: string;
  instructorPhotoUrl?: string;
  instructorStatus?: 'active' | 'inactive';
  day: string;
  startTime: string;
  endTime: string;
  room: string;
  color: string;
}

export interface ClassInfo {
  id: string;
  name: string;
  section: string;
  room_no: string;
  level?: 'junior' | 'senior'; // junior (6-10), senior (11-13)
}

export interface Teacher {
  id: string;
  name: string;
  email: string;
  subjects: string[];
  phone?: string;
  profile_photo_url?: string;
  status?: 'active' | 'inactive';
  created_at?: string;
}

export interface Employee {
  id: string;
  employee_id?: string;
  full_name: string;
  email: string;
  mobile?: string;
  job_role: string;
  department?: string;
  designation?: string;
  salary_grade_id?: string;
  status: string;
  subjects?: string[];
  profile_photo_url?: string;
  created_at?: string;
}

export interface Parent {
  id: string;
  full_name: string;
  email?: string;
  phone: string;
  address?: string;
  occupation?: string;
  status?: 'active' | 'inactive';
  created_at?: string;
}

export interface Student {
  id: string;
  user_id?: string;
  full_name: string;
  roll_number?: string;
  class_name: string;
  parent_id?: string;
  guardian_name?: string;
  contact_number?: string;
  email?: string;
  address?: string;
  date_of_birth?: string;
  gender?: string;
  status?: 'active' | 'inactive';
  profile_photo_url?: string;
  created_at?: string;
}

export type UserRole = string;

export interface User {
  email: string;
  role: UserRole;
  name: string;
  id: string;
  employee_id?: string;
}

export type PermissionKey = 
  | 'VIEW_DASHBOARD'
  | 'VIEW_SCHEDULE_LIST'
  | 'VIEW_LIVE_SCHEDULE'
  | 'VIEW_CLASS_SCHEDULE'
  | 'VIEW_TEACHER_TASKS'
  | 'VIEW_SETTINGS'
  | 'MANAGE_TEACHERS' 
  | 'DELETE_SCHEDULE' 
  | 'PUBLISH_SCHEDULE' 
  | 'EDIT_SCHEDULE' 
  | 'VIEW_REPORTS' 
  | 'VIEW_ACADEMIC'
  | 'ACCESS_SQL_EDITOR' 
  | 'MANAGE_ROLES';

export type PermissionMap = Record<PermissionKey, UserRole[]>;

export interface LeadSource {
  id: string;
  name: string;
  code?: string;
  department?: string;
}

export interface MapLeader {
  id: string;
  uuid: string;
  name: string;
  employee_id?: string;
}

export interface Counsellor {
  id: string;
  uuid: string;
  name: string;
  employee_id?: string;
}

export interface ActivityLogItem {
  action: 'created' | 'edited' | 'approved' | 'rejected';
  user: string;
  timestamp: string;
  note?: string;
}

export interface RowStudent {
  id: string;
  date: string;
  student_name: string;
  contact_no: string;
  gender: string;
  date_of_birth: string;
  current_class: string;
  email: string;
  address: string;
  parent_data: {
    parents_name: string;
    parent_contact_no: string;
    occupation: string;
  };
  course_interest: {
    current_education_level: string;
    school_name: string;
    preferred_course: string;
    percentage_or_cgpa: string;
    previous_coaching: string;
  };
  additional_information: {
    heard_about: string;
    lead_by?: string;
    concerns_or_queries: string;
    class_id?: string;
    registration_fee_status?: 'paid' | 'unpaid';
  };
  created_by?: string;
  created_at?: string;
  status?: string;
  token_no?: string;
  approved_by?: string;
  rejected_by?: string;
  last_edited_by?: string;
  activity_log?: ActivityLogItem[];
  updated_at?: string;
  counsellor?: string;
  counsellor_eid?: string;
  map_leader_eid?: string;
}
