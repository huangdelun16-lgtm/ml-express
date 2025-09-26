package com.myanmarexpress.app.data.repository

import com.myanmarexpress.app.data.api.*
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

class CloudRepository private constructor(
    private val apiService: GoogleCloudApiService
) {

    companion object {
        @Volatile
        private var _instance: CloudRepository? = null

        val instance: CloudRepository?
            get() = _instance

        fun initialize(
            baseUrl: String,
            authTokenProvider: (() -> String?)? = null,
            enableLogging: Boolean = true
        ) {
            if (_instance != null) return

            synchronized(this) {
                if (_instance == null) {
                    val clientBuilder = OkHttpClient.Builder()
                        .connectTimeout(30, TimeUnit.SECONDS)
                        .readTimeout(30, TimeUnit.SECONDS)
                        .writeTimeout(30, TimeUnit.SECONDS)
                        .addInterceptor { chain ->
                            val original = chain.request()
                            val requestBuilder = original.newBuilder()
                                .header("Accept", "application/json")
                                .header("Content-Type", "application/json")

                            val token = authTokenProvider?.invoke()
                            if (!token.isNullOrBlank()) {
                                requestBuilder.header("Authorization", "Bearer $token")
                            }

                            chain.proceed(requestBuilder.build())
                        }

                    if (enableLogging) {
                        val loggingInterceptor = HttpLoggingInterceptor().apply {
                            level = HttpLoggingInterceptor.Level.BODY
                        }
                        clientBuilder.addInterceptor(loggingInterceptor)
                    }

                    val retrofit = Retrofit.Builder()
                        .baseUrl(baseUrl)
                        .client(clientBuilder.build())
                        .addConverterFactory(GsonConverterFactory.create())
                        .build()

                    val api = retrofit.create(GoogleCloudApiService::class.java)
                    _instance = CloudRepository(api)
                }
            }
        }

        fun requireInstance(): CloudRepository {
            return _instance ?: throw IllegalStateException("CloudRepository 未初始化，请先调用 initialize()")
        }
    }

    suspend fun syncWithGoogleCloud(): Result<String> {
        return try {
            // 连接到Google Cloud项目
            val response = apiService.getOrders()

            if (response.isSuccessful && response.body()?.success == true) {
                Result.success("成功连接到Google Cloud ML-EXPRESS项目")
            } else {
                Result.failure(Exception("连接失败: ${response.body()?.error?.message}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun createOrderInCloud(orderData: CreateOrderDto): Result<OrderDto> {
        return try {
            val response = apiService.createOrder(orderData)

            if (response.isSuccessful && response.body()?.success == true) {
                val order = response.body()?.data
                if (order != null) {
                    Result.success(order)
                } else {
                    Result.failure(Exception("订单数据为空"))
                }
            } else {
                Result.failure(Exception("创建订单失败: ${response.body()?.error?.message}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun getOrdersFromCloud(): Result<List<OrderDto>> {
        return try {
            val response = apiService.getOrders()

            if (response.isSuccessful && response.body()?.success == true) {
                val orders = response.body()?.data ?: emptyList()
                Result.success(orders)
            } else {
                Result.failure(Exception("获取订单失败: ${response.body()?.error?.message}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getCourierTasks(courierId: String): Result<List<CourierTaskDto>> {
        return try {
            val response = apiService.getCourierTasks(courierId)

            if (response.isSuccessful && response.body()?.success == true) {
                Result.success(response.body()?.data ?: emptyList())
            } else {
                Result.failure(Exception("获取骑手任务失败: ${response.body()?.error?.message}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun updateCourierTaskStatus(
        courierId: String,
        taskId: String,
        status: CourierTaskStatusDto
    ): Result<CourierTaskDto> {
        return try {
            val response = apiService.updateCourierTaskStatus(courierId, taskId, status)

            if (response.isSuccessful && response.body()?.success == true) {
                val task = response.body()?.data
                if (task != null) {
                    Result.success(task)
                } else {
                    Result.failure(Exception("任务数据为空"))
                }
            } else {
                Result.failure(Exception("更新任务失败: ${response.body()?.error?.message}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun uploadCourierLocation(
        courierId: String,
        location: CourierLocationDto
    ): Result<Unit> {
        return try {
            val response = apiService.uploadCourierLocation(courierId, location)

            if (response.isSuccessful && response.body()?.success == true) {
                Result.success(Unit)
            } else {
                Result.failure(Exception("上传位置失败: ${response.body()?.error?.message}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getCourierStats(courierId: String): Result<CourierStatsDto> {
        return try {
            val response = apiService.getCourierStats(courierId)

            if (response.isSuccessful && response.body()?.success == true) {
                val stats = response.body()?.data
                if (stats != null) {
                    Result.success(stats)
                } else {
                    Result.failure(Exception("统计数据为空"))
                }
            } else {
                Result.failure(Exception("获取统计失败: ${response.body()?.error?.message}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}

