package com.mlexpress.courier.data.service

import android.app.Service
import android.content.Intent
import android.location.Location
import android.os.IBinder
import android.os.Looper
import androidx.core.app.NotificationCompat
import com.google.android.gms.location.*
import com.mlexpress.courier.R
import com.mlexpress.courier.data.local.preferences.CourierPreferences
import com.mlexpress.courier.data.repository.CourierRepository
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.first
import javax.inject.Inject

@AndroidEntryPoint
class LocationTrackingService : Service() {
    
    @Inject
    lateinit var courierRepository: CourierRepository
    
    @Inject
    lateinit var courierPreferences: CourierPreferences
    
    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private lateinit var locationCallback: LocationCallback
    private val serviceScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    
    private var isTracking = false
    private var lastLocationTime = 0L
    private var lastUploadTime = 0L
    
    companion object {
        private const val NOTIFICATION_ID = 2001
        private const val LOCATION_UPDATE_INTERVAL = 10000L // 10 seconds
        private const val FASTEST_UPDATE_INTERVAL = 5000L // 5 seconds
        private const val UPLOAD_INTERVAL = 30000L // 30 seconds
        private const val MIN_DISTANCE_FOR_UPDATE = 10f // 10 meters
        
        fun startTracking(context: android.content.Context) {
            val intent = Intent(context, LocationTrackingService::class.java).apply {
                action = "START_TRACKING"
            }
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }
        
        fun stopTracking(context: android.content.Context) {
            val intent = Intent(context, LocationTrackingService::class.java).apply {
                action = "STOP_TRACKING"
            }
            context.stopService(intent)
        }
    }
    
