import { useEffect, useRef, useState } from "react";

/** Trigger once when element reaches `threshold` visibility. */
export const useInViewOnce = <T extends HTMLElement>(threshold = 0.3) => {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node || inView) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [inView, threshold]);
  return { ref, inView };
};
