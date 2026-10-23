import React, { useState, useEffect, useCallback } from 'react';
import { Plus, List, Music, Edit3, Moon, Sun, Globe2, ListMusic, Download } from 'lucide-react';
import { ViewState, FabNavigation } from './components/navigation/FabNavigation';
import { NoteEditorView } from './components/views/NoteEditorView';
import { TonalGroupingView } from './components/views/TonalGroupingView';
import { PitchSpaceView } from './components/views/PitchSpaceView';
import { SetlistView } from './components/views/SetlistView';
import { PwaInstallButton } from './components/common/PwaInstallButton';
import { BackupModal } from './components/common/BackupModal';
import { SongNote } from './types/note';
import { NoteStorageService, sanitizeLegacyNotes, sanitizeEmptyNotes, translateAllNotesInStorage } from './services/storage/NoteStorageService';
import { NotationSystem } from './domain/music/NotationSystem';
import { NotationTranslator, NotationStyle } from './domain/music/NotationTranslator';
import { KeyDetector } from './domain/music/KeyDetector';

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

const VALID_RETURN_VIEWS: readonly ViewState[] = ['grouping', 'setlist', 'pitch-space'];

export function resolveEditorReturnDestination(originView: ViewState | null | undefined): ViewState {
  if (originView && VALID_RETURN_VIEWS.includes(originView)) {
    return originView;
  }
  return 'grouping';
}

