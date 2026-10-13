import React from 'react';

interface HeaderProps {
  mode: 'feed' | 'editor';
  onBack?: () => void;
  onOpenMetronome?: () => void;
  onOpenTuner?: () => void;
  titleSubtitle?: { title: string; subtitle: string };
}

export const Header: React.FC<HeaderProps> = ({
  mode,
  onBack,
  onOpenMetronome,
  onOpenTuner,
  titleSubtitle,
}) => {
  const subtitle = titleSubtitle?.subtitle || (mode === 'editor' ? 'Focused Writing' : 'Notes Feed');

  return (
    <header className="fixed top-0 w-full z-50 bg-[#fbf9f5]/85 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.03)] border-b border-[#e8ded3]/60 pt-safe">
      <div className="h-16 px-4 flex items-center justify-between max-w-5xl mx-auto">
        <div className="flex items-center gap-2">
          {mode === 'editor' && onBack && (
            <button
              onClick={onBack}
              aria-label="Go back to Notes Feed"
              className="min-w-[44px] min-h-[44px] -ml-1 flex items-center justify-center rounded-lg text-on-surface hover:text-primary transition-colors active:scale-90"
            >
              <span className="material-symbols-outlined text-[24px]">arrow_back</span>
            </button>
          )}

          <div className="flex items-center gap-2 cursor-pointer" onClick={onBack}>
            <div className="w-8 h-8 rounded-lg bg-primary-container text-on-primary flex items-center justify-center shadow-xs overflow-hidden flex-shrink-0">
              <span className="material-symbols-outlined text-[20px]">music_note</span>
            </div>
            <div className="flex flex-col">
              <span className="font-headline-sm text-base text-on-surface leading-tight tracking-tight font-semibold">
                TrumpetNotes
              </span>
              <span className="font-label-sm text-xs text-on-surface-variant leading-none font-medium">
                {subtitle}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {mode === 'feed' && (
            <button
              onClick={onOpenTuner}
              aria-label="Tuner & Pitch Tool"
              className="w-10 h-10 flex items-center justify-center rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors active:scale-95"
              title="A=440Hz Reference Pitch"
            >
              <span className="material-symbols-outlined text-[22px]">graphic_eq</span>
            </button>
          )}

          <button
            onClick={onOpenMetronome}
            aria-label="Metronome Reference"
            className="w-10 h-10 flex items-center justify-center rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors active:scale-95"
            title="Metronome"
          >
            <span className="material-symbols-outlined text-[22px]">pace</span>
          </button>

          <div
            className="w-8 h-8 rounded-full bg-primary flex items-center justify-center ml-1 text-on-primary shadow-xs cursor-pointer"
            title="Brass Studio Account (Offline Persistent)"
          >
            <span className="material-symbols-outlined text-[18px]">person</span>
          </div>
        </div>
      </div>
    </header>
  );
};
