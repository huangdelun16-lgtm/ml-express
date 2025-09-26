# ML Express 多语言配置指南

## 概述

ML Express应用支持完整的中英文双语切换，并预留了缅甸语支持。本文档详细说明了多语言配置的实现方案和使用方法。

## 🌍 支持的语言

### 1. 中文 (zh-CN) - 默认语言
- **语言代码**: `zh`
- **国家代码**: `CN`
- **显示名称**: 中文
- **本地名称**: 中文
- **状态**: ✅ 完全支持

### 2. 英文 (en-US)
- **语言代码**: `en`
- **国家代码**: `US`
- **显示名称**: English
- **本地名称**: English
- **状态**: ✅ 完全支持

### 3. 缅甸语 (my-MM) - 预留支持
- **语言代码**: `my`
- **国家代码**: `MM`
- **显示名称**: မြန်မာ
- **本地名称**: မြန်မာ
- **状态**: ✅ 基础支持（可扩展）

## 📁 语言资源文件结构

```
app/src/main/res/
├── values/                    # 默认资源（中文）
│   └── strings.xml
├── values-en/                 # 英文资源
│   └── strings.xml
└── values-my/                 # 缅甸语资源
    └── strings.xml
```

### 字符串资源示例

#### **默认中文 (values/strings.xml)**
```xml
<string name="app_name">缅甸快递</string>
<string name="login">登录</string>
<string name="order_now">立即下单</string>
<string name="nav_home">首页</string>
<string name="nav_orders">订单</string>
```

#### **英文 (values-en/strings.xml)**
```xml
<string name="app_name">Myanmar Express</string>
<string name="login">Login</string>
<string name="order_now">Order Now</string>
<string name="nav_home">Home</string>
<string name="nav_orders">Orders</string>
```

#### **缅甸语 (values-my/strings.xml)**
```xml
<string name="app_name">မြန်မာ့ပို့ဆောင်ရေး</string>
<string name="login">ဝင်ရောက်</string>
<string name="order_now">ယခုပဲမှာ</string>
<string name="nav_home">ပင်မ</string>
<string name="nav_orders">အမှာစာများ</string>
```

## 🔧 语言管理系统

### 1. LanguageManager 核心类

```kotlin
@Singleton
class LanguageManager @Inject constructor(
    @ApplicationContext private val context: Context,
    private val userPreferences: UserPreferences
) {
    
    // 支持的语言列表
    fun getSupportedLanguages(): List<LanguageOption> {
        return listOf(
            LanguageOption("zh", "中文", "中文", "CN", true),
            LanguageOption("en", "English", "English", "US", false),
            LanguageOption("my", "缅甸语", "မြန်မာ", "MM", false)
        )
    }
    
    // 设置语言
    suspend fun setLanguage(languageCode: String): Boolean
    
    // 获取当前语言
    suspend fun getCurrentLanguage(): String
    
    // 应用语言设置
    fun applyLanguage(languageCode: String): Context
}
```

### 2. 语言切换UI组件

```kotlin
@Composable
fun LanguageSettingsScreen(
    navController: NavController,
    viewModel: LanguageSettingsViewModel = hiltViewModel()
) {
    // 语言选择界面
    // 支持实时预览
    // 重启应用提示
}
```

### 3. Application级别集成

```kotlin
@HiltAndroidApp
class BaseApplication : Application() {
    
    @Inject
    lateinit var languageManager: LanguageManager
    
    override fun attachBaseContext(base: Context) {
        // 在应用启动时应用语言设置
        val context = runBlocking {
            val currentLanguage = languageManager.getCurrentLanguage()
            languageManager.applyLanguage(currentLanguage)
        }
        super.attachBaseContext(context)
    }
}
```

## 🎯 语言切换功能

### 1. 语言选择界面

#### **功能特性**
- ✅ **可视化选择**: 国旗图标 + 本地名称显示
- ✅ **当前语言标识**: 清晰显示当前选中语言
- ✅ **即时反馈**: 选择后立即显示切换状态
- ✅ **重启提示**: 提示用户重启应用以应用更改

