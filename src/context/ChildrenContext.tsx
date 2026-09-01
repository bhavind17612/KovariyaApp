import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Child } from '../types';
import { useAuth } from './AuthContext';

/**
 * A child is selectable only once the backend has verified it.
 *
 * Children a parent adds themselves start as `pending_verification`, and the API
 * refuses ratings, goals and mission logs against them until an admin verifies
 * the profile. Treating a missing status as verified keeps older payloads (and
 * any endpoint not yet sending the field) working as before.
 */
export function isChildVerified(child: Child): boolean {
  return child.verificationStatus !== 'pending_verification';
}

type ChildrenContextValue = {
  children: Child[];
  /** Only the children a parent is allowed to act on. */
  verifiedChildren: Child[];
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

  const verifiedChildren = useMemo(() => childList.filter(isChildVerified), [childList]);

  // Defaults to the first VERIFIED child; empty when the parent has none, which
  // lets dependent screens fall back to their existing empty states rather than
  // firing requests the API would reject.
  const [selectedChildId, setSelectedChildIdState] = useState<string>(
    () => verifiedChildren[0]?.id ?? ''
  );

  // Re-anchor whenever the parent's children change (login, add, verify).
  // Keeps the current pick if it is still valid, otherwise falls to the first
  // verified child — so a child that has just been verified is not deselected.
  useEffect(() => {
    setSelectedChildIdState((current) => {
      if (current && verifiedChildren.some((c) => c.id === current)) {
        return current;
      }
      return verifiedChildren[0]?.id ?? '';
    });
  }, [verifiedChildren]);

  // Guards against an unverified id reaching the rest of the app from any caller.
  const setSelectedChildId = useCallback(
    (childId: string) => {
      const target = childList.find((c) => c.id === childId);
      if (!target || !isChildVerified(target)) {
        return;
      }
      setSelectedChildIdState(childId);
    },
    [childList]
  );

  const [childPickerVisible, setChildPickerVisible] = useState(false);
  const openChildPicker = useCallback(() => setChildPickerVisible(true), []);
  const closeChildPicker = useCallback(() => setChildPickerVisible(false), []);

  const value = useMemo(
    () => ({
      children: childList,
      verifiedChildren,
      selectedChildId,
      setSelectedChildId,
      childPickerVisible,
      openChildPicker,
      closeChildPicker,
    }),
    [
      childList,
      verifiedChildren,
      selectedChildId,
      setSelectedChildId,
      childPickerVisible,
      openChildPicker,
      closeChildPicker,
    ]
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
