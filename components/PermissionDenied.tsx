import React from 'react';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { View } from '../types';

interface PermissionDeniedProps {
  onBack: () => void;
}

const PermissionDenied: React.FC<PermissionDeniedProps> = ({ onBack }) => {
  return (
    <div className="h-full flex flex-col items-center justify-center p-6 text-center bg-supabase-bg">
      <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mb-4 ring-8 ring-red-500/5">
        <ShieldAlert size={32} />
      </div>
      <h2 className="text-xl font-bold text-supabase-text mb-2">Restricted Access</h2>
      <p className="text-supabase-muted max-w-md mb-6 text-sm">
        Your account does not have the required permissions to access this management module. 
        Please contact your system administrator for elevation.
      </p>
      <button 
        onClick={onBack}
        className="flex items-center gap-2 px-4 py-2 bg-supabase-panel border border-supabase-border rounded-md text-sm text-supabase-text hover:bg-supabase-hover transition-colors"
      >
        <ArrowLeft size={16} />
        Return to Dashboard
      </button>
    </div>
  );
};

export default PermissionDenied;