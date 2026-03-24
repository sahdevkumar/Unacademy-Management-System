-- Supabase Database Schema for Unacademy Management System

-- 0. Clean Slate (Resetting tables to fix type mismatches)
DROP TABLE IF EXISTS payroll_records CASCADE;
DROP TABLE IF EXISTS payroll_settings CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS registrations CASCADE;
DROP TABLE IF EXISTS student_feedback CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS classes CASCADE;
DROP TABLE IF EXISTS system_users CASCADE;
DROP TABLE IF EXISTS weekly_schedules CASCADE;
DROP TABLE IF EXISTS attendance_logs CASCADE;
DROP TABLE IF EXISTS outreach_logs CASCADE;
DROP TABLE IF EXISTS enquiry_leads CASCADE;
DROP TABLE IF EXISTS biometric_devices CASCADE;
DROP TABLE IF EXISTS personnel_tasks CASCADE;
DROP TABLE IF EXISTS subjects CASCADE;
DROP TABLE IF EXISTS sections CASCADE;
DROP TABLE IF EXISTS system_config CASCADE;

-- 1. System Configuration & Auth
CREATE TABLE IF NOT EXISTS system_config (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Update system_users to link with Supabase Auth
CREATE TABLE IF NOT EXISTS system_users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'viewer',
    mobile TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Trigger to create system_user on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.system_users (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    CASE 
      WHEN NEW.email = 'INTERNET.00090@gmail.com' THEN 'superadmin'
      ELSE COALESCE(NEW.raw_user_meta_data->>'role', 'viewer')
    END
  ) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Academic Structure
CREATE TABLE IF NOT EXISTS classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    section TEXT DEFAULT 'A',
    room_no TEXT DEFAULT '0',
    level INTEGER DEFAULT 0, -- 0: junior, 1: senior
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS teachers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone TEXT,
    subjects TEXT[], -- Array of subject names or IDs
    profile_photo_url TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    roll_number TEXT UNIQUE,
    class_name TEXT REFERENCES classes(name),
    guardian_name TEXT,
    contact_number TEXT,
    email TEXT,
    address TEXT,
    date_of_birth DATE,
    gender TEXT,
    status TEXT DEFAULT 'active',
    profile_photo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS weekly_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class TEXT REFERENCES classes(name),
    schedule_id TEXT UNIQUE,
    content JSONB NOT NULL, -- Array of ClassSession objects
    status TEXT DEFAULT 'false', -- 'true' for published, 'false' for draft
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Attendance & Outreach
CREATE TABLE IF NOT EXISTS attendance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT NOT NULL,
    student_name TEXT,
    class_name TEXT,
    status TEXT DEFAULT 'present',
    date DATE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, date)
);

CREATE TABLE IF NOT EXISTS outreach_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT NOT NULL,
    student_name TEXT,
    class_name TEXT,
    guardian_name TEXT,
    contact_number TEXT,
    date DATE NOT NULL,
    outcome TEXT,
    note TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS enquiry_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_name TEXT NOT NULL,
    parent_name TEXT,
    phone TEXT NOT NULL,
    email TEXT,
    source TEXT,
    status TEXT DEFAULT 'new',
    call_history JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Biometric System
CREATE TABLE IF NOT EXISTS biometric_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    device_key TEXT UNIQUE NOT NULL,
    ip_address TEXT,
    port INTEGER DEFAULT 80,
    status TEXT DEFAULT 'offline',
    last_sync TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Human Resources & Payroll
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    mobile TEXT,
    job_role TEXT,
    department TEXT,
    designation TEXT,
    salary_grade_id TEXT,
    base_salary NUMERIC DEFAULT 0,
    allowances NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS personnel_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    assigned_to TEXT, -- Employee ID or Name
    due_date DATE,
    priority TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payroll_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES employees(id),
    month TEXT NOT NULL, -- e.g., '2024-03'
    base_salary NUMERIC NOT NULL,
    allowances NUMERIC DEFAULT 0,
    deductions NUMERIC DEFAULT 0,
    net_salary NUMERIC NOT NULL,
    status TEXT DEFAULT 'pending',
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payroll_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tax_rate_percent NUMERIC DEFAULT 0,
    provident_fund_percent NUMERIC DEFAULT 0,
    insurance_flat_deduction NUMERIC DEFAULT 0,
    currency TEXT DEFAULT 'USD',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Access Control Assignments
