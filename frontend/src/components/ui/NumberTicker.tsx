import { useEffect, useState } from 'react';

export default function NumberTicker({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const start = display;
    const end = value;
    const dur = 600;
    const startTime = performance.now();
    const step = (now: number) => {
      const t = Math.min((now - startTime) / dur, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setDisplay(+(start + (end - start) * ease).toFixed(decimals));
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [value]); // eslint-disable-line

  return <>{display.toFixed(decimals)}</>;
}
