import { useCallback, useRef, useState } from "react";

export function useDebounce<A extends unknown[]>(
  action: (...args: A) => void,
  wait: number = 250
): (...args: A) => void {
  const [lastRun, setLastRun] = useState<number>(0);
  const timer = useRef<NodeJS.Timeout | undefined>();

  const exec = useCallback(
    (...args: A) => {
      setLastRun(performance.now());
      action(...args);
    },
    [action]
  );

  return (...args) => {
    const now = performance.now();
    const timeUntil = wait - (now - lastRun);

    if (timeUntil < 0) {
      exec(...args);
    } else {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => exec(...args), timeUntil);
    }
  };
}