CREATE TABLE IF NOT EXISTS user_assignments (
    user_id UUID PRIMARY KEY REFERENCES system_users(id),
    assigned_classes TEXT[], -- Array of class names
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_name TEXT NOT NULL,
    parent_name TEXT,
    phone TEXT NOT NULL,
    email TEXT,
    class_id UUID REFERENCES classes(id),
    status TEXT DEFAULT 'pending', -- pending, approved, rejected, admitted
    registration_fee_status TEXT DEFAULT 'unpaid',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS student_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id),
    feedback_text TEXT NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS for all tables
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE enquiry_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE biometric_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE personnel_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_feedback ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for all tables (Public access for demo/internal system)
DROP POLICY IF EXISTS "Allow all on system_config" ON system_config;
CREATE POLICY "Allow all on system_config" ON system_config FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on system_users" ON system_users;
CREATE POLICY "Allow all on system_users" ON system_users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on classes" ON classes;
CREATE POLICY "Allow all on classes" ON classes FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on subjects" ON subjects;
CREATE POLICY "Allow all on subjects" ON subjects FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on sections" ON sections;
CREATE POLICY "Allow all on sections" ON sections FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on teachers" ON teachers;
CREATE POLICY "Allow all on teachers" ON teachers FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on students" ON students;
CREATE POLICY "Allow all on students" ON students FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on weekly_schedules" ON weekly_schedules;
CREATE POLICY "Allow all on weekly_schedules" ON weekly_schedules FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on attendance_logs" ON attendance_logs;
CREATE POLICY "Allow all on attendance_logs" ON attendance_logs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on outreach_logs" ON outreach_logs;
CREATE POLICY "Allow all on outreach_logs" ON outreach_logs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on enquiry_leads" ON enquiry_leads;
CREATE POLICY "Allow all on enquiry_leads" ON enquiry_leads FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on biometric_devices" ON biometric_devices;
CREATE POLICY "Allow all on biometric_devices" ON biometric_devices FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on employees" ON employees;
CREATE POLICY "Allow all on employees" ON employees FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on personnel_tasks" ON personnel_tasks;
CREATE POLICY "Allow all on personnel_tasks" ON personnel_tasks FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on payroll_records" ON payroll_records;
CREATE POLICY "Allow all on payroll_records" ON payroll_records FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on payroll_settings" ON payroll_settings;
CREATE POLICY "Allow all on payroll_settings" ON payroll_settings FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on user_assignments" ON user_assignments;
CREATE POLICY "Allow all on user_assignments" ON user_assignments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on registrations" ON registrations;
CREATE POLICY "Allow all on registrations" ON registrations FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on student_feedback" ON student_feedback;
CREATE POLICY "Allow all on student_feedback" ON student_feedback FOR ALL USING (true) WITH CHECK (true);

-- Initial Data
INSERT INTO system_config (key, value) VALUES 
('system_roles', '["superadmin", "administrator", "editor", "teacher", "viewer"]'),
('system_departments', '["Academic", "Administration", "IT Support", "Human Resources"]'),
('system_designations', '["Counselling", "Academic Works", "Director", "Teacher", "Faculty Coordinator", "Office Manager", "HR Lead", "Recruiter", "System Admin", "Support Tech"]'),
('dept_designation_map', '{"Academic": ["Academic Works", "Teacher", "Faculty Coordinator"], "Administration": ["Director", "Counselling", "Office Manager"], "Human Resources": ["HR Lead", "Recruiter"], "IT Support": ["System Admin", "Support Tech"]}'),
('permissions_matrix', '{
  "VIEW_DASHBOARD": ["superadmin", "administrator", "admin", "editor", "teacher", "viewer"],
  "VIEW_SCHEDULE_LIST": ["superadmin", "administrator", "admin", "editor"],
  "VIEW_LIVE_SCHEDULE": ["superadmin", "administrator", "admin", "editor", "teacher", "viewer"],
  "VIEW_CLASS_SCHEDULE": ["superadmin", "administrator", "admin", "editor"],
  "VIEW_TEACHER_TASKS": ["superadmin", "administrator", "admin", "editor", "teacher"],
  "VIEW_SETTINGS": ["superadmin", "administrator", "admin"],
  "MANAGE_TEACHERS": ["superadmin", "administrator", "admin"],
  "DELETE_SCHEDULE": ["superadmin", "administrator", "admin"],
  "PUBLISH_SCHEDULE": ["superadmin", "administrator", "editor", "admin"],
  "EDIT_SCHEDULE": ["superadmin", "administrator", "editor", "admin"],
  "VIEW_REPORTS": ["superadmin", "administrator", "editor", "viewer", "admin", "teacher"],
  "VIEW_ACADEMIC": ["superadmin", "administrator", "admin", "editor", "teacher", "viewer"],
  "ACCESS_SQL_EDITOR": ["superadmin", "administrator", "admin"],
  "MANAGE_ROLES": ["superadmin"]
}')
ON CONFLICT (key) DO NOTHING;
