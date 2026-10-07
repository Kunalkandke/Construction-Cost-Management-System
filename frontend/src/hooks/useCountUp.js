import { useEffect, useState } from 'react';

// Count-up (max 800ms); respects prefers-reduced-motion
export function useCountUp(target, ms = 800) {
  const [v, setV] = useState(target);
  useEffect(() => {
    if (typeof target !== 'number') return undefined;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setV(target); return undefined; }
    let raf; const start = performance.now(); const from = 0;
    const tick = (now) => {
      const p = Math.min(1, (now - start) / Math.min(ms, 800));
      setV(Math.round(from + (target - from) * (1 - (1 - p) ** 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

export function useNow(active = true, interval = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { if (!active) return undefined; const t = setInterval(() => setNow(Date.now()), interval); return () => clearInterval(t); }, [active, interval]);
  return now;
}
