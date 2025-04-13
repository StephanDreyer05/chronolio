import { createContext, useContext, useState, ReactNode } from 'react';
import { useLocation } from 'wouter';

interface TimelineNavigationContextType {
  showSaveDialog: boolean;
  setShowSaveDialog: (show: boolean) => void;
  navigationPath: string;
  setNavigationPath: (path: string) => void;
  handleNavigation: (path: string) => void;
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (hasChanges: boolean) => void;
}

const TimelineNavigationContext = createContext<TimelineNavigationContextType | undefined>(undefined);

export function TimelineNavigationProvider({ children }: { children: ReactNode }) {
  const [, navigate] = useLocation();
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [navigationPath, setNavigationPath] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const handleNavigation = (path: string) => {
    if (hasUnsavedChanges) {
      setNavigationPath(path);
      setShowSaveDialog(true);
    } else {
      navigate(path);
    }
  };

  return (
    <TimelineNavigationContext.Provider
      value={{
        showSaveDialog,
        setShowSaveDialog,
        navigationPath,
        setNavigationPath,
        handleNavigation,
        hasUnsavedChanges,
        setHasUnsavedChanges,
      }}
    >
      {children}
    </TimelineNavigationContext.Provider>
  );
}

export function useTimelineNavigation() {
  const context = useContext(TimelineNavigationContext);
  if (context === undefined) {
    throw new Error('useTimelineNavigation must be used within a TimelineNavigationProvider');
  }
  return context;
} 