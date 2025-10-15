import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
  ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// 图片加载状态
type ImageLoadState = 'loading' | 'loaded' | 'error';

// 懒加载图片组件属性
interface LazyImageProps {
  source: { uri: string } | number;
  style?: any;
  placeholder?: React.ReactElement;
  errorComponent?: React.ReactElement;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
  onLoad?: () => void;
  onError?: () => void;
  threshold?: number; // 距离视口多少像素开始加载
  fadeIn?: boolean; // 是否淡入动画
  quality?: 'low' | 'medium' | 'high'; // 图片质量
}

// 懒加载图片组件
export const LazyImage: React.FC<LazyImageProps> = ({
  source,
  style,
  placeholder,
  errorComponent,
  resizeMode = 'cover',
  onLoad,
  onError,
  threshold = 100,
  fadeIn = true,
  quality = 'medium',
}) => {
  const [loadState, setLoadState] = useState<ImageLoadState>('loading');
  const [isVisible, setIsVisible] = useState(false);
  const [opacity, setOpacity] = useState(0);
  const imageRef = useRef<View>(null);

  // 检查图片是否在视口内
  const checkVisibility = () => {
    if (!imageRef.current) return;

    imageRef.current.measure((x, y, width, height, pageX, pageY) => {
      const screenHeight = Dimensions.get('window').height;
      const isInViewport = pageY < screenHeight + threshold && pageY + height > -threshold;
      
      if (isInViewport && !isVisible) {
        setIsVisible(true);
      }
    });
  };

  // 处理图片加载成功
  const handleLoad = () => {
    setLoadState('loaded');
    if (fadeIn) {
      setOpacity(1);
    }
    onLoad?.();
  };

  // 处理图片加载失败
  const handleError = () => {
    setLoadState('error');
    onError?.();
  };

  // 优化图片URL（添加质量参数）
  const getOptimizedSource = () => {
    if (typeof source === 'number') return source;
    
    const uri = source.uri;
    if (!uri) return source;

    // 如果是网络图片，添加质量参数
    if (uri.startsWith('http')) {
      const url = new URL(uri);
      const qualityParam = quality === 'low' ? 'q=50' : quality === 'medium' ? 'q=75' : 'q=90';
      url.searchParams.set('quality', qualityParam);
      url.searchParams.set('format', 'webp'); // 优先使用WebP格式
      return { uri: url.toString() };
    }

    return source;
  };

  useEffect(() => {
    // 监听滚动事件来检查可见性
    const interval = setInterval(checkVisibility, 100);
    return () => clearInterval(interval);
  }, []);

  // 渲染占位符
  const renderPlaceholder = () => {
    if (placeholder) return placeholder;
    
    return (
      <View style={[styles.placeholder, style]}>
        <ActivityIndicator size="small" color="#2E86AB" />
      </View>
    );
  };

  // 渲染错误组件
  const renderError = () => {
    if (errorComponent) return errorComponent;
    
    return (
      <View style={[styles.errorContainer, style]}>
        <Text style={styles.errorIcon}>📷</Text>
        <Text style={styles.errorText}>图片加载失败</Text>
      </View>
    );
  };

  return (
    <View ref={imageRef} style={style}>
      {!isVisible ? (
        renderPlaceholder()
      ) : loadState === 'loading' ? (
        renderPlaceholder()
      ) : loadState === 'error' ? (
        renderError()
      ) : (
        <Image
          source={getOptimizedSource()}
          style={[style, fadeIn && { opacity }]}
          resizeMode={resizeMode}
          onLoad={handleLoad}
          onError={handleError}
          fadeDuration={fadeIn ? 300 : 0}
        />
      )}
    </View>
  );
};

// 自适应图片组件
interface ResponsiveImageProps extends LazyImageProps {
  aspectRatio?: number;
  maxWidth?: number;
  maxHeight?: number;
}

export const ResponsiveImage: React.FC<ResponsiveImageProps> = ({
  aspectRatio,
  maxWidth = SCREEN_WIDTH,
  maxHeight = 300,
  style,
  ...props
}) => {
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (aspectRatio) {
      const width = Math.min(maxWidth, SCREEN_WIDTH - 40);
      const height = width / aspectRatio;
      setImageSize({ width, height: Math.min(height, maxHeight) });
    }
  }, [aspectRatio, maxWidth, maxHeight]);

  const imageStyle = [
    style,
    imageSize.width > 0 && imageSize.height > 0 && {
      width: imageSize.width,
      height: imageSize.height,
    },
  ];

  return <LazyImage {...props} style={imageStyle} />;
};

// 圆形头像组件
interface AvatarProps extends LazyImageProps {
  size: number;
  borderWidth?: number;
  borderColor?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  size,
  borderWidth = 2,
  borderColor = '#2E86AB',
  style,
  ...props
}) => {
  const avatarStyle = [
    {
      width: size,
      height: size,
      borderRadius: size / 2,
      borderWidth,
      borderColor,
    },
    style,
  ];

  return (
    <LazyImage
      {...props}
      style={avatarStyle}
      resizeMode="cover"
      placeholder={
        <View style={avatarStyle}>
          <LinearGradient
            colors={['#2E86AB', '#4CA1CF']}
            style={styles.avatarPlaceholder}
          >
            <Text style={styles.avatarText}>👤</Text>
          </LinearGradient>
        </View>
      }
    />
  );
};

