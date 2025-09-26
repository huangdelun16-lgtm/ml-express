package com.mlexpress.courier.data.service

import android.app.ActivityManager
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.work.*
import com.mlexpress.courier.data.local.preferences.CourierPreferences
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.first
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ServiceKeepAliveManager @Inject constructor(
    @ApplicationContext private val context: Context,
    private val courierPreferences: CourierPreferences
) {
    
    private val workManager = WorkManager.getInstance(context)
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    
    companion object {
        private const val KEEP_ALIVE_WORK_NAME = "service_keep_alive"
        private const val LOCATION_SERVICE_WORK_NAME = "location_service_keepalive"
        private const val HEARTBEAT_WORK_NAME = "heartbeat_work"
    }
    
    fun startServiceKeepAlive() {
        scope.launch {
            try {
                val isLocationSharingEnabled = courierPreferences.isLocationSharingEnabled().first()
                
                if (isLocationSharingEnabled) {
                    startLocationServiceKeepAlive()
                    startHeartbeatWork()
                    scheduleServiceHealthCheck()
                }
                
                android.util.Log.d("ServiceKeepAlive", "Service keep-alive started")
            } catch (e: Exception) {
                android.util.Log.e("ServiceKeepAlive", "Failed to start keep-alive", e)
            }
        }
    }
    
    fun stopServiceKeepAlive() {
        try {
            workManager.cancelUniqueWork(KEEP_ALIVE_WORK_NAME)
            workManager.cancelUniqueWork(LOCATION_SERVICE_WORK_NAME)
            workManager.cancelUniqueWork(HEARTBEAT_WORK_NAME)
            
            android.util.Log.d("ServiceKeepAlive", "Service keep-alive stopped")
        } catch (e: Exception) {
            android.util.Log.e("ServiceKeepAlive", "Failed to stop keep-alive", e)
        }
    }
    
    private fun startLocationServiceKeepAlive() {
        val constraints = Constraints.Builder()
            .setRequiresBatteryNotLow(false) // Allow even on low battery for critical service
            .build()
        
        val keepAliveRequest = PeriodicWorkRequestBuilder<LocationServiceKeepAliveWorker>(
            15, TimeUnit.MINUTES // Check every 15 minutes
        )
            .setConstraints(constraints)
            .setBackoffCriteria(
                BackoffPolicy.EXPONENTIAL,
                WorkRequest.MIN_BACKOFF_MILLIS,
                TimeUnit.MILLISECONDS
            )
            .build()
        
        workManager.enqueueUniquePeriodicWork(
            LOCATION_SERVICE_WORK_NAME,
            ExistingPeriodicWorkPolicy.KEEP,
            keepAliveRequest
        )
    }
    
    private fun startHeartbeatWork() {
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()
        
        val heartbeatRequest = PeriodicWorkRequestBuilder<HeartbeatWorker>(
            15, TimeUnit.MINUTES
        )
            .setConstraints(constraints)
            .build()
        
        workManager.enqueueUniquePeriodicWork(
            HEARTBEAT_WORK_NAME,
            ExistingPeriodicWorkPolicy.KEEP,
            heartbeatRequest
        )
    }
    
    private fun scheduleServiceHealthCheck() {
        scope.launch {
            while (isActive) {
                try {
                    checkAndRestartServices()
                    delay(60000) // Check every minute
                } catch (e: Exception) {
                    android.util.Log.e("ServiceKeepAlive", "Health check failed", e)
                    delay(30000) // Retry in 30 seconds on error
                }
            }
        }
    }
    
    private suspend fun checkAndRestartServices() {
        try {
            val isLocationSharingEnabled = courierPreferences.isLocationSharingEnabled().first()
            
            if (isLocationSharingEnabled) {
                // Check if location service is running
                if (!isServiceRunning(LocationTrackingService::class.java)) {
                    android.util.Log.w("ServiceKeepAlive", "Location service not running, restarting...")
                    LocationTrackingService.startTracking(context)
                }
            }
            
            // Check other critical services
            // TODO: Add other service checks as needed
            
        } catch (e: Exception) {
            android.util.Log.e("ServiceKeepAlive", "Failed to check services", e)
        }
    }
    
    private fun isServiceRunning(serviceClass: Class<*>): Boolean {
        return try {
            val activityManager = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
            
            @Suppress("DEPRECATION")
            val runningServices = activityManager.getRunningServices(Integer.MAX_VALUE)
            
            runningServices.any { serviceInfo ->
                serviceInfo.service.className == serviceClass.name
            }
        } catch (e: Exception) {
            android.util.Log.e("ServiceKeepAlive", "Failed to check if service is running", e)
            false
        }
    }
    
    fun cleanup() {
        stopServiceKeepAlive()
        scope.cancel()
    }
}

class LocationServiceKeepAliveWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted workerParams: WorkerParameters,
    private val courierPreferences: CourierPreferences
) : CoroutineWorker(context, workerParams) {
    
    override suspend fun doWork(): Result {
        return try {
            android.util.Log.d("LocationKeepAlive", "Checking location service...")
            
            val isLocationSharingEnabled = courierPreferences.isLocationSharingEnabled().first()
            
            if (isLocationSharingEnabled) {
                // Check if location service is running
                val activityManager = applicationContext.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
                
                @Suppress("DEPRECATION")
                val runningServices = activityManager.getRunningServices(Integer.MAX_VALUE)
                
                val isLocationServiceRunning = runningServices.any { serviceInfo ->
                    serviceInfo.service.className == LocationTrackingService::class.java.name
                }
                
                if (!isLocationServiceRunning) {
                    android.util.Log.w("LocationKeepAlive", "Location service stopped, restarting...")
                    LocationTrackingService.startTracking(applicationContext)
                } else {
                    android.util.Log.d("LocationKeepAlive", "Location service is running")
                }
            }
            
            Result.success()
        } catch (e: Exception) {
            android.util.Log.e("LocationKeepAlive", "Keep-alive check failed", e)
            Result.retry()
        }
    }
    
    @dagger.assisted.AssistedFactory
    interface Factory {
        fun create(context: Context, workerParams: WorkerParameters): LocationServiceKeepAliveWorker
    }
}

class HeartbeatWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted workerParams: WorkerParameters,
    private val courierPreferences: CourierPreferences
) : CoroutineWorker(context, workerParams) {
    
    override suspend fun doWork(): Result {
        return try {
            android.util.Log.d("HeartbeatWorker", "Sending heartbeat...")
            
            val accessToken = courierPreferences.getAccessToken().first()
            val courierId = courierPreferences.getCourierId().first()
            
            if (!accessToken.isNullOrEmpty() && !courierId.isNullOrEmpty()) {
                // Send heartbeat to server
                sendHeartbeat(accessToken, courierId)
            }
            
            Result.success()
        } catch (e: Exception) {
            android.util.Log.e("HeartbeatWorker", "Heartbeat failed", e)
            Result.retry()
        }
    }
    
    private suspend fun sendHeartbeat(accessToken: String, courierId: String) {
        try {
            // TODO: Implement actual heartbeat API call
            android.util.Log.d("HeartbeatWorker", "Heartbeat sent for courier: $courierId")
        } catch (e: Exception) {
            android.util.Log.e("HeartbeatWorker", "Failed to send heartbeat", e)
            throw e
        }
    }
    
    @dagger.assisted.AssistedFactory
    interface Factory {
        fun create(context: Context, workerParams: WorkerParameters): HeartbeatWorker
    }
}
