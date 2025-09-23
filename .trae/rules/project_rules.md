# 快递平台项目 - 项目规则

**最后更新日期：** 2023-10-27
**版本：** 1.0

## 1. 项目概述

- **项目名称：** 速达快递 (示例)
- **核心目标：** 为用户提供便捷的线上寄件、实时物流跟踪、一键取件服务，为快递员提供高效的订单管理工具。
- **核心功能：**
  - 用户端：注册/登录、寄件下单、支付、物流跟踪、历史订单管理、地址簿。
  - 快递员端：订单抢单/派单、移动扫描收件、状态更新、路线规划、收入统计。
  - 后台管理：用户管理、订单管理、快递员管理、财务统计、系统配置。

## 2. 技术栈

### 2.1 前端 (Web & App)
- **Web框架：** React 18 / Vue 3 (请选择一种)
- **移动端：** React Native / Flutter / Uni-App (请选择一种，以实现跨平台和代码复用)
- **状态管理：** Redux Toolkit / Pinia
- **UI组件库：** Ant Design / Element Plus / Vant (请选择一种)
- **构建工具：** Vite / Webpack

### 2.2 后端
- **语言：** Node.js (Express/NestJS) / Java (Spring Boot) / Go (Gin) (请选择一种)
- **API规范：** RESTful API / GraphQL (请选择一种)
- **认证与授权：** JWT (JSON Web Tokens)
- **数据库：**
  - **主数据库：** PostgreSQL / MySQL
  - **缓存：** Redis (用于会话、验证码、热点数据)
- **对象存储：** AWS S3 / 阿里云 OSS (用于存储用户上传的证件、物品照片)

### 2.3 基础设施与DevOps
- **代码托管：** GitHub / GitLab
- **CI/CD：** GitHub Actions / GitLab CI
- **容器化：** Docker
- **部署：**
  - 开发/测试环境： Docker Compose
  - 生产环境： Kubernetes (K8s) / 云服务商托管集群 (如 ECS)
- **监控：** Prometheus + Grafana (监控应用性能)
- **日志：** ELK Stack (Elasticsearch, Logstash, Kibana) 或 Loki

## 3. 开发规范

### 3.1 API 设计规范
- 接口路径使用复数名词，如 `GET /api/v1/orders`
- 响应格式统一为 JSON：
  ```json
  {
    "code": 200, // 自定义业务状态码
    "data": { ... }, // 成功时返回的数据
    "msg": "success", // 提示信息
    "requestId": "xxx" // 用于追踪请求的唯一ID
  }