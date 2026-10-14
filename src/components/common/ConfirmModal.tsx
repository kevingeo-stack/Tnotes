import React from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: 'Eliminar lista' | 'Eliminar canción';
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onCancel}
    >
      <div 
        className="w-full max-w-xs bg-white dark:bg-[#1E1E1E] rounded-2xl p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 text-center flex flex-col items-center gap-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">
          {title}
        </h3>

        <div className="flex w-full gap-3 justify-center">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold text-neutral-600 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 active:scale-95 transition-all cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 active:scale-95 transition-all shadow-md cursor-pointer"
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
};
