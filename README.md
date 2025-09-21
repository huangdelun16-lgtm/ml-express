# ML Express - 缅甸专业快递服务网站

## 🚀 项目简介

ML Express 是一个现代化的快递服务网站，为缅甸地区的客户提供专业的快递服务。网站采用 React + TypeScript + Material-UI 技术栈构建，具有响应式设计，支持多语言，提供完整的客户服务功能。

## ✨ 主要功能

### 🏠 首页
- 公司介绍和服务概览
- 快速快递查询入口
- 价格咨询入口
- 服务特色展示

### 📦 快递查询
- 实时包裹追踪
- 历史记录查询
- 状态更新通知

### 💰 价格咨询
- 多服务类型选择（国内、国际、同城、铁路）
- 三步式询价表单
- 个性化报价服务
- 在线客服支持

### 🏢 服务介绍
- 详细服务说明
- 服务优势展示
- 客户案例分享

### 📞 联系我们
- 多种联系方式（电话、WhatsApp、邮箱）
- 营业时间信息
- 社交媒体链接
- 在线留言表单
- 服务承诺展示

### 🔐 员工后台
- 员工登录系统
- 快递信息管理
- 订单跟踪管理
- 客户信息管理

## 🛠️ 技术栈

- **前端框架**: React 18
- **开发语言**: TypeScript
- **UI组件库**: Material-UI (MUI)
- **路由管理**: React Router DOM
- **状态管理**: React Hooks
- **样式方案**: Emotion + CSS-in-JS
- **构建工具**: Create React App
- **包管理器**: npm

## 📱 响应式设计

- 支持桌面端、平板和移动端
- 自适应布局设计
- 触摸友好的交互体验
- 优化的移动端性能

## 🚀 快速开始

### 环境要求
- Node.js 16.0 或更高版本
- npm 8.0 或更高版本

### 安装依赖
```bash
npm install
```

### 启动开发服务器
```bash
npm start
```

### 构建生产版本
```bash
npm run build
```

### 运行测试
```bash
npm test
```

## 🌐 部署指南

### 方式一：Vercel 部署（推荐）

1. 安装 Vercel CLI
```bash
npm install -g vercel
```

2. 登录 Vercel
```bash
vercel login
```

3. 部署项目
```bash
vercel
```

4. 按照提示完成部署配置

### 方式二：Netlify 部署

1. 安装 Netlify CLI
```bash
npm install -g netlify-cli
```

2. 构建项目
```bash
npm run build
```

3. 部署到 Netlify
```bash
netlify deploy --prod --dir=build
```

### 方式三：GitHub Pages 部署

1. 创建 GitHub 仓库
2. 推送代码到仓库
3. 在仓库设置中启用 GitHub Pages
4. 选择部署分支（通常是 gh-pages）

## 📁 项目结构

```
src/
├── components/          # 可复用组件
│   ├── Header.tsx      # 网站头部导航
│   ├── Footer.tsx      # 网站底部
│   └── ...
├── pages/              # 页面组件
│   ├── HomePage.tsx    # 首页
│   ├── TrackingPage.tsx # 快递查询页
│   ├── PricingPage.tsx # 价格咨询页
│   ├── ServicesPage.tsx # 服务介绍页
│   ├── ContactPage.tsx # 联系我们页
│   ├── AdminLogin.tsx  # 员工登录页
│   └── AdminDashboard.tsx # 员工后台页
├── App.tsx             # 主应用组件
├── index.tsx           # 应用入口
└── App.css             # 全局样式
```

## 🎨 自定义配置

### 主题配置
在 `src/index.tsx` 中修改 MUI 主题配置：
- 主色调
- 字体设置
- 组件样式

### 内容配置
- 公司信息：修改各页面中的文本内容
- 联系方式：更新 `ContactPage.tsx` 中的联系信息
- 服务类型：在 `PricingPage.tsx` 中调整服务选项

## 🔧 开发说明

### 添加新页面
1. 在 `src/pages/` 目录下创建新页面组件
2. 在 `src/App.tsx` 中添加路由配置
3. 在 `Header.tsx` 中添加导航链接

### 添加新组件
1. 在 `src/components/` 目录下创建新组件
2. 导出组件并在需要的页面中导入使用

### 样式修改
- 使用 MUI 的 `sx` 属性进行内联样式
- 在 `App.css` 中添加全局样式
- 创建组件级别的样式文件

## 📊 性能优化

- 代码分割和懒加载
- 图片优化和压缩
- 缓存策略配置
- 响应式图片加载

## 🔒 安全考虑

- HTTPS 强制跳转
- XSS 防护
- CSRF 防护
- 输入验证和过滤

## 📈 SEO 优化

- 语义化 HTML 结构
- Meta 标签优化
- 结构化数据标记
- 页面加载速度优化

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 📞 联系我们

- 网站：https://mlexpress.com
- 邮箱：info@mlexpress.com
- 电话：+95 9 123 456 789
- WhatsApp：+95 9 123 456 789

## 🙏 致谢

感谢所有为这个项目做出贡献的开发者和设计师。

---

**ML Express** - 让快递服务更简单、更专业！
