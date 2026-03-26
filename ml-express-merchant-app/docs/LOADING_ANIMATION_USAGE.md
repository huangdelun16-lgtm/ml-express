# 🚚 快递卡车加载动画使用说明

## 📖 功能介绍

这是一个专业又吸引人的MARKET LINK EXPRESS品牌快递卡车加载动画组件，适用于所有需要等待、加载或刷新的场景。

### ✨ 动画特点

1. **🚚 快递卡车动画**
   - 蓝色渐变货箱，印有公司品牌名称
   - 车轮旋转效果，真实的辐条设计
   - 卡车从左到右平滑移动
   - 立体阴影效果

2. **🏢 品牌展示**
   - 货箱上醒目显示"MARKET LINK EXPRESS"
   - 蓝色主题色，与公司品牌一致
   - 专业的品牌形象

3. **👨‍✈️ 司机形象**
   - 专业的驾驶员
   - 透明车窗设计
   - 独立驾驶室

4. **📦 包裹动画**
   - 货箱内的包裹
   - 轻微弹跳效果
   - 模拟运输中的包裹

5. **💨 烟雾效果**
   - 尾气烟雾动画
   - 渐隐效果
   - 增强真实感

6. **🛣️ 道路场景**
   - 虚线道路标识
   - 清晰的行驶场景

## 🎯 使用方法

### 1. 全局加载（推荐）

使用 `useLoading` Hook 在任何地方触发加载动画：

```typescript
import { useLoading } from '../contexts/LoadingContext';

export default function MyComponent() {
  const { showLoading, hideLoading } = useLoading();

  const handleAction = async () => {
    // 显示加载动画
    showLoading('正在加载数据...');
    
    try {
      // 执行网络请求或其他操作
      await someAsyncOperation();
    } finally {
      // 隐藏加载动画
      hideLoading();
    }
  };

  return (
    <TouchableOpacity onPress={handleAction}>
      <Text>点击我</Text>
    </TouchableOpacity>
  );
}
```

### 2. 直接使用组件

在页面中直接使用 `DeliveryLoadingAnimation` 组件：

```typescript
import DeliveryLoadingAnimation from '../components/DeliveryLoadingAnimation';

export default function MyScreen() {
  const [loading, setLoading] = useState(false);

  return (
    <View>
      {/* 你的内容 */}
      
      {loading && (
        <DeliveryLoadingAnimation 
          message="加载中..."
          size="medium"
          showOverlay={true}
        />
      )}
    </View>
  );
}
```

### 3. 下拉刷新

在 ScrollView 中使用 RefreshControl：

```typescript
import { RefreshControl } from 'react-native';
import { useLoading } from '../contexts/LoadingContext';

export default function MyListScreen() {
  const { showLoading, hideLoading } = useLoading();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    showLoading('刷新数据中...');
    
    // 执行刷新操作
    await fetchData();
    
    hideLoading();
    setRefreshing(false);
  };

  return (
    <ScrollView
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#3b82f6"
          colors={['#3b82f6', '#2563eb']}
        />
      }
    >
      {/* 列表内容 */}
    </ScrollView>
  );
}
```

## ⚙️ 组件参数

### DeliveryLoadingAnimation Props

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `message` | `string` | `'加载中...'` | 显示的加载提示文字 |
| `size` | `'small' \| 'medium' \| 'large'` | `'medium'` | 动画大小 |
| `showOverlay` | `boolean` | `true` | 是否显示遮罩层 |

### 大小说明

- **small**: 缩放 0.6，高度 120px - 适合小型提示
- **medium**: 缩放 1.0，高度 200px - 适合一般场景
- **large**: 缩放 1.3，高度 260px - 适合全屏加载

## 🎨 使用场景

### ✅ 适合使用的场景

1. **网络请求等待**
   ```typescript
   showLoading('正在获取数据...');
   const data = await api.fetchData();
   hideLoading();
   ```

