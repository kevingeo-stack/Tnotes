import { useEffect, useRef } from 'react';

export interface SwipePoint {
  x: number;
  y: number;
  time: number;
}

export interface SwipeBackOptions {
  onSwipeBack: () => void;
  enabled?: boolean;
  minDistance?: number;
  maxAngleRatio?: number;
  maxDuration?: number;
}

/**
 * Evalúa matemáticamente si un movimiento táctil corresponde a un gesto horizontal hacia la derecha válido:
 * 1. Desplazamiento neto horizontal a la derecha: deltaX >= minDistance (ej. 65px).
 * 2. Movimiento predominantemente horizontal (|deltaY| <= deltaX * maxAngleRatio), descartando scrolls verticales.
 * 3. Gesto fluido en el tiempo (duration <= maxDuration).
 */
export function isSwipeBackGesture(
  start: SwipePoint,
  end: SwipePoint,
  options: { minDistance?: number; maxAngleRatio?: number; maxDuration?: number } = {}
): boolean {
  const minDistance = options.minDistance ?? 65;
  const maxAngleRatio = options.maxAngleRatio ?? 0.55;
  const maxDuration = options.maxDuration ?? 550;

  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  const duration = end.time - start.time;

  return (
    deltaX >= minDistance &&
    Math.abs(deltaY) <= deltaX * maxAngleRatio &&
    duration <= maxDuration
  );
}

/**
 * Conecta los listeners táctiles a un elemento DOM respetando las directrices de seguridad de TNotes:
 * - No interfiere con inputs, textareas ni botones interactivos.
 * - No interfiere con el teclado musical ni con la selección de texto.
 * - Respeta la zona de gestos del sistema operativo (< 18px).
 * - Listeners pasivos que no impiden el scroll vertical fluido.
 */
export function attachSwipeBackListener(
  el: HTMLElement,
  options: SwipeBackOptions
): () => void {
  const {
    onSwipeBack,
    enabled = true,
    minDistance = 65,
    maxAngleRatio = 0.55,
    maxDuration = 550,
  } = options;

  if (!enabled) return () => {};

  let touchStart: { x: number; y: number; time: number; shouldIgnore: boolean } | null = null;
  let isNavigating = false;

  const handleTouchStart = (e: TouchEvent) => {
    if (e.touches.length !== 1) {
      touchStart = null;
      return;
    }

    const touch = e.touches[0];
    const target = e.target as HTMLElement | null;

    // Ignorar controles interactivos, campos de texto, botones y asistente musical
    const isInteractive = target?.closest(
      'input, textarea, select, button, [role="button"], [data-gesture-ignore="true"], .no-swipe'
    );

    // Ignorar si el usuario está seleccionando texto
    const hasTextSelection = Boolean(
      typeof window !== 'undefined' && window.getSelection()?.toString().length
    );

    // Ignorar inicio de toque en el borde extremo (< 18px) reservado para gestos de sistema (iOS / Android)
    const isSystemEdge = touch.clientX < 18;

    touchStart = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
      shouldIgnore: Boolean(isInteractive || hasTextSelection || isSystemEdge),
    };
  };

  const handleTouchEnd = (e: TouchEvent) => {
    if (!touchStart || touchStart.shouldIgnore || isNavigating) {
      touchStart = null;
      return;
    }

    const touch = e.changedTouches[0];
    if (!touch) {
      touchStart = null;
      return;
    }

    const start: SwipePoint = { x: touchStart.x, y: touchStart.y, time: touchStart.time };
    const end: SwipePoint = { x: touch.clientX, y: touch.clientY, time: Date.now() };

    touchStart = null;

    if (isSwipeBackGesture(start, end, { minDistance, maxAngleRatio, maxDuration })) {
      isNavigating = true;
      onSwipeBack();
      setTimeout(() => {
        isNavigating = false;
      }, 400);
    }
  };

  const handleTouchCancel = () => {
    touchStart = null;
  };

  el.addEventListener('touchstart', handleTouchStart, { passive: true });
  el.addEventListener('touchend', handleTouchEnd, { passive: true });
  el.addEventListener('touchcancel', handleTouchCancel, { passive: true });

  return () => {
    el.removeEventListener('touchstart', handleTouchStart);
    el.removeEventListener('touchend', handleTouchEnd);
    el.removeEventListener('touchcancel', handleTouchCancel);
  };
}

/**
 * Hook de React para navegación por gestos horizontales en vistas secundarias de TNotes.
 */
export function useSwipeBack<T extends HTMLElement = HTMLDivElement>(
  options: SwipeBackOptions
) {
  const containerRef = useRef<T | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    return attachSwipeBackListener(el, options);
  }, [
    options.enabled,
    options.minDistance,
    options.maxAngleRatio,
    options.maxDuration,
    options.onSwipeBack,
  ]);

  return containerRef;
}
