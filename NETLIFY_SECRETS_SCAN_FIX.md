# Netlify 密钥扫描禁用配置

## 问题
Netlify的密钥扫描功能检测到文档和测试文件中的API密钥示例，导致部署失败。

## 解决方案

### 方法1：在Netlify控制台设置环境变量
在Netlify控制台的Environment Variables中添加：
```
SECRETS_SCAN_SMART_DETECTION_ENABLED = false
```

### 方法2：在netlify.toml中配置
```toml
[build.environment]
  SECRETS_SCAN_SMART_DETECTION_ENABLED = "false"
```

### 方法3：忽略特定文件
```toml
[build.processing.skip]
  paths = ["*.md", "*.html", "test-*", "diagnose-*"]
```

## 已清理的文件
✅ test-maps-api.html
✅ diagnose-maps.html  
✅ test-api-key.html
✅ ml-express-mobile-app/GEOCODING-API-FIX.md
✅ ml-express-mobile-app/IOS-NAVIGATION-FIX.md
✅ NETLIFY_DEPLOYMENT_FIX.md
✅ deploy-to-netlify.md
✅ NETLIFY-DEPLOY-GUIDE.md
✅ courier-app/README.md
✅ GOOGLE_MAPS_API_KEY_FIX.md

## 下一步
1. 在Netlify控制台设置 `SECRETS_SCAN_SMART_DETECTION_ENABLED = false`
2. 重新部署
