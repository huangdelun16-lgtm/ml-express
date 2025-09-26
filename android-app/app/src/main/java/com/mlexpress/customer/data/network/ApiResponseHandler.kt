package com.mlexpress.customer.data.network

import com.mlexpress.customer.data.remote.dto.ApiResponse
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import retrofit2.Response
import javax.inject.Inject
import javax.inject.Singleton

/**
 * API响应统一处理器
 */
@Singleton
class ApiResponseHandler @Inject constructor(
    private val networkMonitor: NetworkMonitor,
    private val requestCacheManager: RequestCacheManager,
    private val offlineQueueManager: OfflineQueueManager
) {
    
    /**
     * 处理API响应
     */
    suspend fun <T> handleResponse(
        response: Response<ApiResponse<T>>,
        cacheKey: String? = null,
        cacheTtl: Long = 3600000L
    ): NetworkResult<T> {
        return try {
            when {
                response.isSuccessful -> {
                    val body = response.body()
                    when {
                        body == null -> {
                            NetworkResult.Error("Empty response body", "EMPTY_BODY", response.code())
                        }
                        body.success -> {
                            val data = body.data
                            if (data != null) {
                                // 缓存成功响应
                                cacheKey?.let { key ->
                                    requestCacheManager.cacheResponse(
                                        key, 
                                        response.raw().body?.string() ?: "",
                                        cacheTtl
                                    )
                                }
                                NetworkResult.Success(data)
                            } else {
                                NetworkResult.Error("Empty response data", "EMPTY_DATA", response.code())
                            }
                        }
                        else -> {
                            val error = body.error
                            NetworkResult.Error(
                                error?.message ?: "API request failed",
                                error?.code ?: "API_ERROR",
                                response.code()
                            )
                        }
                    }
                }
                response.code() == 401 -> {
                    NetworkResult.Error("Authentication required", "UNAUTHORIZED", 401)
                }
                response.code() == 403 -> {
                    NetworkResult.Error("Access forbidden", "FORBIDDEN", 403)
                }
                response.code() == 404 -> {
                    NetworkResult.Error("Resource not found", "NOT_FOUND", 404)
                }
                response.code() == 429 -> {
                    NetworkResult.Error("Too many requests", "RATE_LIMITED", 429)
                }
                response.code() in 500..599 -> {
                    NetworkResult.Error("Server error", "SERVER_ERROR", response.code())
                }
                else -> {
                    NetworkResult.Error("Request failed", "REQUEST_FAILED", response.code())
                }
            }
        } catch (e: Exception) {
            android.util.Log.e("ApiResponseHandler", "Failed to handle response", e)
            NetworkResult.Error(e.message ?: "Response handling failed", "HANDLER_ERROR")
        }
    }
    
    /**
     * 执行带缓存的API请求
     */
    suspend fun <T> executeWithCache(
        cacheKey: String,
        cacheTtl: Long = 3600000L,
        forceRefresh: Boolean = false,
        apiCall: suspend () -> Response<ApiResponse<T>>
    ): NetworkResult<T> {
        return try {
            // 检查缓存（如果不强制刷新）
            if (!forceRefresh) {
                val cachedData = getCachedData<T>(cacheKey)
                if (cachedData != null) {
                    android.util.Log.d("ApiResponseHandler", "Cache hit: $cacheKey")
                    return NetworkResult.Success(cachedData)
                }
            }
            
            // 检查网络状态
            if (!networkMonitor.isCurrentlyOnline()) {
                // 离线模式：尝试获取缓存数据
                val cachedData = getCachedData<T>(cacheKey)
                return if (cachedData != null) {
                    android.util.Log.d("ApiResponseHandler", "Offline cache hit: $cacheKey")
                    NetworkResult.Success(cachedData)
                } else {
                    NetworkResult.Error("No internet connection and no cached data", "OFFLINE_NO_CACHE")
                }
            }
            
            // 执行网络请求
            val response = apiCall()
            val result = handleResponse(response, cacheKey, cacheTtl)
            
            // 记录API调用统计
            recordApiCall(cacheKey, result is NetworkResult.Success)
            
            result
        } catch (e: Exception) {
            android.util.Log.e("ApiResponseHandler", "API call failed: $cacheKey", e)
            
            // 尝试返回缓存数据作为降级方案
            val cachedData = getCachedData<T>(cacheKey)
            if (cachedData != null) {
                android.util.Log.w("ApiResponseHandler", "Returning cached data due to error: $cacheKey")
                NetworkResult.Success(cachedData)
            } else {
                NetworkResult.Error(e.message ?: "API call failed", "API_EXCEPTION")
            }
        }
    }
    
    /**
     * 执行可离线队列的请求
     */
    suspend fun <T> executeWithOfflineQueue(
        url: String,
        method: String,
        headers: Map<String, String> = emptyMap(),
        body: String? = null,
        priority: Int = 0,
        apiCall: suspend () -> Response<ApiResponse<T>>
    ): NetworkResult<T> {
        return try {
            if (networkMonitor.isCurrentlyOnline()) {
                // 在线：直接执行请求
                val response = apiCall()
                handleResponse(response)
            } else {
                // 离线：添加到队列
                val requestId = offlineQueueManager.enqueueRequest(
                    url = url,
                    method = method,
                    headers = headers,
                    body = body,
                    priority = priority
                )
                
                android.util.Log.d("ApiResponseHandler", "Request queued for offline processing: $requestId")
                NetworkResult.Error("Request queued for offline processing", "QUEUED")
            }
        } catch (e: Exception) {
            android.util.Log.e("ApiResponseHandler", "Failed to execute with offline queue", e)
            NetworkResult.Error(e.message ?: "Request failed", "REQUEST_EXCEPTION")
        }
    }
    
    /**
     * 批量执行API请求
     */
    fun <T> executeBatch(
        requests: List<suspend () -> Response<ApiResponse<T>>>,
        concurrency: Int = 3
    ): Flow<NetworkResult<T>> = flow {
        try {
            val semaphore = kotlinx.coroutines.sync.Semaphore(concurrency)
            
            requests.map { request ->
                async {
                    semaphore.withPermit {
                        try {
                            val response = request()
                            handleResponse(response)
                        } catch (e: Exception) {
                            NetworkResult.Error(e.message ?: "Batch request failed", "BATCH_ERROR")
                        }
                    }
                }
            }.forEach { deferred ->
                emit(deferred.await())
            }
        } catch (e: Exception) {
            emit(NetworkResult.Error(e.message ?: "Batch execution failed", "BATCH_EXCEPTION"))
        }
    }
    
    private suspend fun <T> getCachedData(cacheKey: String): T? {
        return try {
            val cachedResponse = requestCacheManager.getCachedResponse(cacheKey)
            if (cachedResponse != null) {
                // TODO: 反序列化缓存数据
                // 这里需要根据具体类型进行反序列化
                null
            } else {
                null
            }
        } catch (e: Exception) {
            android.util.Log.e("ApiResponseHandler", "Failed to get cached data: $cacheKey", e)
            null
        }
    }
    
    private fun recordApiCall(endpoint: String, success: Boolean) {
        try {
            // TODO: 实现API调用统计
            android.util.Log.v("ApiResponseHandler", "API call recorded: $endpoint -> $success")
        } catch (e: Exception) {
            android.util.Log.e("ApiResponseHandler", "Failed to record API call", e)
        }
    }
}

