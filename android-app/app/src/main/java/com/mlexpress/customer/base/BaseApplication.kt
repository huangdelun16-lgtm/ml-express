package com.mlexpress.customer.base

import android.app.Application
import android.content.Context
import android.content.res.Configuration
import androidx.hilt.work.HiltWorkerFactory
import androidx.work.Configuration as WorkConfiguration
import androidx.work.WorkManager
import com.mlexpress.customer.utils.LanguageManager
import dagger.hilt.android.HiltAndroidApp
import kotlinx.coroutines.runBlocking
import javax.inject.Inject

@HiltAndroidApp
class BaseApplication : Application(), WorkConfiguration.Provider {

    @Inject
    lateinit var workerFactory: HiltWorkerFactory
    
    @Inject
    lateinit var languageManager: LanguageManager

    override fun onCreate() {
        super.onCreate()
        
        // 初始化语言设置
        initializeLanguage()
        
        // 初始化WorkManager
        WorkManager.initialize(this, workManagerConfiguration)
    }
    
    override fun attachBaseContext(base: Context) {
        // 在attach时应用语言设置
        val context = runBlocking {
            try {
                val languageManager = LanguageManager(base, 
                    com.mlexpress.customer.data.local.preferences.UserPreferences(base))
                val currentLanguage = languageManager.getCurrentLanguage()
                languageManager.applyLanguage(currentLanguage)
            } catch (e: Exception) {
                // 如果获取语言失败，使用默认中文
                base.setAppLanguage("zh")
            }
        }
        super.attachBaseContext(context)
    }
    
    override fun onConfigurationChanged(newConfig: Configuration) {
        super.onConfigurationChanged(newConfig)
        
        // 配置变更时重新应用语言设置
        runBlocking {
            try {
                val currentLanguage = languageManager.getCurrentLanguage()
                languageManager.applyLanguage(currentLanguage)
            } catch (e: Exception) {
                android.util.Log.e("BaseApplication", "Failed to apply language on config change", e)
            }
        }
    }

    override fun getWorkManagerConfiguration(): WorkConfiguration {
        return WorkConfiguration.Builder()
            .setWorkerFactory(workerFactory)
            .build()
    }
    
    private fun initializeLanguage() {
        runBlocking {
            try {
                val currentLanguage = languageManager.getCurrentLanguage()
                languageManager.applyLanguage(currentLanguage)
                
                android.util.Log.d("BaseApplication", "Language initialized: $currentLanguage")
            } catch (e: Exception) {
                android.util.Log.e("BaseApplication", "Failed to initialize language", e)
            }
        }
    }
}

/**
 * 语言感知的Activity基类
 */
abstract class BaseActivity : androidx.activity.ComponentActivity() {
    
    @Inject
    lateinit var languageManager: LanguageManager
    
    override fun attachBaseContext(newBase: Context) {
        val context = runBlocking {
            try {
                val currentLanguage = languageManager.getCurrentLanguage()
                languageManager.applyLanguage(currentLanguage)
            } catch (e: Exception) {
                newBase.setAppLanguage("zh")
            }
        }
        super.attachBaseContext(context)
    }
    
    override fun onResume() {
        super.onResume()
        
        // 检查语言是否需要更新
        runBlocking {
            try {
                val currentLanguage = languageManager.getCurrentLanguage()
                val contextLanguage = resources.configuration.locale.language
                
                if (currentLanguage != contextLanguage) {
                    // 语言设置已更改，重新创建Activity
                    recreate()
                }
            } catch (e: Exception) {
                android.util.Log.e("BaseActivity", "Failed to check language", e)
            }
        }
    }
}

/**
 * Context扩展函数 - 设置应用语言
 */
fun Context.setAppLanguage(languageCode: String): Context {
    val locale = when (languageCode) {
        "zh" -> java.util.Locale("zh", "CN")
        "en" -> java.util.Locale("en", "US")
        "my" -> java.util.Locale("my", "MM")
        else -> java.util.Locale("zh", "CN")
    }
    
    java.util.Locale.setDefault(locale)
    
    val configuration = Configuration(resources.configuration)
    
    return if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.N) {
        configuration.setLocale(locale)
        createConfigurationContext(configuration)
    } else {
        @Suppress("DEPRECATION")
        configuration.locale = locale
        resources.updateConfiguration(configuration, resources.displayMetrics)
        this
    }
}