#### **界面设计**
```
┌─────────────────────────────────────┐
│ 🌐 语言设置                          │
├─────────────────────────────────────┤
│ 📍 当前语言: 中文                    │
├─────────────────────────────────────┤
│ 🇨🇳 中文        ✓                   │
│ 🇺🇸 English                         │
│ 🇲🇲 မြန်မာ                          │
├─────────────────────────────────────┤
│ ℹ️ 语言切换成功                      │
│   请重启应用以应用更改               │
│   [🔄 重启应用]                     │
└─────────────────────────────────────┘
```

### 2. 语言切换流程

```
用户选择语言 → 保存到DataStore → 应用Context更新 → 
显示重启提示 → 用户确认重启 → 重启应用 → 新语言生效
```

### 3. 自动语言检测

```kotlin
// 系统语言检测
private fun getSystemLanguage(): String {
    val systemLocale = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
        context.resources.configuration.locales[0]
    } else {
        context.resources.configuration.locale
    }
    
    return when (systemLocale.language) {
        "zh" -> "zh"
        "en" -> "en"
        "my" -> "my"
        else -> "zh" // 默认中文
    }
}
```

## 📱 本地化格式化

### 1. 货币格式化

```kotlin
fun formatCurrency(amount: Double, languageCode: String): String {
    return when (languageCode) {
        "zh" -> "${amount.toInt()} 缅币"
        "en" -> "${amount.toInt()} MMK"
        "my" -> "${amount.toInt()} ကျပ်"
        else -> "${amount.toInt()} MMK"
    }
}
```

### 2. 日期时间格式化

```kotlin
fun formatDate(timestamp: Long, languageCode: String): String {
    val locale = createLocale(languageCode)
    val formatter = when (languageCode) {
        "zh" -> SimpleDateFormat("yyyy年MM月dd日 HH:mm", locale)
        "en" -> SimpleDateFormat("MMM dd, yyyy HH:mm", locale)
        "my" -> SimpleDateFormat("dd/MM/yyyy HH:mm", locale)
        else -> SimpleDateFormat("yyyy-MM-dd HH:mm", locale)
    }
    return formatter.format(Date(timestamp))
}
```

### 3. 距离和重量格式化

```kotlin
// 距离格式化
fun formatDistance(distanceKm: Double, languageCode: String): String {
    return when (languageCode) {
        "zh" -> "${String.format("%.1f", distanceKm)} 公里"
        "en" -> "${String.format("%.1f", distanceKm)} km"
        "my" -> "${String.format("%.1f", distanceKm)} ကီလိုမီတာ"
        else -> "${String.format("%.1f", distanceKm)} km"
    }
}

// 重量格式化
fun formatWeight(weightKg: Double, languageCode: String): String {
    return when (languageCode) {
        "zh" -> "${String.format("%.1f", weightKg)} 公斤"
        "en" -> "${String.format("%.1f", weightKg)} kg"
        "my" -> "${String.format("%.1f", weightKg)} ကီလိုဂရမ်"
        else -> "${String.format("%.1f", weightKg)} kg"
    }
}
```

## 🔄 语言切换实现

### 1. Activity级别语言切换

```kotlin
abstract class BaseActivity : ComponentActivity() {
    
    @Inject
    lateinit var languageManager: LanguageManager
    
    override fun attachBaseContext(newBase: Context) {
        val context = runBlocking {
            val currentLanguage = languageManager.getCurrentLanguage()
            languageManager.applyLanguage(currentLanguage)
        }
        super.attachBaseContext(context)
    }
}
```

### 2. 运行时语言切换

```kotlin
// 在ViewModel中切换语言
fun changeLanguage(languageCode: String) {
    viewModelScope.launch {
        val success = languageManager.setLanguage(languageCode)
        if (success) {
            // 提示用户重启应用
            _uiState.value = _uiState.value.copy(
                languageChanged = true,
                needsRestart = true
            )
        }
    }
}
```

### 3. 应用重启机制

```kotlin
fun restartApp() {
    val intent = Intent(context, MainActivity::class.java).apply {
        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        putExtra("language_changed", true)
    }
    context.startActivity(intent)
    if (context is Activity) {
        context.finish()
    }
}
```

## 🎨 UI本地化适配

### 1. 文本方向支持

```kotlin
// 获取语言方向
fun getLanguageDirection(languageCode: String): Int {
    return when (languageCode) {
        "zh", "en", "my" -> View.LAYOUT_DIRECTION_LTR
        // 如果支持RTL语言，在这里添加
        else -> View.LAYOUT_DIRECTION_LTR
    }
}
```

