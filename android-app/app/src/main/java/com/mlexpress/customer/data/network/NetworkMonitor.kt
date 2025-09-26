package com.mlexpress.customer.data.network

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.os.Build
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.flow.distinctUntilChanged
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class NetworkMonitor @Inject constructor(
    @ApplicationContext private val context: Context
) {
    
    private val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
    
    val isOnline: Flow<Boolean> = callbackFlow {
        val callback = object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) {
                super.onAvailable(network)
                trySend(true)
            }
            
            override fun onLost(network: Network) {
                super.onLost(network)
                trySend(false)
            }
            
            override fun onCapabilitiesChanged(
                network: Network,
                networkCapabilities: NetworkCapabilities
            ) {
                super.onCapabilitiesChanged(network, networkCapabilities)
                val isConnected = networkCapabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
                        networkCapabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
                trySend(isConnected)
            }
        }
        
        val networkRequest = NetworkRequest.Builder()
            .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            .build()
        
        connectivityManager.registerNetworkCallback(networkRequest, callback)
        
        // Send initial state
        trySend(isCurrentlyOnline())
        
        awaitClose {
            connectivityManager.unregisterNetworkCallback(callback)
        }
    }.distinctUntilChanged()
    
    val networkType: Flow<NetworkType> = callbackFlow {
        val callback = object : ConnectivityManager.NetworkCallback() {
            override fun onCapabilitiesChanged(
                network: Network,
                networkCapabilities: NetworkCapabilities
            ) {
                super.onCapabilitiesChanged(network, networkCapabilities)
                
                val networkType = when {
                    networkCapabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> NetworkType.WIFI
                    networkCapabilities.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> NetworkType.CELLULAR
                    networkCapabilities.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) -> NetworkType.ETHERNET
                    else -> NetworkType.UNKNOWN
                }
                
                trySend(networkType)
            }
            
            override fun onLost(network: Network) {
                super.onLost(network)
                trySend(NetworkType.NONE)
            }
        }
        
        val networkRequest = NetworkRequest.Builder()
            .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            .build()
        
        connectivityManager.registerNetworkCallback(networkRequest, callback)
        
        // Send initial state
        trySend(getCurrentNetworkType())
        
        awaitClose {
            connectivityManager.unregisterNetworkCallback(callback)
        }
    }.distinctUntilChanged()
    
    fun isCurrentlyOnline(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val network = connectivityManager.activeNetwork
            val capabilities = connectivityManager.getNetworkCapabilities(network)
            capabilities?.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) == true &&
                    capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
        } else {
            @Suppress("DEPRECATION")
            val networkInfo = connectivityManager.activeNetworkInfo
            networkInfo?.isConnected == true
        }
    }
    
    fun getCurrentNetworkType(): NetworkType {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val network = connectivityManager.activeNetwork
            val capabilities = connectivityManager.getNetworkCapabilities(network)
            
            when {
                capabilities == null -> NetworkType.NONE
                capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> NetworkType.WIFI
                capabilities.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> NetworkType.CELLULAR
                capabilities.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) -> NetworkType.ETHERNET
                else -> NetworkType.UNKNOWN
            }
        } else {
            @Suppress("DEPRECATION")
            val networkInfo = connectivityManager.activeNetworkInfo
            when (networkInfo?.type) {
                ConnectivityManager.TYPE_WIFI -> NetworkType.WIFI
                ConnectivityManager.TYPE_MOBILE -> NetworkType.CELLULAR
                ConnectivityManager.TYPE_ETHERNET -> NetworkType.ETHERNET
                else -> if (networkInfo?.isConnected == true) NetworkType.UNKNOWN else NetworkType.NONE
            }
        }
    }
    
    fun isWifiConnected(): Boolean {
        return getCurrentNetworkType() == NetworkType.WIFI
    }
    
    fun isCellularConnected(): Boolean {
        return getCurrentNetworkType() == NetworkType.CELLULAR
    }
    
    fun getNetworkQuality(): NetworkQuality {
        if (!isCurrentlyOnline()) return NetworkQuality.NO_CONNECTION
        
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val network = connectivityManager.activeNetwork
            val capabilities = connectivityManager.getNetworkCapabilities(network)
            
            when {
                capabilities == null -> NetworkQuality.NO_CONNECTION
                capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> NetworkQuality.EXCELLENT
                capabilities.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> {
                    // Try to determine cellular quality
                    if (capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_NOT_METERED)) {
                        NetworkQuality.GOOD
                    } else {
                        NetworkQuality.FAIR
                    }
                }
                else -> NetworkQuality.POOR
            }
        } else {
            NetworkQuality.UNKNOWN
        }
    }
}

enum class NetworkType {
    NONE,
    WIFI,
    CELLULAR,
    ETHERNET,
    UNKNOWN
}

enum class NetworkQuality {
    NO_CONNECTION,
    POOR,
    FAIR,
    GOOD,
    EXCELLENT,
    UNKNOWN
}

// Network-aware request strategy
class NetworkAwareRequestStrategy @Inject constructor(
    private val networkMonitor: NetworkMonitor
) {
    
    fun shouldUseCache(): Boolean {
        return !networkMonitor.isCurrentlyOnline() || 
               networkMonitor.getNetworkQuality() == NetworkQuality.POOR
    }
    
    fun getTimeoutMultiplier(): Float {
        return when (networkMonitor.getNetworkQuality()) {
            NetworkQuality.EXCELLENT -> 1.0f
            NetworkQuality.GOOD -> 1.5f
            NetworkQuality.FAIR -> 2.0f
            NetworkQuality.POOR -> 3.0f
            else -> 2.0f
        }
    }
    
    fun shouldRetry(): Boolean {
        return networkMonitor.isCurrentlyOnline()
    }
    
    fun getRetryDelay(): Long {
        return when (networkMonitor.getCurrentNetworkType()) {
            NetworkType.WIFI -> 1000L
            NetworkType.CELLULAR -> 3000L
            NetworkType.ETHERNET -> 500L
            else -> 5000L
        }
    }
}
