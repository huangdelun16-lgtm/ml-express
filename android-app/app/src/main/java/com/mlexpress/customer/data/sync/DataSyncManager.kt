package com.mlexpress.customer.data.sync

import android.content.Context
import androidx.work.*
import com.mlexpress.customer.data.local.dao.OrderDao
import com.mlexpress.customer.data.local.preferences.UserPreferences
import com.mlexpress.customer.data.remote.api.OrderApi
import com.mlexpress.customer.data.remote.dto.NetworkResult
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.first
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class DataSyncManager @Inject constructor(
    @ApplicationContext private val context: Context
) {
    
    companion object {
        private const val SYNC_WORK_NAME = "data_sync_work"
        private const val PERIODIC_SYNC_WORK_NAME = "periodic_data_sync"
        private const val OFFLINE_SYNC_WORK_NAME = "offline_data_sync"
    }
    
    private val workManager = WorkManager.getInstance(context)
    
    fun startPeriodicSync() {
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .setRequiresBatteryNotLow(true)
            .build()
        
        val periodicSyncRequest = PeriodicWorkRequestBuilder<DataSyncWorker>(
            15, TimeUnit.MINUTES // Sync every 15 minutes
        )
            .setConstraints(constraints)
            .setBackoffCriteria(
                BackoffPolicy.EXPONENTIAL,
                WorkRequest.MIN_BACKOFF_MILLIS,
                TimeUnit.MILLISECONDS
            )
            .build()
        
        workManager.enqueueUniquePeriodicWork(
            PERIODIC_SYNC_WORK_NAME,
            ExistingPeriodicWorkPolicy.KEEP,
            periodicSyncRequest
        )
    }
    
    fun triggerImmediateSync() {
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()
        
        val immediateSyncRequest = OneTimeWorkRequestBuilder<DataSyncWorker>()
            .setConstraints(constraints)
            .setExpedited(OutOfQuotaPolicy.RUN_AS_NON_EXPEDITED_WORK_REQUEST)
            .build()
        
        workManager.enqueueUniqueWork(
            SYNC_WORK_NAME,
            ExistingWorkPolicy.REPLACE,
            immediateSyncRequest
        )
    }
    
    fun scheduleOfflineDataSync() {
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()
        
        val offlineSyncRequest = OneTimeWorkRequestBuilder<OfflineDataSyncWorker>()
            .setConstraints(constraints)
            .setInitialDelay(5, TimeUnit.SECONDS)
            .build()
        
        workManager.enqueueUniqueWork(
            OFFLINE_SYNC_WORK_NAME,
            ExistingWorkPolicy.REPLACE,
            offlineSyncRequest
        )
    }
    
    fun stopPeriodicSync() {
        workManager.cancelUniqueWork(PERIODIC_SYNC_WORK_NAME)
    }
    
    fun stopAllSync() {
        workManager.cancelUniqueWork(PERIODIC_SYNC_WORK_NAME)
        workManager.cancelUniqueWork(SYNC_WORK_NAME)
        workManager.cancelUniqueWork(OFFLINE_SYNC_WORK_NAME)
    }
}

class DataSyncWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted workerParams: WorkerParameters,
    private val orderApi: OrderApi,
    private val orderDao: OrderDao,
    private val userPreferences: UserPreferences
) : CoroutineWorker(context, workerParams) {
    
    override suspend fun doWork(): Result {
        return try {
            android.util.Log.d("DataSyncWorker", "Starting data sync...")
            
            val accessToken = userPreferences.getAccessToken().first()
            val userId = userPreferences.getUserId().first()
            
            if (accessToken.isNullOrEmpty() || userId.isNullOrEmpty()) {
                android.util.Log.w("DataSyncWorker", "No auth credentials, skipping sync")
                return Result.success()
            }
            
            // Sync orders from server
            val result = syncOrdersFromServer(accessToken, userId)
            
            when (result) {
                is NetworkResult.Success -> {
                    android.util.Log.d("DataSyncWorker", "Data sync completed successfully")
                    Result.success()
                }
                is NetworkResult.Error -> {
                    android.util.Log.e("DataSyncWorker", "Data sync failed: ${result.message}")
                    if (runAttemptCount < 3) {
                        Result.retry()
                    } else {
                        Result.failure()
                    }
                }
                is NetworkResult.Loading -> {
                    Result.retry()
                }
            }
        } catch (e: Exception) {
            android.util.Log.e("DataSyncWorker", "Data sync exception", e)
            if (runAttemptCount < 3) {
                Result.retry()
            } else {
                Result.failure()
            }
        }
    }
    
    private suspend fun syncOrdersFromServer(accessToken: String, userId: String): NetworkResult<Unit> {
        return try {
            // Get last sync timestamp
            val lastSyncTime = getLastSyncTimestamp()
            
            // Fetch orders from server
            val response = orderApi.getOrders("Bearer $accessToken", page = 1, limit = 100)
            
            if (response.isSuccessful && response.body()?.success == true) {
                response.body()?.data?.let { paginatedResponse ->
                    val orders = paginatedResponse.items.map { orderDto ->
                        orderDto.toOrder(userId)
                    }
                    
                    // Update local database
                    orders.forEach { order ->
                        orderDao.insertOrder(order)
                    }
                    
                    // Update last sync timestamp
                    saveLastSyncTimestamp(System.currentTimeMillis())
                    
                    android.util.Log.d("DataSyncWorker", "Synced ${orders.size} orders")
                    NetworkResult.Success(Unit)
                } ?: NetworkResult.Error("Empty response data")
            } else {
                val errorMessage = response.body()?.error?.message ?: "Sync failed"
                NetworkResult.Error(errorMessage, response.body()?.error?.code)
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Network error", ApiErrorCodes.NETWORK_ERROR)
        }
    }
    
    private suspend fun getLastSyncTimestamp(): Long {
        // TODO: Get from preferences
        return 0L
    }
    
    private suspend fun saveLastSyncTimestamp(timestamp: Long) {
        // TODO: Save to preferences
    }
    
    @dagger.assisted.AssistedFactory
    interface Factory {
        fun create(context: Context, workerParams: WorkerParameters): DataSyncWorker
    }
}

class OfflineDataSyncWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted workerParams: WorkerParameters,
    private val orderDao: OrderDao,
    private val userPreferences: UserPreferences
) : CoroutineWorker(context, workerParams) {
    
    override suspend fun doWork(): Result {
        return try {
            android.util.Log.d("OfflineDataSyncWorker", "Starting offline data sync...")
            
            // Handle offline data that needs to be synced
            syncOfflineData()
            
            android.util.Log.d("OfflineDataSyncWorker", "Offline data sync completed")
            Result.success()
        } catch (e: Exception) {
            android.util.Log.e("OfflineDataSyncWorker", "Offline sync failed", e)
            if (runAttemptCount < 3) {
                Result.retry()
            } else {
                Result.failure()
            }
        }
    }
    
    private suspend fun syncOfflineData() {
        try {
            // TODO: Implement offline data sync logic
            // - Upload pending order updates
            // - Upload cached user actions
            // - Resolve data conflicts
            
            android.util.Log.d("OfflineDataSyncWorker", "Offline data processed")
        } catch (e: Exception) {
            android.util.Log.e("OfflineDataSyncWorker", "Failed to sync offline data", e)
            throw e
        }
    }
    
    @dagger.assisted.AssistedFactory
    interface Factory {
        fun create(context: Context, workerParams: WorkerParameters): OfflineDataSyncWorker
    }
}

// Data conflict resolution
class ConflictResolver {
    
    fun resolveOrderConflict(
        localOrder: com.mlexpress.customer.data.model.Order,
        serverOrder: com.mlexpress.customer.data.model.Order
    ): com.mlexpress.customer.data.model.Order {
        // Server data takes precedence for most fields
        return serverOrder.copy(
            // Keep local user-specific data if newer
            rating = if (localOrder.rating != null && 
                         (serverOrder.rating == null || localOrder.updatedAt > serverOrder.updatedAt)) {
                localOrder.rating
            } else {
                serverOrder.rating
            },
            feedback = if (localOrder.feedback != null && 
                          (serverOrder.feedback == null || localOrder.updatedAt > serverOrder.updatedAt)) {
                localOrder.feedback
            } else {
                serverOrder.feedback
            }
        )
    }
    
    fun shouldUploadLocalChanges(
        localTimestamp: Long,
        serverTimestamp: Long,
        conflictThreshold: Long = 5000L // 5 seconds
    ): Boolean {
        return Math.abs(localTimestamp - serverTimestamp) <= conflictThreshold
    }
}
