import { useEffect, useRef, useState, type ReactNode } from "react";

interface LazyWhenVisibleProps {
  children: ReactNode;
  fallback: ReactNode;
  /** Marge avant le viewport pour précharger légèrement à l’avance (syntaxe CSS, ex. 160px). */
  rootMargin?: string;
}

/**
 * Ne monte les enfants qu’une fois le conteneur proche ou dans le viewport,
 * pour différer le chargement des chunks lourds (ex. recharts).
 */
export function LazyWhenVisible({ children, fallback, rootMargin = "160px" }: LazyWhenVisibleProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (visible) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
        }
      },
      { root: null, rootMargin, threshold: 0 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [visible, rootMargin]);

  return <div ref={ref}>{visible ? children : fallback}</div>;
}
