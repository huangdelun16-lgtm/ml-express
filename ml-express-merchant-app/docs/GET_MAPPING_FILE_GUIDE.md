# 📄 获取 ReTrace Mapping File 指南

## 什么是 ReTrace Mapping File？

**ReTrace mapping file**（`mapping.txt`）是 Android 应用在构建时生成的代码混淆映射文件。它用于：
- 反混淆崩溃报告中的堆栈跟踪
- 帮助 Google Play Console 显示可读的崩溃信息
- 调试生产环境的崩溃问题

---

## 📍 Mapping File 位置

构建 Release 版本后，mapping.txt 文件位于：
```
android/app/build/outputs/mapping/release/mapping.txt
```

---

## 🔍 检查当前状态

### 1. 检查是否已存在 mapping.txt

```bash
cd /Users/aungmyatthu/Desktop/ml-express/ml-express-client
find android -name "mapping.txt" -type f
```

### 2. 检查构建配置

查看 `android/app/build.gradle` 中的混淆设置：
- `minifyEnabled` - 是否启用代码混淆
- `proguardFiles` - ProGuard 规则文件

---

## 🚀 生成 Mapping File 的方法

### 方法 1：重新构建 Release Bundle（推荐）

如果应用启用了代码混淆，需要重新构建 Release 版本：

```bash
cd /Users/aungmyatthu/Desktop/ml-express/ml-express-client/android

# 清理之前的构建
./gradlew clean

# 构建 Release Bundle（会生成 mapping.txt）
./gradlew bundleRelease

# 检查 mapping.txt 是否生成
ls -lh app/build/outputs/mapping/release/mapping.txt
```

### 方法 2：如果应用未启用混淆

如果应用没有启用代码混淆（`minifyEnabled = false`），则不会生成 mapping.txt。

**选项 A：启用混淆并重新构建**
1. 编辑 `android/gradle.properties`，添加：
   ```properties
   android.enableMinifyInReleaseBuilds=true
   ```
2. 重新构建：
   ```bash
   cd android
   ./gradlew clean bundleRelease
   ```

**选项 B：创建空的 mapping.txt（不推荐）**
如果应用确实不需要混淆，可以创建一个空的 mapping.txt：
```bash
touch android/app/build/outputs/mapping/release/mapping.txt
```

---

## 📋 完整步骤

### Step 1: 检查构建配置

```bash
cd /Users/aungmyatthu/Desktop/ml-express/ml-express-client
cat android/gradle.properties | grep -i minify
```

### Step 2: 启用混淆（如果需要）

编辑 `android/gradle.properties`：
```properties
android.enableMinifyInReleaseBuilds=true
```

### Step 3: 重新构建

```bash
cd android
./gradlew clean bundleRelease
```

### Step 4: 找到 mapping.txt

```bash
# 检查文件是否存在
ls -lh app/build/outputs/mapping/release/mapping.txt

# 查看文件大小（应该不是空的）
wc -l app/build/outputs/mapping/release/mapping.txt
```

### Step 5: 上传到 Google Play Console

1. 登录 Google Play Console
2. 进入您的应用
3. 转到 "Release" → "Production"（或相应的轨道）
4. 找到版本 2 (1.1.0)
5. 点击 "Upload ReTrace mapping file"
6. 选择 `mapping.txt` 文件

---

## ⚠️ 重要提示

1. **每次构建都要保存 mapping.txt**
   - 每个版本都有唯一的 mapping.txt
   - 必须保存每个版本的 mapping.txt
   - 丢失后无法反混淆该版本的崩溃报告

2. **版本对应关系**
   - Version Code 2 (1.1.0) 的 mapping.txt 必须对应 Version Code 2 的构建
   - 不能使用其他版本的 mapping.txt

3. **文件大小**
   - mapping.txt 通常有几 MB 到几十 MB
   - 如果文件很小或为空，说明可能没有启用混淆

---

## 🆘 如果找不到 mapping.txt

### 情况 1：应用未启用混淆

**解决方案**：
1. 启用混淆（推荐用于生产环境）
2. 或创建空的 mapping.txt（如果确实不需要混淆）

### 情况 2：构建目录被清理

**解决方案**：
重新构建 Release 版本

### 情况 3：使用 EAS Build

如果使用 EAS Build，mapping.txt 会在构建产物中：
```bash
# 下载构建产物
eas build:download --platform android --profile production

# 查找 mapping.txt
find . -name "mapping.txt"
```

---

## 📝 快速命令

```bash
# 1. 进入项目目录
cd /Users/aungmyatthu/Desktop/ml-express/ml-express-client

# 2. 检查是否已存在
find android -name "mapping.txt"

# 3. 如果不存在，重新构建
cd android
./gradlew clean bundleRelease

# 4. 找到并复制 mapping.txt
cp app/build/outputs/mapping/release/mapping.txt ~/Desktop/mapping.txt

# 5. 查看文件信息
ls -lh ~/Desktop/mapping.txt
```

---

## ✅ 验证

上传前验证 mapping.txt：
- ✅ 文件存在
- ✅ 文件大小 > 0（如果启用了混淆）
- ✅ 文件对应正确的版本号（Version Code 2）

---

**注意**：如果应用没有启用代码混淆，Google Play Console 可能不需要 mapping.txt，但上传一个空的文件通常不会有问题。

