package com.mlexpress.customer.data.network

import android.content.Context
import androidx.room.*
import androidx.work.*
import com.google.gson.Gson
import com.mlexpress.customer.data.local.database.MLExpressDatabase
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.first
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import javax.inject.Singleton

/**
 * 离线请求队列管理器
 */
@Singleton
class OfflineQueueManager @Inject constructor(
    @ApplicationContext private val context: Context,
    private val database: MLExpressDatabase,
    private val networkMonitor: NetworkMonitor,
    private val gson: Gson
) {
    
    private val queueDao = database.offlineQueueDao()
    private val workManager = WorkManager.getInstance(context)
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    
    companion object {
        private const val OFFLINE_SYNC_WORK_NAME = "offline_queue_sync"
        private const val MAX_RETRY_COUNT = 3
        private const val RETRY_DELAY_MINUTES = 5L
    }
    
    init {
        // 监听网络状态变化
        scope.launch {
            networkMonitor.isOnline.collect { isOnline ->
                if (isOnline) {
                    processOfflineQueue()
                }
            }
        }
    }
    
    /**
     * 添加请求到离线队列
     */
    suspend fun enqueueRequest(
        url: String,
        method: String,
        headers: Map<String, String> = emptyMap(),
        body: String? = null,
        priority: Int = 0,
        maxRetries: Int = MAX_RETRY_COUNT
    ): String {
        val requestId = generateRequestId()
        
        val queueItem = OfflineQueueItem(
            id = requestId,
            url = url,
            method = method,
            headers = gson.toJson(headers),
            body = body,
            priority = priority,
            maxRetries = maxRetries,
            retryCount = 0,
            status = QueueItemStatus.PENDING,
            createdAt = System.currentTimeMillis(),
            updatedAt = System.currentTimeMillis()
        )
        
        queueDao.insertQueueItem(queueItem)
        
        android.util.Log.d("OfflineQueue", "Request queued: $requestId - $method $url")
        
        // 如果网络可用，立即尝试处理
        if (networkMonitor.isCurrentlyOnline()) {
            scheduleImmediateProcessing()
        }
        
        return requestId
    }
    
    /**
     * 处理离线队列
     */
    private fun processOfflineQueue() {
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()
        
        val processRequest = OneTimeWorkRequestBuilder<OfflineQueueWorker>()
            .setConstraints(constraints)
            .setBackoffCriteria(
                BackoffPolicy.EXPONENTIAL,
                RETRY_DELAY_MINUTES,
                TimeUnit.MINUTES
            )
            .build()
        
        workManager.enqueueUniqueWork(
            OFFLINE_SYNC_WORK_NAME,
            ExistingWorkPolicy.REPLACE,
            processRequest
        )
    }
    
    /**
     * 立即处理队列
     */
    private fun scheduleImmediateProcessing() {
        scope.launch {
            delay(1000) // 短暂延迟避免频繁调用
            processOfflineQueue()
        }
    }
    
    /**
     * 获取队列状态
     */
    suspend fun getQueueStatus(): OfflineQueueStatus {
        val pendingCount = queueDao.getQueueItemCountByStatus(QueueItemStatus.PENDING)
        val processingCount = queueDao.getQueueItemCountByStatus(QueueItemStatus.PROCESSING)
        val failedCount = queueDao.getQueueItemCountByStatus(QueueItemStatus.FAILED)
        val completedCount = queueDao.getQueueItemCountByStatus(QueueItemStatus.COMPLETED)
        
        return OfflineQueueStatus(
            pendingCount = pendingCount,
            processingCount = processingCount,
            failedCount = failedCount,
            completedCount = completedCount,
            totalCount = pendingCount + processingCount + failedCount + completedCount
        )
    }
    
    /**
     * 清理已完成的队列项
     */
    suspend fun cleanupCompletedItems() {
        try {
            val cutoffTime = System.currentTimeMillis() - TimeUnit.DAYS.toMillis(7) // 7天前
            val deletedCount = queueDao.deleteCompletedItemsOlderThan(cutoffTime)
            
            android.util.Log.d("OfflineQueue", "Cleaned up $deletedCount completed queue items")
        } catch (e: Exception) {
            android.util.Log.e("OfflineQueue", "Failed to cleanup queue", e)
        }
    }
    
    /**
     * 重试失败的请求
     */
    suspend fun retryFailedRequests() {
        try {
            val failedItems = queueDao.getFailedItems()
            
            failedItems.forEach { item ->
                if (item.retryCount < item.maxRetries) {
                    queueDao.updateQueueItem(
                        item.copy(
                            status = QueueItemStatus.PENDING,
                            updatedAt = System.currentTimeMillis()
                        )
                    )
                }
            }
            
            if (failedItems.isNotEmpty()) {
                processOfflineQueue()
                android.util.Log.d("OfflineQueue", "Retrying ${failedItems.size} failed requests")
            }
        } catch (e: Exception) {
            android.util.Log.e("OfflineQueue", "Failed to retry requests", e)
        }
    }
    
    /**
     * 取消请求
     */
    suspend fun cancelRequest(requestId: String): Boolean {
        return try {
            val item = queueDao.getQueueItemById(requestId)
            if (item != null && item.status == QueueItemStatus.PENDING) {
                queueDao.updateQueueItem(
                    item.copy(
                        status = QueueItemStatus.CANCELLED,
                        updatedAt = System.currentTimeMillis()
                    )
                )
                true
            } else {
                false
            }
        } catch (e: Exception) {
            android.util.Log.e("OfflineQueue", "Failed to cancel request", e)
            false
        }
    }
    
    private fun generateRequestId(): String {
        return "req_${System.currentTimeMillis()}_${(1000..9999).random()}"
    }
    
    fun cleanup() {
        scope.cancel()
    }
}

