import React, { useState } from 'react';
import { TrumpetFingering } from '../domain/music/TrumpetFingering.ts';
import { Note } from '../domain/music/Note.ts';
import { TrumpetAudioEngine } from '../services/audio/TrumpetAudioEngine.ts';

export const ValvesView: React.FC = () => {
  const [selectedNoteStr, setSelectedNoteStr] = useState<string>('C4');
  const [manualValve1, setManualValve1] = useState(false);
  const [manualValve2, setManualValve2] = useState(false);
  const [manualValve3, setManualValve3] = useState(false);

  const parsedNote = Note.parse(selectedNoteStr) ?? Note.parse('C4')!;
  const fingering = parsedNote.getFingering();
  const freq = parsedNote.getFrequency();

  const playCurrentNote = () => {
    TrumpetAudioEngine.getInstance().playNoteTone(freq, 0.6);
  };

  const chromaticScale = [
    'F#3', 'G3', 'G#3', 'A3', 'A#3', 'B3',
    'C4', 'C#4', 'D4', 'D#4', 'E4', 'F4', 'F#4', 'G4', 'G#4', 'A4', 'A#4', 'B4',
    'C5', 'C#5', 'D5', 'D#5', 'E5', 'F5', 'F#5', 'G5', 'G#5', 'A5', 'A#5', 'B5',
    'C6'
  ];

  // Map manual valve combo to possible notes
  const manualComboStr = [manualValve1 ? '1' : null, manualValve2 ? '2' : null, manualValve3 ? '3' : null]
    .filter(Boolean)
    .join('-') || '0';

  return (
    <div className="flex flex-col w-full pb-28 max-w-2xl mx-auto px-4 pt-2">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="font-headline-md text-xl text-on-surface font-bold">Valve Mastery & Mechanics</h1>
          <p className="font-body-sm text-xs text-on-surface-variant">
            Acoustic fingering chart, slide kick compensation & partial harmonics
          </p>
        </div>
      </div>

      {/* Interactive Piston Hero Display */}
      <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-xs border border-[#e8ded3] flex flex-col gap-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="font-headline-xl text-3xl font-extrabold text-on-surface tracking-tight">
              {selectedNoteStr}
            </span>
            <span className="font-label-md text-xs text-on-surface-variant">
              (Concert: {parsedNote.transpose(-2).toEnglish(true)})
            </span>
          </div>

          <button
            onClick={playCurrentNote}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-container text-on-primary font-label-md text-xs font-semibold shadow-xs active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">volume_up</span>
            <span>{Math.round(freq)} Hz</span>
          </button>
        </div>

        {/* 3 Physical Valve Piston Caps */}
        <div className="flex items-center justify-center gap-6 py-4 bg-[#f6f2e9] rounded-xl border border-[#e8ded3]">
          {/* Valve 1 */}
          <div className="flex flex-col items-center gap-2">
            <span className="font-label-sm text-[11px] text-on-surface-variant font-bold">VALVE 1</span>
            <div
              className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg border-2 shadow-sm transition-all duration-200 ${
                fingering.valve1
                  ? 'bg-primary text-on-primary border-[#5d4201] translate-y-1 scale-102 ring-4 ring-primary-container/40'
                  : 'bg-surface-container-lowest text-on-surface border-[#d1c5b4]'
              }`}
            >
              1
            </div>
            <span className="font-label-sm text-[10px] text-tertiary">Whole step (2 ST)</span>
          </div>

          {/* Valve 2 */}
          <div className="flex flex-col items-center gap-2">
            <span className="font-label-sm text-[11px] text-on-surface-variant font-bold">VALVE 2</span>
            <div
              className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg border-2 shadow-sm transition-all duration-200 ${
                fingering.valve2
                  ? 'bg-primary text-on-primary border-[#5d4201] translate-y-1 scale-102 ring-4 ring-primary-container/40'
                  : 'bg-surface-container-lowest text-on-surface border-[#d1c5b4]'
              }`}
            >
              2
            </div>
            <span className="font-label-sm text-[10px] text-tertiary">Half step (1 ST)</span>
          </div>

          {/* Valve 3 */}
          <div className="flex flex-col items-center gap-2">
            <span className="font-label-sm text-[11px] text-on-surface-variant font-bold">VALVE 3</span>
            <div
              className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg border-2 shadow-sm transition-all duration-200 ${
                fingering.valve3
                  ? 'bg-primary text-on-primary border-[#5d4201] translate-y-1 scale-102 ring-4 ring-primary-container/40'
                  : 'bg-surface-container-lowest text-on-surface border-[#d1c5b4]'
              }`}
            >
              3
            </div>
            <span className="font-label-sm text-[10px] text-tertiary">Minor 3rd (3 ST)</span>
          </div>
        </div>

        {/* Slide Compensation & Alternate Advice */}
        <div className="flex flex-col gap-2 pt-1 border-t border-[#e8ded3]">
          <div className="flex items-center justify-between text-xs font-label-md">
            <span className="text-on-surface-variant">Primary Fingering:</span>
            <span className="font-bold text-primary text-sm">{fingering.label === '0' ? '0 (Open)' : fingering.label}</span>
          </div>
          {fingering.alternate && (
            <div className="flex items-center justify-between text-xs font-label-md">
              <span className="text-on-surface-variant">Alternate Fingering:</span>
              <span className="text-tertiary font-semibold">{fingering.alternate}</span>
            </div>
          )}
          {fingering.slideAdjustment && (
            <div className="p-2.5 rounded-lg bg-tertiary-fixed/40 text-on-tertiary-fixed font-body-sm text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-tertiary flex-shrink-0">tune</span>
              <span>Intonation rule: <strong>{fingering.slideAdjustment}</strong> to prevent sharp pitch bias.</span>
            </div>
          )}
        </div>
      </div>

      {/* Chromatic Range Selector Carousel */}
      <div className="bg-surface-container-lowest rounded-xl p-3 shadow-xs border border-[#e8ded3] mb-4">
        <span className="font-label-sm text-[11px] text-on-surface-variant font-bold uppercase tracking-wider block mb-2">
          Select Pitch in Range (Trumpet Written)
        </span>
        <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-1">
          {chromaticScale.map((n) => {
            const isSelected = selectedNoteStr === n;
            const parsed = Note.parse(n)!;
            const f = parsed.getFingering();
            return (
              <button
                key={n}
                onClick={() => {
                  setSelectedNoteStr(n);
                  TrumpetAudioEngine.getInstance().playNoteTone(parsed.getFrequency(), 0.3);
                }}
                className={`px-2.5 py-1.5 rounded-lg font-label-md text-xs transition-all flex flex-col items-center min-w-[46px] ${
                  isSelected
                    ? 'bg-primary-container text-on-primary font-bold shadow-xs scale-105 ring-1 ring-primary'
                    : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
                }`}
              >
                <span>{n}</span>
                <span className="text-[10px] opacity-80">{f.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Manual Interactive Valve Explorer */}
      <div className="bg-surface-container rounded-xl p-4 border border-[#e8ded3]">
        <div className="flex items-center justify-between mb-2">
          <span className="font-headline-sm text-sm font-semibold text-on-surface">Piston Experimenter</span>
          <span className="font-label-sm text-xs px-2 py-0.5 rounded bg-surface-container-lowest text-primary font-bold">
            Active: {manualComboStr}
          </span>
        </div>
        <p className="font-body-sm text-xs text-on-surface-variant mb-3">
          Tap the three valve switches below to see all notes sounding on that piston combination:
        </p>

        <div className="grid grid-cols-3 gap-2 mb-3">
          <button
            onClick={() => setManualValve1(!manualValve1)}
            className={`py-2 rounded-lg font-label-md text-xs font-bold transition-all border ${
              manualValve1
                ? 'bg-primary text-on-primary border-primary'
                : 'bg-surface-container-lowest text-on-surface border-[#d1c5b4]'
            }`}
          >
            Valve 1 {manualValve1 ? '●' : '○'}
          </button>
          <button
            onClick={() => setManualValve2(!manualValve2)}
            className={`py-2 rounded-lg font-label-md text-xs font-bold transition-all border ${
              manualValve2
                ? 'bg-primary text-on-primary border-primary'
                : 'bg-surface-container-lowest text-on-surface border-[#d1c5b4]'
            }`}
          >
            Valve 2 {manualValve2 ? '●' : '○'}
          </button>
          <button
            onClick={() => setManualValve3(!manualValve3)}
            className={`py-2 rounded-lg font-label-md text-xs font-bold transition-all border ${
              manualValve3
                ? 'bg-primary text-on-primary border-primary'
                : 'bg-surface-container-lowest text-on-surface border-[#d1c5b4]'
            }`}
          >
            Valve 3 {manualValve3 ? '●' : '○'}
          </button>
        </div>

        <div className="p-2.5 bg-surface-container-lowest rounded-lg border border-[#e8ded3] text-xs font-body-sm text-on-surface">
          <strong>Harmonic series on ({manualComboStr}): </strong>
          {manualComboStr === '0' && 'C4, G4, C5, E5, G5, A#5, C6 (Open Horn / 0)'}
          {manualComboStr === '2' && 'B3, F#4, B4, D#5, F#5, A5, B5'}
          {manualComboStr === '1' && 'A#3, F4, A#4, D5, F5, G#5, A#5'}
          {manualComboStr === '1-2' && 'A3, E4, A4, C#5, E5, G5, A5'}
          {manualComboStr === '2-3' && 'G#3, D#4, G#4, C5, D#5, F#5, G#5'}
          {manualComboStr === '1-3' && 'G3, D4, G4, B4, D5, F5, G5'}
          {manualComboStr === '1-2-3' && 'F#3, C#4, F#4, A#4, C#5, E5, F#5 (Max tube extension)'}
        </div>
      </div>
    </div>
  );
};
