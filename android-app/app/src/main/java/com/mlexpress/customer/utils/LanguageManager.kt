package com.mlexpress.customer.utils

import android.content.Context
import android.content.res.Configuration
import android.os.Build
import com.mlexpress.customer.data.local.preferences.UserPreferences
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.first
import java.util.*
import javax.inject.Inject
import javax.inject.Singleton

/**
 * 语言管理器
 */
@Singleton
class LanguageManager @Inject constructor(
    @ApplicationContext private val context: Context,
    private val userPreferences: UserPreferences
) {
    
    companion object {
        const val LANGUAGE_CHINESE = "zh"
        const val LANGUAGE_ENGLISH = "en"
        const val LANGUAGE_MYANMAR = "my"
        
        const val COUNTRY_CHINA = "CN"
        const val COUNTRY_US = "US"
        const val COUNTRY_MYANMAR = "MM"
    }
    
    /**
     * 获取支持的语言列表
     */
    fun getSupportedLanguages(): List<LanguageOption> {
        return listOf(
            LanguageOption(
                code = LANGUAGE_CHINESE,
                name = "中文",
                nativeName = "中文",
                country = COUNTRY_CHINA,
                isDefault = true
            ),
            LanguageOption(
                code = LANGUAGE_ENGLISH,
                name = "English",
                nativeName = "English",
                country = COUNTRY_US,
                isDefault = false
            ),
            LanguageOption(
                code = LANGUAGE_MYANMAR,
                name = "缅甸语",
                nativeName = "မြန်မာ",
                country = COUNTRY_MYANMAR,
                isDefault = false
            )
        )
    }
    
    /**
     * 获取当前语言
     */
    suspend fun getCurrentLanguage(): String {
        return try {
            userPreferences.getLanguage().first()
        } catch (e: Exception) {
            getSystemLanguage()
        }
    }
    
    /**
     * 设置应用语言
     */
    suspend fun setLanguage(languageCode: String): Boolean {
        return try {
            if (isLanguageSupported(languageCode)) {
                userPreferences.setLanguage(languageCode)
                applyLanguage(languageCode)
                true
            } else {
                false
            }
        } catch (e: Exception) {
            android.util.Log.e("LanguageManager", "Failed to set language: $languageCode", e)
            false
        }
    }
    
    /**
     * 应用语言设置
     */
    fun applyLanguage(languageCode: String): Context {
        val locale = createLocale(languageCode)
        return updateContextLocale(context, locale)
    }
    
    /**
     * 获取系统语言
     */
    private fun getSystemLanguage(): String {
        val systemLocale = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            context.resources.configuration.locales[0]
        } else {
            @Suppress("DEPRECATION")
            context.resources.configuration.locale
        }
        
        return when (systemLocale.language) {
            LANGUAGE_CHINESE -> LANGUAGE_CHINESE
            LANGUAGE_ENGLISH -> LANGUAGE_ENGLISH
            LANGUAGE_MYANMAR -> LANGUAGE_MYANMAR
            else -> LANGUAGE_CHINESE // 默认中文
        }
    }
    
    /**
     * 检查语言是否支持
     */
    private fun isLanguageSupported(languageCode: String): Boolean {
        return getSupportedLanguages().any { it.code == languageCode }
    }
    
    /**
     * 创建Locale对象
     */
    private fun createLocale(languageCode: String): Locale {
        return when (languageCode) {
            LANGUAGE_CHINESE -> Locale(LANGUAGE_CHINESE, COUNTRY_CHINA)
            LANGUAGE_ENGLISH -> Locale(LANGUAGE_ENGLISH, COUNTRY_US)
            LANGUAGE_MYANMAR -> Locale(LANGUAGE_MYANMAR, COUNTRY_MYANMAR)
            else -> Locale(LANGUAGE_CHINESE, COUNTRY_CHINA)
        }
    }
    
    /**
     * 更新Context的Locale
     */
    private fun updateContextLocale(context: Context, locale: Locale): Context {
        Locale.setDefault(locale)
        
        val configuration = Configuration(context.resources.configuration)
        
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            configuration.setLocale(locale)
            context.createConfigurationContext(configuration)
        } else {
            @Suppress("DEPRECATION")
            configuration.locale = locale
            context.resources.updateConfiguration(configuration, context.resources.displayMetrics)
            context
        }
    }
    
    /**
     * 获取本地化字符串
     */
    fun getLocalizedString(context: Context, resId: Int, vararg formatArgs: Any): String {
        return try {
            if (formatArgs.isNotEmpty()) {
                context.getString(resId, *formatArgs)
            } else {
                context.getString(resId)
            }
        } catch (e: Exception) {
            android.util.Log.e("LanguageManager", "Failed to get localized string", e)
            "String not found"
        }
    }
    
    /**
     * 获取语言显示名称
     */
    fun getLanguageDisplayName(languageCode: String): String {
        return getSupportedLanguages()
            .find { it.code == languageCode }
            ?.nativeName ?: languageCode
    }
    
    /**
     * 获取当前语言的方向（LTR/RTL）
     */
    fun getLanguageDirection(languageCode: String): Int {
        return when (languageCode) {
            // 所有支持的语言都是从左到右
            LANGUAGE_CHINESE, LANGUAGE_ENGLISH, LANGUAGE_MYANMAR -> 
                android.view.View.LAYOUT_DIRECTION_LTR
            else -> android.view.View.LAYOUT_DIRECTION_LTR
        }
    }
    
    /**
     * 格式化货币
     */
    fun formatCurrency(amount: Double, languageCode: String = LANGUAGE_CHINESE): String {
        return when (languageCode) {
            LANGUAGE_CHINESE -> "${amount.toInt()} 缅币"
            LANGUAGE_ENGLISH -> "${amount.toInt()} MMK"
            LANGUAGE_MYANMAR -> "${amount.toInt()} ကျပ်"
            else -> "${amount.toInt()} MMK"
        }
    }
    
    /**
     * 格式化日期
     */
    fun formatDate(timestamp: Long, languageCode: String = LANGUAGE_CHINESE): String {
        val locale = createLocale(languageCode)
        val formatter = when (languageCode) {
            LANGUAGE_CHINESE -> java.text.SimpleDateFormat("yyyy年MM月dd日 HH:mm", locale)
            LANGUAGE_ENGLISH -> java.text.SimpleDateFormat("MMM dd, yyyy HH:mm", locale)
            LANGUAGE_MYANMAR -> java.text.SimpleDateFormat("dd/MM/yyyy HH:mm", locale)
            else -> java.text.SimpleDateFormat("yyyy-MM-dd HH:mm", locale)
        }
        
        return formatter.format(Date(timestamp))
    }
    
    /**
     * 格式化距离
     */
    fun formatDistance(distanceKm: Double, languageCode: String = LANGUAGE_CHINESE): String {
        return when (languageCode) {
            LANGUAGE_CHINESE -> "${String.format("%.1f", distanceKm)} 公里"
            LANGUAGE_ENGLISH -> "${String.format("%.1f", distanceKm)} km"
            LANGUAGE_MYANMAR -> "${String.format("%.1f", distanceKm)} ကီလိုမီတာ"
            else -> "${String.format("%.1f", distanceKm)} km"
        }
    }
    
    /**
     * 格式化重量
     */
    fun formatWeight(weightKg: Double, languageCode: String = LANGUAGE_CHINESE): String {
        return when (languageCode) {
            LANGUAGE_CHINESE -> "${String.format("%.1f", weightKg)} 公斤"
            LANGUAGE_ENGLISH -> "${String.format("%.1f", weightKg)} kg"
            LANGUAGE_MYANMAR -> "${String.format("%.1f", weightKg)} ကီလိုဂရမ်"
            else -> "${String.format("%.1f", weightKg)} kg"
        }
    }
}

