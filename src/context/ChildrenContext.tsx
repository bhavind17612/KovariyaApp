import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Child } from '../types';
import { useAuth } from './AuthContext';

type ChildrenContextValue = {
  children: Child[];
  selectedChildId: string;
  setSelectedChildId: (childId: string) => void;
  childPickerVisible: boolean;
  openChildPicker: () => void;
  closeChildPicker: () => void;
};

const ChildrenContext = createContext<ChildrenContextValue | undefined>(undefined);

export function ChildrenProvider({ children: reactChildren }: { children: React.ReactNode }) {
  const { user } = useAuth();

  const childList = useMemo<Child[]>(() => user?.children ?? [], [user?.children]);

  const [selectedChildId, setSelectedChildId] = useState<string>(childList[0]?.id ?? '');
  const [childPickerVisible, setChildPickerVisible] = useState(false);

  // Reset to first child whenever the logged-in parent changes
  useEffect(() => {
    setSelectedChildId(childList[0]?.id ?? '');
  }, [childList]);

  const openChildPicker = () => setChildPickerVisible(true);
  const closeChildPicker = () => setChildPickerVisible(false);

  const value = useMemo(
    () => ({
      children: childList,
      selectedChildId,
      setSelectedChildId,
      childPickerVisible,
      openChildPicker,
      closeChildPicker,
    }),
    [childList, selectedChildId, childPickerVisible]
  );

  return <ChildrenContext.Provider value={value}>{reactChildren}</ChildrenContext.Provider>;
}

export function useChildren(): ChildrenContextValue {
  const ctx = useContext(ChildrenContext);
  if (!ctx) {
    throw new Error('useChildren must be used within ChildrenProvider');
  }
  return ctx;
}
