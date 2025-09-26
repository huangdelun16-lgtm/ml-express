package com.mlexpress.customer.data.websocket

import android.content.Context
import com.google.gson.Gson
import com.mlexpress.customer.data.local.preferences.UserPreferences
import com.mlexpress.customer.data.network.NetworkMonitor
import dagger.hilt.android.qualifiers.ApplicationContext
import io.socket.client.IO
import io.socket.client.Socket
import io.socket.emitter.Emitter
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*
import org.json.JSONObject
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class WebSocketManager @Inject constructor(
    @ApplicationContext private val context: Context,
    private val userPreferences: UserPreferences,
    private val networkMonitor: NetworkMonitor,
    private val gson: Gson
) {
    
    private var socket: Socket? = null
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    
    private val _connectionState = MutableStateFlow(ConnectionState.DISCONNECTED)
    val connectionState: StateFlow<ConnectionState> = _connectionState.asStateFlow()
    
    private val _orderUpdates = MutableSharedFlow<OrderUpdateEvent>()
    val orderUpdates: SharedFlow<OrderUpdateEvent> = _orderUpdates.asSharedFlow()
    
    private val _courierLocationUpdates = MutableSharedFlow<CourierLocationEvent>()
    val courierLocationUpdates: SharedFlow<CourierLocationEvent> = _courierLocationUpdates.asSharedFlow()
    
    private var reconnectJob: Job? = null
    private var heartbeatJob: Job? = null
    
    init {
        // Monitor network changes
        scope.launch {
            networkMonitor.isOnline.collect { isOnline ->
                if (isOnline && _connectionState.value == ConnectionState.DISCONNECTED) {
                    connect()
                } else if (!isOnline) {
                    disconnect()
                }
            }
        }
    }
    
    suspend fun connect() {
        try {
            if (_connectionState.value == ConnectionState.CONNECTED) return
            
            val accessToken = userPreferences.getAccessToken().first()
            val userId = userPreferences.getUserId().first()
            
            if (accessToken.isNullOrEmpty() || userId.isNullOrEmpty()) {
                android.util.Log.w("WebSocket", "No auth credentials for WebSocket connection")
                return
            }
            
            _connectionState.value = ConnectionState.CONNECTING
            
            val options = IO.Options().apply {
                auth = mapOf(
                    "token" to accessToken,
                    "userId" to userId,
                    "userType" to "customer"
                )
                timeout = 10000
                reconnection = true
                reconnectionAttempts = 5
                reconnectionDelay = 2000
                reconnectionDelayMax = 10000
                forceNew = true
            }
            
            socket = IO.socket("wss://api.mlexpress.com", options)
            
            setupSocketListeners()
            socket?.connect()
            
        } catch (e: Exception) {
            android.util.Log.e("WebSocket", "Failed to connect", e)
            _connectionState.value = ConnectionState.ERROR
            scheduleReconnect()
        }
    }
    
    fun disconnect() {
        try {
            _connectionState.value = ConnectionState.DISCONNECTING
            
            cancelReconnect()
            cancelHeartbeat()
            
            socket?.disconnect()
            socket?.off()
            socket = null
            
            _connectionState.value = ConnectionState.DISCONNECTED
            
            android.util.Log.d("WebSocket", "Disconnected from server")
        } catch (e: Exception) {
            android.util.Log.e("WebSocket", "Failed to disconnect", e)
        }
    }
    
    private fun setupSocketListeners() {
        socket?.apply {
            // Connection events
            on(Socket.EVENT_CONNECT, onConnect)
            on(Socket.EVENT_DISCONNECT, onDisconnect)
            on(Socket.EVENT_CONNECT_ERROR, onConnectError)
            
            // Order events
            on("order_status_changed", onOrderStatusChanged)
            on("order_assigned", onOrderAssigned)
            on("courier_location_update", onCourierLocationUpdate)
            on("order_cancelled", onOrderCancelled)
            
            // System events
            on("system_message", onSystemMessage)
            on("force_sync", onForceSync)
            
            // Heartbeat
            on("pong", onPong)
        }
    }
    
    private val onConnect = Emitter.Listener {
        android.util.Log.d("WebSocket", "Connected to server")
        _connectionState.value = ConnectionState.CONNECTED
        
        scope.launch {
            try {
                // Join user-specific room
                val userId = userPreferences.getUserId().first()
                socket?.emit("join_room", JSONObject().apply {
                    put("userId", userId)
                    put("userType", "customer")
                })
                
                // Start heartbeat
                startHeartbeat()
                
                // Cancel any pending reconnect attempts
                cancelReconnect()
                
            } catch (e: Exception) {
                android.util.Log.e("WebSocket", "Failed to join room", e)
            }
        }
    }
    
    private val onDisconnect = Emitter.Listener { args ->
        android.util.Log.d("WebSocket", "Disconnected: ${args.contentToString()}")
        _connectionState.value = ConnectionState.DISCONNECTED
        
        cancelHeartbeat()
        
        // Schedule reconnect if network is available
        if (networkMonitor.isCurrentlyOnline()) {
            scheduleReconnect()
        }
    }
    
    private val onConnectError = Emitter.Listener { args ->
        android.util.Log.e("WebSocket", "Connection error: ${args.contentToString()}")
        _connectionState.value = ConnectionState.ERROR
        
        scheduleReconnect()
    }
    
    private val onOrderStatusChanged = Emitter.Listener { args ->
        scope.launch {
            try {
                val data = args[0] as JSONObject
                val event = OrderUpdateEvent(
                    orderId = data.getString("orderId"),
                    status = data.getString("status"),
                    timestamp = data.getLong("timestamp"),
                    message = data.optString("message"),
                    courierInfo = data.optJSONObject("courierInfo")?.toString()
                )
                
                _orderUpdates.emit(event)
                
                android.util.Log.d("WebSocket", "Order status changed: ${event.orderId} -> ${event.status}")
            } catch (e: Exception) {
                android.util.Log.e("WebSocket", "Failed to handle order status change", e)
            }
        }
    }
    
    private val onOrderAssigned = Emitter.Listener { args ->
        scope.launch {
            try {
                val data = args[0] as JSONObject
                val event = OrderUpdateEvent(
                    orderId = data.getString("orderId"),
                    status = "ASSIGNED",
                    timestamp = System.currentTimeMillis(),
                    message = "订单已分配给配送员",
                    courierInfo = data.optJSONObject("courierInfo")?.toString()
                )
                
                _orderUpdates.emit(event)
                
                android.util.Log.d("WebSocket", "Order assigned: ${event.orderId}")
            } catch (e: Exception) {
                android.util.Log.e("WebSocket", "Failed to handle order assignment", e)
            }
        }
    }
    
    private val onCourierLocationUpdate = Emitter.Listener { args ->
        scope.launch {
            try {
                val data = args[0] as JSONObject
                val event = CourierLocationEvent(
                    orderId = data.getString("orderId"),
                    courierId = data.getString("courierId"),
                    latitude = data.getDouble("latitude"),
                    longitude = data.getDouble("longitude"),
                    heading = data.optDouble("heading", 0.0).toFloat(),
                    speed = data.optDouble("speed", 0.0).toFloat(),
                    accuracy = data.optDouble("accuracy", 0.0).toFloat(),
                    timestamp = data.getLong("timestamp")
                )
                
                _courierLocationUpdates.emit(event)
                
                android.util.Log.d("WebSocket", "Courier location update: ${event.courierId}")
            } catch (e: Exception) {
                android.util.Log.e("WebSocket", "Failed to handle courier location update", e)
            }
        }
    }
    
    private val onOrderCancelled = Emitter.Listener { args ->
        scope.launch {
            try {
                val data = args[0] as JSONObject
                val event = OrderUpdateEvent(
                    orderId = data.getString("orderId"),
                    status = "CANCELLED",
                    timestamp = System.currentTimeMillis(),
                    message = data.optString("reason", "订单已取消"),
                    courierInfo = null
                )
                
                _orderUpdates.emit(event)
                
                android.util.Log.d("WebSocket", "Order cancelled: ${event.orderId}")
            } catch (e: Exception) {
                android.util.Log.e("WebSocket", "Failed to handle order cancellation", e)
            }
        }
    }
    
    private val onSystemMessage = Emitter.Listener { args ->
        scope.launch {
            try {
                val data = args[0] as JSONObject
                val message = data.getString("message")
                val type = data.optString("type", "info")
                
                // Handle system messages (notifications, announcements, etc.)
                android.util.Log.d("WebSocket", "System message [$type]: $message")
            } catch (e: Exception) {
                android.util.Log.e("WebSocket", "Failed to handle system message", e)
            }
        }
    }
    
    private val onForceSync = Emitter.Listener {
        scope.launch {
            try {
                // Server requesting client to perform full sync
                val intent = android.content.Intent("com.mlexpress.FORCE_SYNC")
                context.sendBroadcast(intent)
                
                android.util.Log.d("WebSocket", "Force sync requested by server")
            } catch (e: Exception) {
                android.util.Log.e("WebSocket", "Failed to handle force sync", e)
            }
        }
    }
    
    private val onPong = Emitter.Listener {
        // Heartbeat response received
        android.util.Log.v("WebSocket", "Heartbeat pong received")
    }
    
    private fun startHeartbeat() {
        cancelHeartbeat()
        heartbeatJob = scope.launch {
            while (isActive && _connectionState.value == ConnectionState.CONNECTED) {
                try {
                    socket?.emit("ping", JSONObject().apply {
                        put("timestamp", System.currentTimeMillis())
                    })
                    delay(30000) // Send heartbeat every 30 seconds
                } catch (e: Exception) {
                    android.util.Log.e("WebSocket", "Heartbeat failed", e)
                    break
                }
            }
        }
    }
    
    private fun cancelHeartbeat() {
        heartbeatJob?.cancel()
        heartbeatJob = null
    }
    
    private fun scheduleReconnect() {
        cancelReconnect()
        
        if (!networkMonitor.isCurrentlyOnline()) {
            android.util.Log.d("WebSocket", "Network offline, skipping reconnect")
            return
        }
        
        reconnectJob = scope.launch {
            try {
                val delay = calculateReconnectDelay()
                android.util.Log.d("WebSocket", "Scheduling reconnect in ${delay}ms")
                
                delay(delay)
                
                if (isActive && _connectionState.value != ConnectionState.CONNECTED) {
                    connect()
                }
            } catch (e: Exception) {
                android.util.Log.e("WebSocket", "Reconnect failed", e)
            }
        }
    }
    
    private fun cancelReconnect() {
        reconnectJob?.cancel()
        reconnectJob = null
    }
    
    private fun calculateReconnectDelay(): Long {
        val networkQuality = networkMonitor.getNetworkQuality()
        
        return when (networkQuality) {
            com.mlexpress.customer.data.network.NetworkQuality.EXCELLENT -> 2000L
            com.mlexpress.customer.data.network.NetworkQuality.GOOD -> 3000L
            com.mlexpress.customer.data.network.NetworkQuality.FAIR -> 5000L
            com.mlexpress.customer.data.network.NetworkQuality.POOR -> 10000L
            else -> 5000L
        }
    }
    
    // Public methods for sending data
    fun sendOrderUpdate(orderId: String, status: String, data: Map<String, Any> = emptyMap()) {
        try {
            if (_connectionState.value == ConnectionState.CONNECTED) {
                socket?.emit("order_update", JSONObject().apply {
                    put("orderId", orderId)
                    put("status", status)
                    put("timestamp", System.currentTimeMillis())
                    data.forEach { (key, value) ->
                        put(key, value)
                    }
                })
            }
        } catch (e: Exception) {
            android.util.Log.e("WebSocket", "Failed to send order update", e)
        }
    }
    
    fun sendLocationUpdate(latitude: Double, longitude: Double, accuracy: Float) {
        try {
            if (_connectionState.value == ConnectionState.CONNECTED) {
                socket?.emit("location_update", JSONObject().apply {
                    put("latitude", latitude)
                    put("longitude", longitude)
                    put("accuracy", accuracy)
                    put("timestamp", System.currentTimeMillis())
                })
            }
        } catch (e: Exception) {
            android.util.Log.e("WebSocket", "Failed to send location update", e)
        }
    }
    
    fun cleanup() {
        disconnect()
        scope.cancel()
    }
}

enum class ConnectionState {
    DISCONNECTED,
    CONNECTING,
    CONNECTED,
    DISCONNECTING,
    ERROR
}

data class OrderUpdateEvent(
    val orderId: String,
    val status: String,
    val timestamp: Long,
    val message: String? = null,
    val courierInfo: String? = null
)

data class CourierLocationEvent(
    val orderId: String,
    val courierId: String,
    val latitude: Double,
    val longitude: Double,
    val heading: Float,
    val speed: Float,
    val accuracy: Float,
    val timestamp: Long
)

// WebSocket event types
object WebSocketEvents {
    const val ORDER_STATUS_CHANGED = "order_status_changed"
    const val ORDER_ASSIGNED = "order_assigned"
    const val ORDER_CANCELLED = "order_cancelled"
    const val COURIER_LOCATION_UPDATE = "courier_location_update"
    const val NEW_ORDER_AVAILABLE = "new_order_available"
    const val SYSTEM_MESSAGE = "system_message"
    const val FORCE_SYNC = "force_sync"
    const val PING = "ping"
    const val PONG = "pong"
}
