import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

// 分页数据接口
interface PaginatedData<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

// 无限滚动组件属性
interface InfiniteScrollProps<T> {
  data: T[];
  renderItem: ({ item, index }: { item: T; index: number }) => React.ReactElement;
  keyExtractor: (item: T, index: number) => string;
  onLoadMore: () => Promise<void>;
  onRefresh: () => Promise<void>;
  loading: boolean;
  refreshing: boolean;
  hasMore: boolean;
  emptyComponent?: React.ReactElement;
  loadingComponent?: React.ReactElement;
  endComponent?: React.ReactElement;
  style?: any;
  contentContainerStyle?: any;
  showsVerticalScrollIndicator?: boolean;
  showsHorizontalScrollIndicator?: boolean;
  horizontal?: boolean;
  numColumns?: number;
}

// 无限滚动组件
export function InfiniteScroll<T>({
  data,
  renderItem,
  keyExtractor,
  onLoadMore,
  onRefresh,
  loading,
  refreshing,
  hasMore,
  emptyComponent,
  loadingComponent,
  endComponent,
  style,
  contentContainerStyle,
  showsVerticalScrollIndicator = false,
  showsHorizontalScrollIndicator = false,
  horizontal = false,
  numColumns,
}: InfiniteScrollProps<T>) {
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // 加载更多
  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || loading) return;

    setIsLoadingMore(true);
    try {
      await onLoadMore();
    } catch (error) {
      console.error('加载更多失败:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, loading, onLoadMore]);

  // 刷新
  const handleRefresh = useCallback(async () => {
    try {
      await onRefresh();
    } catch (error) {
      console.error('刷新失败:', error);
    }
  }, [onRefresh]);

  // 渲染加载更多指示器
  const renderLoadMore = () => {
    if (!hasMore) {
      return endComponent || (
        <View style={styles.endContainer}>
          <Text style={styles.endText}>没有更多数据了</Text>
        </View>
      );
    }

    if (isLoadingMore) {
      return loadingComponent || (
        <View style={styles.loadingMoreContainer}>
          <ActivityIndicator size="small" color="#2E86AB" />
          <Text style={styles.loadingMoreText}>加载中...</Text>
        </View>
      );
    }

    return (
      <TouchableOpacity
        style={styles.loadMoreButton}
        onPress={handleLoadMore}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={['#2E86AB', '#4CA1CF']}
          style={styles.loadMoreButtonGradient}
        >
          <Text style={styles.loadMoreButtonText}>加载更多</Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  // 渲染空状态
  const renderEmpty = () => {
    if (loading) {
      return loadingComponent || (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#2E86AB" />
          <Text style={styles.emptyText}>加载中...</Text>
        </View>
      );
    }

    return emptyComponent || (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>📭</Text>
        <Text style={styles.emptyText}>暂无数据</Text>
      </View>
    );
  };

  // 渲染列表项
  const renderItemWithSeparator = ({ item, index }: { item: T; index: number }) => {
    const isLastItem = index === data.length - 1;
    
    return (
      <View>
        {renderItem({ item, index })}
        {isLastItem && renderLoadMore()}
      </View>
    );
  };

  return (
    <FlatList
      ref={flatListRef}
      data={data}
      renderItem={renderItemWithSeparator}
      keyExtractor={keyExtractor}
      style={style}
      contentContainerStyle={[
        styles.contentContainer,
        contentContainerStyle,
        data.length === 0 && styles.emptyContentContainer,
      ]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          title="下拉刷新"
          tintColor="#2E86AB"
          colors={['#2E86AB']}
        />
      }
      showsVerticalScrollIndicator={showsVerticalScrollIndicator}
      showsHorizontalScrollIndicator={showsHorizontalScrollIndicator}
      horizontal={horizontal}
      numColumns={numColumns}
      ListEmptyComponent={renderEmpty}
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.1}
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      updateCellsBatchingPeriod={50}
      initialNumToRender={10}
      windowSize={10}
    />
  );
}

// 虚拟化列表组件（用于大量数据）
export function VirtualizedList<T>({
  data,
  renderItem,
  keyExtractor,
  onLoadMore,
  onRefresh,
  loading,
  refreshing,
  hasMore,
  emptyComponent,
  loadingComponent,
  endComponent,
  style,
  contentContainerStyle,
  itemHeight,
  showsVerticalScrollIndicator = false,
}: InfiniteScrollProps<T> & { itemHeight: number }) {
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // 加载更多
  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || loading) return;

    setIsLoadingMore(true);
    try {
      await onLoadMore();
    } catch (error) {
      console.error('加载更多失败:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, loading, onLoadMore]);

  // 刷新
  const handleRefresh = useCallback(async () => {
    try {
      await onRefresh();
    } catch (error) {
      console.error('刷新失败:', error);
    }
  }, [onRefresh]);

  // 渲染加载更多指示器
  const renderLoadMore = () => {
    if (!hasMore) {
      return endComponent || (
        <View style={styles.endContainer}>
          <Text style={styles.endText}>没有更多数据了</Text>
        </View>
      );
    }

    if (isLoadingMore) {
      return loadingComponent || (
        <View style={styles.loadingMoreContainer}>
          <ActivityIndicator size="small" color="#2E86AB" />
          <Text style={styles.loadingMoreText}>加载中...</Text>
        </View>
      );
    }

    return (
      <TouchableOpacity
        style={styles.loadMoreButton}
        onPress={handleLoadMore}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={['#2E86AB', '#4CA1CF']}
          style={styles.loadMoreButtonGradient}
        >
          <Text style={styles.loadMoreButtonText}>加载更多</Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  // 渲染空状态
  const renderEmpty = () => {
    if (loading) {
      return loadingComponent || (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#2E86AB" />
          <Text style={styles.emptyText}>加载中...</Text>
        </View>
      );
    }

    return emptyComponent || (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>📭</Text>
        <Text style={styles.emptyText}>暂无数据</Text>
      </View>
    );
  };

  return (
    <FlatList
      data={data}
      renderItem={({ item, index }) => (
        <View style={{ height: itemHeight }}>
          {renderItem({ item, index })}
          {index === data.length - 1 && renderLoadMore()}
        </View>
      )}
      keyExtractor={keyExtractor}
      style={style}
      contentContainerStyle={[
        styles.contentContainer,
        contentContainerStyle,
        data.length === 0 && styles.emptyContentContainer,
      ]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          title="下拉刷新"
          tintColor="#2E86AB"
          colors={['#2E86AB']}
        />
      }
      showsVerticalScrollIndicator={showsVerticalScrollIndicator}
      ListEmptyComponent={renderEmpty}
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.1}
      removeClippedSubviews={true}
      maxToRenderPerBatch={5}
      updateCellsBatchingPeriod={100}
      initialNumToRender={5}
      windowSize={5}
      getItemLayout={(data, index) => ({
        length: itemHeight,
        offset: itemHeight * index,
        index,
      })}
    />
  );
}

// 网格列表组件
export function GridList<T>({
  data,
  renderItem,
  keyExtractor,
  onLoadMore,
  onRefresh,
  loading,
  refreshing,
  hasMore,
  emptyComponent,
  loadingComponent,
  endComponent,
  style,
  contentContainerStyle,
  numColumns = 2,
  itemSpacing = 10,
}: InfiniteScrollProps<T> & { itemSpacing?: number }) {
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // 加载更多
  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || loading) return;

    setIsLoadingMore(true);
    try {
      await onLoadMore();
    } catch (error) {
      console.error('加载更多失败:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, loading, onLoadMore]);

  // 刷新
  const handleRefresh = useCallback(async () => {
    try {
      await onRefresh();
    } catch (error) {
      console.error('刷新失败:', error);
    }
  }, [onRefresh]);

  // 渲染网格项
  const renderGridItem = ({ item, index }: { item: T; index: number }) => {
    const isLastRow = Math.floor(index / numColumns) === Math.floor((data.length - 1) / numColumns);
    const isLastItem = index === data.length - 1;
    
    return (
      <View style={[
        styles.gridItem,
        { marginRight: (index + 1) % numColumns === 0 ? 0 : itemSpacing },
        isLastRow && { marginBottom: 0 },
      ]}>
        {renderItem({ item, index })}
        {isLastItem && (
          <View style={styles.gridLoadMore}>
            {renderLoadMore()}
          </View>
        )}
      </View>
    );
  };

  // 渲染加载更多指示器
  const renderLoadMore = () => {
    if (!hasMore) {
      return endComponent || (
        <View style={styles.endContainer}>
          <Text style={styles.endText}>没有更多数据了</Text>
        </View>
      );
    }

    if (isLoadingMore) {
      return loadingComponent || (
        <View style={styles.loadingMoreContainer}>
          <ActivityIndicator size="small" color="#2E86AB" />
          <Text style={styles.loadingMoreText}>加载中...</Text>
        </View>
      );
    }

    return (
      <TouchableOpacity
        style={styles.loadMoreButton}
        onPress={handleLoadMore}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={['#2E86AB', '#4CA1CF']}
          style={styles.loadMoreButtonGradient}
        >
          <Text style={styles.loadMoreButtonText}>加载更多</Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  // 渲染空状态
  const renderEmpty = () => {
    if (loading) {
      return loadingComponent || (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#2E86AB" />
          <Text style={styles.emptyText}>加载中...</Text>
        </View>
      );
    }

    return emptyComponent || (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>📭</Text>
        <Text style={styles.emptyText}>暂无数据</Text>
      </View>
    );
  };

  return (
    <FlatList
      data={data}
      renderItem={renderGridItem}
      keyExtractor={keyExtractor}
      numColumns={numColumns}
      style={style}
      contentContainerStyle={[
        styles.gridContentContainer,
        contentContainerStyle,
        data.length === 0 && styles.emptyContentContainer,
      ]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          title="下拉刷新"
          tintColor="#2E86AB"
          colors={['#2E86AB']}
        />
      }
      showsVerticalScrollIndicator={false}
      ListEmptyComponent={renderEmpty}
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.1}
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      updateCellsBatchingPeriod={50}
      initialNumToRender={10}
      windowSize={10}
    />
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    paddingHorizontal: 20,
  },
  emptyContentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
  },
  loadingMoreContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingMoreText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6b7280',
  },
  loadMoreButton: {
    marginHorizontal: 20,
    marginVertical: 20,
    borderRadius: 8,
    overflow: 'hidden',
  },
  loadMoreButtonGradient: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  loadMoreButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  endContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  endText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  gridContentContainer: {
    paddingHorizontal: 20,
  },
  gridItem: {
    flex: 1,
    marginBottom: 10,
  },
  gridLoadMore: {
    width: '100%',
    marginTop: 10,
  },
});
