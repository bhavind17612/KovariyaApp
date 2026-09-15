import { Alert } from 'react-native';
import { isChildVerified } from '../context/ChildrenContext';
import type { Child } from '../types';

/**
 * Checks whether an action against `child` should be blocked because the
 * child's profile is still `pending_verification`. If blocked, shows the
 * standard alert and returns `true` so the caller can bail out before hitting
 * the API — which would reject ratings/goals/mission logs for an unverified
 * child anyway, just with a less friendly error.
 */
export function blockIfUnverified(child: Child | null | undefined): boolean {
  if (!child || isChildVerified(child)) {
    return false;
  }
  Alert.alert(
    'Verification pending',
    `${child.name}'s profile is still pending verification by the school admin. Once verified, you'll be able to add behaviour ratings, missions, and goals.`,
    [{ text: 'OK' }]
  );
  return true;
}
