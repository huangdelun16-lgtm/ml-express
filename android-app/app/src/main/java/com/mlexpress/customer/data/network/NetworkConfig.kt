package com.mlexpress.customer.data.network

import com.mlexpress.customer.BuildConfig
import okhttp3.Interceptor
import okhttp3.Response
import java.io.IOException

/**
 * 网络配置常量
 */
object NetworkConfig {
    const val BASE_URL = BuildConfig.BASE_URL
    const val CONNECT_TIMEOUT = 30L
    const val READ_TIMEOUT = 30L
    const val WRITE_TIMEOUT = 30L
    
    // API版本
    const val API_VERSION = "v1"
    
    // 请求头
    const val HEADER_AUTHORIZATION = "Authorization"
    const val HEADER_CONTENT_TYPE = "Content-Type"
    const val HEADER_ACCEPT = "Accept"
    const val HEADER_USER_AGENT = "User-Agent"
    const val HEADER_APP_VERSION = "App-Version"
    const val HEADER_PLATFORM = "Platform"
    const val HEADER_DEVICE_ID = "Device-ID"
    const val HEADER_REQUEST_ID = "Request-ID"
    
    // 内容类型
    const val CONTENT_TYPE_JSON = "application/json"
    const val CONTENT_TYPE_FORM = "application/x-www-form-urlencoded"
    const val CONTENT_TYPE_MULTIPART = "multipart/form-data"
    
    // 缓存配置
    const val CACHE_SIZE = 10 * 1024 * 1024L // 10MB
    const val CACHE_MAX_AGE = 60 * 60 // 1 hour
    const val CACHE_MAX_STALE = 60 * 60 * 24 * 7 // 1 week
    
    // 重试配置
    const val MAX_RETRY_COUNT = 3
    const val RETRY_DELAY_MS = 1000L
    const val RETRY_BACKOFF_MULTIPLIER = 2.0
}

/**
 * 网络请求拦截器 - 添加通用请求头
 */
class HeaderInterceptor(
    private val userAgent: String,
    private val appVersion: String,
    private val deviceId: String
) : Interceptor {
    
    override fun intercept(chain: Interceptor.Chain): Response {
        val originalRequest = chain.request()
        
        val requestBuilder = originalRequest.newBuilder()
            .addHeader(NetworkConfig.HEADER_CONTENT_TYPE, NetworkConfig.CONTENT_TYPE_JSON)
            .addHeader(NetworkConfig.HEADER_ACCEPT, NetworkConfig.CONTENT_TYPE_JSON)
            .addHeader(NetworkConfig.HEADER_USER_AGENT, userAgent)
            .addHeader(NetworkConfig.HEADER_APP_VERSION, appVersion)
            .addHeader(NetworkConfig.HEADER_PLATFORM, "Android")
            .addHeader(NetworkConfig.HEADER_DEVICE_ID, deviceId)
            .addHeader(NetworkConfig.HEADER_REQUEST_ID, generateRequestId())
        
        return chain.proceed(requestBuilder.build())
    }
    
    private fun generateRequestId(): String {
        return "req_${System.currentTimeMillis()}_${(1000..9999).random()}"
    }
}

/**
 * 认证拦截器 - 自动添加JWT Token
 */
class AuthInterceptor(
    private val tokenProvider: suspend () -> String?
) : Interceptor {
    
    override fun intercept(chain: Interceptor.Chain): Response {
        val originalRequest = chain.request()
        
        // 获取token（这里需要在协程中调用，实际使用时需要处理）
        val token = runBlocking { tokenProvider() }
        
        val requestBuilder = originalRequest.newBuilder()
        
        if (!token.isNullOrEmpty()) {
            requestBuilder.addHeader(NetworkConfig.HEADER_AUTHORIZATION, "Bearer $token")
        }
        
        return chain.proceed(requestBuilder.build())
    }
}

/**
 * 缓存拦截器 - 智能缓存策略
 */
