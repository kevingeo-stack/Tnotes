import React from 'react';
import { Plus, List, Radio, ListMusic } from 'lucide-react';

export type ViewState = 'editor' | 'grouping' | 'pitch-space' | 'setlist';

interface FabNavigationProps {
  currentView: ViewState;
  onViewChange: (view: ViewState) => void;
  onNewNote: () => void;
  isDarkMode?: boolean;
  toggleDarkMode?: () => void;
}

export function FabNavigation({ currentView, onViewChange, onNewNote }: FabNavigationProps) {
  return (
    <nav 
      aria-label="Navegación móvil"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-white/95 dark:bg-[#202124]/95 backdrop-blur-md border border-gray-200/90 dark:border-gray-700/80 shadow-2xl rounded-full p-1.5 flex items-center gap-1 z-40 max-w-[92vw] transition-all"
    >
      {/* Botón Listas / Atril */}
      <button
        type="button"
        onClick={() => onViewChange('setlist')}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold transition-all cursor-pointer select-none active:scale-95 ${
          currentView === 'setlist'
            ? 'bg-amber-500 text-white shadow-xs'
            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2A2B2D]'
        }`}
        title="Modo Lista (Alabanzas en Vivo)"
      >
        <ListMusic size={17} />
        <span className="hidden sm:inline">Listas</span>
      </button>

      {/* Botón Tonalidades */}
      <button
        type="button"
        onClick={() => onViewChange('grouping')}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold transition-all cursor-pointer select-none active:scale-95 ${
          currentView === 'grouping'
            ? 'bg-amber-500 text-white shadow-xs'
            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2A2B2D]'
        }`}
        title="Biblioteca por Tonalidades"
      >
        <List size={17} />
        <span className="hidden sm:inline">Tonos</span>
      </button>

      {/* Botón Espacio Armónico */}
      <button
        type="button"
        onClick={() => onViewChange('pitch-space')}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold transition-all cursor-pointer select-none active:scale-95 ${
          currentView === 'pitch-space'
            ? 'bg-amber-500 text-white shadow-xs'
            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2A2B2D]'
        }`}
        title="Espacio Armónico"
      >
        <Radio size={17} />
        <span className="hidden sm:inline">Armonía</span>
      </button>

      {/* Separador vertical */}
      {currentView !== 'setlist' && (
        <span className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-0.5" />
      )}

      {/* Botón Nueva Nota (Google Keep Floating Action) */}
      {currentView !== 'setlist' && (
        <button
          type="button"
          onClick={onNewNote}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-amber-600 hover:bg-amber-700 active:scale-90 text-white shadow-sm transition transform cursor-pointer shrink-0 ml-0.5"
          title="Nueva Canción"
        >
          <Plus size={20} strokeWidth={2.8} />
        </button>
      )}
    </nav>
  );
}
