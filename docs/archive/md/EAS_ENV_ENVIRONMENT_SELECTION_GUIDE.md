# 🌍 EAS env:create 环境选择指南

## 📋 当前情况

在执行 `eas env:create` 命令时，需要选择环境（Environment）。

---

## 🎯 选项说明

### 1. development（开发环境）
- **用途**: 本地开发时使用
- **适用**: 开发测试

### 2. preview（预览环境）
- **用途**: 预览构建时使用
- **适用**: 测试构建

### 3. production（生产环境）
- **用途**: 正式发布时使用
- **适用**: 生产环境

### 4. Other（自定义环境）
- **用途**: 自定义环境名称
- **适用**: 特殊需求

---

## ✅ 推荐选择

### 对于 `EXPO_PUBLIC_SUPABASE_ANON_KEY`

**推荐选择**: **所有环境**（development、preview、production）

**原因**:
- Supabase Anon Key 在所有环境中都应该使用相同的值
- 这样可以确保开发、预览和生产环境的一致性
- 避免不同环境使用不同密钥导致的混乱

---

## 🔧 操作步骤

### 方法 1: 选择所有环境（推荐）

1. **使用方向键（↓）** 移动到 "preview"
2. **按空格键（Space）** 选择 "preview"（会显示 ✓）
3. **继续向下** 移动到 "production"
4. **按空格键（Space）** 选择 "production"（会显示 ✓）
5. **确保 "development" 也被选中**（应该已经默认选中）
6. **按 Enter** 完成选择

**结果**: development、preview、production 都被选中

---

### 方法 2: 只选择 production（如果只想用于生产）

1. **使用方向键（↓）** 移动到 "production"
2. **按 Enter** 直接选择（只选择 production）

---

## 💡 建议

**强烈推荐选择所有环境**（development、preview、production）

**原因**:
- ✅ 确保所有环境使用相同的 Supabase 项目
- ✅ 避免环境不一致导致的问题
- ✅ 开发时可以测试真实的数据连接
- ✅ 预览环境可以验证生产配置

---

## 📝 完整操作流程

1. **当前状态**: "development" 已选中（高亮显示）
2. **按 ↓** 移动到 "preview"
3. **按 Space** 选择 "preview"（会显示选中标记）
4. **按 ↓** 移动到 "production"
5. **按 Space** 选择 "production"（会显示选中标记）
6. **按 Enter** 完成选择

---

**请选择所有环境（development、preview、production），然后按 Enter 继续！** 🚀

