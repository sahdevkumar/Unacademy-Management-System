
import React, { memo } from 'react';
import { BookOpen, Calendar, Clock, MapPin, ChevronRight } from 'lucide-react';

interface TestItem {
  id: string;
  subject: string;
  class: string;
  date: string;
  time: string;
  room: string;
  type: 'midterm' | 'final' | 'quiz';
}

const UpcomingTests = memo(({ tests }: { tests: TestItem[] }) => {
  return (
    <div className="bg-supabase-panel border border-supabase-border rounded-xl p-6 h-full">
      <h3 className="text-sm font-bold text-supabase-muted uppercase tracking-widest mb-6 flex items-center gap-2">
        <BookOpen size={16} className="text-blue-400" />
        Upcoming Tests
      </h3>
      
      <div className="space-y-4">
        {tests.map((test) => (
          <div key={test.id} className="group flex gap-4 p-4 rounded-lg bg-supabase-bg border border-supabase-border/30 hover:border-blue-500/30 transition-all cursor-pointer">
            <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 min-w-[60px]">
              <div className="text-xs font-bold uppercase tracking-tighter">{test.date.split(' ')[0]}</div>
              <div className="text-xl font-black">{test.date.split(' ')[1]}</div>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <div className="text-sm font-bold text-supabase-text truncate">{test.subject}</div>
                <div className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest ${
                  test.type === 'midterm' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/30' :
                  test.type === 'final' ? 'bg-red-500/10 text-red-500 border border-red-500/30' :
                  'bg-blue-500/10 text-blue-500 border border-blue-500/30'
                }`}>
                  {test.type}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 mt-3">
                <div className="flex items-center gap-1.5 text-[10px] text-supabase-muted uppercase font-bold tracking-tight">
                  <Clock size={10} />
                  {test.time}
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-supabase-muted uppercase font-bold tracking-tight">
                  <MapPin size={10} />
                  {test.room}
                </div>
              </div>
              
              <div className="flex items-center gap-1.5 mt-2 text-[10px] text-supabase-muted uppercase font-bold tracking-tight">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                Class: {test.class}
              </div>
            </div>
            
            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
              <ChevronRight size={16} className="text-supabase-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

UpcomingTests.displayName = 'UpcomingTests';

export default UpcomingTests;
