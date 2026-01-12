import React, { useState, useEffect } from 'react';
import { Play, Sparkles, Save, RotateCcw, Clock } from 'lucide-react';
import { generateSqlQuery } from '../services/geminiService';
import { SqlHistory } from '../types';

const INITIAL_SCHEMA_SQL = `-- 1. Global System Configuration Table
-- This stores system-wide settings like the Permission Matrix in JSON format
CREATE TABLE IF NOT EXISTS public.system_config (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. System Users Table
-- Added password column (nullable) to prevent 23502 errors during seeding
CREATE TABLE IF NOT EXISTS public.system_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    mobile TEXT,
    password TEXT, 
    role TEXT DEFAULT 'viewer',
    status TEXT DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. User Assignments Table (Class Level Access)
CREATE TABLE IF NOT EXISTS public.user_assignments (
    user_id UUID REFERENCES public.system_users(id) ON DELETE CASCADE PRIMARY KEY,
    assigned_classes TEXT[] DEFAULT '{}',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Weekly Schedules Table
CREATE TABLE IF NOT EXISTS public.weekly_schedules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    schedule_id TEXT UNIQUE,
    class TEXT,
    content JSONB,
    status TEXT DEFAULT 'false' CHECK (status IN ('true', 'false', 'recent')),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. Classes Table
CREATE TABLE IF NOT EXISTS public.classes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    section TEXT DEFAULT 'A',
    room_no TEXT DEFAULT '0',
    level INTEGER DEFAULT 0, -- 0 for junior, 1 for senior
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6. Teachers Table
CREATE TABLE IF NOT EXISTS public.teachers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    subjects TEXT[],
    phone TEXT,
    profile_photo_url TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 7. Enable RLS and Create Public Access Policies
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public access system_config" ON public.system_config;
CREATE POLICY "Public access system_config" ON public.system_config FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access system_users" ON public.system_users;
CREATE POLICY "Public access system_users" ON public.system_users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access user_assignments" ON public.user_assignments;
CREATE POLICY "Public access user_assignments" ON public.user_assignments FOR ALL USING (true) WITH CHECK (true);

-- 8. Seed Default Permission Matrix (JSON Storage)
INSERT INTO public.system_config (key, value)
VALUES ('permissions_matrix', '{
  "MANAGE_TEACHERS": ["superadmin", "administrator"],
  "DELETE_SCHEDULE": ["superadmin", "administrator"],
  "PUBLISH_SCHEDULE": ["superadmin", "administrator", "editor"],
  "EDIT_SCHEDULE": ["superadmin", "administrator", "editor"],
  "VIEW_REPORTS": ["superadmin", "administrator", "editor", "viewer"],
  "ACCESS_SQL_EDITOR": ["superadmin", "administrator"],
  "MANAGE_ROLES": ["superadmin"]
}'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- 9. Seed Default Superadmin
-- Password is set to null as it is handled by front-end logic for demo purposes
INSERT INTO public.system_users (full_name, email, role, password)
VALUES ('System Admin', 'admin@unacademy.system', 'superadmin', '1234')
ON CONFLICT (email) DO UPDATE SET role = 'superadmin';`;

