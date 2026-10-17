import React from 'react';
import { CopyPlus, Save, X } from 'lucide-react';

interface TranspositionSaveModalProps {
  isOpen: boolean;
  targetKey: string;
  songTitle: string;
  onUpdateExisting: () => void;
  onSaveAsNew: (suggestedTitle: string) => void;
  onCancel: () => void;
}

export const TranspositionSaveModal: React.FC<TranspositionSaveModalProps> = ({
  isOpen,
  targetKey,
  songTitle,
  onUpdateExisting,
  onSaveAsNew,
  onCancel
}) => {
  if (!isOpen) return null;

  const baseTitle = songTitle && songTitle.trim() ? songTitle.trim() : 'Canción';
  const suggestedTitle = `${baseTitle} (Transp. ${targetKey})`;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onCancel}
    >
      <div 
        className="w-full max-w-sm bg-white dark:bg-[#1E1E1E] rounded-2xl p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 flex flex-col gap-5 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-800">
          <h3 className="text-base font-bold text-neutral-800 dark:text-neutral-100">
            Transponer a {targetKey}
          </h3>
          <button 
            type="button" 
            onClick={onCancel}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1 rounded-lg cursor-pointer transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-xs text-neutral-600 dark:text-neutral-300 text-left">
          ¿Cómo deseas guardar la canción con su nueva tonalidad?
        </p>

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onUpdateExisting}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 active:scale-95 transition-all shadow-md cursor-pointer"
          >
            <Save size={18} />
            <span>Actualizar nota existente</span>
          </button>

          <button
            type="button"
            onClick={() => onSaveAsNew(suggestedTitle)}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/40 border border-amber-200 dark:border-amber-800 active:scale-95 transition-all shadow-xs cursor-pointer"
          >
            <CopyPlus size={18} />
            <span>Guardar como nueva nota</span>
          </button>

          <button
            type="button"
            onClick={onCancel}
            className="py-2 px-4 rounded-xl text-xs font-semibold text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};
