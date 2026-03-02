import React, { createContext, useContext, useState, useCallback } from 'react';

interface DrawerContextType {
  isOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
}

const DrawerContext = createContext<DrawerContextType>({
  isOpen: false,
  openDrawer: () => {},
  closeDrawer: () => {},
  toggleDrawer: () => {},
});

export function DrawerProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const openDrawer = useCallback(() => setIsOpen(true), []);
  const closeDrawer = useCallback(() => setIsOpen(false), []);
  const toggleDrawer = useCallback(() => setIsOpen(prev => !prev), []);

  return (
    <DrawerContext.Provider value={{ isOpen, openDrawer, closeDrawer, toggleDrawer }}>
      {children}
    </DrawerContext.Provider>
  );
}

export function useDrawer() {
  return useContext(DrawerContext);
}
