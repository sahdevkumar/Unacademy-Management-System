import React, { createContext, useContext, useEffect, useState } from 'react';
import { scheduleService } from '../services/scheduleService';

interface ClassContextType {
  selectedClassId: string;
  setSelectedClassId: (id: string) => void;
  availableClasses: string[];
  addClass: (className: string) => void;
}

const ClassContext = createContext<ClassContextType | undefined>(undefined);

export const ClassProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Start empty to enforce "only from database"
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);

  // Currently selected class
  const [selectedClassId, setSelectedClassId] = useState<string>(() => {
    try {
      if (typeof window !== 'undefined') {
        return localStorage.getItem('supabase-clone-selected-class') || '';
      }
    } catch (e) {}
    return '';
  });

  // Fetch from DB on mount
  useEffect(() => {
    const fetchClasses = async () => {
        const classes = await scheduleService.getClasses();
        // Strictly set the classes from DB, do not merge with defaults
        setAvailableClasses(classes);

        // If we have classes but no valid selection, pick the first one
        if (classes.length > 0) {
            setSelectedClassId(current => {
                 if (current && classes.includes(current)) return current;
                 return classes[0];
            });
        }
    };
    fetchClasses();
  }, []);

  // Persistence for classes list (optional caching) and selected ID
  useEffect(() => {
    if (selectedClassId) {
        localStorage.setItem('supabase-clone-selected-class', selectedClassId);
    }
  }, [selectedClassId]);

  const addClass = async (className: string) => {
    if (className && !availableClasses.includes(className)) {
      // Optimistic update
      setAvailableClasses(prev => [...prev, className]);
      setSelectedClassId(className);
      
      // Persist to DB
      await scheduleService.createClass(className);
    }
  };

  return (
    <ClassContext.Provider value={{ selectedClassId, setSelectedClassId, availableClasses, addClass }}>
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