# 🎁 3D快递盒加载动画组件

一个高级的3D快递盒加载动画组件，专为MARKET LINK EXPRESS品牌设计。

## ✨ 特性

### 🎨 设计要素

#### 1. **品牌配色**
- 主色：`#2E86AB` (品牌蓝)
- 深蓝：`#1c6a8f` (盒盖)
- 浅蓝：`#4CA1CF` (盒身底部)
- 橙色：`#F18F01` (点缀色)

#### 2. **3D立体效果**
- ✅ 真实的3D快递盒模型
- ✅ 立体感盒身和盒盖
- ✅ 动态阴影效果
- ✅ 透视变换增强深度感

#### 3. **动画效果**

##### 🎯 盒子跳动动画
```
高度变化：0px → -30px → -15px → -25px → 0px
X轴旋转：0° → 5° → 0°
持续时间：1200ms (600ms上 + 600ms下)
缓动函数：cubic-bezier (弹性效果)
```

##### 📦 盒盖开合动画
```
角度变化：0° → -60° → -30° → -45° → 0°
配合跳动节奏自然开合
```

##### ✨ 光芒脉动
```
不透明度：0.3 → 1 → 0.3
缩放：0.8 → 1.2 → 0.8
持续时间：2000ms
```

##### 🎈 粒子漂浮
```
5个浅蓝色粒子
从下往上漂浮 (0 → -80px)
透明度变化：0 → 1 → 0
缩放变化：0.5 → 1 → 0.5
延迟动画：每个粒子相差200ms
```

##### ⏺️ 进度指示器
```
3个圆点依次脉动
缩放：1 → 1.5 → 1
不透明度：0.3 → 1 → 0.3
延迟：每个点相差200ms
```

#### 4. **品牌元素**
- 盒身正面显示 "MARKET LINK" 品牌标识
- 盒盖上有橙色 "快递" 标签
- 胶带线装饰

#### 5. **交互控制**
- ⏸️ 暂停/继续按钮
- 🔄 重新开始按钮
- 按钮带渐变和阴影效果

## 📦 使用方法

### 基础用法

```tsx
import PackageLoadingAnimation from '../components/PackageLoadingAnimation';

// 默认中等尺寸，不带遮罩
<PackageLoadingAnimation />
```

### 带遮罩的全屏加载

```tsx
<PackageLoadingAnimation 
  showOverlay={true}
  message="正在加载数据..."
  size="large"
/>
```

### 通过Context使用（推荐）

```tsx
import { useLoading } from '../contexts/LoadingContext';

function MyComponent() {
  const { showLoading, hideLoading } = useLoading();

  const handleAction = async () => {
    // 使用3D快递盒动画（默认）
    showLoading('处理中...', 'package');
    
    try {
      await someAsyncOperation();
    } finally {
      hideLoading();
    }
  };

  // 或者使用送货卡车动画
  const handleDelivery = async () => {
    showLoading('配送中...', 'delivery');
    
    try {
      await deliveryOperation();
    } finally {
      hideLoading();
    }
  };

  return (
    <TouchableOpacity onPress={handleAction}>
      <Text>开始处理</Text>
    </TouchableOpacity>
  );
}
```

## 🎛️ Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `size` | `'small' \| 'medium' \| 'large'` | `'medium'` | 动画尺寸 |
| `showOverlay` | `boolean` | `false` | 是否显示遮罩层 |
| `message` | `string` | `'加载中...'` | 加载提示文字 |

### 尺寸配置

| 尺寸 | 盒子大小 | 缩放比例 | 适用场景 |
|------|---------|---------|---------|
| `small` | 60px | 0.6 | 列表项、卡片内 |
| `medium` | 100px | 1.0 | 页面加载、弹窗 |
| `large` | 140px | 1.4 | 全屏加载、启动页 |

## 🎨 动画结构

```
PackageLoadingAnimation
├── Header (品牌标题)
│   ├── MARKET LINK EXPRESS
│   └── 专业快递服务
│
├── Animation Container
│   ├── Particles (5个粒子)
│   │   ├── Particle 1 (左下)
│   │   ├── Particle 2 (左中)
│   │   ├── Particle 3 (右下)
│   │   ├── Particle 4 (右中)
│   │   └── Particle 5 (中上)
│   │
│   └── Package (快递盒)
│       ├── Glow Effect (光芒)
│       ├── Lid (盒盖)
│       │   └── Express Label (快递标签)
│       ├── Body (盒身)
│       │   ├── Brand Logo (品牌标识)
│       │   └── Tape (胶带)
│       └── Shadow (阴影)
│
├── Message (加载文字)
│   ├── Message Text
│   └── Progress Dots (3个圆点)
│
└── Controls (控制按钮)
    ├── Pause/Play Button
    └── Reset Button
```

## 🎭 动画时间轴

