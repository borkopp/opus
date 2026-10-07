import { safeNativePath } from "@/lib/native-path";
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  return safeNativePath(path);
}
