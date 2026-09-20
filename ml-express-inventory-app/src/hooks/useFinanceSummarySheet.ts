import { useCallback, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder } from 'react-native';
import {
  progressFromDrag,
  resolveFinanceSummarySnap,
  shouldClaimFinanceSummaryPan,
} from '../utils/financeSummarySheet';

export function useFinanceSummarySheet() {
  const progress = useRef(new Animated.Value(0)).current;
  const [open, setOpen] = useState(false);
  const openRef = useRef(false);
  const startProgressRef = useRef(0);
  const panelHeightRef = useRef(280);
  const [panelHeight, setPanelHeightState] = useState(280);

  const setPanelHeight = useCallback((height: number) => {
    if (!(height > 0)) return;
    panelHeightRef.current = height;
    setPanelHeightState((prev) => (Math.abs(prev - height) < 2 ? prev : height));
  }, []);

  const setOpenTo = useCallback(
    (next: boolean) => {
      openRef.current = next;
      setOpen(next);
      Animated.spring(progress, {
        toValue: next ? 1 : 0,
        friction: 9,
        tension: 72,
        overshootClamping: true,
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (finished && !next) progress.setValue(0);
      });
    },
    [progress],
  );

  const toggle = useCallback(() => {
    setOpenTo(!openRef.current);
  }, [setOpenTo]);

  const panHandlers = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          shouldClaimFinanceSummaryPan({
            open: openRef.current,
            dx: gesture.dx,
            dy: gesture.dy,
          }),
        onMoveShouldSetPanResponderCapture: (_, gesture) =>
          shouldClaimFinanceSummaryPan({
            open: openRef.current,
            dx: gesture.dx,
            dy: gesture.dy,
            capture: true,
          }),
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          startProgressRef.current = openRef.current ? 1 : 0;
          progress.stopAnimation((value) => {
            startProgressRef.current = value;
          });
        },
        onPanResponderMove: (_, gesture) => {
          const dist = openRef.current
            ? Math.max(110, panelHeightRef.current * 0.32)
            : Math.max(160, panelHeightRef.current * 0.55);
          progress.setValue(progressFromDrag(startProgressRef.current, gesture.dy, dist));
        },
        onPanResponderRelease: (_, gesture) => {
          const decision = resolveFinanceSummarySnap({
            startProgress: startProgressRef.current,
            dy: gesture.dy,
            vy: gesture.vy,
          });
          if (decision === 'tap') {
            setOpenTo(openRef.current);
            return;
          }
          setOpenTo(decision === 'open');
        },
        onPanResponderTerminate: () => {
          setOpenTo(openRef.current);
        },
      }).panHandlers,
    [progress, setOpenTo],
  );

  return {
    progress,
    open,
    panelHeight,
    setPanelHeight,
    setOpenTo,
    toggle,
    panHandlers,
  };
}
