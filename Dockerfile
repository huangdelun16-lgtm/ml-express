# =============================================
# 缅甸快递系统 Docker 配置
# Myanmar Express Delivery System
# =============================================

# 使用官方 Node.js 18 Alpine 镜像作为基础镜像
FROM node:18-alpine AS base

# 设置工作目录
WORKDIR /app

# 安装系统依赖和工具
RUN apk add --no-cache \
    git \
    curl \
    bash \
    tzdata \
    && rm -rf /var/cache/apk/*

# 设置时区为缅甸时间
ENV TZ=Asia/Yangon
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# =============================================
# 依赖安装阶段
# =============================================
FROM base AS deps

# 复制 package 文件
COPY package*.json ./

# 配置 npm 镜像（针对缅甸网络环境优化）
RUN npm config set registry https://registry.npmmirror.com \
    && npm config set disturl https://npmmirror.com/dist \
    && npm config set electron_mirror https://npmmirror.com/mirrors/electron/ \
    && npm config set sass_binary_site https://npmmirror.com/mirrors/node-sass/ \
    && npm config set phantomjs_cdnurl https://npmmirror.com/mirrors/phantomjs/

# 安装依赖
RUN npm ci --only=production --no-audit --prefer-offline \
    && npm cache clean --force

# =============================================
# 开发依赖安装阶段
# =============================================
FROM base AS dev-deps

# 复制 package 文件
COPY package*.json ./

# 配置 npm 镜像
RUN npm config set registry https://registry.npmmirror.com

# 安装所有依赖（包括开发依赖）
RUN npm ci --no-audit --prefer-offline

# =============================================
# 构建阶段
# =============================================
FROM dev-deps AS builder

# 复制源代码
COPY . .

# 设置构建环境变量
ARG NODE_ENV=production
ARG REACT_APP_API_URL
ARG REACT_APP_SUPABASE_URL
ARG REACT_APP_SUPABASE_ANON_KEY
ARG REACT_APP_VERSION=2.1.0
ARG REACT_APP_BUILD_TIME
ARG REACT_APP_MYANMAR_TIMEZONE=Asia/Yangon

ENV NODE_ENV=$NODE_ENV
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_SUPABASE_URL=$REACT_APP_SUPABASE_URL
ENV REACT_APP_SUPABASE_ANON_KEY=$REACT_APP_SUPABASE_ANON_KEY
ENV REACT_APP_VERSION=$REACT_APP_VERSION
ENV REACT_APP_BUILD_TIME=$REACT_APP_BUILD_TIME
ENV REACT_APP_MYANMAR_TIMEZONE=$REACT_APP_MYANMAR_TIMEZONE

# 设置构建优化参数
ENV GENERATE_SOURCEMAP=false
ENV INLINE_RUNTIME_CHUNK=false
ENV NODE_OPTIONS="--max-old-space-size=4096"

# 构建应用
RUN npm run build

# 优化构建产物
RUN find ./build -name "*.js" -exec gzip -k {} \; \
    && find ./build -name "*.css" -exec gzip -k {} \; \
    && find ./build -name "*.html" -exec gzip -k {} \;

# =============================================
# Nginx 静态文件服务阶段
# =============================================
FROM nginx:alpine AS production

# 安装必要工具
RUN apk add --no-cache \
    curl \
    tzdata \
    certbot \
    certbot-nginx \
    && rm -rf /var/cache/apk/*

# 设置时区
ENV TZ=Asia/Yangon
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# 复制构建产物
COPY --from=builder /app/build /usr/share/nginx/html

# 复制 Nginx 配置
COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY nginx/ssl.conf /etc/nginx/conf.d/ssl.conf
COPY nginx/gzip.conf /etc/nginx/conf.d/gzip.conf
COPY nginx/security.conf /etc/nginx/conf.d/security.conf

# 创建必要目录
RUN mkdir -p /var/cache/nginx/client_temp \
    && mkdir -p /var/log/nginx \
    && mkdir -p /etc/nginx/ssl \
    && mkdir -p /var/www/certbot

# 设置权限
RUN chown -R nginx:nginx /var/cache/nginx \
    && chown -R nginx:nginx /var/log/nginx \
    && chown -R nginx:nginx /usr/share/nginx/html

# 复制启动脚本
COPY scripts/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:80/health || exit 1

# 暴露端口
EXPOSE 80 443

# 设置启动命令
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]

# =============================================
# 开发环境阶段
# =============================================
FROM dev-deps AS development

# 复制源代码
COPY . .

# 暴露开发服务器端口
EXPOSE 3000

# 设置开发环境变量
ENV NODE_ENV=development
ENV CHOKIDAR_USEPOLLING=true
ENV WATCHPACK_POLLING=true

# 启动开发服务器
CMD ["npm", "start"]

# =============================================
# 标签和元数据
# =============================================
LABEL maintainer="Myanmar Express Team <dev@market-link-express.com>"
LABEL version="2.1.0"
LABEL description="缅甸同城快递管理系统 - Myanmar Express Delivery System"
LABEL org.opencontainers.image.title="Myanmar Express"
LABEL org.opencontainers.image.description="Myanmar Express Delivery Management System"
LABEL org.opencontainers.image.version="2.1.0"
LABEL org.opencontainers.image.created="2024-12-19"
LABEL org.opencontainers.image.source="https://github.com/myanmar-express/ml-express"
LABEL org.opencontainers.image.licenses="MIT"