// 卡片图片组件
interface CardImageProps extends LazyImageProps {
  title?: string;
  subtitle?: string;
  overlay?: boolean;
}

export const CardImage: React.FC<CardImageProps> = ({
  title,
  subtitle,
  overlay = true,
  style,
  ...props
}) => {
  return (
    <View style={[styles.cardImageContainer, style]}>
      <LazyImage
        {...props}
        style={styles.cardImage}
        placeholder={
          <View style={styles.cardImagePlaceholder}>
            <ActivityIndicator size="large" color="#2E86AB" />
          </View>
        }
      />
      {overlay && (title || subtitle) && (
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={styles.cardImageOverlay}
        >
          {title && <Text style={styles.cardImageTitle}>{title}</Text>}
          {subtitle && <Text style={styles.cardImageSubtitle}>{subtitle}</Text>}
        </LinearGradient>
      )}
    </View>
  );
};

// 图片网格组件
interface ImageGridProps {
  images: Array<{ uri: string; id: string }>;
  columns?: number;
  spacing?: number;
  onImagePress?: (image: { uri: string; id: string }) => void;
}

export const ImageGrid: React.FC<ImageGridProps> = ({
  images,
  columns = 3,
  spacing = 2,
  onImagePress,
}) => {
  const itemSize = (SCREEN_WIDTH - 40 - spacing * (columns - 1)) / columns;

  return (
    <View style={styles.imageGrid}>
      {images.map((image, index) => (
        <TouchableOpacity
          key={image.id}
          style={[
            styles.imageGridItem,
            {
              width: itemSize,
              height: itemSize,
              marginRight: (index + 1) % columns === 0 ? 0 : spacing,
              marginBottom: spacing,
            },
          ]}
          onPress={() => onImagePress?.(image)}
          activeOpacity={0.8}
        >
          <LazyImage
            source={{ uri: image.uri }}
            style={styles.imageGridImage}
            resizeMode="cover"
            quality="low"
          />
        </TouchableOpacity>
      ))}
    </View>
  );
};

// 图片预览组件
interface ImagePreviewProps {
  visible: boolean;
  imageUri: string;
  onClose: () => void;
}

export const ImagePreview: React.FC<ImagePreviewProps> = ({
  visible,
  imageUri,
  onClose,
}) => {
  if (!visible) return null;

  return (
    <View style={styles.imagePreviewOverlay}>
      <TouchableOpacity
        style={styles.imagePreviewClose}
        onPress={onClose}
      >
        <Text style={styles.imagePreviewCloseText}>✕</Text>
      </TouchableOpacity>
      <LazyImage
        source={{ uri: imageUri }}
        style={styles.imagePreviewImage}
        resizeMode="contain"
        quality="high"
        fadeIn={true}
      />
    </View>
  );
};

// 图片压缩工具
export const ImageUtils = {
  // 生成缩略图URL
  generateThumbnailUrl: (originalUrl: string, size: number = 200): string => {
    if (!originalUrl.startsWith('http')) return originalUrl;
    
    try {
      const url = new URL(originalUrl);
      url.searchParams.set('w', size.toString());
      url.searchParams.set('h', size.toString());
      url.searchParams.set('q', '75');
      url.searchParams.set('format', 'webp');
      return url.toString();
    } catch {
      return originalUrl;
    }
  },

  // 生成不同尺寸的图片URL
  generateResponsiveUrls: (originalUrl: string) => {
    if (!originalUrl.startsWith('http')) {
      return {
        thumbnail: originalUrl,
        small: originalUrl,
        medium: originalUrl,
        large: originalUrl,
      };
    }

    try {
      const url = new URL(originalUrl);
      const baseUrl = url.origin + url.pathname;
      
      return {
        thumbnail: `${baseUrl}?w=100&h=100&q=60&format=webp`,
        small: `${baseUrl}?w=300&h=300&q=70&format=webp`,
        medium: `${baseUrl}?w=600&h=600&q=80&format=webp`,
        large: `${baseUrl}?w=1200&h=1200&q=90&format=webp`,
      };
    } catch {
      return {
        thumbnail: originalUrl,
        small: originalUrl,
        medium: originalUrl,
        large: originalUrl,
      };
    }
  },

  // 预加载图片
  preloadImage: (uri: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      Image.prefetch(uri)
        .then(() => resolve())
        .catch(reject);
    });
  },

  // 批量预加载图片
  preloadImages: async (uris: string[]): Promise<void> => {
    const promises = uris.map(uri => ImageUtils.preloadImage(uri));
    await Promise.all(promises);
  },
};

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#6b7280',
  },
  avatarPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    color: 'white',
  },
  cardImageContainer: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 8,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardImagePlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardImageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  cardImageTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 4,
  },
  cardImageSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
  },
  imageGridItem: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  imageGridImage: {
    width: '100%',
    height: '100%',
  },
  imagePreviewOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  imagePreviewClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1001,
  },
  imagePreviewCloseText: {
    fontSize: 20,
    color: 'white',
    fontWeight: 'bold',
  },
  imagePreviewImage: {
    width: SCREEN_WIDTH - 40,
    height: SCREEN_WIDTH - 40,
  },
});
