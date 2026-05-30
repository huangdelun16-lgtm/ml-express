# 提交客户端 Web 项目到 Git

## 问题

Netlify 构建失败，错误信息：
```
Base directory does not exist: /opt/build/repo/ml-express-client-web
```

**原因：** `ml-express-client-web` 目录没有被提交到 Git 仓库，所以 Netlify 在构建时找不到这个目录。

## 已完成的修复

✅ 已将客户端 Web 项目的所有必要文件添加到 Git：
- 配置文件（package.json, tsconfig.json, netlify.toml）
- 源代码文件（src/ 目录）
- 公共资源文件（public/ 目录）
- 文档文件（README.md）

✅ 已更新 `.gitignore`，排除：
- `ml-express-client-web/node_modules/`
- `ml-express-client-web/build/`

## 下一步：提交到 Git

现在需要将这些文件提交到 Git 并推送到远程仓库：

```bash
# 1. 提交文件
git commit -m "Add client web project (ml-express-client-web)"

# 2. 推送到远程仓库
git push origin main
```

## 提交后

提交并推送后，Netlify 会自动触发新的构建，应该能够：
1. ✅ 找到 `ml-express-client-web` 目录
2. ✅ 正确读取 `netlify.toml` 配置
3. ✅ 成功构建项目

## 验证

提交后，在 Netlify Dashboard 中：
1. 进入 `client-ml-express` 项目
2. 查看 **Deploys** 标签
3. 应该看到新的部署开始
4. 等待构建完成，应该会成功

## 如果还有问题

如果提交后仍然失败，检查：

1. **Netlify 构建配置**
   - Base directory: `ml-express-client-web`
   - Build command: `npm install && npm run build`
   - Publish directory: `ml-express-client-web/build`

2. **环境变量**
   - 确保在 Netlify Dashboard 中配置了：
     - `REACT_APP_SUPABASE_URL`
     - `REACT_APP_SUPABASE_ANON_KEY`
     - `REACT_APP_GOOGLE_MAPS_API_KEY`

