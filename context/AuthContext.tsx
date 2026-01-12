import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';

export type UserRole = 'superadmin' | 'administrator' | 'editor' | 'viewer' | 'admin' | 'teacher';

export interface User {
  email: string;
  role: UserRole;
  name: string;
  id: string;
}

export type PermissionKey = 
  | 'VIEW_DASHBOARD'
  | 'VIEW_SCHEDULE_LIST'
  | 'VIEW_LIVE_SCHEDULE'
  | 'VIEW_CLASS_SCHEDULE'
  | 'VIEW_TEACHER_TASKS'
  | 'VIEW_SETTINGS'
  | 'MANAGE_TEACHERS' 
  | 'DELETE_SCHEDULE' 
  | 'PUBLISH_SCHEDULE' 
  | 'EDIT_SCHEDULE' 
  | 'VIEW_REPORTS' 
  | 'ACCESS_SQL_EDITOR' 
  | 'MANAGE_ROLES';

export type PermissionMap = Record<PermissionKey, UserRole[]>;

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  hasPermission: (permission: PermissionKey) => boolean;
  permissions: PermissionMap;
  updatePermission: (key: PermissionKey, roles: UserRole[]) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEFAULT_PERMISSIONS: PermissionMap = {
  VIEW_DASHBOARD: ['superadmin', 'administrator', 'admin', 'editor', 'teacher', 'viewer'],
  VIEW_SCHEDULE_LIST: ['superadmin', 'administrator', 'admin', 'editor'],
  VIEW_LIVE_SCHEDULE: ['superadmin', 'administrator', 'admin', 'editor', 'teacher', 'viewer'],
  VIEW_CLASS_SCHEDULE: ['superadmin', 'administrator', 'admin', 'editor'],
  VIEW_TEACHER_TASKS: ['superadmin', 'administrator', 'admin', 'editor', 'teacher'],
  VIEW_SETTINGS: ['superadmin', 'administrator', 'admin'],
  MANAGE_TEACHERS: ['superadmin', 'administrator', 'admin'],
  DELETE_SCHEDULE: ['superadmin', 'administrator', 'admin'],
  PUBLISH_SCHEDULE: ['superadmin', 'administrator', 'editor', 'admin'],
  EDIT_SCHEDULE: ['superadmin', 'administrator', 'editor', 'admin'],
  VIEW_REPORTS: ['superadmin', 'administrator', 'editor', 'viewer', 'admin', 'teacher'],
  ACCESS_SQL_EDITOR: ['superadmin', 'administrator', 'admin'],
  MANAGE_ROLES: ['superadmin', 'admin'],
};

const normalizeRole = (dbRole: string): UserRole => {
  const normalized = dbRole?.toLowerCase().replace(/\s+/g, '') || 'viewer';
  if (normalized === 'superadmin') return 'superadmin';
  if (normalized === 'admin') return 'admin';
  if (normalized === 'administrator') return 'administrator';
  if (normalized === 'editor') return 'editor';
  if (normalized === 'teacher') return 'teacher';
  return 'viewer';
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [permissions, setPermissions] = useState<PermissionMap>(DEFAULT_PERMISSIONS);

  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true);
      try {
        const savedUser = localStorage.getItem('unacademy_auth_user');
        
        if (supabase) {
          const { data: configData } = await supabase
            .from('system_config')
            .select('value')
            .eq('key', 'permissions_matrix')
            .maybeSingle();
          
          if (configData?.value) {
            setPermissions(configData.value as PermissionMap);
          }
        }

        if (savedUser) {
          const parsed = JSON.parse(savedUser);
          if (supabase && parsed.id) {
            const { data: dbUser, error: dbError } = await supabase
              .from('system_users')
              .select('id, email, full_name, role')
              .eq('id', parsed.id)
              .maybeSingle();
            
            if (!dbError && dbUser) {
              const refreshedUser: User = {
                id: dbUser.id,
                email: dbUser.email,
                name: dbUser.full_name,
                role: normalizeRole(dbUser.role)
              };
              setUser(refreshedUser);
              localStorage.setItem('unacademy_auth_user', JSON.stringify(refreshedUser));
            } else {
              logout();
            }
          } else {
            setUser(parsed);
          }
        }
      } catch (e) {
        console.error("Auth initialization failed:", e);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const hasPermission = (permission: PermissionKey): boolean => {
    if (!user) return false;
    if (user.role === 'superadmin') return true;
    return permissions[permission]?.includes(user.role) || false;
  };

  const updatePermission = async (key: PermissionKey, roles: UserRole[]) => {
    const newPermissions = { ...permissions, [key]: roles };
    setPermissions(newPermissions);
    if (supabase) {
      await supabase.from('system_config').upsert({ 
        key: 'permissions_matrix', 
        value: newPermissions 
      }, { onConflict: 'key' });
    }
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      if (supabase) {
        const { data: dbUser, error } = await supabase
          .from('system_users')
          .select('*')
          .eq('email', email)
          .maybeSingle();

        if (error) throw new Error(error.message);
        
        if (!dbUser) {
          if (email === 'admin@unacademy.system' && password === '1234') {
            const mockAdmin: User = { id: '000-admin', email, name: 'System Admin', role: 'superadmin' };
            setUser(mockAdmin);
            localStorage.setItem('unacademy_auth_user', JSON.stringify(mockAdmin));
            return;
          }
          throw new Error("Invalid credentials or user not found.");
        }

        if (dbUser.password !== password) {
          throw new Error("Invalid password provided.");
        }

        const loggedInUser: User = {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.full_name,
          role: normalizeRole(dbUser.role)
        };

        setUser(loggedInUser);
        localStorage.setItem('unacademy_auth_user', JSON.stringify(loggedInUser));
      } else {
        throw new Error("Database connection unavailable.");
      }
    } catch (err: any) {
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('unacademy_auth_user');
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated: !!user, 
      login, 
      logout, 
      isLoading, 
      hasPermission, 
      permissions,
      updatePermission 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};