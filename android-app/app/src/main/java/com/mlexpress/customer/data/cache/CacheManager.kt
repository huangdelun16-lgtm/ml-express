package com.mlexpress.customer.data.cache

import android.content.Context
import com.mlexpress.customer.data.local.dao.OrderDao
import com.mlexpress.customer.data.local.dao.UserDao
import com.mlexpress.customer.data.model.Order
import com.mlexpress.customer.data.model.User
import com.mlexpress.customer.data.network.NetworkMonitor
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.first
import java.io.File
import java.util.concurrent.ConcurrentHashMap
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class CacheManager @Inject constructor(
    @ApplicationContext private val context: Context,
    private val orderDao: OrderDao,
    private val userDao: UserDao,
    private val networkMonitor: NetworkMonitor
) {
    
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private val memoryCache = ConcurrentHashMap<String, CacheEntry<Any>>()
    private val diskCacheDir = File(context.cacheDir, "ml_express_cache")
    
    companion object {
        private const val MEMORY_CACHE_SIZE = 50 // Maximum items in memory cache
        private const val DISK_CACHE_SIZE = 100 * 1024 * 1024L // 100MB disk cache
        private const val DEFAULT_CACHE_TTL = 3600000L // 1 hour
        private const val OFFLINE_CACHE_TTL = 86400000L // 24 hours for offline data
    }
    
    init {
        if (!diskCacheDir.exists()) {
            diskCacheDir.mkdirs()
        }
        
        // Start cache cleanup job
        startCacheCleanup()
    }
    
    // Memory Cache Operations
    fun <T> putMemoryCache(key: String, value: T, ttl: Long = DEFAULT_CACHE_TTL) {
        try {
            if (memoryCache.size >= MEMORY_CACHE_SIZE) {
                evictOldestMemoryCacheEntry()
            }
            
            val entry = CacheEntry(
                data = value as Any,
                timestamp = System.currentTimeMillis(),
                ttl = ttl
            )
            
            memoryCache[key] = entry
            android.util.Log.v("CacheManager", "Cached in memory: $key")
        } catch (e: Exception) {
            android.util.Log.e("CacheManager", "Failed to cache in memory: $key", e)
        }
    }
    
    @Suppress("UNCHECKED_CAST")
    fun <T> getMemoryCache(key: String): T? {
        return try {
            val entry = memoryCache[key]
            if (entry != null && !entry.isExpired()) {
                android.util.Log.v("CacheManager", "Memory cache hit: $key")
                entry.data as T
            } else {
                if (entry != null) {
                    memoryCache.remove(key)
                    android.util.Log.v("CacheManager", "Memory cache expired: $key")
                }
                null
            }
        } catch (e: Exception) {
            android.util.Log.e("CacheManager", "Failed to get from memory cache: $key", e)
            null
        }
    }
    
    fun removeMemoryCache(key: String) {
        memoryCache.remove(key)
    }
    
    // Database Cache Operations (for offline support)
    suspend fun cacheOrder(order: Order) {
        try {
            orderDao.insertOrder(order)
            android.util.Log.v("CacheManager", "Order cached: ${order.orderNumber}")
        } catch (e: Exception) {
            android.util.Log.e("CacheManager", "Failed to cache order", e)
        }
    }
    
    suspend fun getCachedOrders(userId: String): List<Order> {
        return try {
            orderDao.getOrdersByUser(userId).first()
        } catch (e: Exception) {
            android.util.Log.e("CacheManager", "Failed to get cached orders", e)
            emptyList()
        }
    }
    
    suspend fun cacheUser(user: User) {
        try {
            userDao.insertUser(user)
            android.util.Log.v("CacheManager", "User cached: ${user.phoneNumber}")
        } catch (e: Exception) {
            android.util.Log.e("CacheManager", "Failed to cache user", e)
        }
    }
    
    suspend fun getCachedUser(userId: String): User? {
        return try {
            userDao.getUserById(userId)
        } catch (e: Exception) {
            android.util.Log.e("CacheManager", "Failed to get cached user", e)
            null
        }
    }
    
    // Smart cache strategy based on network status
    suspend fun <T> getWithCacheStrategy(
        key: String,
        networkCall: suspend () -> T,
        cacheCall: suspend () -> T?
    ): T? {
        return try {
            val isOnline = networkMonitor.isOnline.first()
            
            if (isOnline) {
                // Try network first, fallback to cache
                try {
                    val networkResult = networkCall()
                    // Cache the result
                    putMemoryCache(key, networkResult)
                    networkResult
                } catch (networkError: Exception) {
                    android.util.Log.w("CacheManager", "Network call failed, using cache", networkError)
                    getMemoryCache<T>(key) ?: cacheCall()
                }
            } else {
                // Offline mode - use cache only
                android.util.Log.d("CacheManager", "Offline mode - using cache for: $key")
                getMemoryCache<T>(key) ?: cacheCall()
            }
        } catch (e: Exception) {
            android.util.Log.e("CacheManager", "Cache strategy failed for: $key", e)
            null
        }
    }
    
    // Preload critical data
    suspend fun preloadCriticalData(userId: String) {
        scope.launch {
            try {
                android.util.Log.d("CacheManager", "Preloading critical data for user: $userId")
                
                // Preload recent orders
                val recentOrders = orderDao.getRecentOrders(userId, 10)
                recentOrders.forEach { order ->
                    putMemoryCache("order_${order.id}", order)
                }
                
                // Preload user data
                val user = userDao.getUserById(userId)
                if (user != null) {
                    putMemoryCache("user_$userId", user)
                }
                
                android.util.Log.d("CacheManager", "Critical data preloaded: ${recentOrders.size} orders")
            } catch (e: Exception) {
                android.util.Log.e("CacheManager", "Failed to preload critical data", e)
            }
        }
    }
    
    // Cache invalidation
    fun invalidateOrderCache(orderId: String) {
        removeMemoryCache("order_$orderId")
        removeMemoryCache("order_details_$orderId")
    }
    
    fun invalidateUserCache(userId: String) {
        removeMemoryCache("user_$userId")
        removeMemoryCache("user_profile_$userId")
    }
    
    fun invalidateAllCache() {
        memoryCache.clear()
        android.util.Log.d("CacheManager", "All memory cache invalidated")
    }
    
    // Cache cleanup
    private fun startCacheCleanup() {
        scope.launch {
            while (isActive) {
                try {
                    cleanupExpiredMemoryCache()
                    cleanupDiskCache()
                    delay(600000) // Cleanup every 10 minutes
                } catch (e: Exception) {
                    android.util.Log.e("CacheManager", "Cache cleanup failed", e)
                    delay(60000) // Retry in 1 minute on error
                }
            }
        }
    }
    
    private fun cleanupExpiredMemoryCache() {
        try {
            val expiredKeys = memoryCache.entries
                .filter { it.value.isExpired() }
                .map { it.key }
            
            expiredKeys.forEach { key ->
                memoryCache.remove(key)
            }
            
            if (expiredKeys.isNotEmpty()) {
                android.util.Log.d("CacheManager", "Cleaned up ${expiredKeys.size} expired memory cache entries")
            }
        } catch (e: Exception) {
            android.util.Log.e("CacheManager", "Failed to cleanup expired memory cache", e)
        }
    }
    
    private fun cleanupDiskCache() {
        try {
            if (diskCacheDir.exists()) {
                val totalSize = diskCacheDir.walkTopDown()
                    .filter { it.isFile }
                    .map { it.length() }
                    .sum()
                
                if (totalSize > DISK_CACHE_SIZE) {
                    // Delete oldest files until under size limit
                    val files = diskCacheDir.walkTopDown()
                        .filter { it.isFile }
                        .sortedBy { it.lastModified() }
                    
                    var deletedSize = 0L
                    for (file in files) {
                        if (totalSize - deletedSize <= DISK_CACHE_SIZE) break
                        
                        deletedSize += file.length()
                        file.delete()
                    }
                    
                    android.util.Log.d("CacheManager", "Cleaned up ${deletedSize / 1024}KB of disk cache")
                }
            }
        } catch (e: Exception) {
            android.util.Log.e("CacheManager", "Failed to cleanup disk cache", e)
        }
    }
    
    private fun evictOldestMemoryCacheEntry() {
        try {
            val oldestEntry = memoryCache.entries
                .minByOrNull { it.value.timestamp }
            
            oldestEntry?.let { entry ->
                memoryCache.remove(entry.key)
                android.util.Log.v("CacheManager", "Evicted oldest cache entry: ${entry.key}")
            }
        } catch (e: Exception) {
            android.util.Log.e("CacheManager", "Failed to evict oldest cache entry", e)
        }
    }
    
    // Cache statistics
    fun getCacheStats(): CacheStats {
        return CacheStats(
            memoryCacheSize = memoryCache.size,
            memoryCacheHitRate = 0.0f, // TODO: Implement hit rate tracking
            diskCacheSize = getDiskCacheSize(),
            totalCacheSize = memoryCache.size * 1024L + getDiskCacheSize() // Rough estimate
        )
    }
    
    private fun getDiskCacheSize(): Long {
        return try {
            if (diskCacheDir.exists()) {
                diskCacheDir.walkTopDown()
                    .filter { it.isFile }
                    .map { it.length() }
                    .sum()
            } else {
                0L
            }
        } catch (e: Exception) {
            0L
        }
    }
    
    fun cleanup() {
        scope.cancel()
        invalidateAllCache()
    }
}

data class CacheEntry<T>(
    val data: T,
    val timestamp: Long,
    val ttl: Long
) {
    fun isExpired(): Boolean {
        return System.currentTimeMillis() - timestamp > ttl
    }
}

data class CacheStats(
    val memoryCacheSize: Int,
    val memoryCacheHitRate: Float,
    val diskCacheSize: Long,
    val totalCacheSize: Long
)
