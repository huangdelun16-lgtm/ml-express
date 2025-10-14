# 🏍️ 快递员加载动画使用说明

## 📖 功能介绍

这是一个可爱又专业的快递员骑摩托车送快递的加载动画组件，适用于所有需要等待、加载或刷新的场景。

### ✨ 动画特点

1. **🏍️ 摩托车动画**
   - 车轮旋转效果
   - 摩托车从左到右移动
   - 真实的辐条设计

2. **👷 快递员动画**
   - 戴着安全帽的快递员
   - 上下弹跳效果模拟颠簸
   - 生动形象

3. **📦 包裹动画**
   - 后座上的包裹
   - 轻微弹跳效果
   - 与摩托车同步移动

4. **💨 烟雾效果**
   - 尾气烟雾动画
   - 渐隐效果
   - 增强真实感

5. **🛣️ 道路场景**
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

1. **摩托车移动**: 3秒完成一个循环，从左到右平滑移动
2. **车轮旋转**: 0.5秒一圈，持续旋转
3. **包裹弹跳**: 0.6秒一个循环，上下弹跳5px
4. **烟雾效果**: 0.8秒一个循环，透明度0-0.6渐变
5. **快递员弹跳**: 0.5秒一个循环，模拟骑行颠簸

## 🎨 样式定制

如需修改动画样式，可以编辑 `src/components/DeliveryLoadingAnimation.tsx`：

- **背景色**: 修改 `LinearGradient` 的 `colors` 属性
- **动画速度**: 修改各动画的 `duration` 参数
- **动画大小**: 调整 `sizeStyles` 对象
- **颜色主题**: 修改车轮、文字等元素的颜色

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
- 🏍️ 蓝白色的摩托车
- 👷 戴红色安全帽的快递员
- 📦 棕色的快递包裹
- 💨 灰色的尾气烟雾
- 🛣️ 虚线道路
- 💬 自定义加载文字
- ● ● ● 动态点点点效果

完美契合快递配送主题，提升用户体验！

