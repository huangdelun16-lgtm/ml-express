package com.mlexpress.customer.data.network

import android.content.Context
import com.google.gson.Gson
import com.google.gson.GsonBuilder
import com.mlexpress.customer.BuildConfig
import com.mlexpress.customer.data.local.preferences.UserPreferences
import com.mlexpress.customer.data.remote.api.*
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.first
import okhttp3.Cache
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.io.File
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class NetworkManager @Inject constructor(
    @ApplicationContext private val context: Context,
    private val userPreferences: UserPreferences,
    private val networkMonitor: NetworkMonitor
) {
    
    private val gson: Gson by lazy {
        GsonBuilder()
            .setDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")
            .setLenient()
            .create()
    }
    
    private val okHttpClient: OkHttpClient by lazy {
        createOkHttpClient()
    }
    
    private val retrofit: Retrofit by lazy {
        createRetrofit()
    }
    
    // API服务实例
    val authApi: AuthApiService by lazy { retrofit.create(AuthApiService::class.java) }
    val orderApi: OrderApiService by lazy { retrofit.create(OrderApiService::class.java) }
    val locationApi: LocationApiService by lazy { retrofit.create(LocationApiService::class.java) }
    val paymentApi: PaymentApi by lazy { retrofit.create(PaymentApi::class.java) }
    
    private fun createOkHttpClient(): OkHttpClient {
        val builder = OkHttpClient.Builder()
            .connectTimeout(NetworkConfig.CONNECT_TIMEOUT, TimeUnit.SECONDS)
            .readTimeout(NetworkConfig.READ_TIMEOUT, TimeUnit.SECONDS)
            .writeTimeout(NetworkConfig.WRITE_TIMEOUT, TimeUnit.SECONDS)
        
        // 添加缓存
        val cacheDir = File(context.cacheDir, "http_cache")
        val cache = Cache(cacheDir, NetworkConfig.CACHE_SIZE)
        builder.cache(cache)
        
        // 添加拦截器
        builder.addInterceptor(createHeaderInterceptor())
        builder.addInterceptor(createAuthInterceptor())
        builder.addInterceptor(CacheInterceptor(networkMonitor))
        builder.addInterceptor(RetryInterceptor(networkMonitor))
        builder.addInterceptor(ErrorHandlingInterceptor())
        
        // 添加日志拦截器（仅在调试模式）
        if (BuildConfig.DEBUG) {
            val loggingInterceptor = HttpLoggingInterceptor().apply {
                level = HttpLoggingInterceptor.Level.BODY
            }
            builder.addInterceptor(loggingInterceptor)
        }
        
        return builder.build()
    }
    
    private fun createRetrofit(): Retrofit {
        return Retrofit.Builder()
            .baseUrl(NetworkConfig.BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create(gson))
            .build()
    }
    
    private fun createHeaderInterceptor(): HeaderInterceptor {
        return HeaderInterceptor(
            userAgent = "ML Express Android/${BuildConfig.VERSION_NAME}",
            appVersion = BuildConfig.VERSION_NAME,
            deviceId = getDeviceId()
        )
    }
    
    private fun createAuthInterceptor(): AuthInterceptor {
        return AuthInterceptor { 
            userPreferences.getAccessToken().first()
        }
    }
    
    private fun getDeviceId(): String {
        // 生成或获取设备唯一ID
        return android.provider.Settings.Secure.getString(
            context.contentResolver,
            android.provider.Settings.Secure.ANDROID_ID
        ) ?: "unknown_device"
    }
    
    /**
     * 创建设备信息
     */
    fun createDeviceInfo(): DeviceInfo {
        return DeviceInfo(
            deviceId = getDeviceId(),
            deviceModel = "${android.os.Build.MANUFACTURER} ${android.os.Build.MODEL}",
            osVersion = android.os.Build.VERSION.RELEASE,
            appVersion = BuildConfig.VERSION_NAME,
            platform = "android",
            timezone = java.util.TimeZone.getDefault().id,
            language = java.util.Locale.getDefault().language
        )
    }
    
    /**
     * 检查网络连接
     */
    fun isNetworkAvailable(): Boolean {
        return networkMonitor.isCurrentlyOnline()
    }
    
    /**
     * 获取网络类型
     */
    fun getNetworkType(): com.mlexpress.customer.data.network.NetworkType {
        return networkMonitor.getCurrentNetworkType()
    }
    
    /**
     * 清除网络缓存
     */
    fun clearCache() {
        try {
            okHttpClient.cache?.evictAll()
            android.util.Log.d("NetworkManager", "Network cache cleared")
        } catch (e: Exception) {
            android.util.Log.e("NetworkManager", "Failed to clear cache", e)
        }
    }
    
    /**
     * 获取缓存大小
     */
    fun getCacheSize(): Long {
        return try {
            okHttpClient.cache?.size() ?: 0L
        } catch (e: Exception) {
            0L
        }
    }
    
    /**
     * 获取网络统计
     */
    fun getNetworkStats(): NetworkStats {
        return NetworkStats(
            cacheSize = getCacheSize(),
            cacheHitRate = 0.0f, // TODO: 实现缓存命中率统计
            requestCount = 0, // TODO: 实现请求计数
            errorCount = 0,   // TODO: 实现错误计数
            averageResponseTime = 0L // TODO: 实现响应时间统计
        )
    }
}

