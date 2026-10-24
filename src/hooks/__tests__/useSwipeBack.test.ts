import { describe, it, expect, vi } from 'vitest';
import { isSwipeBackGesture, attachSwipeBackListener } from '../useSwipeBack';

describe('useSwipeBack — Motor y Seguridad de Gestos Horizontales (TNotes)', () => {
  // =========================================================================
  // 1. REGLAS MATEMÁTICAS DE DETECCIÓN (isSwipeBackGesture)
  // =========================================================================
  it('1. detecta un deslizamiento horizontal hacia la derecha válido', () => {
    const start = { x: 50, y: 100, time: 1000 };
    const end = { x: 150, y: 110, time: 1250 }; // deltaX = 100, deltaY = 10, dur = 250ms

    expect(isSwipeBackGesture(start, end, { minDistance: 65, maxAngleRatio: 0.55 })).toBe(true);
  });

  it('2. rechaza deslizamiento hacia la izquierda (deltaX negativo)', () => {
    const start = { x: 150, y: 100, time: 1000 };
    const end = { x: 50, y: 100, time: 1200 }; // deltaX = -100

    expect(isSwipeBackGesture(start, end)).toBe(false);
  });

  it('3. rechaza desplazamientos inferiores al umbral mínimo (minDistance)', () => {
    const start = { x: 50, y: 100, time: 1000 };
    const end = { x: 90, y: 100, time: 1150 }; // deltaX = 40 < 65

    expect(isSwipeBackGesture(start, end, { minDistance: 65 })).toBe(false);
  });

  it('4. descarta desplazamientos verticales (scroll nativo)', () => {
    const start = { x: 50, y: 100, time: 1000 };
    const end = { x: 120, y: 200, time: 1200 }; // deltaX = 70, deltaY = 100 (100 > 70 * 0.55)

    expect(isSwipeBackGesture(start, end, { minDistance: 65, maxAngleRatio: 0.55 })).toBe(false);
  });

  it('5. descarta gestos excesivamente lentos que no corresponden a un swipe (maxDuration)', () => {
    const start = { x: 50, y: 100, time: 1000 };
    const end = { x: 150, y: 100, time: 2000 }; // dur = 1000ms > 550ms

    expect(isSwipeBackGesture(start, end, { maxDuration: 550 })).toBe(false);
  });

  // =========================================================================
  // 2. SEGURIDAD DE INTERACCIÓN (attachSwipeBackListener con mock DOM)
  // =========================================================================
  const createMockElement = () => {
    const listeners: Record<string, Function[]> = {};
    return {
      addEventListener: (type: string, fn: Function) => {
        if (!listeners[type]) listeners[type] = [];
        listeners[type].push(fn);
      },
      removeEventListener: (type: string, fn: Function) => {
        if (!listeners[type]) return;
        listeners[type] = listeners[type].filter(f => f !== fn);
      },
      trigger: (type: string, event: any) => {
        if (listeners[type]) {
          listeners[type].forEach(fn => fn(event));
        }
      },
      listeners,
    } as any;
  };

  it('6. ejecuta onSwipeBack en evento táctil real sobre el contenedor', () => {
    const mockEl = createMockElement();
    const onSwipeBack = vi.fn();
    const cleanup = attachSwipeBackListener(mockEl, {
      onSwipeBack,
      enabled: true,
      minDistance: 60,
    });

    const mockTarget = {
      closest: vi.fn().mockReturnValue(null),
    };

    // touchstart
    mockEl.trigger('touchstart', {
      touches: [{ clientX: 50, clientY: 100 }],
      target: mockTarget,
    });

    // touchend
    mockEl.trigger('touchend', {
      changedTouches: [{ clientX: 150, clientY: 105 }],
      target: mockTarget,
    });

    expect(onSwipeBack).toHaveBeenCalledTimes(1);
    cleanup();
  });

  it('7. NO se activa si el toque inicia dentro de un <textarea> o <input>', () => {
    const mockEl = createMockElement();
    const onSwipeBack = vi.fn();
    const cleanup = attachSwipeBackListener(mockEl, {
      onSwipeBack,
      enabled: true,
      minDistance: 60,
    });

    const mockTextareaTarget = {
      closest: vi.fn().mockImplementation((selector: string) => {
        return selector.includes('textarea') ? {} : null;
      }),
    };

    mockEl.trigger('touchstart', {
      touches: [{ clientX: 50, clientY: 100 }],
      target: mockTextareaTarget,
    });

    mockEl.trigger('touchend', {
      changedTouches: [{ clientX: 160, clientY: 100 }],
      target: mockTextareaTarget,
    });

    expect(onSwipeBack).not.toHaveBeenCalled();
    cleanup();
  });

  it('8. NO se activa dentro del asistente de teclado musical (data-gesture-ignore)', () => {
    const mockEl = createMockElement();
    const onSwipeBack = vi.fn();
    const cleanup = attachSwipeBackListener(mockEl, {
      onSwipeBack,
      enabled: true,
      minDistance: 60,
    });

    const mockKeyboardTarget = {
      closest: vi.fn().mockImplementation((selector: string) => {
        return selector.includes('data-gesture-ignore') ? {} : null;
      }),
    };

    mockEl.trigger('touchstart', {
      touches: [{ clientX: 50, clientY: 100 }],
      target: mockKeyboardTarget,
    });

    mockEl.trigger('touchend', {
      changedTouches: [{ clientX: 160, clientY: 100 }],
      target: mockKeyboardTarget,
    });

    expect(onSwipeBack).not.toHaveBeenCalled();
    cleanup();
  });

  it('9. NO se apropia de gestos del borde del sistema operativo (< 18px)', () => {
    const mockEl = createMockElement();
    const onSwipeBack = vi.fn();
    const cleanup = attachSwipeBackListener(mockEl, {
      onSwipeBack,
      enabled: true,
      minDistance: 60,
    });

    const mockTarget = { closest: vi.fn().mockReturnValue(null) };

    // Inicio en X = 10px (< 18px borde SO)
    mockEl.trigger('touchstart', {
      touches: [{ clientX: 10, clientY: 100 }],
      target: mockTarget,
    });

    mockEl.trigger('touchend', {
      changedTouches: [{ clientX: 140, clientY: 100 }],
      target: mockTarget,
    });

    expect(onSwipeBack).not.toHaveBeenCalled();
    cleanup();
  });

  it('10. respeta enabled: false cuando se encuentra en la pantalla raíz', () => {
    const mockEl = createMockElement();
    const onSwipeBack = vi.fn();
    const cleanup = attachSwipeBackListener(mockEl, {
      onSwipeBack,
      enabled: false,
    });

    const mockTarget = { closest: vi.fn().mockReturnValue(null) };

    mockEl.trigger('touchstart', {
      touches: [{ clientX: 50, clientY: 100 }],
      target: mockTarget,
    });

    mockEl.trigger('touchend', {
      changedTouches: [{ clientX: 160, clientY: 100 }],
      target: mockTarget,
    });

    expect(onSwipeBack).not.toHaveBeenCalled();
    cleanup();
  });
});
