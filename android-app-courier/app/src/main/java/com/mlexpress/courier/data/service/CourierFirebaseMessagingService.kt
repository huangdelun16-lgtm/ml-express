package com.mlexpress.courier.data.service

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.RingtoneManager
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.mlexpress.courier.R
import com.mlexpress.courier.data.local.preferences.CourierPreferences
import com.mlexpress.courier.data.repository.CourierRepository
import com.mlexpress.courier.presentation.MainActivity
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import javax.inject.Inject

@AndroidEntryPoint
class CourierFirebaseMessagingService : FirebaseMessagingService() {
    
    @Inject
    lateinit var courierPreferences: CourierPreferences
    
    @Inject
    lateinit var courierRepository: CourierRepository
    
    private val serviceScope = CoroutineScope(Dispatchers.IO)
    
    override fun onNewToken(token: String) {
        super.onNewToken(token)
        
        serviceScope.launch {
            try {
                // Save FCM token locally
                courierPreferences.saveFcmToken(token)
                
                // Update token on server if courier is logged in
                if (courierRepository.isLoggedIn()) {
                    // TODO: Update FCM token on server
                    android.util.Log.d("FCM", "FCM token updated: $token")
                }
            } catch (e: Exception) {
                android.util.Log.e("FCM", "Failed to handle new token", e)
            }
        }
    }
    
    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        super.onMessageReceived(remoteMessage)
        
        android.util.Log.d("FCM", "Message received from: ${remoteMessage.from}")
        
        // Handle data payload
        if (remoteMessage.data.isNotEmpty()) {
            handleDataMessage(remoteMessage.data)
        }
        