### 2. 字体适配

```kotlin
// 缅甸语字体支持
val myanmarFont = FontFamily(
    Font(R.font.myanmar_regular, FontWeight.Normal),
    Font(R.font.myanmar_bold, FontWeight.Bold)
)

@Composable
fun LocalizedText(
    text: String,
    languageCode: String = "zh"
) {
    Text(
        text = text,
        fontFamily = when (languageCode) {
            "my" -> myanmarFont
            else -> FontFamily.Default
        }
    )
}
```

### 3. 布局适配

```kotlin
// 根据语言调整布局
@Composable
fun LocalizedLayout(
    languageCode: String,
    content: @Composable () -> Unit
) {
    CompositionLocalProvider(
        LocalLayoutDirection provides when (languageCode) {
            "zh", "en", "my" -> LayoutDirection.Ltr
            else -> LayoutDirection.Ltr
        }
    ) {
        content()
    }
}
```

## 📊 语言使用统计

### 1. 语言偏好分析

```kotlin
class LanguageAnalytics {
    fun trackLanguageChange(fromLanguage: String, toLanguage: String) {
        // 记录语言切换行为
        // 用于分析用户语言偏好
    }
    
    fun getLanguageUsageStats(): LanguageUsageStats {
        // 返回语言使用统计
    }
}
```

### 2. 本地化质量监控

```kotlin
class LocalizationQualityMonitor {
    fun checkMissingTranslations(): List<String> {
        // 检查缺失的翻译
    }
    
    fun validateTranslationQuality(): TranslationQualityReport {
        // 验证翻译质量
    }
}
```

## 🔧 开发最佳实践

### 1. 字符串资源管理

```kotlin
// ✅ 正确的字符串使用
Text(text = stringResource(R.string.welcome_message))

// ❌ 错误的硬编码文本
Text(text = "Welcome to ML Express")
```

### 2. 字符串参数化

```kotlin
// ✅ 支持参数的字符串
<string name="order_total_cost">总费用: %s MMK</string>
Text(text = stringResource(R.string.order_total_cost, totalCost))

// ✅ 复数形式支持
<plurals name="orders_count">
    <item quantity="zero">无订单</item>
    <item quantity="one">%d个订单</item>
    <item quantity="other">%d个订单</item>
</plurals>
```

### 3. 上下文相关翻译

```kotlin
// 根据上下文选择合适的翻译
fun getContextualString(context: String, baseStringId: Int): String {
    return when (context) {
        "order_status" -> getOrderStatusString(baseStringId)
        "payment_method" -> getPaymentMethodString(baseStringId)
        else -> getString(baseStringId)
    }
}
```

## 🚀 使用指南

### 1. 在Compose中使用

```kotlin
@Composable
fun MyScreen() {
    val languageManager = hiltViewModel<LanguageSettingsViewModel>()
    val currentLanguage by languageManager.currentLanguage.collectAsState()
    
    Column {
        Text(text = stringResource(R.string.welcome_title))
        
        // 格式化本地化文本
        Text(text = languageManager.formatCurrency(15000.0, currentLanguage))
        Text(text = languageManager.formatDate(System.currentTimeMillis(), currentLanguage))
    }
}
```

### 2. 在ViewModel中使用

```kotlin
@HiltViewModel
class MyViewModel @Inject constructor(
    private val languageManager: LanguageManager
) : ViewModel() {
    
    fun getLocalizedErrorMessage(error: ApiError): String {
        return when (error.code) {
            "NETWORK_ERROR" -> getStringForCurrentLanguage(R.string.error_network)
            "ORDER_NOT_FOUND" -> getStringForCurrentLanguage(R.string.error_order_not_found)
            else -> error.message
        }
    }
}
```

### 3. 在Repository中使用

```kotlin
class OrderRepository @Inject constructor(
    private val languageManager: LanguageManager
) {
    
    suspend fun createOrder(orderData: CreateOrderRequest): NetworkResult<Order> {
        // 添加语言信息到API请求
        val localizedRequest = orderData.copy(
            language = languageManager.getCurrentLanguage(),
            timezone = TimeZone.getDefault().id
        )
        
        return apiCall { orderApi.createOrder(localizedRequest) }
    }
}
```

## 📱 用户体验优化