class CacheInterceptor(
    private val networkMonitor: NetworkMonitor
) : Interceptor {
    
    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request()
        
        // 根据网络状态调整缓存策略
        val cacheControl = if (networkMonitor.isCurrentlyOnline()) {
            // 在线时：优先网络，缓存1小时
            "public, max-age=${NetworkConfig.CACHE_MAX_AGE}"
        } else {
            // 离线时：使用缓存，最多7天
            "public, only-if-cached, max-stale=${NetworkConfig.CACHE_MAX_STALE}"
        }
        
        val newRequest = request.newBuilder()
            .addHeader("Cache-Control", cacheControl)
            .build()
        
        return chain.proceed(newRequest)
    }
}

/**
 * 重试拦截器 - 自动重试失败请求
 */
class RetryInterceptor(
    private val networkMonitor: NetworkMonitor
) : Interceptor {
    
    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request()
        var response: Response? = null
        var exception: IOException? = null
        
        var retryCount = 0
        
        while (retryCount <= NetworkConfig.MAX_RETRY_COUNT) {
            try {
                response?.close() // Close previous response
                response = chain.proceed(request)
                
                // 检查响应是否成功
                if (response.isSuccessful) {
                    return response
                }
                
                // 检查是否应该重试
                if (!shouldRetry(response.code, retryCount)) {
                    return response
                }
                
            } catch (e: IOException) {
                exception = e
                
                // 检查网络状态
                if (!networkMonitor.isCurrentlyOnline()) {
                    throw e
                }
                
                if (!shouldRetryOnException(e, retryCount)) {
                    throw e
                }
            }
            
            retryCount++
            
            if (retryCount <= NetworkConfig.MAX_RETRY_COUNT) {
                val delay = calculateRetryDelay(retryCount)
                Thread.sleep(delay)
                
                android.util.Log.d("RetryInterceptor", "Retrying request (attempt $retryCount): ${request.url}")
            }
        }
        
        // 如果所有重试都失败了
        response?.let { return it }
        exception?.let { throw it }
        
        throw IOException("Max retry attempts exceeded")
    }
    
    private fun shouldRetry(responseCode: Int, retryCount: Int): Boolean {
        return retryCount < NetworkConfig.MAX_RETRY_COUNT && when (responseCode) {
            // 可重试的HTTP状态码
            408, // Request Timeout
            429, // Too Many Requests
            500, // Internal Server Error
            502, // Bad Gateway
            503, // Service Unavailable
            504  // Gateway Timeout
            -> true
            else -> false
        }
    }
    
    private fun shouldRetryOnException(exception: IOException, retryCount: Int): Boolean {
        return retryCount < NetworkConfig.MAX_RETRY_COUNT && when {
            exception is java.net.SocketTimeoutException -> true
            exception is java.net.ConnectException -> true
            exception is java.net.UnknownHostException -> false // DNS问题不重试
            exception.message?.contains("timeout", ignoreCase = true) == true -> true
            else -> false
        }
    }
    
    private fun calculateRetryDelay(retryCount: Int): Long {
        return (NetworkConfig.RETRY_DELAY_MS * 
                Math.pow(NetworkConfig.RETRY_BACKOFF_MULTIPLIER, retryCount.toDouble())).toLong()
    }
}

/**
 * 错误处理拦截器 - 统一错误处理
 */
class ErrorHandlingInterceptor : Interceptor {
    
    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request()
        
        try {
            val response = chain.proceed(request)
            
            // 记录API调用日志
            logApiCall(request, response)
            
            return response
        } catch (e: Exception) {
            // 记录错误日志
            logApiError(request, e)
            throw e
        }
    }
    
    private fun logApiCall(request: okhttp3.Request, response: Response) {
        if (BuildConfig.DEBUG) {
            val url = request.url.toString()
            val method = request.method
            val responseCode = response.code
            val responseTime = response.receivedResponseAtMillis - response.sentRequestAtMillis
            
            android.util.Log.d("API", "$method $url -> $responseCode (${responseTime}ms)")
        }
    }
    
    private fun logApiError(request: okhttp3.Request, exception: Exception) {
        val url = request.url.toString()
        val method = request.method
        
        android.util.Log.e("API", "$method $url -> Error: ${exception.message}", exception)
    }
}
