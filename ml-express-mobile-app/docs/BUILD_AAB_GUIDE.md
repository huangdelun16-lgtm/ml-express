# 构建 AAB 文件指南

## 🔒 安全说明

**重要**: Expo Personal Access Token 是敏感凭证，**绝对不能**提交到版本控制系统。

## 📋 前置要求

1. 安装 EAS CLI:
   ```bash
   npm install -g eas-cli
   ```

2. 获取 Expo Personal Access Token:
   - 访问: https://expo.dev/accounts/[your-account]/settings/access-tokens
   - 创建新的 Access Token
   - 复制 token（只显示一次，请妥善保存）

## 🚀 使用方法

### 方法 1: 使用环境变量（推荐）

```bash
export EXPO_TOKEN="your-token-here"
./build-aab.sh
```

### 方法 2: 使用 .env 文件

1. 在项目根目录创建 `.env` 文件:
   ```bash
   echo "EXPO_TOKEN=your-token-here" > .env
   ```

2. 运行构建脚本:
   ```bash
   ./build-aab.sh
   ```

**注意**: `.env` 文件已添加到 `.gitignore`，不会被提交到版本控制。

## ⚠️ 安全最佳实践

1. ✅ **使用环境变量或 .env 文件**存储敏感凭证
2. ✅ **不要**将 token 硬编码到脚本中
3. ✅ **不要**将包含 token 的文件提交到 Git
4. ✅ 定期轮换（更新）您的 Access Token
5. ✅ 如果 token 泄露，立即在 Expo 设置中撤销并创建新 token

## 🔄 如果 Token 泄露

如果您的 token 意外泄露（例如提交到了公共仓库）：

1. **立即**访问 Expo 设置页面撤销泄露的 token
2. 创建新的 token
3. 更新所有使用该 token 的环境
4. 检查是否有未授权的构建活动

