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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onCancel}
    >
      <div 
        className="w-full max-w-sm bg-white dark:bg-[#202124] rounded-3xl p-6 shadow-2xl border border-gray-200 dark:border-gray-700/80 flex flex-col gap-4 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100">
            Transponer a {targetKey}
          </h3>
          <button 
            type="button" 
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-lg cursor-pointer transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-xs text-gray-600 dark:text-gray-300 text-left">
          ¿Cómo deseas guardar la canción con su nueva tonalidad?
        </p>

        <div className="flex flex-col gap-2.5 pt-1">
          <button
            type="button"
            onClick={onUpdateExisting}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 active:scale-95 transition-all shadow-sm cursor-pointer"
          >
            <Save size={17} />
            <span>Actualizar canción existente</span>
          </button>

          <button
            type="button"
            onClick={() => onSaveAsNew(suggestedTitle)}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-200 dark:border-amber-800/60 active:scale-95 transition-all cursor-pointer"
          >
            <CopyPlus size={17} />
            <span>Guardar como copia nueva</span>
          </button>

          <button
            type="button"
            onClick={onCancel}
            className="py-2.5 px-4 rounded-xl text-xs font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2A2B2D] transition-colors cursor-pointer"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};
