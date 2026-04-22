/**
 * DrawerContext.tsx
 *
 * Lightweight context that tracks whether the side drawer is open or closed.
 *
 * Why a separate context instead of lifting state into AppContext?
 * - The drawer is a UI concern, not a data/domain concern.
 * - Keeping it isolated means only the components that care about drawer
 *   state (AppDrawer, the hamburger button in Home) subscribe to these
 *   updates — the rest of the app is unaffected.
 *
 * Usage:
 *   const { openDrawer, closeDrawer, isOpen } = useDrawer();
 */

import React, { createContext, useContext, useState, useCallback } from 'react';

interface DrawerContextType {
  isOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
}

/**
 * Default value used when the context is accessed outside a provider.
 * All methods are no-ops so consumers fail silently in tests / Storybook.
 */
const DrawerContext = createContext<DrawerContextType>({
  isOpen: false,
  openDrawer: () => {},
  closeDrawer: () => {},
  toggleDrawer: () => {},
});

/** Wraps the subtree that needs drawer access. Should be placed near the root
 *  of the app (inside _layout.tsx) so the drawer overlay can cover everything. */
export function DrawerProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  // useCallback prevents new function references on every render, keeping
  // child components from re-rendering unnecessarily
  const openDrawer = useCallback(() => setIsOpen(true), []);
  const closeDrawer = useCallback(() => setIsOpen(false), []);
  const toggleDrawer = useCallback(() => setIsOpen(prev => !prev), []);

  return (
    <DrawerContext.Provider value={{ isOpen, openDrawer, closeDrawer, toggleDrawer }}>
      {children}
    </DrawerContext.Provider>
  );
}

/** Hook for consuming drawer state and actions in any child component. */
export function useDrawer() {
  return useContext(DrawerContext);
}
