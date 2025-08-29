import { useEffect, useCallback, useRef } from 'react';

interface UseInfiniteScrollOptions {
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
  rootMargin?: string;
  threshold?: number;
}

export function useInfiniteScroll({
  hasMore,
  loading,
  onLoadMore,
  rootMargin = '100px',
  threshold = 0.1
}: UseInfiniteScrollOptions) {
  const loadingRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const observe = useCallback(() => {
    if (observerRef.current) observerRef.current.disconnect();
    
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !loading) {
          onLoadMore();
        }
      },
      {
        rootMargin,
        threshold
      }
    );

    if (loadingRef.current) {
      observerRef.current.observe(loadingRef.current);
    }
  }, [hasMore, loading, onLoadMore, rootMargin, threshold]);

  useEffect(() => {
    observe();
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [observe]);

  return { loadingRef };
}