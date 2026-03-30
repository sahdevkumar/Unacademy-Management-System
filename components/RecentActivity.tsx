
import React, { memo } from 'react';
import { Activity, Clock, User, CheckCircle2, AlertCircle } from 'lucide-react';

interface ActivityItem {
  id: string;
  type: 'attendance' | 'task' | 'registration' | 'fee';
  title: string;
  user: string;
  time: string;
  status: 'success' | 'warning' | 'info';
}

const RecentActivity = memo(({ activities }: { activities: ActivityItem[] }) => {
  return (
    <div className="bg-supabase-panel border border-supabase-border rounded-xl p-6 h-full">
      <h3 className="text-sm font-bold text-supabase-muted uppercase tracking-widest mb-6 flex items-center gap-2">
        <Activity size={16} className="text-supabase-green" />
        Recent Activity
      </h3>
      
      <div className="space-y-4">
        {activities.map((activity) => (
          <div key={activity.id} className="flex gap-4 p-3 rounded-lg bg-supabase-bg border border-supabase-border/30 hover:border-supabase-green/30 transition-colors">
            <div className={`p-2 rounded-full h-fit ${
              activity.status === 'success' ? 'bg-supabase-green/10 text-supabase-green' :
              activity.status === 'warning' ? 'bg-amber-500/10 text-amber-500' :
              'bg-blue-500/10 text-blue-500'
            }`}>
              {activity.status === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-supabase-text truncate">{activity.title}</div>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex items-center gap-1 text-[10px] text-supabase-muted uppercase font-bold tracking-tight">
                  <User size={10} />
                  {activity.user}
                </div>
                <div className="w-1 h-1 bg-supabase-border rounded-full"></div>
                <div className="flex items-center gap-1 text-[10px] text-supabase-muted uppercase font-bold tracking-tight">
                  <Clock size={10} />
                  {activity.time}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

RecentActivity.displayName = 'RecentActivity';

export default RecentActivity;