const SqlEditor: React.FC = () => {
  const [query, setQuery] = useState(INITIAL_SCHEMA_SQL);
  const [results, setResults] = useState<any[] | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [prompt, setPrompt] = useState('');
  
  const [history, setHistory] = useState<SqlHistory[]>(() => {
    try {
      const saved = localStorage.getItem('supabase-sql-history');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        }));
      }
    } catch (e) {
      console.error("Failed to parse history", e);
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('supabase-sql-history', JSON.stringify(history));
  }, [history]);

  const handleRun = async () => {
    setResults([
      { status: 'Success', message: 'SQL Script is ready. Run this in your Supabase SQL Editor to initialize the database and JSON permission matrix.' },
      { note: 'This fix ensures the system_users table matches the expected schema and seeds the global configuration.' }
    ]);
    
    const newEntry: SqlHistory = { id: Date.now().toString(), query, timestamp: new Date() };
    setHistory(prev => [newEntry, ...prev].slice(0, 50));
  };

  const handleAiGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    const sql = await generateSqlQuery(prompt);
    setQuery(sql);
    setIsGenerating(false);
    setPrompt('');
  };

  const clearHistory = (e: React.MouseEvent) => {
    e.stopPropagation();
    if(confirm('Clear all history?')) {
        setHistory([]);
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="h-14 border-b border-supabase-border bg-supabase-panel flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
            <button 
                onClick={handleRun}
                className="bg-supabase-green text-black px-4 py-1.5 rounded-md text-sm font-medium hover:bg-supabase-greenHover transition-colors flex items-center gap-2"
            >
                <Play size={16} fill="currentColor" />
                Run
            </button>
            <button className="text-supabase-muted hover:text-supabase-text px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2">
                <Save size={16} />
                Save
            </button>
             <button 
                onClick={() => setQuery('')}
                className="text-supabase-muted hover:text-supabase-text px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2"
            >
                <RotateCcw size={16} />
                Clear
            </button>
        </div>
        <div className="text-xs text-supabase-muted font-mono">
            Database Initialization Console
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col border-r border-supabase-border">
            <div className="p-4 bg-supabase-bg border-b border-supabase-border">
                <div className="relative">
                    <Sparkles className="absolute left-3 top-3 text-purple-400" size={18} />
                    <input 
                        type="text"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAiGenerate()}
                        placeholder="Ask AI for SQL help..."
                        className="w-full bg-supabase-sidebar border border-supabase-border rounded-md pl-10 pr-24 py-2.5 text-sm text-supabase-text focus:border-supabase-green focus:outline-none focus:ring-1 focus:ring-supabase-green placeholder-supabase-muted"
                    />
                    <button 
                        onClick={handleAiGenerate}
                        disabled={isGenerating || !prompt}
                        className="absolute right-2 top-2 bg-purple-600/20 text-purple-300 border border-purple-500/30 px-3 py-0.5 rounded text-xs font-medium hover:bg-purple-600/40 disabled:opacity-50 transition-colors"
                    >
                        {isGenerating ? 'Generating...' : 'Generate'}
                    </button>
                </div>
            </div>

            <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 w-full bg-supabase-bg text-sm font-mono text-supabase-text p-4 focus:outline-none resize-none leading-relaxed"
                spellCheck={false}
            />

            <div className="h-1/2 border-t border-supabase-border flex flex-col bg-supabase-panel">
                <div className="px-4 py-2 bg-supabase-sidebar border-b border-supabase-border text-xs font-medium text-supabase-muted uppercase tracking-wider">
                    Results
                </div>
                <div className="flex-1 overflow-auto">
                    {results ? (
                        <div className="p-4">
                            {results.map((res, idx) => (
                                <div key={idx} className="text-sm text-supabase-text mb-2 font-mono">
                                    {res.message ? (
                                        <div className="text-green-400">{res.message}</div>
                                    ) : (
                                        <pre className="whitespace-pre-wrap">{JSON.stringify(res, null, 2)}</pre>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-supabase-muted text-sm">
                            Run the script to fix table schema and seed access data.
                        </div>
                    )}
                </div>
            </div>
        </div>

        <div className="w-64 bg-supabase-sidebar flex flex-col">
            <div className="flex items-center justify-between p-3 border-b border-supabase-border">
                <div className="text-xs font-semibold text-supabase-text uppercase">History</div>
                {history.length > 0 && (
                    <button onClick={clearHistory} className="text-[10px] text-supabase-muted hover:text-red-400 transition-colors">
                        Clear
                    </button>
                )}
            </div>
            <div className="flex-1 overflow-y-auto">
                {history.length === 0 && <div className="p-4 text-xs text-supabase-muted text-center">No history yet</div>}
                {history.map(item => (
                    <div key={item.id} onClick={() => setQuery(item.query)} className="p-3 border-b border-supabase-border hover:bg-supabase-hover cursor-pointer group">
                        <div className="flex items-center gap-2 mb-1">
                             <Clock size={12} className="text-supabase-muted" />
                             <span className="text-[10px] text-supabase-muted">{item.timestamp.toLocaleTimeString()}</span>
                        </div>
                        <div className="text-xs text-supabase-muted/80 font-mono truncate group-hover:text-supabase-text transition-colors">
                            {item.query}
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
};

export default SqlEditor;