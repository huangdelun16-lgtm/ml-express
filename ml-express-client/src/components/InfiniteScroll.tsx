import React, { useState, useEffect, useCallback, useRef } from 'react';
import LoggerService from '../services/LoggerService';
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
  renderItem: ({ item, index }: { item: T; index: number }) => React.ReactElement;
  keyExtractor: (item: T, index: number) => string;
  onLoadMore: () => Promise<void>;
  onRefresh: () => Promise<void>;
  loading: boolean;
  refreshing: boolean;
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
      LoggerService.error('加载更多失败:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, loading, onLoadMore]);
  // 刷新
  const handleRefresh = useCallback(async () => {
      await onRefresh();
      LoggerService.error('刷新失败:', error);
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
  itemHeight,
  ...props
}: InfiniteScrollProps<T> & { itemHeight: number }) {
  return (
    <InfiniteScroll
      {...props}
      renderItem={({ item, index }) => (
        <View style={{ height: itemHeight }}>
          {props.renderItem({ item, index })}
          {index === props.data.length - 1 && props.onLoadMore && (
            <View>{/* renderLoadMore logic */}</View>
          )}
        </View>
      )}
    />
  );
}

// 网格列表组件
export function GridList<T>({
  numColumns = 2,
  itemSpacing = 10,
  ...props
}: InfiniteScrollProps<T> & { itemSpacing?: number }) {
  // 渲染网格项
  const renderGridItem = ({ item, index }: { item: T; index: number }) => {
    const isLastRow = Math.floor(index / numColumns) === Math.floor((props.data.length - 1) / numColumns);
    return (
      <View style={[
        styles.gridItem,
        { marginRight: (index + 1) % numColumns === 0 ? 0 : itemSpacing },
        isLastRow && { marginBottom: 0 },
      ]}>
        {props.renderItem({ item, index })}
        {isLastRow && index === props.data.length - 1 && (
          <View style={styles.gridLoadMore}>
            {/* renderLoadMore logic */}
          </View>
        )}
      </View>
    );
  };

  return (
    <InfiniteScroll
      {...props}
      renderItem={renderGridItem}
      contentContainerStyle={[
        styles.gridContentContainer,
        props.contentContainerStyle,
      ]}
      showsVerticalScrollIndicator={false}
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
    paddingVertical: 20,
  },
  loadingMoreText: {
    marginLeft: 8,
    fontSize: 14,
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
  },
  loadMoreButtonText: {
    fontWeight: '600',
    color: 'white',
  },
  endContainer: {
  },
  endText: {
    color: '#9ca3af',
  },
  gridContentContainer: {
  },
  gridItem: {
    marginBottom: 10,
  },
  gridLoadMore: {
    width: '100%',
    marginTop: 10,
  },
});
