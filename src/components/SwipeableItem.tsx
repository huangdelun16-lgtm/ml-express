import React, { useRef, useState } from 'react';
import { Box, Button } from '@mui/material';

type Props = {
  children: React.ReactNode;
  onLeftAction?: () => void; // 左滑触发（显示右侧按钮）
  leftLabel?: string;
  leftColor?: 'primary' | 'error' | 'warning' | 'success' | 'info' | 'secondary';
  onRightAction?: () => void; // 右滑触发（显示左侧按钮）
  rightLabel?: string;
  rightColor?: 'primary' | 'error' | 'warning' | 'success' | 'info' | 'secondary';
  height?: number | string;
};

// 轻量滑动组件：移动端左滑/右滑露出操作按钮
const SwipeableItem: React.FC<Props> = ({ children, onLeftAction, leftLabel = '删除', leftColor = 'error', onRightAction, rightLabel = '编辑', rightColor = 'primary', height }) => {
  const startX = useRef(0);
  const translateX = useRef(0);
  const [openSide, setOpenSide] = useState<'left' | 'right' | null>(null);

  const maxReveal = 96; // 露出操作区宽度

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX - translateX.current;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - startX.current;
    // 限制范围
    translateX.current = Math.max(-maxReveal, Math.min(maxReveal, dx));
    (e.currentTarget.firstChild as HTMLElement).style.transform = `translateX(${translateX.current}px)`;
  };
  const settle = () => {
    const dx = translateX.current;
    if (dx < -40 && onLeftAction) {
      setOpenSide('left');
      translateX.current = -maxReveal;
    } else if (dx > 40 && onRightAction) {
      setOpenSide('right');
      translateX.current = maxReveal;
    } else {
      setOpenSide(null);
      translateX.current = 0;
    }
  };
  const handleTouchEnd = () => {
    settle();
  };
  const handleTouchCancel = () => {
    settle();
  };

  const reset = () => {
    setOpenSide(null);
    translateX.current = 0;
  };

  return (
    <Box sx={{ position: 'relative', overflow: 'hidden', touchAction: 'pan-y', height }} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} onTouchCancel={handleTouchCancel}>
      {/* 内容层 */}
      <Box sx={{ position: 'relative', zIndex: 2, transition: 'transform .2s ease' }}>
        {children}
      </Box>
      {/* 左侧操作（右滑显示） */}
      {onRightAction && (
        <Box sx={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: maxReveal, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
          <Button size="small" variant="contained" color={rightColor} onClick={() => { onRightAction(); reset(); }}>{rightLabel}</Button>
        </Box>
      )}
      {/* 右侧操作（左滑显示） */}
      {onLeftAction && (
        <Box sx={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: maxReveal, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
          <Button size="small" variant="contained" color={leftColor} onClick={() => { onLeftAction(); reset(); }}>{leftLabel}</Button>
        </Box>
      )}
    </Box>
  );
};

export default SwipeableItem;