        // Handle notification payload
        remoteMessage.notification?.let { notification ->
            showNotification(
                title = notification.title ?: "ML Express",
                body = notification.body ?: "",
                data = remoteMessage.data
            )
        }
    }
    
    private fun handleDataMessage(data: Map<String, String>) {
        serviceScope.launch {
            try {
                when (data["type"]) {
                    "new_order" -> handleNewOrderNotification(data)
                    "order_update" -> handleOrderUpdateNotification(data)
                    "order_cancelled" -> handleOrderCancelledNotification(data)
                    "earnings_update" -> handleEarningsUpdateNotification(data)
                    "system_message" -> handleSystemMessageNotification(data)
                    "urgent_order" -> handleUrgentOrderNotification(data)
                    else -> {
                        // Generic notification
                        showNotification(
                            title = data["title"] ?: "ML Express",
                            body = data["message"] ?: "",
                            data = data
                        )
                    }
                }
            } catch (e: Exception) {
                android.util.Log.e("FCM", "Failed to handle data message", e)
            }
        }
    }
    
    private suspend fun handleNewOrderNotification(data: Map<String, String>) {
        val isOrderNotificationsEnabled = courierPreferences.isOrderNotificationsEnabled().first()
        if (!isOrderNotificationsEnabled) return
        
        val orderId = data["order_id"] ?: return
        val orderNumber = data["order_number"] ?: "新订单"
        val distance = data["distance"] ?: "未知"
        val earning = data["earning"] ?: "0"
        
        showHighPriorityNotification(
            title = "🚀 新订单推送",
            body = "订单号: $orderNumber\n距离: ${distance}km • 收入: ${earning}MMK",
            data = data,
            channelId = "new_orders",
            channelName = "新订单通知",
            importance = NotificationManager.IMPORTANCE_HIGH,
            autoCancel = false,
            vibrate = true,
            sound = true
        )
        
        // Send local broadcast for immediate UI update
        sendLocalBroadcast("NEW_ORDER_AVAILABLE", orderId)
    }
    
    private suspend fun handleUrgentOrderNotification(data: Map<String, String>) {
        val orderId = data["order_id"] ?: return
        val orderNumber = data["order_number"] ?: "紧急订单"
        val earning = data["earning"] ?: "0"
        
        showHighPriorityNotification(
            title = "🚨 紧急订单！",
            body = "高优先级订单: $orderNumber\n高额收入: ${earning}MMK",
            data = data,
            channelId = "urgent_orders",
            channelName = "紧急订单通知",
            importance = NotificationManager.IMPORTANCE_MAX,
            autoCancel = false,
            vibrate = true,
            sound = true,
            heads_up = true
        )
        
        // Trigger stronger vibration for urgent orders
        triggerUrgentVibration()
        
        sendLocalBroadcast("URGENT_ORDER_AVAILABLE", orderId)
    }
    
    private suspend fun handleOrderUpdateNotification(data: Map<String, String>) {
        // This is for courier app - customer order updates
        val orderId = data["order_id"] ?: return
        val status = data["status"] ?: return
        val customerName = data["customer_name"] ?: "客户"
        
        showNotification(
            title = "📦 订单状态更新",
            body = "$customerName 的订单状态: $status",
            data = data,
            channelId = "order_updates"
        )
        
        sendLocalBroadcast("ORDER_STATUS_UPDATED", orderId, mapOf("status" to status))
    }
    
    private suspend fun handleOrderCancelledNotification(data: Map<String, String>) {
        val orderId = data["order_id"] ?: return
        val orderNumber = data["order_number"] ?: "订单"
        val reason = data["reason"] ?: "客户取消"
        
        showNotification(
            title = "❌ 订单已取消",
            body = "$orderNumber 已取消\n原因: $reason",
            data = data,
            channelId = "order_updates"
        )
        
        sendLocalBroadcast("ORDER_CANCELLED", orderId)
    }
    
    private suspend fun handleEarningsUpdateNotification(data: Map<String, String>) {
        val isEarningsNotificationsEnabled = courierPreferences.isEarningsNotificationsEnabled().first()
        if (!isEarningsNotificationsEnabled) return
        
        val amount = data["amount"] ?: return
        val type = data["earnings_type"] ?: "收入"
        
        showNotification(
            title = "💰 收入更新",
            body = "$type: +${amount}MMK",
            data = data,
            channelId = "earnings_updates"
        )
        
        sendLocalBroadcast("EARNINGS_UPDATED", "", mapOf("amount" to amount, "type" to type))
    }
    
    private suspend fun handleSystemMessageNotification(data: Map<String, String>) {
        val isSystemNotificationsEnabled = courierPreferences.isSystemNotificationsEnabled().first()
        if (!isSystemNotificationsEnabled) return
        
        val title = data["title"] ?: "系统消息"
        val message = data["message"] ?: ""
        val priority = data["priority"] ?: "normal"
        
        val importance = when (priority) {
            "high" -> NotificationManager.IMPORTANCE_HIGH
            "urgent" -> NotificationManager.IMPORTANCE_MAX
            else -> NotificationManager.IMPORTANCE_DEFAULT
        }
        
        showNotification(
            title = "📢 $title",
            body = message,
            data = data,
            channelId = "system_messages",
            importance = importance
        )
    }
    
    private fun showNotification(
        title: String,
        body: String,
        data: Map<String, String>,
        channelId: String = "default",
        importance: Int = NotificationManager.IMPORTANCE_DEFAULT
    ) {
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        
        // Create notification channel
        createNotificationChannel(channelId, channelId, importance)
        
        // Create intent for notification tap
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            data.forEach { (key, value) ->
                putExtra(key, value)
            }
        }
        
        val pendingIntent = PendingIntent.getActivity(
            this,
            System.currentTimeMillis().toInt(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        
        val notification = NotificationCompat.Builder(this, channelId)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setPriority(when (importance) {
                NotificationManager.IMPORTANCE_MAX -> NotificationCompat.PRIORITY_MAX
                NotificationManager.IMPORTANCE_HIGH -> NotificationCompat.PRIORITY_HIGH
                else -> NotificationCompat.PRIORITY_DEFAULT
            })
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .setDefaults(NotificationCompat.DEFAULT_ALL)
            .build()
        
        notificationManager.notify(System.currentTimeMillis().toInt(), notification)
    }
    
    private fun showHighPriorityNotification(
        title: String,
        body: String,
        data: Map<String, String>,
        channelId: String,
        channelName: String,
        importance: Int = NotificationManager.IMPORTANCE_HIGH,
        autoCancel: Boolean = true,
        vibrate: Boolean = false,
        sound: Boolean = false,
        heads_up: Boolean = false
    ) {
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        
        // Create high priority notification channel
        createNotificationChannel(channelId, channelName, importance)
        
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            data.forEach { (key, value) ->
                putExtra(key, value)
            }
        }
        
        val pendingIntent = PendingIntent.getActivity(
            this,
            System.currentTimeMillis().toInt(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        
        val builder = NotificationCompat.Builder(this, channelId)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setPriority(when (importance) {
                NotificationManager.IMPORTANCE_MAX -> NotificationCompat.PRIORITY_MAX
                NotificationManager.IMPORTANCE_HIGH -> NotificationCompat.PRIORITY_HIGH
                else -> NotificationCompat.PRIORITY_DEFAULT
            })
            .setContentIntent(pendingIntent)
            .setAutoCancel(autoCancel)
            .setCategory(NotificationCompat.CATEGORY_MESSAGE)
        
        if (sound) {
            builder.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION))
        }
        
        if (vibrate) {
            builder.setVibrate(longArrayOf(0, 500, 250, 500))
        }
        
        if (heads_up && Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            builder.setFullScreenIntent(pendingIntent, true)
        }
        
        notificationManager.notify(System.currentTimeMillis().toInt(), builder.build())
    }
    
    private fun createNotificationChannel(channelId: String, channelName: String, importance: Int) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(channelId, channelName, importance).apply {
                description = when (channelId) {
                    "new_orders" -> "新订单推送通知"
                    "urgent_orders" -> "紧急订单通知"
                    "order_updates" -> "订单状态更新"
                    "earnings_updates" -> "收入更新通知"
                    "system_messages" -> "系统消息通知"
                    else -> "默认通知"
                }
                
                if (importance >= NotificationManager.IMPORTANCE_HIGH) {
                    enableVibration(true)
                    vibrationPattern = longArrayOf(0, 500, 250, 500)
                    setSound(
                        RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION),
                        android.media.AudioAttributes.Builder()
                            .setUsage(android.media.AudioAttributes.USAGE_NOTIFICATION)
                            .setContentType(android.media.AudioAttributes.CONTENT_TYPE_SONIFICATION)
                            .build()
                    )
                }
                
                setShowBadge(true)
            }
            
            val notificationManager = getSystemService(NotificationManager::class.java)
            notificationManager.createNotificationChannel(channel)
        }
    }
    
    private fun triggerUrgentVibration() {
        try {
            val vibrator = getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                // Create urgent vibration pattern
                val pattern = longArrayOf(0, 200, 100, 200, 100, 200, 100, 500)
                val effect = VibrationEffect.createWaveform(pattern, -1)
                vibrator.vibrate(effect)
            } else {
                @Suppress("DEPRECATION")
                vibrator.vibrate(longArrayOf(0, 200, 100, 200, 100, 200, 100, 500), -1)
            }
        } catch (e: Exception) {
            android.util.Log.e("FCM", "Failed to trigger vibration", e)
        }
    }
    
    private fun sendLocalBroadcast(action: String, orderId: String, extras: Map<String, String> = emptyMap()) {
        val intent = Intent("com.mlexpress.courier.ORDER_UPDATE").apply {
            putExtra("action", action)
            putExtra("orderId", orderId)
            extras.forEach { (key, value) ->
                putExtra(key, value)
            }
        }
        sendBroadcast(intent)
    }
}