/**
 * 离线队列数据库实体
 */
@Entity(tableName = "offline_queue")
data class OfflineQueueItem(
    @PrimaryKey
    val id: String,
    val url: String,
    val method: String,
    val headers: String, // JSON格式
    val body: String? = null,
    val priority: Int = 0,
    val maxRetries: Int = 3,
    val retryCount: Int = 0,
    val status: QueueItemStatus = QueueItemStatus.PENDING,
    val errorMessage: String? = null,
    val response: String? = null,
    val createdAt: Long,
    val updatedAt: Long,
    val processedAt: Long? = null
)

/**
 * 队列项状态
 */
enum class QueueItemStatus {
    PENDING,
    PROCESSING,
    COMPLETED,
    FAILED,
    CANCELLED
}

/**
 * 队列状态统计
 */
data class OfflineQueueStatus(
    val pendingCount: Int,
    val processingCount: Int,
    val failedCount: Int,
    val completedCount: Int,
    val totalCount: Int
)

/**
 * 离线队列DAO
 */
@Dao
interface OfflineQueueDao {
    
    @Query("SELECT * FROM offline_queue WHERE status = :status ORDER BY priority DESC, createdAt ASC")
    suspend fun getQueueItemsByStatus(status: QueueItemStatus): List<OfflineQueueItem>
    
    @Query("SELECT * FROM offline_queue WHERE id = :id")
    suspend fun getQueueItemById(id: String): OfflineQueueItem?
    
    @Query("SELECT COUNT(*) FROM offline_queue WHERE status = :status")
    suspend fun getQueueItemCountByStatus(status: QueueItemStatus): Int
    
    @Query("SELECT * FROM offline_queue WHERE status = :status")
    suspend fun getFailedItems(status: QueueItemStatus = QueueItemStatus.FAILED): List<OfflineQueueItem>
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertQueueItem(item: OfflineQueueItem)
    
    @Update
    suspend fun updateQueueItem(item: OfflineQueueItem)
    
    @Delete
    suspend fun deleteQueueItem(item: OfflineQueueItem)
    
    @Query("DELETE FROM offline_queue WHERE status = :status AND updatedAt < :cutoffTime")
    suspend fun deleteCompletedItemsOlderThan(
        cutoffTime: Long,
        status: QueueItemStatus = QueueItemStatus.COMPLETED
    ): Int
    
    @Query("DELETE FROM offline_queue")
    suspend fun clearAllQueueItems()
}

