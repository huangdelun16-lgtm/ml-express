# 🔐 环境变量配置说明

## 📋 概述

本项目使用环境变量来管理敏感信息（如 API 密钥），确保代码仓库的安全性。

---

## 🚀 快速开始

### 1. 复制环境变量模板

```bash
cd ml-express-mobile-app
cp .env.example .env
```

### 2. 编辑 .env 文件

打开 `.env` 文件，填入您的实际 API 密钥：

```env
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_actual_api_key_here
```

### 3. 启动开发服务器

```bash
npm start
```

---

## 📁 文件说明

### `.env`
- **作用**: 存储实际的环境变量值
- **状态**: ❌ **不会被提交到 Git**（已在 `.gitignore` 中）
- **注意**: 此文件包含敏感信息，请勿分享或提交

### `.env.example`
- **作用**: 环境变量模板文件
- **状态**: ✅ **会被提交到 Git**
- **用途**: 作为配置参考，不包含实际敏感信息

### `app.config.js`
- **作用**: Expo 应用配置文件（动态读取环境变量）
- **说明**: 替代静态的 `app.json`，支持从环境变量读取配置

---

## 🔧 环境变量列表

| 变量名 | 说明 | 必需 | 示例 |
|--------|------|------|------|
| `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps API 密钥 | ✅ 是 | `AIzaSy...` |

**注意**: Expo 要求客户端环境变量必须以 `EXPO_PUBLIC_` 开头。

---

## 🌍 不同环境的配置

### 本地开发环境

1. 创建 `.env` 文件
2. 填入开发用的 API 密钥
3. 运行 `npm start`

### EAS Build 生产环境

1. 配置 EAS Secrets（参考 `EAS_SECRETS_SETUP.md`）
2. 运行 `eas build --profile production`

---

## ⚠️ 重要提醒

1. **不要提交 .env 文件**
   - `.env` 已在 `.gitignore` 中
   - 如果意外提交，立即从 Git 历史中删除

2. **使用 .env.example 作为模板**
   - 新成员克隆项目后，复制 `.env.example` 为 `.env`
   - 填入实际的环境变量值

3. **定期轮换 API 密钥**
   - 每 6-12 个月更换一次
   - 更新 `.env` 和 EAS Secrets

---

## 📚 相关文档

- `GOOGLE_CLOUD_API_KEY_SETUP.md` - Google Cloud Console 配置指南
- `EAS_SECRETS_SETUP.md` - EAS Secrets 配置指南
- `GOOGLE_PLAY_OPTIMIZATION_CHECKLIST.md` - Google Play Store 优化清单

---

## 🆘 常见问题

### Q: 环境变量未生效？

**A**: 
1. 确保 `.env` 文件在项目根目录
2. 确保变量名以 `EXPO_PUBLIC_` 开头
3. 重启 Expo 开发服务器

### Q: 如何为不同环境使用不同的 API 密钥？

**A**: 
- 本地开发：使用 `.env` 文件
- 生产构建：使用 EAS Secrets（参考 `EAS_SECRETS_SETUP.md`）

### Q: app.json 和 app.config.js 的区别？

**A**: 
- `app.json` 是静态配置文件
- `app.config.js` 支持动态读取环境变量
- 如果存在 `app.config.js`，Expo 会优先使用它

---

**配置完成后，您的 API 密钥将安全地存储在环境变量中！** 🔐

