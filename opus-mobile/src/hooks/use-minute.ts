import { useEffect, useState } from "react";
export function useMinute() {
  const [minute, setMinute] = useState(() => Math.floor(Date.now() / 60_000));
  useEffect(() => {
    const timer = setInterval(
      () => setMinute(Math.floor(Date.now() / 60_000)),
      15_000,
    );
    return () => clearInterval(timer);
  }, []);
  return minute;
}
