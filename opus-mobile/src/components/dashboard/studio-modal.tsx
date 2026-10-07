import { useRef, type ReactNode } from "react";
import { Platform } from "react-native";
import {
  router,
  Stack,
  useIsFocused,
  useNavigation,
  type Href,
} from "expo-router";
import { usePreventRemove } from "expo-router/react-navigation";
import { ModalScreen } from "@/components/ui/modal-screen";
import { ConnectionNotice } from "@/components/dashboard/connection-notice";
import type { ModalMotionHandle } from "@/hooks/use-modal-motion";

export function StudioModal({
  title,
  busy = false,
  fallback,
  dismissToFallback = false,
  children,
  footer,
}: {
  title: string;
  busy?: boolean;
  fallback: Href;
  dismissToFallback?: boolean;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const focused = useIsFocused();
  const navigation = useNavigation();
  const motionRef = useRef<ModalMotionHandle>(null);
  usePreventRemove(Platform.OS === "web", ({ data }) => {
    const finish = () => navigation.dispatch(data.action);
    if (motionRef.current) motionRef.current.exit(finish);
    else finish();
  });
  function close() {
    if (busy) return;
    const finish = () => {
      if (dismissToFallback) router.dismissTo(fallback);
      else if (router.canDismiss()) router.dismiss();
      else router.replace(fallback);
    };
    if (motionRef.current) motionRef.current.exit(finish);
    else finish();
  }
  return (
    <>
      <Stack.Screen options={{ gestureEnabled: !busy }} />
      <ModalScreen
        title={title}
        onClose={close}
        closeDisabled={busy}
        visible={focused}
        footer={footer}
        motionRef={motionRef}
      >
        <ConnectionNotice />
        {children}
      </ModalScreen>
    </>
  );
}