/**
 * 网络统计信息
 */
data class NetworkStats(
    val cacheSize: Long,
    val cacheHitRate: Float,
    val requestCount: Int,
    val errorCount: Int,
    val averageResponseTime: Long
)

/**
 * 网络请求结果包装器
 */
sealed class NetworkResult<out T> {
    data class Success<T>(val data: T) : NetworkResult<T>()
    data class Error(val message: String, val code: String? = null, val httpCode: Int? = null) : NetworkResult<Nothing>()
    data class Loading(val progress: Float? = null) : NetworkResult<Nothing>()
}

/**
 * 网络请求执行器
 */
class NetworkExecutor @Inject constructor(
    private val networkMonitor: NetworkMonitor
) {
    
    /**
     * 执行网络请求（带重试和缓存策略）
     */
    suspend fun <T> executeRequest(
        request: suspend () -> retrofit2.Response<ApiResponse<T>>,
        cacheKey: String? = null,
        forceRefresh: Boolean = false
    ): NetworkResult<T> {
        return try {
            // 检查网络状态
            if (!networkMonitor.isCurrentlyOnline() && cacheKey != null && !forceRefresh) {
                // 尝试从缓存获取
                // TODO: 实现缓存逻辑
                return NetworkResult.Error("Network unavailable and no cached data", "NETWORK_UNAVAILABLE")
            }
            
            val response = request()
            
            when {
                response.isSuccessful -> {
                    val body = response.body()
                    if (body?.success == true) {
                        body.data?.let { data ->
                            NetworkResult.Success(data)
                        } ?: NetworkResult.Error("Empty response data", "EMPTY_DATA")
                    } else {
                        val error = body?.error
                        NetworkResult.Error(
                            error?.message ?: "Unknown error",
                            error?.code,
                            response.code()
                        )
                    }
                }
                response.code() == 401 -> {
                    // Token过期，需要刷新
                    NetworkResult.Error("Authentication required", "UNAUTHORIZED", 401)
                }
                response.code() in 500..599 -> {
                    // 服务器错误
                    NetworkResult.Error("Server error", "SERVER_ERROR", response.code())
                }
                else -> {
                    NetworkResult.Error("Request failed", "REQUEST_FAILED", response.code())
                }
            }
        } catch (e: Exception) {
            android.util.Log.e("NetworkExecutor", "Request failed", e)
            
            when (e) {
                is java.net.UnknownHostException -> {
                    NetworkResult.Error("No internet connection", "NO_INTERNET")
                }
                is java.net.SocketTimeoutException -> {
                    NetworkResult.Error("Request timeout", "TIMEOUT")
                }
                is javax.net.ssl.SSLException -> {
                    NetworkResult.Error("SSL connection error", "SSL_ERROR")
                }
                else -> {
                    NetworkResult.Error(e.message ?: "Unknown network error", "NETWORK_ERROR")
                }
            }
        }
    }
    
    /**
     * 执行带缓存的请求
     */
    suspend fun <T> executeWithCache(
        request: suspend () -> retrofit2.Response<ApiResponse<T>>,
        cacheKey: String,
        cacheTtl: Long = 3600000L, // 1 hour
        forceRefresh: Boolean = false
    ): NetworkResult<T> {
        // TODO: 实现完整的缓存逻辑
        return executeRequest(request, cacheKey, forceRefresh)
    }
    
    /**
     * 执行离线队列请求
     */
    suspend fun <T> executeOfflineQueuedRequest(
        request: suspend () -> retrofit2.Response<ApiResponse<T>>,
        requestId: String,
        priority: Int = 0
    ): NetworkResult<T> {
        return if (networkMonitor.isCurrentlyOnline()) {
            executeRequest(request)
        } else {
            // 添加到离线队列
            // TODO: 实现离线队列逻辑
            NetworkResult.Error("Request queued for offline processing", "QUEUED")
        }
    }
}
