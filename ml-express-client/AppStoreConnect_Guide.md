# App Store Connect 配置指南

## 1. 开发者账户设置

### 1.1 Apple Developer Program
- 注册Apple Developer Program账户
- 支付年费 ($99 USD)
- 完成身份验证
- 设置团队信息

### 1.2 App Store Connect
- 登录 [App Store Connect](https://appstoreconnect.apple.com)
- 创建应用记录
- 配置应用信息

## 2. 应用信息配置

### 2.1 基本信息
```
应用名称: MARKET LINK EXPRESS
Bundle ID: com.mlexpress.client
SKU: ml-express-client-001
主要语言: 中文(简体)
```

### 2.2 应用分类
```
主要分类: 商务 (Business)
次要分类: 生活 (Lifestyle)
```

### 2.3 年龄分级
```
年龄分级: 4+
内容描述: 无限制内容
```

## 3. 应用元数据

### 3.1 应用描述
```
中文描述: [使用AppStore_Metadata.md中的中文描述]
英文描述: [使用AppStore_Metadata.md中的英文描述]
缅语描述: [使用AppStore_Metadata.md中的缅语描述]
```

### 3.2 关键词
```
中文关键词: 快递,配送,包裹,追踪,物流,运输,寄件,收件,实时,智能,路线,通知,安全,快速,可靠
英文关键词: delivery,express,shipping,tracking,logistics,transport,package,parcel,real-time,smart,route,notification,secure,fast,reliable
```

### 3.3 支持信息
```
支持网站: https://mlexpress.com/support
营销网站: https://mlexpress.com
隐私政策: https://mlexpress.com/privacy
用户协议: https://mlexpress.com/terms
```

## 4. 应用图标和截图

### 4.1 应用图标
- 1024 x 1024 像素
- PNG格式
- 无透明度
- 无圆角
- 无文字

### 4.2 启动画面
- 使用splash.png
- 符合iOS设计规范
- 品牌一致性

### 4.3 应用截图
- iPhone: 1290 x 2796 像素
- iPad: 2048 x 2732 像素
- 最多10张截图
- 展示核心功能

## 5. 版本信息

### 5.1 版本配置
```
版本号: 1.0.0
构建版本: 1
最低iOS版本: 13.0
支持设备: iPhone, iPad
```

### 5.2 发布说明
```
版本 1.0.0
🎉 MARKET LINK EXPRESS 首次发布！

新功能：
- ✨ 全新的用户界面设计
- 🚚 快速下单功能
- 📍 实时包裹追踪
- 🗺️ 智能路线规划
- 🌍 多语言支持（中文、英文、缅语）
- 🔔 实时通知推送
- 💰 透明价格计算
- 📱 响应式设计，支持iPhone和iPad
```

## 6. 定价和可用性

### 6.1 定价
```
价格: 免费
应用内购买: 无
```

### 6.2 可用性
```
地区: 全球
发布时间: 立即发布
```

## 7. App Store 审核

### 7.1 审核指南
- 遵循App Store审核指南
- 确保应用功能完整
- 测试所有功能
- 检查隐私政策

### 7.2 常见拒绝原因
- 应用崩溃
- 功能不完整
- 违反隐私政策
- 误导性描述
- 版权问题

## 8. 测试和验证

### 8.1 TestFlight测试
```
内部测试: 开发团队
外部测试: 100个测试用户
测试周期: 90天
```

### 8.2 功能测试清单
- [ ] 用户注册和登录
- [ ] 下单流程
- [ ] 支付功能
- [ ] 地图和位置服务
- [ ] 推送通知
- [ ] 多语言切换
- [ ] 订单追踪
- [ ] 客户服务

## 9. 发布流程

### 9.1 构建上传
```bash
# 使用EAS Build构建生产版本
eas build --platform ios --profile production

# 上传到App Store Connect
eas submit --platform ios --profile production
```

### 9.2 审核提交
1. 完成所有元数据
2. 上传构建版本
3. 添加测试信息
4. 提交审核
5. 等待审核结果

## 10. 发布后管理

### 10.1 监控指标
- 下载量
- 用户评分
- 崩溃报告
- 用户反馈

### 10.2 更新策略
- 定期更新
- 修复bug
- 添加新功能
- 性能优化

## 11. 营销推广

### 11.1 App Store优化
- 关键词优化
- 截图优化
- 描述优化
- 评分管理

### 11.2 推广渠道
- 社交媒体
- 网站推广
- 合作伙伴
- 用户推荐

## 12. 联系信息

### 12.1 技术支持
```
邮箱: support@mlexpress.com
电话: +95-1-234-5678
网站: https://mlexpress.com/support
```

### 12.2 商务合作
```
邮箱: business@mlexpress.com
电话: +95-1-234-5679
网站: https://mlexpress.com/business
```

## 13. 重要提醒

1. **隐私合规**: 确保符合GDPR、CCPA等隐私法规
2. **内容审核**: 定期检查用户生成内容
3. **安全更新**: 及时修复安全漏洞
4. **用户反馈**: 积极响应用户反馈
5. **法律合规**: 遵守当地法律法规
