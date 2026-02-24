
-- 1. Student Attendance Matrix
CREATE TABLE IF NOT EXISTS public.attendance_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id TEXT NOT NULL,
    student_name TEXT NOT NULL,
    class_name TEXT NOT NULL,
    status TEXT CHECK (status IN ('present', 'absent', 'late')),
    date DATE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(student_id, date)
);

-- 2. Absentee Outreach Matrix
CREATE TABLE IF NOT EXISTS public.outreach_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id TEXT NOT NULL,
    date DATE NOT NULL,
    outcome TEXT CHECK (outcome IN ('pending', 'called', 'no_answer', 'notified')),
    note TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(student_id, date)
);

-- 3. Enquiry Call System Table (Updated with history and alt phone)
CREATE TABLE IF NOT EXISTS public.enquiry_leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_name TEXT NOT NULL,
    parent_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    alt_phone TEXT,
    source TEXT CHECK (source IN ('Web', 'Referral', 'Walk-in', 'Social Media')),
    temp TEXT CHECK (temp IN ('Hot', 'Warm', 'Cold')),
    status TEXT CHECK (status IN ('Interested', 'Following-up', 'DNP', 'Closed', 'New')) DEFAULT 'New',
    last_contact DATE,
    note TEXT,
    call_history JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. System Configuration Key-Value Store
CREATE TABLE IF NOT EXISTS public.system_config (
    key TEXT PRIMARY KEY,
    value JSONB,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enquiry_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- Policies (Public for demo mode)
CREATE POLICY "Allow select for everyone" ON public.attendance_logs FOR SELECT USING (true);
CREATE POLICY "Allow upsert for everyone" ON public.attendance_logs FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow select outreach" ON public.outreach_logs FOR SELECT USING (true);
CREATE POLICY "Allow upsert outreach" ON public.outreach_logs FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow select enquiry" ON public.enquiry_leads FOR SELECT USING (true);
CREATE POLICY "Allow upsert enquiry" ON public.enquiry_leads FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all access system_config" ON public.system_config FOR ALL USING (true) WITH CHECK (true);