/**
 * 离线队列处理Worker
 */
class OfflineQueueWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted workerParams: WorkerParameters,
    private val queueDao: OfflineQueueDao,
    private val networkManager: NetworkManager,
    private val gson: Gson
) : CoroutineWorker(context, workerParams) {
    
    override suspend fun doWork(): Result {
        return try {
            android.util.Log.d("OfflineQueueWorker", "Processing offline queue...")
            
            val pendingItems = queueDao.getQueueItemsByStatus(QueueItemStatus.PENDING)
            
            if (pendingItems.isEmpty()) {
                android.util.Log.d("OfflineQueueWorker", "No pending items in queue")
                return Result.success()
            }
            
            var successCount = 0
            var failureCount = 0
            
            for (item in pendingItems) {
                try {
                    // 标记为处理中
                    queueDao.updateQueueItem(
                        item.copy(
                            status = QueueItemStatus.PROCESSING,
                            updatedAt = System.currentTimeMillis()
                        )
                    )
                    
                    // 执行请求
                    val success = processQueueItem(item)
                    
                    if (success) {
                        // 标记为完成
                        queueDao.updateQueueItem(
                            item.copy(
                                status = QueueItemStatus.COMPLETED,
                                processedAt = System.currentTimeMillis(),
                                updatedAt = System.currentTimeMillis()
                            )
                        )
                        successCount++
                    } else {
                        // 增加重试次数
                        val newRetryCount = item.retryCount + 1
                        val newStatus = if (newRetryCount >= item.maxRetries) {
                            QueueItemStatus.FAILED
                        } else {
                            QueueItemStatus.PENDING
                        }
                        
                        queueDao.updateQueueItem(
                            item.copy(
                                status = newStatus,
                                retryCount = newRetryCount,
                                updatedAt = System.currentTimeMillis()
                            )
                        )
                        failureCount++
                    }
                    
                } catch (e: Exception) {
                    android.util.Log.e("OfflineQueueWorker", "Failed to process queue item: ${item.id}", e)
                    
                    // 更新错误信息
                    queueDao.updateQueueItem(
                        item.copy(
                            status = QueueItemStatus.FAILED,
                            errorMessage = e.message,
                            updatedAt = System.currentTimeMillis()
                        )
                    )
                    failureCount++
                }
            }
            
            android.util.Log.d("OfflineQueueWorker", "Queue processing completed: $successCount success, $failureCount failures")
            
            Result.success()
        } catch (e: Exception) {
            android.util.Log.e("OfflineQueueWorker", "Queue processing failed", e)
            Result.retry()
        }
    }
    
    private suspend fun processQueueItem(item: OfflineQueueItem): Boolean {
        return try {
            // TODO: 实际执行HTTP请求
            // 这里需要根据item的信息重新构造和执行请求
            
            android.util.Log.d("OfflineQueueWorker", "Processing: ${item.method} ${item.url}")
            
            // 模拟请求处理
            delay(1000)
            
            true // 假设成功
        } catch (e: Exception) {
            android.util.Log.e("OfflineQueueWorker", "Failed to process item: ${item.id}", e)
            false
        }
    }
    
    @dagger.assisted.AssistedFactory
    interface Factory {
        fun create(context: Context, workerParams: WorkerParameters): OfflineQueueWorker
    }
}

/**
 * 请求缓存管理器
 */
