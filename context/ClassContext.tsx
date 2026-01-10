import React, { createContext, useContext, useEffect, useState } from 'react';
import { scheduleService } from '../services/scheduleService';
import { ClassInfo } from '../types';

interface ClassContextType {
  selectedClassId: string;
  setSelectedClassId: (id: string) => void;
  availableClasses: ClassInfo[];
  addClass: (className: string, section?: string, roomNo?: string) => void;
  selectedClass?: ClassInfo;
}

const ClassContext = createContext<ClassContextType | undefined>(undefined);

export const ClassProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [availableClasses, setAvailableClasses] = useState<ClassInfo[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>(() => {
    try {
      if (typeof window !== 'undefined') {
        return localStorage.getItem('supabase-clone-selected-class') || '';
      }
    } catch (e) {}
    return '';
  });

  useEffect(() => {
    const fetchClasses = async () => {
        const classes = await scheduleService.getClasses();
        setAvailableClasses(classes);

        if (classes.length > 0) {
            setSelectedClassId(current => {
                 if (current && classes.some(c => c.name === current)) return current;
                 return classes[0].name;
            });
        }
    };
    fetchClasses();
  }, []);

  useEffect(() => {
    if (selectedClassId) {
        localStorage.setItem('supabase-clone-selected-class', selectedClassId);
    }
  }, [selectedClassId]);

  const addClass = async (className: string, section: string = 'A', roomNo: string = '0') => {
    if (className && !availableClasses.some(c => c.name === className)) {
      const newClass: ClassInfo = { id: Date.now().toString(), name: className, section, room_no: roomNo };
      setAvailableClasses(prev => [...prev, newClass]);
      setSelectedClassId(className);
      await scheduleService.createClass(className, section, roomNo);
    }
  };

  const selectedClass = availableClasses.find(c => c.name === selectedClassId);

  return (
    <ClassContext.Provider value={{ selectedClassId, setSelectedClassId, availableClasses, addClass, selectedClass }}>
      {children}
    </ClassContext.Provider>
  );
};

export const useClass = () => {
  const context = useContext(ClassContext);
  if (!context) {
    throw new Error('useClass must be used within a ClassProvider');
  }
  return context;
};