export default function App() {
  const [currentView, setCurrentView] = useState<ViewState>('grouping');
  const [editorReturnView, setEditorReturnView] = useState<ViewState>('grouping');
  const [activeSetlistId, setActiveSetlistId] = useState<string | null>(null);
  const [activeNote, setActiveNote] = useState<SongNote>(createEmptyNote());
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [notation, setNotation] = useState<NotationSystem>('en');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isInsideSetlist, setIsInsideSetlist] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);

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
        if (typeof document !== 'undefined' && document.documentElement) {
          document.documentElement.classList.add('dark');
        }
      } else {
        setIsDarkMode(false);
        if (typeof document !== 'undefined' && document.documentElement) {
          document.documentElement.classList.remove('dark');
        }
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
        if (typeof document !== 'undefined' && document.documentElement) {
          document.documentElement.classList.add('dark');
        }
        try { localStorage.setItem('theme', 'dark'); } catch {}
      } else {
        if (typeof document !== 'undefined' && document.documentElement) {
          document.documentElement.classList.remove('dark');
        }
        try { localStorage.setItem('theme', 'light'); } catch {}
      }
      return next;
    });
  }, []);

  const toggleNotation = useCallback(() => {
    setNotation(prev => {
      const next: NotationSystem = prev === 'en' ? 'natural' : 'en';
      const targetStyle: NotationStyle = next === 'natural' ? 'LATIN' : 'ENGLISH';
      try { localStorage.setItem('notation', next); } catch {}

      // 1. Traducir todo el repertorio en almacenamiento de inmediato
      translateAllNotesInStorage(targetStyle);

      // 2. Traducir la nota activa si está cargada
      setActiveNote(curr => {
        if (!curr || (!curr.content && !curr.title)) return curr;
        const translatedContent = NotationTranslator.translateFullContent(curr.content || '', targetStyle);
        const activeInst = curr.activeInstrument === 'keyboard' ? 'keyboard' : 'trumpet';
        const keyResult = KeyDetector.detectKey(translatedContent, targetStyle, activeInst);
        return {
          ...curr,
          content: translatedContent,
          detectedKey: keyResult.trumpetKey,
          concertKey: keyResult.concertKey
        };
      });

      // 3. Forzar refresco reactivo de vistas (TonalGroupingView, SetlistView, etc.)
      setRefreshTrigger(v => v + 1);

      return next;
    });
  }, []);

  const handleNewNote = useCallback((origin?: ViewState) => {
    const fresh = createEmptyNote();
    setActiveNote(fresh);
    const validOrigin = resolveEditorReturnDestination(
      origin && origin !== 'editor' ? origin : (currentView !== 'editor' ? currentView : 'grouping')
    );
    setEditorReturnView(validOrigin);
    setCurrentView('editor');
  }, [currentView]);

  const handleSelectNote = useCallback((note: SongNote, origin?: ViewState) => {
    setActiveNote(note);
    const validOrigin = resolveEditorReturnDestination(
      origin && origin !== 'editor' ? origin : (currentView !== 'editor' ? currentView : 'grouping')
    );
    setEditorReturnView(validOrigin);
    setCurrentView('editor');
  }, [currentView]);

  const handleSaveAndExit = useCallback(() => {
    setRefreshTrigger(v => v + 1);
    const destination = resolveEditorReturnDestination(editorReturnView);
    setEditorReturnView('grouping'); // Reset para que la próxima edición no herede accidentalmente el origen anterior
    setCurrentView(destination);
  }, [editorReturnView]);

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
          if (view === 'editor') {
            setEditorReturnView('grouping');
          }
          if (view === 'setlist') {
            setActiveSetlistId(null);
          }
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
    <div className="flex h-screen bg-[#F8F9FA] dark:bg-[#141416] text-[#202124] dark:text-[#E8EAED] selection:bg-amber-500/30 font-sans overflow-hidden transition-colors duration-150">
      
      {/* SIDEBAR DESKTOP (Google Keep Drawer Style) */}
      <aside className="hidden lg:flex flex-col w-72 bg-white dark:bg-[#202124] border-r border-gray-200 dark:border-gray-800 shrink-0 z-10 transition-colors">
        <div className="p-6 pb-2 flex items-center justify-between">
          <h1 className="text-2xl font-black flex items-center gap-2 text-amber-600 dark:text-amber-500 tracking-tight">
            <span className="text-3xl">🎺</span> TNotes
          </h1>
          <PwaInstallButton />
        </div>

        <div className="px-4 py-4">
          <button 
            onClick={() => handleNewNote(currentView !== 'editor' ? currentView : 'grouping')}
            className="flex items-center gap-3.5 bg-white dark:bg-[#202124] border border-gray-200 dark:border-gray-700 hover:border-amber-400 dark:hover:border-amber-500/70 hover:shadow-md transition-all px-5 py-3.5 rounded-2xl w-full text-base font-bold text-gray-800 dark:text-gray-100 cursor-pointer shadow-xs active:scale-98"
          >
            <div className="w-8 h-8 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Plus size={20} strokeWidth={2.5} />
            </div>
            <span>Nueva Canción</span>
          </button>
        </div>

        <nav className="flex-1 py-3 pr-3 flex flex-col gap-1">
          <NavItem view="setlist" icon={ListMusic} label="Modo Lista (Atril)" />
          <NavItem view="grouping" icon={List} label="Tonalidades" />
          <NavItem view="pitch-space" icon={Music} label="Espacio Armónico" />
          <NavItem view="editor" icon={Edit3} label="Editor de Notas" />
        </nav>

        <div className="p-4 flex flex-col gap-1.5 border-t border-gray-100 dark:border-gray-800">
          <button 
            onClick={() => setIsBackupModalOpen(true)}
            className="flex items-center justify-between px-3.5 py-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-[#2A2B2D] transition text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 cursor-pointer"
          >
            <span className="flex items-center gap-2.5">
              <Download size={17} className="text-amber-500" />
              Copia de Seguridad
            </span>
            <span className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/30 px-2 py-0.5 rounded text-[11px] font-bold">
              .tnotes
            </span>
          </button>

          <button 
            onClick={toggleNotation}
            className="flex items-center justify-between px-3.5 py-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-[#2A2B2D] transition text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 cursor-pointer"
          >
            <span className="flex items-center gap-2.5">
              <Globe2 size={17} className="text-gray-400" />
              Notación
            </span>
            <span className="bg-gray-100 dark:bg-gray-700/80 px-2.5 py-0.5 rounded text-[11px] font-bold text-gray-700 dark:text-gray-200">
              {notation === 'en' ? 'EN' : 'Do-Re-Mi'}
            </span>
          </button>
          
          <button 
            onClick={toggleDarkMode}
            className="flex items-center justify-between px-3.5 py-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-[#2A2B2D] transition text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 cursor-pointer"
          >
            <span className="flex items-center gap-2.5">
              {isDarkMode ? <Sun size={17} className="text-amber-400" /> : <Moon size={17} className="text-gray-400" />}
              {isDarkMode ? 'Modo Claro' : 'Modo Oscuro'}
            </span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        
        {/* MOBILE HEADER */}
        <header className="lg:hidden flex items-center justify-between bg-white dark:bg-[#202124] border-b border-gray-200 dark:border-gray-800 px-4 py-3 shrink-0 z-10 transition-colors">
          <h1 className="text-lg font-black flex items-center gap-2 text-amber-600 dark:text-amber-500">
            <span>🎺</span> TNotes
          </h1>
          <div className="flex items-center gap-1.5">
            <PwaInstallButton />
            <button 
              onClick={() => setIsBackupModalOpen(true)}
              className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-[#2A2B2D] hover:bg-gray-200 rounded-full text-gray-700 dark:text-gray-300 transition active:scale-95 cursor-pointer"
              title="Copia de Seguridad (.tnotes)"
            >
              <Download size={15} className="text-amber-500" />
            </button>
            <button 
              onClick={toggleNotation}
              className="px-2.5 py-1.5 bg-gray-100 dark:bg-[#2A2B2D] hover:bg-gray-200 rounded-full text-[11px] font-bold text-gray-700 dark:text-gray-300 transition active:scale-95 flex items-center gap-1 cursor-pointer"
            >
              <Globe2 size={13} className="text-amber-500" />
              {notation === 'en' ? 'EN' : 'Do-Re-Mi'}
            </button>
            <button 
              onClick={toggleDarkMode}
              className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-[#2A2B2D] hover:bg-gray-200 rounded-full text-gray-700 dark:text-gray-300 transition active:scale-95 cursor-pointer"
            >
              {isDarkMode ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} />}
            </button>
          </div>
        </header>

        {/* VIEWS CONTAINER: Espaciado inferior generoso (pb-32 sm:pb-36) para no solaparse nunca con el dock */}
        <div className="flex-1 overflow-y-auto no-scrollbar pb-32 sm:pb-36 lg:pb-10">
          {currentView === 'editor' && (
            <NoteEditorView 
              note={activeNote} 
              onNoteChange={handleNoteChange}
              onSaveAndExit={handleSaveAndExit}
              notation={notation}
              onToggleNotation={toggleNotation}
            />
          )}
          {currentView === 'setlist' && (
            <SetlistView 
              key={`setlist-${refreshTrigger}`}
              onOpenNoteInEditor={(note) => handleSelectNote(note, 'setlist')}
              notation={notation}
              onActiveListChange={setIsInsideSetlist}
              initialSetlistId={activeSetlistId}
              onSelectSetlist={setActiveSetlistId}
            />
          )}
          {currentView === 'grouping' && (
            <TonalGroupingView 
              key={refreshTrigger} 
              notes={NoteStorageService.getAll()}
              activeInstrument="trumpet"
              notationStyle={notation === 'natural' ? 'LATIN' : 'ENGLISH'}
              onSelectSong={(note) => handleSelectNote(note, 'grouping')}
              onSelectNote={(note) => handleSelectNote(note, 'grouping')} 
              onDeleteNote={handleDeleteNote} 
              notation={notation} 
              onCreateNewSong={() => handleNewNote('grouping')}
              onRefreshNotes={() => setRefreshTrigger(v => v + 1)}
            />
          )}
          {currentView === 'pitch-space' && (
            <PitchSpaceView 
              activeNote={activeNote} 
              notation={notation} 
              notes={NoteStorageService.getAll()}
              onSelectNote={setActiveNote}
            />
          )}
        </div>

        {/* MOBILE FAB: Oculto en el editor y dentro de listas para no estorbar la barra de notas ni atril */}
        {currentView !== 'editor' && !(currentView === 'setlist' && isInsideSetlist) && (
          <div className="lg:hidden">
            <FabNavigation 
              currentView={currentView}
              onViewChange={(view) => {
                if (view === 'editor') {
                  setEditorReturnView('grouping');
                }
                if (view === 'setlist') {
                  setActiveSetlistId(null);
                }
                setCurrentView(view);
                if (view === 'grouping' || view === 'setlist') {
                  setRefreshTrigger(v => v + 1);
                }
              }}
              onNewNote={() => handleNewNote(currentView)}
              isDarkMode={isDarkMode}
              toggleDarkMode={toggleDarkMode}
            />
          </div>
        )}
        
      </main>

      <BackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        onDataRestored={() => setRefreshTrigger(v => v + 1)}
      />
    </div>
  );
}
