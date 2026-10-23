import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { normalizeFlatsToSharps, normalizeKeyName } from '../../domain/music/PitchClass';

interface KeyTransposeModalProps {
  isOpen: boolean;
  currentKey: string;
  onConfirm: (targetKey: string) => void;
  onCancel: () => void;
}

const ALL_KEYS_ENG = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const ALL_KEYS_LAT = ['Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'];

const isLatinKey = (key: string): boolean => {
  return /^(Do|Re|Mi|Fa|Sol|La|Si)/i.test(key.trim());
};

const normalizeRootByLanguage = (rawRoot: string, isLatin: boolean): string => {
  const norm = normalizeFlatsToSharps(rawRoot);
  if (isLatin) {
    const latMap: Record<string, string> = {
      'C': 'Do', 'C#': 'Do#', 'D': 'Re', 'D#': 'Re#', 'E': 'Mi',
      'F': 'Fa', 'F#': 'Fa#', 'G': 'Sol', 'G#': 'Sol#', 'A': 'La', 'A#': 'La#', 'B': 'Si'
    };
    return latMap[norm] || norm;
  } else {
    const engMap: Record<string, string> = {
      'Do': 'C', 'Do#': 'C#', 'Re': 'D', 'Re#': 'D#', 'Mi': 'E',
      'Fa': 'F', 'Fa#': 'F#', 'Sol': 'G', 'Sol#': 'G#', 'La': 'A', 'La#': 'A#', 'Si': 'B'
    };
    return engMap[norm] || norm;
  }
};

export const KeyTransposeModal: React.FC<KeyTransposeModalProps> = ({
  isOpen,
  currentKey,
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  const normalizedCurrent = normalizeKeyName(currentKey);
  const isLatin = isLatinKey(normalizedCurrent);
  const keysList = isLatin ? ALL_KEYS_LAT : ALL_KEYS_ENG;

  const rawRoot = normalizedCurrent ? normalizedCurrent.split(' ')[0] : (isLatin ? 'Do' : 'C');
  const currentRoot = normalizeRootByLanguage(rawRoot, isLatin);
  const currentMode = normalizedCurrent && normalizedCurrent.includes('Menor') ? 'Menor' : 'Mayor';
  const [selectedRoot, setSelectedRoot] = useState(currentRoot);

  useEffect(() => {
    const norm = normalizeKeyName(currentKey);
    const lat = isLatinKey(norm);
    const raw = norm ? norm.split(' ')[0] : (lat ? 'Do' : 'C');
    setSelectedRoot(normalizeRootByLanguage(raw, lat));
  }, [currentKey, isOpen]);

  const handleApply = () => {
    const targetFormatted = `${selectedRoot} ${currentMode}`;
    onConfirm(targetFormatted);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150" onClick={onCancel}>
      <div 
        className="w-full max-w-sm bg-white dark:bg-[#202124] rounded-3xl p-6 shadow-2xl border border-gray-200 dark:border-gray-700/80 flex flex-col gap-4 text-center" 
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-center gap-2">
          <span className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
            <RefreshCw size={18} />
          </span>
          <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100">
            Cambiar Tonalidad
          </h3>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400">
          Tonalidad actual: <strong className="text-amber-600 dark:text-amber-400">{normalizedCurrent || 'Sin tono'}</strong>
        </p>

        <div className="grid grid-cols-4 gap-2 my-1">
          {keysList.map(key => (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedRoot(key)}
              className={`py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                selectedRoot === key
                  ? 'bg-amber-600 text-white shadow-sm scale-102 font-black'
                  : 'bg-gray-100 dark:bg-[#2A2B2D] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#343538]'
              }`}
            >
              {key}
            </button>
          ))}
        </div>

        <div className="flex gap-2 pt-2">
          <button 
            type="button" 
            onClick={onCancel} 
            className="flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-gray-100 dark:bg-[#2A2B2D] text-gray-700 dark:text-gray-300 hover:bg-gray-200 transition cursor-pointer"
          >
            Cancelar
          </button>
          <button 
            type="button" 
            onClick={handleApply} 
            className="flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition active:scale-95 cursor-pointer"
          >
            Transponer
          </button>
        </div>
      </div>
    </div>
  );
};
