
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Loader2, Mail, Lock, ShieldCheck, Eye, EyeOff, AlertCircle, Info } from 'lucide-react';

const LoginView: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('viewer');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { login, register, availableRoles } = useAuth();
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    try {
      if (isLogin) {
        await login(email, password);
        showToast('Login successful. Welcome to the workspace.', 'success');
      } else {
        await register(email, password, fullName, role);
        showToast('Registration successful. Please check your email for verification.', 'success');
        setIsLogin(true);
      }
    } catch (err: any) {
      const errMsg = err.message || 'Authentication failed. Please check your credentials.';
      setError(errMsg);
      showToast(errMsg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-supabase-bg p-4 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-supabase-green/5 via-transparent to-transparent">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-supabase-green rounded-xl flex items-center justify-center text-black font-bold text-3xl shadow-xl shadow-supabase-green/20 mb-4 transform hover:scale-105 transition-transform cursor-default">
            U
          </div>
          <h1 className="text-2xl font-bold text-supabase-text tracking-tight">Unacademy Management</h1>
          <p className="text-supabase-muted text-sm mt-2">{isLogin ? 'Enter your credentials to access the console' : 'Create a new administrative account'}</p>
        </div>

        <div className="bg-supabase-panel border border-supabase-border rounded-xl shadow-2xl p-8 relative overflow-hidden">
          {/* Animated glow effect */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-supabase-green to-transparent opacity-50"></div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-center gap-3 text-red-400 text-xs animate-in slide-in-from-top-2 duration-200">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {!isLogin && (
              <>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-supabase-muted uppercase tracking-[0.15em]">Full Name</label>
                  <div className="relative group">
                    <ShieldCheck className="absolute left-3 top-3 text-supabase-muted group-focus-within:text-supabase-green transition-colors" size={18} />
                    <input 
                      type="text" 
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="John Doe"
                      className="w-full bg-supabase-sidebar border border-supabase-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-supabase-text placeholder:text-supabase-muted/50 focus:outline-none focus:border-supabase-green focus:ring-1 focus:ring-supabase-green/30 transition-all shadow-inner"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-supabase-muted uppercase tracking-[0.15em]">Initial Role</label>
                  <select 
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full bg-supabase-sidebar border border-supabase-border rounded-lg px-4 py-2.5 text-sm text-supabase-text focus:outline-none focus:border-supabase-green focus:ring-1 focus:ring-supabase-green/30 transition-all shadow-inner"
                  >
                    {availableRoles.map(r => (
                      <option key={r} value={r}>{r.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-supabase-muted uppercase tracking-[0.15em]">Administrative Email</label>
              <div className="relative group">
                <Mail className="absolute left-3 top-3 text-supabase-muted group-focus-within:text-supabase-green transition-colors" size={18} />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@university.edu"
                  className="w-full bg-supabase-sidebar border border-supabase-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-supabase-text placeholder:text-supabase-muted/50 focus:outline-none focus:border-supabase-green focus:ring-1 focus:ring-supabase-green/30 transition-all shadow-inner"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold text-supabase-muted uppercase tracking-[0.15em]">Security Key</label>
                {isLogin && <button type="button" className="text-[10px] text-supabase-green hover:text-supabase-greenHover transition-colors font-medium">Reset password?</button>}
              </div>
              <div className="relative group">
                <Lock className="absolute left-3 top-3 text-supabase-muted group-focus-within:text-supabase-green transition-colors" size={18} />
                <input 
                  type={showPassword ? "text" : "password"} 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-supabase-sidebar border border-supabase-border rounded-lg pl-10 pr-12 py-2.5 text-sm text-supabase-text placeholder:text-supabase-muted/50 focus:outline-none focus:border-supabase-green focus:ring-1 focus:ring-supabase-green/30 transition-all shadow-inner"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-supabase-muted hover:text-supabase-text transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full bg-supabase-green text-black py-3 rounded-lg font-bold text-sm hover:bg-supabase-greenHover active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4 shadow-lg shadow-supabase-green/10 disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  <span>{isLogin ? 'Verifying...' : 'Creating Account...'}</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={18} className="group-hover:scale-110 transition-transform" />
                  <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="text-xs text-supabase-muted hover:text-supabase-green transition-colors"
            >
              {isLogin ? "Don't have an account? Create one" : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
        
        <p className="mt-8 text-center text-xs text-supabase-muted">
          Access restricted to authorized personnel. All login attempts are logged.<br/>
          <button className="mt-2 text-supabase-green hover:underline font-medium">Contact Infrastructure Team</button>
        </p>
      </div>
    </div>
  );
};

export default LoginView;
