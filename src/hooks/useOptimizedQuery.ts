import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { preloadApi } from '../utils/backend';

interface OptimizedQueryOptions<T> extends UseQueryOptions<T> {
  preloadNext?: boolean;
  nextPageUrl?: string;
  headers?: any;
}

export function useOptimizedQuery<T>(options: OptimizedQueryOptions<T>) {
  const { preloadNext, nextPageUrl, headers, ...queryOptions } = options;
  const isFirstLoad = useRef(true);
  
  const query = useQuery<T>(queryOptions);
  
  // 预加载下一页
  useEffect(() => {
    if (preloadNext && nextPageUrl && query.data && !query.isFetching) {
      // 延迟预加载，让当前页面先完全渲染
      const timer = setTimeout(() => {
        preloadApi(nextPageUrl, headers);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [preloadNext, nextPageUrl, headers, query.data, query.isFetching]);
  
  // 首次加载优化
  useEffect(() => {
    if (isFirstLoad.current && query.data) {
      isFirstLoad.current = false;
      // 数据加载完成后，立即触发渲染优化
      requestIdleCallback(() => {
        // 浏览器空闲时执行低优先级任务
      });
    }
  }, [query.data]);
  
  return query;
}
