# 🚀 Vercel 部署指南

## 📋 部署状态
- ✅ 项目名称: ML Express Production
- ✅ 平台: Vercel.com
- ✅ 框架: Create React App
- ✅ 配置文件: `vercel.json` 已创建

## 🔧 Vercel 配置步骤

### 1. 登录 Vercel
访问 [https://vercel.com](https://vercel.com) 并登录

### 2. 导入项目
1. 点击 "New Project"
2. 选择 "Import Git Repository"
3. 选择你的 GitHub 仓库: `huangdelun16-lgtm/ml-express`

### 3. 项目设置
Vercel 会自动检测到 React 项目，使用以下设置：

```
Framework Preset: Create React App
Root Directory: ./
Build Command: npm run build
Output Directory: build
Install Command: npm install
```

### 4. 环境变量配置
在 "Environment Variables" 部分添加：

```
REACT_APP_GOOGLE_MAPS_API_KEY = YOUR_GOOGLE_MAPS_API_KEY
REACT_APP_SUPABASE_URL = https://uopkyuluxnrewvlmutam.supabase.co
REACT_APP_SUPABASE_ANON_KEY = YOUR_SUPABASE_ANON_KEY
REACT_APP_APP_NAME = MARKET LINK EXPRESS
REACT_APP_APP_VERSION = 1.0.0
```

### 5. 部署
点击 "Deploy" 开始部署

## 📁 项目文件结构
```
ml-express/
├── src/                    # React 源代码
├── public/                  # 静态资源
├── package.json            # 项目配置
├── vercel.json            # Vercel 配置
├── netlify.toml           # Netlify 备用配置
└── README.md              # 项目说明
```

## 🎯 Vercel 部署优势

### 性能优化
- ✅ 全球 CDN 加速
- ✅ 自动 HTTPS
- ✅ 边缘计算
- ✅ 自动压缩

### 开发体验
- ✅ 零配置部署
- ✅ 预览分支部署
- ✅ 自动重试
- ✅ 实时日志

### 监控分析
- ✅ 性能监控
- ✅ 错误追踪
- ✅ 访问统计
- ✅ 实时分析

## 🌐 部署 URL

### 生产环境
- **主域名**: `https://ml-express-production.vercel.app/`
- **自定义域名**: (如果已配置)

### 预览环境
- **分支预览**: `https://ml-express-production-git-[branch].vercel.app/`
- **PR 预览**: `https://ml-express-production-git-[pr-number].vercel.app/`

## 🔄 自动部署

### Git 集成
- ✅ 推送到 `main` 分支 → 自动部署到生产环境
- ✅ 推送到其他分支 → 自动创建预览环境
- ✅ 创建 PR → 自动创建 PR 预览环境

### 部署流程
1. 代码推送到 GitHub
2. Vercel 自动检测更改
3. 安装依赖 (`npm install`)
4. 构建项目 (`npm run build`)
5. 部署到 CDN
6. 发送部署通知

## 🛠️ 故障排除

### 构建失败
1. 检查 `package.json` 中的构建脚本
2. 检查环境变量是否正确设置
3. 查看构建日志中的错误信息
4. 确保所有依赖都已安装

### 运行时错误
1. 检查环境变量是否正确
2. 检查 Google Maps API Key 是否有效
3. 检查 Supabase 连接是否正常
4. 查看浏览器控制台错误

### 性能问题
1. 检查 Vercel Analytics 中的性能报告
2. 优化图片和静态资源
3. 使用 Vercel 的缓存策略
4. 考虑使用 Vercel Edge Functions

## 📊 监控和维护

### 性能监控
- 访问 Vercel Dashboard
- 查看 "Analytics" 标签页
- 监控 Core Web Vitals
- 分析用户访问模式

### 错误追踪
- 查看 "Functions" 标签页
- 监控错误日志
- 设置错误通知
- 定期检查系统状态

### 更新维护
- 定期更新依赖包
- 监控安全漏洞
- 优化构建配置
- 清理无用代码

## 🔐 安全配置

### 环境变量
- ✅ 敏感信息存储在环境变量中
- ✅ 不在代码中硬编码 API Key
- ✅ 使用不同的环境变量用于不同环境

### 访问控制
- ✅ 设置适当的 CORS 策略
- ✅ 使用 HTTPS 加密传输
- ✅ 定期轮换 API Key

### 监控告警
- ✅ 设置部署失败通知
- ✅ 监控异常访问
- ✅ 设置性能阈值告警

## 📞 支持

如有问题，请：
1. 查看 Vercel 文档: https://vercel.com/docs
2. 检查构建日志
3. 联系技术支持
4. 提供详细的错误信息

---

*最后更新：2024年1月*
*版本：1.0.0*
