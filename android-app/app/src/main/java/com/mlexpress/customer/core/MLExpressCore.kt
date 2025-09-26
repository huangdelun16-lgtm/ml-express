package com.mlexpress.customer.core

import android.content.Context
import androidx.lifecycle.DefaultLifecycleObserver
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.ProcessLifecycleOwner
import com.mlexpress.customer.data.network.NetworkMonitor
import com.mlexpress.customer.data.service.RealtimeOrderSyncService
import com.mlexpress.customer.data.sync.DataSyncManager
import com.mlexpress.customer.data.websocket.WebSocketManager
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.first
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class MLExpressCore @Inject constructor(
    @ApplicationContext private val context: Context,
    private val webSocketManager: WebSocketManager,
    private val dataSyncManager: DataSyncManager,
    private val networkMonitor: NetworkMonitor
) : DefaultLifecycleObserver {
    
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var isInitialized = false
    
    init {
        ProcessLifecycleOwner.get().lifecycle.addObserver(this)
    }
    
    fun initialize() {
        if (isInitialized) return
        
        scope.launch {
            try {
                android.util.Log.d("MLExpressCore", "Initializing core services...")
                
                // Start network monitoring
                startNetworkMonitoring()
                
                // Start data sync
                dataSyncManager.startPeriodicSync()
                
                // Start realtime services
                startRealtimeServices()
                
                isInitialized = true
                android.util.Log.d("MLExpressCore", "Core services initialized successfully")
                
            } catch (e: Exception) {
                android.util.Log.e("MLExpressCore", "Failed to initialize core services", e)
            }
        }
    }
    
    override fun onStart(owner: LifecycleOwner) {
        super.onStart(owner)
        android.util.Log.d("MLExpressCore", "App moved to foreground")
        
        scope.launch {
            try {
                // Resume real-time connections
                webSocketManager.connect()
                
                // Trigger immediate sync
                dataSyncManager.triggerImmediateSync()
                
            } catch (e: Exception) {
                android.util.Log.e("MLExpressCore", "Failed to handle foreground transition", e)
            }
        }
    }
    
    override fun onStop(owner: LifecycleOwner) {
        super.onStop(owner)
        android.util.Log.d("MLExpressCore", "App moved to background")
        
        scope.launch {
            try {
                // Keep essential services running in background
                startBackgroundServices()
                
            } catch (e: Exception) {
                android.util.Log.e("MLExpressCore", "Failed to handle background transition", e)
            }
        }
    }
    
    private fun startNetworkMonitoring() {
        scope.launch {
            networkMonitor.isOnline.collect { isOnline ->
                android.util.Log.d("MLExpressCore", "Network status changed: $isOnline")
                
                if (isOnline) {
                    handleNetworkAvailable()
                } else {
                    handleNetworkUnavailable()
                }
            }
        }
    }
    
    private suspend fun handleNetworkAvailable() {
        try {
            // Network is back, resume services
            webSocketManager.connect()
            dataSyncManager.scheduleOfflineDataSync()
            
            android.util.Log.d("MLExpressCore", "Network available - services resumed")
        } catch (e: Exception) {
            android.util.Log.e("MLExpressCore", "Failed to handle network available", e)
        }
    }
    
    private suspend fun handleNetworkUnavailable() {
        try {
            // Network lost, prepare for offline mode
            webSocketManager.disconnect()
            
            android.util.Log.d("MLExpressCore", "Network unavailable - offline mode activated")
        } catch (e: Exception) {
            android.util.Log.e("MLExpressCore", "Failed to handle network unavailable", e)
        }
    }
    
    private fun startRealtimeServices() {
        try {
            // Start WebSocket connection
            scope.launch {
                webSocketManager.connect()
            }
            
            // Start realtime order sync service
            RealtimeOrderSyncService.startService(context)
            
            android.util.Log.d("MLExpressCore", "Realtime services started")
        } catch (e: Exception) {
            android.util.Log.e("MLExpressCore", "Failed to start realtime services", e)
        }
    }
    
    private fun startBackgroundServices() {
        try {
            // Ensure critical services continue in background
            if (!isServiceRunning(RealtimeOrderSyncService::class.java)) {
                RealtimeOrderSyncService.startService(context)
            }
            
            android.util.Log.d("MLExpressCore", "Background services started")
        } catch (e: Exception) {
            android.util.Log.e("MLExpressCore", "Failed to start background services", e)
        }
    }
    
    private fun scheduleServiceHealthCheck() {
        scope.launch {
            while (isActive) {
                try {
                    performHealthCheck()
                    delay(300000) // Check every 5 minutes
                } catch (e: Exception) {
                    android.util.Log.e("MLExpressCore", "Health check failed", e)
                    delay(60000) // Retry in 1 minute on error
                }
            }
        }
    }
    
    private suspend fun performHealthCheck() {
        try {
            // Check WebSocket connection
            if (webSocketManager.connectionState.first() != com.mlexpress.customer.data.websocket.ConnectionState.CONNECTED) {
                android.util.Log.w("MLExpressCore", "WebSocket not connected, attempting reconnect...")
                webSocketManager.connect()
            }
            
            // Check critical services
            val criticalServices = listOf(
                RealtimeOrderSyncService::class.java
            )
            
            criticalServices.forEach { serviceClass ->
                if (!isServiceRunning(serviceClass)) {
                    android.util.Log.w("MLExpressCore", "Critical service not running: ${serviceClass.simpleName}")
                    restartService(serviceClass)
                }
            }
            
            android.util.Log.v("MLExpressCore", "Health check completed")
        } catch (e: Exception) {
            android.util.Log.e("MLExpressCore", "Health check failed", e)
        }
    }
    
    private fun isServiceRunning(serviceClass: Class<*>): Boolean {
        return try {
            val activityManager = context.getSystemService(Context.ACTIVITY_SERVICE) as android.app.ActivityManager
            
            @Suppress("DEPRECATION")
            val runningServices = activityManager.getRunningServices(Integer.MAX_VALUE)
            
            runningServices.any { serviceInfo ->
                serviceInfo.service.className == serviceClass.name
            }
        } catch (e: Exception) {
            false
        }
    }
    
    private fun restartService(serviceClass: Class<*>) {
        try {
            when (serviceClass) {
                RealtimeOrderSyncService::class.java -> {
                    RealtimeOrderSyncService.startService(context)
                }
                // Add other services as needed
            }
        } catch (e: Exception) {
            android.util.Log.e("MLExpressCore", "Failed to restart service: ${serviceClass.simpleName}", e)
        }
    }
    
    fun shutdown() {
        try {
            android.util.Log.d("MLExpressCore", "Shutting down core services...")
            
            // Stop all services
            webSocketManager.cleanup()
            dataSyncManager.stopAllSync()
            RealtimeOrderSyncService.stopService(context)
            
            // Cancel scope
            scope.cancel()
            
            isInitialized = false
            
            android.util.Log.d("MLExpressCore", "Core services shutdown completed")
        } catch (e: Exception) {
            android.util.Log.e("MLExpressCore", "Failed to shutdown core services", e)
        }
    }
}

// Application lifecycle integration
class CoreLifecycleIntegration @Inject constructor(
    private val mlExpressCore: MLExpressCore
) {
    
    fun initializeOnAppStart() {
        mlExpressCore.initialize()
    }
    
    fun cleanupOnAppDestroy() {
        mlExpressCore.shutdown()
    }
}
