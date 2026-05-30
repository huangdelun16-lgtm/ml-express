# 🎯 Day 1 实操指南 - 创建你的第一个 Android 应用

**日期**：2025-10-01  
**目标**：成功运行 Hello World 应用  
**预计时间**：2-3 小时

---

## ✅ 任务清单

- [ ] 创建新项目
- [ ] 了解项目结构
- [ ] 运行模拟器
- [ ] 运行 Hello World 应用
- [ ] 修改文字并看到效果
- [ ] 庆祝第一个应用！🎉

---

## 🚀 Step 1：创建新项目（10分钟）

### 1.1 打开 Android Studio
- 双击打开 Android Studio
- 如果显示"打开项目"对话框，点击 **"New Project"**

### 1.2 选择项目模板
1. 选择 **"Empty Activity"** (Compose)
   - ⚠️ 注意：要选择带 Compose 的，不是普通的 Empty Activity
2. 点击 **"Next"**

### 1.3 配置项目
填写以下信息：

| 字段 | 值 | 说明 |
|------|-----|------|
| **Name** | `My First App` | 应用名称 |
| **Package name** | `com.example.myfirstapp` | 包名（保持默认） |
| **Save location** | `/Users/aungmyatthu/Desktop/MLEXPRESS/android-learning` | 项目位置 |
| **Language** | **Kotlin** | 编程语言 |
| **Minimum SDK** | **API 26 (Android 8.0)** | 最低支持版本 |
| **Build configuration language** | **Kotlin DSL** | 构建配置 |

### 1.4 创建项目
- 点击 **"Finish"**
- 等待项目创建和 Gradle 同步（可能需要5-10分钟）
- ☕ 休息一下，让 Android Studio 完成工作

### 1.5 等待提示
当你看到：
- 底部状态栏显示 **"Gradle sync finished"** ✅
- 左侧能看到项目文件树
- 右上角有绿色的运行按钮 ▶️

说明项目创建成功！

---

## 📁 Step 2：了解项目结构（15分钟）

### 2.1 展开项目文件

在左侧，将视图切换为 **"Android"** 模式（默认应该就是）

你会看到：

```
My First App
├── app
│   ├── manifests
│   │   └── AndroidManifest.xml      ← 应用配置文件
│   ├── java
│   │   └── com.example.myfirstapp
│   │       └── MainActivity.kt      ← 主活动（入口点）
│   └── res                          ← 资源文件
│       ├── drawable                 ← 图片
│       ├── mipmap                   ← 应用图标
│       └── values                   ← 字符串、颜色等
└── Gradle Scripts
    └── build.gradle.kts (Module: app) ← 依赖配置
```

### 2.2 查看核心文件

#### 打开 `MainActivity.kt`

双击 `app/java/com.example.myfirstapp/MainActivity.kt`

你会看到类似这样的代码：

```kotlin
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MyFirstAppTheme {
                Greeting("Android")
            }
        }
    }
}

@Composable
fun Greeting(name: String, modifier: Modifier = Modifier) {
    Text(
        text = "Hello $name!",
        modifier = modifier
    )
}
```

**简单解释**：
- `MainActivity`：应用的入口
- `setContent`：设置界面内容
- `Greeting`：一个显示文字的组件
- `Text`：显示 "Hello Android!"

---

## 📱 Step 3：运行模拟器（20分钟）

### 3.1 打开 Device Manager

1. 点击右上角的 **"Device Manager"** 图标（手机图标）
   - 或者菜单：**Tools → Device Manager**

### 3.2 创建虚拟设备

1. 点击 **"Create Device"**
2. 选择设备：**Pixel 6** (推荐，中等屏幕)
3. 点击 **"Next"**

### 3.3 选择系统镜像

1. 选择 **"Tiramisu"** (API 33, Android 13)
   - 如果需要下载，点击旁边的 **"Download"** 链接
   - 等待下载完成（可能需要10-15分钟）
2. 点击 **"Next"**

### 3.4 完成创建

1. 设备名称：保持默认（Pixel 6 API 33）
2. 点击 **"Finish"**

### 3.5 启动模拟器

1. 在 Device Manager 中，点击设备旁边的 **▶️ 播放按钮**
2. 等待模拟器启动（首次启动可能需要2-3分钟）
3. 当你看到 Android 手机界面 → ✅ 成功！

---

## ▶️ Step 4：运行你的第一个应用（5分钟）

### 4.1 选择设备

在 Android Studio 顶部工具栏：
1. 设备选择器应该显示你刚创建的 **"Pixel 6 API 33"**
2. 如果没有，点击下拉框选择

### 4.2 点击运行

1. 点击绿色的 **▶️ Run** 按钮（或按 `Ctrl+R`）
2. 等待编译和安装（首次可能需要1-2分钟）

### 4.3 查看结果

在模拟器中，你应该看到：
- 白色背景
- 居中显示 **"Hello Android!"**

**🎉 恭喜！你的第一个 Android 应用运行成功了！**

---

## ✏️ Step 5：修改代码（15分钟）

现在让我们修改代码，让它显示你自己的内容！

### 5.1 修改欢迎文字

在 `MainActivity.kt` 中，找到这行代码：

```kotlin
Greeting("Android")
```

改成：

```kotlin
Greeting("Market Link Express")
```

**保存文件**（Cmd+S）

### 5.2 重新运行

点击 **▶️ Run** 按钮

现在应该显示：**"Hello Market Link Express!"**

### 5.3 进一步修改

继续修改 `Greeting` 函数：