### 1. 语言切换流程

```
用户打开语言设置 → 显示当前语言和可选语言 → 
用户选择新语言 → 保存设置并显示切换成功 → 
提示重启应用 → 用户确认重启 → 应用以新语言启动
```

### 2. 无缝切换体验

- ✅ **即时预览**: 选择语言后立即显示本地名称
- ✅ **状态保持**: 切换过程中保持应用状态
- ✅ **优雅提示**: 友好的重启应用提示
- ✅ **快速重启**: 最小化重启时间和数据丢失

### 3. 错误处理

```kotlin
// 语言切换失败处理
if (!languageManager.setLanguage(newLanguage)) {
    showError("语言切换失败，请重试")
    return
}

// 语言资源缺失处理
try {
    val text = stringResource(R.string.some_text)
} catch (e: Resources.NotFoundException) {
    val fallbackText = "Text not available"
}
```

## 🌐 API本地化集成

### 1. 请求头本地化

```kotlin
class LocalizationInterceptor : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request().newBuilder()
            .addHeader("Accept-Language", getCurrentLocale())
            .addHeader("Timezone", TimeZone.getDefault().id)
            .build()
        return chain.proceed(request)
    }
}
```

### 2. 响应数据本地化

```kotlin
// 服务器返回本地化数据
data class LocalizedResponse<T>(
    val data: T,
    val localizedMessages: Map<String, String>, // 按语言代码分组的消息
    val locale: String
)
```

## 🔍 调试和测试

### 1. 语言切换测试

```kotlin
@Test
fun testLanguageSwitch() {
    // 测试中文到英文切换
    languageManager.setLanguage("en")
    assertEquals("en", languageManager.getCurrentLanguage())
    
    // 测试英文到缅甸语切换
    languageManager.setLanguage("my")
    assertEquals("my", languageManager.getCurrentLanguage())
}
```

### 2. 本地化质量检查

```kotlin
@Test
fun checkTranslationCompleteness() {
    val supportedLanguages = listOf("zh", "en", "my")
    val baseStringKeys = getBaseStringKeys()
    
    supportedLanguages.forEach { language ->
        val missingKeys = checkMissingTranslations(language, baseStringKeys)
        assertTrue("Missing translations in $language: $missingKeys", missingKeys.isEmpty())
    }
}
```

## 📈 扩展和维护

### 1. 添加新语言

```kotlin
// 1. 创建新的资源文件夹
values-th/strings.xml  // 泰语支持

// 2. 在LanguageManager中添加语言选项
LanguageOption("th", "Thai", "ไทย", "TH", false)

// 3. 更新语言检测逻辑
"th" -> "th"
```

### 2. 翻译更新流程

```
1. 开发人员更新基础字符串（中文）
2. 导出字符串到翻译平台
3. 翻译人员翻译新字符串
4. 导入翻译结果到对应语言文件
5. 测试验证翻译质量
6. 发布更新版本
```

### 3. 本地化资源管理

```kotlin
class TranslationManager {
    fun exportStringsForTranslation(): TranslationExport
    fun importTranslatedStrings(translations: TranslationImport)
    fun validateTranslationQuality(): QualityReport
    fun generateTranslationReport(): TranslationReport
}
```

---

## ✅ **多语言配置完成总结**

### 🎯 **完成的功能**

1. **✅ 完整的中英文双语支持**
2. **✅ 缅甸语基础支持和预留扩展**
3. **✅ 智能语言切换功能**
4. **✅ 本地化格式化工具**
5. **✅ Application级别语言管理**
6. **✅ 用户友好的切换界面**

### 🌟 **技术特色**

- **🔄 动态语言切换**: 无需重新安装应用
- **💾 持久化存储**: 用户语言偏好永久保存
- **🎯 智能检测**: 自动检测系统语言
- **🛡️ 容错处理**: 完善的错误处理和降级方案
- **📱 无缝体验**: 最小化用户操作步骤

### 🚀 **即可使用**

现在ML Express应用已具备：

- **完整的中英文界面切换**
- **专业的本地化格式化**
- **智能的语言管理系统**
- **用户友好的切换体验**
- **可扩展的多语言架构**

**用户可以在个人中心 → 语言设置中轻松切换中英文界面，为不同语言背景的用户提供最佳的使用体验！** 🌍📱✨
