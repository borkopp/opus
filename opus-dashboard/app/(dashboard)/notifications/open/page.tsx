import { Suspense } from "react";
import { PushNotificationRedirect } from "@/components/notifications/PushNotificationRedirect";
export default function OpenNotificationPage() {
  return (
    <Suspense>
      <PushNotificationRedirect />
    </Suspense>
  );
}