```kotlin
@Composable
fun Greeting(name: String, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier.fillMaxSize(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text = "欢迎使用",
            fontSize = 20.sp,
            color = Color.Gray
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = name,
            fontSize = 32.sp,
            fontWeight = FontWeight.Bold,
            color = Color(0xFF2c5282) // ML Express 蓝色
        )
        Spacer(modifier = Modifier.height(16.dp))
        Text(
            text = "快递管理系统",
            fontSize = 18.sp,
            color = Color.Gray
        )
    }
}
```

**⚠️ 如果代码报错**（红色下划线），在顶部添加这些导入：

```kotlin
import androidx.compose.foundation.layout.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
```

### 5.4 再次运行

点击 **▶️ Run**

现在应该看到：
```
      欢迎使用
Market Link Express
    快递管理系统
```

**🎊 太棒了！你已经会修改 Android 应用了！**

---

## 📸 Step 6：截图庆祝（5分钟）

1. 在模拟器中截图（模拟器右侧工具栏有相机图标）
2. 或者直接截屏整个 Android Studio
3. 保存这个历史性的时刻！

---

## 📝 Step 7：记录今日学习（10分钟）

### 更新学习日志

打开：`/Users/aungmyatthu/Desktop/MLEXPRESS/ml-express/LEARNING-PATH.md`

在 Day 1 部分填写：

```markdown
#### Day 1 - 2025-10-01（今天！）

**学习时间**：3小时 ✅

**今日完成**：
- [x] ✅ Android Studio 已安装
- [x] ✅ 创建项目成功
- [x] ✅ 运行 Hello World 成功
- [x] ✅ 修改代码并看到效果

**笔记**：
1. 学会了创建 Android 项目
2. 了解了项目基本结构
3. 知道了如何运行模拟器
4. 第一次使用 Compose 写 UI
5. Text、Column 组件的基本用法

**遇到的问题**：
（如果有，写在这里）

**明日计划**：
- 学习 Kotlin 基础语法
- 变量、函数、条件判断

**自我评分**：⭐⭐⭐⭐⭐
今天完成了所有目标！
```

---

## 🎓 今天学到的关键概念

### 1. Android 项目结构
```
MainActivity.kt     ← 应用的入口点
@Composable 函数    ← UI 组件
Text, Column        ← 基础 UI 元素
```

### 2. Jetpack Compose
```kotlin
@Composable         // 这是一个 UI 组件
fun Greeting(...) { // 函数名称
    Text(...)       // 显示文字
}
```

### 3. 如何修改应用
1. 修改代码
2. 保存（Cmd+S）
3. 点击 Run ▶️
4. 在模拟器中查看效果

---

## 🎯 明天的预告（Day 2）

明天你会学习：

### Kotlin 基础语法
```kotlin
// 变量
val name = "Aung"           // 不可变
var age = 25                // 可变

// 函数
fun greet(name: String): String {
    return "Hello $name"
}

// 数据类（很重要！）
data class Package(
    val id: String,
    val receiverName: String,
    val status: String
)
```

这些是构建应用的基础！

---

## 📚 今晚可以看的资源（可选）

### 视频推荐
1. **YouTube 搜索**："Android Studio 2024 tutorial for beginners"
   - 看前30分钟就够了
   - 了解 Android Studio 界面

2. **B站搜索**："Kotlin 入门教程"
   - 预习明天的内容
   - 不需要全部看完

### 文章阅读
- Android 开发者网站：https://developer.android.com/get-started
- 快速浏览，了解 Android 开发是什么

---

## 💪 Day 1 总结

**你今天完成了**：
- ✅ 创建了第一个 Android 项目
- ✅ 成功运行了应用
- ✅ 修改了代码并看到效果
- ✅ 了解了基本的项目结构

**这意味着**：
- ✅ 你的开发环境配置正确
- ✅ 你已经会最基本的开发流程
- ✅ 你已经在 Android 开发的路上了！

**进度**：
```
学习进度：█░░░░░░░░░░░░░ 7% (1/14 天基础学习)
```

---

## 🎉 给自己一个奖励！

你完成了 Android 开发的第一步！

- ☕ 喝杯咖啡/奶茶
- 🎮 玩一会游戏
- 📱 给朋友炫耀一下你的第一个应用

---

## 📅 明天见！

**明天（Day 2）我们会学习**：
- Kotlin 变量和数据类型
- 如何创建包裹数据类
- 基础的 Kotlin 语法

**休息好，明天继续！** 💪

---

## 🆘 遇到问题？

### 常见问题

**Q1: Gradle 同步失败**
```
解决：等待更长时间，或者点击 "Try Again"
如果网络问题，可能需要配置代理
```

**Q2: 模拟器启动失败**
```
解决：
1. 确保电脑有足够内存（至少8GB）
2. 重启 Android Studio
3. 重新创建模拟器
```

**Q3: 应用运行失败**
```
解决：
1. 查看底部的 "Build" 窗口，看错误信息
2. 复制错误信息，在 Cursor 中问我
```

**Q4: 代码有红色下划线**
```
解决：
1. 检查是否导入了必要的包（import）
2. 把鼠标放在红色下划线上，按 Alt+Enter
3. 选择 "Import" 导入缺失的包
```

### 需要帮助？

在 Cursor 中告诉我：
```
我在 Day 1 遇到了问题：[描述问题]
```

我会立即帮你解决！

---

**今天就到这里！明天见！** 👋

记得更新 `LEARNING-PATH.md` 中的 Day 1 记录！
