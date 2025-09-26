package com.mlexpress.courier.data.service

import android.app.ActivityManager
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.BatteryManager
import android.os.Build
import android.os.PowerManager
import androidx.lifecycle.DefaultLifecycleObserver
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.ProcessLifecycleOwner
import com.mlexpress.courier.data.local.preferences.CourierPreferences
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class PowerOptimizationManager @Inject constructor(
    @ApplicationContext private val context: Context,
    private val courierPreferences: CourierPreferences
) : DefaultLifecycleObserver {
    
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private val powerManager = context.getSystemService(Context.POWER_SERVICE) as PowerManager
    private val activityManager = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
    
    private val _batteryLevel = MutableStateFlow(100)
    val batteryLevel: StateFlow<Int> = _batteryLevel.asStateFlow()
    
    private val _isCharging = MutableStateFlow(false)
    val isCharging: StateFlow<Boolean> = _isCharging.asStateFlow()
    
    private val _powerSaveMode = MutableStateFlow(false)
    val powerSaveMode: StateFlow<Boolean> = _powerSaveMode.asStateFlow()
    
    private val _isAppInForeground = MutableStateFlow(true)
    val isAppInForeground: StateFlow<Boolean> = _isAppInForeground.asStateFlow()
    
    private var batteryMonitorJob: Job? = null
    
    init {
        ProcessLifecycleOwner.get().lifecycle.addObserver(this)
        startBatteryMonitoring()
    }
    
    override fun onStart(owner: LifecycleOwner) {
        super.onStart(owner)
        _isAppInForeground.value = true
        optimizeForForeground()
    }
    
    override fun onStop(owner: LifecycleOwner) {
        super.onStop(owner)
        _isAppInForeground.value = false
        optimizeForBackground()
    }
    
    private fun startBatteryMonitoring() {
        batteryMonitorJob = scope.launch {
            while (isActive) {
                updateBatteryInfo()
                updatePowerSaveMode()
                delay(30000) // Check every 30 seconds
            }
        }
    }
    
    private fun updateBatteryInfo() {
        try {
            val batteryIntent = context.registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
            
            if (batteryIntent != null) {
                val level = batteryIntent.getIntExtra(BatteryManager.EXTRA_LEVEL, -1)
                val scale = batteryIntent.getIntExtra(BatteryManager.EXTRA_SCALE, -1)
                val status = batteryIntent.getIntExtra(BatteryManager.EXTRA_STATUS, -1)
                
                if (level >= 0 && scale > 0) {
                    val batteryPercent = (level * 100 / scale)
                    _batteryLevel.value = batteryPercent
                }
                
                val isCharging = status == BatteryManager.BATTERY_STATUS_CHARGING ||
                        status == BatteryManager.BATTERY_STATUS_FULL
                _isCharging.value = isCharging
            }
        } catch (e: Exception) {
            android.util.Log.e("PowerOptimization", "Failed to update battery info", e)
        }
    }
    
    private fun updatePowerSaveMode() {
        try {
            val isPowerSaveMode = powerManager.isPowerSaveMode
            _powerSaveMode.value = isPowerSaveMode
            
            if (isPowerSaveMode) {
                applyPowerSaveOptimizations()
            }
        } catch (e: Exception) {
            android.util.Log.e("PowerOptimization", "Failed to check power save mode", e)
        }
    }
    
    private fun optimizeForForeground() {
        scope.launch {
            try {
                // Resume normal location tracking frequency
                adjustLocationTrackingFrequency(LocationTrackingMode.NORMAL)
                
                // Resume real-time sync
                startRealtimeSync()
                
                android.util.Log.d("PowerOptimization", "Optimized for foreground")
            } catch (e: Exception) {
                android.util.Log.e("PowerOptimization", "Failed to optimize for foreground", e)
            }
        }
    }
    
    private fun optimizeForBackground() {
        scope.launch {
            try {
                val batteryLevel = _batteryLevel.value
                val isCharging = _isCharging.value
                val isPowerSaveMode = _powerSaveMode.value
                
                when {
                    isPowerSaveMode || batteryLevel < 15 -> {
                        // Aggressive power saving
                        adjustLocationTrackingFrequency(LocationTrackingMode.POWER_SAVE)
                        reduceNetworkActivity()
                    }
                    batteryLevel < 30 && !isCharging -> {
                        // Moderate power saving
                        adjustLocationTrackingFrequency(LocationTrackingMode.BATTERY_SAVE)
                        optimizeNetworkActivity()
                    }
                    else -> {
                        // Normal background operation
                        adjustLocationTrackingFrequency(LocationTrackingMode.BACKGROUND)
                    }
                }
                
                android.util.Log.d("PowerOptimization", "Optimized for background - Battery: $batteryLevel%, Charging: $isCharging, PowerSave: $isPowerSaveMode")
            } catch (e: Exception) {
                android.util.Log.e("PowerOptimization", "Failed to optimize for background", e)
            }
        }
    }
    
    private fun applyPowerSaveOptimizations() {
        scope.launch {
            try {
                // Reduce location tracking frequency
                adjustLocationTrackingFrequency(LocationTrackingMode.POWER_SAVE)
                
                // Reduce network sync frequency
                reduceNetworkActivity()
                
                // Disable non-essential features
                disableNonEssentialFeatures()
                
                android.util.Log.d("PowerOptimization", "Applied power save optimizations")
            } catch (e: Exception) {
                android.util.Log.e("PowerOptimization", "Failed to apply power save optimizations", e)
            }
        }
    }
    
    private fun adjustLocationTrackingFrequency(mode: LocationTrackingMode) {
        try {
            val intent = Intent("com.mlexpress.courier.ADJUST_LOCATION_FREQUENCY").apply {
                putExtra("mode", mode.name)
                putExtra("interval", mode.intervalMs)
                putExtra("minDistance", mode.minDistanceMeters)
            }
            context.sendBroadcast(intent)
            
            android.util.Log.d("PowerOptimization", "Adjusted location tracking to $mode")
        } catch (e: Exception) {
            android.util.Log.e("PowerOptimization", "Failed to adjust location tracking", e)
        }
    }
    
    private fun startRealtimeSync() {
        try {
            val intent = Intent("com.mlexpress.RESUME_REALTIME_SYNC")
            context.sendBroadcast(intent)
        } catch (e: Exception) {
            android.util.Log.e("PowerOptimization", "Failed to start realtime sync", e)
        }
    }
    
    private fun reduceNetworkActivity() {
        try {
            val intent = Intent("com.mlexpress.REDUCE_NETWORK_ACTIVITY")
            context.sendBroadcast(intent)
        } catch (e: Exception) {
            android.util.Log.e("PowerOptimization", "Failed to reduce network activity", e)
        }
    }
    
    private fun optimizeNetworkActivity() {
        try {
            val intent = Intent("com.mlexpress.OPTIMIZE_NETWORK_ACTIVITY")
            context.sendBroadcast(intent)
        } catch (e: Exception) {
            android.util.Log.e("PowerOptimization", "Failed to optimize network activity", e)
        }
    }
    
    private fun disableNonEssentialFeatures() {
        scope.launch {
            try {
                // Temporarily disable non-essential notifications
                // Reduce animation frequency
                // Pause non-critical background tasks
                
                android.util.Log.d("PowerOptimization", "Disabled non-essential features")
            } catch (e: Exception) {
                android.util.Log.e("PowerOptimization", "Failed to disable non-essential features", e)
            }
        }
    }
    
    fun isIgnoringBatteryOptimizations(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            powerManager.isIgnoringBatteryOptimizations(context.packageName)
        } else {
            true
        }
    }
    
    fun requestIgnoreBatteryOptimizations() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !isIgnoringBatteryOptimizations()) {
                val intent = Intent().apply {
                    action = android.provider.Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS
                    data = android.net.Uri.parse("package:${context.packageName}")
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                context.startActivity(intent)
            }
        } catch (e: Exception) {
            android.util.Log.e("PowerOptimization", "Failed to request battery optimization ignore", e)
        }
    }
    
    fun getMemoryInfo(): MemoryInfo {
        val memoryInfo = ActivityManager.MemoryInfo()
        activityManager.getMemoryInfo(memoryInfo)
        
        return MemoryInfo(
            availableMemory = memoryInfo.availMem,
            totalMemory = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN) {
                memoryInfo.totalMem
            } else {
                0L
            },
            isLowMemory = memoryInfo.lowMemory,
            threshold = memoryInfo.threshold
        )
    }
    
    fun optimizeMemoryUsage() {
        try {
            // Trigger garbage collection
            System.gc()
            
            // Clear non-essential caches
            scope.launch {
                // TODO: Clear image caches, temporary data, etc.
                android.util.Log.d("PowerOptimization", "Memory optimization applied")
            }
        } catch (e: Exception) {
            android.util.Log.e("PowerOptimization", "Failed to optimize memory", e)
        }
    }
    
    fun cleanup() {
        batteryMonitorJob?.cancel()
        scope.cancel()
    }
}

enum class LocationTrackingMode(
    val intervalMs: Long,
    val minDistanceMeters: Float
) {
    NORMAL(10000L, 10f),           // 10 seconds, 10 meters
    BACKGROUND(30000L, 20f),       // 30 seconds, 20 meters  
    BATTERY_SAVE(60000L, 50f),     // 1 minute, 50 meters
    POWER_SAVE(300000L, 100f)      // 5 minutes, 100 meters
}

data class MemoryInfo(
    val availableMemory: Long,
    val totalMemory: Long,
    val isLowMemory: Boolean,
    val threshold: Long
) {
    val usedMemoryPercentage: Float
        get() = if (totalMemory > 0) {
            ((totalMemory - availableMemory).toFloat() / totalMemory.toFloat()) * 100f
        } else 0f
}
