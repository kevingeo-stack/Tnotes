import React from 'react';
import { Plus, List, Music, Edit3, Moon, Sun, ListMusic } from 'lucide-react';

export type ViewState = 'editor' | 'grouping' | 'pitch-space' | 'setlist';

interface FabNavigationProps {
  currentView: ViewState;
  onViewChange: (view: ViewState) => void;
  onNewNote: () => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

export function FabNavigation({ currentView, onViewChange, onNewNote, isDarkMode, toggleDarkMode }: FabNavigationProps) {
  return (
    <div className="absolute bottom-6 right-6 flex flex-col items-center gap-4 z-50">
      <div className="flex flex-col gap-3">
        <button
          onClick={toggleDarkMode}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-[#28292A] text-gray-700 dark:text-[#E8EAED] shadow-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
          title="Alternar Modo Oscuro"
        >
          {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button
          onClick={() => onViewChange('setlist')}
          className={`w-10 h-10 flex items-center justify-center rounded-full shadow-lg border transition ${currentView === 'setlist' ? 'bg-amber-500 text-white border-amber-600' : 'bg-white dark:bg-[#28292A] text-gray-700 dark:text-[#E8EAED] border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
          title="Modo Lista (Alabanzas en Vivo)"
        >
          <ListMusic size={18} />
        </button>
        <button
          onClick={() => onViewChange('grouping')}
          className={`w-10 h-10 flex items-center justify-center rounded-full shadow-lg border transition ${currentView === 'grouping' ? 'bg-amber-500 text-white border-amber-600' : 'bg-white dark:bg-[#28292A] text-gray-700 dark:text-[#E8EAED] border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
          title="Vista de Tonalidades"
        >
          <List size={18} />
        </button>
        <button
          onClick={() => onViewChange('pitch-space')}
          className={`w-10 h-10 flex items-center justify-center rounded-full shadow-lg border transition ${currentView === 'pitch-space' ? 'bg-amber-500 text-white border-amber-600' : 'bg-white dark:bg-[#28292A] text-gray-700 dark:text-[#E8EAED] border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
          title="Espacio Armónico"
        >
          <Music size={18} />
        </button>
        <button
          onClick={() => onViewChange('editor')}
          className={`w-10 h-10 flex items-center justify-center rounded-full shadow-lg border transition ${currentView === 'editor' ? 'bg-amber-500 text-white border-amber-600' : 'bg-white dark:bg-[#28292A] text-gray-700 dark:text-[#E8EAED] border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
          title="Editor"
        >
          <Edit3 size={18} />
        </button>
      </div>

      <button
        onClick={onNewNote}
        className="w-14 h-14 flex items-center justify-center rounded-full bg-amber-500 text-white shadow-xl hover:bg-amber-600 hover:scale-105 active:scale-95 transition transform cursor-pointer"
        title="Nueva Nota"
      >
        <Plus size={28} />
      </button>
    </div>
  );
}
