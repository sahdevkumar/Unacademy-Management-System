
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { User, PermissionMap, PermissionKey, UserRole, LeadSource, MapLeader, Employee, Counsellor } from '../types';
import { 
  INITIAL_LEAD_SOURCES, 
  INITIAL_ROLES, 
  INITIAL_DEPARTMENTS, 
  INITIAL_DESIGNATIONS, 
  INITIAL_LEAD_BY, 
  DEFAULT_DEPT_MAP, 
  DEFAULT_PERMISSIONS 
} from '../constants';

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
  leadSources: LeadSource[];
  leadBy: string[];
  counsellors: Counsellor[];
  mapLeaders: MapLeader[];
  allEmployees: Employee[];
  departmentDesignationMap: Record<string, string[]>;
  updatePermission: (key: PermissionKey, roles: UserRole[]) => Promise<void>;
  addRole: (roleName: string) => Promise<void>;
  deleteRole: (roleName: string) => Promise<void>;
  addDepartment: (deptName: string) => Promise<void>;
  deleteDepartment: (deptName: string) => Promise<void>;
  addDesignation: (name: string) => void;
  deleteDesignation: (name: string) => void;
  addLeadSource: (id: string, name: string, code?: string) => void;
  updateLeadSource: (id: string, data: Partial<LeadSource>) => void;
  deleteLeadSource: (id: string) => void;
  deleteLeadSourceByIndex: (index: number) => void;
  clearAllLeadSources: () => void;
  addLeadBy: (name: string) => void;
  deleteLeadBy: (name: string) => void;
  toggleMapLeader: (employee: Employee) => Promise<void>;
  toggleCounsellor: (employee: Employee) => Promise<void>;
  addCounsellor: (name: string) => Promise<void>;
  deleteCounsellor: (name: string) => Promise<void>;
  updateDeptMap: (dept: string, selectedDesignations: string[]) => void;
  saveConfigItem: (key: string, value: any) => Promise<void>;
  saveSystemConfig: (academicData?: { classes: any[], subjects: any[], sections: any[] }) => Promise<void>;
  saveSystemRoles: () => Promise<void>;
  register: (email: string, password: string, fullName: string, role: string) => Promise<void>;
  updateUser: (data: { name?: string; email?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
  const [leadSources, setLeadSources] = useState<LeadSource[]>(INITIAL_LEAD_SOURCES);
  const [leadBy, setLeadBy] = useState<string[]>(INITIAL_LEAD_BY);
  const [counsellors, setCounsellors] = useState<Counsellor[]>([]);
  const [mapLeaders, setMapLeaders] = useState<MapLeader[]>([]);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [departmentDesignationMap, setDepartmentDesignationMap] = useState<Record<string, string[]>>(DEFAULT_DEPT_MAP);

  useEffect(() => {
    let subscription: any = null;

    const initializeAuth = async () => {
      setIsLoading(true);
      try {
        if (supabase && supabase.auth) {
          // 1. Get Initial Session
          const { data } = await supabase.auth.getSession();
          const session = data?.session;
          
          if (session?.user) {
            await fetchAndSetProfile(session.user);
          }

          // 2. Listen for Auth Changes
          const { data: { subscription: sub } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (session?.user) {
              await fetchAndSetProfile(session.user);
            } else {
              setUser(null);
            }
          });
          subscription = sub;

          // 3. Load System Config with timeout
          const fetchWithTimeout = async (query: any, timeoutMs = 20000) => {
            return Promise.race([
              query,
              new Promise((_, reject) => setTimeout(() => reject(new Error('Fetch timed out')), timeoutMs))
            ]);
          };

          try {
            const { data: matrixData, error: matrixError } = await fetchWithTimeout(
              supabase.from('system_config').select('value').eq('key', 'permissions_matrix').maybeSingle()
            ) as any;
            if (matrixError) {
              console.error("Error loading permissions_matrix:", matrixError.message);
              if (matrixError.message === 'Failed to fetch') {
                console.error("Network error: Check if Supabase URL is correct and reachable.");
              }
            }
            if (matrixData?.value) setPermissions(matrixData.value as PermissionMap);
          } catch (e) {
            console.warn("permissions_matrix fetch timed out or failed:", e);
          }

          try {
            const { data: rolesData, error: rolesError } = await fetchWithTimeout(
              supabase.from('system_config').select('value').eq('key', 'system_roles').maybeSingle()
            ) as any;
            if (rolesError) {
              console.error("Error loading system_roles:", rolesError.message);
              if (rolesError.message === 'Failed to fetch') {
                console.error("Network error: Check if Supabase URL is correct and reachable.");
              }
            }
            if (rolesData?.value) setAvailableRoles(rolesData.value as UserRole[]);
          } catch (e) {
            console.warn("system_roles fetch timed out or failed:", e);
          }

          try {
            const { data: deptsData, error: deptsError } = await fetchWithTimeout(
              supabase.from('system_config').select('value').eq('key', 'system_departments').maybeSingle()
            ) as any;
            if (deptsError) {
              console.error("Error loading system_departments:", deptsError.message);
              if (deptsError.message === 'Failed to fetch') {
                console.error("Network error: Check if Supabase URL is correct and reachable.");
              }
            }
            if (deptsData?.value) setDepartments(deptsData.value as string[]);
          } catch (e) {
            console.warn("system_departments fetch timed out or failed:", e);
          }

          try {
            const { data: desigData, error: desigError } = await fetchWithTimeout(
              supabase.from('system_config').select('value').eq('key', 'system_designations').maybeSingle()
            ) as any;
            if (desigError) console.error("Error loading system_designations:", desigError.message);
            if (desigData?.value) setDesignations(desigData.value as string[]);
          } catch (e) {
            console.warn("system_designations fetch timed out or failed");
          }

          try {
            const { data: leadData, error: leadError } = await fetchWithTimeout(
              supabase.from('system_config').select('value').eq('key', 'lead_source').maybeSingle()
            ) as any;
            if (leadError) console.error("Error loading lead_source:", leadError.message);
            console.log("Loaded lead_source from DB:", leadData?.value);
            if (leadData?.value) {
              const rawSources = leadData.value as LeadSource[];
              // Automatic cleanup for duplicate IDs
              const seenIds = new Set<string>();
              const cleanedSources = rawSources.map((source, index) => {
                let uniqueId = source.id;
                let counter = 1;
                while (seenIds.has(uniqueId)) {
                  uniqueId = `${source.id}_${counter}`;
                  counter++;
                }
                seenIds.add(uniqueId);
                return { ...source, id: uniqueId };
              });

              // If cleanup changed anything, update the state and optionally the DB
              const hasChanges = cleanedSources.some((s, i) => s.id !== rawSources[i].id);
              setLeadSources(cleanedSources);
              
              if (hasChanges) {
                console.log("Fixed duplicate lead source IDs:", cleanedSources);
                // We'll let the user save it manually or we can trigger an auto-save here if needed
                // For now, just updating the local state is enough to fix the UI issues.
              }
            } else {
              console.log("No lead_source found in DB, using initial sources.");
            }
          } catch (e) {
            console.warn("lead_source fetch timed out or failed");
          }

          try {
            const { data: leadByData, error: leadByError } = await fetchWithTimeout(
              supabase.from('system_config').select('value').eq('key', 'lead_by').maybeSingle()
            ) as any;
            if (leadByError) console.error("Error loading lead_by:", leadByError.message);
            if (leadByData?.value) setLeadBy(leadByData.value as string[]);
          } catch (e) {
            console.warn("lead_by fetch timed out or failed");
          }

          try {
            const { data: counsellorData, error: counsellorError } = await fetchWithTimeout(
              supabase.from('system_config').select('value').eq('key', 'counsellors').maybeSingle()
            ) as any;
            if (counsellorError) console.error("Error loading counsellors:", counsellorError.message);
            if (counsellorData?.value) setCounsellors(counsellorData.value as Counsellor[]);
          } catch (e) {
            console.warn("counsellors fetch timed out or failed");
          }

          try {
            const { data: mapData, error: mapError } = await fetchWithTimeout(
              supabase.from('system_config').select('value').eq('key', 'dept_designation_map').maybeSingle()
            ) as any;
            if (mapError) console.error("Error loading dept_designation_map:", mapError.message);
            if (mapData?.value) setDepartmentDesignationMap(mapData.value as Record<string, string[]>);
          } catch (e) {
            console.warn("dept_designation_map fetch timed out or failed");
          }

          try {
            const { data: mapLeaderData, error: mapLeaderError } = await fetchWithTimeout(
              supabase.from('system_config').select('value').eq('key', 'map_leader').maybeSingle()
            ) as any;
            if (mapLeaderError) console.error("Error loading map_leader:", mapLeaderError.message);
            if (mapLeaderData?.value) setMapLeaders(mapLeaderData.value as MapLeader[]);
          } catch (e) {
            console.warn("map_leader fetch timed out or failed");
          }

          try {
            const { data: empData, error: empError } = await fetchWithTimeout(
              supabase.from('employees').select('id, employee_id, full_name, status')
            ) as any;
            if (empError) console.error("Error loading employees:", empError.message);
            if (empData) setAllEmployees(empData as Employee[]);
          } catch (e) {
            console.warn("employees fetch timed out or failed");
          }
        }
      } catch (e) {
        console.error("Auth initialization failed:", e);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [supabase]);

  const fetchAndSetProfile = async (authUser: any) => {
    if (!supabase) return;
    try {
      const { data: profile, error } = await supabase
        .from('system_users')
        .select('*, employees(employee_id)')
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
          role: userRole,
          employee_id: profile.employees?.employee_id || undefined
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
          role: newProfile.role,
          employee_id: undefined
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

  const saveConfigItem = async (key: string, value: any) => {
    if (!supabase) return;
    const { error } = await supabase
      .from('system_config')
      .upsert({ key, value }, { onConflict: 'key' });
    if (error) {
      console.error(`Error saving config item ${key}:`, error);
      throw error;
    }
  };

  const saveSystemConfig = async (academicData?: { classes: any[], subjects: any[], sections: any[] }) => {
    if (!supabase) return;

    const configs = [
      { key: 'system_roles', value: availableRoles },
      { key: 'system_departments', value: departments },
      { key: 'system_designations', value: designations },
      { key: 'lead_source', value: leadSources },
      { key: 'lead_by', value: leadBy },
      { key: 'counsellor', value: counsellors },
      { key: 'dept_designation_map', value: departmentDesignationMap }
    ];

    if (academicData) {
      configs.push({ key: 'academic_structure_snapshot', value: academicData });
    }

    for (const config of configs) {
      console.log(`Saving ${config.key} to DB:`, config.value);
      const { error } = await supabase
        .from('system_config')
        .upsert(config, { onConflict: 'key' });
      
      if (error) {
        console.error(`Error saving ${config.key}:`, error);
        throw new Error(`Failed to save ${config.key}: ${error.message}`);
      }
    }
    console.log("All system configurations saved successfully.");
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

  const addLeadSource = (id: string, name: string, code?: string) => {
    const trimmedId = id.trim();
    const trimmedName = name.trim();
    if (trimmedId && trimmedName && !leadSources.some(ls => ls.id === trimmedId)) {
      setLeadSources(prev => [...prev, { id: trimmedId, name: trimmedName, code: code?.trim() }]);
    }
  };

  const updateLeadSource = (id: string, data: Partial<LeadSource>) => {
    setLeadSources(prev => prev.map(ls => ls.id === id ? { ...ls, ...data } : ls));
  };

  const deleteLeadSource = (id: string) => {
    setLeadSources(prev => prev.filter(ls => ls.id !== id));
  };

  const deleteLeadSourceByIndex = (index: number) => {
    setLeadSources(prev => prev.filter((_, i) => i !== index));
  };

  const clearAllLeadSources = () => {
    setLeadSources([]);
  };

  const addLeadBy = (name: string) => {
    const trimmed = name.trim();
    if (trimmed && !leadBy.includes(trimmed)) {
      setLeadBy(prev => [...prev, trimmed]);
    }
  };

  const deleteLeadBy = (name: string) => {
    setLeadBy(prev => prev.filter(d => d !== name));
  };

  const toggleMapLeader = async (employee: Employee) => {
    const isAlreadyLeader = mapLeaders.some(ml => ml.uuid === employee.id);
    let updatedLeaders: MapLeader[];

    if (isAlreadyLeader) {
      updatedLeaders = mapLeaders.filter(ml => ml.uuid !== employee.id);
    } else {
      const newLeader: MapLeader = {
        id: Math.floor(Math.random() * 10000).toString().padStart(4, '0'),
        uuid: employee.id,
        name: employee.full_name,
        employee_id: employee.employee_id
      };
      updatedLeaders = [...mapLeaders, newLeader];
    }

    setMapLeaders(updatedLeaders);
    await saveConfigItem('map_leader', updatedLeaders);
  };

  const toggleCounsellor = async (employee: Employee) => {
    const isAlreadyCounsellor = counsellors.some(c => c.uuid === employee.id);
    let updatedCounsellors: Counsellor[];

    if (isAlreadyCounsellor) {
      updatedCounsellors = counsellors.filter(c => c.uuid !== employee.id);
    } else {
      const newCounsellor: Counsellor = {
        id: Math.floor(Math.random() * 10000).toString().padStart(4, '0'),
        uuid: employee.id,
        name: employee.full_name,
        employee_id: employee.employee_id
      };
      updatedCounsellors = [...counsellors, newCounsellor];
    }

    setCounsellors(updatedCounsellors);
    await saveConfigItem('counsellors', updatedCounsellors);
  };

  const addCounsellor = async (name: string) => {
    const trimmed = name.trim();
    if (trimmed && !counsellors.some(c => c.name === trimmed)) {
      const newC: Counsellor = {
        id: Math.floor(Math.random() * 10000).toString().padStart(4, '0'),
        uuid: '',
        name: trimmed
      };
      const updated = [...counsellors, newC];
      setCounsellors(updated);
      await saveConfigItem('counsellors', updated);
    }
  };

  const deleteCounsellor = async (name: string) => {
    const updated = counsellors.filter(d => d.name !== name);
    setCounsellors(updated);
    await saveConfigItem('counsellors', updated);
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
      user, isAuthenticated: !!user, login, logout, isLoading, hasPermission, permissions, availableRoles, departments, designations, leadSources, leadBy, counsellors, mapLeaders, allEmployees, departmentDesignationMap,
      updatePermission, addRole, deleteRole, addDepartment, deleteDepartment, addDesignation, deleteDesignation, addLeadSource, updateLeadSource, deleteLeadSource, deleteLeadSourceByIndex, clearAllLeadSources, addLeadBy, deleteLeadBy, toggleMapLeader, toggleCounsellor, addCounsellor, deleteCounsellor, updateDeptMap, saveConfigItem, saveSystemConfig, saveSystemRoles,
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
