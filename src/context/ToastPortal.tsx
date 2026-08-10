import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { FullWindowOverlay } from 'react-native-screens';

/**
 * Overlay/portal layer that carries the toast above the rest of the app.
 *
 * The toast used to render inside a transparent <Modal>. That guaranteed it sat
 * above every other native window, but a Modal always owns the whole screen
 * layer: it swallowed touches meant for the screen underneath and flickered as
 * it mounted/unmounted around the toast animation.
 *
 * This layer replaces it with a non-blocking overlay:
 *  - iOS: a FullWindowOverlay (react-native-screens) attached to the key
 *    UIWindow. It draws above presented modals, and its hit-testing returns nil
 *    unless one of its own children is hit, so the app below stays interactive.
 *  - Android: an absolutely positioned `box-none` view at the app root. Android
 *    has no window-level overlay, and a native <Modal> is its own Dialog window,
 *    so a component rendering inside a Modal can mount a <ToastPortalHost /> to
 *    receive the toast while it is open. The most recently mounted host wins.
 */

type HostId = number;

const ROOT_HOST_ID: HostId = 0;

let nextHostId = ROOT_HOST_ID + 1;

type RegistryValue = {
  register: (id: HostId) => void;
  unregister: (id: HostId) => void;
};

type PortalValue = {
  /** The only host allowed to render the toast right now. */
  activeHostId: HostId;
  content: React.ReactNode;
};

const RegistryContext = createContext<RegistryValue | null>(null);

const PortalContext = createContext<PortalValue>({
  activeHostId: ROOT_HOST_ID,
  content: null,
});

/**
 * Interaction-transparent container. Never paints a background and never becomes
 * a touch target itself — only its children can receive touches.
 */
function ToastOverlay({ children }: { children: React.ReactNode }) {
  if (Platform.OS === 'ios') {
    return (
      <FullWindowOverlay unstable_accessibilityContainerViewIsModal={false}>
        <View pointerEvents="box-none" style={styles.overlay}>
          {children}
        </View>
      </FullWindowOverlay>
    );
  }

  return (
    <View pointerEvents="box-none" style={[styles.overlay, styles.androidLift]}>
      {children}
    </View>
  );
}

export function ToastPortalProvider({
  content,
  children,
}: {
  content: React.ReactNode;
  children: React.ReactNode;
}) {
  const [hostIds, setHostIds] = useState<HostId[]>([]);

  const register = useCallback((id: HostId) => {
    setHostIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  const unregister = useCallback((id: HostId) => {
    setHostIds((prev) => prev.filter((hostId) => hostId !== id));
  }, []);

  const registry = useMemo<RegistryValue>(
    () => ({ register, unregister }),
    [register, unregister]
  );

  // On iOS the root overlay is already a window-level layer above any presented
  // modal, so modal-level hosts never activate. On Android the newest mounted
  // host wins, which keeps a toast visible when it is raised from inside a Modal.
  const activeHostId =
    Platform.OS === 'ios' || hostIds.length === 0
      ? ROOT_HOST_ID
      : hostIds[hostIds.length - 1];

  const portal = useMemo<PortalValue>(
    () => ({ activeHostId, content }),
    [activeHostId, content]
  );

  return (
    <RegistryContext.Provider value={registry}>
      <PortalContext.Provider value={portal}>
        {children}
        {/*
          The root overlay stays mounted for the lifetime of the app so showing or
          hiding a toast never mounts/unmounts a native layer (that was the source
          of the flicker). Only its content comes and goes.
        */}
        <ToastOverlay>{activeHostId === ROOT_HOST_ID ? content : null}</ToastOverlay>
      </PortalContext.Provider>
    </RegistryContext.Provider>
  );
}

/**
 * Android-only escape hatch: render this inside a native <Modal> so toasts raised
 * while that modal is open are drawn in the modal's own window instead of behind
 * it. Renders nothing on iOS and nothing while the modal is not the topmost host.
 */
export function ToastPortalHost() {
  const registry = useContext(RegistryContext);
  const { activeHostId, content } = useContext(PortalContext);

  const idRef = useRef<HostId | null>(null);
  if (idRef.current === null) {
    idRef.current = nextHostId++;
  }
  const id = idRef.current;

  useEffect(() => {
    if (!registry) {
      return;
    }
    registry.register(id);
    return () => registry.unregister(id);
  }, [registry, id]);

  if (Platform.OS === 'ios' || activeHostId !== id) {
    return null;
  }

  return <ToastOverlay>{content}</ToastOverlay>;
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  androidLift: {
    // No background colour, so the elevation adds draw order without a shadow.
    zIndex: 9999,
    elevation: 9999,
  },
});