2. **页面跳转过渡**
   ```typescript
   showLoading('正在打开页面...');
   await new Promise(resolve => setTimeout(resolve, 300));
   navigation.navigate('NextScreen');
   hideLoading();
   ```

3. **表单提交**
   ```typescript
   showLoading('正在提交订单...');
   const result = await submitOrder(formData);
   hideLoading();
   ```

4. **文件上传**
   ```typescript
   showLoading('正在上传图片...');
   const uploadResult = await uploadImage(imageFile);
   hideLoading();
   ```

5. **下拉刷新**
   ```typescript
   // 使用 RefreshControl + showLoading
   ```

6. **应用启动**
   ```typescript
   // 已自动应用在 App.tsx 的启动检查中
   ```

### ❌ 不适合使用的场景

1. **瞬间完成的操作** - 如简单的状态切换
2. **需要进度条的场景** - 如大文件下载
3. **需要取消操作的场景** - 如可中断的任务

## 🔧 自定义消息

支持多语言和自定义消息：

```typescript
// 中文
showLoading('正在加载数据...');

// 英文
showLoading('Loading data...');

// 缅甸语
showLoading('ဒေတာတင်နေသည်...');

// 根据操作类型自定义
showLoading('正在生成订单...');
showLoading('正在连接服务器...');
showLoading('正在保存信息...');
```

## 🎭 动画效果说明

1. **卡车移动**: 4秒完成一个循环，从左到右平滑移动
2. **车轮旋转**: 0.6秒一圈，持续旋转，带辐条细节
3. **包裹弹跳**: 0.6秒一个循环，上下弹跳3px
4. **烟雾效果**: 1秒一个循环，透明度0-0.5渐变
5. **加载点**: 1.5秒循环，三个点依次亮起

## 🎨 样式定制

如需修改动画样式，可以编辑 `src/components/DeliveryLoadingAnimation.tsx`：

- **公司名称**: 修改 `companyName` 文本内容
- **卡车颜色**: 修改货箱和驾驶室的 `LinearGradient` 颜色
- **背景色**: 修改遮罩层的 `LinearGradient` 的 `colors` 属性
- **动画速度**: 修改各动画的 `duration` 参数
- **动画大小**: 调整 `sizeStyles` 对象
- **车轮样式**: 修改车轮的颜色和大小

## 📝 注意事项

1. **避免过长显示**: 加载动画不应显示超过10秒，超时应提示用户
2. **及时隐藏**: 确保在操作完成后调用 `hideLoading()`
3. **错误处理**: 在 `try-finally` 块中使用，确保异常时也会隐藏
4. **避免嵌套**: 不要在已显示加载时再次调用 `showLoading()`
5. **测试性能**: 在低端设备上测试动画性能

## 🚀 最佳实践

```typescript
const { showLoading, hideLoading } = useLoading();

const handleSubmit = async () => {
  try {
    // 1. 开始加载
    showLoading('正在处理...');
    
    // 2. 执行操作
    const result = await submitData();
    
    // 3. 处理结果
    if (result.success) {
      Alert.alert('成功', '操作完成！');
    } else {
      Alert.alert('失败', result.message);
    }
  } catch (error) {
    // 4. 错误处理
    console.error(error);
    Alert.alert('错误', '操作失败，请重试');
  } finally {
    // 5. 确保隐藏（无论成功还是失败）
    hideLoading();
  }
};
```

## 🎉 效果预览

加载动画包含以下元素：
- 🚚 蓝色渐变的快递卡车
- 🏢 货箱上的"MARKET LINK EXPRESS"品牌名称
- 👨‍✈️ 驾驶室里的专业司机
- 📦 货箱内的快递包裹（带弹跳效果）
- 💨 灰色的尾气烟雾
- ⚙️ 旋转的车轮（带辐条细节）
- 🛣️ 虚线道路场景
- 💬 自定义加载文字
- ● ● ● 动态加载点效果

完美展示公司品牌形象，专业又吸引人！