/**
 * API调用扩展函数
 */
suspend inline fun <T> safeApiCall(
    crossinline apiCall: suspend () -> Response<ApiResponse<T>>
): NetworkResult<T> {
    return try {
        val response = apiCall()
        
        when {
            response.isSuccessful -> {
                val body = response.body()
                if (body?.success == true && body.data != null) {
                    NetworkResult.Success(body.data)
                } else {
                    val error = body?.error
                    NetworkResult.Error(
                        error?.message ?: "Unknown error",
                        error?.code ?: "UNKNOWN_ERROR",
                        response.code()
                    )
                }
            }
            else -> {
                NetworkResult.Error(
                    "HTTP ${response.code()}: ${response.message()}",
                    "HTTP_ERROR",
                    response.code()
                )
            }
        }
    } catch (e: Exception) {
        android.util.Log.e("SafeApiCall", "API call failed", e)
        
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
                NetworkResult.Error(e.message ?: "Network error", "NETWORK_ERROR")
            }
        }
    }
}

/**
 * 流式API调用（支持进度回调）
 */
suspend fun <T> flowApiCall(
    apiCall: suspend () -> Response<ApiResponse<T>>,
    onProgress: (Float) -> Unit = {}
): Flow<NetworkResult<T>> = flow {
    try {
        emit(NetworkResult.Loading(0.0f))
        onProgress(0.0f)
        
        emit(NetworkResult.Loading(0.5f))
        onProgress(0.5f)
        
        val response = apiCall()
        
        emit(NetworkResult.Loading(1.0f))
        onProgress(1.0f)
        
        val result = when {
            response.isSuccessful -> {
                val body = response.body()
                if (body?.success == true && body.data != null) {
                    NetworkResult.Success(body.data)
                } else {
                    val error = body?.error
                    NetworkResult.Error(
                        error?.message ?: "Unknown error",
                        error?.code ?: "UNKNOWN_ERROR",
                        response.code()
                    )
                }
            }
            else -> {
                NetworkResult.Error(
                    "HTTP ${response.code()}: ${response.message()}",
                    "HTTP_ERROR",
                    response.code()
                )
            }
        }
        
        emit(result)
    } catch (e: Exception) {
        emit(NetworkResult.Error(e.message ?: "Network error", "NETWORK_ERROR"))
    }
}
