import { useQueryClient } from '@tanstack/react-query';

interface OptimisticUpdateOptions<T> {
  queryKey: any[];
  updateFn: (oldData: T) => T;
  revertOnError?: boolean;
}

export function useOptimisticUpdate<T>() {
  const queryClient = useQueryClient();
  
  const update = async (
    options: OptimisticUpdateOptions<T>,
    mutationFn: () => Promise<any>
  ) => {
    const { queryKey, updateFn, revertOnError = true } = options;
    
    // 保存旧数据以便回滚
    const previousData = queryClient.getQueryData<T>(queryKey);
    
    // 立即更新缓存（乐观更新）
    queryClient.setQueryData<T>(queryKey, (old) => {
      if (!old) return old;
      return updateFn(old);
    });
    
    try {
      // 执行实际的变更
      const result = await mutationFn();
      
      // 如果成功，可选择性地使用服务器返回的数据更新缓存
      return result;
    } catch (error) {
      // 出错时回滚
      if (revertOnError && previousData) {
        queryClient.setQueryData(queryKey, previousData);
      }
      throw error;
    }
  };
  
  return { update };
}
