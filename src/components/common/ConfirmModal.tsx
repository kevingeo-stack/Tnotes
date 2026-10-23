import React from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string; // "Eliminar canción" o "Eliminar lista"
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onCancel}
    >
      <div 
        className="w-full max-w-xs bg-white dark:bg-[#202124] rounded-3xl p-6 shadow-2xl border border-gray-200 dark:border-gray-700/80 text-center flex flex-col items-center gap-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100">
          {title}
        </h3>

        <div className="flex w-full gap-2.5 justify-center">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-[#2A2B2D] hover:bg-gray-200 dark:hover:bg-[#343538] active:scale-95 transition-all cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-red-600 hover:bg-red-700 active:scale-95 transition-all shadow-sm cursor-pointer"
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
};
