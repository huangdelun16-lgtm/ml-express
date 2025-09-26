package com.mlexpress.customer.data.service

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.mlexpress.customer.R
import com.mlexpress.customer.data.local.preferences.UserPreferences
import com.mlexpress.customer.data.repository.AuthRepository
import com.mlexpress.customer.presentation.MainActivity
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import javax.inject.Inject

@AndroidEntryPoint
class MLExpressFirebaseMessagingService : FirebaseMessagingService() {
    
    @Inject
    lateinit var userPreferences: UserPreferences
    
    @Inject
    lateinit var authRepository: AuthRepository
    
    private val serviceScope = CoroutineScope(Dispatchers.IO)
    
    override fun onNewToken(token: String) {
        super.onNewToken(token)
        
        // Save FCM token locally
        serviceScope.launch {
            userPreferences.saveFcmToken(token)
            
            // Update token on server if user is logged in
            try {
                if (authRepository.isLoggedIn()) {
                    authRepository.updateFcmToken(token)
                }
            } catch (e: Exception) {
                // Token will be updated on next login
            }
        }
    }
    
    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        super.onMessageReceived(remoteMessage)
        
        // Handle FCM messages here
        remoteMessage.notification?.let { notification ->
            showNotification(
                title = notification.title ?: "ML Express",
                body = notification.body ?: "",
                data = remoteMessage.data
            )
        }
        
        // Handle data payload
        if (remoteMessage.data.isNotEmpty()) {
            handleDataMessage(remoteMessage.data)
        }
    }
    
    private fun handleDataMessage(data: Map<String, String>) {
        when (data["type"]) {
            "order_update" -> {
                val orderId = data["order_id"]
                val status = data["status"]
                showNotification(
                    title = "Order Update",
                    body = "Your order $orderId status: $status",
                    data = data
                )
            }
            "courier_location" -> {
                // Handle courier location update
            }
            "promotion" -> {
                val title = data["title"] ?: "Special Offer"
                val message = data["message"] ?: ""
                showNotification(title, message, data)
            }
        }
    }
    
    private fun showNotification(
        title: String,
        body: String,
        data: Map<String, String>
    ) {
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        
        // Create notification channel for Android 8.0+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "ML Express Notifications",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "Notifications for ML Express orders and updates"
            }
            notificationManager.createNotificationChannel(channel)
        }
        
        // Create intent for notification tap
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            // Add extra data if needed
            data.forEach { (key, value) ->
                putExtra(key, value)
            }
        }
        
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        
        // Build notification
        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title)
            .setContentText(body)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .build()
        
        notificationManager.notify(System.currentTimeMillis().toInt(), notification)
    }
    
    companion object {
        private const val CHANNEL_ID = "ml_express_notifications"
    }
}
