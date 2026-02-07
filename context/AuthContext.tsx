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
  saveSystemConfig: () => Promise<void>;
  saveSystemRoles: () => Promise<void>;
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
  const [user, setUser] = useState<User | null>(MOCK_USER);
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
          const { data: matrixData } = await supabase.from('system_config').select('value').eq('key', 'permissions_matrix').maybeSingle();
          if (matrixData?.value) setPermissions(matrixData.value as PermissionMap);

          const { data: rolesData } = await supabase.from('system_config').select('value').eq('key', 'system_roles').maybeSingle();
          if (rolesData?.value) setAvailableRoles(rolesData.value as UserRole[]);

          const { data: deptsData } = await supabase.from('system_config').select('value').eq('key', 'system_departments').maybeSingle();
          if (deptsData?.value) setDepartments(deptsData.value as string[]);

          const { data: desigData } = await supabase.from('system_config').select('value').eq('key', 'system_designations').maybeSingle();
          if (desigData?.value) setDesignations(desigData.value as string[]);

          const { data: mapData } = await supabase.from('system_config').select('value').eq('key', 'dept_designation_map').maybeSingle();
          if (mapData?.value) setDepartmentDesignationMap(mapData.value as Record<string, string[]>);
        }

        const savedUser = localStorage.getItem('unacademy_auth_user');
        if (savedUser) {
          setUser(JSON.parse(savedUser));
        } else {
          setUser(MOCK_USER);
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

  const saveSystemConfig = async () => {
    if (supabase) {
      await supabase.from('system_config').upsert({ key: 'system_roles', value: availableRoles }, { onConflict: 'key' });
      await supabase.from('system_config').upsert({ key: 'system_departments', value: departments }, { onConflict: 'key' });
      await supabase.from('system_config').upsert({ key: 'system_designations', value: designations }, { onConflict: 'key' });
      await supabase.from('system_config').upsert({ key: 'dept_designation_map', value: departmentDesignationMap }, { onConflict: 'key' });
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

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      if (supabase) {
        const { data: dbUser, error } = await supabase.from('system_users').select('*').eq('email', email).maybeSingle();
        if (error) throw new Error(error.message);
        if (!dbUser || dbUser.password !== password) throw new Error("Invalid credentials.");
        const loggedInUser: User = { id: dbUser.id, email: dbUser.email, name: dbUser.full_name, role: dbUser.role.toLowerCase() };
        setUser(loggedInUser);
        localStorage.setItem('unacademy_auth_user', JSON.stringify(loggedInUser));
      } else {
        if (password === '1234') setUser(MOCK_USER);
        else throw new Error("Database offline.");
      }
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
      user, isAuthenticated: !!user, login, logout, isLoading, hasPermission, permissions, availableRoles, departments, designations, departmentDesignationMap,
      updatePermission, addRole, deleteRole, addDepartment, deleteDepartment, addDesignation, deleteDesignation, updateDeptMap, saveSystemConfig, saveSystemRoles 
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