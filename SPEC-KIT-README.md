# 🌱 Spec-Kit 已集成到 ML-Express！

你的 Market Link Express 项目现在已经集成了 **规范驱动开发（Spec-Driven Development）** 工具包！

---

## ✅ 已完成的设置

### 1. 目录结构 ✅
```
ml-express/
├── .claude/commands/        # Cursor AI 命令
│   ├── specify.md          # /specify 命令
│   └── plan.md             # /plan 命令
├── memory/
│   └── constitution.md     # 项目开发原则
├── specs/
│   └── 002-notification-system/
│       └── spec.md         # 通知系统规范（示例）
└── SPEC-KIT-GUIDE.md       # 使用指南
```

### 2. 项目开发原则 ✅
文件：`memory/constitution.md`

定义了：
- ✅ 核心价值观（用户体验、代码质量、数据完整性、性能）
- ✅ 技术栈标准（React + TypeScript + Supabase）
- ✅ 开发流程规范
- ✅ 设计规范（颜色、组件、间距）
- ✅ 命名规范
- ✅ 安全要求
- ✅ 错误处理标准

### 3. Cursor 命令 ✅

#### `/specify` - 创建功能规范
在 Cursor 聊天框中输入：
```
/specify 我想添加一个XXX功能
```

#### `/plan` - 创建技术计划
```
/plan 使用XXX技术实现
```

### 4. 示例规范 ✅
文件：`specs/002-notification-system/spec.md`

一个完整的通知系统功能规范，包含：
- 功能描述和目标
- 用户故事（3个完整场景）
- 功能需求（发送、接收、管理）
- 界面要求（详细的UI设计）
- 非功能需求（性能、安全、UX）
- 验收标准（完整的checklist）

---

## 🚀 立即开始使用

### 方式1：使用 AI 命令（推荐）

在 **Cursor** 的聊天框中：

```
/specify 我想添加一个数据导出功能，可以将包裹数据和财务数据导出为Excel文件
```

然后：
```
/plan 使用 xlsx 库实现Excel导出，在财务管理和包裹管理页面添加导出按钮
```

### 方式2：手动创建规范

1. 创建新功能目录：
```bash
mkdir -p specs/003-your-feature
```

2. 复制模板：
```bash
cp specs/002-notification-system/spec.md specs/003-your-feature/spec.md
```

3. 修改规范内容

---

## 📖 详细指南

**请阅读**：`SPEC-KIT-GUIDE.md`

该指南包含：
- 什么是规范驱动开发
- 详细使用步骤
- 实用技巧
- 质量检查清单
- 常见问题解答

---

## 💡 快速示例

### 示例：为"数据备份"功能创建规范

**Step 1**: 在 Cursor 中输入
```
/specify 我想添加一个数据备份功能，管理员可以手动备份数据库，也可以设置自动备份计划
```

**Step 2**: AI 会创建 `specs/003-data-backup/spec.md`

**Step 3**: 审查规范，确认需求

**Step 4**: 创建技术计划
```
/plan 使用 Supabase 的备份API，前端添加备份管理界面，使用 cron 调度自动备份
```

**Step 5**: AI 会创建 `specs/003-data-backup/plan.md`

**Step 6**: 开始实施！

---

## 🎯 最佳实践

### ✅ DO（推荐做法）

1. **新功能先写规范**
   ```
   规范 → 审查 → 计划 → 编码 → 测试
   ```

2. **遵循 constitution.md**
   - 所有CRUD操作记录审计日志
   - 使用TypeScript类型定义
   - 遵循设计规范

3. **保持规范更新**
   - 需求变更时先更新规范
   - 代码跟随规范

4. **利用示例学习**
   - 参考 `specs/002-notification-system/spec.md`
   - 学习如何编写完整的规范

### ❌ DON'T（避免的做法）

1. **不要跳过规范直接写代码**
   - 会导致需求不清、代码混乱

2. **不要写过度技术化的规范**
   - spec.md 关注"做什么"，不关注"怎么做"
   - 技术细节放在 plan.md

3. **不要规范和代码脱节**
   - 代码实现要符合规范
   - 规范要反映实际需求

---

## 📚 文件说明

| 文件 | 用途 | 何时使用 |
|------|------|----------|
| `memory/constitution.md` | 项目开发原则 | 开始开发前必读 |
| `SPEC-KIT-GUIDE.md` | 详细使用指南 | 学习如何使用 |
| `specs/XXX/spec.md` | 功能规范 | 开发新功能时 |
| `specs/XXX/plan.md` | 技术计划 | 制定实施方案时 |
| `.claude/commands/` | AI命令 | 在Cursor中使用 |

---

## 🔍 检查清单

在开发新功能前，确保：

- [ ] 已阅读 `memory/constitution.md`
- [ ] 已创建功能规范 (`spec.md`)
- [ ] 已创建技术计划 (`plan.md`)
- [ ] 规范包含验收标准
- [ ] 计划包含审计日志实现
- [ ] 计划遵循 constitution 原则

---

## 💬 需要帮助？

### 在 Cursor 中问 AI：

```
我想为XXX功能创建规范，应该包含哪些内容？
```

```
这个技术方案是否符合 constitution.md 的要求？
```

```
帮我审查这个规范，看看有没有遗漏的地方
```

---

## 🎉 下一步

1. **📖 阅读使用指南**
   ```
   打开 SPEC-KIT-GUIDE.md
   ```

2. **👀 查看示例规范**
   ```
   打开 specs/002-notification-system/spec.md
   ```

3. **🎯 练习创建规范**
   ```
   在Cursor中使用 /specify 命令
   ```

4. **🚀 应用到实际开发**
   ```
   下次新功能使用规范驱动开发
   ```

---

**记住**：好的规范 = 好的代码 = 好的产品！

开始你的规范驱动开发之旅吧！🚀
