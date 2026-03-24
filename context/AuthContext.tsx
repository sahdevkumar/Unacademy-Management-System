
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';

export type UserRole = string;

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
  | 'VIEW_ACADEMIC'
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
  availableRoles: UserRole[];
  departments: string[];
  designations: string[];
  departmentDesignationMap: Record<string, string[]>;
  updatePermission: (key: PermissionKey, roles: UserRole[]) => Promise<void>;
  addRole: (roleName: string) => Promise<void>;
  deleteRole: (roleName: string) => Promise<void>;
  addDepartment: (deptName: string) => Promise<void>;
  deleteDepartment: (deptName: string) => Promise<void>;
  addDesignation: (name: string) => void;
  deleteDesignation: (name: string) => void;
  updateDeptMap: (dept: string, selectedDesignations: string[]) => void;
  saveSystemConfig: (academicData?: { classes: any[], subjects: any[], sections: any[] }, biometricConfig?: any) => Promise<void>;
  saveSystemRoles: () => Promise<void>;
  register: (email: string, password: string, fullName: string, role: string) => Promise<void>;
  updateUser: (data: { name?: string; email?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const INITIAL_ROLES: UserRole[] = ['superadmin', 'administrator', 'editor', 'teacher', 'viewer'];
const INITIAL_DEPARTMENTS: string[] = ['Academic', 'Administration', 'IT Support', 'Human Resources'];
const INITIAL_DESIGNATIONS: string[] = ['Counselling', 'Academic Works', 'Director', 'Teacher', 'Faculty Coordinator', 'Office Manager', 'HR Lead', 'Recruiter', 'System Admin', 'Support Tech'];

const DEFAULT_DEPT_MAP: Record<string, string[]> = {
  'Academic': ['Academic Works', 'Teacher', 'Faculty Coordinator'],
  'Administration': ['Director', 'Counselling', 'Office Manager'],
  'Human Resources': ['HR Lead', 'Recruiter'],
  'IT Support': ['System Admin', 'Support Tech']
};

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
  VIEW_ACADEMIC: ['superadmin', 'administrator', 'admin', 'editor', 'teacher', 'viewer'],
  ACCESS_SQL_EDITOR: ['superadmin', 'administrator', 'admin'],
  MANAGE_ROLES: ['superadmin'],
};

const MOCK_USER: User = {
  id: 'dev-mode-user',
  email: 'dev@unacademy.system',
  name: 'Development Admin',
  role: 'superadmin'
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [permissions, setPermissions] = useState<PermissionMap>(DEFAULT_PERMISSIONS);
  const [availableRoles, setAvailableRoles] = useState<UserRole[]>(INITIAL_ROLES);
  const [departments, setDepartments] = useState<string[]>(INITIAL_DEPARTMENTS);
  const [designations, setDesignations] = useState<string[]>(INITIAL_DESIGNATIONS);
  const [departmentDesignationMap, setDepartmentDesignationMap] = useState<Record<string, string[]>>(DEFAULT_DEPT_MAP);

  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true);
      try {
        if (supabase) {
          // 1. Get Initial Session
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session?.user) {
            await fetchAndSetProfile(session.user);
          }

          // 2. Listen for Auth Changes
          supabase.auth.onAuthStateChange(async (event, session) => {
            if (session?.user) {
              await fetchAndSetProfile(session.user);
            } else {
              setUser(null);
            }
          });

          // 3. Load System Config
          const { data: matrixData, error: matrixError } = await supabase.from('system_config').select('value').eq('key', 'permissions_matrix').maybeSingle();
          if (matrixError) console.error("Error loading permissions_matrix:", matrixError.message);
          if (matrixData?.value) setPermissions(matrixData.value as PermissionMap);

          const { data: rolesData, error: rolesError } = await supabase.from('system_config').select('value').eq('key', 'system_roles').maybeSingle();
          if (rolesError) console.error("Error loading system_roles:", rolesError.message);
          if (rolesData?.value) setAvailableRoles(rolesData.value as UserRole[]);

          const { data: deptsData, error: deptsError } = await supabase.from('system_config').select('value').eq('key', 'system_departments').maybeSingle();
          if (deptsError) console.error("Error loading system_departments:", deptsError.message);
          if (deptsData?.value) setDepartments(deptsData.value as string[]);

          const { data: desigData, error: desigError } = await supabase.from('system_config').select('value').eq('key', 'system_designations').maybeSingle();
          if (desigError) console.error("Error loading system_designations:", desigError.message);
          if (desigData?.value) setDesignations(desigData.value as string[]);

          const { data: mapData, error: mapError } = await supabase.from('system_config').select('value').eq('key', 'dept_designation_map').maybeSingle();
          if (mapError) console.error("Error loading dept_designation_map:", mapError.message);
          if (mapData?.value) setDepartmentDesignationMap(mapData.value as Record<string, string[]>);
        }
      } catch (e) {
        console.error("Auth initialization failed:", e);
      } finally {
        setIsLoading(false);
      }
    };
    initializeAuth();
  }, []);

  const fetchAndSetProfile = async (authUser: any) => {
    if (!supabase) return;
    try {
      const { data: profile, error } = await supabase
        .from('system_users')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching profile:", error);
      }

      if (profile) {
        let userRole = profile.role.toLowerCase();
        if (profile.email === 'INTERNET.00090@gmail.com' && userRole !== 'superadmin') {
          userRole = 'superadmin';
          // Update DB in background
          supabase.from('system_users').update({ role: 'superadmin' }).eq('id', profile.id).then();
        }
        setUser({
          id: profile.id,
          email: profile.email,
          name: profile.full_name,
          role: userRole
        });
      } else {
        // Auto-create profile if it doesn't exist (e.g. if trigger failed or user existed before table)
        const newProfile = {
          id: authUser.id,
          full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
          email: authUser.email || '',
          role: (authUser.email === 'INTERNET.00090@gmail.com' ? 'superadmin' : (authUser.user_metadata?.role || 'viewer')).toLowerCase(),
          status: 'active'
        };

        const { error: insertError } = await supabase
          .from('system_users')
          .upsert(newProfile, { onConflict: 'id' });

        if (insertError) {
          console.error("Error auto-creating profile:", insertError.message);
        }

        setUser({
          id: newProfile.id,
          email: newProfile.email,
          name: newProfile.full_name,
          role: newProfile.role
        });
      }
    } catch (e) {
      console.error("fetchAndSetProfile failed:", e);
    }
  };

  const hasPermission = (permission: PermissionKey): boolean => {
    if (!user) return false;
    if (user.role === 'superadmin') return true;
    const allowedRoles = permissions[permission] || [];
    return allowedRoles.includes(user.role.toLowerCase());
  };

  const updatePermission = async (key: PermissionKey, roles: UserRole[]) => {
    const newPermissions = { ...permissions, [key]: roles };
    setPermissions(newPermissions);
    if (supabase) {
      await supabase.from('system_config').upsert({ key: 'permissions_matrix', value: newPermissions }, { onConflict: 'key' });
    }
  };

  const saveSystemConfig = async (academicData?: { classes: any[], subjects: any[], sections: any[] }, biometricConfig?: any) => {
    if (supabase) {
      await supabase.from('system_config').upsert({ key: 'system_roles', value: availableRoles }, { onConflict: 'key' });
      await supabase.from('system_config').upsert({ key: 'system_departments', value: departments }, { onConflict: 'key' });
      await supabase.from('system_config').upsert({ key: 'system_designations', value: designations }, { onConflict: 'key' });
      await supabase.from('system_config').upsert({ key: 'dept_designation_map', value: departmentDesignationMap }, { onConflict: 'key' });
      
      if (academicData) {
        await supabase.from('system_config').upsert({ key: 'academic_structure_snapshot', value: academicData }, { onConflict: 'key' });
      }
      
      if (biometricConfig) {
        await supabase.from('system_config').upsert({ key: 'biometric_api_config', value: biometricConfig }, { onConflict: 'key' });
      }
    }
  };

  const saveSystemRoles = async () => saveSystemConfig();

  const addRole = async (roleName: string) => {
    const normalized = roleName.toLowerCase().trim();
    if (!availableRoles.includes(normalized)) {
      const newRoles = [...availableRoles, normalized];
      setAvailableRoles(newRoles);
    }
  };

  const deleteRole = async (roleName: string) => {
    if (!INITIAL_ROLES.includes(roleName)) {
      setAvailableRoles(prev => prev.filter(r => r !== roleName));
    }
  };

  const addDepartment = async (deptName: string) => {
    const trimmed = deptName.trim();
    if (trimmed && !departments.includes(trimmed)) {
      setDepartments(prev => [...prev, trimmed]);
    }
  };

  const deleteDepartment = async (deptName: string) => {
    setDepartments(prev => prev.filter(d => d !== deptName));
  };

  const addDesignation = (name: string) => {
    const trimmed = name.trim();
    if (trimmed && !designations.includes(trimmed)) {
      setDesignations(prev => [...prev, trimmed]);
    }
  };

  const deleteDesignation = (name: string) => {
    setDesignations(prev => prev.filter(d => d !== name));
  };

  const updateDeptMap = (dept: string, selectedDesignations: string[]) => {
    setDepartmentDesignationMap(prev => ({
      ...prev,
      [dept]: selectedDesignations
    }));
  };

  const register = async (email: string, password: string, fullName: string, role: string) => {
    setIsLoading(true);
    try {
      if (supabase) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              role: role
            }
          }
        });
        if (error) throw error;
        if (data.user) {
          await fetchAndSetProfile(data.user);
        }
      } else {
        throw new Error("Database offline.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      if (supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user) {
          await fetchAndSetProfile(data.user);
        }
      } else {
        throw new Error("Database offline.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
  };

  const updateUser = async (data: { name?: string; email?: string }) => {
    if (!user) return;
    const updatedUser = { ...user, ...data };
    setUser(updatedUser);
    localStorage.setItem('unacademy_auth_user', JSON.stringify(updatedUser));
    
    if (supabase && user.id !== 'dev-mode-user') {
      const { error } = await supabase
        .from('system_users')
        .update({ 
          full_name: data.name || user.name,
          email: data.email || user.email
        })
        .eq('id', user.id);
      if (error) throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, isAuthenticated: !!user, login, logout, isLoading, hasPermission, permissions, availableRoles, departments, designations, departmentDesignationMap,
      updatePermission, addRole, deleteRole, addDepartment, deleteDepartment, addDesignation, deleteDesignation, updateDeptMap, saveSystemConfig, saveSystemRoles,
      updateUser, register
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth error');
  return context;
};
