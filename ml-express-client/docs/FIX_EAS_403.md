# 🔧 解决 EAS Build 403 错误

## 可能的原因：

1. **EAS 免费账户构建配额用尽**
   - 免费账户每月有构建次数限制
   - 访问 https://expo.dev/accounts/amt349/settings/billing 查看配额

2. **账户权限问题**
   - 项目所有者不匹配
   - 需要确认项目 `owner` 是 `amt349`

3. **网络/SSL 问题**
   - SSL 证书问题
   - 网络连接问题

## 解决方案：

### 1. 检查账户配额
访问：https://expo.dev/accounts/amt349/settings/billing

### 2. 升级 EAS 账户（如果需要）
- 免费账户：每月有限构建次数
- 付费账户：更多构建配额

### 3. 等待配额重置
- 免费账户配额每月重置
- 可以等待下个月再构建

### 4. 使用本地构建（见 LOCAL_BUILD_GUIDE.md）

