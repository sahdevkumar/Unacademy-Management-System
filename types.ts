import React from 'react';

export enum View {
  DASHBOARD = 'DASHBOARD',
  TABLE_EDITOR = 'TABLE_EDITOR',
  LIVE_SCHEDULE = 'LIVE_SCHEDULE',
  CLASS_SCHEDULE = 'CLASS_SCHEDULE',
  TEACHERS = 'TEACHERS',
  AUTH = 'AUTH',
  SETTINGS = 'SETTINGS'
}

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