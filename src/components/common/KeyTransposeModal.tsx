import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

interface KeyTransposeModalProps {
  isOpen: boolean;
  currentKey: string; // ej. "F# Mayor" o "A Menor"
  onConfirm: (targetKey: string) => void;
  onCancel: () => void;
}

const ALL_KEYS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

export const KeyTransposeModal: React.FC<KeyTransposeModalProps> = ({
  isOpen,
  currentKey,
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  const currentRoot = currentKey ? currentKey.split(' ')[0] : 'C';
  const currentMode = currentKey && currentKey.includes('Menor') ? 'Menor' : 'Mayor';
  const [selectedRoot, setSelectedRoot] = useState(currentRoot);

  useEffect(() => {
    const root = currentKey ? currentKey.split(' ')[0] : 'C';
    setSelectedRoot(root);
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
          Tono actual: <span className="font-bold text-amber-600 dark:text-amber-400">{currentKey || 'Sin tono'}</span>
        </p>

        <div className="grid grid-cols-4 gap-2 my-1">
          {ALL_KEYS.map(key => (
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