@Singleton
class RequestCacheManager @Inject constructor(
    private val context: Context,
    private val gson: Gson
) {
    
    private val cacheDir = File(context.cacheDir, "api_cache")
    private val memoryCache = mutableMapOf<String, CachedResponse>()
    
    companion object {
        private const val MAX_MEMORY_CACHE_SIZE = 100
        private const val DEFAULT_CACHE_TTL = 3600000L // 1 hour
    }
    
    init {
        if (!cacheDir.exists()) {
            cacheDir.mkdirs()
        }
    }
    
    /**
     * 缓存响应
     */
    suspend fun cacheResponse(
        key: String,
        response: String,
        ttl: Long = DEFAULT_CACHE_TTL
    ) {
        try {
            val cachedResponse = CachedResponse(
                data = response,
                timestamp = System.currentTimeMillis(),
                ttl = ttl
            )
            
            // 内存缓存
            if (memoryCache.size >= MAX_MEMORY_CACHE_SIZE) {
                evictOldestMemoryCache()
            }
            memoryCache[key] = cachedResponse
            
            // 磁盘缓存
            withContext(Dispatchers.IO) {
                val cacheFile = File(cacheDir, key.hashCode().toString())
                cacheFile.writeText(gson.toJson(cachedResponse))
            }
            
            android.util.Log.v("RequestCache", "Response cached: $key")
        } catch (e: Exception) {
            android.util.Log.e("RequestCache", "Failed to cache response: $key", e)
        }
    }
    
    /**
     * 获取缓存响应
     */
    suspend fun getCachedResponse(key: String): String? {
        return try {
            // 先检查内存缓存
            val memoryResult = memoryCache[key]
            if (memoryResult != null && !memoryResult.isExpired()) {
                android.util.Log.v("RequestCache", "Memory cache hit: $key")
                return memoryResult.data
            }
            
            // 检查磁盘缓存
            withContext(Dispatchers.IO) {
                val cacheFile = File(cacheDir, key.hashCode().toString())
                if (cacheFile.exists()) {
                    val cachedResponse = gson.fromJson(cacheFile.readText(), CachedResponse::class.java)
                    if (!cachedResponse.isExpired()) {
                        // 加载到内存缓存
                        memoryCache[key] = cachedResponse
                        android.util.Log.v("RequestCache", "Disk cache hit: $key")
                        return@withContext cachedResponse.data
                    } else {
                        // 删除过期文件
                        cacheFile.delete()
                    }
                }
                null
            }
        } catch (e: Exception) {
            android.util.Log.e("RequestCache", "Failed to get cached response: $key", e)
            null
        }
    }
    
    /**
     * 清除缓存
     */
    suspend fun clearCache() {
        try {
            memoryCache.clear()
            
            withContext(Dispatchers.IO) {
                cacheDir.listFiles()?.forEach { file ->
                    file.delete()
                }
            }
            
            android.util.Log.d("RequestCache", "Cache cleared")
        } catch (e: Exception) {
            android.util.Log.e("RequestCache", "Failed to clear cache", e)
        }
    }
    
    /**
     * 清理过期缓存
     */
    suspend fun cleanupExpiredCache() {
        try {
            // 清理内存缓存
            val expiredKeys = memoryCache.entries
                .filter { it.value.isExpired() }
                .map { it.key }
            
            expiredKeys.forEach { key ->
                memoryCache.remove(key)
            }
            
            // 清理磁盘缓存
            withContext(Dispatchers.IO) {
                cacheDir.listFiles()?.forEach { file ->
                    try {
                        val cachedResponse = gson.fromJson(file.readText(), CachedResponse::class.java)
                        if (cachedResponse.isExpired()) {
                            file.delete()
                        }
                    } catch (e: Exception) {
                        // 无法解析的文件也删除
                        file.delete()
                    }
                }
            }
            
            android.util.Log.d("RequestCache", "Expired cache cleaned up")
        } catch (e: Exception) {
            android.util.Log.e("RequestCache", "Failed to cleanup expired cache", e)
        }
    }
    
    private fun evictOldestMemoryCache() {
        val oldestEntry = memoryCache.entries.minByOrNull { it.value.timestamp }
        oldestEntry?.let { entry ->
            memoryCache.remove(entry.key)
        }
    }
    
    /**
     * 生成缓存键
     */
    fun generateCacheKey(url: String, params: Map<String, String> = emptyMap()): String {
        val paramsString = params.entries
            .sortedBy { it.key }
            .joinToString("&") { "${it.key}=${it.value}" }
        
        val fullUrl = if (paramsString.isNotEmpty()) "$url?$paramsString" else url
        return "cache_${fullUrl.hashCode()}"
    }
}

/**
 * 缓存响应数据
 */
data class CachedResponse(
    val data: String,
    val timestamp: Long,
    val ttl: Long
) {
    fun isExpired(): Boolean {
        return System.currentTimeMillis() - timestamp > ttl
    }
}
