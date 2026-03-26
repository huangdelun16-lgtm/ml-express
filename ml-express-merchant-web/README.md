# ML Express 客户端 Web

这是 ML Express 的客户端 Web 应用，用于客户下单和跟踪包裹。

## 功能

- ✅ 首页：服务介绍和下单功能
- ✅ 服务页面：详细介绍服务内容
- ✅ 包裹跟踪：查询包裹状态
- ✅ 联系我们：联系方式

## 技术栈

- React 18
- TypeScript
- React Router
- Supabase (数据库)
- Google Maps API

## 环境变量

在项目根目录创建 `.env` 文件：

```
REACT_APP_SUPABASE_URL=你的Supabase URL
REACT_APP_SUPABASE_ANON_KEY=你的Supabase Anon Key
REACT_APP_GOOGLE_MAPS_API_KEY=你的Google Maps API Key
```

## 安装和运行

```bash
# 安装依赖
npm install

# 启动开发服务器
npm start

# 构建生产版本
npm run build
```

## 部署到 Netlify

1. 在 Netlify Dashboard 创建新站点
2. 连接 Git 仓库
3. 配置构建设置：
   - Build command: `npm run build`
   - Publish directory: `build`
4. 配置环境变量（在 Netlify Dashboard 中）
5. 添加自定义域名：`market-link-express.com`

## 与后台管理系统的连接

客户端 Web 和后台管理系统共享同一个 Supabase 数据库：

- 客户端下单 → 数据写入 `packages` 表
- 后台管理 → 自动看到新订单
- 后台更新订单状态 → 客户端跟踪页面自动更新

## 注意事项

- 客户端不包含任何后台管理功能
- 客户端不提供实时位置跟踪（仅显示包裹状态）
- 所有数据通过 Supabase 实时同步
