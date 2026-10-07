import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  ConvexReactClient,
  useConvexAuth,
  useMutation,
  useQuery,
} from "convex/react";
import {
  ConvexBetterAuthProvider,
  type AuthClient,
} from "@convex-dev/better-auth/react";
import { authClient, convexUrl } from "@/lib/auth-client";
import { backend, errorMessage, type MobileStudio } from "@/lib/backend";
import { Platform } from "react-native";
import { captureAppError } from "@/lib/monitoring";
const client =
  convexUrl && (Platform.OS !== "web" || typeof window !== "undefined")
    ? new ConvexReactClient(convexUrl, { unsavedChangesWarning: false })
    : null;
type Session = {
  authenticated: boolean;
  loading: boolean;
  studio: MobileStudio | null;
  message: string | null;
  error: string | null;
  retry: () => void;
};
const SessionContext = createContext<Session | null>(null);
function SessionSync({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const ensureUser = useMutation(backend.ensureUser);
  const { data: session } = authClient.useSession();
  const userId = session?.user.id;
  const [syncedUser, setSyncedUser] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    if (!isAuthenticated || !userId) return;
    void ensureUser({})
      .then(() => {
        if (active) setSyncedUser(userId);
      })
      .catch((e) => {
        captureAppError(e, "account-sync");
        if (active) setError(errorMessage(e));
      });
    return () => {
      active = false;
    };
  }, [isAuthenticated, userId, ensureUser, attempt]);
  const synced = isAuthenticated && !!userId && syncedUser === userId;
  const result = useQuery(backend.bootstrap, synced ? {} : "skip");
  const studio = synced && result?.available ? result : null;
  return (
    <SessionContext.Provider
      value={{
        authenticated: isAuthenticated,
        loading:
          isLoading ||
          (isAuthenticated && !error && (!synced || result === undefined)),
        studio,
        message: synced && result && !result.available ? result.message : null,
        error,
        retry: () => {
          setError(null);
          setSyncedUser(null);
          setAttempt((value) => value + 1);
        },
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}
export function SessionProvider({ children }: { children: ReactNode }) {
  const { data: session } = authClient.useSession();
  // Static web export must not open a Convex WebSocket or serialize private data.
  if (Platform.OS === "web" && typeof window === "undefined") return null;
  if (!client) throw new Error("EXPO_PUBLIC_CONVEX_URL is required.");
  return (
    <ConvexBetterAuthProvider
      client={client}
      authClient={authClient as unknown as AuthClient}
    >
      <SessionSync key={session?.user.id ?? "signed-out"}>
        {children}
      </SessionSync>
    </ConvexBetterAuthProvider>
  );
}
export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error("SessionProvider is required.");
  return value;
}
export function useStudioData() {
  const { studio } = useSession();
  if (!studio) throw new Error("Active studio access is required.");
  return studio;
}
