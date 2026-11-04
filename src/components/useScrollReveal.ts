'use client';

import { useEffect } from 'react';

/** Marks each `.scroll-in` element once it scrolls into view. The motion itself lives in globals.css. */
export function useScrollReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          (entry.target as HTMLElement).dataset.seen = 'true';
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
    );
    const watch = () => document.querySelectorAll('.scroll-in:not([data-seen])').forEach((el) => observer.observe(el));
    watch();
    // Challenge cards load after the first render, and more appear with "show all".
    const added = new MutationObserver(watch);
    added.observe(document.body, { childList: true, subtree: true });
    return () => {
      added.disconnect();
      observer.disconnect();
    };
  }, []);
}
