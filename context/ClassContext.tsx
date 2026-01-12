import React, { createContext, useContext, useEffect, useState } from 'react';
import { scheduleService } from '../services/scheduleService';
import { supabase } from '../services/supabaseClient';
import { ClassInfo, EducationLevel } from '../types';
import { useAuth } from './AuthContext';

interface ClassContextType {
  selectedClassId: string;
  setSelectedClassId: (id: string) => void;
  availableClasses: ClassInfo[];
  addClass: (className: string, section?: string, roomNo?: string, level?: 'junior' | 'senior') => void;
  selectedClass?: ClassInfo;
  currentLevelFilter: EducationLevel;
  setLevelFilter: (level: EducationLevel) => void;
  refreshAssignments: () => Promise<void>;
}

const ClassContext = createContext<ClassContextType | undefined>(undefined);

export const ClassProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [availableClasses, setAvailableClasses] = useState<ClassInfo[]>([]);
  const [currentLevelFilter, setLevelFilter] = useState<EducationLevel>('all');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [assignments, setAssignments] = useState<Record<string, string[]>>({});

  const refreshAssignments = async () => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase.from('user_assignments').select('*');
      if (!error && data) {
        const map: Record<string, string[]> = {};
        data.forEach((row: any) => {
          map[row.user_id] = row.assigned_classes || [];
        });
        setAssignments(map);
      }
    } catch (e) {
      console.error("Failed to fetch database assignments", e);
    }
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      const classes = await scheduleService.getClasses();
      setAvailableClasses(classes);
      await refreshAssignments();

      const savedId = localStorage.getItem('supabase-clone-selected-class');
      if (savedId && classes.some(c => c.name === savedId)) {
        setSelectedClassId(savedId);
      } else if (classes.length > 0) {
        setSelectedClassId(classes[0].name);
      }
    };
    fetchInitialData();

    // Subscribe to realtime updates if available
    if (supabase) {
      const channel = supabase.channel('assignments_changes')
        .on('postgres_changes', { event: '*', table: 'user_assignments', schema: 'public' }, () => {
          refreshAssignments();
        })
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, []);

  useEffect(() => {
    if (selectedClassId) {
        localStorage.setItem('supabase-clone-selected-class', selectedClassId);
    }
  }, [selectedClassId]);

  const addClass = async (className: string, section: string = 'A', roomNo: string = '0', level: 'junior' | 'senior' = 'junior') => {
    if (className && !availableClasses.some(c => c.name === className)) {
      const newClass: ClassInfo = { id: Date.now().toString(), name: className, section, room_no: roomNo, level };
      setAvailableClasses(prev => [...prev, newClass]);
      setSelectedClassId(className);
      await scheduleService.createClass(className, section, roomNo, level);
    }
  };

  const filteredClasses = availableClasses.filter(c => {
    const levelMatch = currentLevelFilter === 'all' || c.level === currentLevelFilter;
    if (!levelMatch) return false;

    if (!user || user.role === 'superadmin') return true;
    
    const userAssignments = assignments[user.id] || [];
    return userAssignments.includes(c.name);
  });

  const selectedClass = availableClasses.find(c => c.name === selectedClassId);

  return (
    <ClassContext.Provider value={{ 
        selectedClassId, 
        setSelectedClassId, 
        availableClasses: filteredClasses, 
        addClass, 
        selectedClass,
        currentLevelFilter,
        setLevelFilter,
        refreshAssignments
    }}>
      {children}
    </ClassContext.Provider>
  );
};

export const useClass = () => {
  const context = useContext(ClassContext);
  if (!context) throw new Error('useClass must be used within a ClassProvider');
  return context;
};