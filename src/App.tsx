import React, { useState, useEffect, useCallback } from 'react';
import { Plus, List, Music, Edit3, Moon, Sun, Globe2, ListMusic } from 'lucide-react';
import { ViewState, FabNavigation } from './components/navigation/FabNavigation';
import { NoteEditorView } from './components/views/NoteEditorView';
import { TonalGroupingView } from './components/views/TonalGroupingView';
import { PitchSpaceView } from './components/views/PitchSpaceView';
import { SetlistView } from './components/views/SetlistView';
import { PwaInstallButton } from './components/common/PwaInstallButton';
import { SongNote } from './types/note';
import { NoteStorageService, sanitizeLegacyNotes, sanitizeEmptyNotes } from './services/storage/NoteStorageService';
import { NotationSystem } from './domain/music/NotationSystem';

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

const createEmptyNote = (): SongNote => ({
  id: generateId(),
  title: '',
  content: '',
  activeInstrument: 'keyboard',
  detectedKey: 'Sin tono',
  updatedAt: Date.now()
});

export default function App() {
  const [currentView, setCurrentView] = useState<ViewState>('grouping');
  const [activeNote, setActiveNote] = useState<SongNote>(createEmptyNote());
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [notation, setNotation] = useState<NotationSystem>('en');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isInsideSetlist, setIsInsideSetlist] = useState(false);

  useEffect(() => {
    try {
      sanitizeLegacyNotes();
      sanitizeEmptyNotes();
    } catch (e) {
      console.warn('Sanitize notes warning', e);
    }

    try {
      const savedTheme = typeof window !== 'undefined' && window.localStorage ? localStorage.getItem('theme') : null;
      let prefersDark = false;
      if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
        prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      }
      if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        setIsDarkMode(true);
        document.documentElement.classList.add('dark');
      } else {
        setIsDarkMode(false);
        document.documentElement.classList.remove('dark');
      }
    } catch (e) {
      console.warn('Theme initialization fallback', e);
    }

    try {
      const savedNotation = typeof window !== 'undefined' && window.localStorage
        ? (localStorage.getItem('notation') as NotationSystem)
        : null;
      if (savedNotation === 'en' || savedNotation === 'natural') {
        setNotation(savedNotation);
      }
    } catch (e) {
      console.warn('Notation initialization fallback', e);
    }
  }, []);

  const toggleDarkMode = useCallback(() => {
    setIsDarkMode(prev => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add('dark');
        try { localStorage.setItem('theme', 'dark'); } catch {}
      } else {
        document.documentElement.classList.remove('dark');
        try { localStorage.setItem('theme', 'light'); } catch {}
      }
      return next;
    });
  }, []);

  const toggleNotation = useCallback(() => {
    setNotation(prev => {
      const next = prev === 'en' ? 'natural' : 'en';
      try { localStorage.setItem('notation', next); } catch {}
      return next;
    });
  }, []);

  const handleNewNote = useCallback(() => {
    const fresh = createEmptyNote();
    setActiveNote(fresh);
    setCurrentView('editor');
  }, []);

  const handleSelectNote = useCallback((note: SongNote) => {
    setActiveNote(note);
    setCurrentView('editor');
  }, []);

  const handleDeleteNote = useCallback((id: string) => {
    NoteStorageService.delete(id);
    setRefreshTrigger(prev => prev + 1);
    if (activeNote.id === id) {
      setActiveNote(createEmptyNote());
    }
  }, [activeNote.id]);

  const handleNoteChange = useCallback((updated: SongNote) => {
    setActiveNote(updated);
  }, []);

  const NavItem = ({ view, icon: Icon, label }: { view: ViewState, icon: any, label: string }) => {
    const isActive = currentView === view;
    return (
      <button 
        onClick={() => {
          setCurrentView(view);
          if (view === 'grouping' || view === 'setlist') setRefreshTrigger(v => v + 1);
        }}
        className={`flex items-center gap-4 px-6 py-3 w-full text-left rounded-r-full font-medium transition cursor-pointer ${
          isActive 
            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-900 dark:text-amber-400 font-bold' 
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2A2B2D]'
        }`}
      >
        <Icon size={22} className={isActive ? 'text-amber-700 dark:text-amber-400' : 'text-gray-500'} />
        {label}
      </button>
    );
  };

  return (
    <div className="flex h-screen bg-[#F8F9FA] dark:bg-[#1F1F1F] text-[#202124] dark:text-[#E8EAED] selection:bg-amber-500/30 font-sans overflow-hidden transition-colors duration-200">
      
      {/* SIDEBAR DESKTOP */}
      <aside className="hidden lg:flex flex-col w-72 bg-white dark:bg-[#28292A] border-r border-gray-200 dark:border-gray-800 shrink-0 z-10 transition-colors">
        <div className="p-6 pb-2 flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2 text-amber-600 dark:text-amber-500">
            <span className="text-3xl">🎺</span> TNotes
          </h1>
          <PwaInstallButton />
        </div>

        <div className="px-4 py-4">
          <button 
            onClick={handleNewNote}
            className="flex items-center gap-3 bg-white dark:bg-[#1F1F1F] border border-gray-200 dark:border-gray-700 hover:shadow-md hover:bg-gray-50 dark:hover:bg-gray-800 transition px-6 py-4 rounded-2xl w-full text-lg font-bold text-gray-800 dark:text-gray-200 cursor-pointer"
          >
            <Plus size={24} className="text-amber-500" />
            Nueva Nota
          </button>
        </div>

        <nav className="flex-1 py-4 pr-4 flex flex-col gap-1">
          <NavItem view="setlist" icon={ListMusic} label="🎵 Modo Lista (Alabanzas en Vivo)" />
          <NavItem view="grouping" icon={List} label="Tonalidades" />
          <NavItem view="pitch-space" icon={Music} label="Espacio Armónico" />
          <NavItem view="editor" icon={Edit3} label="Editor de Notas" />
        </nav>

        <div className="p-4 flex flex-col gap-2 border-t border-gray-200 dark:border-gray-800">
          <button 
            onClick={toggleNotation}
            className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-gray-100 dark:hover:bg-[#2A2B2D] transition text-sm font-semibold text-gray-700 dark:text-gray-300 cursor-pointer"
          >
            <span className="flex items-center gap-3">
              <Globe2 size={18} className="text-gray-500" />
              Notación
            </span>
            <span className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded text-xs font-bold">
              {notation === 'en' ? 'EN' : 'Do-Re-Mi'}
            </span>
          </button>
          
          <button 
            onClick={toggleDarkMode}
            className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-gray-100 dark:hover:bg-[#2A2B2D] transition text-sm font-semibold text-gray-700 dark:text-gray-300 cursor-pointer"
          >
            <span className="flex items-center gap-3">
              {isDarkMode ? <Sun size={18} className="text-gray-500" /> : <Moon size={18} className="text-gray-500" />}
              {isDarkMode ? 'Modo Claro' : 'Modo Oscuro'}
            </span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        
        {/* MOBILE HEADER */}
        <header className="lg:hidden flex items-center justify-between bg-white dark:bg-[#28292A] border-b border-gray-200 dark:border-gray-800 p-4 shrink-0 z-10 transition-colors">
          <h1 className="text-xl font-bold flex items-center gap-2 text-amber-600 dark:text-amber-500">
            <span>🎺</span> TNotes
          </h1>
          <div className="flex items-center gap-2">
            <PwaInstallButton />
            <button 
              onClick={toggleNotation}
              className="px-3 py-1.5 bg-gray-100 dark:bg-[#1F1F1F] rounded-full text-xs font-bold text-gray-700 dark:text-gray-300 transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <Globe2 size={14} className="text-amber-500" />
              {notation === 'en' ? 'EN' : 'Do-Re-Mi'}
            </button>
            <button 
              onClick={toggleDarkMode}
              className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-[#1F1F1F] rounded-full text-gray-700 dark:text-gray-300 transition active:scale-95 cursor-pointer"
            >
              {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </header>

        {/* VIEWS */}
        <div className="flex-1 overflow-y-auto no-scrollbar pb-24 lg:pb-8">
          {currentView === 'editor' && (
            <NoteEditorView 
              note={activeNote} 
              onNoteChange={handleNoteChange}
              onSaveAndExit={() => {
                setRefreshTrigger(v => v + 1);
                setCurrentView('grouping');
              }}
              notation={notation}
            />
          )}
          {currentView === 'setlist' && (
            <SetlistView 
              key={`setlist-${refreshTrigger}`}
              onOpenNoteInEditor={handleSelectNote}
              notation={notation}
              onActiveListChange={setIsInsideSetlist}
            />
          )}
          {currentView === 'grouping' && (
            <TonalGroupingView 
              key={refreshTrigger} 
              onSelectNote={handleSelectNote} 
              onDeleteNote={handleDeleteNote} 
              notation={notation} 
            />
          )}
          {currentView === 'pitch-space' && (
            <PitchSpaceView 
              activeNote={activeNote} 
              notation={notation} 
            />
          )}
        </div>

        {/* MOBILE FAB: Oculto en el editor y dentro de listas para no estorbar la barra de notas ni atril */}
        {currentView !== 'editor' && !(currentView === 'setlist' && isInsideSetlist) && (
          <div className="lg:hidden">
            <FabNavigation 
              currentView={currentView}
              onViewChange={(view) => {
                setCurrentView(view);
                if (view === 'grouping' || view === 'setlist') {
                  setRefreshTrigger(v => v + 1);
                }
              }}
              onNewNote={handleNewNote}
              isDarkMode={isDarkMode}
              toggleDarkMode={toggleDarkMode}
            />
          </div>
        )}
        
      </main>
    </div>
  );
}
