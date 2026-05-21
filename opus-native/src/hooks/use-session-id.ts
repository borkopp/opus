import { useRef } from 'react';

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** Returns a stable session ID for the lifetime of the component tree.
 *  Resets on full app restart — intentional, same behaviour as the web app. */
export function useSessionId(): string {
  const ref = useRef<string | null>(null);
  if (ref.current === null) {
    ref.current = generateId();
  }
  return ref.current;
}
