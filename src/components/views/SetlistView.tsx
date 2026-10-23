import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  ArrowLeft, 
  Search, 
  Check, 
  X, 
  Trash2, 
  ListMusic, 
  Edit3, 
  Calendar, 
  Music,
  ChevronRight
} from 'lucide-react';
import { SongNote, Setlist } from '../../types/note';
import { NoteStorageService } from '../../services/storage/NoteStorageService';
import { getAllSetlists, saveSetlist, deleteSetlist } from '../../services/storage/SetlistStorageService';
import { KeyDetector } from '../../domain/music/KeyDetector';
import { formatDualKeyDisplay, formatKeyName, NotationSystem } from '../../domain/music/NotationSystem';
import { normalizeFlatsToSharps } from '../../domain/music/PitchClass';
import { ConfirmModal } from '../common/ConfirmModal';

interface SetlistViewProps {
  onOpenNoteInEditor?: (note: SongNote) => void;
  notation: NotationSystem;
  onActiveListChange?: (isInside: boolean) => void;
  initialSetlistId?: string | null;
  onSelectSetlist?: (id: string | null) => void;
}

export function renderFormattedMusicContent(rawContent: string, isTrumpet: boolean = true) {
  if (!rawContent) return <span>(Sin notas)</span>;

  // Segmentos delimitados por *...* se estilizan como anotaciones de guía
  // Las notas visibles de trompeta se normalizan exclusivamente a naturales y sostenidos
  const formatted = isTrumpet ? normalizeFlatsToSharps(rawContent) : rawContent;
  const parts = formatted.split(/(\*[^*]*\*?)/g);
  return parts.map((part, index) => {
    if (part.startsWith('*')) {
      return (
        <span
          key={index}
          className="text-xs md:text-sm font-sans italic font-normal text-gray-400 dark:text-gray-500 opacity-80 mx-1 select-text"
        >
          {part}
        </span>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

/**
 * Obtiene la tonalidad de la canción para la agrupación y visualización en atril
 * garantizando coherencia absoluta con la biblioteca (Tonalidades).
 */
export function getKeyForSetlist(note: SongNote, notation?: NotationSystem): string {
  const system: NotationSystem = notation || 'en';
  if (note.detectedKey && note.detectedKey !== 'Sin tono' && note.detectedKey !== 'Indeterminada' && note.detectedKey !== 'Desconocido') {
    return formatKeyName(note.detectedKey, system);
  }
  const notationStyle: 'ENGLISH' | 'LATIN' = system === 'natural' ? 'LATIN' : 'ENGLISH';
  const detectedResult = KeyDetector.detectKey(note.content || '', notationStyle, note.activeInstrument || 'keyboard');
  return detectedResult.trumpetKey !== 'Sin tono' 
    ? detectedResult.trumpetKey 
    : (note.concertKey ? formatKeyName(note.concertKey, system) : 'Sin tono');
}

export function SetlistView({
  onOpenNoteInEditor,
  notation,
  onActiveListChange,
  initialSetlistId,
  onSelectSetlist
}: SetlistViewProps) {
  // Navigation states: null = Estado 1 (Catálogo de Listas), string = Estado 2 (ID de Lista Seleccionada)
  const [selectedSetlistId, setSelectedSetlistId] = useState<string | null>(initialSetlistId ?? null);

  // Sync state if initialSetlistId updates
  useEffect(() => {
    if (initialSetlistId !== undefined) {
      setSelectedSetlistId(initialSetlistId);
    }
  }, [initialSetlistId]);

  // Data states
  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [allNotes, setAllNotes] = useState<SongNote[]>([]);

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [isSongSelectorOpen, setIsSongSelectorOpen] = useState(false);
  const [songSearchQuery, setSongSearchQuery] = useState('');
  const [listToDelete, setListToDelete] = useState<string | null>(null);

  // Editing setlist title inline
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');

  // Notify parent if inside an active setlist and sync selected ID
  useEffect(() => {
    onActiveListChange?.(selectedSetlistId !== null);
    onSelectSetlist?.(selectedSetlistId);
  }, [selectedSetlistId, onActiveListChange, onSelectSetlist]);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const loadedSetlists = getAllSetlists();
    const loadedNotes = NoteStorageService.getAll();
    setSetlists(loadedSetlists);
    setAllNotes(loadedNotes);
  };

  // Currently active setlist in Estado 2
  const currentSetlist = useMemo(() => {
    if (!selectedSetlistId) return null;
    return setlists.find(s => s.id === selectedSetlistId) || null;
  }, [selectedSetlistId, setlists]);

  // Sync title input when entering a setlist
  useEffect(() => {
    if (currentSetlist) {
      setEditedTitle(currentSetlist.name);
      setIsEditingTitle(false);
    }
  }, [currentSetlist?.id]);

  const handleConfirmCreate = () => {
    const finalName = newListName.trim() || `Lista ${setlists.length + 1}`;
    const newList: Setlist = {
      id: Date.now().toString(),
      name: finalName,
      songIds: [],
      updatedAt: Date.now()
    };
    saveSetlist(newList);
    setSetlists(getAllSetlists());
    setSelectedSetlistId(newList.id);
    setNewListName('');
    setIsCreateModalOpen(false);
  };

  const handleSaveTitle = () => {
    if (!currentSetlist) return;
    const trimmed = editedTitle.trim();
    if (trimmed && trimmed !== currentSetlist.name) {
      const updated: Setlist = {
        ...currentSetlist,
        name: trimmed,
        updatedAt: Date.now()
      };
      saveSetlist(updated);
      setSetlists(getAllSetlists());
    }
    setIsEditingTitle(false);
  };

  const handleToggleSongInSetlist = (noteId: string) => {
    if (!currentSetlist) return;
    const exists = currentSetlist.songIds.includes(noteId);
    let newSongIds: string[];
    if (exists) {
      newSongIds = currentSetlist.songIds.filter(id => id !== noteId);
    } else {
      newSongIds = [...currentSetlist.songIds, noteId];
    }

    const updated: Setlist = {
      ...currentSetlist,
      songIds: newSongIds,
      updatedAt: Date.now()
    };

    saveSetlist(updated);
    setSetlists(getAllSetlists());
  };

  const handleRemoveSongFromSetlist = (noteId: string) => {
    if (!currentSetlist) return;
    const updated: Setlist = {
      ...currentSetlist,
      songIds: currentSetlist.songIds.filter(id => id !== noteId),
      updatedAt: Date.now()
    };
    saveSetlist(updated);
    setSetlists(getAllSetlists());
  };

  const validSongs = useMemo(() => {
    if (!currentSetlist) return [];
    return (currentSetlist.songIds || [])
      .map(id => allNotes.find(n => n && n.id === id))
      .filter((s): s is SongNote => Boolean(s && s.id));
  }, [currentSetlist, allNotes]);

  // Group songs of the current setlist by detected key (Strict Tonal Grouping)
  const tonalGroups = useMemo(() => {
    if (!currentSetlist || validSongs.length === 0) return [];

    const groupMap = new Map<string, { song: SongNote; overallIndex: number }[]>();
    
    validSongs.forEach((song, idx) => {
      const key = getKeyForSetlist(song, notation);
      if (!groupMap.has(key)) {
        groupMap.set(key, []);
      }
      groupMap.get(key)!.push({
        song,
        overallIndex: idx + 1
      });
    });

    const groups: {
      rawKey: string;
      formattedKey: string;
      songs: { song: SongNote; overallIndex: number }[];
    }[] = [];

    groupMap.forEach((songsInGroup, rawKey) => {
      groups.push({
        rawKey,
        formattedKey: formatDualKeyDisplay(rawKey, notation),
        songs: songsInGroup
      });
    });

    return groups;
  }, [currentSetlist, validSongs, notation]);

  const filteredLibraryNotes = useMemo(() => {
    if (!songSearchQuery.trim()) return allNotes;
    const query = songSearchQuery.toLowerCase();
    return allNotes.filter(n =>
      (n.title && n.title.toLowerCase().includes(query)) ||
      (n.content && n.content.toLowerCase().includes(query))
    );
  }, [allNotes, songSearchQuery]);

  // =========================================================================
  // ESTADO 2: MODO ATRIL Y GESTIÓN DE LA LISTA SELECCIONADA
  // =========================================================================
  if (currentSetlist) {
    const totalSongsInList = validSongs.length;

    return (
      <div className="w-full mx-auto p-4 sm:p-6 pb-36 max-w-5xl animate-in fade-in duration-150">
        
        {/* Cabecera y Navegación del Atril */}
        <div className="flex flex-col gap-3.5 mb-6">
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => setSelectedSetlistId(null)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-[#202124] hover:bg-gray-100 dark:hover:bg-[#2A2B2D] border border-gray-200 dark:border-gray-700/80 text-gray-700 dark:text-gray-200 font-bold transition text-xs sm:text-sm cursor-pointer active:scale-95 shadow-xs"
            >
              <ArrowLeft size={16} />
              <span>Volver a Listas</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setListToDelete(currentSetlist.id)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-[#202124] hover:bg-red-50 dark:hover:bg-red-950/30 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 font-semibold transition text-xs sm:text-sm cursor-pointer active:scale-95 border border-gray-200 dark:border-gray-700/80"
                title="Eliminar esta lista completa"
              >
                <Trash2 size={15} />
                <span className="hidden sm:inline">Eliminar</span>
              </button>

              <button
                onClick={() => setIsSongSelectorOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-sm hover:shadow-md transition active:scale-95 cursor-pointer text-xs sm:text-sm"
              >
                <Plus size={16} strokeWidth={2.5} />
                <span>Añadir Canciones</span>
              </button>
            </div>
          </div>

          {/* Título editable de la lista */}
          <div className="flex items-center gap-2">
            {isEditingTitle ? (
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="text"
                  value={editedTitle}
                  onChange={e => setEditedTitle(e.target.value)}
                  onBlur={handleSaveTitle}
                  onKeyDown={e => e.key === 'Enter' && handleSaveTitle()}
                  autoFocus
                  className="text-xl sm:text-2xl font-extrabold bg-white dark:bg-[#202124] border-2 border-amber-500 rounded-xl px-3 py-1.5 outline-none text-gray-900 dark:text-gray-100 w-full shadow-xs"
                />
                <button
                  onClick={handleSaveTitle}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs sm:text-sm shadow-sm cursor-pointer"
                >
                  Guardar
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
                  {currentSetlist.name}
                </h1>
                <button
                  onClick={() => setIsEditingTitle(true)}
                  className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-gray-100 dark:hover:bg-[#28292A] rounded-lg transition cursor-pointer"
                  title="Editar nombre de la lista"
                >
                  <Edit3 size={18} />
                </button>
              </div>
            )}
          </div>

          {/* Métricas y resumen tonal */}
          <div className="flex items-center gap-3 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            <span className="font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-0.5 rounded-full border border-amber-200/70 dark:border-amber-900/40">
              {totalSongsInList} {totalSongsInList === 1 ? 'alabanza' : 'alabanzas'}
            </span>
            <span>•</span>
            <span>{tonalGroups.length} {tonalGroups.length === 1 ? 'tonalidad distinta' : 'tonalidades distintas'}</span>
          </div>
        </div>

        {/* Estado Vacío de la Lista */}
        {validSongs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 bg-white dark:bg-[#202124] rounded-3xl border border-dashed border-gray-300 dark:border-gray-700 text-center shadow-xs max-w-md mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4">
              <Music size={32} />
            </div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-1">
              Esta lista está vacía
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm mb-6">
              Toca en "+ Añadir Canciones" para seleccionar alabanzas de tu biblioteca y verlas agrupadas por tono en el atril.
            </p>
            <button
              onClick={() => setIsSongSelectorOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-md transition active:scale-95 cursor-pointer"
            >
              <Plus size={18} strokeWidth={2.5} />
              <span>Añadir Canciones</span>
            </button>
          </div>
        ) : (
          /* MODO ATRIL: Agrupación Tonal y Notas Grandes y Claras */
          <div className="space-y-6">
            {tonalGroups.map(group => (
              <section key={group.rawKey} className="space-y-3">
                
                {/* Cabecera Tonal de Sección (Marcador de Atril) */}
                <div className="flex items-center justify-between bg-gray-100/80 dark:bg-[#28292A]/80 border border-gray-200/60 dark:border-gray-700/60 px-4 py-2 rounded-xl">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
                      TONO:
                    </span>
                    <span className="text-sm font-extrabold text-gray-800 dark:text-gray-200">
                      {group.formattedKey}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                    {group.songs.length} {group.songs.length === 1 ? 'canción' : 'canciones'}
                  </span>
                </div>

                {/* Canciones en este Tono */}
                <div className="space-y-3">
                  {group.songs.map(({ song, overallIndex }) => (
                    <div
                      key={song.id}
                      className="bg-white dark:bg-[#202124] rounded-2xl border border-gray-200 dark:border-gray-700/80 p-4 sm:p-5 shadow-xs transition flex flex-col gap-2.5"
                    >
                      {/* Fila del Título y Acciones */}
                      <div className="flex items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-800 pb-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-6 h-6 rounded-full bg-gray-100 dark:bg-[#2A2B2D] text-gray-600 dark:text-gray-300 flex items-center justify-center font-bold text-xs shrink-0">
                            {overallIndex}
                          </span>
                          <h3 className="font-extrabold text-base sm:text-lg text-gray-900 dark:text-gray-100 truncate">
                            {song.title || 'Sin título'}
                          </h3>
                          {song.activeInstrument === 'trumpet' ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/50 dark:border-amber-800/40 shrink-0">
                              🎺 Trompeta
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200/50 dark:border-blue-800/40 shrink-0">
                              🎹 Teclado
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {onOpenNoteInEditor && (
                            <button
                              onClick={() => onOpenNoteInEditor(song)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-gray-100 dark:hover:bg-[#28292A] transition cursor-pointer"
                              title="Abrir en editor de notas"
                            >
                              <Edit3 size={16} />
                            </button>
                          )}
                          <button
                            onClick={() => handleRemoveSongFromSetlist(song.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition cursor-pointer"
                            title="Quitar de esta lista"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      {/* NOTAS MUSICALES EN ATRIL (Elemento Dominante y Nítido) */}
                      <div className="pt-1">
                        <div className="text-xl sm:text-2xl font-mono font-bold tracking-wide leading-relaxed text-amber-600 dark:text-amber-400 whitespace-pre-wrap select-none break-words">
                          {renderFormattedMusicContent(song.content, song.activeInstrument === 'trumpet')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {/* Modal: Selector de Canciones */}
        {isSongSelectorOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div 
              className="bg-white dark:bg-[#202124] rounded-3xl border border-gray-200 dark:border-gray-700 w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">
                    Añadir a "{currentSetlist.name}"
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Selecciona las canciones de tu biblioteca ({currentSetlist.songIds.length} seleccionadas)
                  </p>
                </div>
                <button
                  onClick={() => setIsSongSelectorOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-[#28292A] text-gray-500 transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Buscador */}
              <div className="p-3.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-[#1A1A1C]">
                <div className="relative">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar canción por título o acorde..."
                    value={songSearchQuery}
                    onChange={e => setSongSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-white dark:bg-[#202124] border border-gray-200 dark:border-gray-700 outline-none text-xs sm:text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-amber-500 transition"
                  />
                </div>
              </div>

              {/* Lista de Canciones Disponibles */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
                {filteredLibraryNotes.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400 text-xs sm:text-sm">
                    {allNotes.length === 0 
                      ? 'No hay canciones en la biblioteca de TNotes todavía.' 
                      : 'No se encontraron canciones con esa búsqueda.'}
                  </div>
                ) : (
                  filteredLibraryNotes.map(note => {
                    const isSelected = currentSetlist.songIds.includes(note.id);
                    const songKey = getKeyForSetlist(note, notation);
                    const formattedKey = formatDualKeyDisplay(songKey, notation);

                    return (
                      <div
                        key={note.id}
                        onClick={() => handleToggleSongInSetlist(note.id)}
                        className={`flex items-center justify-between p-3 rounded-xl border transition cursor-pointer ${
                          isSelected 
                            ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800/60 shadow-2xs' 
                            : 'bg-white dark:bg-[#202124] border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                        }`}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0 pr-2">
                          <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition shrink-0 ${
                            isSelected
                              ? 'bg-amber-600 border-amber-600 text-white'
                              : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-[#2A2B2D]'
                          }`}>
                            {isSelected && <Check size={14} strokeWidth={3} />}
                          </div>

                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-gray-100 truncate">
                              {note.title || 'Sin título'}
                            </h4>
                            <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                              <span className="font-semibold text-amber-700 dark:text-amber-400">
                                {formattedKey}
                              </span>
                              <span>•</span>
                              <span>{note.activeInstrument === 'trumpet' ? '🎺 Trompeta' : '🎹 Teclado'}</span>
                            </div>
                          </div>
                        </div>

                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          isSelected 
                            ? 'bg-amber-200/70 dark:bg-amber-900/40 text-amber-900 dark:text-amber-300' 
                            : 'bg-gray-100 dark:bg-[#2A2B2D] text-gray-500'
                        }`}>
                          {isSelected ? 'En Lista' : 'Agregar'}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Pie del Modal */}
              <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-[#1A1A1C] flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                  {currentSetlist.songIds.length} {currentSetlist.songIds.length === 1 ? 'canción' : 'canciones'}
                </span>
                <button
                  onClick={() => setIsSongSelectorOpen(false)}
                  className="px-5 py-2 rounded-full bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs sm:text-sm shadow-sm transition active:scale-95 cursor-pointer"
                >
                  Listo
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Confirmación: Eliminar Lista */}
        <ConfirmModal
          isOpen={!!listToDelete}
          title="Eliminar lista"
          onCancel={() => setListToDelete(null)}
          onConfirm={() => {
            if (listToDelete) {
              deleteSetlist(listToDelete);
              setSetlists(prev => prev.filter(l => l.id !== listToDelete));
              if (selectedSetlistId === listToDelete) {
                setSelectedSetlistId(null);
              }
              setListToDelete(null);
            }
          }}
        />
      </div>
    );
  }

  // =========================================================================
  // ESTADO 1: CATÁLOGO DE LISTAS (ESTILO TARJETAS KEEP)
  // =========================================================================
  return (
    <div className="w-full mx-auto p-4 sm:p-6 pb-36 max-w-6xl animate-in fade-in duration-150">
      
      {/* Cabecera Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-gray-100 flex items-center gap-2.5">
            <ListMusic className="text-amber-500" size={24} />
            <span>Mis Listas de Alabanzas</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Organiza tus repertorios para servicios y conciertos con agrupación tonal automática
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs sm:text-sm shadow-sm hover:shadow-md transition active:scale-95 cursor-pointer shrink-0 self-start sm:self-auto"
        >
          <Plus size={18} strokeWidth={2.5} />
          <span>Nueva Lista</span>
        </button>
      </div>

      {/* Estado Vacío del Catálogo */}
      {setlists.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-6 bg-white dark:bg-[#202124] rounded-3xl border border-dashed border-gray-300 dark:border-gray-700 text-center shadow-xs max-w-md mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4">
            <ListMusic size={32} />
          </div>
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-1">
            No tienes listas creadas aún
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm mb-6">
            Crea una lista para tu próximo servicio o presentación (ej. "Servicio Domingo") y visualízala en atril.
          </p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-md transition active:scale-95 cursor-pointer"
          >
            <Plus size={18} strokeWidth={2.5} />
            <span>Crear Primera Lista</span>
          </button>
        </div>
      ) : (
        /* Cuadrícula Adaptable de Listas (Google Keep Style) */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {setlists.map(list => {
            const count = list.songIds.length;
            const updatedDate = new Date(list.updatedAt).toLocaleDateString('es-ES', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            });

            return (
              <div
                key={list.id}
                onClick={() => setSelectedSetlistId(list.id)}
                className="group bg-white dark:bg-[#202124] rounded-2xl border border-gray-200 dark:border-gray-700/80 p-5 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between hover:border-amber-400 dark:hover:border-amber-500/60"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                      <ListMusic size={18} />
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setListToDelete(list.id);
                      }}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer"
                      title="Eliminar lista"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <h3 className="font-extrabold text-lg text-gray-900 dark:text-gray-100 truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors mb-2">
                    {list.name}
                  </h3>
                </div>

                <div className="border-t border-gray-100 dark:border-gray-800 pt-3 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span className="font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-200/60 dark:border-amber-900/40">
                    {count} {count === 1 ? 'canción' : 'canciones'}
                  </span>
                  
                  <span className="flex items-center gap-1.5 text-[11px]">
                    <Calendar size={13} className="text-gray-400" />
                    {updatedDate}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Mini-Modal: Crear Nueva Lista */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div 
            className="w-full max-w-sm bg-white dark:bg-[#202124] rounded-3xl p-6 shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col gap-4"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 text-center">
              Nueva Lista de Alabanzas
            </h3>
            <input
              type="text"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleConfirmCreate()}
              placeholder="Ej. Servicio Domingo 10 AM"
              autoFocus
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-[#1A1A1C] text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setIsCreateModalOpen(false); setNewListName(''); }}
                className="flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-[#2A2B2D] hover:bg-gray-200 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmCreate}
                className="flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 transition-colors shadow-sm cursor-pointer"
              >
                Crear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación: Eliminar Lista */}
      <ConfirmModal
        isOpen={!!listToDelete}
        title="Eliminar lista"
        onCancel={() => setListToDelete(null)}
        onConfirm={() => {
          if (listToDelete) {
            deleteSetlist(listToDelete);
            setSetlists(prev => prev.filter(l => l.id !== listToDelete));
            if (selectedSetlistId === listToDelete) {
              setSelectedSetlistId(null);
            }
            setListToDelete(null);
          }
        }}
      />
    </div>
  );
}