```
时间轴 (1200ms循环):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

0ms      300ms    600ms    900ms    1200ms
│         │        │        │        │
▼         ▼        ▼        ▼        ▼

盒子:    ↓跳起    ↓最高    ↓回落    ↓二次跳   ↓着地
        (0px)   (-30px)  (-15px)  (-25px)  (0px)

盒盖:    关闭     大开     半开     中开     关闭
        (0°)    (-60°)   (-30°)   (-45°)   (0°)

光芒:    ━━━━━━━━ 渐强 ━━━━━━━━━━━━━ 渐弱 ━━━━━━
        0.3                1.0              0.3

粒子:    P1▲      P2▲      P3▲      P4▲     P5▲
        (延迟0)  (延迟200)(延迟400)(延迟600)(延迟800)

圆点:    ●◦◦      ◦●◦      ◦◦●      ●◦◦     ◦●◦
```

## 💡 使用场景

### 1. 页面加载
```tsx
// 首页数据加载
useEffect(() => {
  showLoading('加载首页数据...', 'package');
  loadHomeData().finally(() => hideLoading());
}, []);
```

### 2. 表单提交
```tsx
const handleSubmit = async () => {
  showLoading('提交订单中...', 'package');
  await submitOrder();
  hideLoading();
};
```

### 3. 数据刷新
```tsx
const onRefresh = async () => {
  showLoading('刷新数据...', 'package');
  await refreshData();
  hideLoading();
};
```

### 4. 导航加载
```tsx
const navigateToDetails = async (id: string) => {
  showLoading('加载详情...', 'package');
  await new Promise(resolve => setTimeout(resolve, 300));
  hideLoading();
  navigation.navigate('Details', { id });
};
```

## 🎯 性能优化

### 已实现的优化：

1. **useNativeDriver: true**
   - 所有动画都在原生线程运行
   - 60fps流畅动画

2. **动画复用**
   - 使用useRef避免重复创建动画实例
   - 组件卸载时自动清理

3. **按需渲染**
   - 仅在显示时运行动画
   - 暂停时停止动画循环

4. **条件渲染**
   - 根据animationType只渲染需要的动画

## 🔄 动画切换

现在支持两种加载动画：

### 1. 3D快递盒动画（默认）
```tsx
showLoading('加载中...', 'package');
```
- 适用场景：订单处理、数据加载、表单提交
- 视觉特点：立体、专业、品牌感强

### 2. 送货卡车动画
```tsx
showLoading('配送中...', 'delivery');
```
- 适用场景：配送追踪、订单配送、地图导航
- 视觉特点：动态、生动、场景感强

## 🎨 自定义样式

如果需要自定义颜色或样式，可以修改组件内的配置：

```tsx
// 在 PackageLoadingAnimation.tsx 中
const BRAND_COLORS = {
  primary: '#2E86AB',
  dark: '#1c6a8f',
  light: '#4CA1CF',
  accent: '#F18F01',
};
```

## 📱 响应式设计

组件自动适配不同屏幕尺寸：
- 使用相对尺寸和百分比
- 支持不同设备的DPI
- 自动缩放以适应容器

## 🐛 调试模式

如果需要调试动画，可以使用控制按钮：

```tsx
<PackageLoadingAnimation 
  showOverlay={true}
  message="调试模式"
/>
// 使用暂停按钮查看动画帧
// 使用重置按钮重新开始
```

## 🚀 最佳实践

1. **合理使用遮罩层**
   ```tsx
   // ✅ 全屏操作时使用遮罩
   showLoading('提交订单...', 'package');
   
   // ❌ 不要在小范围操作时使用全屏遮罩
   ```

2. **提供清晰的加载信息**
   ```tsx
   // ✅ 清晰的提示
   showLoading('正在保存您的订单...', 'package');
   
   // ❌ 模糊的提示
   showLoading('请稍候...', 'package');
   ```

3. **确保及时隐藏**
   ```tsx
   // ✅ 使用 finally 确保隐藏
   try {
     showLoading('处理中...', 'package');
     await operation();
   } finally {
     hideLoading();
   }
   ```

4. **选择合适的动画类型**
   ```tsx
   // ✅ 订单操作用快递盒
   showLoading('创建订单...', 'package');
   
   // ✅ 配送追踪用卡车
   showLoading('追踪配送...', 'delivery');
   ```

## 📊 技术细节

### 动画实现：
- **React Native Animated API** - 高性能动画
- **Expo Linear Gradient** - 渐变效果
- **Transform 3D** - 立体变换

### 关键技术：
- `useNativeDriver` - 原生驱动
- `Animated.loop` - 循环动画
- `Animated.sequence` - 序列动画
- `Animated.timing` - 时间动画
- `interpolate` - 插值计算

### 浏览器兼容：
- ✅ iOS 12+
- ✅ Android 5.0+
- ✅ Expo SDK 54+

## 🎉 更新日志

### v1.0.0 (2025-01-14)
- ✨ 初始版本发布
- 🎨 实现3D快递盒动画
- 🎭 添加交互控制功能
- 📱 支持响应式设计
- 🔄 集成到LoadingContext

---

**设计与开发**: MARKET LINK EXPRESS Tech Team
**品牌色系**: 蓝色系 + 橙色点缀
**动画时长**: 1200ms循环
**性能目标**: 60fps