    override fun onCreate() {
        super.onCreate()
        
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
        
        locationCallback = object : LocationCallback() {
            override fun onLocationResult(locationResult: LocationResult) {
                super.onLocationResult(locationResult)
                
                locationResult.lastLocation?.let { location ->
                    handleLocationUpdate(location)
                }
            }
            
            override fun onLocationAvailability(locationAvailability: LocationAvailability) {
                super.onLocationAvailability(locationAvailability)
                
                if (!locationAvailability.isLocationAvailable) {
                    android.util.Log.w("LocationTracking", "Location not available")
                }
            }
        }
    }
    
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            "START_TRACKING" -> startLocationTracking()
            "STOP_TRACKING" -> stopLocationTracking()
            else -> startLocationTracking()
        }
        
        return START_STICKY
    }
    
    override fun onDestroy() {
        super.onDestroy()
        stopLocationTracking()
        serviceScope.cancel()
    }
    
    override fun onBind(intent: Intent?): IBinder? = null
    
    private fun startLocationTracking() {
        if (isTracking) return
        
        serviceScope.launch {
            try {
                val isLocationSharingEnabled = courierPreferences.isLocationSharingEnabled().first()
                if (!isLocationSharingEnabled) {
                    android.util.Log.d("LocationTracking", "Location sharing disabled")
                    stopSelf()
                    return@launch
                }
                
                createForegroundNotification()
                requestLocationUpdates()
                isTracking = true
                
                android.util.Log.d("LocationTracking", "Location tracking started")
            } catch (e: Exception) {
                android.util.Log.e("LocationTracking", "Failed to start tracking", e)
            }
        }
    }
    
    private fun stopLocationTracking() {
        if (!isTracking) return
        
        try {
            fusedLocationClient.removeLocationUpdates(locationCallback)
            isTracking = false
            
            android.util.Log.d("LocationTracking", "Location tracking stopped")
        } catch (e: Exception) {
            android.util.Log.e("LocationTracking", "Failed to stop tracking", e)
        }
    }
    
    @Suppress("MissingPermission")
    private fun requestLocationUpdates() {
        try {
            val locationRequest = LocationRequest.Builder(
                Priority.PRIORITY_HIGH_ACCURACY,
                LOCATION_UPDATE_INTERVAL
            ).apply {
                setMinUpdateIntervalMillis(FASTEST_UPDATE_INTERVAL)
                setMinUpdateDistanceMeters(MIN_DISTANCE_FOR_UPDATE)
                setMaxUpdateDelayMillis(LOCATION_UPDATE_INTERVAL * 2)
                setWaitForAccurateLocation(false)
            }.build()
            
            fusedLocationClient.requestLocationUpdates(
                locationRequest,
                locationCallback,
                Looper.getMainLooper()
            )
        } catch (e: SecurityException) {
            android.util.Log.e("LocationTracking", "Location permission not granted", e)
            stopSelf()
        } catch (e: Exception) {
            android.util.Log.e("LocationTracking", "Failed to request location updates", e)
        }
    }
    
    private fun handleLocationUpdate(location: Location) {
        val currentTime = System.currentTimeMillis()
        
        // Throttle location updates
        if (currentTime - lastLocationTime < FASTEST_UPDATE_INTERVAL) {
            return
        }
        
        lastLocationTime = currentTime
        
        serviceScope.launch {
            try {
                // Save location locally
                courierPreferences.saveLastKnownLocation(location.latitude, location.longitude)
                
                // Upload to server (throttled)
                if (currentTime - lastUploadTime >= UPLOAD_INTERVAL) {
                    uploadLocationToServer(location)
                    lastUploadTime = currentTime
                }
                
                // Update notification with current location
                updateNotificationWithLocation(location)
                
            } catch (e: Exception) {
                android.util.Log.e("LocationTracking", "Failed to handle location update", e)
            }
        }
    }
    
    private suspend fun uploadLocationToServer(location: Location) {
        try {
            val result = courierRepository.updateLocation(location.latitude, location.longitude)
            
            when (result) {
                is com.mlexpress.courier.data.remote.dto.NetworkResult.Success -> {
                    android.util.Log.d("LocationTracking", "Location uploaded successfully")
                }
                is com.mlexpress.courier.data.remote.dto.NetworkResult.Error -> {
                    android.util.Log.w("LocationTracking", "Failed to upload location: ${result.message}")
                }
                is com.mlexpress.courier.data.remote.dto.NetworkResult.Loading -> {
                    // Handle loading if needed
                }
            }
        } catch (e: Exception) {
            android.util.Log.e("LocationTracking", "Exception uploading location", e)
        }
    }
    
    private fun createForegroundNotification() {
        val channelId = "location_tracking_channel"
        
        // Create notification channel for Android 8.0+
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            val channel = android.app.NotificationChannel(
                channelId,
                "位置跟踪服务",
                android.app.NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "实时跟踪骑手位置，为客户提供配送信息"
                setShowBadge(false)
            }
            
            val notificationManager = getSystemService(android.app.NotificationManager::class.java)
            notificationManager.createNotificationChannel(channel)
        }
        
        val notification = NotificationCompat.Builder(this, channelId)
            .setContentTitle("ML Express 骑手")
            .setContentText("位置跟踪服务运行中...")
            .setSmallIcon(R.drawable.ic_location_tracking)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .setShowWhen(false)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .build()
        
        startForeground(NOTIFICATION_ID, notification)
    }
    
    private fun updateNotificationWithLocation(location: Location) {
        try {
            val channelId = "location_tracking_channel"
            val accuracy = if (location.hasAccuracy()) "${location.accuracy.toInt()}m" else "未知"
            
            val notification = NotificationCompat.Builder(this, channelId)
                .setContentTitle("ML Express 骑手")
                .setContentText("位置跟踪中 • 精度: $accuracy")
                .setSmallIcon(R.drawable.ic_location_tracking)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setOngoing(true)
                .setShowWhen(false)
                .setCategory(NotificationCompat.CATEGORY_SERVICE)
                .build()
            
            val notificationManager = getSystemService(android.app.NotificationManager::class.java)
            notificationManager.notify(NOTIFICATION_ID, notification)
        } catch (e: Exception) {
            android.util.Log.e("LocationTracking", "Failed to update notification", e)
        }
    }
    
    // Power optimization methods
    private fun isInPowerSaveMode(): Boolean {
        val powerManager = getSystemService(android.content.Context.POWER_SERVICE) as android.os.PowerManager
        return powerManager.isPowerSaveMode
    }
    
    private fun adjustTrackingFrequency() {
        serviceScope.launch {
            try {
                val courier = courierRepository.getCurrentCourier().first()
                val isOnline = courier?.isOnline ?: false
                val isPowerSaveMode = isInPowerSaveMode()
                
                // Adjust tracking frequency based on courier status and power mode
                val updateInterval = when {
                    !isOnline -> LOCATION_UPDATE_INTERVAL * 6 // 1 minute when offline
                    isPowerSaveMode -> LOCATION_UPDATE_INTERVAL * 3 // 30 seconds in power save mode
                    else -> LOCATION_UPDATE_INTERVAL // 10 seconds when online
                }
                
                // Restart location updates with new interval
                if (isTracking) {
                    stopLocationTracking()
                    delay(1000)
                    startLocationTracking()
                }
            } catch (e: Exception) {
                android.util.Log.e("LocationTracking", "Failed to adjust tracking frequency", e)
            }
        }
    }
}
