import React from 'react';
import { TrumpetFingeringInfo } from '../domain/music/TrumpetFingering.ts';
import { TrumpetAudioEngine } from '../services/audio/TrumpetAudioEngine.ts';

interface ValveNodeProps {
  noteName: string;
  fingering: TrumpetFingeringInfo;
  isActive?: boolean;
  frequency?: number;
  onClick?: () => void;
}

export const ValveNode: React.FC<ValveNodeProps> = ({
  noteName,
  fingering,
  isActive = false,
  frequency,
  onClick,
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (frequency) {
      TrumpetAudioEngine.getInstance().playNoteTone(frequency);
    }
    onClick?.();
  };

  return (
    <div
      onClick={handleClick}
      className={`flex flex-col items-center gap-1.5 p-2 rounded-lg min-w-[54px] flex-shrink-0 cursor-pointer transition-all duration-150 select-none active:scale-95 ${
        isActive
          ? 'bg-[#ffdea5] shadow-md ring-1.5 ring-[#775a19]/40 scale-105'
          : 'bg-surface-container-lowest shadow-xs hover:bg-[#f6f2e9]'
      }`}
      title={`Valve ${fingering.label}${fingering.slideAdjustment ? ` (${fingering.slideAdjustment})` : ''} - Click to hear pitch`}
    >
      <span className={`font-label-lg text-sm font-bold tracking-tight ${isActive ? 'text-[#261900]' : 'text-on-surface'}`}>
        {noteName}
      </span>

      {/* 3 Trumpet Valve Pistons */}
      <div className="flex gap-0.5 items-center">
        {/* Valve 1 */}
        <span
          className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-label-sm font-bold transition-colors ${
            fingering.valve1
              ? isActive
                ? 'bg-primary text-on-primary'
                : 'bg-primary-container text-on-primary'
              : 'bg-surface-container-high text-on-surface-variant'
          }`}
        >
          1
        </span>

        {/* Valve 2 */}
        <span
          className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-label-sm font-bold transition-colors ${
            fingering.valve2
              ? isActive
                ? 'bg-primary text-on-primary'
                : 'bg-primary-container text-on-primary'
              : 'bg-surface-container-high text-on-surface-variant'
          }`}
        >
          2
        </span>

        {/* Valve 3 */}
        <span
          className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-label-sm font-bold transition-colors ${
            fingering.valve3
              ? isActive
                ? 'bg-primary text-on-primary'
                : 'bg-primary-container text-on-primary'
              : 'bg-surface-container-high text-on-surface-variant'
          }`}
        >
          3
        </span>
      </div>

      <span
        className={`font-label-sm text-[11px] font-semibold leading-none ${
          isActive ? 'text-[#261900] font-bold' : 'text-tertiary'
        }`}
      >
        {fingering.label}
      </span>
    </div>
  );
};
