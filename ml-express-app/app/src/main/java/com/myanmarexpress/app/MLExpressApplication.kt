package com.myanmarexpress.app

import android.app.Application
import android.util.Log
import com.myanmarexpress.app.data.repository.CloudRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

class MLExpressApplication : Application() {

    private val applicationScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    override fun onCreate() {
        super.onCreate()

        // 初始化 Google Cloud API 客户端
        CloudRepository.initialize(
            baseUrl = "https://ml-express-473205.appspot.com/api/",
            authTokenProvider = { null }
        )

        // 应用启动时验证与 Google Cloud 的连接
        applicationScope.launch {
            CloudRepository.instance?.syncWithGoogleCloud()
                ?.onSuccess {
                    Log.i("MLExpress", "已连接到 Google Cloud ML-EXPRESS 项目")
                }
                ?.onFailure {
                    Log.e("MLExpress", "Google Cloud 同步失败", it)
                }
        }
    }
}

