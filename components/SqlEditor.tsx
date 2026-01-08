import React, { useState, useEffect } from 'react';
import { Play, Sparkles, Save, RotateCcw, Clock } from 'lucide-react';
import { generateSqlQuery } from '../services/geminiService';
import { SqlHistory } from '../types';

const INITIAL_SCHEMA_SQL = `-- 1. Create (or recreate) the table for storing class schedules
DROP TABLE IF EXISTS public.weekly_schedules;

CREATE TABLE IF NOT EXISTS public.weekly_schedules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    schedule_id TEXT, -- Format: UCS+DDMMYY
    class TEXT UNIQUE, 
    content JSONB,
    status TEXT DEFAULT 'false' CHECK (status IN ('true', 'false', 'recent')),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Create the table for storing the list of classes
DROP TABLE IF EXISTS public.classes;

CREATE TABLE IF NOT EXISTS public.classes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Create the table for Subjects (if not exists)
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);

-- 4. Create the table for Teachers (Updated for multiple subjects)
DROP TABLE IF EXISTS public.teachers;

CREATE TABLE IF NOT EXISTS public.teachers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    subjects TEXT[], -- Array of strings for multiple subjects
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.weekly_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

-- 6. Create policies that allow public access
CREATE POLICY "Enable all access for weekly_schedules" ON public.weekly_schedules FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for classes" ON public.classes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for teachers" ON public.teachers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for subjects" ON public.subjects FOR ALL USING (true) WITH CHECK (true);

-- 7. Insert default data
INSERT INTO public.classes (name) VALUES 
('Spring 2024'), 
('Fall 2023')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.subjects (name) VALUES 
('Computer Science'),
('Mathematics'),
('Physics'),
('Database Systems'),
('Algorithms')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.teachers (name, email, subjects, phone) VALUES 
('Dr. Smith', 'smith@university.edu', ARRAY['Computer Science', 'Database Systems'], '555-0101'),
('Prof. Johnson', 'johnson@university.edu', ARRAY['Mathematics', 'Algorithms'], '555-0102')
ON CONFLICT DO NOTHING;

INSERT INTO public.weekly_schedules (schedule_id, class, content, status)
VALUES (
  'UCS240224',
  'Spring 2024', 
  '[{"id":"1","title":"Database Systems","instructor":"Dr. Smith","day":"Monday","startTime":"09:00","endTime":"10:30","room":"LH-101","color":"bg-blue-500/20 text-blue-300 border-blue-500/30"}]'::jsonb,
  'true'
) ON CONFLICT (class) DO NOTHING;`;

const SqlEditor: React.FC = () => {
  const [query, setQuery] = useState(INITIAL_SCHEMA_SQL);
  const [results, setResults] = useState<any[] | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [prompt, setPrompt] = useState('');
  
  // Initialize history from localStorage
  const [history, setHistory] = useState<SqlHistory[]>(() => {
    try {
      const saved = localStorage.getItem('supabase-sql-history');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Rehydrate Date objects from strings
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

  // Save history to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('supabase-sql-history', JSON.stringify(history));
  }, [history]);

  const handleRun = () => {
    // Mock execution
    setResults([
      { status: 'Success', message: 'Query executed successfully' },
      { affected_rows: 1 }
    ]);
    const newEntry: SqlHistory = { id: Date.now().toString(), query, timestamp: new Date() };
    setHistory(prev => [newEntry, ...prev].slice(0, 50)); // Keep last 50 entries
  };

  const handleAiGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    const sql = await generateSqlQuery(prompt);
    setQuery(sql);
    setIsGenerating(false);
    setPrompt(''); // Clear prompt after generation
  };

  const clearHistory = (e: React.MouseEvent) => {
    e.stopPropagation();
    if(confirm('Clear all history?')) {
        setHistory([]);
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
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
        <div className="text-xs text-supabase-muted">
            Cmd+Enter to run
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Editor Area */}
        <div className="flex-1 flex flex-col border-r border-supabase-border">
             {/* AI Prompt Input */}
            <div className="p-4 bg-supabase-bg border-b border-supabase-border">
                <div className="relative">
                    <Sparkles className="absolute left-3 top-3 text-purple-400" size={18} />
                    <input 
                        type="text"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAiGenerate()}
                        placeholder="Ask AI to write a query (e.g., 'Show me active users created last month')"
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

            {/* Results Panel */}
            <div className="h-1/2 border-t border-supabase-border flex flex-col bg-supabase-panel">
                <div className="px-4 py-2 bg-supabase-sidebar border-b border-supabase-border text-xs font-medium text-supabase-muted uppercase tracking-wider">
                    Results
                </div>
                <div className="flex-1 overflow-auto">
                    {results ? (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr>
                                    {Object.keys(results[0]).map(key => (
                                        <th key={key} className="sticky top-0 bg-supabase-panel border-b border-supabase-border px-4 py-2 text-xs font-medium text-supabase-muted whitespace-nowrap">
                                            {key}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {results.map((row, idx) => (
                                    <tr key={idx} className="hover:bg-supabase-hover/50 group">
                                        {Object.values(row).map((val: any, i) => (
                                            <td key={i} className="px-4 py-2 text-xs text-supabase-text border-b border-supabase-border font-mono whitespace-nowrap">
                                                {val.toString()}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="flex items-center justify-center h-full text-supabase-muted text-sm">
                            Run a query to see results
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* Sidebar / Schema helper (Mock) */}
        <div className="w-64 bg-supabase-sidebar flex flex-col">
            <div className="flex items-center justify-between p-3 border-b border-supabase-border">
                <div className="text-xs font-semibold text-supabase-text">History</div>
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
                             <span className="text-xs text-supabase-muted">{item.timestamp.toLocaleTimeString()}</span>
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