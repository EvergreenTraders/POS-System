import React, { createContext, useContext, useRef, useCallback } from 'react';

// Lets a page (currently just ModernTransactions) register an "unparked work"
// guard, and lets navigation UI (Sidebar) ask permission before leaving —
// without either needing to import the other directly.
const WorkspaceGuardContext = createContext();

export function WorkspaceGuardProvider({ children }) {
  const guardRef = useRef(null);

  // Called by the page that owns the guarded state. Returns an unregister
  // function to call on unmount / whenever the guard needs to be replaced.
  const registerGuard = useCallback((guard) => {
    guardRef.current = guard;
    return () => {
      if (guardRef.current === guard) guardRef.current = null;
    };
  }, []);

  // Called before navigating away. Resolves true if navigation should proceed,
  // false if it should be cancelled (the registered guard decides, e.g. by
  // showing a confirm dialog and awaiting the user's choice).
  const requestNavigation = useCallback(async () => {
    const guard = guardRef.current;
    if (!guard || !guard.hasUnparkedWork) return true;
    return guard.confirmLeave();
  }, []);

  const value = { registerGuard, requestNavigation };

  return (
    <WorkspaceGuardContext.Provider value={value}>
      {children}
    </WorkspaceGuardContext.Provider>
  );
}

export function useWorkspaceGuard() {
  const context = useContext(WorkspaceGuardContext);
  if (!context) {
    throw new Error('useWorkspaceGuard must be used within a WorkspaceGuardProvider');
  }
  return context;
}
