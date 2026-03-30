
import React, { memo } from 'react';
import { Users, UserCheck, UserX, UserMinus, GraduationCap, Baby, UserCircle2, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';

interface MiniStatProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  delay?: number;
}

const MiniStat = memo(({ label, value, icon, color, delay = 0 }: MiniStatProps) => (
  <motion.div 
    initial={{ opacity: 0, x: -10 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay, duration: 0.3 }}
    className="flex items-center gap-3 p-2 rounded-lg hover:bg-supabase-hover transition-colors group"
  >
    <div className={`p-2 rounded-md ${color} bg-opacity-10 group-hover:bg-opacity-20 transition-all`}>
      {React.isValidElement(icon) && React.cloneElement(icon as React.ReactElement<any>, { size: 14, className: color.replace('bg-', 'text-') })}
    </div>
    <div className="min-w-0">
      <div className="text-sm font-black text-supabase-text tracking-tight leading-none mb-1">{value}</div>
      <div className="text-[9px] text-supabase-muted uppercase font-bold tracking-widest truncate">{label}</div>
    </div>
  </motion.div>
));

MiniStat.displayName = 'MiniStat';

const DashboardReports = memo(({ employeeStats, studentStats }: { 
  employeeStats: { total: number; present: number; absent: number; onLeave: number };
  studentStats: { total: number; present: number; absent: number; boys: number; girls: number };
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Employees Group Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-supabase-panel border border-supabase-border rounded-xl p-5 shadow-sm relative overflow-hidden group"
      >
        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
          <Users size={80} />
        </div>
        
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
            <h3 className="text-xs font-black text-supabase-text uppercase tracking-[0.2em]">Employee Hub</h3>
          </div>
          <div className="text-[9px] font-bold text-supabase-green uppercase tracking-widest flex items-center gap-1">
            <TrendingUp size={10} />
            Live Status
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <MiniStat label="Total Staff" value={employeeStats.total} icon={<Users />} color="bg-blue-500" delay={0.1} />
          <MiniStat label="Present" value={employeeStats.present} icon={<UserCheck />} color="bg-supabase-green" delay={0.2} />
          <MiniStat label="Absent" value={employeeStats.absent} icon={<UserX />} color="bg-red-500" delay={0.3} />
          <MiniStat label="On Leave" value={employeeStats.onLeave} icon={<UserMinus />} color="bg-amber-500" delay={0.4} />
        </div>
      </motion.div>

      {/* Students Group Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="bg-supabase-panel border border-supabase-border rounded-xl p-5 shadow-sm relative overflow-hidden group"
      >
        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
          <GraduationCap size={80} />
        </div>

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-1 h-4 bg-purple-500 rounded-full"></div>
            <h3 className="text-xs font-black text-supabase-text uppercase tracking-[0.2em]">Student Hub</h3>
          </div>
          <div className="text-[9px] font-bold text-supabase-green uppercase tracking-widest flex items-center gap-1">
            <TrendingUp size={10} />
            Live Status
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <MiniStat label="Total Students" value={studentStats.total} icon={<GraduationCap />} color="bg-purple-500" delay={0.5} />
          <MiniStat label="Present Today" value={studentStats.present} icon={<UserCheck />} color="bg-supabase-green" delay={0.6} />
          <MiniStat label="Boys Count" value={studentStats.boys} icon={<Baby />} color="bg-blue-400" delay={0.7} />
          <MiniStat label="Girls Count" value={studentStats.girls} icon={<UserCircle2 />} color="bg-pink-400" delay={0.8} />
        </div>
      </motion.div>
    </div>
  );
});

DashboardReports.displayName = 'DashboardReports';

export default DashboardReports;
