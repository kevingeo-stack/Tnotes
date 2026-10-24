import React from 'react';

interface DualKeyBadgeProps {
  trumpetKey: string;
  concertKey: string;
  activeInstrument?: 'trumpet' | 'keyboard';
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

export const DualKeyBadge: React.FC<DualKeyBadgeProps> = ({
  trumpetKey,
  concertKey,
  activeInstrument = 'trumpet',
  size = 'sm',
  className = ''
}) => {
  const isTrumpetActive = activeInstrument === 'trumpet';

  const sizeClasses = {
    xs: {
      container: 'gap-1 text-[10px] sm:text-[11px] max-w-full items-center',
      badge: 'px-1.5 py-0.5 rounded-md truncate max-w-[80px] sm:max-w-[92px]',
      icon: 'text-[10px] sm:text-xs shrink-0',
      text: 'font-bold truncate'
    },
    sm: {
      container: 'gap-1.5 text-xs',
      badge: 'px-2 py-0.5 rounded-lg',
      icon: 'text-sm shrink-0',
      text: 'font-bold truncate'
    },
    md: {
      container: 'gap-2 text-sm',
      badge: 'px-3 py-1 rounded-xl',
      icon: 'text-base',
      text: 'font-extrabold'
    }
  }[size];

  return (
    <div className={`inline-flex items-center flex-wrap ${sizeClasses.container} ${className}`}>
      {/* Insignia Trompeta (Sib) */}
      <span
        className={`inline-flex items-center gap-1 border transition-all ${sizeClasses.badge} ${
          isTrumpetActive
            ? 'bg-amber-100/90 dark:bg-amber-950/50 text-amber-900 dark:text-amber-300 border-amber-300/80 dark:border-amber-700/60 shadow-xs'
            : 'bg-amber-50/70 dark:bg-amber-950/25 text-amber-700/90 dark:text-amber-400/80 border-amber-200/50 dark:border-amber-900/40 opacity-90'
        }`}
        title={`Tonalidad escrita de Trompeta (Sib): ${trumpetKey}`}
      >
        <span className={sizeClasses.icon}>🎺</span>
        <span className={sizeClasses.text}>{trumpetKey || 'Sin tono'}</span>
      </span>

      {/* Separador sutil */}
      <span className="text-gray-300 dark:text-gray-600 font-light select-none">|</span>

      {/* Insignia Teclado (Concierto) */}
      <span
        className={`inline-flex items-center gap-1 border transition-all ${sizeClasses.badge} ${
          !isTrumpetActive
            ? 'bg-blue-100/90 dark:bg-blue-950/50 text-blue-900 dark:text-blue-300 border-blue-300/80 dark:border-blue-700/60 shadow-xs'
            : 'bg-blue-50/70 dark:bg-blue-950/25 text-blue-700/90 dark:text-blue-400/80 border-blue-200/50 dark:border-blue-900/40 opacity-90'
        }`}
        title={`Tonalidad de Concierto / Teclado: ${concertKey}`}
      >
        <span className={sizeClasses.icon}>🎹</span>
        <span className={sizeClasses.text}>{concertKey || 'Sin tono'}</span>
      </span>
    </div>
  );
};
