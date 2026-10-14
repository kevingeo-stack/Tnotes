import React, { useMemo } from 'react';
import { PITCH_CLASSES, SharpPitch } from '../../domain/music/PitchClass';
import { keyboardToTrumpet, transposeText } from '../../domain/music/TranspositionEngine';
import { detectKey } from '../../domain/music/KeyDetector';
import { formatKeyName, toNatural, NotationSystem } from '../../domain/music/NotationSystem';
import { SongNote } from '../../types/note';

interface PitchSpaceViewProps {
  activeNote: SongNote;
  notation: NotationSystem;
}

export function PitchSpaceView({ activeNote, notation }: PitchSpaceViewProps) {
  const concertKey = useMemo(() => {
    if (activeNote.detectedKey && activeNote.detectedKey !== 'Indeterminada') {
      return activeNote.detectedKey;
    }
    const concertContent = activeNote.activeInstrument === 'trumpet'
      ? transposeText(activeNote.content, 'TRUMPET_TO_KEYBOARD')
      : activeNote.content;
    const res = detectKey(concertContent);
    return res.key || res.formatted;
  }, [activeNote.detectedKey, activeNote.content, activeNote.activeInstrument]);

  const activeScaleNotes = useMemo(() => {
    const keyParts = concertKey.split(' ');
    if (keyParts.length !== 2) return new Set<string>();
    
    const root = keyParts[0] as SharpPitch;
    const type = keyParts[1];
    
    if (!PITCH_CLASSES.includes(root)) return new Set<string>();

    const MAJOR_SCALE_INTERVALS = [0, 2, 4, 5, 7, 9, 11];
    const MINOR_SCALE_INTERVALS = [0, 2, 3, 5, 7, 8, 10];
    
    const intervals = type === 'Mayor' ? MAJOR_SCALE_INTERVALS : MINOR_SCALE_INTERVALS;
    const rootIndex = PITCH_CLASSES.indexOf(root);
    
    return new Set(intervals.map(i => PITCH_CLASSES[(rootIndex + i) % 12]));
  }, [concertKey]);

  const displayKey = useMemo(() => formatKeyName(concertKey, notation), [concertKey, notation]);

  return (
    <div className="w-full mx-auto p-4 md:p-6 pb-32">
      <h1 className="text-3xl font-bold text-[#202124] dark:text-[#E8EAED] mb-2">Espacio Armónico</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-8">
        Analizando la canción activa: <strong className="text-amber-600 dark:text-amber-400">{activeNote.title || 'Sin título'}</strong> 
        {' '} ({displayKey})
      </p>

      <div className="bg-white dark:bg-[#28292A] rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 sm:p-6 mb-8">
        <h2 className="text-xl font-semibold mb-6 text-gray-800 dark:text-gray-200">Rueda Cromática</h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-12 gap-4">
          {PITCH_CLASSES.map(pitch => {
            const inScale = activeScaleNotes.has(pitch);
            const displayPitch = notation === 'natural' ? toNatural(pitch) : pitch;
            
            return (
              <div 
                key={pitch} 
                className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition ${
                  inScale 
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-900 dark:text-amber-400 shadow-sm scale-105' 
                    : 'border-transparent bg-gray-50 dark:bg-[#1F1F1F] text-gray-400 dark:text-gray-600 opacity-60'
                }`}
              >
                <span className="text-xl sm:text-2xl font-bold">{displayPitch}</span>
                {inScale && <span className="text-[10px] mt-1 uppercase font-semibold text-center leading-tight">En<br/>Escala</span>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white dark:bg-[#28292A] rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <h2 className="text-xl font-semibold p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200">
          Mapeo de Transposición
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm sm:text-base">
            <thead>
              <tr className="bg-gray-50 dark:bg-[#1F1F1F]">
                <th className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700 font-semibold text-gray-700 dark:text-gray-300">🎹 Teclado (Concert)</th>
                <th className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700 font-semibold text-gray-700 dark:text-gray-300">🎺 Trompeta en Sib</th>
              </tr>
            </thead>
            <tbody>
              {PITCH_CLASSES.map(pitch => {
                const trumpetPitch = keyboardToTrumpet(pitch);
                const displayConcert = notation === 'natural' ? toNatural(pitch) : pitch;
                const displayTrumpet = notation === 'natural' ? toNatural(trumpetPitch) : trumpetPitch;
                
                return (
                  <tr key={pitch} className={`border-b border-gray-100 dark:border-gray-800/50 ${activeScaleNotes.has(pitch) ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''}`}>
                    <td className="p-3 sm:p-4 font-mono font-bold text-gray-800 dark:text-gray-300">
                      {displayConcert}
                    </td>
                    <td className="p-3 sm:p-4 font-mono font-bold text-amber-600 dark:text-amber-400">
                      {displayTrumpet} <span className="text-xs font-normal opacity-50 ml-1 sm:ml-2">(+2)</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
