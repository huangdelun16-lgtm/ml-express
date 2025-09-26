package com.mlexpress.customer.data.service

import android.app.Service
import android.content.Intent
import android.os.IBinder
import androidx.lifecycle.lifecycleScope
import com.google.gson.Gson
import com.mlexpress.customer.data.local.dao.OrderDao
import com.mlexpress.customer.data.local.preferences.UserPreferences
import com.mlexpress.customer.data.model.Order
import com.mlexpress.customer.data.model.OrderStatus
import dagger.hilt.android.AndroidEntryPoint
import io.socket.client.IO
import io.socket.client.Socket
import io.socket.emitter.Emitter
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.first
import org.json.JSONObject
import javax.inject.Inject

@AndroidEntryPoint
class RealtimeOrderSyncService : Service() {
    
    @Inject
    lateinit var orderDao: OrderDao
    
    @Inject
    lateinit var userPreferences: UserPreferences
    
    @Inject
    lateinit var gson: Gson
    
    private var socket: Socket? = null
    private val serviceScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var userId: String? = null
    private var accessToken: String? = null
    
    override fun onCreate() {
        super.onCreate()
        initializeSocketConnection()
    }
    
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startForegroundService()
        connectToServer()
        return START_STICKY
    }
    
    override fun onBind(intent: Intent?): IBinder? = null
    
    override fun onDestroy() {
        super.onDestroy()
        disconnectFromServer()
        serviceScope.cancel()
    }
    
    private fun startForegroundService() {
        val notification = createSyncNotification()
        startForeground(NOTIFICATION_ID, notification)
    }
    
    private fun initializeSocketConnection() {
        serviceScope.launch {
            try {
                userId = userPreferences.getUserId().first()
                accessToken = userPreferences.getAccessToken().first()
                
                if (userId != null && accessToken != null) {
                    setupSocket()
                }
            } catch (e: Exception) {
                android.util.Log.e("RealtimeSync", "Failed to initialize", e)
            }
        }
    }
    
    private fun setupSocket() {
        try {
            val options = IO.Options().apply {
                auth = mapOf("token" to accessToken)
                timeout = 10000
                reconnection = true
                reconnectionAttempts = 5
                reconnectionDelay = 2000
            }
            
            socket = IO.socket("wss://api.mlexpress.com", options)
            
            socket?.apply {
                // Connection events
                on(Socket.EVENT_CONNECT, onConnect)
                on(Socket.EVENT_DISCONNECT, onDisconnect)
                on(Socket.EVENT_CONNECT_ERROR, onConnectError)
                
                // Order events
                on("order_created", onOrderCreated)
                on("order_updated", onOrderUpdated)
                on("order_status_changed", onOrderStatusChanged)
                on("order_assigned", onOrderAssigned)
                
                // Sync events
                on("sync_orders", onSyncOrders)
                on("sync_request", onSyncRequest)
            }
        } catch (e: Exception) {
            android.util.Log.e("RealtimeSync", "Failed to setup socket", e)
        }
    }
    
    private fun connectToServer() {
        socket?.connect()
    }
    
    private fun disconnectFromServer() {
        socket?.disconnect()
        socket?.off()
    }
    
    // Socket event handlers
    private val onConnect = Emitter.Listener {
        android.util.Log.d("RealtimeSync", "Connected to server")
        
        serviceScope.launch {
            try {
                // Join user room for personalized updates
                socket?.emit("join_user_room", JSONObject().apply {
                    put("userId", userId)
                    put("userType", "customer")
                })
                
                // Request initial sync
                requestOrderSync()
            } catch (e: Exception) {
                android.util.Log.e("RealtimeSync", "Failed to join room", e)
            }
        }
    }
    
    private val onDisconnect = Emitter.Listener {
        android.util.Log.d("RealtimeSync", "Disconnected from server")
    }
    
    private val onConnectError = Emitter.Listener { args ->
        android.util.Log.e("RealtimeSync", "Connection error: ${args.contentToString()}")
    }
    
    private val onOrderCreated = Emitter.Listener { args ->
        serviceScope.launch {
            try {
                val orderJson = args[0] as JSONObject
                val order = gson.fromJson(orderJson.toString(), Order::class.java)
                
                // Save new order to local database
                orderDao.insertOrder(order)
                
                // Send local broadcast for UI updates
                sendLocalBroadcast("ORDER_CREATED", order.id)
                
                android.util.Log.d("RealtimeSync", "New order created: ${order.orderNumber}")
            } catch (e: Exception) {
                android.util.Log.e("RealtimeSync", "Failed to handle order created", e)
            }
        }
    }
    
    private val onOrderUpdated = Emitter.Listener { args ->
        serviceScope.launch {
            try {
                val orderJson = args[0] as JSONObject
                val order = gson.fromJson(orderJson.toString(), Order::class.java)
                
                // Update order in local database
                orderDao.updateOrder(order)
                
                // Send local broadcast for UI updates
                sendLocalBroadcast("ORDER_UPDATED", order.id)
                
                android.util.Log.d("RealtimeSync", "Order updated: ${order.orderNumber}")
            } catch (e: Exception) {
                android.util.Log.e("RealtimeSync", "Failed to handle order updated", e)
            }
        }
    }
    
    private val onOrderStatusChanged = Emitter.Listener { args ->
        serviceScope.launch {
            try {
                val data = args[0] as JSONObject
                val orderId = data.getString("orderId")
                val newStatus = OrderStatus.valueOf(data.getString("status"))
                val timestamp = data.getLong("timestamp")
                
                // Update order status in local database
                orderDao.updateOrderStatus(orderId, newStatus)
                
                // Send local broadcast for UI updates
                sendLocalBroadcast("ORDER_STATUS_CHANGED", orderId, mapOf(
                    "status" to newStatus.name,
                    "timestamp" to timestamp.toString()
                ))
                
                android.util.Log.d("RealtimeSync", "Order status changed: $orderId -> $newStatus")
            } catch (e: Exception) {
                android.util.Log.e("RealtimeSync", "Failed to handle status change", e)
            }
        }
    }
    
    private val onOrderAssigned = Emitter.Listener { args ->
        serviceScope.launch {
            try {
                val data = args[0] as JSONObject
                val orderId = data.getString("orderId")
                val courierInfo = data.getJSONObject("courierInfo")
                
                // Update order with courier info
                val order = orderDao.getOrderById(orderId)
                if (order != null) {
                    val updatedOrder = order.copy(
                        courierInfo = gson.fromJson(courierInfo.toString(), com.mlexpress.customer.data.model.CourierInfo::class.java),
                        status = OrderStatus.CONFIRMED
                    )
                    orderDao.updateOrder(updatedOrder)
                    
                    // Send local broadcast
                    sendLocalBroadcast("ORDER_ASSIGNED", orderId)
                }
                
                android.util.Log.d("RealtimeSync", "Order assigned: $orderId")
            } catch (e: Exception) {
                android.util.Log.e("RealtimeSync", "Failed to handle order assignment", e)
            }
        }
    }
    
    private val onSyncOrders = Emitter.Listener { args ->
        serviceScope.launch {
            try {
                val ordersJson = args[0] as org.json.JSONArray
                val orders = mutableListOf<Order>()
                
                for (i in 0 until ordersJson.length()) {
                    val orderJson = ordersJson.getJSONObject(i)
                    val order = gson.fromJson(orderJson.toString(), Order::class.java)
                    orders.add(order)
                }
                
                // Batch update local database
                orders.forEach { order ->
                    orderDao.insertOrder(order)
                }
                
                // Send local broadcast
                sendLocalBroadcast("ORDERS_SYNCED", "", mapOf("count" to orders.size.toString()))
                
                android.util.Log.d("RealtimeSync", "Synced ${orders.size} orders")
            } catch (e: Exception) {
                android.util.Log.e("RealtimeSync", "Failed to sync orders", e)
            }
        }
    }
    
    private val onSyncRequest = Emitter.Listener {
        serviceScope.launch {
            try {
                // Server requesting client to sync data
                requestOrderSync()
            } catch (e: Exception) {
                android.util.Log.e("RealtimeSync", "Failed to handle sync request", e)
            }
        }
    }
    
    private fun requestOrderSync() {
        try {
            socket?.emit("request_order_sync", JSONObject().apply {
                put("userId", userId)
                put("lastSyncTime", System.currentTimeMillis())
            })
        } catch (e: Exception) {
            android.util.Log.e("RealtimeSync", "Failed to request sync", e)
        }
    }
    
    private fun sendLocalBroadcast(action: String, orderId: String, extras: Map<String, String> = emptyMap()) {
        val intent = Intent("com.mlexpress.ORDER_UPDATE").apply {
            putExtra("action", action)
            putExtra("orderId", orderId)
            extras.forEach { (key, value) ->
                putExtra(key, value)
            }
        }
        sendBroadcast(intent)
    }
    
    private fun createSyncNotification(): android.app.Notification {
        val channelId = "order_sync_channel"
        
        // Create notification channel for Android 8.0+
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            val channel = android.app.NotificationChannel(
                channelId,
                "订单同步服务",
                android.app.NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "保持订单数据实时同步"
                setShowBadge(false)
            }
            
            val notificationManager = getSystemService(android.app.NotificationManager::class.java)
            notificationManager.createNotificationChannel(channel)
        }
        
        return androidx.core.app.NotificationCompat.Builder(this, channelId)
            .setContentTitle("ML Express")
            .setContentText("订单数据同步中...")
            .setSmallIcon(com.mlexpress.customer.R.drawable.ic_notification)
            .setPriority(androidx.core.app.NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .setShowWhen(false)
            .build()
    }
    
    companion object {
        private const val NOTIFICATION_ID = 1001
        
        fun startService(context: android.content.Context) {
            val intent = Intent(context, RealtimeOrderSyncService::class.java)
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }
        
        fun stopService(context: android.content.Context) {
            val intent = Intent(context, RealtimeOrderSyncService::class.java)
            context.stopService(intent)
        }
    }
}