/**
 * 语言选项数据类
 */
data class LanguageOption(
    val code: String,
    val name: String,
    val nativeName: String,
    val country: String,
    val isDefault: Boolean = false
)

/**
 * 语言切换扩展函数
 */
fun Context.setAppLanguage(languageCode: String): Context {
    val locale = when (languageCode) {
        LanguageManager.LANGUAGE_CHINESE -> Locale(LanguageManager.LANGUAGE_CHINESE, LanguageManager.COUNTRY_CHINA)
        LanguageManager.LANGUAGE_ENGLISH -> Locale(LanguageManager.LANGUAGE_ENGLISH, LanguageManager.COUNTRY_US)
        LanguageManager.LANGUAGE_MYANMAR -> Locale(LanguageManager.LANGUAGE_MYANMAR, LanguageManager.COUNTRY_MYANMAR)
        else -> Locale(LanguageManager.LANGUAGE_CHINESE, LanguageManager.COUNTRY_CHINA)
    }
    
    Locale.setDefault(locale)
    
    val configuration = Configuration(resources.configuration)
    
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
        configuration.setLocale(locale)
        createConfigurationContext(configuration)
    } else {
        @Suppress("DEPRECATION")
        configuration.locale = locale
        resources.updateConfiguration(configuration, resources.displayMetrics)
        this
    }
}
