import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { normalizeFlatsToSharps, normalizeKeyName } from '../../domain/music/PitchClass';

interface KeyTransposeModalProps {
  isOpen: boolean;
  currentKey: string; // ej. "F# Mayor" o "Re Menor"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onCancel}>
      <div className="w-full max-w-xs bg-white dark:bg-[#1E1E1E] rounded-2xl p-5 shadow-2xl border border-neutral-200 dark:border-neutral-800 flex flex-col gap-4 text-center" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-bold text-neutral-800 dark:text-neutral-100 flex items-center justify-center gap-2">
          <RefreshCw size={18} className="text-amber-500" />
          Cambiar Tonalidad
        </h3>

        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Tono actual: <span className="font-bold text-amber-600 dark:text-amber-400">{normalizedCurrent || 'Sin tono'}</span>
        </p>

        <div className="grid grid-cols-4 gap-2 my-1">
          {keysList.map(key => (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedRoot(key)}
              className={`py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                selectedRoot === key
                  ? 'bg-amber-600 text-white shadow-md scale-105'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200'
              }`}
            >
              {key}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button type="button" onClick={onCancel} className="flex-1 py-2 rounded-xl text-sm font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 cursor-pointer hover:bg-neutral-200 dark:hover:bg-neutral-700 transition">
            Cancelar
          </button>
          <button type="button" onClick={handleApply} className="flex-1 py-2 rounded-xl text-sm font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-md cursor-pointer transition">
            Transponer
          </button>
        </div>
      </div>
    </div>
  );
};
